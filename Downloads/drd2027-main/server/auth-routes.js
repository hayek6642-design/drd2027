/**
 * ============================================================================
 * Auth Routes - Complete Authentication System
 * ============================================================================
 * 
 * ENDPOINTS:
 * - POST /api/auth/register    - Create new user account
 * - POST /api/auth/login       - Authenticate and return tokens
 * - POST /api/auth/refresh     - Refresh expired access token (CRITICAL FIX #2)
 * - GET  /api/auth/session     - Validate current session (CRITICAL FIX #3)
 * - POST /api/auth/logout      - Invalidate session
 * 
 * USAGE in server.js:
 *   import authRoutes from './routes/auth-routes.js';
 *   app.use('/api/auth', authRoutes);
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { query } from '../config/db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get environment variables with fallbacks for development
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

/**
 * ============================================================================
 * POST /api/auth/register - User Registration
 * ============================================================================
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
        required: ['email', 'password']
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters',
        code: 'WEAK_PASSWORD'
      });
    }

    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows && existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userResult = await query(
      `INSERT INTO users (email, password_hash, username, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, email, username`,
      [email, passwordHash, username || email.split('@')[0]]
    );

    const user = userResult.rows[0];

    // Generate tokens
    const { token: accessToken, expiresIn } = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in database
    await storeRefreshToken(user.id, refreshToken);

    console.log(`[Auth] User registered: ${email}`);

    res.status(201).json({
      ok: true,
      message: 'User registered successfully',
      token: accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });

  } catch (error) {
    console.error('[Auth] Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * ============================================================================
 * POST /api/auth/login - User Login
 * ============================================================================
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user
    const userResult = await query(
      'SELECT id, email, password_hash, username FROM users WHERE email = $1',
      [email]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const { token: accessToken, expiresIn } = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in database
    await storeRefreshToken(user.id, refreshToken);

    console.log(`[Auth] User logged in: ${email}`);

    res.json({
      ok: true,
      message: 'Login successful',
      token: accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });

  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * ============================================================================
 * POST /api/auth/refresh - Token Refresh (CRITICAL FIX #2)
 * ============================================================================
 * 
 * Allows clients to refresh expired access tokens without re-authentication.
 * Implements token rotation: issues new refresh token and revokes old one.
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'No refresh token provided',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    // Verify refresh token signature
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Refresh token expired',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
      }
      return res.status(403).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    const userId = decoded.userId;

    // Check if token exists in database and not revoked
    const tokenResult = await query(
      `SELECT token FROM refresh_tokens 
       WHERE user_id = $1 AND token = $2 AND revoked_at IS NULL 
       AND expires_at > NOW()`,
      [userId, refreshToken]
    );

    if (!tokenResult.rows || tokenResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Refresh token not found or revoked',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Fetch user data
    const userResult = await query(
      'SELECT id, email, username FROM users WHERE id = $1',
      [userId]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    // CRITICAL: Token Rotation
    // 1. Revoke old refresh token
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND token = $2',
      [userId, refreshToken]
    );

    // 2. Generate new tokens
    const { token: newAccessToken, expiresIn } = generateAccessToken(user.id, user.email);
    const newRefreshToken = generateRefreshToken(user.id);

    // 3. Store new refresh token
    await storeRefreshToken(user.id, newRefreshToken);

    console.log(`[Auth] Token refreshed for user: ${user.email}`);

    res.json({
      ok: true,
      message: 'Token refreshed',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn
    });

  } catch (error) {
    console.error('[Auth] Refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * ============================================================================
 * GET /api/auth/session - Session Validation (CRITICAL FIX #3)
 * ============================================================================
 * 
 * Validates current session and returns user info.
 * Called by frontend on page load to restore session.
 */
router.get('/session', authMiddleware, async (req, res) => {
  try {
    // req.user is set by authMiddleware
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        authenticated: false,
        error: 'No valid session',
        code: 'NO_SESSION'
      });
    }

    // Fetch fresh user data from database
    const userResult = await query(
      'SELECT id, email, username, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({
        authenticated: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];
    const sessionExpires = req.user.exp * 1000; // Convert to milliseconds

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.created_at
      },
      sessionExpires: sessionExpires
    });

  } catch (error) {
    console.error('[Auth] Session validation error:', error);
    res.status(500).json({
      authenticated: false,
      error: 'Session validation failed',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * ============================================================================
 * POST /api/auth/logout - User Logout
 * ============================================================================
 * 
 * Invalidates user's session by revoking all refresh tokens.
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Revoke all refresh tokens for this user
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );

    console.log(`[Auth] User logged out: ${userId}`);

    res.json({
      ok: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('[Auth] Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * ============================================================================
 * Helper Functions
 * ============================================================================
 */

/**
 * Generate access token (short-lived, 15 minutes)
 */
function generateAccessToken(userId, email) {
  const payload = {
    userId,
    email,
    type: 'access'
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  });

  // Calculate actual expiry in seconds
  const decoded = jwt.decode(token);
  const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

  return { token, expiresIn };
}

/**
 * Generate refresh token (long-lived, 7 days)
 */
function generateRefreshToken(userId) {
  const payload = {
    userId,
    type: 'refresh'
  };

  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY
  });
}

/**
 * Store refresh token in database with expiry
 */
async function storeRefreshToken(userId, token) {
  try {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 days

    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (token) DO NOTHING`,
      [userId, token, expiryDate]
    );

    console.log(`[Auth] Refresh token stored for user: ${userId}`);
  } catch (error) {
    console.error('[Auth] Error storing refresh token:', error);
    throw error;
  }
}

export default router;
