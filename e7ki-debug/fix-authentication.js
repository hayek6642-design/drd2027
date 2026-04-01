/**
 * E7ki Authentication Fix
 * Fixes the critical authentication integration issues
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'e7ki-secret-key-for-development-only';

// Enhanced Authentication Middleware
export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access token required',
      message: 'Please provide a valid JWT token in the Authorization header'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid or expired token',
      message: 'Your authentication token is invalid or has expired'
    });
  }
}

// Session-based Authentication Middleware (for backward compatibility)
export function authenticateSession(req, res, next) {
  const sessionToken = req.cookies?.session_token;
  
  if (!sessionToken) {
    return res.status(401).json({ 
      success: false, 
      error: 'Session required',
      message: 'Please log in to access this resource'
    });
  }

  // For now, we'll use a simple validation
  // In production, this should validate against a session store
  if (sessionToken.length < 10) {
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid session',
      message: 'Your session is invalid'
    });
  }

  // Set user from session (this would normally come from database)
  req.user = { id: 'session-user-id', email: 'session@example.com' };
  next();
}

// Unified Authentication Middleware
export function authenticateUser(req, res, next) {
  // Try JWT first, then fall back to session
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  const sessionToken = req.cookies?.session_token;

  if (token) {
    return authenticateJWT(req, res, next);
  } else if (sessionToken) {
    return authenticateSession(req, res, next);
  } else {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required',
      message: 'Please provide either a JWT token or session cookie'
    });
  }
}

// Generate JWT Token
export function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    username: user.username || user.email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  return jwt.sign(payload, JWT_SECRET);
}

// User Registration Handler
export async function registerUser(req, res) {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email, username, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password too short',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user (in production, this would go to database)
    const user = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      username: username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    // Generate JWT token
    const token = generateToken(user);

    // Remove password from response
    const userResponse = { ...user };
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse,
      token: token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: 'An error occurred while registering your account'
    });
  }
}

// User Login Handler
export async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // In production, this would query the database
    // For now, we'll use a mock user
    const mockUser = {
      id: 'mock-user-id',
      email: email.toLowerCase(),
      username: email.split('@')[0],
      password: await bcrypt.hash('password123', 12) // Mock hashed password
    };

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, mockUser.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'The email or password you entered is incorrect'
      });
    }

    // Generate JWT token
    const token = generateToken(mockUser);

    // Set session cookie for backward compatibility
    res.cookie('session_token', crypto.randomUUID(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Remove password from response
    const userResponse = { ...mockUser };
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token: token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: 'An error occurred while logging in'
    });
  }
}

// Token Validation Endpoint
export function validateToken(req, res) {
  // If we reach here, the token is valid (authenticated by middleware)
  res.json({
    success: true,
    message: 'Token is valid',
    user: req.user
  });
}

// Logout Handler
export function logoutUser(req, res) {
  // Clear session cookie
  res.clearCookie('session_token');
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}

// Apply Authentication Fixes to E7ki Routes
export function applyAuthenticationFixes(app) {
  console.log('🔧 Applying E7ki authentication fixes...');

  // Replace existing auth middleware with unified authentication
  app.use('/api/e7ki', authenticateUser);

  // Add authentication endpoints
  app.post('/api/e7ki/auth/register', registerUser);
  app.post('/api/e7ki/auth/login', loginUser);
  app.post('/api/e7ki/auth/logout', authenticateUser, logoutUser);
  app.get('/api/e7ki/auth/me', authenticateUser, validateToken);

  // Fix existing E7ki endpoints to use proper authentication
  app.get('/api/e7ki/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      connections: 0, // This would come from actual WebSocket connections
      database: 'sqlite',
      authenticated: !!req.user,
      user: req.user ? { id: req.user.userId, email: req.user.email } : null
    });
  });

  console.log('✅ E7ki authentication fixes applied');
}

// Client-side Authentication Fix
export const clientAuthFix = `
// Fix for client-side authentication
// This should be added to client/src/lib/auth-context.jsx

import { useState, useContext, createContext } from 'react';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('e7ki_token'));

  useEffect(() => {
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
          const payload = JSON.parse(payloadJson || '{}');
          const id = payload.userId;
          setUser(id ? { id, email: payload.email || null, username: payload.username || null } : null);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }
  }, [token]);

  const login = async (email, password) => {
    const response = await fetch('/api/e7ki/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      setToken(data.token);
      localStorage.setItem('e7ki_token', data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    } else {
      throw new Error(data.message || 'Login failed');
    }
  };

  const register = async (email, username, password) => {
    const response = await fetch('/api/e7ki/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });
    const data = await response.json();
    if (response.ok) {
      setToken(data.token);
      localStorage.setItem('e7ki_token', data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    } else {
      throw new Error(data.message || 'Registration failed');
    }
  };

  const logout = () => {
    fetch('/api/e7ki/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': \`Bearer \${token}\` }
    });
    setUser(null);
    setToken(null);
    localStorage.removeItem('e7ki_token');
  };

  const getAuthHeaders = () => {
    return token ? { 'Authorization': \`Bearer \${token}\` } : {};
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      register,
      logout,
      getAuthHeaders,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
`;

// Export for use in server.js
export default {
  authenticateJWT,
  authenticateSession,
  authenticateUser,
  generateToken,
  registerUser,
  loginUser,
  validateToken,
  logoutUser,
  applyAuthenticationFixes,
  clientAuthFix
};