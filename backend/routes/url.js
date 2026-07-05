import express from "express";
import { createShortUrl, redirectToOriginalUrl } from "../controllers/urlController.js";

const router = express.Router();

// Route 1: Post request to create the short link
router.post("/shorten", createShortUrl);

// Route 2: Get request to capture the hash and handle redirection
router.get("/:shortId", redirectToOriginalUrl);

export default router;