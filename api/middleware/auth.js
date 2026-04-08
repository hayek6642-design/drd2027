import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export const devSessions = new Map();

export const requireAuth = async (req, res, next) => {
  try {
    let token = (req.cookies && req.cookies.session_token) || null;
    
    // Check Authorization header if cookie is missing
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({ ok: false, error: 'unauthorized', message: 'No session token' });
    }

    // 🛡️ MODIFIED: Check in-memory devSessions FIRST (used by /api/auth/signup and /api/auth/login)
    const memSession = devSessions.get(token);
    if (memSession) {
      req.user = {
        id: memSession.userId,
        email: memSession.email,
        role: memSession.role || 'user',
        isUntrusted: memSession.isUntrusted || false,
        sessionId: token
      };
      return next();
    }
    
    // Check database auth_sessions
    try {
      const dbSession = await query('SELECT user_id, expires_at FROM auth_sessions WHERE token = $1 OR token_hash = $2', [token, token]);
      if (dbSession.rows && dbSession.rows.length > 0 && new Date() < new Date(dbSession.rows[0].expires_at)) {
        const userId = dbSession.rows[0].user_id;
        const userRes = await query('SELECT email, user_type, is_untrusted FROM users WHERE id = $1', [userId]);
        if (userRes.rows && userRes.rows.length > 0) {
          req.user = {
            id: userId,
            email: userRes.rows[0].email,
            role: userRes.rows[0].user_type,
            isUntrusted: userRes.rows[0].is_untrusted || false,
            sessionId: token
          };
          return next();
        }
      }
    } catch (e) {
      console.error('[AUTH DB ERROR]', e);
    }

    // Also check for JWT (for Farragna or others)
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'secret-demo';
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.userId) {
        req.user = { 
          id: decoded.userId, 
          email: decoded.email,
          role: decoded.role || 'user',
          sessionId: token
        };
        return next();
      }
    } catch (e) {
      // Ignore JWT errors if it's not a JWT
    }

    return res.status(401).json({ ok: false, error: 'unauthorized', message: 'Invalid session' });
    
  } catch (err) {
    console.error('[AUTH ERROR]', err);
    res.status(500).json({ ok: false, error: 'internal_error' });
  }
};
