// /api/middleware/auth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-change-in-production';


// In-memory dev sessions storage (for development/testing)
export const devSessions = new Map();


/**
 * Hard authentication - requires valid token
 * Returns 401 if no token or invalid
 */
export const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.cookies?.token;
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Authentication required',
            code: 'NO_TOKEN'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        req.userId = decoded.userId || decoded.id || decoded.sub;
        next();
    } catch (error) {
        return res.status(401).json({ 
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
        });
    }
};

/**
 * Soft authentication - sets user if token exists but doesn't require it
 * Always calls next() - never returns 401
 */
export const softAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.cookies?.token;
    
    // Initialize user as null (unauthenticated)
    req.user = null;
    req.userId = null;
    
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            req.userId = decoded.userId || decoded.id || decoded.sub;
        } catch (error) {
            // Token invalid - continue as anonymous
            // Don't throw error, just stay unauthenticated
        }
    }
    
    next();
};


/**
 * Development session middleware
 */
export const handleDevSession = (req, res, next) => {
    const devSessionId = req.headers['x-dev-session'] || req.query.devSession;
    if (devSessionId && devSessions.has(devSessionId)) {
        req.devSession = devSessions.get(devSessionId);
        req.isDevMode = true;
    }
    next();
};


/**
 * Create a new dev session
 */
export const createDevSession = (sessionData) => {
    const sessionId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    devSessions.set(sessionId, {
        ...sessionData,
        createdAt: new Date().toISOString(),
        id: sessionId
    });
    return sessionId};


/**
 * Optional: Admin check middleware
 */
export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (!req.user.isAdmin && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Default export for compatibility
export default { requireAuth, softAuth, requireAdmin, devSessions, handleDevSession, createDevSession };
