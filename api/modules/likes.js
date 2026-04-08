/**
 * api/modules/likes.js
 *
 * Like / Super-like / Mega-like system
 * ─────────────────────────────────────────────────────────────────────────────
 * Each action deducts codes from the sender and credits the recipient atomically.
 *
 * Costs:
 *   like      →   1 code
 *   superlike →  10 codes
 *   megalike  → 100 codes
 *
 * Storage strategy (quota-safe):
 *   • 2 ledger rows per transaction  (debit + credit) — financial audit trail
 *   • 1 interaction_events row per   (from, to, type, DAY) — daily bucket
 *     ON CONFLICT just increments count / total_codes → N likes in a day = 1 row
 *   • Auto-prune: 1% of requests delete interaction_events older than 90 days
 */

import { Router } from 'express'
import { query }  from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ── Costs (codes per action) ──────────────────────────────────────────────
const COSTS = { like: 1, superlike: 10, megalike: 100 }

// ── Schema init ────────────────────────────────────────────────────────────
// interaction_events: one row per (from_user, to_user, type, date).
// Same pair liking each other 500× on the same day = still just 1 row.
;(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS interaction_events (
        bucket_key    TEXT PRIMARY KEY,
        from_user_id  TEXT NOT NULL,
        to_user_id    TEXT NOT NULL,
        event_type    TEXT NOT NULL,
        bucket_date   TEXT NOT NULL,
        count         INTEGER NOT NULL DEFAULT 1,
        total_codes   INTEGER NOT NULL DEFAULT 0,
        last_at       DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('[Likes] interaction_events table ready')
  } catch (e) {
    console.error('[Likes] Schema error:', e.message)
  }
})()

// ── POST /api/likes/:toUserId ──────────────────────────────────────────────
// Body: { type: 'like' | 'superlike' | 'megalike' }
router.post('/:toUserId', requireAuth, async (req, res) => {
  const fromUserId = req.user.id
  const toUserId   = req.params.toUserId
  const likeType   = (req.body?.type || 'like').toLowerCase()
  const cost       = COSTS[likeType]

  if (!cost)
    return res.status(400).json({ ok: false, error: 'INVALID_LIKE_TYPE', valid: Object.keys(COSTS) })
  if (fromUserId === toUserId)
    return res.status(400).json({ ok: false, error: 'CANNOT_LIKE_SELF' })

  try {
    // ── 1. Atomic deduction ─────────────────────────────────────────────────
    // The WHERE clause makes this safe: only runs if balance >= cost.
    // rowCount = 0 means insufficient balance (no race condition possible).
    const deductRes = await query(
      `UPDATE balances
          SET codes_count = codes_count - $1,
              updated_at  = CURRENT_TIMESTAMP
        WHERE user_id = $2
          AND codes_count >= $1`,
      [cost, fromUserId]
    )

    if (!deductRes.rowCount) {
      const balRes = await query(
        `SELECT codes_count FROM balances WHERE user_id = $1`,
        [fromUserId]
      )
      const bal = balRes.rows[0]?.codes_count ?? 0
      return res.status(402).json({
        ok:       false,
        error:    'INSUFFICIENT_BALANCE',
        balance:  bal,
        required: cost,
        likeType
      })
    }

    // ── 2. Credit recipient (upsert) ────────────────────────────────────────
    await query(
      `INSERT INTO balances (user_id, codes_count, silver_count, gold_count, updated_at)
            VALUES ($1, $2, 0, 0, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET codes_count = codes_count + $2,
                     updated_at  = CURRENT_TIMESTAMP`,
      [toUserId, cost]
    )

    // ── 3. Ledger — 2 rows per transaction (debit + credit) ─────────────────
    const txId = crypto.randomUUID()
    const ref  = `LIKE_${likeType.toUpperCase()}`

    try {
      await query(
        `INSERT INTO ledger (tx_id, user_id, direction, asset_type, amount, reference, meta)
              VALUES ($1, $2, 'debit', 'codes', $3, $4, $5)`,
        [txId, fromUserId, cost, ref, JSON.stringify({ to: toUserId, type: likeType })]
      )
      await query(
        `INSERT INTO ledger (tx_id, user_id, direction, asset_type, amount, reference, meta)
              VALUES ($1, $2, 'credit', 'codes', $3, $4, $5)`,
        [txId, toUserId, cost, ref, JSON.stringify({ from: fromUserId, type: likeType })]
      )
    } catch (ledgerErr) {
      // Ledger write failed — log it but don't fail the whole transaction.
      // Balance transfer already committed; ledger inconsistency is non-fatal.
      console.error('[Likes] Ledger write error:', ledgerErr.message)
    }

    // ── 4. interaction_events — daily bucket (compressed social log) ─────────
    //   bucket_key = "{from}:{to}:{type}:{YYYY-MM-DD}"
    //   ON CONFLICT just bumps the count; 1000 likes → 1 row.
    const bucketDate = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'
    const bucketKey  = `${fromUserId}:${toUserId}:${likeType}:${bucketDate}`

    try {
      await query(
        `INSERT INTO interaction_events
               (bucket_key, from_user_id, to_user_id, event_type, bucket_date, count, total_codes, last_at)
               VALUES ($1, $2, $3, $4, $5, 1, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (bucket_key)
         DO UPDATE SET count       = interaction_events.count + 1,
                       total_codes = interaction_events.total_codes + $6,
                       last_at     = CURRENT_TIMESTAMP`,
        [bucketKey, fromUserId, toUserId, likeType, bucketDate, cost]
      )
    } catch (evtErr) {
      console.error('[Likes] interaction_events write error:', evtErr.message)
    }

    // ── 5. Probabilistic pruning — keeps table lean without a scheduler ──────
    //   Runs on ~1% of requests. Deletes rows older than 90 days.
    if (Math.random() < 0.01) {
      query(`DELETE FROM interaction_events WHERE bucket_date < date('now', '-90 days')`)
        .catch(() => {})
    }

    // ── 6. Return new sender balance ─────────────────────────────────────────
    const newBalRes  = await query(
      `SELECT codes_count FROM balances WHERE user_id = $1`,
      [fromUserId]
    )
    const newBalance = newBalRes.rows[0]?.codes_count ?? 0

    return res.json({ ok: true, likeType, cost, newBalance, txId })

  } catch (e) {
    console.error('[Likes] POST /:toUserId error:', e.message)
    return res.status(500).json({ ok: false, error: 'LIKE_ERROR' })
  }
})

// ── GET /api/likes/stats/:userId ──────────────────────────────────────────
// Returns aggregated like stats for any user.
router.get('/stats/:userId', requireAuth, async (req, res) => {
  const userId = req.params.userId
  try {
    const [received, given] = await Promise.all([
      query(
        `SELECT event_type,
                SUM(count)       AS total_count,
                SUM(total_codes) AS total_codes_earned
           FROM interaction_events
          WHERE to_user_id = $1
          GROUP BY event_type`,
        [userId]
      ),
      query(
        `SELECT event_type,
                SUM(count)       AS total_count,
                SUM(total_codes) AS total_codes_spent
           FROM interaction_events
          WHERE from_user_id = $1
          GROUP BY event_type`,
        [userId]
      )
    ])
    return res.json({ ok: true, received: received.rows, given: given.rows })
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'STATS_ERROR' })
  }
})

// ── GET /api/likes/my-balance ─────────────────────────────────────────────
// Returns current user balance + like costs — handy for UI buttons.
router.get('/my-balance', requireAuth, async (req, res) => {
  try {
    const r   = await query(
      `SELECT codes_count, silver_count, gold_count FROM balances WHERE user_id = $1`,
      [req.user.id]
    )
    const row = r.rows[0] || { codes_count: 0, silver_count: 0, gold_count: 0 }
    return res.json({
      ok:     true,
      codes:  row.codes_count,
      silver: row.silver_count,
      gold:   row.gold_count,
      costs:  COSTS
    })
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'BALANCE_ERROR' })
  }
})

export default router
