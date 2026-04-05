// api/modules/samma3ny-automode.js
// Auto-Mode session management + silver bar reward for Samma3ny
// ─────────────────────────────────────────────────────────────
// Routes (all under /api/samma3ny):
//   POST /automode/start       — begin a new session
//   POST /automode/heartbeat   — keep-alive ping (every 30s from client)
//   POST /automode/cancel      — user switched off; resets counter
//   GET  /automode/status      — get current session status for logged-in user
//
// Reward logic:
//   Heartbeat gap < 3 min → adds elapsed time to duration_ms
//   Heartbeat gap >= 3 min → gap discarded (user paused/left)
//   When duration_ms >= 7,200,000 (2h) → auto-reward fires inside heartbeat
//
// Silver bar deposit touches:
//   1. automode_sessions   — marks rewarded = 1
//   2. codes               — inserts 1 silver code row
//   3. users               — silver_count += 1
//   4. balances            — silver_count += 1
//   5. ledger              — audit trail entry
//   6. globalThis.__sseEmit — SILVER_EARNED event to client

import { Router } from 'express';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Ensure cookies are parsed for every automode route (cookieParser may not
// have run yet if it is registered after this router in server.js)
router.use(cookieParser());
const TWO_HOURS_MS       = 2 * 60 * 60 * 1000;  // 7,200,000 ms
const HEARTBEAT_GAP_LIMIT = 3 * 60 * 1000;       // 3 min max acceptable gap

// ── Auto-create table (runs once on first use) ───────────────
let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS automode_sessions (
      id             TEXT    PRIMARY KEY,
      user_id        TEXT    NOT NULL,
      started_at     INTEGER NOT NULL,
      last_heartbeat INTEGER,
      duration_ms    INTEGER NOT NULL DEFAULT 0,
      rewarded       INTEGER NOT NULL DEFAULT 0,
      cancelled      INTEGER NOT NULL DEFAULT 0,
      completed_at   INTEGER
    )
  `);
  tableReady = true;
}

// ── Helper: get auth userId from request ─────────────────────
function getUserId(req) {
  return req.auth?.userId || req.session?.userId || req.user?.id || null;
}

// ── Helper: deposit silver bar ────────────────────────────────
async function depositSilverBar(userId, sessionId) {
  const silverCode = `SLV-AUTOMODE-${Date.now()}-${userId.slice(0, 8).toUpperCase()}`;
  const codeId   = crypto.randomUUID();
  const ledgerId = crypto.randomUUID();
  const now = Date.now();

  // 1. Insert silver code entry
  try {
    await query(
      `INSERT INTO codes (id, user_id, code, type, is_compressed, compressed_at)
       VALUES ($1, $2, $3, 'silver', 1, CURRENT_TIMESTAMP)`,
      [codeId, userId, silverCode]
    );
  } catch (e) {
    console.warn('[AUTOMODE] codes insert failed (may not exist):', e.message);
  }

  // 2. Update users.silver_count
  try {
    await query(
      `UPDATE users SET silver_count = COALESCE(silver_count, 0) + 1 WHERE id = $1`,
      [userId]
    );
  } catch (e) {
    console.warn('[AUTOMODE] users.silver_count update failed:', e.message);
  }

  // 3. Upsert balances.silver_count
  try {
    await query(
      `INSERT INTO balances (user_id, codes_count, silver_count, gold_count)
         VALUES ($1, 0, 1, 0)
       ON CONFLICT (user_id) DO UPDATE
         SET silver_count = COALESCE(balances.silver_count, 0) + 1`,
      [userId]
    );
  } catch (e) {
    console.warn('[AUTOMODE] balances.silver_count upsert failed:', e.message);
  }

  // 4. Ledger audit entry (try multiple schema variants)
  try {
    await query(
      `INSERT INTO ledger (id, user_id, type, amount, asset_type, description, created_at)
       VALUES ($1, $2, 'credit', 1, 'silver', 'Samma3ny Auto-Mode 2h listening reward', CURRENT_TIMESTAMP)`,
      [ledgerId, userId]
    );
  } catch (_) {
    try {
      await query(
        `INSERT INTO ledger (id, user_id, event_type, amount, asset_type, note, created_at)
         VALUES ($1, $2, 'SILVER_EARNED', 1, 'silver', 'Samma3ny Auto-Mode 2h reward', CURRENT_TIMESTAMP)`,
        [ledgerId, userId]
      );
    } catch (e2) {
      console.warn('[AUTOMODE] ledger insert failed (non-critical):', e2.message);
    }
  }

  // 5. Mark session rewarded
  await query(
    `UPDATE automode_sessions
     SET rewarded = 1, completed_at = $1, duration_ms = $2
     WHERE id = $3`,
    [now, TWO_HOURS_MS, sessionId]
  );

  // 6. SSE notification
  if (globalThis.__sseEmit) {
    globalThis.__sseEmit(userId, {
      type: 'SILVER_EARNED',
      amount: 1,
      asset_type: 'silver',
      source: 'samma3ny_automode',
      code: silverCode,
      message: '🎉 You earned 1 Silver Bar for 2 hours of listening on Samma3ny!'
    });
  }

  console.log(`[OK] [AUTOMODE] Silver bar deposited → user ${userId}, code: ${silverCode}`);
  return { silverCode, codeId };
}

// ── POST /automode/start ─────────────────────────────────────
router.post('/automode/start', requireAuth, async (req, res) => {
  try {
    await ensureTable();
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Cancel any existing active session (clean slate)
    await query(
      `UPDATE automode_sessions SET cancelled = 1 WHERE user_id = $1 AND rewarded = 0 AND cancelled = 0`,
      [userId]
    );

    const id  = crypto.randomUUID();
    const now = Date.now();
    await query(
      `INSERT INTO automode_sessions (id, user_id, started_at, last_heartbeat, duration_ms)
       VALUES ($1, $2, $3, $3, 0)`,
      [id, userId, now]
    );

    console.log(`[OK] [AUTOMODE] Session started → user ${userId}, session ${id}`);
    return res.json({ status: 'started', sessionId: id, startedAt: now });
  } catch (e) {
    console.error('[AUTOMODE] start error:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /automode/heartbeat ──────────────────────────────────
router.post('/automode/heartbeat', requireAuth, async (req, res) => {
  try {
    await ensureTable();
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const r = await query(
      `SELECT * FROM automode_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );
    const session = r.rows?.[0];
    if (!session)          return res.status(404).json({ error: 'Session not found' });
    if (session.cancelled) return res.status(409).json({ error: 'Session cancelled — start a new one' });
    if (session.rewarded)  return res.json({ status: 'already_rewarded', duration_ms: session.duration_ms });

    const now      = Date.now();
    const lastBeat = Number(session.last_heartbeat || session.started_at);
    const gap      = now - lastBeat;

    // Only count valid gaps (user was actually present and listening)
    const validGap   = gap <= HEARTBEAT_GAP_LIMIT ? gap : 0;
    const newDuration = Number(session.duration_ms || 0) + validGap;

    // 2h reached → reward!
    if (newDuration >= TWO_HOURS_MS) {
      const reward = await depositSilverBar(userId, sessionId);
      return res.json({
        status: 'rewarded',
        duration_ms: TWO_HOURS_MS,
        reward: { type: 'silver', amount: 1, code: reward.silverCode }
      });
    }

    // Update heartbeat
    await query(
      `UPDATE automode_sessions SET last_heartbeat = $1, duration_ms = $2 WHERE id = $3`,
      [now, newDuration, sessionId]
    );

    const remaining = TWO_HOURS_MS - newDuration;
    return res.json({
      status: 'alive',
      duration_ms: newDuration,
      remaining_ms: remaining,
      pct: Math.min(100, Math.floor((newDuration / TWO_HOURS_MS) * 100))
    });
  } catch (e) {
    console.error('[AUTOMODE] heartbeat error:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /automode/cancel ─────────────────────────────────────
router.post('/automode/cancel', requireAuth, async (req, res) => {
  try {
    await ensureTable();
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    await query(
      `UPDATE automode_sessions SET cancelled = 1 WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    console.log(`[OK] [AUTOMODE] Session cancelled → user ${userId}`);
    return res.json({ status: 'cancelled', message: 'Counter reset — start over to earn silver.' });
  } catch (e) {
    console.error('[AUTOMODE] cancel error:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ── GET /automode/status ─────────────────────────────────────
router.get('/automode/status', requireAuth, async (req, res) => {
  try {
    await ensureTable();
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const r = await query(
      `SELECT * FROM automode_sessions
       WHERE user_id = $1 AND rewarded = 0 AND cancelled = 0
       ORDER BY started_at DESC LIMIT 1`,
      [userId]
    );
    const session = r.rows?.[0];
    if (!session) return res.json({ status: 'none' });

    const durationMs = Number(session.duration_ms || 0);
    return res.json({
      status: 'active',
      sessionId: session.id,
      duration_ms: durationMs,
      remaining_ms: Math.max(0, TWO_HOURS_MS - durationMs),
      pct: Math.min(100, Math.floor((durationMs / TWO_HOURS_MS) * 100))
    });
  } catch (e) {
    console.error('[AUTOMODE] status error:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

export default router;
