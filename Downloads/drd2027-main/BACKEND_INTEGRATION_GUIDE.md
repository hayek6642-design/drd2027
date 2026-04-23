# 🔧 Backend Integration Guide - Auth Refactor v2.0

## Overview

This guide walks you through integrating the frontend Session Manager with your existing backend (server.js).

**Status**: Ready for implementation  
**Priority**: High - Required for production deployment  
**Estimated Time**: 2-3 hours  

---

## Phase 1: Database Setup (Optional but Recommended)

### Create Session Storage Table

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  guest_id TEXT,
  session_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_user_id ON sessions(user_id);
CREATE INDEX idx_guest_id ON sessions(guest_id);
CREATE INDEX idx_expires_at ON sessions(expires_at);
```

### Create Guest Data Merge Audit Table

```sql
CREATE TABLE guest_merges (
  id TEXT PRIMARY KEY,
  guest_id TEXT,
  user_id TEXT,
  guest_data JSON,
  merged_data JSON,
  merge_status TEXT DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Phase 2: Update Auth Routes (server.js)

### Key Changes Required

1. **Mount auth-v2.js routes** (lines ~1320+)
2. **Add session validation middleware** (protect endpoints)
3. **Update existing /api/auth/login** to work with Session Manager
4. **Update existing /api/auth/logout** to work with Session Manager

### Implementation Steps

#### Step 1: Add Session Manager Integration to server.js

```javascript
// At top of server.js, after other requires
const sessionRoutes = require('./server/routes/auth-v2.js');

// ... existing code ...

// Mount auth routes BEFORE other middleware
app.use('/api/auth/v2', sessionRoutes);

// Add session validation middleware
app.use((req, res, next) => {
  // Extract session from Authorization header or cookies
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  
  if (token) {
    // Store token on request for routes to use
    req.sessionToken = token;
  }
  
  next();
});
```

#### Step 2: Update Existing /api/auth/login

Find the existing login endpoint (around line 1678) and update it:

```javascript
// OLD: app.post('/api/auth/login', async (req, res) => {
// NEW: 
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate credentials (existing logic)
    // ... your existing validation ...
    
    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Return user data + token for frontend Session Manager
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token: token,
      expiresIn: 604800 // 7 days in seconds
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### Step 3: Update Existing /api/auth/logout

```javascript
app.post('/api/auth/logout', (req, res) => {
  // Frontend will clear localStorage
  // Backend just confirms logout
  res.json({ success: true, message: 'Logged out' });
});
```

#### Step 4: Add Session Validation Endpoint

```javascript
// New endpoint for Session Manager to validate sessions
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.sessionToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({ authenticated: false, user: null });
    }
    
    // Verify JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );
    
    // Fetch current user
    const user = await findUserById(decoded.id);
    
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
    
  } catch (error) {
    res.json({ authenticated: false, error: error.message });
  }
});
```

---

## Phase 3: Guest Data Merge Endpoint

### Implement /api/auth/merge-guest

```javascript
app.post('/api/auth/merge-guest', async (req, res) => {
  try {
    const { guestId, guestData } = req.body;
    const token = req.sessionToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Verify JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );
    
    const userId = decoded.id;
    
    // Load user's existing data
    const userData = await getUserData(userId);
    
    // Merge guest data into user data
    const mergedData = mergeGuestDataIntoUser(
      userData,
      guestData,
      {
        guestId: guestId,
        mergeTimestamp: new Date()
      }
    );
    
    // Save merged data
    await saveUserData(userId, mergedData);
    
    // Log merge audit trail
    await logMergeEvent({
      guestId,
      userId,
      guestData,
      mergedData,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      message: 'Guest data merged',
      data: mergedData
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Phase 4: Protect Existing Endpoints

### Add Auth Middleware to Protected Routes

```javascript
// Middleware to check session validity
const validateSession = (req, res, next) => {
  const token = req.sessionToken || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Apply to protected routes
app.get('/api/user/profile', validateSession, async (req, res) => {
  // Route implementation
});
```

---

## Phase 5: Test Backend Integration

### 1. Test Session Creation

```bash
# Start server
npm start

# Test /ping (should work)
curl https://dr-d-h51l.onrender.com/ping

# Test login endpoint
curl -X POST https://dr-d-h51l.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Response should include token + user data
```

### 2. Test Session Validation

```bash
# Test /me endpoint with token
TOKEN="<jwt-token-from-login>"

curl https://dr-d-h51l.onrender.com/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Should return user data
```

### 3. Test Guest Data Merge

```bash
curl -X POST https://dr-d-h51l.onrender.com/api/auth/merge-guest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "guestId": "guest_123",
    "guestData": {
      "preferences": {...},
      "history": [...]
    }
  }'
```

---

## Phase 6: Update Frontend HTML Files

### Update yt-new-clear.html (or main entry point)

```html
<!-- Add Session Manager -->
<script src="./shared/session-manager.js"></script>
<script src="./shared/bankode-core-v2.js"></script>
<script src="./shared/auth-debug.js"></script>

<!-- In your app initialization -->
<script>
// Initialize Session Manager
const session = sessionManager.getSession();

if (session.authenticated) {
  // User is logged in
  console.log('User:', session.user);
} else {
  // Guest mode
  console.log('Guest ID:', session.guestId);
}

// On login button click
async function handleLogin(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  // Upgrade session
  sessionManager.upgradeToUser(
    { id: data.user.id, email: data.user.email },
    data.token
  );
}
</script>
```

---

## Phase 7: Environment Variables

### Add to .env

```
JWT_SECRET=your-super-secret-key-min-32-chars
SESSION_DURATION=604800
GUEST_SESSION_DURATION=2592000
DATABASE_URL=your-database-connection-string
NODE_ENV=production
```

---

## Checklist

- [ ] Database tables created (optional)
- [ ] auth-v2.js routes mounted in server.js
- [ ] Session validation middleware added
- [ ] /api/auth/login updated to return JWT
- [ ] /api/auth/logout updated
- [ ] /api/auth/me endpoint implemented
- [ ] /api/auth/merge-guest endpoint implemented
- [ ] Protected endpoints use validateSession middleware
- [ ] Frontend HTML files updated with Session Manager
- [ ] Environment variables configured
- [ ] Deployed to Render and tested

---

## Troubleshooting

### Session not persisting

**Problem**: Session is lost on page reload  
**Solution**: Check `bankode-core-v2.js` - it should sync to localStorage and server

### Token expired error

**Problem**: Getting "Invalid token" after some time  
**Solution**: Check JWT expiration time and refresh token logic

### Guest data not merging

**Problem**: Guest data missing after upgrade  
**Solution**: Verify `mergeGuestDataIntoUser()` function is implemented

### CORS issues

**Problem**: Frontend getting CORS errors  
**Solution**: Add CORS headers to Express (already configured in server.js)

---

## Next Steps After Integration

1. **Create refresh token endpoint** for token rotation
2. **Implement password reset** flow
3. **Add email verification** (OTP)
4. **Set up audit logging** with auth-debug.js
5. **Test with 2FA** (optional, advanced)
6. **Load test** with multiple concurrent sessions

---

**Questions?** Check AUTH_REFACTOR_IMPLEMENTATION.md or run `AuthTests.runAll()` in browser console.

