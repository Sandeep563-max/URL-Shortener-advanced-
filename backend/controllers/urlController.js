import Url from "../models/Url.js";
import { nanoid } from "nanoid";
import { redisClient } from "../config/redis.js"; 
import { Queue } from "bullmq"; // <-- Import our Message Queue

// ---------------------------------------------------------
// INITIALIZE THE QUEUE
// This creates a queue inside your local Redis instance
// ---------------------------------------------------------
const analyticsQueue = new Queue("analyticsQueue", {
  connection: {
    host: "127.0.0.1",
    port: 6379
  }
});

// ---------------------------------------------------------
// POST: Generate a Short URL
// ---------------------------------------------------------
export const createShortUrl = async (req, res) => {
  try {
    const { originalUrl } = req.body;

    if (!originalUrl) {
      return res.status(400).json({ error: "Original URL is required" });
    }

    // Check for duplicates to save DB space
    const existingUrl = await Url.findOne({ originalUrl });
    if (existingUrl) {
      console.log("♻️ Existing URL found! Returning cached database version.");
      return res.status(200).json(existingUrl);
    }

    const shortId = nanoid(7);
    const baseUrl = process.env.BASE_URL || "http://localhost:5000";
    const shortUrl = `${baseUrl}/${shortId}`;

    const url = await Url.create({
      originalUrl,
      shortId,
      shortUrl, 
    });

    return res.status(201).json(url);

  } catch (error) {
    console.error("Error in createShortUrl:", error);
    return res.status(500).json({ error: "Server error while creating short URL" });
  }
};


// ---------------------------------------------------------
// GET: Redirect to Original URL (Asynchronous Tracking)
// ---------------------------------------------------------
export const redirectToOriginalUrl = async (req, res) => {
  try {
    const { shortId } = req.params;
    let originalUrl;
    
    // STEP 1: Check Redis Cache First
    const cachedUrl = await redisClient.get(shortId);

    if (cachedUrl) {
      console.log(`⚡ Cache Hit for ${shortId} - Redirecting Instantly`);
      originalUrl = cachedUrl;
    } else {
      // STEP 2: Cache Miss - Fallback to Database
      console.log(`🐌 Cache Miss for ${shortId} - Querying MongoDB`);
      const url = await Url.findOne({ shortId });

      if (!url) {
        return res.status(404).json({ error: "URL not found" });
      }

      originalUrl = url.originalUrl;
      // Save to Redis for future requests (Expires in 24 hours)
      await redisClient.set(shortId, originalUrl, { EX: 86400 });
    }

    // STEP 3: ASYNC QUEUE - Fire and forget!
    // We add a job to the queue, but notice we do NOT use 'await' here.
    // The user's redirect won't wait for this to finish.
    analyticsQueue.add("trackClick", { shortId }).catch(err => 
      console.error("Failed to add click event to queue:", err)
    );
    console.log(`📥 Click event pushed to Queue for ${shortId}`);

    // STEP 4: Redirect the browser instantly
    return res.redirect(originalUrl);

  } catch (error) {
    console.error("Error in redirectToOriginalUrl:", error);
    return res.status(500).json({ error: "Server error while redirecting" });
  }
};