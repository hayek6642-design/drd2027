/**
 * Session Validation Middleware
 * Validates JWT tokens and attaches user data to requests
 * ES6 Module Format
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-min-32-chars';

/**
 * Extract token from Authorization header or cookies
 */
export function extractToken(req) {
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
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Alias for verifyToken - used as validateJWT
 */
export const validateJWT = verifyToken;

/**
 * Create JWT token
 */
export function createToken(userId, email, options = {}) {
  const payload = {
    id: userId,
    email: email,
    iat: Math.floor(Date.now() / 1000)
  };
  
  const tokenOptions = {
    expiresIn: options.expiresIn || '7d',
    ...options
  };
  
  return jwt.sign(payload, JWT_SECRET, tokenOptions);
}

/**
 * Middleware: Optional session validation
 * Validates token if present, doesn't fail if missing
 */
export function validateSessionOptional(req, res, next) {
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
      // Invalid token, but we continue anyway
      // (this is the "optional" part)
      if (req.cookies && req.cookies.authToken) {
        res.clearCookie('authToken');
      }
      req.session = {
        authenticated: false
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
 * Alias for validateSessionOptional - used as validateSession
 */
export const validateSession = validateSessionOptional;

/**
 * Middleware: Require valid session
 * Rejects request if no valid token
 */
export function requireSession(req, res, next) {
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

export default {
  extractToken,
  verifyToken,
  validateJWT,
  createToken,
  validateSessionOptional,
  validateSession,
  requireSession,
  JWT_SECRET
};
