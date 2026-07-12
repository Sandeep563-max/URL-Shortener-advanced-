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
app.use(cors({
  origin: [
    process.env.FRONTEND_URL, 
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true, // Required for cross-origin cookies
}));

app.use(express.json());
// Configure cookie-parser for cross-site cookie handling
app.use(cookieParser());

// Routes
app.use("/", urlRoutes);
app.use('/api/auth', authRoutes);

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Server failed to start: ${error.message}`);
  }
};

startServer();