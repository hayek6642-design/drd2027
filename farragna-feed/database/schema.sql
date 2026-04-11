/**
 * ==============================
 * 🗄️ FARRAGNA FEED DATABASE SCHEMA
 * ==============================
 * Zero-storage: Only metadata stored, no video blobs
 * Videos streamed directly from Pexels/Pixabay/Mixkit
 */

CREATE TABLE IF NOT EXISTS videos_metadata (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail TEXT,
  duration INTEGER,
  width INTEGER,
  height INTEGER,
  photographer TEXT,
  license TEXT,
  source_page_url TEXT,
  source_user_profile TEXT,
  source_video_id TEXT,
  source_user_id TEXT,
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_verified DATETIME,
  url_expires_at DATETIME,
  tags TEXT,
  categories TEXT,
  views INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_videos_source ON videos_metadata(source);
CREATE INDEX IF NOT EXISTS idx_videos_created ON videos_metadata(created_at);
CREATE INDEX IF NOT EXISTS idx_videos_url_expires ON videos_metadata(url_expires_at);

CREATE TABLE IF NOT EXISTS url_cache (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  quality TEXT,
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (video_id) REFERENCES videos_metadata(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_url_cache_expires ON url_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_url_cache_source ON url_cache(source);

CREATE TABLE IF NOT EXISTS user_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES videos_metadata(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interactions_video ON user_interactions(video_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user ON user_interactions(user_id);

CREATE TABLE IF NOT EXISTS feed_preferences (
  user_id TEXT PRIMARY KEY,
  preferred_sources TEXT,
  preferred_categories TEXT,
  min_duration INTEGER,
  max_duration INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL UNIQUE,
  requests_count INTEGER DEFAULT 0,
  reset_time DATETIME NOT NULL,
  last_request DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source) REFERENCES videos_metadata(source)
);
