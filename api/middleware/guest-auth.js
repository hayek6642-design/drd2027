/**
 * Guest Auth Middleware
 * Identifies requester as either registered user (via JWT/session) or guest (via guest ID header)
 * IMPORTANT: Guest content (likes/comments) never counted in database - guest interactions are ephemeral
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

/**
 * Identify requester: registered user OR guest
 * Sets req.user = { userId, email, isGuest: false } OR { guestId, isGuest: true }
 */
export async function identifyRequester(req, res, next) {
  try {
    // Try JWT/sessionId first (registered user)
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.sessionId ||
                  req.query?.sessionId;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          isGuest: false,
          source: 'jwt'
        };
        return next();
      } catch (err) {
        // JWT invalid, fall through to guest check
      }
    }

    // Fall back to guest ID
    const guestId = req.headers['x-guest-id'] || req.query?.guestId;
    if (guestId && /^guest_\d+_[a-z0-9]+$/.test(guestId)) {
      req.user = {
        guestId,
        isGuest: true,
        source: 'header'
      };
      return next();
    }

    // No auth found
    req.user = null;
    next();
  } catch (err) {
    console.error('[Auth] identifyRequester error:', err.message);
    req.user = null;
    next();
  }
}

/**
 * Require either registered user OR guest (for creating content)
 */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required. Please log in or use guest mode.' 
    });
  }
  next();
}

/**
 * Require registered user only (for monetization, account settings, etc.)
 */
export function requireUser(req, res, next) {
  if (!req.user || req.user.isGuest) {
    return res.status(403).json({ 
      success: false, 
      error: 'This action requires a registered account.' 
    });
  }
  next();
}

/**
 * Rate limiter for guests (separate from registered users)
 */
const guestRateLimits = new Map();

export function guestRateLimit(limit = 5, windowMs = 60000) {
  return (req, res, next) => {
    if (!req.user?.isGuest) return next(); // Only applies to guests

    const guestId = req.user.guestId;
    const now = Date.now();
    
    if (!guestRateLimits.has(guestId)) {
      guestRateLimits.set(guestId, []);
    }

    const requests = guestRateLimits.get(guestId).filter(t => now - t < windowMs);
    
    if (requests.length >= limit) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Try again later.',
        retryAfter: Math.ceil((requests[0] + windowMs - now) / 1000)
      });
    }

    requests.push(now);
    guestRateLimits.set(guestId, requests);
    next();
  };
}

/**
 * Clean up old rate limit entries (call periodically)
 */
export function cleanupRateLimits() {
  const now = Date.now();
  const hour = 3600000;
  
  for (const [guestId, requests] of guestRateLimits.entries()) {
    const recent = requests.filter(t => now - t < hour);
    if (recent.length === 0) {
      guestRateLimits.delete(guestId);
    } else {
      guestRateLimits.set(guestId, recent);
    }
  }
}

// Clean up every 30 minutes
setInterval(cleanupRateLimits, 30 * 60 * 1000);
