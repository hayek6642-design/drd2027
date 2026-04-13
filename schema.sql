-- CodeBank Database Schema
-- Run this on your Turso/SQLite database

-- Users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  last_login INTEGER
);

-- Asset tables
CREATE TABLE IF NOT EXISTS codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code TEXT UNIQUE,
  value INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  data TEXT,
  timestamp INTEGER,
  server_timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS silver (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER DEFAULT 0,
  source TEXT,
  data TEXT,
  timestamp INTEGER,
  server_timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gold (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER DEFAULT 0,
  source TEXT,
  data TEXT,
  timestamp INTEGER,
  server_timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  asset_id TEXT,
  from_user_id TEXT,
  to_user_id TEXT,
  status TEXT DEFAULT 'pending',
  data TEXT,
  timestamp INTEGER,
  server_timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_codes_user ON codes(user_id);
CREATE INDEX IF NOT EXISTS idx_codes_status ON codes(status);
CREATE INDEX IF NOT EXISTS idx_silver_user ON silver(user_id);
CREATE INDEX IF NOT EXISTS idx_gold_user ON gold(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);
