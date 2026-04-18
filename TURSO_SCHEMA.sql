-- Turso Database Schema for Universal Persistent Storage V3
-- Run this SQL on your Turso database to create the required tables

-- ==================== UNIVERSAL ACTIONS (All Services) ====================

CREATE TABLE IF NOT EXISTS universal_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  universal_key TEXT UNIQUE NOT NULL,
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_fingerprint TEXT NOT NULL,
  device_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  vector_clock TEXT NOT NULL, -- JSON: {"device1": 5, "device2": 3}
  data TEXT, -- JSON blob with action-specific data
  content_type TEXT, -- 'audio', 'video', 'game', 'chat', etc.
  version INTEGER DEFAULT 1,
  conflict_resolved BOOLEAN DEFAULT FALSE,
  sync_status TEXT DEFAULT 'synced',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_actions_service ON universal_actions(service);
CREATE INDEX IF NOT EXISTS idx_actions_user ON universal_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_device ON universal_actions(device_id);
CREATE INDEX IF NOT EXISTS idx_actions_timestamp ON universal_actions(timestamp);
CREATE INDEX IF NOT EXISTS idx_actions_sync ON universal_actions(sync_status);

-- ==================== MEDIA PROGRESS (Audio/Video Services) ====================

CREATE TABLE IF NOT EXISTS media_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  progress_key TEXT UNIQUE NOT NULL, -- service_contentId_userId
  service TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'audio' or 'video'
  user_id TEXT NOT NULL,
  user_fingerprint TEXT NOT NULL,
  device_id TEXT NOT NULL,
  current_time REAL NOT NULL,
  duration REAL NOT NULL,
  percentage REAL,
  completed BOOLEAN DEFAULT FALSE,
  metadata TEXT, -- JSON: quality, volume, playback_rate
  timestamp INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_progress_service ON media_progress(service);
CREATE INDEX IF NOT EXISTS idx_progress_user ON media_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_content ON media_progress(content_id);

-- ==================== CONFLICT LOG ====================

CREATE TABLE IF NOT EXISTS conflict_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  universal_key TEXT NOT NULL,
  existing_device_id TEXT NOT NULL,
  incoming_device_id TEXT NOT NULL,
  resolution_strategy TEXT NOT NULL, -- 'lww', 'merge', 'max-value', 'set-union'
  winner TEXT NOT NULL, -- 'existing' or 'incoming'
  existing_data TEXT, -- JSON snapshot
  incoming_data TEXT, -- JSON snapshot
  resolved_data TEXT, -- JSON final result
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conflicts_key ON conflict_log(universal_key);
CREATE INDEX IF NOT EXISTS idx_conflicts_timestamp ON conflict_log(timestamp);

-- ==================== ACTIVITY STREAM ====================

CREATE TABLE IF NOT EXISTS activity_stream (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id TEXT UNIQUE NOT NULL,
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  item_id TEXT NOT NULL,
  user_fingerprint TEXT NOT NULL,
  activity_type TEXT NOT NULL, -- 'user_action', 'system_event'
  data TEXT, -- JSON with activity details
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_service ON activity_stream(service);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_stream(timestamp);

-- ==================== USER DEVICES (Multi-Device Tracking) ====================

CREATE TABLE IF NOT EXISTS user_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT UNIQUE NOT NULL,
  user_id TEXT,
  user_fingerprint TEXT NOT NULL,
  user_agent TEXT,
  screen_size TEXT, -- "1920x1080"
  timezone TEXT,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON user_devices(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON user_devices(last_seen);

-- ==================== USER IDENTITY ====================

CREATE TABLE IF NOT EXISTS user_identity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  fingerprint TEXT UNIQUE NOT NULL,
  devices TEXT, -- JSON array of device IDs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_identity_fingerprint ON user_identity(fingerprint);
CREATE INDEX IF NOT EXISTS idx_identity_user ON user_identity(user_id);

-- ==================== SERVICE-SPECIFIC VIEWS ====================

-- View for all likes
CREATE VIEW IF NOT EXISTS likes_view AS
SELECT 
  universal_key,
  service,
  item_id,
  user_id,
  timestamp,
  json_extract(data, '$.likedAt') as liked_at
FROM universal_actions
WHERE action = 'like';

-- View for all comments
CREATE VIEW IF NOT EXISTS comments_view AS
SELECT 
  universal_key,
  service,
  item_id,
  user_id,
  timestamp,
  json_extract(data, '$.text') as comment_text,
  json_extract(data, '$.commentedAt') as commented_at
FROM universal_actions
WHERE action = 'comment';

-- View for all scores (gaming)
CREATE VIEW IF NOT EXISTS scores_view AS
SELECT 
  universal_key,
  service,
  item_id,
  user_id,
  timestamp,
  json_extract(data, '$.score') as score,
  json_extract(data, '$.level') as level,
  json_extract(data, '$.playTime') as play_time
FROM universal_actions
WHERE action = 'score'
ORDER BY json_extract(data, '$.score') DESC;

-- ==================== STATS & ANALYTICS ====================

-- Count likes by service
CREATE VIEW IF NOT EXISTS service_like_stats AS
SELECT 
  service,
  COUNT(*) as total_likes,
  COUNT(DISTINCT user_id) as unique_likers
FROM universal_actions
WHERE action = 'like'
GROUP BY service;

-- Count actions by type
CREATE VIEW IF NOT EXISTS action_type_stats AS
SELECT 
  service,
  action,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM universal_actions
GROUP BY service, action;

-- ==================== CLEANUP TRIGGERS ====================

-- Auto-update timestamp on modification
CREATE TRIGGER IF NOT EXISTS update_actions_timestamp
AFTER UPDATE ON universal_actions
BEGIN
  UPDATE universal_actions SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_progress_timestamp
AFTER UPDATE ON media_progress
BEGIN
  UPDATE media_progress SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_devices_timestamp
AFTER UPDATE ON user_devices
BEGIN
  UPDATE user_devices SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

-- ==================== RETENTION POLICIES ====================

-- Keep conflicts for 90 days, then delete
CREATE TRIGGER IF NOT EXISTS cleanup_old_conflicts
AFTER INSERT ON conflict_log
BEGIN
  DELETE FROM conflict_log 
  WHERE datetime(created_at) < datetime('now', '-90 days');
END;

-- Keep activity stream for 30 days
CREATE TRIGGER IF NOT EXISTS cleanup_old_activity
AFTER INSERT ON activity_stream
BEGIN
  DELETE FROM activity_stream 
  WHERE datetime(created_at) < datetime('now', '-30 days');
END;

-- ==================== HELPER FUNCTIONS ====================

-- Count user actions
-- SELECT count_user_actions('user_fingerprint') 
CREATE TRIGGER IF NOT EXISTS count_user_actions
INSTEAD OF SELECT ON user_actions_summary
BEGIN
  SELECT user_id, COUNT(*) as total_actions
  FROM universal_actions
  GROUP BY user_id;
END;
