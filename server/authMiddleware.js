/**
 * ============================================================================
 * Auth Middleware - Route Protection (CRITICAL FIX #4)
 * ============================================================================
 * 
 * This middleware protects routes by requiring valid JWT authentication.
 * 
 * USAGE in server.js:
 *   import { authMiddleware, requireRole } from './middleware/authMiddleware.js';
 *   
 *   // Protect single route
 *   app.get('/api/assets', authMiddleware, assetController.getAssets);
 *   
 *   // Protect with role check
 *   app.delete('/api/user/:id', authMiddleware, requireRole(['admin']), userController.deleteUser);
 */

import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

/**
 * ============================================================================
 * authMiddleware - Verify JWT and attach user to request
 * ============================================================================
 * 
 * Required: Bearer token in Authorization header
 * Format: Authorization: Bearer <token>
 * 
 * Sets: req.user = { userId, email, type, exp, iat }
 * 
 * Returns:
 *   - 401: No token provided
 *   - 403: Token is invalid or malformed
 *   - 401: Token expired
 *   - 401: User not found in database
 */
export const authMiddleware = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        code: 'AUTH_NO_TOKEN',
        message: 'Authorization header with Bearer token required'
      });
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    // Verify token signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        console.warn('[Auth] Token expired for user');
        return res.status(401).json({
          error: 'Token expired',
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Your session has expired. Please login again.'
        });
      }

      if (err.name === 'JsonWebTokenError') {
        console.warn('[Auth] Invalid token:', err.message);
        return res.status(403).json({
          error: 'Invalid token',
          code: 'AUTH_INVALID_TOKEN',
          message: 'Your authentication token is malformed or invalid.'
        });
      }

      throw err;
    }

    // Verify user still exists in database
    const userResult = await query(
      'SELECT id, email FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      console.warn('[Auth] User not found:', decoded.userId);
      return res.status(401).json({
        error: 'User not found',
        code: 'AUTH_USER_DELETED',
        message: 'Your user account no longer exists.'
      });
    }

    // Attach user to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      type: decoded.type || 'access',
      exp: decoded.exp, // Token expiry timestamp
      iat: decoded.iat  // Token issued at
    };

    console.log(`[Auth] Request authenticated for user: ${decoded.email}`);
    next();

  } catch (error) {
    console.error('[Auth] Middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR',
      message: 'An error occurred during authentication.'
    });
  }
};

/**
 * ============================================================================
 * requireRole - Role-based Authorization (Optional)
 * ============================================================================
 * 
 * Use after authMiddleware to check user roles.
 * 
 * USAGE:
 *   app.delete('/api/admin/users/:id', authMiddleware, requireRole(['admin']), ...)
 *   app.patch('/api/moderator/reports/:id', authMiddleware, requireRole(['admin', 'moderator']), ...)
 * 
 * Returns:
 *   - 403: User doesn't have required role
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'AUTH_NO_USER',
        message: 'This endpoint requires authentication.'
      });
    }

    const userRole = req.user.role || 'user';

    if (!allowedRoles.includes(userRole)) {
      console.warn(`[Auth] Insufficient permissions. User role: ${userRole}, required: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'AUTH_INSUFFICIENT_PERMISSIONS',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * ============================================================================
 * Optional Middleware: requireAdmin
 * ============================================================================
 * 
 * Convenience middleware for admin-only routes.
 * 
 * USAGE:
 *   app.delete('/api/admin/users/:id', authMiddleware, requireAdmin, ...)
 */
export const requireAdmin = requireRole(['admin']);

/**
 * ============================================================================
 * Optional Middleware: requireModerator
 * ============================================================================
 * 
 * Convenience middleware for moderator/admin routes.
 * 
 * USAGE:
 *   app.patch('/api/moderation/ban/:id', authMiddleware, requireModerator, ...)
 */
export const requireModerator = requireRole(['admin', 'moderator']);

/**
 * ============================================================================
 * How to apply to routes in server.js
 * ============================================================================
 * 
 * // BASIC: Apply authMiddleware to single route
 * app.get('/api/user/profile', authMiddleware, (req, res) => {
 *   const userId = req.user.userId;
 *   const email = req.user.email;
 *   // ...
 * });
 * 
 * // APPLY TO MULTIPLE ROUTES AT ONCE
 * const protectedRouter = express.Router();
 * protectedRouter.use(authMiddleware); // All routes use auth
 * 
 * protectedRouter.get('/assets', assetController.getAssets);
 * protectedRouter.post('/transfer', transferController.create);
 * protectedRouter.get('/profile', userController.getProfile);
 * 
 * app.use('/api', protectedRouter);
 * 
 * // ADMIN-ONLY ROUTES
 * app.delete('/api/admin/users/:id', authMiddleware, requireAdmin, userController.delete);
 * app.get('/api/admin/stats', authMiddleware, requireAdmin, adminController.getStats);
 * 
 * // PUBLIC ROUTES (no middleware)
 * app.post('/api/auth/login', authController.login);
 * app.post('/api/auth/register', authController.register);
 * app.post('/api/auth/refresh', authController.refresh);
 * 
 * ============================================================================
 */
