import express from "express";
import { 
  createShortUrl, 
  redirectToOriginalUrl, 
  getUrlAnalytics,
  getUserUrls // <-- Import the new controller
} from "../controllers/urlController.js";
import { optionalAuth, protect } from "../middleware/authMiddleware.js"; // <-- Import protect

const router = express.Router();

// Route to create a new short URL
router.post("/shorten", optionalAuth, createShortUrl);

// Route to fetch analytics for a specific short ID
router.get("/analytics/:shortId", getUrlAnalytics);

// 🛡️ NEW: Route to fetch a user's permanent history
// Placed ABOVE the redirect route!
router.get("/my-links", protect, getUserUrls); 

// Route for the actual redirection 
router.get("/:shortId", redirectToOriginalUrl);

export default router;