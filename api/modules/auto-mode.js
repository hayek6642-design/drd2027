/**
 * Auto-mode API Module
 * Manages auto-mode sessions and silver generation for continuous play
 * 
 * When user activates auto-mode in Samma3ny:
 * - Spend 1 code (verified via transaction)
 * - Create auto-mode session in DB
 * - Client polls /api/auto-mode/check every minute
 * - Every 2 hours of continuous play → award 1 silver
 * - Server-side job also runs periodically as fallback
 * 
 * Endpoints:
 * POST /api/auto-mode/start - Start auto-mode session
 * POST /api/auto-mode/stop  - Stop auto-mode session  
 * GET  /api/auto-mode/check - Check if 2 hours elapsed, award silver if yes
 */

import { Router } from 'express'
import { query } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'
import crypto from 'crypto'

const router = Router()

const AUTO_MODE_INTERVAL_MS = 2 * 60 * 60 * 1000  // 2 hours = 7,200,000 ms
const SILVER_AWARD_AMOUNT = 1

// ─────────────────────────────────────────────────────────────────────────────
// Initialize auto_mode_sessions table
// ─────────────────────────────────────────────────────────────────────────────
;(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS auto_mode_sessions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL UNIQUE,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_silver_awarded_at TIMESTAMP,
        silver_awards_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES accounts(id) ON DELETE CASCADE
      )
    `)
    console.log('[AutoMode] Database initialized')
  } catch (err) {
    console.error('[AutoMode] DB init error:', err.message)
  }
})()

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auto-mode/start
// Start an auto-mode session for the user
// ─────────────────────────────────────────────────────────────────────────────
router.post('/start', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id

    // Check if session already active
    const existing = await query(
      'SELECT id FROM auto_mode_sessions WHERE user_id = $1 AND is_active = true',
      [userId]
    )

    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        message: 'Auto-mode already active',
        sessionId: existing.rows[0].id,
        nextSilverIn: AUTO_MODE_INTERVAL_MS
      })
    }

    // Create new session
    const sessionId = crypto.randomUUID()
    const now = new Date().toISOString()

    await query(
      `INSERT INTO auto_mode_sessions 
       (id, user_id, started_at, is_active, created_at) 
       VALUES ($1, $2, $3, true, $4)`,
      [sessionId, userId, now, now]
    )

    console.log(`[AutoMode] ✅ Session started for user ${userId}`)

    res.json({
      success: true,
      message: 'Auto-mode activated',
      sessionId,
      nextSilverIn: AUTO_MODE_INTERVAL_MS
    })
  } catch (err) {
    console.error('[AutoMode] Start error:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auto-mode/stop
// Stop the auto-mode session for the user
// ─────────────────────────────────────────────────────────────────────────────
router.post('/stop', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id

    const result = await query(
      'UPDATE auto_mode_sessions SET is_active = false WHERE user_id = $1 RETURNING *',
      [userId]
    )

    console.log(`[AutoMode] ✅ Session stopped for user ${userId}`)

    res.json({
      success: true,
      message: 'Auto-mode deactivated',
      sessionId: result.rows[0]?.id
    })
  } catch (err) {
    console.error('[AutoMode] Stop error:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auto-mode/check
// Check if 2 hours have elapsed since last award, grant silver if yes
// ─────────────────────────────────────────────────────────────────────────────
router.get('/check', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id

    // Get active auto-mode session
    const sessionResult = await query(
      'SELECT * FROM auto_mode_sessions WHERE user_id = $1 AND is_active = true',
      [userId]
    )

    if (sessionResult.rows.length === 0) {
      return res.json({
        success: true,
        isActive: false,
        message: 'No active auto-mode session',
        silverAwarded: 0
      })
    }

    const session = sessionResult.rows[0]
    const now = new Date()
    const lastAwardTime = session.last_silver_awarded_at
      ? new Date(session.last_silver_awarded_at)
      : new Date(session.started_at)

    const elapsedMs = now - lastAwardTime
    const shouldAward = elapsedMs >= AUTO_MODE_INTERVAL_MS

    if (shouldAward) {
      // Award silver
      const awardedAt = new Date().toISOString()

      // Update session
      await query(
        `UPDATE auto_mode_sessions 
         SET last_silver_awarded_at = $1, silver_awards_count = silver_awards_count + 1
         WHERE id = $2`,
        [awardedAt, session.id]
      )

      // Get current assets
      const assetsResult = await query(
        'SELECT silver FROM assets WHERE user_id = $1',
        [userId]
      )

      if (assetsResult.rows.length === 0) {
        console.warn(`[AutoMode] No assets found for user ${userId}`)
        return res.status(404).json({ success: false, error: 'Assets not found' })
      }

      const currentSilver = assetsResult.rows[0].silver || 0
      const newSilver = currentSilver + SILVER_AWARD_AMOUNT

      // Update assets
      await query(
        'UPDATE assets SET silver = $1 WHERE user_id = $2',
        [newSilver, userId]
      )

      // Log transaction
      await query(
        `INSERT INTO transactions (user_id, type, action, amount, service, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, 'silver', 'earn', SILVER_AWARD_AMOUNT, 'samma3ny',
         JSON.stringify({ source: 'auto_mode', sessionId: session.id }), awardedAt]
      )

      console.log(`[AutoMode] 🎉 Awarded ${SILVER_AWARD_AMOUNT} silver to user ${userId} (Total: ${session.silver_awards_count + 1})`)

      return res.json({
        success: true,
        isActive: true,
        silverAwarded: SILVER_AWARD_AMOUNT,
        totalAwards: session.silver_awards_count + 1,
        newAssets: {
          silver: newSilver
        },
        nextSilverIn: AUTO_MODE_INTERVAL_MS
      })
    }

    // Not yet time for silver
    const remainingMs = AUTO_MODE_INTERVAL_MS - elapsedMs

    res.json({
      success: true,
      isActive: true,
      silverAwarded: 0,
      totalAwards: session.silver_awards_count,
      elapsedMinutes: Math.round(elapsedMs / 1000 / 60),
      remainingMinutes: Math.round(remainingMs / 1000 / 60),
      nextSilverIn: Math.round(remainingMs)
    })
  } catch (err) {
    console.error('[AutoMode] Check error:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Process all active sessions and award silver
// Called by backend cron job (every 10 minutes)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/admin/process-awards', async (req, res) => {
  try {
    // Simple auth: check admin token
    const adminToken = req.headers['x-admin-token']
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(403).json({ success: false, error: 'Unauthorized' })
    }

    // Get all active sessions
    const sessionsResult = await query(
      'SELECT * FROM auto_mode_sessions WHERE is_active = true'
    )

    const sessions = sessionsResult.rows || []
    let awarded = 0
    const now = new Date()

    for (const session of sessions) {
      const lastAwardTime = session.last_silver_awarded_at
        ? new Date(session.last_silver_awarded_at)
        : new Date(session.started_at)

      const elapsedMs = now - lastAwardTime

      if (elapsedMs >= AUTO_MODE_INTERVAL_MS) {
        const awardedAt = now.toISOString()

        // Update session
        await query(
          `UPDATE auto_mode_sessions 
           SET last_silver_awarded_at = $1, silver_awards_count = silver_awards_count + 1
           WHERE id = $2`,
          [awardedAt, session.id]
        )

        // Get current assets
        const assetsResult = await query(
          'SELECT silver FROM assets WHERE user_id = $1',
          [session.user_id]
        )

        if (assetsResult.rows.length > 0) {
          const newSilver = (assetsResult.rows[0].silver || 0) + SILVER_AWARD_AMOUNT

          // Update assets
          await query(
            'UPDATE assets SET silver = $1 WHERE user_id = $2',
            [newSilver, session.user_id]
          )

          // Log transaction
          await query(
            `INSERT INTO transactions (user_id, type, action, amount, service, metadata, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [session.user_id, 'silver', 'earn', SILVER_AWARD_AMOUNT, 'samma3ny',
             JSON.stringify({ source: 'auto_mode_job', sessionId: session.id }), awardedAt]
          )

          awarded++
          console.log(`[AutoMode Job] 🎉 Awarded silver to user ${session.user_id}`)
        }
      }
    }

    res.json({
      success: true,
      processed: sessions.length,
      awarded,
      timestamp: now.toISOString()
    })
  } catch (err) {
    console.error('[AutoMode Job] Error:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
