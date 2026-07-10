import mongoose from "mongoose";

const UrlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
  },
  shortId: {
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
  // --- NEW FIELD ADDED HERE ---
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, 
  },
}, { timestamps: true });

export default mongoose.model("Url", UrlSchema);