import express from "express";
import { 
  createShortUrl, 
  redirectToOriginalUrl, 
  getUrlAnalytics 
} from "../controllers/urlController.js";

const router = express.Router();

// Route to create a new short URL
router.post("/shorten", createShortUrl);

// Route to fetch analytics for a specific short ID
router.get("/analytics/:shortId", getUrlAnalytics);

// Route for the actual redirection (must be at the end to avoid conflicts)
router.get("/:shortId", redirectToOriginalUrl);

export default router;