import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../config/db.js'

const router = Router()

router.post('/setup-admin', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ ok: false, error: 'INVALID_INPUT' })
    const hash = await bcrypt.hash(password, 10)
    let user
    try {
      const ins = await query(
        `INSERT INTO users (id, email, password_hash, user_type)
         VALUES ($1,$2,$3,'admin')
         ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash
         RETURNING id, email, user_type`,
        [crypto.randomUUID(), email, hash]
      )
      user = ins.rows[0]
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'DB_ERROR' })
    }
    if (!user) {
      return res.status(500).json({ ok: false, error: 'USER_SETUP_FAILED' })
    }
    try { await query('UPDATE users SET user_type=$2 WHERE id=$1', [user.id, 'admin']) } catch (_) {}
    res.json({ ok: true, user })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'TEST_SETUP_ERROR' })
  }
})

router.post('/reset-user', async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email) return res.status(400).json({ ok: false, error: 'INVALID_INPUT' })
    let user
    try {
      const r = await query('SELECT id, email FROM users WHERE email=$1', [email])
      user = r.rows[0]
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'DB_ERROR' })
    }
    if (!user) return res.json({ ok: true })
    try { await query('UPDATE users SET user_type=$2 WHERE id=$1', [user.id, 'normal']) } catch (_) {}
    try { await query('DELETE FROM bankode_password_sessions WHERE user_id=$1', [user.id]) } catch (_) {}
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'TEST_RESET_ERROR' })
  }
})

export default router

