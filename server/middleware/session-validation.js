/**
 * Session Validation Middleware
 * Validates JWT tokens and attaches user data to requests
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-min-32-chars';

/**
 * Extract token from Authorization header or cookies
 */
function extractToken(req) {
  // Try Authorization header first
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try cookies
  if (req.cookies && req.cookies.authToken) {
    return req.cookies.authToken;
  }
  
  return null;
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Create JWT token
 */
function createToken(userId, email, options = {}) {
  const payload = {
    id: userId,
    email: email,
    iat: Math.floor(Date.now() / 1000)
  };
  
  const tokenOptions = {
    expiresIn: options.expiresIn || '7d',
    algorithm: 'HS256'
  };
  
  return jwt.sign(payload, JWT_SECRET, tokenOptions);
}

/**
 * Middleware: Validate session (optional)
 * Doesn't reject, just populates req.session
 */
function validateSessionOptional(req, res, next) {
  const token = extractToken(req);
  
  if (token) {
    try {
      const decoded = verifyToken(token);
      req.session = {
        userId: decoded.id,
        email: decoded.email,
        token: token,
        authenticated: true
      };
    } catch (error) {
      req.session = {
        authenticated: false,
        error: error.message
      };
    }
  } else {
    req.session = {
      authenticated: false
    };
  }
  
  next();
}

/**
 * Middleware: Require valid session
 * Rejects request if no valid token
 */
function requireSession(req, res, next) {
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing authentication token'
    });
  }
  
  try {
    const decoded = verifyToken(token);
    req.session = {
      userId: decoded.id,
      email: decoded.email,
      token: token,
      authenticated: true
    };
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: error.message
    });
  }
}

module.exports = {
  extractToken,
  verifyToken,
  createToken,
  validateSessionOptional,
  requireSession,
  JWT_SECRET
};
