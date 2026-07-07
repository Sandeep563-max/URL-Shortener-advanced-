import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js"; 
import { connectRedis } from "./config/redis.js"; // <-- Redis connection imported
import cors from "cors";
import urlRoutes from "./routes/url.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST"],
}));
app.use(express.json());

// Routes
app.use("/", urlRoutes);

const startServer = async () => {
  try {
    // 1. Connect to both MongoDB and Redis before starting the server
    await connectDB();
    await connectRedis();

    // 2. Start Express Server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Server failed to start: ${error.message}`);
  }
};

startServer();