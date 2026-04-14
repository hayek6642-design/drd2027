# Server Index.js Update Guide

## File: `codebank/e7ki/server/index.cjs` or `index.js`

### Update Your Server Initialization

Replace or update your server setup with this pattern:

```javascript
import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerAuthRoutes, createAuthMiddleware } from './auth.js';
import { registerRoutes } from './routes.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// ==================== MIDDLEWARE ====================

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.CLIENT_URL || '*'
  ],
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== PUBLIC ROUTES (No Auth Required) ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'e7ki' });
});

// Auth routes (PUBLIC - must be before auth middleware)
registerAuthRoutes(app);

// ==================== AUTH MIDDLEWARE ====================
// All routes below this require JWT token

const authMiddleware = createAuthMiddleware();
app.use('/api/e7ki', authMiddleware);
app.use('/uploads', express.static('uploads'));

// ==================== PROTECTED ROUTES ====================

// Register E7ki routes (these will now require auth)
await registerRoutes(httpServer, app);

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`\n✅ E7ki Server running on http://localhost:${PORT}`);
  console.log('   WebSocket: ws://localhost:5000/ws');
  console.log('   Auth endpoints:');
  console.log('     POST /api/auth/login');
  console.log('     POST /api/auth/register');
  console.log('     GET /api/auth/verify\n');
});

export function log(message, type = 'log') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
}
```

### Key Changes Explained:

1. **Import auth module**:
   ```javascript
   import { registerAuthRoutes, createAuthMiddleware } from './auth.js';
   ```

2. **Register auth routes FIRST (PUBLIC)** - These don't need JWT:
   ```javascript
   registerAuthRoutes(app);
   ```

3. **Add auth middleware BEFORE protected routes**:
   ```javascript
   const authMiddleware = createAuthMiddleware();
   app.use('/api/e7ki', authMiddleware);  // All /api/e7ki/* routes need auth
   ```

4. **Then register other routes**:
   ```javascript
   await registerRoutes(httpServer, app);
   ```

### Route Protection Flow:

```
Request comes in
    ↓
Public routes: /health, /api/auth/* (✅ No auth needed)
    ↓
Auth middleware checks JWT token
    ↓
Protected routes: /api/e7ki/* (✅ Auth required)
```

### Testing the Server

```bash
# 1. Start the server
npm start

# 2. Register a new user (PUBLIC - no auth needed)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'

# 3. Get the token from response, then login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# 4. Test protected route with token
curl -X GET http://localhost:5000/api/e7ki/chats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 5. Without token, should get 401
curl -X GET http://localhost:5000/api/e7ki/chats
# Response: { "error": "Unauthorized - no token" }
```

### Environment Variables

Create a `.env` file in `codebank/e7ki/server/`:

```
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-key-change-this-in-production
CLIENT_URL=http://localhost:5173
```

### Common Issues & Fixes

**Issue**: "Cannot find module 'auth.js'"
- **Fix**: Make sure `auth.js` is in `codebank/e7ki/server/` directory

**Issue**: "bcryptjs is not defined"
- **Fix**: Run `npm install bcryptjs jsonwebtoken`

**Issue**: "JWT_SECRET is undefined"
- **Fix**: Add to `.env` file or set it in environment

**Issue**: "Port already in use"
- **Fix**: Change PORT in `.env` or kill existing process

### Next Steps

1. ✅ Create/update `auth.js` in the server directory
2. ✅ Update database to include users table and methods
3. ✅ Update `index.js` with this structure
4. ✅ Install dependencies: `npm install bcryptjs jsonwebtoken`
5. ✅ Test login/register locally
6. ✅ Deploy to Render
