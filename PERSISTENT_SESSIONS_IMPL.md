# Persistent Sessions Implementation Guide

## Overview
This document describes the implementation of persistent sessions with auto-login, email display, and secure logout for CodeBank.

## Features
✅ **Persistent Sessions** — 30-day auto-login  
✅ **Email Display** — Shows logged-in user's email in UI  
✅ **Auto-Restore** — No re-login on app reopen  
✅ **Secure Validation** — Server-side session validation  
✅ **Session Clearing** — Explicit logout clears all data  

## File Structure

### Backend
- **`server/routes/session-api.js`** — Core API with login/validate/logout endpoints
- **`db/migrations/001-sessions-table.sql`** — Database schema for sessions table
- **`server-session-config.js`** — Express middleware setup instructions

### Frontend
- **`shared/js/session-manager.js`** — Client-side session management (auto-init)
- **`codebank/js/session-ui-integration.js`** — Email display & logout UI widget
- **`login.html`** — Login page with auto-redirect
- **`index.html`** — Entry point (root redirect handler)

## Setup Instructions

### Step 1: Initialize Database
```bash
sqlite3 codebank.db < db/migrations/001-sessions-table.sql
```

### Step 2: Update server.js
```javascript
const express = require('express');
const cookieParser = require('cookie-parser');
const sessionRouter = require('./server/routes/session-api.js');

const app = express();

// Middleware
app.use(cookieParser());
app.use(express.json());

// Session API routes
app.use('/api', sessionRouter);

// Static files
app.use(express.static('public'));
app.use('/codebank', express.static('codebank'));

// Database connection (required)
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('codebank.db');
app.locals.db = db;

app.listen(3000);
```

### Step 3: Add Script to IndexCB.html
Add before closing `</body>` tag in `codebank/indexCB.html`:
```html
<script src="/shared/js/session-manager.js"></script>
<script src="/codebank/js/session-ui-integration.js"></script>
```

### Step 4: Create Users (seed data)
```sql
INSERT INTO users (id, email, username, password_hash) VALUES
  ('user1', 'test@gmail.com', 'testuser', sha2('password123', 256));
```

## Flow Diagrams

### Login Flow
```
1. User visits /login.html
2. SessionManager checks for existing session
3. If valid → redirects to /codebank/indexCB.html (auto-login)
4. If not → shows login form
5. User enters email/password
6. Backend validates → creates session
7. Frontend saves to localStorage + httpOnly cookie
8. Auto-redirects to /codebank/indexCB.html
9. Email displays above logout button
```

### Logout Flow
```
1. User clicks "Sign Out" button
2. SessionManager.logout() called
3. Frontend clears localStorage/sessionStorage
4. Backend DELETE session from database
5. httpOnly cookie cleared
6. Redirects to /login.html
7. Must re-login to access app
```

### Auto-Restore Flow
```
1. User opens app after browser close
2. SessionManager.init() checks localStorage
3. If session exists & not expired:
   - Validates with server
   - Server extends expiry (30 days)
   - Auto-redirects to /codebank/indexCB.html
   - No login screen shown
4. If expired:
   - Shows login page
```

## API Endpoints

### POST /api/auth/login
**Request:**
```json
{
  "email": "user@gmail.com",
  "password": "plaintext_password"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "hex_string_64",
  "user": {
    "id": "user123",
    "email": "user@gmail.com",
    "username": "username"
  },
  "expiresAt": "2025-05-11T01:23:00Z"
}
```

### GET /api/auth/validate-session
**Headers:**
- `Cookie: sessionId=hex_string` (automatic)
- OR `X-Session-Id: hex_string` (manual)

**Response:**
```json
{
  "valid": true,
  "user": { "id": "user123", "email": "user@gmail.com" },
  "sessionId": "hex_string"
}
```

### POST /api/auth/logout
**Response:**
```json
{
  "success": true,
  "message": "Logged out"
}
```

## Configuration

### Session Expiry
- Default: **30 days**
- Location: `session-manager.js` line 73
- Change: `setDate(getDate() + 30)` → `setDate(getDate() + X)`

### Password Hashing
- Current: SHA256 (simple)
- Production: Use bcrypt (`npm install bcrypt`)
- Update in: `server/routes/session-api.js` `hashPassword()` function

### Cookie Security
- **httpOnly**: true (prevents JS access)
- **Secure**: true (HTTPS only in production)
- **SameSite**: strict (CSRF protection)
- Location: `session-api.js` line 42-46

## Testing Checklist

- [ ] **First Login**
  - Navigate to /login.html
  - Enter credentials
  - Email displays above logout button
  - Session created in database

- [ ] **Auto-Login**
  - Close browser completely
  - Reopen app
  - Auto-redirects to CodeBank without login
  - Email still displayed

- [ ] **Session Validation**
  - Open DevTools
  - Check localStorage: should have `codebank_session` & `codebank_user`
  - Check cookies: should have `sessionId` (httpOnly)
  - Network tab: validate-session returns `valid: true`

- [ ] **Logout**
  - Click "Sign Out" button
  - Redirects to login page
  - localStorage cleared
  - Must re-login

- [ ] **Expiry (30 days)**
  - Modify database: `UPDATE sessions SET expires_at = datetime('now', '-31 days')`
  - Reload app
  - Should redirect to login (expired session)

## Troubleshooting

### Issue: "SessionManager is undefined"
- Ensure `session-manager.js` is loaded before other scripts
- Check script order in indexCB.html

### Issue: "Database not configured"
- Ensure `app.locals.db` is set in server.js
- Run migrations: `sqlite3 codebank.db < db/migrations/001-sessions-table.sql`

### Issue: "Invalid credentials"
- Check password hash: user's password must be SHA256(plaintext)
- Test: `echo -n "password" | sha256sum`

### Issue: "CORS/Cookie not working"
- Ensure `credentials: 'include'` in fetch requests
- Check Secure/SameSite flags for HTTPS

### Issue: Email not displaying
- Check browser console for errors
- Ensure session-ui-integration.js is loaded
- Verify SessionManager state: `console.log(window.SessionManager.getUser())`

## Security Notes

⚠️ **Before Production:**
1. Replace SHA256 with bcrypt
2. Add rate limiting to /api/auth/login
3. Implement CSRF tokens
4. Add email verification
5. Implement password reset
6. Add 2FA (optional)
7. Enable HTTPS (required for Secure flag)
8. Add session logging/audit trail
9. Implement account lockout after failed attempts
10. Add refresh token rotation

## Files Modified/Created

| File | Status |
|------|--------|
| `server/routes/session-api.js` | ✅ NEW |
| `shared/js/session-manager.js` | ✅ NEW |
| `codebank/js/session-ui-integration.js` | ✅ NEW |
| `login.html` | ✅ NEW |
| `index.html` | ✅ NEW |
| `db/migrations/001-sessions-table.sql` | ✅ NEW |
| `server-session-config.js` | ✅ NEW |
| `codebank/indexCB.html` | ⚠️ NEEDS SCRIPT TAG |

## Support

For questions or issues, check:
- Browser console for errors
- Server logs for API failures
- Database for session records: `SELECT * FROM sessions;`
