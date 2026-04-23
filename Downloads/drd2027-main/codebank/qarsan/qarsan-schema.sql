-- ══════════════════════════════════════════════════════════════
-- Qarsan System Database Schema (v2 — Dog-Protection Logic)
-- ══════════════════════════════════════════════════════════════

-- ── Qarsan state table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qarsan_state (
  user_id      UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  qarsan_mode  VARCHAR(20) NOT NULL DEFAULT 'OFF'
                           CHECK (qarsan_mode IN ('OFF', 'RANGED', 'EXPOSURE')),
  qarsan_wallet INTEGER    NOT NULL DEFAULT 0 CHECK (qarsan_wallet >= 0),
  steal_scope  VARCHAR(30) NOT NULL DEFAULT 'NONE'
                           CHECK (steal_scope IN ('NONE', 'QARSAN_WALLET_ONLY', 'ALL_ASSETS')),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qarsan_state_mode   ON qarsan_state(qarsan_mode);
CREATE INDEX IF NOT EXISTS idx_qarsan_state_wallet ON qarsan_state(qarsan_wallet);

-- ── WatchDog state table ───────────────────────────────────────
-- dog_state: ACTIVE | SLEEPING | DEAD
-- ACTIVE   → fed within 24h  → protected from theft
-- SLEEPING → 24-72h without feeding → extra mode disabled
-- DEAD     → 72h+ without feeding → fully exposed to Qarsan theft
CREATE TABLE IF NOT EXISTS watchdog_state (
  user_id        UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_fed_at    TIMESTAMP WITH TIME ZONE,
  dog_state      VARCHAR(10) NOT NULL DEFAULT 'SLEEPING'
                             CHECK (dog_state IN ('ACTIVE', 'SLEEPING', 'DEAD')),
  is_frozen      SMALLINT    NOT NULL DEFAULT 0,
  frozen_reason  TEXT,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchdog_state_dog ON watchdog_state(dog_state);
CREATE INDEX IF NOT EXISTS idx_watchdog_last_fed  ON watchdog_state(last_fed_at);

-- ── Qarsan steal log ───────────────────────────────────────────
-- Audit trail for all Qarsan theft events.
CREATE TABLE IF NOT EXISTS qarsan_steal_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID        NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  target_id     UUID        NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  codes_stolen  INTEGER     NOT NULL DEFAULT 0,
  silver_stolen INTEGER     NOT NULL DEFAULT 0,
  gold_stolen   INTEGER     NOT NULL DEFAULT 0,
  wallet_stolen INTEGER     NOT NULL DEFAULT 0,
  total_stolen  INTEGER     NOT NULL DEFAULT 0,
  tx_id         UUID,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_steal_log_actor  ON qarsan_steal_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_steal_log_target ON qarsan_steal_log(target_id);
CREATE INDEX IF NOT EXISTS idx_steal_log_time   ON qarsan_steal_log(created_at);

-- ── Dog notification log ───────────────────────────────────────
-- Records when a user sends a "buy a dog!" warning to another user.
CREATE TABLE IF NOT EXISTS qarsan_dog_notifications (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user   UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user     UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message     TEXT,
  seen        BOOLEAN   NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dog_notify_to   ON qarsan_dog_notifications(to_user);
CREATE INDEX IF NOT EXISTS idx_dog_notify_seen ON qarsan_dog_notifications(seen);

-- ── Ledger meta column ─────────────────────────────────────────
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';

-- ── Auto-update trigger for qarsan_state.updated_at ───────────
CREATE OR REPLACE FUNCTION update_qarsan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_qarsan_updated_at_trigger ON qarsan_state;
CREATE TRIGGER update_qarsan_updated_at_trigger
  BEFORE UPDATE ON qarsan_state
  FOR EACH ROW EXECUTE FUNCTION update_qarsan_updated_at();

DROP TRIGGER IF EXISTS update_watchdog_updated_at_trigger ON watchdog_state;
CREATE TRIGGER update_watchdog_updated_at_trigger
  BEFORE UPDATE ON watchdog_state
  FOR EACH ROW EXECUTE FUNCTION update_qarsan_updated_at();

-- ── Helper: get user email ─────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_email(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM users WHERE id = user_uuid;
  RETURN user_email;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ── Helper: log Qarsan operation ───────────────────────────────
CREATE OR REPLACE FUNCTION log_qarsan_operation(
  operation_type  TEXT,
  p_user_id       UUID,
  p_target_id     UUID    DEFAULT NULL,
  p_amount        INTEGER DEFAULT NULL,
  p_mode          TEXT    DEFAULT NULL,
  p_extra         JSONB   DEFAULT '{}'
)
RETURNS VOID AS $$
DECLARE
  u_email  TEXT;
  t_email  TEXT;
  payload  JSONB;
BEGIN
  u_email := get_user_email(p_user_id);
  IF p_target_id IS NOT NULL THEN
    t_email := get_user_email(p_target_id);
  END IF;

  payload := jsonb_build_object(
    'operation',     operation_type,
    'userId',        p_user_id,
    'userEmail',     u_email,
    'targetUserId',  p_target_id,
    'targetEmail',   t_email,
    'amount',        p_amount,
    'mode',          p_mode,
    'timestamp',     NOW(),
    'extra',         p_extra
  );

  INSERT INTO audit_log (type, payload) VALUES ('QARSAN_' || operation_type, payload);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to log Qarsan operation: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ── View: exposed users (dead dog, non-empty) ──────────────────
CREATE OR REPLACE VIEW v_qarsan_exposed_users AS
SELECT
  u.id,
  COALESCE(u.name, u.username, split_part(u.email,'@',1)) AS display_name,
  ws.dog_state,
  ws.last_fed_at,
  EXTRACT(EPOCH FROM (NOW() - ws.last_fed_at))/3600 AS hours_since_fed,
  COALESCE((SELECT SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END)
            FROM ledger WHERE user_id=u.id AND asset_type='codes'), 0)::int  AS codes_balance,
  COALESCE((SELECT SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END)
            FROM ledger WHERE user_id=u.id AND asset_type='silver'), 0)::int AS silver_balance,
  COALESCE((SELECT SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END)
            FROM ledger WHERE user_id=u.id AND asset_type='gold'), 0)::int   AS gold_balance
FROM users u
JOIN watchdog_state ws ON ws.user_id = u.id
WHERE ws.dog_state = 'DEAD';
