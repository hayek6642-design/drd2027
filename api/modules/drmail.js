/**
 * Dr.D-mail — Virtual internal mail system
 * Admin can send messages to any user; users can read & reply.
 * Routes mounted at /api/drmail
 */
import { Router } from 'express'
import { query } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'dia201244@gmail.com').toLowerCase()

function isAdmin(req) {
  return req.user && (
    req.user.role === 'admin' ||
    req.user.role === 'superadmin' ||
    (req.user.email && req.user.email.toLowerCase() === ADMIN_EMAIL)
  )
}

// ─── Schema ────────────────────────────────────────────────────────────────
async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS drmail_messages (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id       UUID REFERENCES users(id) ON DELETE SET NULL,
      recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id       UUID REFERENCES drmail_messages(id) ON DELETE CASCADE,
      subject         TEXT NOT NULL DEFAULT 'Message from Admin',
      body            TEXT NOT NULL,
      is_read         BOOLEAN NOT NULL DEFAULT FALSE,
      sender_is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `, [])

  await query(`CREATE INDEX IF NOT EXISTS idx_drmail_recipient ON drmail_messages(recipient_id, created_at DESC)`, [])
  await query(`CREATE INDEX IF NOT EXISTS idx_drmail_parent    ON drmail_messages(parent_id)`, [])
  await query(`CREATE INDEX IF NOT EXISTS idx_drmail_sender    ON drmail_messages(sender_id)`, [])

  console.log('[Dr.D-mail] Schema ready')
}

ensureSchema().catch(e => console.error('[Dr.D-mail] Schema error:', e))

// All routes require authentication
router.use(requireAuth)

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/drmail/admin/users — list all users for the compose dropdown
router.get('/admin/users', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'FORBIDDEN' })
  try {
    const r = await query(`
      SELECT u.id, u.email, u.created_at,
             COALESCE(p.username, split_part(u.email, '@', 1)) AS username,
             p.avatar_url
      FROM users u
      LEFT JOIN users_profiles p ON p.user_id = u.id
      WHERE u.email != $1
      ORDER BY u.created_at DESC
      LIMIT 500
    `, [ADMIN_EMAIL])
    res.json({ ok: true, users: r.rows })
  } catch (e) {
    console.error('[Dr.D-mail] admin/users error:', e)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  }
})

// GET /api/drmail/admin/conversations — list all root messages with reply counts
router.get('/admin/conversations', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'FORBIDDEN' })
  try {
    const r = await query(`
      SELECT
        m.id, m.subject, m.body, m.created_at, m.is_read, m.sender_is_admin,
        m.recipient_id,
        COALESCE(p.username, split_part(u.email, '@', 1)) AS username,
        u.email,
        (SELECT COUNT(*) FROM drmail_messages r WHERE r.parent_id = m.id) AS reply_count,
        (SELECT COUNT(*) FROM drmail_messages r
           WHERE r.parent_id = m.id AND r.sender_is_admin = FALSE AND r.is_read = FALSE
        ) AS unread_replies,
        (SELECT MAX(r2.created_at) FROM drmail_messages r2
           WHERE r2.id = m.id OR r2.parent_id = m.id
        ) AS last_activity
      FROM drmail_messages m
      LEFT JOIN users u         ON u.id = m.recipient_id
      LEFT JOIN users_profiles p ON p.user_id = m.recipient_id
      WHERE m.parent_id IS NULL
      ORDER BY last_activity DESC
      LIMIT 200
    `, [])
    res.json({ ok: true, conversations: r.rows })
  } catch (e) {
    console.error('[Dr.D-mail] admin/conversations error:', e)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  }
})

// POST /api/drmail/admin/send — admin sends a new message to a user
router.post('/admin/send', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'FORBIDDEN' })
  try {
    const { recipientId, subject, body } = req.body
    if (!recipientId || !body?.trim()) {
      return res.status(400).json({ ok: false, error: 'MISSING_FIELDS' })
    }
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [recipientId])
    if (userCheck.rowCount === 0) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' })

    const r = await query(`
      INSERT INTO drmail_messages (sender_id, recipient_id, subject, body, sender_is_admin)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING id, created_at
    `, [req.user.id, recipientId, (subject?.trim() || 'Message from Admin'), body.trim()])

    res.json({ ok: true, message: r.rows[0] })
  } catch (e) {
    console.error('[Dr.D-mail] admin/send error:', e)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  }
})

// POST /api/drmail/admin/reply — admin replies to an existing thread
router.post('/admin/reply', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'FORBIDDEN' })
  try {
    const { rootId, body } = req.body
    if (!rootId || !body?.trim()) {
      return res.status(400).json({ ok: false, error: 'MISSING_FIELDS' })
    }
    const root = await query('SELECT id, recipient_id FROM drmail_messages WHERE id = $1 AND parent_id IS NULL', [rootId])
    if (root.rowCount === 0) return res.status(404).json({ ok: false, error: 'NOT_FOUND' })

    const recipientId = root.rows[0].recipient_id
    const r = await query(`
      INSERT INTO drmail_messages (sender_id, recipient_id, parent_id, body, sender_is_admin, subject)
      VALUES ($1, $2, $3, $4, TRUE, 'Re: reply')
      RETURNING id, created_at
    `, [req.user.id, recipientId, rootId, body.trim()])

    res.json({ ok: true, message: r.rows[0] })
  } catch (e) {
    console.error('[Dr.D-mail] admin/reply error:', e)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  }
})

// GET /api/drmail/admin/thread/:rootId — full thread for admin view
router.get('/admin/thread/:rootId', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'FORBIDDEN' })
  try {
    const { rootId } = req.params
    const r = await query(`
      SELECT
        m.id, m.sender_id, m.recipient_id, m.subject, m.body,
        m.created_at, m.is_read, m.sender_is_admin, m.parent_id,
        COALESCE(p.username, split_part(u.email, '@', 1)) AS username,
        u.email
      FROM drmail_messages m
      LEFT JOIN users u         ON u.id = m.recipient_id
      LEFT JOIN users_profiles p ON p.user_id = m.recipient_id
      WHERE m.id = $1 OR m.parent_id = $1
      ORDER BY m.created_at ASC
    `, [rootId])

    if (r.rowCount === 0) return res.status(404).json({ ok: false, error: 'NOT_FOUND' })

    // Mark user replies as read for admin
    await query(`
      UPDATE drmail_messages
      SET is_read = TRUE
      WHERE (id = $1 OR parent_id = $1) AND sender_is_admin = FALSE AND is_read = FALSE
    `, [rootId])

    res.json({ ok: true, thread: r.rows })
  } catch (e) {
    console.error('[Dr.D-mail] admin/thread error:', e)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  }
})

// GET /api/drmail/admin/unread-count — total unread user replies for admin
router.get('/admin/unread-count', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'FORBIDDEN' })
  try {
    const r = await query(`
      SELECT COUNT(*) AS count FROM drmail_messages
      WHERE sender_is_admin = FALSE AND is_read = FALSE
    `, [])
    res.json({ ok: true, count: parseInt(r.rows[0].count, 10) || 0 })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  }
})

// DELETE /api/drmail/admin/message/:id — admin deletes a message/thread
router.delete('/admin/message/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'FORBIDDEN' })
  try {
    await query('DELETE FROM drmail_messages WHERE id = $1 OR parent_id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// USER ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/drmail/inbox — user's inbox (root messages sent to them)
router.get('/inbox', async (req, res) => {
  try {
    const userId = req.user.id
    const r = await query(`
      SELECT
        m.id, m.subject, m.body, m.created_at, m.is_read,
        (SELECT COUNT(*) FROM drmail_messages r WHERE r.parent_id = m.id) AS reply_count,
        (SELECT MAX(r2.created_at) FROM drmail_messages r2
           WHERE r2.id = m.id OR r2.parent_id = m.id
        ) AS last_activity,
        (SELECT COUNT(*) FROM drmail_messages r
           WHERE r.parent_id = m.id AND r.sender_is_admin = TRUE AND r.is_read = FALSE
        ) AS new_from_admin
      FROM drmail_messages m
      WHERE m.recipient_id = $1 AND m.parent_id IS NULL
      ORDER BY last_activity DESC
      LIMIT 100
    `, [userId])
    res.json({ ok: true, messages: r.rows })
  } catch (e) {
    console.error('[Dr.D-mail] inbox error:', e)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  }
})

// GET /api/drmail/unread-count — unread messages for user
router.get('/unread-count', async (req, res) => {
  try {
    const r = await query(`
      SELECT COUNT(*) AS count FROM drmail_messages
      WHERE recipient_id = $1 AND is_read = FALSE AND sender_is_admin = TRUE
    `, [req.user.id])
    res.json({ ok: true, count: parseInt(r.rows[0].count, 10) || 0 })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  }
})

// GET /api/drmail/thread/:rootId — full thread for a user
router.get('/thread/:rootId', async (req, res) => {
  try {
    const userId = req.user.id
    const { rootId } = req.params

    const rootCheck = await query(
      'SELECT id FROM drmail_messages WHERE id = $1 AND recipient_id = $2 AND parent_id IS NULL',
      [rootId, userId]
    )
    if (rootCheck.rowCount === 0) return res.status(404).json({ ok: false, error: 'NOT_FOUND' })

    const r = await query(`
      SELECT id, sender_id, subject, body, created_at, is_read, sender_is_admin, parent_id
      FROM drmail_messages
      WHERE id = $1 OR parent_id = $1
      ORDER BY created_at ASC
    `, [rootId])

    // Mark all admin messages in thread as read
    await query(`
      UPDATE drmail_messages
      SET is_read = TRUE
      WHERE (id = $1 OR parent_id = $1) AND recipient_id = $2
        AND sender_is_admin = TRUE AND is_read = FALSE
    `, [rootId, userId])

    res.json({ ok: true, thread: r.rows })
  } catch (e) {
    console.error('[Dr.D-mail] thread error:', e)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  }
})

// POST /api/drmail/reply — user replies to a thread
router.post('/reply', async (req, res) => {
  try {
    const userId = req.user.id
    const { rootId, body } = req.body
    if (!rootId || !body?.trim()) {
      return res.status(400).json({ ok: false, error: 'MISSING_FIELDS' })
    }

    const root = await query(
      'SELECT id, recipient_id FROM drmail_messages WHERE id = $1 AND recipient_id = $2 AND parent_id IS NULL',
      [rootId, userId]
    )
    if (root.rowCount === 0) return res.status(404).json({ ok: false, error: 'NOT_FOUND' })

    const r = await query(`
      INSERT INTO drmail_messages (sender_id, recipient_id, parent_id, body, sender_is_admin, subject)
      VALUES ($1, $2, $3, $4, FALSE, 'User reply')
      RETURNING id, created_at
    `, [userId, userId, rootId, body.trim()])

    res.json({ ok: true, message: r.rows[0] })
  } catch (e) {
    console.error('[Dr.D-mail] reply error:', e)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  }
})

export default router
