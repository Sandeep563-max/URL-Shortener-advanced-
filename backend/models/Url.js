import mongoose from "mongoose";

const UrlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
  },
  shortId: {      // <-- This is the new field that was missing!
    type: String,
    required: true,
    unique: true,
  },
  shortUrl: {
    type: String,
    required: true,
    unique: true,
  },
  clicks: {
    type: Number, 
    default: 0
  },
}, { timestamps: true });

export default mongoose.model("Url", UrlSchema);