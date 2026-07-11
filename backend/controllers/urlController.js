import Url from "../models/Url.js";
import { nanoid } from "nanoid";
import { redisClient } from "../config/redis.js";
import { Queue } from "bullmq";

const analyticsQueue = new Queue("analyticsQueue", {
  connection: { 
    host: process.env.REDIS_HOST || "127.0.0.1", 
    port: 6379 
  }
});

// POST: Generate Short URL
export const createShortUrl = async (req, res) => {
  try {
    // --- NEW: Destructure customAlias from the request body ---
    const { originalUrl, customAlias } = req.body;
    if (!originalUrl) return res.status(400).json({ error: "URL required" });

    const userId = req.user ? req.user._id : null;

    // --- NEW: Premium Feature Gatekeeper ---
    // If a guest tries to use a custom alias, reject them immediately.
    if (customAlias && !userId) {
      return res.status(401).json({ error: "You must be logged in to create a custom alias." });
    }

    // --- NEW: Alias Availability Check ---
    if (customAlias) {
      const existingAlias = await Url.findOne({ customAlias });
      if (existingAlias) {
        return res.status(400).json({ error: "This custom alias is already taken. Please choose another." });
      }
    }

    // Only check for an existing standard URL if they ARE NOT trying to make a custom one.
    // (If they are making a custom one, we want to let them, even if they shortened this link before).
    if (!customAlias) {
      const existingUrl = await Url.findOne({ originalUrl, user: userId });
      if (existingUrl) return res.status(200).json(existingUrl);
    }

    const shortId = nanoid(7);
    
    // --- NEW: Use the customAlias in the final URL if it exists, otherwise use the random shortId ---
    const finalIdentifier = customAlias ? customAlias : shortId;
    const shortUrl = `${process.env.BASE_URL || "http://localhost:5000"}/${finalIdentifier}`;

    const url = await Url.create({ 
      originalUrl, 
      shortId, 
      shortUrl,
      customAlias: customAlias || null, // --- NEW: Save the alias to the database ---
      user: userId 
    });
    
    return res.status(201).json(url);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET: Redirect with Redis caching and async analytics
export const redirectToOriginalUrl = async (req, res) => {
  try {
    const { shortId } = req.params; // Note: This could now be a nanoid OR a custom alias!
    
    // Cache Check
    const cachedUrl = await redisClient.get(shortId);
    if (cachedUrl) {
      analyticsQueue.add("trackClick", { shortId }).catch(err => console.error("Queue Error:", err));
      return res.redirect(cachedUrl);
    }

    // --- NEW: DB Fallback - Search by shortId OR customAlias ---
    const url = await Url.findOne({ 
      $or: [ { shortId: shortId }, { customAlias: shortId } ] 
    });
    
    if (!url) return res.status(404).json({ error: "Not found" });

    await redisClient.set(shortId, url.originalUrl, { EX: 86400 });
    // We pass the actual shortId to the queue so analytics attach to the right database document
    analyticsQueue.add("trackClick", { shortId: url.shortId }).catch(err => console.error("Queue Error:", err));
    return res.redirect(url.originalUrl);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET: Fetch URL Analytics (Remains exactly the same)
export const getUrlAnalytics = async (req, res) => {
  try {
    const { shortId } = req.params;
    const url = await Url.findOne({ shortId });
    
    if (!url) return res.status(404).json({ error: "URL not found" });

    return res.status(200).json({
      shortUrl: url.shortUrl,
      clicks: url.clicks,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET: Fetch all URLs for the logged-in user (Remains exactly the same)
export const getUserUrls = async (req, res) => {
  try {
    const urls = await Url.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(urls);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};