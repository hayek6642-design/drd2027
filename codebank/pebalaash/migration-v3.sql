-- Balloon Points System: migration v3
-- Run after migration-v2.sql

ALTER TABLE wallets ADD COLUMN IF NOT EXISTS balloon_points BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS balloon_logs (
  id         SERIAL PRIMARY KEY,
  user_id    UUID    NOT NULL,
  amount     INTEGER NOT NULL,
  option_key TEXT,
  new_total  BIGINT  NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balloon_logs_user    ON balloon_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_balloon_logs_created ON balloon_logs(created_at DESC);
