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
    const { originalUrl } = req.body;
    if (!originalUrl) return res.status(400).json({ error: "URL required" });

    // 1. Grab the user ID if the optionalAuth middleware found a logged-in user
    const userId = req.user ? req.user._id : null;

    // 2. Check if THIS specific user (or guest) already shortened this exact URL
    const existingUrl = await Url.findOne({ originalUrl, user: userId });
    if (existingUrl) return res.status(200).json(existingUrl);

    const shortId = nanoid(7);
    const shortUrl = `${process.env.BASE_URL || "http://localhost:5000"}/${shortId}`;

    // 3. Save the link with the user ID attached
    const url = await Url.create({ 
      originalUrl, 
      shortId, 
      shortUrl,
      user: userId // <-- This is the magic connection!
    });
    
    return res.status(201).json(url);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
// GET: Redirect with Redis caching and async analytics
export const redirectToOriginalUrl = async (req, res) => {
  try {
    const { shortId } = req.params;
    
    // Cache Check
    const cachedUrl = await redisClient.get(shortId);
    if (cachedUrl) {
      analyticsQueue.add("trackClick", { shortId }).catch(err => console.error("Queue Error:", err));
      return res.redirect(cachedUrl);
    }

    // DB Fallback
    const url = await Url.findOne({ shortId });
    if (!url) return res.status(404).json({ error: "Not found" });

    await redisClient.set(shortId, url.originalUrl, { EX: 86400 });
    analyticsQueue.add("trackClick", { shortId }).catch(err => console.error("Queue Error:", err));
    return res.redirect(url.originalUrl);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET: Fetch URL Analytics
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

// GET: Fetch all URLs for the logged-in user
export const getUserUrls = async (req, res) => {
  try {
    // Find URLs where the user ID matches the logged-in user
    // .sort({ createdAt: -1 }) puts the newest links at the top!
    const urls = await Url.find({ user: req.user._id }).sort({ createdAt: -1 });
    
    res.status(200).json(urls);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};