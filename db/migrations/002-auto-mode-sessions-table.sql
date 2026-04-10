-- Auto-mode sessions tracking for silver generation
CREATE TABLE IF NOT EXISTS auto_mode_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_silver_awarded_at DATETIME,
    silver_awards_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_auto_mode_active ON auto_mode_sessions(is_active, user_id);
