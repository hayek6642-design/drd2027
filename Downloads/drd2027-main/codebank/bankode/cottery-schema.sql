-- ============================================================================
-- COTTERY (Code+Lottery) - Complete Database Schema
-- ============================================================================
-- This schema must be executed in the same SQLite database as the main app
-- Run this file with: sqlite3 your_database.db < cottery-schema.sql
-- ============================================================================

-- Table 1: Cottery Rounds (Daily lottery rounds)
CREATE TABLE IF NOT EXISTS cottery_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_date DATE UNIQUE NOT NULL,
  status TEXT CHECK(status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
  total_entries INTEGER DEFAULT 0,
  prize_pool INTEGER DEFAULT 0,
  winner_user_id TEXT,
  winning_entry_id INTEGER,
  draw_timestamp DATETIME,
  draw_seed TEXT,
  draw_proof TEXT, -- Full SHA-256 calculation for verification
  executed_by TEXT, -- Admin user ID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (winner_user_id) REFERENCES users(id)
);

-- Table 2: Cottery Entries (User entries in each round)
CREATE TABLE IF NOT EXISTS cottery_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1, -- Number of entries purchased
  weight REAL DEFAULT 1.0, -- Weight multiplier (applied at draw time)
  is_eligible INTEGER DEFAULT 1, -- Boolean: Check cooldown
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (round_id) REFERENCES cottery_rounds(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(round_id, user_id)
);

-- Table 3: Cottery Winners (Prize distribution record)
CREATE TABLE IF NOT EXISTS cottery_winners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  prize_amount INTEGER NOT NULL,
  winning_entry_id INTEGER NOT NULL,
  probability REAL, -- Actual probability at time of draw
  claimed_at DATETIME,
  status TEXT CHECK(status IN ('pending', 'claimed', 'expired')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (round_id) REFERENCES cottery_rounds(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table 4: Cottery Ledger (Win history and fairness weights)
CREATE TABLE IF NOT EXISTS cottery_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  win_count_30d INTEGER DEFAULT 0, -- Wins in last 30 days
  loss_streak INTEGER DEFAULT 0, -- Consecutive losses
  last_win_date DATETIME,
  last_loss_date DATETIME,
  cooldown_until DATETIME, -- Cannot win until this time
  current_weight REAL DEFAULT 1.0, -- 1.0 = normal, min 0.1
  pity_level INTEGER DEFAULT 0, -- 0=none, 1=+50%, 2=+100%, 3=+150%+guaranteed
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table 5: Cottery User Stats (Historical statistics)
CREATE TABLE IF NOT EXISTS cottery_user_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  total_entries_bought INTEGER DEFAULT 0,
  total_codes_spent INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_prize_codes INTEGER DEFAULT 0,
  win_rate REAL DEFAULT 0.0,
  last_participation_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table 6: Cottery Audit Log (All draw executions)
CREATE TABLE IF NOT EXISTS cottery_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL,
  executed_by TEXT NOT NULL, -- Admin user ID
  draw_seed TEXT NOT NULL,
  winner_id TEXT,
  prize_amount INTEGER,
  total_entries INTEGER,
  status TEXT CHECK(status IN ('success', 'failed', 'cancelled')) DEFAULT 'success',
  error_message TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (round_id) REFERENCES cottery_rounds(id),
  FOREIGN KEY (executed_by) REFERENCES users(id)
);

-- Table 7: Cottery Pity History (Track pity bonus activations)
CREATE TABLE IF NOT EXISTS cottery_pity_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  activation_date DATETIME,
  pity_level INTEGER, -- 1, 2, or 3
  loss_count INTEGER, -- How many losses triggered it
  was_used DATETIME, -- When pity was used (won a round)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================================
-- INDEXES (Performance optimization)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cottery_rounds_date ON cottery_rounds(round_date);
CREATE INDEX IF NOT EXISTS idx_cottery_rounds_status ON cottery_rounds(status);
CREATE INDEX IF NOT EXISTS idx_cottery_entries_user ON cottery_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_cottery_entries_round ON cottery_entries(round_id);
CREATE INDEX IF NOT EXISTS idx_cottery_winners_user ON cottery_winners(user_id);
CREATE INDEX IF NOT EXISTS idx_cottery_winners_date ON cottery_winners(created_at);
CREATE INDEX IF NOT EXISTS idx_cottery_ledger_user ON cottery_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_cottery_audit_log_date ON cottery_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_cottery_audit_log_round ON cottery_audit_log(round_id);

-- ============================================================================
-- VIEWS (For easy querying)
-- ============================================================================

-- View: Current round stats
CREATE VIEW IF NOT EXISTS cottery_current_round_stats AS
SELECT 
  cr.id,
  cr.round_date,
  cr.status,
  cr.total_entries,
  cr.prize_pool,
  COUNT(DISTINCT ce.user_id) as participating_users,
  AVG(ce.weight) as avg_weight
FROM cottery_rounds cr
LEFT JOIN cottery_entries ce ON cr.id = ce.round_id
WHERE cr.status = 'pending'
GROUP BY cr.id;

-- View: User win history (last 30 days)
CREATE VIEW IF NOT EXISTS cottery_user_recent_wins AS
SELECT 
  cw.user_id,
  COUNT(*) as win_count_30d,
  MAX(cw.created_at) as last_win_date,
  SUM(cw.prize_amount) as total_prize_codes
FROM cottery_winners cw
WHERE cw.created_at > datetime('now', '-30 days')
GROUP BY cw.user_id;

-- View: Fairness dashboard
CREATE VIEW IF NOT EXISTS cottery_fairness_dashboard AS
SELECT 
  COUNT(DISTINCT cr.id) as total_rounds_completed,
  AVG(cr.total_entries) as avg_entries_per_round,
  AVG(cr.prize_pool) as avg_prize_pool,
  (SELECT COUNT(*) FROM cottery_pity_history WHERE was_used IS NOT NULL) as pity_activations_used,
  (SELECT AVG(current_weight) FROM cottery_ledger) as avg_user_weight
FROM cottery_rounds cr
WHERE cr.status = 'completed';

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Create today's pending round if it doesn't exist
INSERT OR IGNORE INTO cottery_rounds (round_date, status)
VALUES (DATE('now'), 'pending');

-- ============================================================================
-- NOTES
-- ============================================================================
/*
Schema Version: 1.0
Last Updated: 2026-04-16

Key Design Decisions:
1. SQLite INTEGER PRIMARY KEY (autoincrement)
2. TEXT for UUIDs (user IDs) - stored as-is from users table
3. REAL for weight/probability calculations
4. DATETIME for timestamps (ISO 8601 format)
5. Separate ledger and stats tables for normalization
6. Audit log for admin accountability
7. Pity history for transparency
8. Views for common queries (performance)

Migration Path:
- Add tables one at a time if integrating with existing system
- Run indexes AFTER data is loaded for performance
- Views are read-only, safe to add/remove

Transaction Support:
- All money-related operations should use BEGIN TRANSACTION
- Entry purchase + ACC deduction should be atomic
- Prize distribution + ACC addition should be atomic
*/
