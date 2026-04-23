-- ═══════════════════════════════════════════════════════════════
-- QARSAN v2 DATABASE MIGRATION
-- Run this against your Turso (SQLite) database
-- Tables are created with IF NOT EXISTS — safe to run multiple times
-- ═══════════════════════════════════════════════════════════════

-- ── qarsan_steal_log ──────────────────────────────────────────
-- Full audit trail of every Qarsan theft.
-- Also powers the 10-minute per-actor rate limit:
--   SELECT * FROM qarsan_steal_log WHERE actor_id = ? AND stolen_at > datetime('now','-10 minutes')
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qarsan_steal_log (
  id            TEXT    PRIMARY KEY,               -- UUID
  actor_id      TEXT    NOT NULL,                  -- the thief (user who executed Qarsan)
  victim_id     TEXT    NOT NULL,                  -- the target (exposed user)
  codes_stolen  INTEGER NOT NULL DEFAULT 0,
  silver_stolen INTEGER NOT NULL DEFAULT 0,
  gold_stolen   INTEGER NOT NULL DEFAULT 0,
  total_value   INTEGER NOT NULL DEFAULT 0,        -- codes + silver + gold combined
  stolen_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_steal_log_actor
  ON qarsan_steal_log (actor_id, stolen_at);

CREATE INDEX IF NOT EXISTS idx_steal_log_victim
  ON qarsan_steal_log (victim_id, stolen_at);

-- ── qarsan_dog_notifications ──────────────────────────────────
-- In-app notification bell for Qarsan events.
-- from_user_id = 'system' for steal notifications sent by the server.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qarsan_dog_notifications (
  id           TEXT    PRIMARY KEY,               -- UUID
  from_user_id TEXT    NOT NULL,                  -- sender ('system' allowed)
  to_user_id   TEXT    NOT NULL,                  -- recipient (the bell owner)
  message      TEXT    NOT NULL,
  seen         INTEGER NOT NULL DEFAULT 0,        -- 0 = unread, 1 = read
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notif_to_user
  ON qarsan_dog_notifications (to_user_id, seen, created_at DESC);

-- ── v_qarsan_exposed_users ────────────────────────────────────
-- Convenience view: all users whose dog is DEAD.
-- Use for quick lookups without computing dog state each time.
-- ─────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS v_qarsan_exposed_users;
CREATE VIEW v_qarsan_exposed_users AS
SELECT
  u.id,
  COALESCE(u.name, u.username, substr(u.email, 1, instr(u.email, '@') - 1)) AS display_name,
  ws.last_fed_at,
  ws.dog_state,
  COALESCE((
    SELECT SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END)
    FROM ledger WHERE user_id = u.id AND asset_type = 'codes'
  ), 0) AS codes_balance,
  COALESCE((
    SELECT SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END)
    FROM ledger WHERE user_id = u.id AND asset_type = 'silver'
  ), 0) AS silver_balance,
  COALESCE((
    SELECT SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END)
    FROM ledger WHERE user_id = u.id AND asset_type = 'gold'
  ), 0) AS gold_balance
FROM users u
JOIN watchdog_state ws ON ws.user_id = u.id
WHERE ws.dog_state = 'DEAD'
  AND COALESCE(ws.is_frozen, 0) = 0;
