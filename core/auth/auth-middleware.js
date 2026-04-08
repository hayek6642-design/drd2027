
import { AuthService } from './auth-service.js';

/**
 * Middleware to protect routes.
 * Expects 'Authorization: Bearer <token>' or 'session_token' cookie.
 */
export async function requireAuth(req, res, next) {
    const token = req.cookies?.session_token || null;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized', message: 'No session token provided' });
    }
    try {
        const user = await AuthService.validateSession(token);
        if (!user) {
            res.clearCookie('session_token', { path: '/' });
            return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired session' });
        }
        req.user = user;
        next();
    } catch (err) {
        console.error('Auth Middleware Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * Optional Auth Middleware (does not block, just attaches user if valid)
 */
export async function optionalAuth(req, res, next) {
    const token = req.cookies?.session_token || null;
    if (!token) return next();
    try {
        const user = await AuthService.validateSession(token);
        if (user) req.user = user;
    } catch (ignore) { }
    next();
}
