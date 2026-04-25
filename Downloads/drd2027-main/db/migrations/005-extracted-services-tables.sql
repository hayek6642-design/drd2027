-- ============================================================================
-- Migration 005: Extracted Services Tables
-- Quran, Messages, Phone Calls, AI Chat, Platform Manager
-- ============================================================================

-- QURAN SERVICE
CREATE TABLE IF NOT EXISTS quran_bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  surah_id INTEGER NOT NULL,
  verse_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, surah_id, verse_id)
);

CREATE TABLE IF NOT EXISTS quran_reading_progress (
  user_id TEXT PRIMARY KEY,
  surah_id INTEGER NOT NULL,
  verse_id INTEGER NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- MESSAGES / DRD-MAIL SERVICE
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  is_draft BOOLEAN DEFAULT 0,
  thread_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);

-- PHONE CALLS SERVICE
CREATE TABLE IF NOT EXISTS phone_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  contact_name TEXT,
  duration_seconds INTEGER,
  call_type TEXT CHECK(call_type IN ('incoming', 'outgoing', 'missed')),
  call_status TEXT DEFAULT 'completed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_calls_user ON phone_calls(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_calls_contact ON phone_calls(contact_number);

CREATE TABLE IF NOT EXISTS phone_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  number TEXT NOT NULL,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, number)
);

-- AI CHAT SERVICE
CREATE TABLE IF NOT EXISTS ai_chat_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT CHECK(role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(thread_id) REFERENCES ai_chat_threads(thread_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_thread ON ai_chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_user ON ai_chat_threads(user_id);

-- PLATFORM MANAGER SERVICE
CREATE TABLE IF NOT EXISTS platform_broadcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  sent_by TEXT NOT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);

CREATE TABLE IF NOT EXISTS platform_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  user_id TEXT,
  details TEXT,
  severity TEXT DEFAULT 'info',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_type ON platform_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_logs_user ON platform_logs(user_id);

-- Service sync metadata
CREATE TABLE IF NOT EXISTS service_sync_state (
  service_name TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_count INTEGER DEFAULT 1,
  UNIQUE(service_name, user_id)
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quran_user ON quran_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_calls_created ON phone_calls(created_at);
CREATE INDEX IF NOT EXISTS idx_broadcasts_expires ON platform_broadcasts(expires_at);
