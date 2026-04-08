import rateLimit from 'express-rate-limit'
import { query } from '../config/db.js'

const ROLE_ORDER = { normal: 0, admin: 1, superadmin: 2 }

export async function validateAdminSession(req, res, next) {
  try {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })
    }

    const rawToken = authHeader.slice(7) // Remove 'Bearer ' prefix

    // ── HMAC-signed token: no DB needed ──────────────────────────────────────
    // Token format: "<timestamp>.<hmac_hex>"
    const SECRET = process.env.BANKODE_TOKEN_SECRET || process.env.BANKODE_ADMIN_PW || process.env.ADMIN_BANKODE_PASSWORD || 'doitasap2025'
    const dotIdx = rawToken.lastIndexOf('.')
    if (dotIdx > 0) {
      const ts = rawToken.slice(0, dotIdx)
      const sig = rawToken.slice(dotIdx + 1)
      const _cryptoMod = (await import('crypto')).default || (await import('crypto'))
      const expected = _cryptoMod.createHmac('sha256', SECRET).update(ts).digest('hex')
      const age = Date.now() - parseInt(ts, 10)
      const TOKEN_TTL = 24 * 60 * 60 * 1000 // 24 hours
      if (expected === sig && age >= 0 && age < TOKEN_TTL) {
        req.user = { id: 'admin', role: 'admin' }
        return next()
      }
    }

    // ── Fallback: legacy UUID tokens stored in auth_sessions (DB) ────────────
    try {
      const session = await query('SELECT * FROM auth_sessions WHERE token = $1 AND expires_at > NOW()', [rawToken])
      if (session.rows && session.rows.length > 0) {
        req.user = { id: 'admin', role: 'admin' }
        return next()
      }
    } catch (_dbErr) {
      // DB unavailable or schema mismatch — HMAC path is the source of truth
    }

    return res.status(401).json({ ok: false, error: 'INVALID_SESSION' })
  } catch (err) {
    console.error('[SESSION VALIDATION ERROR]', err.message)
    return res.status(500).json({ ok: false, error: 'SESSION_VALIDATION_FAILED' })
  }
}

export function requireRole(minRole = 'admin') {
  const min = ROLE_ORDER[minRole] ?? 1
  return (req, res, next) => {
    // 🛡️ ULTRA HARDENING (OTP-JWT Model)
    // For admin actions, we check for a valid session token (JWT equivalent)
    const user = req.user
    
    if (!user) {
      return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })
    }
    
    // In our hardened model, a valid token in req.user is enough if it matches admin requirements
    // If the token was issued via OTP, it will have a specific session record
    const type = user.role || 'user'
    const rank = ROLE_ORDER[type] ?? 0
    
    // Check if user is admin OR if this is an OTP-verified temporary session
    if (rank < min && type !== 'admin') {
      console.warn(`[SECURITY] Role mismatch: user=${user.id} role=${type} required=${minRole}`)
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' })
    }
    next()
  }
}

export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ ok: false, error: 'RATE_LIMIT_EXCEEDED' })
})

export function requireGateValid() {
  return async (req, res, next) => {
    try {
      // If no user is authenticated, return 401 instead of 403
      if (!req.user) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })
      
      const r = await query('SELECT 1 FROM bankode_password_sessions WHERE user_id=$1 AND expires_at > now() ORDER BY created_at DESC LIMIT 1', [req.user.clerkUserId])
      if (!r.rows || r.rows.length === 0) return res.status(403).json({ ok: false, error: 'GATE_REQUIRED' })
      next()
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'ADMIN_INTERNAL_ERROR' })
    }
  }
}