import { createClient } from "redis";

// When in production, construct the full Upstash URL
const getRedisUrl = () => {
  if (process.env.NODE_ENV === "production") {
    // This creates exactly: rediss://default:YOUR_PASSWORD@YOUR_HOST:6379
    return `rediss://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`;
  }
  // Fallback for local development
  return "redis://127.0.0.1:6379"; 
};

export const redisClient = createClient({
  url: getRedisUrl()
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log(
      `CONNECTED TO REDIS: ${
        process.env.NODE_ENV === "production" ? "Upstash Cloud" : "Localhost"
      }`
    );
  } catch (error) {
    console.error("Failed to connect to Redis", error);
  }
};