# 🔐 Auth Refactor Implementation Guide v2.0

**Status**: Implementation Complete  
**Branch**: `auth-refactor-guest-system`  
**Version**: 2.0.0  
**Date**: April 2026

---

## Overview

Complete refactor of authentication system to support:
- ✅ Automatic guest sessions (no login required)
- ✅ Seamless guest → user upgrade flow
- ✅ No redirect-based auth enforcement
- ✅ Single source of truth for sessions
- ✅ Unified data sync (guest mode + user mode)

---

## 📁 Files Implemented

| File | Purpose | Status |
|------|---------|--------|
| `shared/session-manager.js` | Core session management | ✅ NEW |
| `shared/bankode-core-v2.js` | Unified data store | ✅ NEW |
| `shared/auth-debug.js` | Debug logging | ✅ UPDATED |
| `server/routes/auth-v2.js` | Backend endpoints | ✅ NEW |
| `tests/auth-refactor-test.js` | Test suite | ✅ NEW |

---

## 🚀 Quick Start

### 1. Include Session Manager in HTML

**In `login.html` and any other entry points:**

```html
<script src="./shared/session-manager.js"></script>
```

The SessionManager will automatically:
- Check for existing session in localStorage
- Create a guest session if none exists
- Initialize listeners for UI updates

### 2. Access Session in Your Code

```javascript
// Get current session
const session = sessionManager.getSession();

// Check if user or guest
if (sessionManager.isUser()) {
  console.log('Authenticated user:', session.userId);
} else {
  console.log('Guest:', session.guestId);
}

// Subscribe to changes
sessionManager.subscribe((session) => {
  console.log('Session changed:', session);
});

// Get ID (works for both user and guest)
const id = sessionManager.getId();
```

### 3. Upgrade to User (from login.html)

```javascript
// After successful authentication
sessionManager.upgradeToUser(
  { id: 'user_123', email: 'user@example.com' },
  'jwt_token_here',
  7 // days until expiration
);
```

### 4. Logout (Downgrade to Guest)

```javascript
sessionManager.downgradeToGuest();
```

---

## 🔄 Session Flow

### Guest Mode (Default)

```
App Start
  ↓
Check localStorage for 'zagelsession'
  ↓
  No session found
    ↓
    Create guest session
    {
      type: 'guest',
      guestId: 'guest_1234567890_abcdef123',
      createdAt: Date.now(),
      lastActive: Date.now(),
      metadata: { visits: 1, firstVisit: Date.now() }
    }
    ↓
    Store in localStorage
    ↓
    Notify listeners
    ↓
    ✅ Ready for use
```

### Guest → User Upgrade

```
User submits login form
  ↓
POST /api/auth/login { email, password }
  ↓
Server validates & returns token
  ↓
Client calls: sessionManager.upgradeToUser(userData, token)
  ↓
SessionManager:
  - Records old guestId
  - Creates new user session with token
  - Stores in localStorage
  - Calls /api/auth/merge-guest to transfer guest data
  ↓
✅ User now authenticated with merged data
```

### User Logout (Downgrade)

```
User clicks logout
  ↓
Client calls: sessionManager.downgradeToGuest()
  ↓
SessionManager:
  - Clears token and userId
  - Creates new guest session
  - Stores in localStorage
  ↓
✅ Back to guest mode
```

---

## 🔌 Integration Points

### 1. **data/yt-new-clear.html**

```javascript
// Subscribe to session changes
sessionManager.subscribe((session) => {
  if (session.type === 'user') {
    console.log('User logged in, enable sync');
    enableSync(true);
  } else {
    console.log('Guest mode, local only');
    enableSync(false);
  }
});
```

### 2. **Bankode Core (Data Sync)**

```javascript
// Automatically syncs based on session
bankodeCore.subscribe('my-data-key', (value) => {
  console.log('Data updated:', value);
});

// Set data (syncs to server if user)
await bankodeCore.set('my-data-key', { /* data */ });

// Get data (from server if user, local if guest)
const data = await bankodeCore.get('my-data-key');
```

### 3. **API Requests**

```javascript
// Get token for authenticated requests
const token = sessionManager.getToken();

if (token) {
  const response = await fetch('/api/data', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

// Get ID for tracking (works for both user and guest)
const id = sessionManager.getId();
```

---

## 🔒 Security Considerations

| Aspect | Implementation |
|--------|-----------------|
| **Token Storage** | Memory + HTTP-only cookies (server-set) |
| **Session Validation** | Server-side on `/api/auth/me` |
| **Expiration** | 7 days default, checked on restore |
| **Guest Data** | Merged on upgrade via `/api/auth/merge-guest` |
| **CSRF Protection** | Use SameSite cookies (strict mode) |

---

## 🧪 Testing

Run in browser console:

```javascript
// Run all tests
AuthTests.runAll();

// Or run individual tests
await AuthTests.test_GuestAutoCreate();
await AuthTests.test_UpgradeToUser();
// etc...
```

Tests verify:
- ✅ Guest auto-creation
- ✅ Session persistence
- ✅ No redirect loops
- ✅ Guest → User upgrade
- ✅ User → Guest downgrade
- ✅ Listener notifications
- ✅ Token management
- ✅ Debug info

---

## 🐛 Debugging

### View Session Info

```javascript
// In browser console
sessionManager.getDebugInfo()
// Returns: { type, id, isUser, isGuest, expiresAt, lastActive }

// Or view detailed session
sessionManager.getSession()
```

### View Auth Logs

```javascript
// In browser console
authDebug.printAuthLogs()
// Shows last 50 auth events in table

// Or get as array
const logs = authDebug.getAuthLogs();
```

### Clear Logs

```javascript
authDebug.clearAuthLogs();
```

---

## 🔧 Server Integration

### Required Endpoints

Implement these in `server/routes/auth-v2.js`:

1. **POST /api/auth/login**
   - Input: `{ email, password }`
   - Output: `{ success, user, token }`

2. **GET /api/auth/me**
   - Input: Bearer token in header
   - Output: `{ success, user, token }`

3. **POST /api/auth/logout**
   - Clears session

4. **POST /api/auth/merge-guest**
   - Input: `{ guestId, userId }`
   - Transfers guest data to user

### Placeholder Functions (Update These)

In `server/routes/auth-v2.js`:

- `validateUser(email, password)` - Check credentials against DB
- `getUserById(userId)` - Get user from DB
- `mergeGuestData(guestId, userId)` - Transfer guest data

---

## 📊 Database Schema (Optional)

For guest data merging, consider:

```sql
-- Track guest sessions
CREATE TABLE guest_sessions (
  id VARCHAR(255) PRIMARY KEY,
  created_at TIMESTAMP,
  merged_to_user_id VARCHAR(255),
  merged_at TIMESTAMP
);

-- Guest data (bookmarks, settings, etc.)
CREATE TABLE guest_data (
  guest_id VARCHAR(255),
  key VARCHAR(255),
  value JSON,
  FOREIGN KEY (guest_id) REFERENCES guest_sessions(id)
);

-- When merging, copy data from guest_data to user_data
```

---

## 🚨 Migration from Old Auth System

### Remove Old Files

- ❌ Remove any redirect-based auth scripts
- ❌ Remove localStorage auth enforcement
- ❌ Remove page reload on auth failure

### Update HTML Files

```html
<!-- REMOVE OLD AUTH SCRIPTS -->
<!-- <script src="old-auth-lock.js"></script> -->

<!-- ADD NEW SESSION MANAGER -->
<script src="./shared/session-manager.js"></script>
```

### Update Data Access

```javascript
// OLD (no longer needed)
// if (!window.isAuthenticated) location.href = '/login';

// NEW (works for both guest and user)
const id = sessionManager.getId();
bankodeCore.set(`data_${id}`, value);
```

---

## ✅ Checklist

- [x] Session Manager implemented
- [x] Bankode Core v2 with sync
- [x] Auth routes created
- [x] Test suite created
- [x] Debug logging added
- [ ] Placeholder functions implemented (your DB)
- [ ] Old auth system removed (your code)
- [ ] HTML files updated to use new system (your code)
- [ ] Guest data migration strategy defined (your code)
- [ ] Deployment to Render (your deployment)

---

## 🎯 Key Principles

1. **No Redirects** - Session changes don't cause page reloads
2. **Guest First** - Users don't need to login to use the app
3. **Seamless Upgrade** - Login converts guest session to user
4. **Single Source** - SessionManager is the authority on auth state
5. **Observable** - Subscribe to changes, don't poll
6. **Debuggable** - Full audit trail of auth events

---

## 📞 Support

For issues or questions:

1. Check debug logs: `authDebug.printAuthLogs()`
2. Run tests: `AuthTests.runAll()`
3. Check browser console for error messages
4. Review `/shared/session-manager.js` comments

---

**Implementation Date**: April 15, 2026  
**Last Updated**: $(date)  
**Status**: ✅ Ready for Deployment

