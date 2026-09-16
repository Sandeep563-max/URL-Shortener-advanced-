import { Worker } from "bullmq";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Url from "./models/Url.js";
import http from "http";

dotenv.config();

// Redis connection used by the BullMQ worker.
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

// Worker has its own MongoDB connection.
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Worker connected to MongoDB"))
  .catch((error) =>
    console.error("Worker MongoDB error:", error)
  );

// Create the BullMQ worker.
// This runs separately from the Express API server.
const analyticsWorker = new Worker(
  "analyticsQueue",
  async (job) => {
    const { shortId } = job.data;

    try {
      await Url.findOneAndUpdate(
        { shortId },
        { $inc: { clicks: 1 } }
      );

      console.log(`Processed click for ${shortId}`);
    } catch (error) {
      console.error(
        `Failed to update click for ${shortId}:`,
        error
      );

      // Throwing the error tells BullMQ that the job failed,
      // allowing BullMQ to retry according to the job options.
      throw error;
    }
  },
  {
    connection: getRedisConnection(),
  }
);

analyticsWorker.on("ready", () => {
  console.log(
    "Analytics Worker is running and listening to Redis..."
  );
});

analyticsWorker.on("failed", (job, error) => {
  console.error(
    `Job ${job?.id} failed with error ${error.message}`
  );
});

// --------------------------------------------------
// Lightweight HTTP server for Render health checks
// --------------------------------------------------

// Use a fixed internal port so the worker does not inherit
// PORT=5000 from the shared backend .env file.
const PORT = 10000;

const healthServer = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, {
      "Content-Type": "text/plain",
    });

    res.end("SwiftLink worker is running");
    return;
  }

  res.writeHead(404, {
    "Content-Type": "text/plain",
  });

  res.end("Not Found");
});

healthServer.listen(PORT, () => {
  console.log(`Worker health server running on port ${PORT}`);
});