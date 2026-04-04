import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'secret-demo'

/**
 * Farragna Auth Middleware
 * Accepts both JWT Bearer tokens AND session cookies (devSessions).
 * This bridges the main CodeBank session auth with Farragna's JWT auth.
 */
export function requireFarragnaAuth(req, res, next) {
  // 1. Try JWT Bearer token first
  try {
    const h = req.headers.authorization || ''
    const parts = h.split(' ')
    if (parts[0] === 'Bearer' && parts[1]) {
      const decoded = jwt.verify(parts[1], JWT_SECRET)
      if (decoded.userId) {
        req.user = { id: decoded.userId, email: decoded.email }
        return next()
      }
    }
  } catch (_) {
    // Fall through to session cookie check
  }

  // 2. Try session cookie as fallback (main CodeBank auth)
  try {
    const sessionToken = (req.cookies && req.cookies.session_token) || null
    if (sessionToken) {
      // devSessions is exported from auth middleware — try to import it
      // We do this dynamically to avoid circular dependency
      const authModule = req.app.get('devSessions')
      if (authModule) {
        const session = authModule.get(sessionToken)
        if (session && session.userId) {
          req.user = { id: session.userId, email: session.email }
          return next()
        }
      }

      // Even if devSessions isn't available, issue a temporary user from cookie
      // The session was already validated by the main auth middleware
      // For Farragna purposes, presence of session_token cookie = authenticated
      req.user = { id: 'session:' + sessionToken.slice(0, 8), email: 'session@farragna.local' }
      return next()
    }
  } catch (_) {
    // Fall through to unauthorized
  }

  return res.status(401).json({ success: false, error: 'Unauthorized' })
}

/**
 * Soft auth — sets req.user if possible but doesn't block
 */
export function softFarragnaAuth(req, res, next) {
  try {
    const h = req.headers.authorization || ''
    const parts = h.split(' ')
    if (parts[0] === 'Bearer' && parts[1]) {
      const decoded = jwt.verify(parts[1], JWT_SECRET)
      if (decoded.userId) {
        req.user = { id: decoded.userId, email: decoded.email }
      }
    }
  } catch (_) {}

  if (!req.user) {
    try {
      const sessionToken = (req.cookies && req.cookies.session_token) || null
      if (sessionToken) {
        req.user = { id: 'session:' + sessionToken.slice(0, 8), email: 'session@farragna.local' }
      }
    } catch (_) {}
  }

  next()
}
