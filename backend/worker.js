import { Worker } from "bullmq";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Url from "./models/Url.js";

dotenv.config();

// The worker needs its own MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Worker connected to MongoDB"))
  .catch((err) => console.error("Worker MongoDB error", err));

// Must mirror the same Redis connection logic as the Queue
const getRedisConnection = () => {
  // If individual Render/Docker variables are provided:
  if (process.env.REDIS_HOST) {
    return {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      tls: process.env.REDIS_PASSWORD ? { rejectUnauthorized: false } : undefined
    };
  }
  // Fallback for full REDIS_URL strings if ever used
  if (process.env.REDIS_URL) {
    return {
      url: process.env.REDIS_URL,
      tls: { rejectUnauthorized: false }
    };
  }
  return { 
    host: "127.0.0.1", 
    port: 6379 
  };
};

const analyticsWorker = new Worker("analyticsQueue", async (job) => {
  const { shortId } = job.data;
  
  try {
    await Url.findOneAndUpdate(
      { shortId },
      { $inc: { clicks: 1 } }
    );
    console.log(`Processed click for ${shortId}`);
  } catch (error) {
    console.error(`Failed to update click for ${shortId}`, error);
    throw error; // Throwing the error tells BullMQ to retry the job later
  }
}, {
  connection: getRedisConnection()
});

analyticsWorker.on("ready", () => {
  console.log("Analytics Worker is running and listening to Redis...");
});

analyticsWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed with error ${err.message}`);
});