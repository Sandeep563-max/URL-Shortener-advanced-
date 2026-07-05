import Url from "../models/Url.js";
import { nanoid } from "nanoid";

// @desc    Create a short URL
// @route   POST /api/shorten
export const createShortUrl = async (req, res) => {
  try {
    const { originalUrl } = req.body;

    // 1. Validation
    if (!originalUrl) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      new URL(originalUrl);
    } catch (error) {
      return res.status(400).json({ error: "Invalid URL" });
    }

    // 2. Collision Check & Id Generation
    let shortId;
    let exists = true;

    while (exists) {
      shortId = nanoid(7);
      exists = await Url.findOne({ shortId });
    }

    // 3. Database Write
    const url = await Url.create({
      originalUrl,
      shortId,
    });

    // 4. Response
    res.json({
      shortId: url.shortId,
      shortUrl: `${process.env.BASE_URL}/${url.shortId}`,
    });

  } catch (error) {
    console.error("Error in createShortUrl:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const redirectToOriginalUrl = async (req, res) => {
  try {
    const { shortId } = req.params;

    // Find the URL by its shortId hash
    const url = await Url.findOne({ shortId });
    
    if (!url) {
      return res.status(404).json({ error: "URL not found" });
    }

    // Increment click analytics counter
    url.clicks++;
    await url.save();

    // Perform an HTTP redirect to send the user's browser to the destination website
    return res.redirect(url.originalUrl);

  } catch (error) {
    console.error("Error in redirectToOriginalUrl:", error);
    res.status(500).json({ error: "Server error" });
  }
};