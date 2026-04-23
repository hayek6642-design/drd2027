# 🔧 E7ki Login Redirect Bug - Step-by-Step Implementation Guide

## 🎯 What You're Fixing

**Current broken flow:**
```
Register/Login → yt-new-clear.html → Back to Login (infinite loop ❌)
```

**After fix:**
```
Register/Login → Chat Page (works ✅)
```

---

## ✅ Implementation Checklist

### Phase 1: Update Client Side (10 minutes)

- [ ] **Task 1.1**: Replace `auth-context.jsx`
  - File: `codebank/e7ki/client/src/lib/auth-context.jsx`
  - Replace entire file with `auth-context-FIXED.jsx`
  - What it adds: `login()` and `register()` functions

### Phase 2: Add Server Authentication (20 minutes)

- [ ] **Task 2.1**: Create new `auth.js` file
  - File: `codebank/e7ki/server/auth.js` (NEW)
  - Copy from: `auth-FIXED.js`
  - What it does: Provides login/register endpoints and JWT middleware

- [ ] **Task 2.2**: Update `index.cjs`
  - File: `codebank/e7ki/server/index.cjs`
  - Follow: `server-INDEX-UPDATE.md`
  - What it does: Import and register auth routes

- [ ] **Task 2.3**: Install dependencies
  - Command: `cd codebank/e7ki/server && npm install bcryptjs jsonwebtoken`
  - What it adds: Password hashing and JWT signing

### Phase 3: Update Database (15 minutes)

- [ ] **Task 3.1**: Update `database.cjs`
  - File: `codebank/e7ki/server/database.cjs` or `database.js`
  - Follow: `database-UPDATE-INSTRUCTIONS.md`
  - What it adds: Users table and user management methods

- [ ] **Task 3.2**: Create `.env` file
  - Location: `codebank/e7ki/server/.env`
  - Add:
    ```
    JWT_SECRET=your-super-secret-key-min-32-chars
    PORT=5000
    NODE_ENV=production
    ```

### Phase 4: Testing (10 minutes)

- [ ] **Task 4.1**: Test locally
  - Start server: `npm start` in `codebank/e7ki/server`
  - Open: `http://localhost:5173`
  - Register: new test account
  - Verify: redirect to chat page, NO redirect loop

- [ ] **Task 4.2**: Test in production
  - Deploy to Render
  - Clear browser cache
  - Test register/login flow

---

## 📋 Detailed Steps

### Step 1: Replace Client Auth Context

**File**: `codebank/e7ki/client/src/lib/auth-context.jsx`

**What to do:**
1. Delete all content in current `auth-context.jsx`
2. Copy entire content from `auth-context-FIXED.jsx` provided
3. Save file

**Key changes:**
- Added `login()` function that calls `/api/auth/login`
- Added `register()` function that calls `/api/auth/register`
- Changed to allow standalone mode (not just parent auth)
- Added error handling

---

### Step 2: Create Auth Server Module

**File**: `codebank/e7ki/server/auth.js` (CREATE NEW)

**What to do:**
1. Create new file: `codebank/e7ki/server/auth.js`
2. Copy entire content from `auth-FIXED.js` provided
3. Save file

**What it provides:**
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/register` - Register new account
- `GET /api/auth/verify` - Verify JWT token
- `createAuthMiddleware()` - Protect routes with JWT

---

### Step 3: Update Server Index

**File**: `codebank/e7ki/server/index.cjs` (or `index.js`)

**What to do:**
1. At the top, add imports:
   ```javascript
   import { registerAuthRoutes, createAuthMiddleware } from './auth.js';
   ```

2. After setting up express, add auth routes (BEFORE protected routes):
   ```javascript
   // Public routes (no auth needed)
   registerAuthRoutes(app);
   
   // Protect E7ki routes with auth
   const authMiddleware = createAuthMiddleware();
   app.use('/api/e7ki', authMiddleware);
   ```

3. Then register other routes:
   ```javascript
   await registerRoutes(httpServer, app);
   ```

**Full example** in `server-INDEX-UPDATE.md`

---

### Step 4: Install Dependencies

**Commands**:
```bash
cd codebank/e7ki/server

# Install password hashing and JWT
npm install bcryptjs jsonwebtoken

# Or install all at once
npm install
```

**Verify**:
```bash
ls node_modules | grep -E "bcrypt|jwt"
# Should show: bcryptjs, jsonwebtoken
```

---

### Step 5: Update Database

**File**: `codebank/e7ki/server/database.cjs` or `database.js`

**What to do:**
1. In table creation section, add users table:
   ```sql
   CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT UNIQUE NOT NULL,
     password_hash TEXT NOT NULL,
     display_name TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT
   );
   ```

2. Add these methods to your database class:
   - `createUser(userData)` - Create new user
   - `getUserByEmail(email)` - Find user by email
   - `getUserById(id)` - Find user by ID

**Full example** in `database-UPDATE-INSTRUCTIONS.md`

---

### Step 6: Create Environment Variables

**File**: `codebank/e7ki/server/.env`

**Content**:
```env
JWT_SECRET=my-super-secret-key-min-32-characters-long
PORT=5000
NODE_ENV=production
```

**Generate strong secret** (choose one):
```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((1..32 | ForEach-Object { [char](Get-Random -Minimum 33 -Maximum 127) }) -join ''))

# NodeJS (any platform)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Step 7: Test Locally

**Terminal 1 - Start Server**:
```bash
cd codebank/e7ki/server
npm start
# Should output: ✅ E7ki Server running on http://localhost:5000
```

**Terminal 2 - Start Client** (if not already running):
```bash
cd codebank/e7ki/client
npm run dev
# Should output: Local: http://localhost:5173
```

**Browser Testing**:
1. Go to `http://localhost:5173`
2. You should see login form
3. Click "Register"
4. Enter:
   - Email: `test@example.com`
   - Password: `password123`
   - Display Name: `Test User`
5. Click "Register"
6. **Expected result**: Should redirect to chat page ✅
7. **NOT expected**: Should NOT see redirect loop ❌

---

### Step 8: Deploy to Render

**Before deploying:**
1. Make sure all changes are committed to GitLab
2. Test locally first

**Deploy steps:**
1. Push code to GitLab:
   ```bash
   git add .
   git commit -m "✅ Fix: E7ki login redirect loop - add JWT auth"
   git push origin main
   ```

2. Go to Render dashboard
3. Redeploy your service
4. Wait for deployment to complete

**Test in production:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Go to your Render URL
3. Test register/login flow
4. Verify NO redirect loop

---

## 🐛 Troubleshooting

### Problem: "Cannot find module 'auth.js'"

**Causes:**
- File not created in server directory
- Wrong file name

**Fix:**
```bash
# Verify file exists
ls codebank/e7ki/server/auth.js

# If not, create it with the provided code
```

---

### Problem: "bcryptjs is not defined"

**Causes:**
- Dependencies not installed

**Fix:**
```bash
cd codebank/e7ki/server
npm install bcryptjs jsonwebtoken
npm list bcryptjs jsonwebtoken
```

---

### Problem: "Still seeing redirect to yt-new-clear.html"

**Causes:**
- Old code still running
- Browser cache

**Fix:**
1. Clear browser cache: `Ctrl+Shift+Delete`
2. Restart server: `Ctrl+C`, then `npm start`
3. Hard refresh: `Ctrl+F5`
4. Try incognito/private window

---

### Problem: "Login works but still shows loading"

**Causes:**
- Database not properly updated
- Auth context not returning user

**Fix:**
1. Check browser console for errors: `F12` → Console
2. Check server logs for errors
3. Verify database has users table:
   ```bash
   sqlite3 codebank/e7ki/server/e7ki.db "SELECT * FROM sqlite_master WHERE type='table';"
   ```

---

### Problem: "Can login but get 'Unauthorized' on chat"

**Causes:**
- Token not being sent to server
- Auth middleware not properly set up

**Fix:**
1. Check `index.cjs` has auth middleware:
   ```javascript
   const authMiddleware = createAuthMiddleware();
   app.use('/api/e7ki', authMiddleware);
   ```
2. Check token is stored in localStorage:
   - Browser DevTools → Application → localStorage
   - Should have `jwt_token` key

---

## ✅ Verification Checklist

After implementation, verify:

- [ ] Can see login form at startup
- [ ] Can register new account
- [ ] After register, redirects to chat page (NOT yt-new-clear.html)
- [ ] Can login with registered account
- [ ] Can send messages
- [ ] Can see other users online
- [ ] Refreshing page keeps you logged in
- [ ] Logout button works
- [ ] No errors in browser console (F12)
- [ ] No errors in server console

---

## 📊 Files Changed Summary

| File | Type | Change |
|------|------|--------|
| `auth-context.jsx` | Update | Add login/register functions |
| `auth.js` | Create | JWT authentication routes |
| `index.cjs` | Update | Register auth routes & middleware |
| `database.cjs` | Update | Add users table & methods |
| `.env` | Create | JWT_SECRET and config |
| `package.json` | Update | Add bcryptjs, jsonwebtoken |

---

## 🎉 Expected Timeline

| Phase | Time | Status |
|-------|------|--------|
| Update client | 10 min | ⏱️ |
| Add server auth | 20 min | ⏱️ |
| Update database | 15 min | ⏱️ |
| Testing | 10 min | ⏱️ |
| Deploy | 5 min | ⏱️ |
| **Total** | **60 min** | ✅ |

---

## 🚀 Next Steps After Fix

Once login is working:

1. **Add user search** to find contacts
2. **Integrate CodeBank** properly for full platform experience
3. **Add encryption** for message security
4. **Fix file persistence** in uploads
5. **Add group chats** support

See `E7ki_Development_Checklist.md` for full roadmap.

