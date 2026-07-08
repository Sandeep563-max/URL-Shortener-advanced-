import { Worker } from "bullmq";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Url from "./models/Url.js";

dotenv.config();

// The worker needs its own MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Worker connected to MongoDB"))
  .catch((err) => console.error("Worker MongoDB error", err));

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
  connection: { 
    host: process.env.REDIS_HOST || "127.0.0.1", 
    port: 6379 
  }
});

analyticsWorker.on("ready", () => {
  console.log("Analytics Worker is running and listening to Redis...");
});

analyticsWorker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed with error ${err.message}`);
});
