import { createClient } from "redis";

// Create the client (defaults to localhost:6379)
const redisClient = createClient();

// Add event listeners so we know when it connects or if it fails
redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.on("connect", () => console.log("CONNECTED TO REDIS: 127.0.0.1"));

// Create an async function to establish the connection
const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error(`Error connecting to Redis: ${error.message}`);
  }
};

export { redisClient, connectRedis };