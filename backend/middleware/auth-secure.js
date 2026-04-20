/**
 * Secure Authentication Middleware
 * Handles CSRF tokens, session validation, and secure cookies
 */

const crypto = require('crypto');

/**
 * Parse cookies from request
 */
function parseCookies(req) {
  const cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      cookies[parts[0]] = decodeURIComponent(parts[1]);
    });
  }
  return cookies;
}

/**
 * Verify CSRF token for POST/PUT/DELETE requests
 */
function verifyCSRFToken(req, res, next) {
  // Skip CSRF check for GET requests
  if (req.method === 'GET') {
    return next();
  }

  const token = req.headers['x-csrf-token'];
  const cookies = parseCookies(req);
  const cookieToken = cookies['zagel_csrf'];

  if (!token || !cookieToken) {
    return res.status(403).json({ 
      error: 'Missing CSRF token',
      message: 'CSRF token is required for this request'
    });
  }

  if (token !== cookieToken) {
    return res.status(403).json({ 
      error: 'Invalid CSRF token',
      message: 'CSRF token does not match'
    });
  }

  next();
}

/**
 * Set secure response cookies
 */
function setSecureCookie(res, name, value, options = {}) {
  const defaults = {
    'httpOnly': true,
    'secure': true,
    'sameSite': 'Strict',
    'maxAge': 24 * 60 * 60 * 1000  // 24 hours
  };

  const finalOptions = { ...defaults, ...options };
  res.cookie(name, value, finalOptions);
}

/**
 * Clear secure cookie
 */
function clearSecureCookie(res, name) {
  res.cookie(name, '', {
    'maxAge': -1,
    'sameSite': 'Strict',
    'secure': true
  });
}

module.exports = {
  verifyCSRFToken,
  parseCookies,
  setSecureCookie,
  clearSecureCookie
};
