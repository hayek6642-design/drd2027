import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { e7kiDatabase } from './database.js';
import { log } from './index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'e7ki-dev-secret-change-in-production';
const TOKEN_EXPIRY = '7d';

export function registerAuthRoutes(app) {
  // ==================== LOGIN ====================
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        log('Login attempt: missing credentials', 'auth');
        return res.status(400).json({ error: 'Email and password required' });
      }

      const user = e7kiDatabase.getUserByEmail(email);
      if (!user) {
        log(`Login failed: user not found (${email})`, 'auth');
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        log(`Login failed: invalid password (${email})`, 'auth');
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );

      log(`User logged in: ${user.email} (ID: ${user.id})`, 'auth');

      res.json({
        success: true,
        token,
        userId: user.id,
        email: user.email,
        displayName: user.display_name
      });
    } catch (error) {
      log(`Login error: ${error.message}`, 'auth');
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // ==================== REGISTER ====================
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, displayName } = req.body;

      if (!email || !password) {
        log('Registration attempt: missing credentials', 'auth');
        return res.status(400).json({ error: 'Email and password required' });
      }

      if (password.length < 6) {
        log('Registration attempt: password too short', 'auth');
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Check if user already exists
      const existingUser = e7kiDatabase.getUserByEmail(email);
      if (existingUser) {
        log(`Registration failed: email already exists (${email})`, 'auth');
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const userId = e7kiDatabase.createUser({
        email,
        password_hash: hashedPassword,
        display_name: displayName || email.split('@')[0]
      });

      // Generate token
      const token = jwt.sign(
        { userId, email },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );

      log(`New user registered: ${email} (ID: ${userId})`, 'auth');

      res.json({
        success: true,
        token,
        userId,
        email,
        displayName: displayName || email.split('@')[0]
      });
    } catch (error) {
      log(`Registration error: ${error.message}`, 'auth');
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // ==================== VERIFY TOKEN ====================
  app.get('/api/auth/verify', (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      res.json({ valid: true, userId: decoded.userId, email: decoded.email });
    } catch (error) {
      log(`Token verification failed: ${error.message}`, 'auth');
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  });

  // ==================== LOGOUT ====================
  app.post('/api/auth/logout', (req, res) => {
    log('User logged out', 'auth');
    res.json({ success: true });
  });
}

export function verifyJWT(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function createAuthMiddleware() {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - no token' });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = { id: decoded.userId, email: decoded.email };
    next();
  };
}
