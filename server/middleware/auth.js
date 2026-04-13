/**
 * Server-side auth middleware for Express
 * 
 * Verifies JWT from cb_token cookie or Authorization header.
 * Sets req.userId and req.sessionId for downstream routes.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION';

function verifyAuth(req, res, next) {
  // Extract token from cookie or Authorization header
  const token =
    req.cookies?.cb_token ||
    (req.headers.authorization || '').replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.sessionId = decoded.sessionId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
  }
}

/**
 * Optional auth — sets req.userId if token present, but doesn't block.
 */
function optionalAuth(req, res, next) {
  const token =
    req.cookies?.cb_token ||
    (req.headers.authorization || '').replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
      req.sessionId = decoded.sessionId;
    } catch (e) {
      // Token invalid, continue without auth
    }
  }
  next();
}

/**
 * Generate a JWT for a user session.
 * Call this from your login route.
 */
function generateToken(userId, sessionId) {
  return jwt.sign(
    { userId, sessionId },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = { verifyAuth, optionalAuth, generateToken };
