import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js"; 
import { connectRedis } from "./config/redis.js"; 
import cors from "cors";
import urlRoutes from "./routes/url.js";
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// This array allows both your local React server and your future live site to connect
app.use(cors({
  origin: [
    process.env.FRONTEND_URL, // For your future deployed React app
    "http://localhost:5173"   // For local development testing
  ],
  methods: ["GET", "POST", "PUT", "DELETE"], // Added PUT/DELETE in case you add edit/delete features
  credentials: true, // Crucial for cookie-parser and authentication
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/", urlRoutes);
app.use('/api/auth', authRoutes);

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