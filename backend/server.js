import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import cors from "cors";
import urlRoutes from "./routes/url.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Separate Render worker service URL
const WORKER_URL = "https://swiftlink-worker.onrender.com";

// Wake up the separate worker service
const wakeWorker = () => {
  fetch(`${WORKER_URL}/health`)
    .then(() => {
      console.log("Worker wake-up request sent");
    })
    .catch((error) => {
      console.error("Worker wake-up request failed:", error.message);
    });
};

// Make wakeWorker available to controllers
app.locals.wakeWorker = wakeWorker;

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/", urlRoutes);
app.use("/api/auth", authRoutes);

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