/**
 * Authentication Routes v2.0 - Backend Implementation
 * Complete Guest/User Authentication System
 * 
 * Endpoints:
 * POST /api/auth-v2/login - Authenticate user
 * GET /api/auth-v2/me - Get current user
 * POST /api/auth-v2/merge-guest - Merge guest data into user
 * POST /api/auth-v2/validate - Validate session token
 * POST /api/auth-v2/logout - Logout user
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════
// MOCK USER DATABASE - Replace with your actual DB
// ═══════════════════════════════════════════════════════════════════
const mockUsers = {
  'test@example.com': {
    id: 'user_123',
    email: 'test@example.com',
    password: '$2a$10$abcdefghijklmnopqrstuvwxyz', // hashed 'password123'
    name: 'Test User',
    createdAt: Date.now()
  }
};

const SECRET_KEY = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const TOKEN_EXPIRY = '24h';

// ═══════════════════════════════════════════════════════════════════
// HELPER: Validate User Credentials
// ═══════════════════════════════════════════════════════════════════
async function validateUser(email, password) {
  try {
    const user = mockUsers[email];
    if (!user) {
      console.log(`[AUTH] User not found: ${email}`);
      return null;
    }

    // In production: use bcrypt.compare(password, user.password)
    // For demo, we'll use simple comparison
    const isValid = password === 'password123';
    
    if (!isValid) {
      console.log(`[AUTH] Invalid password for: ${email}`);
      return null;
    }

    console.log(`[AUTH] User validated: ${email}`);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt
    };
  } catch (error) {
    console.error('[AUTH] Error validating user:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELPER: Generate JWT Token
// ═══════════════════════════════════════════════════════════════════
function generateToken(userId, email) {
  return jwt.sign(
    { 
      id: userId, 
      email,
      iat: Date.now(),
      type: 'user'
    },
    SECRET_KEY,
    { expiresIn: TOKEN_EXPIRY }
  );
}

// ═══════════════════════════════════════════════════════════════════
// HELPER: Verify JWT Token
// ═══════════════════════════════════════════════════════════════════
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return decoded;
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELPER: Get User by ID
// ═══════════════════════════════════════════════════════════════════
function getUserById(userId) {
  for (const [email, user] of Object.entries(mockUsers)) {
    if (user.id === userId) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      };
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// HELPER: Merge Guest Data
// ═══════════════════════════════════════════════════════════════════
function mergeGuestDataIntoUser(userId, guestData) {
  console.log(`[MERGE] Merging guest data for user: ${userId}`);
  console.log(`[MERGE] Guest data keys:`, Object.keys(guestData || {}));
  
  // In production, merge guest data into user database
  // Example: update user's data field with guestData
  return {
    userId,
    merged: true,
    guestDataKeys: Object.keys(guestData || {}),
    timestamp: Date.now()
  };
}

// ═══════════════════════════════════════════════════════════════════
// ENDPOINT 1: POST /api/auth-v2/login
// ═══════════════════════════════════════════════════════════════════
/**
 * Login endpoint - Authenticate user and return JWT
 * 
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "user": { id, email, name },
 *   "token": "jwt_token_here",
 *   "expiresIn": "24h"
 * }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required'
      });
    }

    // Validate credentials
    const user = await validateUser(email, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    // Set secure HTTP-only cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    console.log(`[AUTH] Login successful: ${email}`);

    return res.json({
      success: true,
      user,
      token,
      expiresIn: TOKEN_EXPIRY
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ENDPOINT 2: GET /api/auth-v2/me
// ═══════════════════════════════════════════════════════════════════
/**
 * Get current authenticated user
 * 
 * Headers:
 * Authorization: Bearer <token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "user": { id, email, name, createdAt }
 * }
 */
router.get('/me', (req, res) => {
  try {
    const token = req.cookies?.auth_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const user = getUserById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log(`[AUTH] /me request for user: ${user.email}`);

    return res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('[AUTH] /me error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ENDPOINT 3: POST /api/auth-v2/merge-guest
// ═══════════════════════════════════════════════════════════════════
/**
 * Merge guest session data into authenticated user
 * 
 * Headers:
 * Authorization: Bearer <token>
 * 
 * Request body:
 * {
 *   "guestSessionId": "guest_xxx",
 *   "guestData": { ... }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "merged": { userId, merged: true, keys: [...] }
 * }
 */
router.post('/merge-guest', (req, res) => {
  try {
    const token = req.cookies?.auth_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for merge'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const { guestSessionId, guestData } = req.body;

    if (!guestSessionId || !guestData) {
      return res.status(400).json({
        success: false,
        error: 'guestSessionId and guestData required'
      });
    }

    // Merge guest data into user
    const merged = mergeGuestDataIntoUser(decoded.id, guestData);

    console.log(`[AUTH] Guest data merged for user: ${decoded.id}`);

    return res.json({
      success: true,
      merged
    });
  } catch (error) {
    console.error('[AUTH] Merge guest error:', error);
    res.status(500).json({
      success: false,
      error: 'Merge failed'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ENDPOINT 4: POST /api/auth-v2/validate
// ═══════════════════════════════════════════════════════════════════
/**
 * Validate session token
 * 
 * Headers:
 * Authorization: Bearer <token>
 * 
 * Response:
 * {
 *   "valid": true,
 *   "user": { id, email },
 *   "expiresAt": timestamp
 * }
 */
router.post('/validate', (req, res) => {
  try {
    const token = req.cookies?.auth_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.json({
        valid: false,
        error: 'No token provided'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.json({
        valid: false,
        error: 'Invalid or expired token'
      });
    }

    const user = getUserById(decoded.id);

    console.log(`[AUTH] Token validated for user: ${user?.email || 'unknown'}`);

    return res.json({
      valid: true,
      user,
      expiresAt: decoded.exp * 1000
    });
  } catch (error) {
    console.error('[AUTH] Validate error:', error);
    res.json({
      valid: false,
      error: 'Validation failed'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ENDPOINT 5: POST /api/auth-v2/logout
// ═══════════════════════════════════════════════════════════════════
/**
 * Logout - Clear auth token
 * 
 * Response:
 * {
 *   "success": true
 * }
 */
router.post('/logout', (req, res) => {
  try {
    // Clear HTTP-only cookie
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    console.log('[AUTH] Logout successful');

    return res.json({
      success: true
    });
  } catch (error) {
    console.error('[AUTH] Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ENDPOINT 6: GET /api/auth-v2/status
// ═══════════════════════════════════════════════════════════════════
/**
 * Get auth system status
 * 
 * Response:
 * {
 *   "status": "ok",
 *   "authV2": "operational"
 * }
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    authV2: 'operational',
    timestamp: Date.now()
  });
});

export default router;
