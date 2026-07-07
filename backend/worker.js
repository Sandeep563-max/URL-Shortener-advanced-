import { Worker } from "bullmq";
import connectDB from "./config/db.js";
import Url from "./models/Url.js";
import dotenv from "dotenv";

dotenv.config();

// 1. Connect to MongoDB 
// (The worker is a separate process, so it needs its own database connection!)
connectDB();

// 2. Create the Worker
// It continuously listens to the "analyticsQueue" on your local Redis
const analyticsWorker = new Worker("analyticsQueue", async (job) => {
  // This function triggers the millisecond a new job drops into the queue
  const { shortId } = job.data;
  
  console.log(`\n👷 Picked up click event for: ${shortId}`);

  try {
    // Perform the slow database update here, safely away from the user
    await Url.findOneAndUpdate(
      { shortId },
      { $inc: { clicks: 1 } }
    );
    console.log(`✅ Successfully updated MongoDB clicks for ${shortId}`);
  } catch (error) {
    console.error(`❌ Failed to update clicks for ${shortId}:`, error);
    throw error; // Throwing an error tells BullMQ to retry the job later
  }
}, {
  connection: {
    host: "127.0.0.1",
    port: 6379
  }
});

// 3. Optional: Event listeners for easier debugging
analyticsWorker.on("completed", (job) => {
  console.log(`🎉 Job ${job.id} finished processing.`);
});

analyticsWorker.on("failed", (job, err) => {
  console.error(`🚨 Job ${job.id} failed: ${err.message}`);
});

console.log("🟢 Analytics Worker is running and listening to Redis...");