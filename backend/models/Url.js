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
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, 
  },
  
  // --- NEW FIELD FOR PREMIUM FEATURE ---
  customAlias: {
    type: String,
    unique: true,
    sparse: true, // Tells MongoDB: "Only enforce uniqueness if this field actually exists."
    trim: true,   // Automatically removes accidental spaces at the beginning or end.
    match: [/^[a-zA-Z0-9-_]+$/, 'Alias can only contain letters, numbers, hyphens, and underscores'] // Prevents invalid URL characters like spaces or emojis.
  },
}, { timestamps: true });

export default mongoose.model("Url", UrlSchema);