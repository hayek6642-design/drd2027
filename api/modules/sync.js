import { Router } from 'express'
import { query } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

/**
 * Endpoint: POST /api/codes/sync
 * Syncs a locally generated code to the Turso cloud database.
 */
router.post('/sync', requireAuth, async (req, res) => {
  const { code, meta } = req.body
  const userId = req.user.id
  
  if (!code) {
    return res.status(400).json({ success: false, error: 'code_required' })
  }

  try {
    await query(
      'INSERT INTO codes (id, user_id, code, metadata, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) ON CONFLICT (code) DO NOTHING',
      [crypto.randomUUID(), userId, code, JSON.stringify(meta || {})]
    )
    
    console.log(`[SYNC] Code ${code} synced for user ${userId}`)
    res.json({ success: true })
  } catch (err) {
    console.error('[SYNC ERROR]', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * Endpoint: GET /api/codes
 * Retrieves all codes for the authenticated user from the Turso cloud database.
 */
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.id
  
  try {
    const result = await query(
      'SELECT * FROM codes WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )
    
    res.json({ success: true, codes: result.rows })
  } catch (err) {
    console.error('[GET CODES ERROR]', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
