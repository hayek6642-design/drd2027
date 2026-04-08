import 'dotenv/config';

export const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
export const CLOUDFLARE_STREAM_TOKEN = process.env.CLOUDFLARE_STREAM_TOKEN;
export const CF_STREAM_WEBHOOK_SECRET = process.env.CF_STREAM_WEBHOOK_SECRET;

export const DATABASE_URL = process.env.DATABASE_URL;
export const JWT_SECRET = process.env.JWT_SECRET;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = process.env.PORT || 3001;

export const MAX_VIDEO_DURATION = 3600; // 1 hour in seconds
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

// Video categories
export const VIDEO_CATEGORIES = [
  "entertainment",
  "music",
  "gaming",
  "sports",
  "education",
  "comedy",
  "news",
  "lifestyle",
  "technology",
  "travel",
  "food",
  "fashion",
  "beauty",
  "fitness",
  "animals",
  "science",
  "business",
  "politics",
  "health",
  "diy"
];

// Engagement types with their point values
export const ENGAGEMENT_TYPES = {
  like: { points: 1, name: "Like" },
  superLike: { points: 5, name: "Super Like" },
  megaLike: { points: 25, name: "Mega Like" }
};

// Moderation statuses
export const MODERATION_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  FLAGGED: "flagged"
};

// Video statuses
export const VIDEO_STATUSES = {
  UPLOADING: "uploading",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed"
};

// Reward system configuration
export const REWARD_SYSTEM = {
  VIEW_POINTS: 0.1, // Points per view
  UPLOAD_BONUS: 100, // Bonus points for uploading
  DAILY_BONUS: 50, // Daily login bonus
  LEVEL_THRESHOLDS: [100, 500, 2000, 5000, 10000] // Points needed for each level
};