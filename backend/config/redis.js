import { createClient } from "redis";

// Determine if we are in production based on the environment variable
const isProduction = process.env.NODE_ENV === "production";

// Create the client using the much safer Object configuration
export const redisClient = createClient(
  isProduction
    ? {
        password: process.env.REDIS_PASSWORD,
        socket: {
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT || 6379,
          tls: true, // Strictly enforce TLS for Upstash
          rejectUnauthorized: false // Helps prevent SSL certificate rejections in cloud environments
        }
      }
    : {
        url: "redis://127.0.0.1:6379", // Fallback for local development
      }
);

redisClient.on("error", (err) => console.error("Redis Client Error", err));

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log(
      `CONNECTED TO REDIS: ${isProduction ? "Upstash Cloud" : "Localhost"}`
    );
  } catch (error) {
    console.error("Failed to connect to Redis", error);
  }
};