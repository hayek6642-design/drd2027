-- FULL CODEBANK SCHEMA (run once on Turso/SQLite)
-- Covers: users, codes, silver, gold, transactions,
-- messaging (E7ki), trades (Pebalaash), tracks (Battalooda),
-- likes (Farragna), scores (CoRsA/Games), posts (Yahood),
-- file transfers (Eb3at)

-- ── Users ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')*1000),
  last_login INTEGER
);

-- ── Core Assets ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code TEXT UNIQUE,
  value INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  source TEXT,
  data TEXT,
  timestamp INTEGER,
  server_timestamp INTEGER DEFAULT (strftime('%s','now')*1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_codes_user ON codes(user_id);
CREATE INDEX IF NOT EXISTS idx_codes_status ON codes(status);

CREATE TABLE IF NOT EXISTS silver (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
  amount INTEGER DEFAULT 0, source TEXT, data TEXT,
  timestamp INTEGER, server_timestamp INTEGER DEFAULT (strftime('%s','now')*1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_silver_user ON silver(user_id);

CREATE TABLE IF NOT EXISTS gold (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
  amount INTEGER DEFAULT 0, source TEXT, data TEXT,
  timestamp INTEGER, server_timestamp INTEGER DEFAULT (strftime('%s','now')*1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_gold_user ON gold(user_id);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  asset_id TEXT, service TEXT,
  from_user_id TEXT, to_user_id TEXT,
  amount INTEGER, description TEXT,
  status TEXT DEFAULT 'pending', data TEXT,
  timestamp INTEGER, server_timestamp INTEGER DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type);

-- ── E7ki (Messaging) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, emoji TEXT,
  created_by TEXT NOT NULL, last_message TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')*1000),
  updated_at INTEGER DEFAULT (strftime('%s','now')*1000),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_conv_updated ON conversations(updated_at);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id TEXT NOT NULL, user_id TEXT NOT NULL,
  joined_at INTEGER DEFAULT (strftime('%s','now')*1000),
  PRIMARY KEY (conversation_id, user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_conv_part_user ON conversation_participants(user_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL, sender_id TEXT NOT NULL,
  text TEXT NOT NULL, timestamp INTEGER NOT NULL, status TEXT DEFAULT 'sent',
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, timestamp);

-- ── Farragna (Likes) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL, from_name TEXT,
  to_user_id TEXT NOT NULL, to_name TEXT,
  timestamp INTEGER DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_likes_to ON likes(to_user_id);
CREATE INDEX IF NOT EXISTS idx_likes_from ON likes(from_user_id);

-- ── Pebalaash (Trades) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL, creator_name TEXT,
  offering TEXT, requesting TEXT, description TEXT,
  accepted_by TEXT, accepted_at INTEGER,
  status TEXT DEFAULT 'open',
  timestamp INTEGER DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_creator ON trades(creator_id);

-- ── CoRsA / Games Centre (Scores) ────────────────────────
CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL, player_name TEXT,
  game_id TEXT, score INTEGER DEFAULT 0,
  timestamp INTEGER DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_game ON scores(game_id);

-- ── Battalooda (Tracks) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL, creator_name TEXT,
  title TEXT NOT NULL, genre TEXT,
  duration INTEGER DEFAULT 0,
  plays INTEGER DEFAULT 0, likes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  timestamp INTEGER DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_tracks_creator ON tracks(creator_id);

-- ── Yahood (Posts) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL, author_name TEXT,
  title TEXT NOT NULL, content TEXT,
  category TEXT DEFAULT 'General',
  likes INTEGER DEFAULT 0, comments TEXT,
  timestamp INTEGER DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);

-- ── Eb3at (File Transfers) ───────────────────────────────
CREATE TABLE IF NOT EXISTS file_transfers (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL, sender_name TEXT,
  recipient_id TEXT NOT NULL,
  file_name TEXT, file_size INTEGER, file_type TEXT,
  status TEXT DEFAULT 'pending',
  timestamp INTEGER DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_ft_sender ON file_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_ft_recipient ON file_transfers(recipient_id);
