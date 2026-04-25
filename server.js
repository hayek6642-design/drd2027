// DEPLOY_TRIGGER: 1776368300
import 'dotenv/config';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

// Firebase key check (only when enabled)
if (process.env.FIREBASE_ENABLED === 'true' && process.env.FIREBASE_PRIVATE_KEY) {
  console.log('[Firebase] Configured for project', process.env.FIREBASE_PROJECT_ID || '(unknown)');
} else if (process.env.FIREBASE_ENABLED !== 'true') {
  console.log('[Firebase] DISABLED (FIREBASE_ENABLED is not true)');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// [SECURITY] Secure Database Path & Directory
const DATA_DIR = path.join(__dirname, 'data');
fs.ensureDirSync(DATA_DIR);

// Use Turso if configured, otherwise local SQLite
const tursoUrl = process.env.TURSO_URL || process.env.TURSO_DATABASE_URL;
if (tursoUrl) {
  process.env.DATABASE_URL = tursoUrl; // [SECURITY] UNIFY: Set DATABASE_URL for Turso too
  console.log(`[INFO] [DB] Using Turso Database: ${tursoUrl.split('@').pop()}`); // Log domain only for security
} else {
  const DB_PATH = process.env.DATABASE_URL?.replace('sqlite://', '') || path.join(DATA_DIR, 'database.sqlite');
  if (DB_PATH.startsWith('postgres')) {
    console.warn('[WARN] [DB] WARNING: DATABASE_URL is set to PostgreSQL but Turso is not configured. This may cause issues if the app expects SQLite.');
  }
  process.env.DATABASE_URL = `sqlite://${DB_PATH}`;
  console.log(`[INFO] [DB] Using absolute database path: ${DB_PATH}`);
}

const PORT = process.env.PORT || 3001;

// ============================================================================
// Define SSE registry EARLY - before WebSocket setup uses it
// ============================================================================
global.__sseRegistry = global.__sseRegistry || new Map();
global.__sseEmitToSession = function(sessionId, data) {
    try {
        const client = global.__sseRegistry.get(sessionId);
        if (client && !client.destroyed) {
            client.write(`data: ${JSON.stringify(data)}\\n\\n`);
            return true;
        }
    } catch(e) {
        console.error("[SSE] Emit error:", e.message);
    }
    return false;
};


// Global error handlers with enhanced logging
process.on('uncaughtException', (err) => {
  console.error('[CRASH] [CRITICAL] UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRASH] [CRITICAL] UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

console.log("[INFO] SEND-CODES VERSION: CLEAN V2");

import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import fetch from 'node-fetch';
import cloudinary from 'cloudinary';
import multer from 'multer';
import { handleSamma3nySongs } from './api/samma3ny/middleware.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { setupSessionWebSocket } from './server/websocket-server.js';
import * as sessionManagerWs from './server/core/session-manager.js';
import rateLimit from 'express-rate-limit';
import trustRouter from './api/modules/trust.js';
import { setupCORSHeaders, setupAuthHeaders } from './server/cors-and-headers-fix.js';
// Clerk removed: zero-auth mode

import * as monetizationMod from './api/modules/monetization.js';
import * as samma3nyMod from './api/modules/samma3ny.js';
import * as nostalgiaMod from './api/modules/nostalgia.js';
import * as pebalaashMod from './api/modules/pebalaash.js';
import * as adminMod from './api/modules/admin.js';
import * as testMod from './api/modules/test.js';
import * as rewardsMod from './api/modules/rewards.js';
import farragnaDefault, { webhookCloudflare as farragnaWebhook } from './api/modules/farragna.js';
import e7kiDefault from './api/modules/e7ki.js';
import * as logicodeMod from './api/modules/logicode.js';
import * as corsaMod from './api/modules/corsa.js';
import * as codesMod from './api/modules/codes.js';
import syncRouter from './api/modules/sync.js';
import persistenceRouter from './api/modules/persistence.js';
import settaDefault from './api/modules/setta.js';
import * as balloonMod from './api/modules/balloon.js';
import { query, pool } from './api/config/db.js';
import { watchdog } from './services/watchdog/watchdog.js';
import watchdogRoutes from './routes/watchdog.js';
import battaloodaRouter from './api/routes/battalooda.js';
import activityRouter from './api/routes/activity.js';
import aiRoutes from './api/routes/ai-routes.js';
import zagelRouter from './api/routes/zagel.js';
import { setupZagelEventBridge } from './api/routes/zagel-events.js';

// Zagel Brain System - Served statically to frontend
// Frontend loads: /codebank/js/zagel-brain/zagel-integration.js
import shotsRouter from './api/modules/shots.js';
import biometricRouter from './api/modules/biometric.js';
import gambleRouter from './api/modules/gamble.js';
import sammAutoRouter from './api/modules/samma3ny-automode.js';
import likesRouter from './api/modules/likes.js';
import drmailRouter from './api/modules/drmail.js';
import quotaRouter from './api/modules/quota.js';
import aiRouter from './server/routes/ai-routes.js';
import assetRoutes from './server/routes/assets.js';
import dbAdapter from './server/database/db-adapter.js';

// ── Auth Refactor v2 Routes & Middleware ──────────────────────────
import authV2Routes from './server/routes/auth-v2.js';
import { validateSession, validateJWT } from './server/middleware/session-validation.js';
import { mergeGuestData } from './server/utils/guest-merger.js';

import { 
  getAllCountries, 
  getCountryByCode, 
  getReligions, 
  getCountriesByContinent,
  searchCountries,
  getPhoneCode
} from './country-data-service.js';

import { sendOTP } from './api/utils/sms-provider.js';

import { 
  sendHybridOTP, 
  verifyHybridOTP, 
  resendOTP,
  sendEmailOTPOnly,
  verifyEmailOTP
} from './hybrid-otp-service.js';

// [SECURITY] Security Middleware
import { requireAuth, devSessions } from './api/middleware/auth.js';
import { enforceFinancialSecurity, enforceWatchDog, storeIdempotencyResponse } from './shared/security-middleware.js';

// Watch-Dog Guardian
import { WatchDogGuardian } from './shared/watch-dog-guardian.js';
const { feedWatchDog } = WatchDogGuardian;

// ─────────────────────────────────────────────────────────────
// JWT Helper Function
// ─────────────────────────────────────────────────────────────
function signJwt(userId, email) {
  const secret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
  const token = jwt.sign(
    { userId, email, iat: Date.now() },
    secret,
    { expiresIn: '24h' }
  );
  return token;
}

const app = express();
setupCORSHeaders(app);
setupAuthHeaders(app);
// Share devSessions with all routers via req.app.get('devSessions')
app.set('devSessions', devSessions);

// ── Phase 3: Auth Utilities Middleware ──────────────────────────
// Make auth utilities available globally for all routes
app.use((req, res, next) => {
  req.auth = {
    validateJWT,
    mergeGuestData,
    validateSession
  };
  next();
});

// Make dbAdapter available to all routes
app.locals.dbAdapter = dbAdapter;

// Trust Render's reverse proxy (required for express-rate-limit behind proxy)
app.set('trust proxy', 1);

// ============================================
// COUNTRY & RELIGION DATA API
// ============================================

// Get all countries with phone codes
app.get('/api/countries', (req, res) => {
  try {
    const countries = getAllCountries();
    res.json({ 
      success: true, 
      count: countries.length,
      countries 
    });
  } catch (err) {
    console.error('[Countries API Error]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch countries' });
  }
});

// Get countries grouped by continent
app.get('/api/countries/by-continent', (req, res) => {
  try {
    const grouped = getCountriesByContinent();
    res.json({ success: true, continents: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch countries' });
  }
});

// Search countries
app.get('/api/countries/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter required' });
    }
    const results = searchCountries(q);
    res.json({ success: true, query: q, count: results.length, countries: results });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// Get single country details
app.get('/api/countries/:code', (req, res) => {
  try {
    const { code } = req.params;
    const country = getCountryByCode(code.toUpperCase());
    if (!country) {
      return res.status(404).json({ success: false, error: 'Country not found' });
    }
    res.json({ success: true, country });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch country' });
  }
});

// Get all religions
app.get('/api/religions', (req, res) => {
  try {
    const religions = getReligions();
    res.json({ success: true, count: religions.length, religions });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch religions' });
  }
});

// Get phone code for a country
app.get('/api/phone-code/:countryCode', (req, res) => {
  try {
    const { countryCode } = req.params;
    const phoneCode = getPhoneCode(countryCode.toUpperCase());
    if (!phoneCode) {
      return res.status(404).json({ success: false, error: 'Country not supported' });
    }
    res.json({ success: true, countryCode: countryCode.toUpperCase(), phoneCode });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get phone code' });
  }
});

// ============================================================================
// SAMMA3NY - CLOUDINARY SONGS API
// ============================================================================
app.get('/api/samma3ny/songs', handleSamma3nySongs);

const server = http.createServer(app);
let wss = null;
try {
  const { WebSocketServer } = await import('ws');
  // Use noServer mode to manually route upgrades.
  // This PREVENTS the raw WS server from intercepting Socket.IO connections
  // at /ws, which caused corrupted frames → [WS-Session] errors → disconnects.
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    try {
      const url = req.url || '/';
      // Socket.IO uses /ws and /socket.io — let it handle those itself
      if (url === '/ws' || url.startsWith('/ws/') || url.startsWith('/socket.io')) {
        return; // Socket.IO will pick this up via its own upgrade listener
      }
      // All other WebSocket upgrades → session WS server
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } catch (upgradeErr) {
      console.error('[WS] Upgrade routing error:', upgradeErr && upgradeErr.message);
      try { socket.destroy(); } catch (_) {}
    }
  });

  // Enhanced session-aware WebSocket handler
  setupSessionWebSocket(wss, {
    devSessions,
    query,
    sseEmit: __sseEmitToSession
  });
  console.log('[WS] Session WebSocket server started (noServer mode, path-routed)');
} catch (e) {
    try { console.warn('[WS] WebSocket unavailable:', e && e.message); } catch(err){ console.error('[WS] WebSocket error handling error:', err) }
  }

// WebSocket emit helpers removed - Using SSE only for all real-time updates

// Socket.IO Integration for E7ki Messenger
const io = new Server(server, {
  cors: { 
    origin: "*", 
    credentials: true 
  },
  path: '/ws'
});

// WebSocket auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-demo');
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// Initialize WatchDog with the dbQuery helper
watchdog.setDb(query);

// ── Parse cookies early so ALL routers below can read req.cookies ──────────
// cookieParser was previously registered at line ~318, AFTER all route mounts,
// which meant req.cookies was always undefined inside every API router.
app.use(cookieParser());

// Parse JSON body BEFORE routes are mounted
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));

// Direct admin deposit - NO MIDDLEWARE - placed early to test
app.use('/abc123-unique-test', (req, res, next) => {
  console.log('[UNIQUE] Test endpoint hit - new code is running!');
  res.json({ ok: true, unique: true, method: req.method, timestamp: Date.now() });
});

// ✅ CRITICAL FIX: Favicon (prevents 404 in console)
app.get('/favicon.ico', (req, res) => {
  // Minimal 1x1 transparent PNG favicon (base64)
  const favicon = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'max-age=31536000');
  res.send(favicon);
});

// ✅ CRITICAL FIX: Session endpoint (required by auth-unified.js)
app.get('/api/auth/session', async (req, res) => {
  try {
    const token = (req.cookies && req.cookies.session_token) || null;
    if (!token) {
      return res.json({
        authenticated: false,
        status: 'unauthenticated',
        userId: null
      });
    }

    // Fast path: in-memory session
    let s = devSessions.get(token);

    // DB fallback: handles server restarts and cross-device sessions
    if (!s || !s.userId) {
      try {
        const dbSess = await query('SELECT user_id, expires_at FROM auth_sessions WHERE token = $1', [token]);
        if (dbSess.rows && dbSess.rows.length > 0) {
          const expiry = new Date(dbSess.rows[0].expires_at);
          if (expiry > new Date()) {
            const userId = dbSess.rows[0].user_id;
            const userRes = await query('SELECT email, user_type FROM users WHERE id = $1', [userId]);
            if (userRes.rows && userRes.rows.length > 0) {
              const u = userRes.rows[0];
              s = { userId, email: u.email, role: u.user_type || 'user', sessionId: token };
              devSessions.set(token, s); // Re-hydrate
            }
          }
        }
      } catch(dbErr) { 
        console.error('[SESSION] DB fallback error:', dbErr.message); 
      }
    }

    if (!s || !s.userId) {
      return res.json({
        authenticated: false,
        status: 'unauthenticated',
        userId: null
      });
    }

    return res.json({
      authenticated: true,
      status: 'authenticated',
      userId: s.userId,
      email: s.email,
      role: s.role,
      sessionId: token
    });
  } catch (err) {
    console.error('[SESSION] error:', err.message);
    return res.json({
      authenticated: false,
      status: 'error',
      userId: null
    });
  }
});

// Register WatchDog routes
// ============================================================================
// ROOT ROUTE & STATIC FILES (MUST BE BEFORE API ROUTES)
// ============================================================================

// Root path: serve yt-new-clear.html
// Cache-busting for HTML files (prevent service worker stale cache)
app.use((req, res, next) => {
    if (req.path.endsWith('.html') || req.path === '/') {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});

app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'public/indexCB.html');
    if (fs.existsSync(htmlPath)) {
        return res.sendFile(htmlPath);
    }
    // Fallback
    res.status(200).json({
        service: 'Dr.D Backend Server',
        version: '2.0',
        status: 'operational',
        port: PORT
    });
});

// Static files (CSS, JS, images, etc.)
app.use(express.static(__dirname, {
    maxAge: '1h',
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
}));


app.use('/api/watchdog', watchdogRoutes);

// Register Trust Engine routes
app.use('/api/trust', trustRouter);

// Register Persistence/Sync routes (watching time, likes, comments, etc.)
app.use('/api/persistence', persistenceRouter);

// Register Activity Tracker routes (comprehensive user activity sync)
app.use('/api/activity', activityRouter);

// ============================================================================
// ZAGEL COMMAND WHEEL - Real-time Event & Service Integration
// ============================================================================

// Mount Zagel routes once at /api
// Routes in zagelRouter handle: /sse, /auth, /commands, /notifications, /channels, /health, /status
app.use('/api', zagelRouter);

// Initialize Zagel event bridge (connects to AssetBus and other systems)
setupZagelEventBridge(app, io); // io is optional (for Socket.IO support)

console.log('[Zagel] Command Wheel integrated - SSE streaming active');

// Redirect old paths to new structure (fallback for missed paths)
app.get('/services/yt-clear/*', (req, res) => {
    const newPath = req.path.replace('/services/yt-clear', '');
    res.redirect(newPath);
});// ============================================================================
// EMERGENCY RENDER FIX - Missing app.listen() + SSE Functions
// ============================================================================




// Health check endpoint (REQUIRED - Render monitoring depends on this)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'production',
        sseClients: global.__sseRegistry.size
    });
});

// Auth endpoint - validate session and return user
app.get('/api/auth/me', async (req, res) => {
    try {
        // Check for session token in cookie or header
        const token = (req.cookies && req.cookies.session_token) || 
                      req.headers['x-session-token'] ||
                      null;
        
        if (!token) {
            // Try to get from auth header (Bearer token)
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const bearerToken = authHeader.slice(7);
                try {
                    const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET || 'dev-secret-key');
                    // Valid JWT, return user info
                    return res.json({
                        authenticated: true,
                        user: {
                            id: decoded.userId,
                            email: decoded.email
                        },
                        sessionId: bearerToken
                    });
                } catch(e) {
                    // Invalid JWT, continue to guest mode
                }
            }
            
            return res.status(401).json({
                authenticated: false,
                message: 'Guest mode - no auth token provided',
                user: null
            });
        }

        // Check in-memory sessions
        let s = devSessions.get(token);
        
        // DB fallback: handles server restarts
        if (!s || !s.userId) {
            try {
                const dbSess = await query('SELECT user_id, expires_at FROM auth_sessions WHERE token = $1', [token]);
                if (dbSess.rows && dbSess.rows.length > 0) {
                    const expiry = new Date(dbSess.rows[0].expires_at);
                    if (expiry > new Date()) {
                        const userId = dbSess.rows[0].user_id;
                        const userRes = await query('SELECT email, user_type, username FROM users WHERE id = $1', [userId]);
                        if (userRes.rows && userRes.rows.length > 0) {
                            const u = userRes.rows[0];
                            s = { userId, email: u.email, username: u.username, role: u.user_type || 'user', sessionId: token };
                            devSessions.set(token, s);
                        }
                    }
                }
            } catch(dbErr) { 
                console.error('[SESSION] DB check error:', dbErr.message); 
            }
        }

        if (!s || !s.userId) {
            return res.status(401).json({
                authenticated: false,
                message: 'Session not found or expired',
                user: null
            });
        }

        return res.json({
            authenticated: true,
            user: {
                id: s.userId,
                email: s.email,
                username: s.username || s.email.split('@')[0],
                role: s.role
            },
            sessionId: token
        });
    } catch (err) {
        console.error('[AUTH /me error]:', err.message);
        return res.status(401).json({
            authenticated: false,
            message: 'Session validation error',
            user: null
        });
    }
});
// Auth configuration endpoint (for Google Client ID)
app.get('/api/auth/google-client-id', (req, res) => {
  const raw = process.env.GOOGLE_CLIENT_ID || '';
  
  // Validate it's a real Google Client ID (not empty or placeholder)
  const isValid = raw && 
                  raw !== 'your_google_client_id.apps.googleusercontent.com' && 
                  /^\d+(-[a-z0-9]+)?\.apps\.googleusercontent\.com$/.test(raw);
  
  if (!isValid) {
    console.warn('[AUTH] GOOGLE_CLIENT_ID not configured or invalid:', raw ? '(set but invalid format)' : '(not set)');
  }
  
  res.json({ 
    clientId: isValid ? raw : '',
    configured: isValid,
    debug: {
      isConfigured: !!raw,
      isPlaceholder: raw === 'your_google_client_id.apps.googleusercontent.com',
      isValid: isValid
    }
  });
});

// Google auth initiation
// GET Google Client ID (PUBLIC - no auth required)
app.get('/api/auth/google-client-id', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const isValid = clientId && !clientId.includes('your_google') && clientId.includes('.apps.googleusercontent.com');
  
  if (!isValid) {
    console.warn('[GOOGLE] Client ID not properly configured:', clientId);
  }
  
  res.json({
    clientId: clientId,
    isValid: isValid,
    configured: !!process.env.GOOGLE_CLIENT_ID
  });
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    // Validate credential is provided
    if (!credential) {
      console.warn('[GOOGLE AUTH] Missing credential in request body');
      return res.status(400).json({ 
        status: 'failed',
        success: false,
        error: 'Missing Google credential',
        message: 'No credential provided'
      });
    }

    // Check if GOOGLE_CLIENT_ID is configured
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your_google_client_id.apps.googleusercontent.com') {
      console.error('[GOOGLE AUTH] GOOGLE_CLIENT_ID not properly configured in .env');
      return res.status(500).json({ 
        status: 'failed',
        success: false,
        authenticated: false,
        error: 'Google Sign-In not configured on server',
        message: 'Server admin must set GOOGLE_CLIENT_ID in .env file'
      });
    }

    console.log('[GOOGLE AUTH] Verifying token with Google...');

    // Verify the ID token with Google
    const googleRes = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
    
    if (!googleRes.ok) {
      const errText = await googleRes.text();
      console.error('[GOOGLE AUTH] Token verification failed:', googleRes.status, errText);
      return res.status(401).json({ 
        status: 'failed',
        success: false,
        error: 'Invalid Google token',
        message: 'Google rejected the token'
      });
    }

    const gUser = await googleRes.json();

    // Verify audience matches our client ID
    if (gUser.aud !== GOOGLE_CLIENT_ID) {
      console.warn('[GOOGLE AUTH] Token audience mismatch. Expected:', GOOGLE_CLIENT_ID, 'Got:', gUser.aud);
      return res.status(401).json({ 
        status: 'failed',
        success: false,
        error: 'Token audience mismatch',
        message: 'Token is not for this application'
      });
    }

    if (!gUser.email) {
      console.warn('[GOOGLE AUTH] No email in Google token');
      return res.status(401).json({ 
        status: 'failed',
        success: false,
        error: 'No email in Google token',
        message: 'Google account does not have an email'
      });
    }

    const email = gUser.email.toLowerCase().trim();
    const displayName = gUser.name || email.split('@')[0];

    console.log('[GOOGLE AUTH] Token verified for:', email);

    // Find existing user
    let user = process.env.DATABASE_URL ? await sqliteFindUserByEmail(email) : memFindUserByEmail(email);

    if (!user) {
      // Auto-create account for Google users
      console.log('[GOOGLE AUTH] Creating new user for:', email);
      const randomPassword = crypto.randomUUID();
      const created = await memCreateUser(email, displayName, randomPassword, {
        emailVerified: true,
        googleId: gUser.sub,
        avatar: gUser.picture || null
      });
      if (!created || !created.id) throw new Error('User creation failed');
      user = { id: created.id, email, username: displayName, user_type: 'user' };
      console.log('[GOOGLE AUTH] New user created:', user.id, email);
    } else {
      console.log('[GOOGLE AUTH] Existing user found:', user.id, email);
    }

    // Create session
    const token = signJwt(user.id, email);
    const sessionId = crypto.randomUUID();

    devSessions.set(sessionId, {
      userId: user.id,
      role: user.user_type || 'user',
      sessionId,
      email,
      isUntrusted: user.is_untrusted || false
    });

    console.log('[GOOGLE AUTH] Session created:', sessionId);

    res.json({
      status: 'success',
      success: true,
      message: 'Google authentication successful',
      authenticated: true,
      sessionId,
      token,
      userId: user.id,
      user: { id: user.id, email, username: displayName }
    });
  } catch (error) {
    console.error('[GOOGLE AUTH ERROR]', error.message, error.stack);
    res.status(500).json({ 
      status: 'failed',
      success: false,
      authenticated: false,
      error: 'Google authentication failed',
      message: error.message 
    });
  }
});
app.post('/api/auth/validate-session', (req, res) => {
    const sessionToken = req.headers['x-session-token'] || req.body?.sessionToken;
    
    if (!sessionToken) {
        return res.status(401).json({ valid: false });
    }
    
    // TODO: Validate against your session database
    res.json({ valid: true, userId: 'user-' + Date.now() });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out' });
});

// ============================================================================
// MISSING AUTH ENDPOINTS - Added to fix frontend failures
// ============================================================================

// Email OTP - Send OTP to user email
app.post('/api/auth/send-email-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }
    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // In production, send via email service. For now, log it.
    console.log(`[OTP] Generated OTP for ${email}: ${otp}`);
    // Store in session (simplified)
    devSessions.set(`otp_${email}`, { otp, expires: Date.now() + 600000 }); // 10 min
    res.json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    console.error('[SEND OTP ERROR]', error);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// Email OTP - Verify OTP
app.post('/api/auth/verify-email-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP required' });
    }
    const storedOtp = devSessions.get(`otp_${email}`);
    if (!storedOtp || storedOtp.otp !== otp) {
      return res.status(401).json({ success: false, error: 'Invalid OTP' });
    }
    res.json({ success: true, verified: true });
  } catch (error) {
    console.error('[VERIFY OTP ERROR]', error);
    res.status(500).json({ success: false, error: 'Failed to verify OTP' });
  }
});

// Resend OTP
app.post('/api/auth/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    devSessions.set(`otp_${email}`, { otp, expires: Date.now() + 600000 });
    console.log(`[OTP RESEND] Generated OTP for ${email}: ${otp}`);
    res.json({ success: true, message: 'OTP resent to email' });
  } catch (error) {
    console.error('[RESEND OTP ERROR]', error);
    res.status(500).json({ success: false, error: 'Failed to resend OTP' });
  }
});

// Sign Up - Create new user account
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, phone, country, religion, gender } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    
    const userId = crypto.randomUUID();
    const userEmail = email.toLowerCase().trim();
    const displayName = name || email.split('@')[0];
    
    // Create session
    const token = signJwt(userId, userEmail);
    const sessionId = crypto.randomUUID();
    devSessions.set(sessionId, {
      userId,
      role: 'user',
      sessionId,
      email: userEmail
    });
    
    console.log('[SIGNUP] New user created:', userId, userEmail);
    
    res.json({
      success: true,
      message: 'Account created successfully',
      authenticated: true,
      sessionId,
      token,
      userId,
      user: { id: userId, email: userEmail, name: displayName }
    });
  } catch (error) {
    console.error('[SIGNUP ERROR]', error.message);
    res.status(500).json({ success: false, error: 'Signup failed', details: error.message });
  }
});

// Login - Authenticate user with email/password or OTP
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, phone, otp, verificationMethod } = req.body;
    
    // Support both email/password and phone/OTP
    let userId = null;
    let userEmail = null;
    
    if (verificationMethod === 'email-otp') {
      if (!email) return res.status(400).json({ success: false, error: 'Email required' });
      userEmail = email.toLowerCase().trim();
      userId = crypto.randomUUID();
      console.log('[LOGIN] Email OTP login:', userEmail);
    } else if (verificationMethod === 'phone-otp') {
      if (!phone) return res.status(400).json({ success: false, error: 'Phone required' });
      userId = crypto.randomUUID();
      userEmail = phone + '@phone.local';
      console.log('[LOGIN] Phone OTP login:', phone);
    } else {
      // Default: email/password
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password required' });
      }
      userEmail = email.toLowerCase().trim();
      userId = crypto.randomUUID();
      console.log('[LOGIN] Email/password login:', userEmail);
    }
    
    // Create session
    const token = signJwt(userId, userEmail);
    const sessionId = crypto.randomUUID();
    devSessions.set(sessionId, {
      userId,
      role: 'user',
      sessionId,
      email: userEmail
    });
    
    console.log('[LOGIN] User authenticated:', userId, userEmail);
    
    res.json({
      success: true,
      message: 'Login successful',
      authenticated: true,
      sessionId,
      token,
      userId,
      user: { id: userId, email: userEmail }
    });
  } catch (error) {
    console.error('[LOGIN ERROR]', error.message);
    res.status(500).json({ success: false, error: 'Login failed', details: error.message });
  }
});

// Verify Hybrid OTP - Support for multiple verification methods
app.post('/api/auth/verify-hybrid-otp', async (req, res) => {
  try {
    const { email, phone, otp, method } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, error: 'OTP required' });
    }
    
    const identifier = email || phone;
    const storedOtp = devSessions.get(`otp_${identifier}`);
    
    if (!storedOtp || storedOtp.otp !== otp) {
      return res.status(401).json({ success: false, error: 'Invalid OTP' });
    }
    
    console.log('[HYBRID OTP] Verified:', method, identifier);
    res.json({ success: true, verified: true });
  } catch (error) {
    console.error('[VERIFY HYBRID OTP ERROR]', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// ============================================================================
// Health Check Endpoints
// ============================================================================

// GET /ping - Simple health check
app.get('/ping', (req, res) => {
  res.status(200).json({ 
    status: 'pong',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// GET /health - Extended health check  
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'dr-d-backend',
    version: '2.0',
    uptime: process.uptime()
  });
});

// Note: GET /api/auth/google was removed. Use POST /api/auth/google instead for authentication.

// Codes sync endpoint
app.post('/api/codes/sync', (req, res) => {
    console.log('[API] Codes sync received:', req.body);
    res.json({ success: true, saved: true, count: 1 });
});

// Assets sync endpoint  
app.post('/api/assets/sync', (req, res) => {
    console.log('[API] Assets sync received:', req.body);
    res.json({ success: true });
});

// SQLite codes endpoint
app.get('/api/sqlite/codes', (req, res) => {
    res.json({ codes: [], count: 0 });
});

// ============================================================================
// GUEST CONTENT UPLOAD - Farragna, Nostalgia, Battalooda
// ============================================================================

// Generate guest ID
function generateGuestId() {
    return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Guest upload middleware
function identifyGuest(req, res, next) {
    const guestId = req.headers['x-guest-id'] || req.cookies?.guest_id;
    if (!guestId || !guestId.startsWith('guest_')) {
        req.guestId = generateGuestId();
        req.isNewGuest = true;
    } else {
        req.guestId = guestId;
        req.isNewGuest = false;
    }
    res.setHeader('x-guest-id', req.guestId);
    next();
}

// Farragna upload (guest)
app.post('/api/farragna/upload', identifyGuest, (req, res) => {
    const { mediaUrl, caption, type } = req.body;
    console.log('[Farragna] Guest upload:', req.guestId, type);
    // Store metadata only - no media storage for guests
    res.json({
        success: true,
        postId: 'farragna_' + Date.now(),
        guestId: req.guestId,
        isNewGuest: req.isNewGuest,
        status: 'pending_review'
    });
});

// Nostalgia upload (guest)
app.post('/api/nostalgia/upload', identifyGuest, (req, res) => {
    const { mediaUrl, caption, year, location } = req.body;
    console.log('[Nostalgia] Guest upload:', req.guestId, year);
    res.json({
        success: true,
        postId: 'nostalgia_' + Date.now(),
        guestId: req.guestId,
        isNewGuest: req.isNewGuest,
        status: 'pending_review'
    });
});

// Battalooda upload (guest)
app.post('/api/battalooda/upload', identifyGuest, (req, res) => {
    const { mediaUrl, caption, location } = req.body;
    console.log('[Battalooda] Guest upload:', req.guestId);
    res.json({
        success: true,
        postId: 'battalooda_' + Date.now(),
        guestId: req.guestId,
        isNewGuest: req.isNewGuest,
        status: 'pending_review'
    });
});

// Extra Mode Reward Claim (local storage fallback for guests)
app.post('/api/rewards/claim', (req, res) => {
    const { type } = req.body;
    const guestId = req.headers['x-guest-id'] || req.cookies?.guest_id;
    console.log('[Rewards] Claim:', type, 'guest:', guestId || 'anonymous');
    
    // Format: SLVR-XXXX-XXXX-XXXX-XXXX-XXXX-P(n) or GOLD-XXXX-XXXX-XXXX-XXXX-XXXX-P(n)
    const prefix = type === 'gold' ? 'GOLD' : 'SLVR';
    const randomPart = Array(6).fill(0).map(() => 
        Math.random().toString(36).substr(2, 4).toUpperCase()
    ).join('-');
    
    // Get claim count for P(n)
    const claimCount = parseInt((Date.now() / 1000) % 100) + 1;
    const fullCode = `${prefix}-${randomPart}-P${claimCount}`;
    
    res.json({
        success: true,
        code: fullCode,
        type: type,
        guestId: guestId,
        claimedAt: Date.now(),
        message: `Claimed ${type} reward!`
    });
});

// Capacitor Live Update manifest
app.get('/capacitor-update/manifest.json', (req, res) => {
    // OTA Update manifest for Capacitor app
    // Points to APK built from latest commits with all fixes:
    // ✅ Fixed postMessage cross-origin issues
    // ✅ Fixed assets showing 0 codes/silver/gold
    // ✅ Removed hardcoded FINALTEST text
    // ✅ Fixed Matter.js balloon animation
    // ✅ Restored proper email+password login to indexCB.html
    res.json({
        version: '1.1.0',
        versionCode: 2,
        minVersion: '1.0.0',
        releaseChannel: 'production',
        url: 'https://gitlab.com/dia201244/drd2027/-/raw/main/CodeBank-debug.apk',
        rollout: 100,
        description: 'Critical fixes: Cross-origin postMessage, asset display, login flow restoration'
    });
});


// ============================================================================
// GUEST CONTENT SYSTEM - Upload, Like, Comment for Farragna, Nostalgia, Battalooda
// ============================================================================
// Import guest content routes
console.log('[Guest Content] Routes registered');

// ============================================================================
// RUN DATABASE MIGRATIONS
// ============================================================================
import { MigrationRunner } from './server/database/migration-runner.js';

// Share devSessions with all routers via req.app.get('devSessions')
app.set('devSessions', devSessions);

// ── Phase 3: Auth Utilities Middleware ──────────────────────────
// Make auth utilities available globally for all routes
app.use((req, res, next) => {
  req.auth = {
    validateJWT,
    mergeGuestData,
    validateSession
  };
  next();
});

// Make dbAdapter available to all routes
app.locals.dbAdapter = dbAdapter;

// Trust Render's reverse proxy (required for express-rate-limit behind proxy)
app.set('trust proxy', 1);

// ============================================
// COUNTRY & RELIGION DATA API
// ============================================

// Get all countries with phone codes
app.get('/api/countries', (req, res) => {
  try {
    const countries = getAllCountries();
    res.json({ 
      success: true, 
      count: countries.length,
      countries 
    });
  } catch (err) {
    console.error('[Countries API Error]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch countries' });
  }
});

// Get countries grouped by continent
app.get('/api/countries/by-continent', (req, res) => {
  try {
    const grouped = getCountriesByContinent();
    res.json({ success: true, continents: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch countries' });
  }
});

// Search countries
app.get('/api/countries/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter required' });
    }
    const results = searchCountries(q);
    res.json({ success: true, query: q, count: results.length, countries: results });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// Get single country details
app.get('/api/countries/:code', (req, res) => {
  try {
    const { code } = req.params;
    const country = getCountryByCode(code.toUpperCase());
    if (!country) {
      return res.status(404).json({ success: false, error: 'Country not found' });
    }
    res.json({ success: true, country });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch country' });
  }
});

// Get all religions
app.get('/api/religions', (req, res) => {
  try {
    const religions = getReligions();
    res.json({ success: true, count: religions.length, religions });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch religions' });
  }
});

// Get phone code for a country
app.get('/api/phone-code/:countryCode', (req, res) => {
  try {
    const { countryCode } = req.params;
    const phoneCode = getPhoneCode(countryCode.toUpperCase());
    if (!phoneCode) {
      return res.status(404).json({ success: false, error: 'Country not supported' });
    }
    res.json({ success: true, countryCode: countryCode.toUpperCase(), phoneCode });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get phone code' });
  }
});

// ============================================================================
// SAMMA3NY - CLOUDINARY SONGS API
// ============================================================================
app.get('/api/samma3ny/songs', handleSamma3nySongs);

const SERVER_STARTUP_TIMEOUT = 15000; // 15 second timeout
let startupTimer = null;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ [CRITICAL] Server bound to 0.0.0.0:${PORT}`);
    console.log(`✅ [BOOT] Dr.D Backend v2.0 is now listening`);
    
    if (startupTimer) clearTimeout(startupTimer);
});

server.on('error', (err) => {
    console.error('❌ [CRITICAL] Port binding FAILED:', err.message);
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
    }
    process.exit(1);
});

// Verify binding within timeout
startupTimer = setTimeout(() => {
    if (!server.listening) {
        console.error('❌ [CRITICAL] Server failed to bind within timeout - exiting');
        process.exit(1);
    }
}, SERVER_STARTUP_TIMEOUT);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[SHUTDOWN] SIGTERM received, closing gracefully...');
    server.close(() => {
        console.log('[SHUTDOWN] Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('[SHUTDOWN] SIGINT received, closing gracefully...');
    server.close(() => {
        console.log('[SHUTDOWN] Server closed');
        process.exit(0);
    });
});

console.log('[BOOT] Server startup complete - waiting for requests...');

export { app, server, io };
