import Url from "../models/Url.js";
import { nanoid } from "nanoid";
import { redisClient } from "../config/redis.js";
import { Queue } from "bullmq";

// Redis connection used by BullMQ.
// Uses Docker Redis locally and TLS for production/cloud Redis.
const getRedisConnection = () => {
  if (process.env.REDIS_HOST) {
    const connection = {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT) || 6379,
    };

    if (process.env.REDIS_PASSWORD) {
      connection.password = process.env.REDIS_PASSWORD;
    }

    if (process.env.NODE_ENV === "production") {
      connection.tls = {
        rejectUnauthorized: false,
      };
    }

    return connection;
  }

  if (process.env.REDIS_URL) {
    return {
      url: process.env.REDIS_URL,
      tls: {
        rejectUnauthorized: false,
      },
    };
  }

  return {
    host: "127.0.0.1",
    port: 6379,
  };
};

const analyticsQueue = new Queue("analyticsQueue", {
  connection: getRedisConnection(),
});

// POST: Generate Short URL
export const createShortUrl = async (req, res) => {
  try {
    const { originalUrl, customAlias } = req.body;

    if (!originalUrl || typeof originalUrl !== "string") {
      return res.status(400).json({ error: "URL required" });
    }

    const trimmedUrl = originalUrl.trim();

    if (!trimmedUrl) {
      return res.status(400).json({ error: "URL required" });
    }

    // Validate URL format and allow only HTTP/HTTPS.
    let parsedUrl;

    try {
      parsedUrl = new URL(trimmedUrl);
    } catch (error) {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    if (
      parsedUrl.protocol !== "http:" &&
      parsedUrl.protocol !== "https:"
    ) {
      return res.status(400).json({
        error:
          "Invalid URL protocol. Only HTTP and HTTPS URLs are allowed.",
      });
    }

    const userId = req.user ? req.user._id : null;

    // Custom aliases are available only to logged-in users.
    if (customAlias && !userId) {
      return res.status(401).json({
        error: "You must be logged in to create a custom alias.",
      });
    }

    // Check whether the requested custom alias already exists.
    if (customAlias) {
      const existingAlias = await Url.findOne({ customAlias });

      if (existingAlias) {
        return res.status(400).json({
          error:
            "This custom alias is already taken. Please choose another.",
        });
      }
    }

    // Return an existing URL for the same user if no custom alias is used.
    if (!customAlias) {
      const existingUrl = await Url.findOne({
        originalUrl: trimmedUrl,
        user: userId,
      });

      if (existingUrl) {
        return res.status(200).json(existingUrl);
      }
    }

    const shortId = nanoid(7);
    const finalIdentifier = customAlias || shortId;

    // Use environment-specific base URL.
    const baseUrl =
      process.env.BASE_URL || "http://localhost:5000";

    const shortUrl = `${baseUrl}/${finalIdentifier}`;

    const url = await Url.create({
      originalUrl: trimmedUrl,
      shortId,
      shortUrl,
      customAlias: customAlias || undefined,
      user: userId,
    });

    return res.status(201).json(url);
  } catch (error) {
    console.error("Error creating short URL:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// GET: Redirect with Redis caching and async analytics
export const redirectToOriginalUrl = async (req, res) => {
  const { shortId } = req.params;
  let cachedData = null;

  // 1. Try Redis first.
  // If Redis fails, continue with MongoDB.
  try {
    cachedData = await redisClient.get(shortId);
  } catch (redisErr) {
    console.error(
      "Redis GET Failure (falling back to MongoDB):",
      redisErr.message
    );

    cachedData = null;
  }

  // 2. Handle Redis cache hit.
  if (cachedData) {
    try {
      const parsedCache = JSON.parse(cachedData);

      // Queue click analytics asynchronously.
      analyticsQueue
        .add(
          "trackClick",
          { shortId: parsedCache.trueId },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 1000,
            },
          }
        )
        .catch((error) =>
          console.error("Queue Error:", error.message)
        );

      return res.redirect(parsedCache.originalUrl);
    } catch (error) {
      // Backward compatibility in case old cache contains only a URL.
      analyticsQueue
        .add(
          "trackClick",
          { shortId },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 1000,
            },
          }
        )
        .catch((queueError) =>
          console.error("Queue Error:", queueError.message)
        );

      return res.redirect(cachedData);
    }
  }

  // 3. Cache miss → MongoDB is the source of truth.
  try {
    const url = await Url.findOne({
      $or: [
        { shortId: shortId },
        { customAlias: shortId },
      ],
    });

    if (!url) {
      return res.status(404).json({ error: "Not found" });
    }

    // Store both original URL and the real shortId in Redis.
    const cachePayload = JSON.stringify({
      originalUrl: url.originalUrl,
      trueId: url.shortId,
    });

    // 4. Populate Redis.
    // Redis failure should not prevent the redirect.
    try {
      await redisClient.set(shortId, cachePayload, {
        EX: 86400,
      });
    } catch (redisSetErr) {
      console.error(
        "Redis SET Failure (continuing redirect):",
        redisSetErr.message
      );
    }

    // 5. Queue analytics asynchronously.
    analyticsQueue
      .add(
        "trackClick",
        { shortId: url.shortId },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
        }
      )
      .catch((queueError) =>
        console.error("Queue Error:", queueError.message)
      );

    return res.redirect(url.originalUrl);
  } catch (mongoError) {
    console.error(
      "MongoDB Error in redirectToOriginalUrl:",
      mongoError
    );

    return res.status(500).json({ error: "Server error" });
  }
};

// GET: Fetch URL Analytics
export const getUrlAnalytics = async (req, res) => {
  try {
    const { shortId } = req.params;

    const url = await Url.findOne({ shortId });

    if (!url) {
      return res.status(404).json({ error: "URL not found" });
    }

    return res.status(200).json({
      shortUrl: url.shortUrl,
      clicks: url.clicks,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// GET: Fetch all URLs for the logged-in user
export const getUserUrls = async (req, res) => {
  try {
    const urls = await Url.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json(urls);
  } catch (error) {
    console.error("Error fetching user URLs:", error);
    return res.status(500).json({ error: "Server error" });
  }
};