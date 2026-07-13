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
    const { originalUrl, customAlias } = req.body;
    if (!originalUrl) return res.status(400).json({ error: "URL required" });

    const userId = req.user ? req.user._id : null;

    // Premium Feature Gatekeeper
    if (customAlias && !userId) {
      return res.status(401).json({ error: "You must be logged in to create a custom alias." });
    }

    // Alias Availability Check
    if (customAlias) {
      const existingAlias = await Url.findOne({ customAlias });
      if (existingAlias) {
        return res.status(400).json({ error: "This custom alias is already taken. Please choose another." });
      }
    }

    // Anti-Spam: Return existing standard URL if not using a custom alias
    if (!customAlias) {
      const existingUrl = await Url.findOne({ originalUrl, user: userId });
      if (existingUrl) return res.status(200).json(existingUrl);
    }

    const shortId = nanoid(7);
    const finalIdentifier = customAlias ? customAlias : shortId;
    
    // --- THE URL GENERATION FIX ---
    // Automatically use the live Render URL in production, or localhost for local dev
    const baseUrl = process.env.NODE_ENV === "production" 
      ? "https://url-shortener-advanced.onrender.com" 
      : "http://localhost:5000";
      
    const shortUrl = `${baseUrl}/${finalIdentifier}`;

    const url = await Url.create({ 
      originalUrl, 
      shortId, 
      shortUrl,
      customAlias: customAlias || undefined, 
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
    const { shortId } = req.params; 
    
    // 1. Cache Check
    const cachedData = await redisClient.get(shortId);
    if (cachedData) {
      try {
        const parsedCache = JSON.parse(cachedData);
        analyticsQueue.add("trackClick", { shortId: parsedCache.trueId }).catch(err => console.error("Queue Error:", err));
        return res.redirect(parsedCache.originalUrl);
      } catch (e) {
        analyticsQueue.add("trackClick", { shortId }).catch(err => console.error("Queue Error:", err));
        return res.redirect(cachedData);
      }
    }

    // 2. DB Fallback
    const url = await Url.findOne({ 
      $or: [ { shortId: shortId }, { customAlias: shortId } ] 
    });
    
    if (!url) return res.status(404).json({ error: "Not found" });

    // Store both the URL and the true shortId together in Redis as a JSON string
    const cachePayload = JSON.stringify({ 
      originalUrl: url.originalUrl, 
      trueId: url.shortId 
    });
    
    await redisClient.set(shortId, cachePayload, { EX: 86400 });
    
    // 3. Send the true ID to the worker
    analyticsQueue.add("trackClick", { shortId: url.shortId }).catch(err => console.error("Queue Error:", err));
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
    const urls = await Url.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(urls);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};