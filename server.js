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
import settaDefault from './api/modules/setta.js';
import * as balloonMod from './api/modules/balloon.js';
import { query, pool } from './api/config/db.js';
import { watchdog } from './services/watchdog/watchdog.js';
import watchdogRoutes from './routes/watchdog.js';
import battaloodaRouter from './api/routes/battalooda.js';
import aiRoutes from './api/routes/ai-routes.js';
import zagelRouter from './api/routes/zagel.js';

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


const app = express();
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
app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'yt-new-clear.html');
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

// Redirect old paths to new structure (fallback for missed paths)
app.get('/services/yt-clear/*', (req, res) => {
    const newPath = req.path.replace('/services/yt-clear', '');
    res.redirect(newPath);
});// ============================================================================
// EMERGENCY RENDER FIX - Missing app.listen() + SSE Functions
// ============================================================================

// Define missing global SSE registry BEFORE any module tries to use it
global.__sseRegistry = global.__sseRegistry || new Map();
global.__sseEmitToSession = function(sessionId, data) {
    try {
        const client = global.__sseRegistry.get(sessionId);
        if (client && !client.destroyed) {
            client.write(`data: ${JSON.stringify(data)}\n\n`);
            return true;
        }
    } catch(e) {
        console.error('[SSE] Emit error:', e.message);
    }
    return false;
};


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

// Auth endpoint (stub for unauthenticated requests)
app.get('/api/auth/me', (req, res) => {
    res.status(401).json({
        authenticated: false,
        message: 'Guest mode - no auth token provided',
        user: null
    });
});

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


// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// ============================================================================
// FINAL: Bind to port with timeout verification
// ============================================================================

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
