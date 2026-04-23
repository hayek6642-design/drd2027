# 🔴 CRITICAL: Login Redirect Loop Bug - Complete Fix

## The Problem

**Flow**: Login → yt-new-clear.html → Login (infinite loop)

### Root Causes Identified:

1. **Missing auth-context login function**
   - `login.jsx` calls `await login(email, password)` 
   - But `auth-context.jsx` doesn't have a `login()` method!
   - The context only expects auth from parent CodeBank window

2. **No server-side login endpoint**
   - `routes.js` has NO `/api/auth/login` or `/api/auth/register` endpoints
   - Server only supports CodeBank-injected auth via middleware

3. **Broken authentication flow**
   - auth-context waits for parent window to send auth
   - If no parent or auth fails, user remains null
   - App redirects back to login.jsx → infinite loop

4. **External redirect mystery**
   - "yt-new-clear.html" redirect is likely from CodeBank platform
   - Happens because E7ki is running but user is not authenticated

---

## ✅ The Complete Fix

### Step 1: Update `auth-context.jsx`

**File**: `codebank/e7ki/client/src/lib/auth-context.jsx`

```javascript
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const getParentAuth = () => {
      if (window.parent !== window) {
        console.log('[E7ki] Requesting auth from parent...');

        // Check if window.Auth is already injected by auth-proxy.js
        if (window.Auth && window.Auth.isAuthenticated()) {
          console.log('[E7ki] window.Auth already available');
          const userData = {
            id: window.Auth.getUser()?.id,
            username: window.Auth.getUser()?.id,
            token: window.Auth.getToken()
          };
          setUser(userData);
          localStorage.setItem('jwt_token', userData.token);
          localStorage.setItem('auth_mode', 'parent');
          setLoading(false);
          return;
        }

        window.parent.postMessage({ type: 'e7ki:request-auth' }, '*');
      } else {
        // Dev mode or standalone: check for existing token in localStorage
        const token = localStorage.getItem('jwt_token');
        if (token) {
          try {
            const parts = token.split('.');
            const payload = JSON.parse(
              atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
            );
            setUser({
              id: payload.userId || payload.sub,
              username: payload.username || payload.email,
              token: token
            });
            localStorage.setItem('auth_mode', 'standalone');
            setLoading(false);
            return;
          } catch (e) {
            console.error('[E7ki] Local token parse failed', e);
            localStorage.removeItem('jwt_token');
          }
        }
        setLoading(false);
      }
    };

    const handleMessage = (e) => {
      if (e.data?.type === 'auth:ready' || e.data?.type === 'e7ki:auth' || 
          (e.data?.authenticated && e.data?.userId)) {
        console.log('[E7ki] Received auth from parent');
        const authData = e.data.auth || e.data;

        if (!authData.token || !(authData.userId || authData.id)) {
          if (window.Auth && window.Auth.isAuthenticated()) {
            const userData = {
              id: window.Auth.getUser()?.id,
              username: window.Auth.getUser()?.id,
              token: window.Auth.getToken()
            };
            setUser(userData);
            localStorage.setItem('jwt_token', userData.token);
            localStorage.setItem('auth_mode', 'parent');
            setLoading(false);
            return;
          }
          setError('Invalid authentication data from parent');
          setLoading(false);
          return;
        }

        const userData = {
          id: authData.userId || authData.id,
          username: authData.username || authData.name,
          token: authData.token
        };

        setUser(userData);
        localStorage.setItem('jwt_token', authData.token);
        localStorage.setItem('auth_mode', 'parent');
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    getParentAuth();

    // Timeout: Give parent 10 seconds to respond, then allow standalone mode
    const timeout = setTimeout(() => {
      if (loading && !user) {
        if (window.Auth && window.Auth.isAuthenticated()) {
          console.log('[E7ki] Final timeout check: window.Auth found');
          const userData = {
            id: window.Auth.getUser()?.id,
            username: window.Auth.getUser()?.id,
            token: window.Auth.getToken()
          };
          setUser(userData);
          localStorage.setItem('jwt_token', userData.token);
          localStorage.setItem('auth_mode', 'parent');
          setLoading(false);
          return;
        }
        // Don't show error - allow user to login
        console.log('[E7ki] No parent auth, allowing standalone mode');
        setLoading(false);
      }
    }, 10000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, [loading, user]);

  // NEW: Login function for standalone mode
  const login = async (email, password) => {
    setIsAuthenticating(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      
      setUser({
        id: data.userId,
        username: data.email,
        token: data.token
      });

      localStorage.setItem('jwt_token', data.token);
      localStorage.setItem('auth_mode', 'standalone');
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  };

  // NEW: Register function for standalone mode
  const register = async (email, password, displayName) => {
    setIsAuthenticating(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      const data = await response.json();
      
      setUser({
        id: data.userId,
        username: data.email,
        token: data.token
      });

      localStorage.setItem('jwt_token', data.token);
      localStorage.setItem('auth_mode', 'standalone');
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('auth_mode');
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'e7ki:logout' }, '*');
    }
  };

  const getAuthHeaders = () => {
    const token = user?.token || localStorage.getItem('jwt_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#000',
        color: '#00d4ff',
        fontSize: '18px'
      }}>
        Connecting to E7ki...
      </div>
    );
  }

  if (error && !user) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#000',
        color: '#ff6b6b',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</div>
        <h2>Authentication Error</h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            background: '#00d4ff',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            marginTop: '10px'
          }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login,
      register, 
      logout, 
      getAuthHeaders,
      isLoading: loading,
      isAuthenticating,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

---

### Step 2: Add Authentication Routes to Server

**File**: `codebank/e7ki/server/auth.js` (NEW FILE)

```javascript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { e7kiDatabase } from './database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'e7ki-dev-secret-change-in-production';
const TOKEN_EXPIRY = '7d';

export function registerAuthRoutes(app) {
  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const user = e7kiDatabase.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );

      res.json({
        success: true,
        token,
        userId: user.id,
        email: user.email,
        displayName: user.display_name
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Register endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, displayName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Check if user already exists
      const existingUser = e7kiDatabase.getUserByEmail(email);
      if (existingUser) {
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

      res.json({
        success: true,
        token,
        userId,
        email,
        displayName: displayName || email.split('@')[0]
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // Verify token endpoint
  app.get('/api/auth/verify', (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      res.json({ valid: true, userId: decoded.userId });
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  });

  // Logout endpoint (optional - mainly for frontend to clear session)
  app.post('/api/auth/logout', (req, res) => {
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
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = { id: decoded.userId, email: decoded.email };
    next();
  };
}
```

---

### Step 3: Update Database to Support Users

**File**: `codebank/e7ki/server/database.js` (UPDATE)

Add these methods to your database class:

```javascript
// Add these methods to your e7kiDatabase class:

createUser(userData) {
  const id = this.db.prepare(`
    INSERT INTO users (email, password_hash, display_name, created_at)
    VALUES (?, ?, ?, ?)
  `).run(
    userData.email,
    userData.password_hash,
    userData.display_name,
    new Date().toISOString()
  ).lastID;
  
  return id;
}

getUserByEmail(email) {
  return this.db.prepare(`
    SELECT * FROM users WHERE email = ?
  `).get(email);
}

getUserById(id) {
  return this.db.prepare(`
    SELECT id, email, display_name, created_at FROM users WHERE id = ?
  `).get(id);
}
```

---

### Step 4: Update Database Schema

**File**: `codebank/e7ki/server/database.js` (UPDATE initialization)

Add users table creation:

```javascript
// In your database initialization:
this.db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );
  
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);
```

---

### Step 5: Update Server Entry Point

**File**: `codebank/e7ki/server/index.cjs` (UPDATE)

```javascript
// Add these imports at the top:
import { registerAuthRoutes } from './auth.js';

// In your server setup, after basic middleware but BEFORE protected routes:
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth routes (PUBLIC - no auth required)
registerAuthRoutes(app);

// Middleware for protected routes
import { createAuthMiddleware } from './auth.js';
const authMiddleware = createAuthMiddleware();

// All other E7ki API routes need auth middleware
app.get('/api/e7ki/chats', authMiddleware, (req, res) => {
  // ... existing code
});

app.get('/api/e7ki/messages', authMiddleware, (req, res) => {
  // ... existing code
});

app.post('/api/e7ki/messages', authMiddleware, (req, res) => {
  // ... existing code
});

// ... apply authMiddleware to all protected routes
```

---

### Step 6: Update package.json Dependencies

**File**: `codebank/e7ki/server/package.json`

Add:

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.1.2"
  }
}
```

---

## 🚀 Deployment Checklist

- [ ] Update `auth-context.jsx` with login/register functions
- [ ] Create new `auth.js` file with routes
- [ ] Update database to include users table
- [ ] Update `index.cjs` to import and use auth routes
- [ ] Add JWT_SECRET to environment variables (use strong secret)
- [ ] Install bcryptjs and jsonwebtoken: `npm install bcryptjs jsonwebtoken`
- [ ] Test login/register locally
- [ ] Test WebSocket connection after login
- [ ] Deploy to Render
- [ ] Verify no more redirect loops

---

## 🧪 Testing Steps

1. **Local Test**:
   ```bash
   # Start server
   npm run dev
   
   # Try registration at http://localhost:5173
   # Use: test@example.com / password123
   
   # Should redirect to chat page
   # Should NOT redirect to yt-new-clear.html
   ```

2. **Production Test** (Render):
   - Clear browser cache
   - Visit your Render URL
   - Register new account
   - Should see chat interface immediately
   - Should NOT see redirect loop

---

## ⚡ Quick Reference

| Issue | Fix |
|-------|-----|
| No login function | Added login/register in auth-context |
| No server endpoint | Added /api/auth/login & /api/auth/register |
| No user storage | Added users table to database |
| Redirect loops | Fixed auth flow - allows standalone mode |
| JWT validation | Added verifyJWT middleware |

---

## 🎯 Expected Result

✅ User registers → JWT token stored → Redirects to chat (NO redirect loop)
✅ User logs in → Chat loads immediately
✅ WebSocket connects with valid token
✅ Can send/receive messages

