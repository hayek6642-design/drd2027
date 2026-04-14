/**
 * Authentication Routes v2.0
 * Guest-to-User flow with no redirects
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * POST /api/auth/login
 * Authenticate user and return token
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
    
    // Validate user (integrate with your user DB)
    const user = await validateUser(email, password);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'dev_secret_change_in_production',
      { expiresIn: '7d' }
    );
    
    // Set HTTP-only cookie
    res.cookie('zagelsession', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    console.log('[Auth] User logged in:', user.email);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.email
      },
      token: token
    });
    
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed' 
    });
  }
});

/**
 * GET /api/auth/me
 * Validate session and return user info
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.zagelsession || 
                  req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({ success: false, user: null });
    }
    
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'dev_secret_change_in_production'
    );
    
    const user = await getUserById(decoded.userId);
    
    if (!user) {
      return res.json({ success: false, user: null });
    }
    
    console.log('[Auth] Session validated for:', user.email);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.email
      },
      token: token
    });
    
  } catch (err) {
    console.error('[Auth] Validation error:', err);
    res.json({ success: false, user: null });
  }
});

/**
 * POST /api/auth/logout
 * Clear session
 */
router.post('/logout', (req, res) => {
  res.clearCookie('zagelsession');
  console.log('[Auth] User logged out');
  res.json({ success: true });
});

/**
 * POST /api/auth/merge-guest
 * Merge guest data to user account
 */
router.post('/merge-guest', async (req, res) => {
  try {
    const { guestId, userId } = req.body;
    
    if (!guestId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'guestId and userId required' 
      });
    }
    
    // Transfer guest data to user account
    await mergeGuestData(guestId, userId);
    
    console.log('[Auth] Guest data merged:', guestId, '→', userId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('[Auth] Merge failed:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Merge failed' 
    });
  }
});

/**
 * Placeholder: Implement these functions
 */
async function validateUser(email, password) {
  // TODO: Implement user validation against your database
  // Should verify password hash using bcrypt
  console.warn('[Auth] validateUser() not implemented - using mock');
  
  if (email && password.length > 0) {
    return {
      id: 'user_' + Date.now(),
      email: email,
      name: email.split('@')[0]
    };
  }
  return null;
}

async function getUserById(userId) {
  // TODO: Implement getting user from database by ID
  console.warn('[Auth] getUserById() not implemented - using mock');
  return null;
}

async function mergeGuestData(guestId, userId) {
  // TODO: Implement transferring guest data (bookmarks, settings, etc.) to user account
  console.warn('[Auth] mergeGuestData() not implemented');
}

module.exports = router;
