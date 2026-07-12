import { createClient } from "redis";

// Create the client with dynamic host, password, and TLS encryption
export const redisClient = createClient({
  password: process.env.REDIS_PASSWORD, // Added this line
  socket: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
    tls: process.env.NODE_ENV === "production" // Added this line: Turns on encryption ONLY in production
  }
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

// Add the connection function back for server.js to use
export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log(`CONNECTED TO REDIS: ${process.env.REDIS_HOST || "127.0.0.1"}`);
  } catch (error) {
    console.error("Failed to connect to Redis", error);
  }
};