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
import rateLimit from 'express-rate-limit';
import trustRouter from './api/modules/trust.js';
// Clerk removed: zero-auth mode

import * as monetizationMod from './api/modules/monetization.js';
import * as samma3nyMod from './api/modules/samma3ny.js';
import * as nostagliaMod from './api/modules/nostaglia.js';
import * as pebalaashMod from './api/modules/pebalaash.js';
import * as adminMod from './api/modules/admin.js';
import * as testMod from './api/modules/test.js';
import * as rewardsMod from './api/modules/rewards.js';
import farragnaDefault, { webhookCloudflare as farragnaWebhook } from './api/modules/farragna.js';
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
  resendOTP 
} from './hybrid-otp-service.js';

// [SECURITY] Security Middleware
import { requireAuth, devSessions } from './api/middleware/auth.js';
import { enforceFinancialSecurity, enforceWatchDog, storeIdempotencyResponse } from './shared/security-middleware.js';


const app = express();

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
  wss = new WebSocketServer({ server });
  const wsClients = new Map(); // userId -> ws
  wss.on('connection', ws => {
    try { console.log('[WS] Client connected'); } catch(err){ console.error('[WS] Connection error:', err) }
    ws.on('message', msg => {
      try {
        const data = JSON.parse(msg.toString());
        if (data && data.type === 'AUTH' && data.userId) {
          ws.userId = String(data.userId);
          wsClients.set(ws.userId, ws);
          try { console.log('[WS] Authenticated:', ws.userId); } catch(err){ console.error('[WS] Auth error:', err) }
        }
      } catch(e) { try { console.error('[WS ERROR]', e && e.message ? e.message : e); } catch(err){ console.error('[WS] Error handling error:', err) } }
    });
    ws.on('close', () => { try { if (ws.userId) wsClients.delete(ws.userId); } catch(err){ console.error('[WS] Close error:', err) } });
  });
  // WebSocket emit function removed - Using SSE only
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

// Register WatchDog routes
app.use('/api/watchdog', watchdogRoutes);

// Register Trust Engine routes
app.use('/api/trust', trustRouter);

// Register Farragna routes
app.use('/api/farragna', farragnaDefault);

// Register Pebalaash routes
app.use('/api/pebalaash', pebalaashMod.default || pebalaashMod);

// Register Battalooda routes
app.use('/api/battalooda', battaloodaRouter);

// Register Sync routes
app.use('/api/codes', syncRouter);

// AUTH REMOVED — CLEAN RESET

// Configure multer for file uploads (support multiple files)
const upload = multer({
  dest: '/tmp/',
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB per file (increased for high-quality audio)
    files: 2000, // Maximum 2000 files at once (as requested)
    fieldSize: 200 * 1024 * 1024, // 200MB field size
    fields: 10 // Allow multiple form fields
  },
  fileFilter: (req, file, cb) => {
    // Allow any file type for now (we'll validate in the handler)
    cb(null, true);
  }
});

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dhpyneqgk',
  api_key: process.env.CLOUDINARY_API_KEY || '799518422494748',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'zfSbK0-zK3tHdmCWdcCduPcxtU4'
});

// Middleware
// Helmet removed

// [SECURITY] CRITICAL: CORS must be configured properly (from actly.md)
app.use(cors({
  origin: ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,  // [SECURITY] CRITICAL: Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Handle preflight
app.options('*', cors());

app.use(cookieParser());

// Request logging middleware (logs after response completes with status code)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    // Only log API calls and page navigations, skip static assets
    if (req.path.startsWith('/api/') || req.path.endsWith('.html') || req.path === '/') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
    }
  });
  next();
});

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true }));
// Static files will be served later to allow custom route overrides
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
// Note: upload.any() is applied only to specific upload routes below

app.get('/api/rewards/balance', async (req, res) => {
  try {
    const s = (req.cookies && req.cookies.session_token) || null;
    if (!s) return res.status(401).json({ error: 'unauthorized' });
    const session = devSessions.get(s);
    if (!session || !session.userId) return res.status(401).json({ error: 'unauthorized' });

    const userId = session.userId;
    const r = await query(
      'SELECT codes_count, silver_count, gold_count FROM balances WHERE user_id=$1',
      [userId]
    );

    const row = r.rows[0] || { codes_count: 0, silver_count: 0, gold_count: 0 };
    return res.json({
      codes: row.codes_count || 0,
      silver: row.silver_count || 0,
      gold: row.gold_count || 0,
      likes: 0,
      superlikes: 0,
      games: 0,
      transactions: 0,
      last_updated: new Date().toISOString()
    });
  } catch (err) {
    console.error('[BALANCES ERROR]', err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

app.get('/api/watchdog/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { getWatchDogState, updateDogStateByTime } = await import('./shared/watch-dog-guardian.js');
    
    // Refresh state based on time
    const info = await updateDogStateByTime(userId);
    const state = await getWatchDogState(userId);
    
    return res.json({
      success: true,
      dogState: state.dogState,
      lastFedAt: state.lastFedAt,
      isFrozen: state.isFrozen,
      hoursSinceLastFeed: info.hoursSinceLastFeed
    });
  } catch (err) {
    console.error('[WATCHDOG STATUS] error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

function readSessionFromCookie(req) {
  try {
    const token = (req.cookies && req.cookies.session_token) || null;
    if (!token) return null;
    const s = devSessions.get(token);
    return s || null;
  } catch (_) {
    return null;
  }
}

const JWT_SECRET = 'secret-demo';
function signJwt(userId, email) { return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' }) }
function requireJwtAuth(req, res, next) { try { const h = req.headers.authorization || ''; const parts = h.split(' '); if (parts[0] !== 'Bearer' || !parts[1]) return res.status(401).json({ status: 'failed', error: 'Unauthorized' }); const decoded = jwt.verify(parts[1], JWT_SECRET); req.auth = { userId: decoded.userId, email: decoded.email }; next() } catch (e) { return res.status(401).json({ status: 'failed', error: 'Unauthorized' }) } }
const __authUsers = new Map(); // email -> { id, email, username, password_hash }
let __USER_SEQ = 1000;
async function sqliteFindUserByEmail(email){
  try {
    // Normalize email
    const normalizedEmail = String(email).toLowerCase().trim();

    const r = await query('SELECT id, email, password_hash, codes_count, silver_count, gold_count, last_sync_at, user_type, is_untrusted FROM users WHERE LOWER(email)=$1', [normalizedEmail]);

    console.log("[DB] sqliteFindUserByEmail query result:", {
        rowsFound: r.rows?.length || 0,
        email: normalizedEmail
    });

    return r.rows[0] || null
  } catch (e) {
    console.error('[DB ERROR] sqliteFindUserByEmail failed:', e.message);
    throw e;
  }
}
function memFindUserByEmail(email){ return __authUsers.get(email) || null }
async function memCreateUser(email, username, password, profile = {}){
  const normalizedEmail = String(email).toLowerCase().trim();
  const hash = await bcrypt.hash(password, 10); 

  console.log("[SIGNUP] Creating user:", { email: normalizedEmail, profile });

  let id = crypto.randomUUID();

  try {
    if (process.env.DATABASE_URL) {
      // Check if user exists first
      const existing = await query('SELECT id, password_hash FROM users WHERE LOWER(email)=$1', [normalizedEmail]);

      if (existing.rows && existing.rows[0]) {
        // User exists - update password and profile data if it's a migration/overwrite case
        id = existing.rows[0].id;
        console.log(`[SIGNUP] User ${normalizedEmail} already exists, updating profile for id: ${id}`);
        
        await query(
          'UPDATE users SET password_hash=$1, username=$2, religion=$3, country=$4, phone=$5 WHERE id=$6',
          [
            hash, 
            username || normalizedEmail.split('@')[0], 
            profile.religion || null, 
            profile.country || null, 
            profile.phone || null, 
            id
          ]
        );
      } else {
        // Create new user
        await query(
          'INSERT INTO users(id, email, username, password_hash, religion, country, phone) VALUES($1,$2,$3,$4,$5,$6,$7)',
          [
            id, 
            normalizedEmail, 
            username || normalizedEmail.split('@')[0], 
            hash,
            profile.religion || null,
            profile.country || null,
            profile.phone || null
          ]
        );
        console.log(`[SIGNUP] User ${normalizedEmail} created in DB: ${id}`);
      }

      // Initialize default assets
      try {
        await query('INSERT INTO user_assets(user_id, asset_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, 'init']);
        // Initialize balances entry
        await query('INSERT INTO balances(user_id, codes_count, silver_count, gold_count) VALUES($1, 0, 0, 0) ON CONFLICT DO NOTHING', [id]);
      } catch(err){
        console.error('[SIGNUP] User assets/balances insert error:', err.message);
      }
    }
  } catch(e) {
    console.error('[SIGNUP][DB ERROR]', e.message);
  }

  // Also keep in memory for current session compatibility
  __authUsers.set(normalizedEmail, { 
    id, 
    email: normalizedEmail, 
    username: username || null, 
    password_hash: hash,
    ...profile
  });

  if (!usersManager.getUser(id)) {
    usersManager.addUser({ id, balance: 100, assets: [] });
  }

  return { id };
}

const __sseClients = new Map();
function __sseEmit(userId, payload) {
  try {
    const set = __sseClients.get(String(userId));
    if (!set) return;
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of set) { try { res.write(data) } catch(err){ console.error('[SSE] Write error:', err) } }
  } catch(err){ console.error('[SSE] Broadcast error:', err) }
}
app.get('/events', (req, res) => {
  try {
    const s = readSessionFromCookie(req);
    if (!s || !s.userId) return res.status(401).end();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();
    res.write(`event: hello\n` + `data: {"ok":true}\n\n`);
    const uid = String(s.userId);
    if (!__sseClients.has(uid)) __sseClients.set(uid, new Set());
    __sseClients.get(uid).add(res);
    const keep = setInterval(() => { try { res.write(':\n\n') } catch(err){ console.error('[SSE] Keep-alive error:', err) } }, 15000);
    req.on('close', () => { try { clearInterval(keep); __sseClients.get(uid)?.delete(res) } catch(err){ console.error('[SSE] Close cleanup error:', err) } });
  } catch(err) { try { res.status(500).end() } catch(err2){ console.error('[SSE] Error response error:', err2) } }
});

async function __startEventProcessor() {
  try {
    if (process.env.EVENT_PROCESSOR_DISABLED === '1') return;
    let lastId = 0;
    try {
      const r = await query("SELECT last_id FROM event_offsets WHERE key='default'");
      lastId = (r.rows && r.rows[0] && Number(r.rows[0].last_id)) || 0;
    } catch(err) { 
      console.error('[SSE] Event processing offset check error:', err.message)
      lastId = 0 
    }
    ;(async function loop(){
      for(;;) {
        try {
          const { rows } = await query('SELECT id, event_type, payload FROM event_store WHERE id > $1 ORDER BY id ASC LIMIT 50', [lastId]);
          if (!rows || rows.length === 0) { await new Promise(r => setTimeout(r, 150)); continue }
          for (const ev of rows) {
            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              // SQLite: use INSERT OR IGNORE since ON CONFLICT ... DO NOTHING might not work with RETURNING in all SQLite versions
              // Actually, better-sqlite3 handles it if defined. Let's stick to standard SQLite for max compatibility.
              await client.query('INSERT OR IGNORE INTO applied_events(event_id) VALUES ($1)', [ev.id]);
              const check = await client.query('SELECT event_id FROM applied_events WHERE event_id = $1', [ev.id]);
              if (!check.rows || check.rows.length === 0) { await client.query('ROLLBACK'); lastId = ev.id; continue }
              
              if (ev.event_type === 'TRANSFER_COMPLETED') {
                const p = typeof ev.payload === 'string' ? JSON.parse(ev.payload) : ev.payload || {};
                const from = p.from; const to = p.to; const assetType = p.assetType || 'codes'; const amount = Number(p.amount||0);
                
                // SQLite: UPSERT syntax
                await client.query(
                  'INSERT INTO balance_projection(user_id, asset_type, amount) VALUES ($1, $2, -$3) ON CONFLICT (user_id, asset_type) DO UPDATE SET amount = amount - EXCLUDED.amount, updated_at = CURRENT_TIMESTAMP',
                  [from, assetType, amount]
                );
                await client.query(
                  'INSERT INTO balance_projection(user_id, asset_type, amount) VALUES ($1, $2, $3) ON CONFLICT (user_id, asset_type) DO UPDATE SET amount = amount + EXCLUDED.amount, updated_at = CURRENT_TIMESTAMP',
                  [to, assetType, amount]
                );
                
                // generate_series replacement
                for (let i = 0; i < amount; i++) {
                  const newCode = crypto.randomUUID();
                  await client.query(
                    "INSERT INTO codes (id, user_id, code, type, created_at, generated_at, next_at, spent, meta) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, $5)",
                    [crypto.randomUUID(), to, newCode, assetType, JSON.stringify({ source_event_id: ev.id, source_tx: p.txId || null })]
                  );
                }

                try {
                  if (assetType === 'codes') {
                    const codesRes = await client.query(
                      'SELECT code FROM codes WHERE id IN (SELECT id FROM codes WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2)',
                      [to, amount]
                    );
                    const newCodes = codesRes.rows.map(r => r.code);
                    
                    __sseEmit(to, { type: 'CODES_RECEIVED', codes: newCodes, assetType, amount, eventId: ev.id });
                    __sseEmit(from, { type: 'ASSET_UPDATE', assetType, amount: -amount, eventId: ev.id });
                  } else {
                    __sseEmit(to, { type: 'ASSET_UPDATE', assetType, amount, eventId: ev.id });
                    __sseEmit(from, { type: 'ASSET_UPDATE', assetType, amount: -amount, eventId: ev.id });
                  }
                } catch(err){ console.error('[SEND-CODES] SSE emit error:', err) }
              }
              await client.query('COMMIT');
            } catch(e) {
              console.error('[PROCESSOR ERROR]', e.message);
              try { await client.query('ROLLBACK') } catch(err){ }
            } finally { try { client.release() } catch(err){ } }
            lastId = ev.id;
          }
          try { await query("UPDATE event_offsets SET last_id=$1, updated_at=CURRENT_TIMESTAMP WHERE key='default'", [lastId]) } catch(_){ }
        } catch(_) { await new Promise(r => setTimeout(r, 300)) }
      }
    })();
  } catch(_) { }
}

// Event processor will be started in server.listen after DDL is applied

// Transaction-Core bootstrap (PolicyEngine + Managers)
import { Ledger } from './transaction-core/core/Ledger.js'
import { UsersManager } from './transaction-core/core/UsersManager.js'
import { BankodeManager } from './transaction-core/core/BankodeManager.js'
import { TransactionManager } from './transaction-core/core/TransactionManager.js'
import { DbClient } from './transaction-core/persistence/NeonClient.js'
import { UsersRepository } from './transaction-core/persistence/UsersRepository.js'
import { LedgerRepository } from './transaction-core/persistence/LedgerRepository.js'
import { BankodeRepository } from './transaction-core/persistence/BankodeRepository.js'
import { PolicyEngine } from './transaction-core/policy-engine/PolicyEngine.js'
import { LikePolicy } from './transaction-core/policies/LikePolicy.js'
import { GameRewardPolicy } from './transaction-core/policies/GameRewardPolicy.js'
import { StorePolicy } from './transaction-core/policies/StorePolicy.js'
import { CreatorIncentivePolicy } from './transaction-core/policies/CreatorIncentivePolicy.js'

const ledger = new Ledger()
const usersManager = new UsersManager()
const bankodeManager = new BankodeManager()
let transactionManager = new TransactionManager(usersManager, bankodeManager, ledger)

async function ensureQarsanVirtualUsers() {
  try {
    // SQLite schema already ensured in applyNeonCompressionDDL
    const r = await query('SELECT COUNT(*) AS c FROM qarsan_virtual_users')
    const c = parseInt(r.rows[0]?.c || 0, 10)
    if (c === 0) {
      await generateVirtualUsers()
    }
  } catch (_) {}
}

async function generateVirtualUsers() {
  try {
    const bots = [
      { email: 'bot1@qarsan.ai', name: 'Qarsan Bot 1', dog_state: 'SLEEPING', qarsan_mode: 'RANGED', balance: 150, qarsan_wallet: 50 },
      { email: 'bot2@qarsan.ai', name: 'Qarsan Bot 2', dog_state: 'ACTIVE', qarsan_mode: 'OFF', balance: 200, qarsan_wallet: 0 },
      { email: 'trap.user@qarsan.ai', name: 'Trap User', dog_state: 'ACTIVE', qarsan_mode: 'EXPOSURE', balance: 300, qarsan_wallet: 100 },
      { email: 'decoy@qarsan.ai', name: 'Decoy Account', dog_state: 'SLEEPING', qarsan_mode: 'EXPOSURE', balance: 120, qarsan_wallet: 20 },
      { email: 'honeypot@qarsan.ai', name: 'Honey Pot', dog_state: 'SLEEPING', qarsan_mode: 'RANGED', balance: 80, qarsan_wallet: 40 }
    ]
    for (const b of bots) {
      await query(
        `INSERT INTO qarsan_virtual_users (id, email, name, dog_state, qarsan_mode, balance, qarsan_wallet, last_fed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, datetime('now', '-26 hours'))
         ON CONFLICT (email) DO NOTHING`,
        [crypto.randomUUID(), b.email, b.name, b.dog_state, b.qarsan_mode, b.balance, b.qarsan_wallet]
      )
    }
  } catch (_) {}
}

// Optionally bind SQLite repositories for atomic DB writes
// DISABLED due to persistent startup crashes - will use in-memory only
let repos = null;
try {
  const { SQLiteClient } = await import('./transaction-core/persistence/SQLiteClient.js')
  const sqlite = new SQLiteClient()
  const { EventVaultRepository } = await import('./transaction-core/persistence/EventVaultRepository.js')
  const { BalancesRepository } = await import('./transaction-core/persistence/BalancesRepository.js')
  const { LedgerRepository } = await import('./transaction-core/persistence/LedgerRepository.js')
  const { UsersRepository } = await import('./transaction-core/persistence/UsersRepository.js')
  const { BankodeRepository } = await import('./transaction-core/persistence/BankodeRepository.js')
  repos = {
    eventVaultRepo: new EventVaultRepository(sqlite),
    ledgerRepo: new LedgerRepository(sqlite),
    balancesRepo: new BalancesRepository(sqlite),
    usersRepo: new UsersRepository(sqlite),
    bankodeRepo: new BankodeRepository(sqlite)
  }
  transactionManager = new TransactionManager(usersManager, bankodeManager, ledger, repos)
} catch (e) { console.warn('[SQLITE] Core binding failed:', e?.message) }

// Register baseline policies
const policyEngine = new PolicyEngine(transactionManager)
policyEngine.register('like', new LikePolicy(transactionManager))
policyEngine.register('gameReward', new GameRewardPolicy(transactionManager))
policyEngine.register('storePurchase', new StorePolicy(transactionManager))
policyEngine.register('creatorIncentive', new CreatorIncentivePolicy(transactionManager))

// DEV auth endpoints (must precede any /api catch-all)
app.post('/api/auth/dev-login', (req, res) => {
  try {
    const sessionId = (crypto && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    const userId = (crypto && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    devSessions.set(sessionId, { userId, role: 'dev', sessionId });
    res.cookie('session_token', sessionId, {
      httpOnly: true,
      path: '/',
      sameSite: 'none',
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    try { console.log('[AUTH] dev login success'); } catch(err){ console.error('[AUTH] Login success log error:', err) }
    try {
      const insertUser = async () => {
        await query(
          'INSERT INTO users (id, status, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING',
          [userId, 'active']
        )
      }
      insertUser().catch((err) => { console.error('[AUTH] User insert error:', err) })
    } catch(err){ console.error('[AUTH] Login error:', err) }
    return res.status(200).json({ ok: true, userId, sessionId });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'dev login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    const token = req.cookies && req.cookies.session_token;
    if (token) devSessions.delete(token);
    res.clearCookie('session_token', { path: '/' });
    try { console.log('[AUTH] logout success'); } catch(err){ console.error('[AUTH] Logout success log error:', err) }
  } catch(err){ console.error('[AUTH] Logout error:', err) }
  return res.status(200).json({ ok: true });
});

// ------------------------------------------------------------------
// AUTHENTICATION API
// ------------------------------------------------------------------

// Step 1: Send Hybrid OTP (Email + Phone)
app.post('/api/auth/send-hybrid-otp', async (req, res) => {
  try {
    const { email, phone, countryCode } = req.body;
    
    if (!email || !phone || !countryCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, phone number, and country code are required' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }
    
    const result = await sendHybridOTP({ email, phone, countryCode });
    
    if (result.success) {
      return res.json({
        success: true,
        message: result.message,
        sessionId: result.sessionId,
        channels: result.channels,
        // Only include in development
        ...(result.mockOtp && { mockOtp: result.mockOtp })
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }
    
  } catch (error) {
    console.error('[HybridOTP API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send OTP' 
    });
  }
});

// Step 2: Verify OTP (Email or Phone)
app.post('/api/auth/verify-hybrid-otp', async (req, res) => {
  try {
    const { sessionId, otp, channel } = req.body;
    
    if (!sessionId || !otp || !channel) {
      return res.status(400).json({
        success: false,
        error: 'Session ID, OTP, and channel (email/phone) are required'
      });
    }
    
    const result = await verifyHybridOTP(sessionId, otp, channel);
    
    if (result.success) {
      return res.json({
        success: true,
        message: result.message,
        verified: result.verified,
        progress: result.progress,
        pendingChannel: result.pendingChannel,
        userData: result.userData
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('[HybridOTP Verify] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Verification failed'
    });
  }
});

// Step 3: Resend OTP
app.post('/api/auth/resend-otp', async (req, res) => {
  try {
    const { sessionId, channel } = req.body;
    
    if (!sessionId || !channel) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and channel are required'
      });
    }
    
    const result = await resendOTP(sessionId, channel);
    
    if (result.success) {
      return res.json({
        success: true,
        message: `OTP resent via ${channel}`
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('[Resend OTP] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resend OTP'
    });
  }
});

// TEMP ADMIN: password reset (to be removed after use)
app.post('/api/admin/reset-pw', async (req, res) => {
  const { secret, email, newPassword } = req.body;
  if (secret !== 'tmp-reset-secret-2026') return res.status(403).json({ error: 'forbidden' });
  try {
    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash=$1 WHERE LOWER(email)=$2', [hash, email.toLowerCase()]);
    res.json({ status: 'ok', message: 'Password updated for ' + email });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Updated signup without OTP verification
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { 
      email, 
      username, 
      password, 
      religion, 
      country, 
      phone, 
      countryCode
    } = req.body;
    
    // Validate required fields
    if (!email || !password || !religion || !country || !phone) {
      return res.status(400).json({ 
        status: 'failed', 
        error: 'All fields are required' 
      });
    }
    
    // Check if user exists
    const existing = process.env.DATABASE_URL 
      ? await sqliteFindUserByEmail(email) 
      : memFindUserByEmail(email);
      
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        error: 'USER_EXISTS',
        message: 'An account with this email already exists. Please sign in instead.' 
      });
    }

    // [SECURITY] MODIFIED: Clear any existing sessions for this email to prevent stale session conflicts
    for (const [sid, sess] of devSessions.entries()) {
      if (sess.email === email) {
        devSessions.delete(sid);
      }
    }
    
    // Create user with profile data
    const formattedPhone = (phone && countryCode) ? `${countryCode}${phone.replace(/\D/g, '')}` : phone;
    
    const created = await memCreateUser(email, username, password, {
      religion,
      country,
      phone: formattedPhone,
      phoneVerified: true,
      emailVerified: true,
      verifiedAt: new Date().toISOString()
    });
    
    if (!created || !created.id) {
      throw new Error("User creation failed");
    }

    // [SECURITY] MODIFIED: Ensure user is registered in the UsersManager/Ledger if needed
    try {
      if (global.UsersManager && typeof global.UsersManager.registerUser === 'function') {
        await global.UsersManager.registerUser(created);
        console.log(`[Signup] Registered user ${created.id} in UsersManager`);
      }
    } catch (e) {
      console.warn('[Signup] UsersManager registration failed:', e.message);
    }
    
    // Create session
    const token = signJwt(created.id, email);
    const newSessionId = crypto.randomUUID();
    
    devSessions.set(newSessionId, {
      userId: created.id,
      role: 'user',
      sessionId: newSessionId,
      email,
      phone: formattedPhone,
      religion,
      country,
      verified: true
    });
    
    // Set cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('session_token', newSessionId, {
      httpOnly: false, // [SECURITY] MODIFIED: Allow client-side JS to see the cookie for redirection logic
      path: '/',
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    return res.json({ 
      status: 'success', 
      userId: created.id, 
      token,
      sessionId: newSessionId,
      user: {
        id: created.id,
        email,
        username,
        religion,
        country,
        phone: formattedPhone,
        verified: true
      }
    });
    
  } catch (err) {
    console.error('[Signup Error]:', err);
    return res.status(500).json({ 
      status: 'failed', 
      error: err.message || 'Signup failed' 
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    console.log("[LOGIN ATTEMPT] BODY:", req.body);
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ status: 'failed', error: 'Email and password required' });

    // Check in database or memory
    const u = process.env.DATABASE_URL ? await sqliteFindUserByEmail(email) : memFindUserByEmail(email);

    console.log("[SEARCH] [LOGIN] User lookup result:", {
        found: !!u,
        hasPasswordHash: !!(u && u.password_hash),
        userId: u?.id,
        email: u?.email
    });

    if (!u) {
      console.warn("[WARN] [LOGIN] User not found:", email);
      return res.status(401).json({ status: 'failed', error: 'Invalid credentials' });
    }

    // Verify password
    if (!u.password_hash) {
      console.error("[ERROR] [LOGIN] User account has no password hash:", email);
      return res.status(500).json({ status: 'failed', error: 'Account corrupted' });
    }

    // [FIX] FIX: Ensure password_hash is a string and handle PHP bcrypt format ($2y$ -> $2a$)
    let storedHash = String(u.password_hash).trim();
    if (storedHash.startsWith('$2y$')) {
      storedHash = '$2a$' + storedHash.substring(4);
      console.log("[SYNC] [LOGIN] Normalized PHP bcrypt hash to $2a$ format");
    }
    const inputPassword = String(password).trim();

    console.log("[CODE] [LOGIN] Attempting password comparison...");
    const ok = await bcrypt.compare(inputPassword, storedHash);

    console.log("[CODE] [LOGIN] Password comparison result:", ok);

    if (!ok) {
      console.warn("[WARN] [LOGIN] Password mismatch for user:", email);
      return res.status(401).json({ status: 'failed', error: 'Invalid credentials' });
    }

    const token = signJwt(u.id, u.email);
    const sessionId = (crypto && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Math.random().toString(36).slice(2);

    // Store in-memory session
    devSessions.set(sessionId, {
      userId: u.id,
      role: u.user_type || 'user',
      sessionId,
      email: u.email,
      isUntrusted: u.is_untrusted || false
    });

    // Set cookie
    res.cookie('session_token', sessionId, {
      httpOnly: false, // [SECURITY] MODIFIED: Allow client-side JS to see the cookie for redirection logic
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    console.log('[AUTH] Login success - userId:', u.id, 'sessionId:', sessionId);
    return res.json({ status: 'success', userId: u.id, token, sessionId });
  } catch (err) {
    console.error('[LOGIN ERROR]:', err);
    return res.status(500).json({ status: 'failed', error: 'Login failed' });
  }
});

// Dev auth: whoami
app.get('/api/auth/me', requireAuth, (req, res) => {
  try {
    return res.json({ 
      success: true,
      user: { 
        id: req.user.id, 
        email: req.user.email,
        sessionId: req.user.sessionId, 
        role: req.user.role 
      } 
    });
  } catch (_) {
    return res.json({ success: false, user: null });
  }
});

// Alias: session info
app.get('/api/me', (req, res) => {
  try {
    const token = (req.cookies && req.cookies.session_token) || null;
    if (!token) return res.json({ success: false, user: null });
    const s = devSessions.get(token);
    if (!s) return res.json({ success: false, user: null });
    return res.json({ 
      success: true,
      user: { 
        id: s.userId, 
        email: s.email,
        sessionId: s.sessionId, 
        role: s.role 
      } 
    });
  } catch (_) {
    return res.json({ success: false, user: null });
  }
});

app.get('/api/users/resolve', async (req, res) => {
  try {
    const email = (req.query.email || '').trim()
    if (!email) return res.status(400).json({ status: 'failed', error: 'Email required' })
    const u = process.env.DATABASE_URL ? await sqliteFindUserByEmail(email) : memFindUserByEmail(email)
    if (!u) return res.status(404).json({ status: 'failed', error: 'User not found' })
    return res.json({ status: 'success', userId: u.id })
  } catch (e) {
    return res.status(500).json({ status: 'failed', error: 'Resolve failed' })
  }
})

app.get('/api/users/state', requireAuth, async (req, res) => {
  try {
    const userId = (req.query.userId || '').trim()
    if (!userId) return res.status(400).json({ status: 'failed', error: 'UserId required' })
    
    // Authorization check
    if (req.user.id !== userId) {
      return res.status(403).json({ status: 'failed', error: 'unauthorized_access' })
    }
    
    const user = usersManager.getUser(userId)
    if (!user) return res.json({ status: 'success', user: null })
    return res.json({ status: 'success', user })
  } catch (e) {
    return res.status(500).json({ status: 'failed', error: 'State fetch failed' })
  }
})

app.get('/api/ledger', (req, res) => { try { return res.json({ status: 'success', ledger: ledger.getAll() }) } catch(e) { return res.status(500).json({ status: 'failed', error: e.message }) } })
app.get('/api/events', (req, res) => { try { return res.json({ status: 'success', events: (globalThis.__eventVaultMem || []) }) } catch(e) { return res.status(500).json({ status: 'failed', error: e.message }) } })

// Verification endpoints (SQLite)
app.get('/api/sqlite/vault', requireAuth, async (req, res) => {
  try {
    const uid = (req.query.userId || '').trim()
    if (!uid) return res.status(400).json({ status: 'failed', error: 'userId required' })
    
    // Authorization check
    if (req.user.id !== uid) {
      return res.status(403).json({ status: 'failed', error: 'unauthorized_access' })
    }
    
    const r = await query(`SELECT * FROM audit_logs WHERE actor_user_id=$1 ORDER BY created_at DESC`, [uid])
    return res.json({ status: 'success', rows: r.rows })
  } catch (e) { return res.status(500).json({ status: 'failed', error: e.message }) }
})

app.get('/api/sqlite/ledger', requireAuth, async (req, res) => {
  try {
    const uid = (req.query.userId || '').trim()
    if (!uid) return res.status(400).json({ status: 'failed', error: 'userId required' })
    
    // Authorization check
    if (req.user.id !== uid) {
      return res.status(403).json({ status: 'failed', error: 'unauthorized_access' })
    }
    
    // [SECURITY] MODIFIED: Add a small delay to prevent rapid polling spam (from actly.md)
    // await new Promise(r => setTimeout(r, 100));

    const r = await query(`SELECT * FROM ledger WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`, [uid])
    return res.json({ status: 'success', rows: r.rows })
  } catch (e) { return res.status(500).json({ status: 'failed', error: e.message }) }
})

app.get('/api/sqlite/balances', async (req, res) => {
  return res.json({ status: 'success', rows: [], message: 'balances view deprecated' });
})

// Legacy CodeBank codes endpoint (renamed to avoid collision)
app.post('/api/sqlite/codes-legacy', async (req, res) => {
  try {
    const body = req.body || {}
    const code = body.code || ''
    if (!code || typeof code !== 'string') return res.status(400).json({ status: 'failed', error: 'Invalid code' })
    if (/_PP$/.test(code)) { try { console.warn('[PP-FILTER] codes-legacy rejected PP payload') } catch(_){}; return res.json({ status: 'success', ignored: true, reason: 'guest PP' }) }
    let userId = null
    try { const token = req.cookies && req.cookies.session_token; const s = token && devSessions.get(token); if (s && s.userId) userId = s.userId; } catch(_){}
    if (!userId) return res.status(401).json({ status: 'failed', error: 'Unauthorized' })
    // Accept and acknowledge; persistence handled elsewhere
    return res.json({ status: 'success', code, userId })
  } catch (e) {
    return res.status(500).json({ status: 'failed', error: e.message })
  }
})

// Unified Action Endpoint
app.post('/api/action', async (req, res) => {
  try {
    const s = readSessionFromCookie(req)
    if (!s || !s.userId) return res.status(401).json({ status: 'failed', error: 'Unauthorized' })
    req.auth = { userId: s.userId }
    const body = req.body || {}
    const type = body.type
    if (!type) return res.status(400).json({ status: 'failed', error: 'Invalid request: missing type' })

    // Enhanced guest mode filtering - check ALL string fields for _PP suffix
    function hasGuestSuffix(value) {
      return typeof value === 'string' && /_PP$/.test(value)
    }
    
    // Check all string fields in the payload for guest _PP suffix
    for (const [key, value] of Object.entries(body)) {
      if (hasGuestSuffix(value)) { try { console.warn('[PP-FILTER] action rejected key:', key) } catch(_){}; return res.json({ status: 'success', ignored: true, reason: 'guest PP' }) }
    }

    // Ensure virtual users exist in UsersManager for demo; in real system syncs from Neon
    try {
      const uid = req.auth.userId
      if (!usersManager.getUser(uid)) usersManager.addUser({ id: uid, balance: 100, assets: [] })
    } catch (_) {}

    // Resolve recipient if toEmail provided
    let toUser = body.toUser
    if (!toUser && body.toEmail) {
      const u = process.env.DATABASE_URL ? await sqliteFindUserByEmail(body.toEmail) : memFindUserByEmail(body.toEmail)
      if (!u) return res.status(404).json({ status: 'failed', error: 'User not found' })
      toUser = u.id
    }

    // Route types
    if (type === 'transfer') {
      const from = req.auth.userId
      const to = toUser
      const amount = body.amount
      const description = body.description || 'Transfer'
      if (!to) return res.status(400).json({ status: 'failed', error: 'Missing recipient' })
      await transactionManager.executeTransaction({ type: 'UserToUser', from, to, amount, description })
    } else if (type === 'superlike') {
      if (!toUser) return res.status(400).json({ status: 'failed', error: 'Missing recipient' })
      await policyEngine.run('like', { fromUser: req.auth.userId, toUser, amount: body.amount, likeType: 'super' })
    } else if (type === 'like') {
      if (!toUser) return res.status(400).json({ status: 'failed', error: 'Missing recipient' })
      await policyEngine.run('like', { fromUser: req.auth.userId, toUser, amount: body.amount, likeType: 'like' })
    } else if (type === 'storePurchase') {
      await policyEngine.run('storePurchase', { fromUser: req.auth.userId, amount: body.amount, assetId: body.assetId })
    } else if (type === 'creatorIncentive') {
      if (!toUser) return res.status(400).json({ status: 'failed', error: 'Missing recipient' })
      await policyEngine.run('creatorIncentive', { toUser, amount: body.amount, reason: body.reason })
    } else if (type === 'gameReward') {
      if (!toUser) return res.status(400).json({ status: 'failed', error: 'Missing recipient' })
      await policyEngine.run('gameReward', { toUser, amount: body.amount })
    } else {
      return res.status(400).json({ status: 'failed', error: 'Unsupported action type' })
    }

    const entries = ledger.getAll()
    const last = entries[entries.length - 1] || null
    try {
      const { serializeEvent } = await import('./transaction-core/event-vault/VaultSerializer.js')
      const eventObj = { eventId: last?.id || crypto.randomUUID(), version: '1.0', type: last?.type || type, status: last?.status || 'success', from: last?.from || req.auth.userId, to: last?.to || toUser || null, amount: last?.amount || body.amount || null, assetId: last?.assetId || body.assetId || null, reason: last?.error || null }
      const serialized = serializeEvent(eventObj)
      globalThis.__eventVaultMem = globalThis.__eventVaultMem || []
      globalThis.__eventVaultMem.push(JSON.parse(serialized))
    } catch(_) {}
    return res.json({ status: 'success', transactionId: last?.id || null, error: null, ledgerEntry: last || null })
  } catch (e) {
    const entries = ledger.getAll()
    const last = entries[entries.length - 1] || null
    return res.status(200).json({ status: 'failed', transactionId: last?.id || null, error: e.message, ledgerEntry: last || null })
  }
})

// Removed API blocker to allow valid API routes

// CSRF token issuer (set cookie early)
app.use((req, res, next) => {
  const existing = req.cookies?.['XSRF-TOKEN'];
  if (!existing) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('XSRF-TOKEN', token, { httpOnly: false, sameSite: 'lax', secure: !!(process.env.NODE_ENV === 'production'), maxAge: 7 * 24 * 60 * 60 * 1000 });
  }
  next();
});
// CSRF protection for unsafe methods
app.use((req, res, next) => {
  const m = (req.method || 'GET').toUpperCase();
  const unsafe = m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
  if (!unsafe) return next();

  // Skip CSRF protection for smoke tests and development
  if (process.env.DISABLE_CSRF === 'true' || process.env.NODE_ENV !== 'production') {
    return next();
  }

  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.['XSRF-TOKEN'];
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ message: 'CSRF validation failed' });
  }
  next();
});
// Serve static files for all services
// Serve CodeBank as static app
app.use('/codebank', express.static(path.join(__dirname, 'codebank'), { 
    maxAge: '1d',
    etag: true,
    lastModified: true 
}));

app.use('/uploads/images', express.static(path.join(__dirname, 'codebank', 'setta', 'server', 'uploads', 'images')))
app.use('/uploads/piccarboon', express.static(path.join(__dirname, 'codebank', 'setta', 'server', 'uploads', 'piccarboon')))

try {
  const dirs = [
    path.join(__dirname, 'codebank', 'setta', 'server', 'uploads', 'images'),
    path.join(__dirname, 'codebank', 'setta', 'server', 'uploads', 'piccarboon'),
    path.join(__dirname, 'codebank', 'setta', 'server', 'uploads', 'piccarboon', 'challenges'),
    path.join(__dirname, 'codebank', 'setta', 'server', 'uploads', 'piccarboon', 'reference'),
    path.join(__dirname, 'codebank', 'setta', 'server', 'uploads', 'piccarboon', 'submissions'),
    path.join(__dirname, 'codebank', 'setta', 'server', 'uploads', 'piccarboon', 'scores'),
    path.join(__dirname, 'codebank', 'setta', 'server', 'uploads', 'piccarboon', 'fraud'),
    path.join(__dirname, 'codebank', 'setta', 'server', 'uploads', 'piccarboon', 'winners'),
    path.join(__dirname, 'codebank', 'setta', 'server', 'uploads', 'piccarboon', 'losers'),
    path.join(__dirname, 'codebank', 'setta', 'server', 'uploads', 'piccarboon', 'sponsor'),
  ]
  for (const d of dirs) fs.ensureDirSync(d)
} catch (_) { }

// Serve /styles/* and /js/* routes for yt-new.html
// removed root /styles and /js static mappings in cleanup phase

// Serve shared modules and codebank assets aliases
app.use('/shared', express.static(path.join(__dirname, 'shared'), {
  maxAge: '1d', etag: true, lastModified: true
}));
app.use('/shared_external', express.static(path.join(__dirname, 'shared_external'), {
  maxAge: '1d', etag: true, lastModified: true
}));
app.use('/nostaglia', express.static(path.join(__dirname, 'services/codebank/nostaglia'), {
  maxAge: '1d', etag: true, lastModified: true
}));
// ensure canonical assets mapping only
app.use('/src', express.static(path.join(__dirname, 'services/codebank/src'), {
  maxAge: '1d', etag: true, lastModified: true
}));

// env.js removed

// Service-specific routes
app.get(['/', '/yt-new-clear.html'], (req, res) => {
  const session = readSessionFromCookie(req);
  if (!session || !session.userId) {
    // [SECURITY] FIX: Clear stale cookie to break client-side redirect loops
    if (req.cookies && req.cookies.session_token) {
      res.clearCookie('session_token', { path: '/' });
    }
    console.log(`[route] ${req.path} → Redirecting to login.html (Session missing)`);
    return res.redirect('/login.html');
  }
  console.log(`[route] ${req.path} → yt-new-clear.html (Session: ${session.userId})`);
  try {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  } catch(_) {}

  res.sendFile(path.join(__dirname, 'yt-new-clear.html'));
});

// [SECURITY] Serve Lifecycle files (Explicitly)
app.get('/main.js', (req, res) => res.sendFile(path.join(__dirname, 'main.js')));
app.get('/core/app-lifecycle.js', (req, res) => res.sendFile(path.join(__dirname, 'core/app-lifecycle.js')));

app.use('/services', express.static(path.join(__dirname, 'services'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));
app.use('/api/trust', trustRouter);

// Alias to serve yt-clear assets under /services/yt-clear/* for CodeBank base href compatibility
app.use('/services/yt-clear', express.static(path.join(__dirname), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath && filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Aliases for YT-Clear static assets
app.use('/js', express.static(path.join(__dirname, 'js'), {
  maxAge: '1d', etag: true, lastModified: true
}));
app.use('/styles', express.static(path.join(__dirname, 'styles'), {
  maxAge: '1d', etag: true, lastModified: true
}));

// Serve root static files
app.use(express.static(path.join(__dirname), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath && filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Service-specific routes

// YT-Clear Default Route
app.get('/yt-coder', (req, res) => {
  res.redirect('/');
});

app.get(['/yt-simple', '/yt-new', '/yt-new.html'], (req, res) => {
  const session = readSessionFromCookie(req);
  if (!session || !session.userId) {
    // [SECURITY] FIX: Clear stale cookie to break client-side redirect loops
    if (req.cookies && req.cookies.session_token) {
      res.clearCookie('session_token', { path: '/' });
    }
    console.log(`[route] ${req.path} → Redirecting to login.html (Session missing)`);
    return res.redirect('/login.html');
  }
  console.log(`[route] ${req.path} → yt-new-clear.html (Session: ${session.userId})`);
  try {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  } catch(_) {}
  res.sendFile(path.join(__dirname, 'yt-new-clear.html'));
});

// Explicit route for canonical file path
app.get('/yt-clear/yt-new-clear.html', (req, res) => {
  console.log('[route] /yt-clear/yt-new-clear.html → yt-new-clear.html');
  try {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  } catch(_) {}
  res.sendFile(path.join(__dirname, 'yt-new-clear.html'));
});


// ------------------------------------------------------------------
// NEW AUTHENTICATION API (NEON BACKED)
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// OFFLINE-FIRST COMPRESSION LOGIC
// ------------------------------------------------------------------

/**
 * Deterministic hash for code compression
 */
function deterministicHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
}

/**
 * Format a hash as a 26-digit code (similar to normal codes)
 */
function formatAsCompressedCode(hash, suffix) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = hash.repeat(4).slice(0, 26);
  // Ensure the suffix is applied
  return s.slice(0, 24) + suffix;
}

/**
 * Perform automatic compression for a user's codes in Neon
 */
async function autoCompressUserCodes(userId) {
  try {
    const client = await pool.connect();

    // 1. Compress Normal -> Silver (100 -> 1)
    const normalRes = await client.query(
      "SELECT id, code FROM codes WHERE user_id = $1 AND type = 'normal' ORDER BY created_at ASC",
      [userId]
    );

    if (normalRes.rows.length >= 100) {
      const batchToCompress = normalRes.rows.slice(0, 100);
      const ids = batchToCompress.map(r => r.id);
      const codes = batchToCompress.map(r => r.code);
      
      const silverHash = deterministicHash(codes.join(''));
      const silverCode = formatAsCompressedCode(silverHash, 'S1'); // S1 suffix for Silver

      await client.query('BEGIN');
      try {
        // Delete original 100 codes
        const placeholders = ids.map(() => '?').join(',');
        await client.query(`DELETE FROM codes WHERE id IN (${placeholders})`, ids);
        // Insert 1 silver bar
        await client.query(
          "INSERT INTO codes (id, user_id, code, type, is_compressed, compressed_at) VALUES ($1, $2, $3, 'silver', 1, CURRENT_TIMESTAMP)",
          [crypto.randomUUID(), userId, silverCode]
        );
        await client.query('COMMIT');
        console.log(`[OK] [COMPRESSION] Compressed 100 normal codes to 1 silver for user ${userId}`);
        
        // Recursive check for silver -> gold
        await autoCompressUserCodes(userId); 
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    }

    // 2. Compress Silver -> Gold (10 -> 1)
    const silverRes = await client.query(
      "SELECT id, code FROM codes WHERE user_id = $1 AND type = 'silver' ORDER BY created_at ASC",
      [userId]
    );

    if (silverRes.rows.length >= 10) {
      const batchToCompress = silverRes.rows.slice(0, 10);
      const ids = batchToCompress.map(r => r.id);
      const codes = batchToCompress.map(r => r.code);
      
      const goldHash = deterministicHash(codes.join(''));
      const goldCode = formatAsCompressedCode(goldHash, 'G1'); // G1 suffix for Gold

      await client.query('BEGIN');
      try {
        // Delete original 10 silver bars
        const placeholders = ids.map(() => '?').join(',');
        await client.query(`DELETE FROM codes WHERE id IN (${placeholders})`, ids);
        // Insert 1 gold bar
        await client.query(
          "INSERT INTO codes (id, user_id, code, type, is_compressed, compressed_at) VALUES ($1, $2, $3, 'gold', 1, CURRENT_TIMESTAMP)",
          [crypto.randomUUID(), userId, goldCode]
        );
        await client.query('COMMIT');
        console.log(`[OK] [COMPRESSION] Compressed 10 silver codes to 1 gold for user ${userId}`);
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    }
  } catch (err) {
    console.error('[ERROR] [COMPRESSION ERROR]', err.message);
  }
}

// ------------------------------------------------------------------
// SERVER-AUTHORITATIVE DELTA SYNC API
// ------------------------------------------------------------------


// ================================================================
// [FIX] POST /api/sync/restore-codes
// Accepts an array of code objects from IndexedDB and inserts them
// into the codes table (de-duplicated). Keeps codes_count in sync.
// Used to restore codes that were stored in IndexedDB but not on server.
// ================================================================
app.post('/api/sync/restore-codes', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { codes: incomingCodes } = req.body || {};

    if (!Array.isArray(incomingCodes) || incomingCodes.length === 0) {
      return res.status(400).json({ success: false, error: 'codes array required' });
    }

    // Safety cap: max 500 codes per restore call
    const toRestore = incomingCodes.slice(0, 500);

    // Get existing code strings for this user to avoid duplicates
    const existingRes = await query(
      "SELECT code FROM codes WHERE user_id = $1",
      [userId]
    );
    const existingSet = new Set(existingRes.rows.map(r => r.code));

    let inserted = 0;
    let skipped = 0;

    for (const entry of toRestore) {
      const codeStr = entry.code || entry;
      if (typeof codeStr !== 'string' || !codeStr.trim()) { skipped++; continue; }
      if (existingSet.has(codeStr)) { skipped++; continue; }

      const assetType = entry.type || entry.assetType || 'codes';
      const createdAt = entry.createdAt || entry.created_at || null;

      try {
        await query(
          "INSERT INTO codes (id, user_id, code, type, created_at) VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_TIMESTAMP))",
          [crypto.randomUUID(), userId, codeStr, assetType, createdAt]
        );
        existingSet.add(codeStr);
        inserted++;
      } catch(e) {
        if (!e.message.includes('UNIQUE')) {
          console.error('[RESTORE] insert error:', e.message);
        }
        skipped++;
      }
    }

    // Recalculate and fix codes_count
    const countRes = await query(
      "SELECT COUNT(*) as cnt FROM codes WHERE user_id = $1 AND spent = 0",
      [userId]
    );
    const newCount = Number(countRes.rows[0]?.cnt || 0);
    await query(
      "UPDATE users SET codes_count = $1, last_sync_at = CURRENT_TIMESTAMP WHERE id = $2",
      [newCount, userId]
    );

    console.log(`[RESTORE] user=${userId} inserted=${inserted} skipped=${skipped} total_server=${newCount}`);
    return res.json({
      success: true,
      inserted,
      skipped,
      total_server: newCount
    });
  } catch(e) {
    console.error('[RESTORE ERROR]', e.message);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
});

app.post('/api/sync', requireAuth, async (req, res) => {
  try {
    const { delta_codes, delta_silver, delta_gold, sync_id } = req.body || {}
    const userId = req.user.id;

    console.log(`[SYNC REQUEST] User: ${userId}, SyncID: ${sync_id}, Deltas: C:${delta_codes} S:${delta_silver} G:${delta_gold}`);

    if (!sync_id) return res.status(400).json({ status: 'failed', error: 'Missing sync_id' });

    // 1. Idempotency Check
    const existingEvent = await client.query('SELECT id FROM sync_events WHERE id = $1', [sync_id]);
    if (existingEvent.rows.length > 0) {
      console.log(`[SYNC DUPLICATE] SyncID ${sync_id} already applied. Returning current balance.`);
      const balanceRes = await client.query('SELECT codes_count, silver_count, gold_count FROM users WHERE id = $1', [userId]);
      const row = balanceRes.rows[0] || { codes_count: 0, silver_count: 0, gold_count: 0 };
      return res.json({ 
        status: 'success', 
        synced_at: Date.now(),
        codes: Number(row.codes_count),
        silver: Number(row.silver_count),
        gold: Number(row.gold_count)
      });
    }

    // 2. Validate Delta Limits (Prevent Exploit)
    const d_codes = Number(delta_codes || 0);
    const d_silver = Number(delta_silver || 0);
    const d_gold = Number(delta_gold || 0);

    if (d_codes > 100 || d_silver > 20 || d_gold > 10) {
      console.warn(`[SYNC REJECTED] Delta limits exceeded for user ${userId}`);
      return res.status(400).json({ status: 'failed', error: 'Delta limits exceeded' });
    }
    
    if (d_codes < 0 || d_silver < 0 || d_gold < 0) {
      return res.status(400).json({ status: 'failed', error: 'Negative deltas not allowed' });
    }

    console.log(`[SYNC VALIDATED] User: ${userId}, Deltas approved.`);

    // 3. Atomic Transaction: Record Event + Update Balances
    await client.query('BEGIN');
    try {
      // Store sync event for idempotency
      await client.query(
        "INSERT INTO sync_events (id, user_id, delta_codes, delta_silver, delta_gold) VALUES ($1, $2, $3, $4, $5)",
        [sync_id, userId, d_codes, d_silver, d_gold]
      );

      // Update user balances using deltas (Server-Authoritative)
      const updateRes = await client.query(
        "UPDATE users SET codes_count = COALESCE(codes_count, 0) + $1, silver_count = COALESCE(silver_count, 0) + $2, gold_count = COALESCE(gold_count, 0) + $3, last_sync_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING codes_count, silver_count, gold_count",
        [d_codes, d_silver, d_gold, userId]
      );

      // [SECURITY] Also update the 'balances' table to stay in sync
      await client.query(
        "INSERT INTO balances (user_id, codes_count, silver_count, gold_count, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) ON CONFLICT (user_id) DO UPDATE SET codes_count = codes_count + EXCLUDED.codes_count, silver_count = silver_count + EXCLUDED.silver_count, gold_count = gold_count + EXCLUDED.gold_count, updated_at = CURRENT_TIMESTAMP",
        [userId, d_codes, d_silver, d_gold]
      );

      // [SECURITY] RECORD IN LEDGER: So items show up in the SafeCode list
      if (d_codes > 0) {
        await client.query(
          "INSERT INTO ledger (tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1, $2, 'credit', 'codes', $3, 'sync')",
          [crypto.randomUUID(), userId, d_codes]
        );
        // [FIX] Insert actual code rows so codes table matches the counter
        // (caller should prefer /api/sync/restore-codes with real code strings)
        // Only insert synthetic rows if codes array not provided
        if (!req.body.codes || !Array.isArray(req.body.codes)) {
          for (let i = 0; i < d_codes; i++) {
            try {
              await client.query(
                "INSERT INTO codes (id, user_id, code, type, created_at) VALUES ($1, $2, $3, 'codes', CURRENT_TIMESTAMP)",
                [crypto.randomUUID(), userId, `SYNC-${Date.now()}-${i}`]
              );
            } catch(_) {}
          }
        }
      }
      if (d_silver > 0) {
        await client.query(
          "INSERT INTO ledger (tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1, $2, 'credit', 'silver', $3, 'sync')",
          [crypto.randomUUID(), userId, d_silver]
        );
      }
      if (d_gold > 0) {
        await client.query(
          "INSERT INTO ledger (tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1, $2, 'credit', 'gold', $3, 'sync')",
          [crypto.randomUUID(), userId, d_gold]
        );
      }
      
      await client.query('COMMIT');
      
      const row = updateRes.rows[0] || { codes_count: 0, silver_count: 0, gold_count: 0 };
      console.log(`[SYNC APPLIED] User ${userId} new counts: codes=${row.codes_count}, silver=${row.silver_count}, gold=${row.gold_count}`);

      return res.json({ 
        status: 'success', 
        synced_at: Date.now(),
        codes: Number(row.codes_count),
        silver: Number(row.silver_count),
        gold: Number(row.gold_count)
      });

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }

    return res.json({ status: 'success', synced_at: Date.now() });
  } catch (err) {
    console.error('[ALERT] [SYNC ERROR]:', err);
    return res.status(500).json({ status: 'failed', error: err.message });
  }
});

app.get('/api/ledger/verify', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(
      "SELECT COALESCE(codes_count, 0) as codes, COALESCE(silver_count, 0) as silver, COALESCE(gold_count, 0) as gold FROM users WHERE id = $1",
      [userId]
    );
    const row = result.rows[0] || { codes: 0, silver: 0, gold: 0 };
    return res.json({
      codes: Number(row.codes),
      silver: Number(row.silver),
      gold: Number(row.gold)
    });
  } catch (err) {
    console.error('[LEDGER VERIFY ERROR]', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});


// Assets API (Read Only)
app.get('/api/assets/balance', requireAuth, async (req, res) => {
  try {
    const balances = await AssetReadonly.getAllBalances(req.user.id);
    res.json(balances);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// YT-Clear routes
app.get(['/yt-clear', '/yt-clear/yt-new-clear.html'], (req, res) => {
  const session = readSessionFromCookie(req);
  if (!session || !session.userId) {
    // [SECURITY] FIX: Clear stale cookie to break client-side redirect loops
    if (req.cookies && req.cookies.session_token) {
      res.clearCookie('session_token', { path: '/' });
    }
    console.log(`[route] ${req.path} → Redirecting to login.html`);
    return res.redirect('/login.html');
  }
  console.log(`[route] ${req.path} → yt-new-clear.html`);
  res.sendFile(path.join(__dirname, 'yt-new-clear.html'));
});

// YT-New-Modular routes
app.get('/yt-new-modular', (req, res) => {
  console.log('[route] /yt-new-modular → yt-new-modular.html');
  res.sendFile(path.join(__dirname, 'yt-new-modular/yt-new-modular.html'));
});
app.get('/yt-new-modular/yt-new-modular.html', (req, res) => {
  console.log('[route] /yt-new-modular/yt-new-modular.html → yt-new-modular.html');
  res.sendFile(path.join(__dirname, 'yt-new-modular/yt-new-modular.html'));
});

// AUTH REMOVED — CLEAN RESET

// CodeBank routes
// CodeBank SPA routes - serve indexCB.html for all other routes
app.get('/codebank/', (req, res) => {
  res.sendFile(path.join(__dirname, 'codebank/indexCB.html'));
});
app.get('/codebank/*', (req, res) => {
  // If the request is for a static file that doesn't exist, serve indexCB.html
  const url = req.originalUrl;
  if (url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.status(404).send('Not Found');
  } else {
    res.sendFile(path.join(__dirname, 'codebank/indexCB.html'));
  }
});

// Pebalaash static assets (built)
app.use('/codebank/pebalaash', express.static(path.join(__dirname, 'codebank/pebalaash/dist/public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}))

// Legacy placeholder endpoints removed; unified API provides real implementations

// Samma3ny static files
app.use('/samma3ny', express.static(path.join(__dirname, 'codebank/samma3ny'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Samma3ny routes
app.get('/samma3ny', (req, res) => {
  res.sendFile(path.join(__dirname, 'codebank/samma3ny/index.html'));
});

// Farragna routes - serve React app
app.use('/farragna', express.static(path.join(__dirname, 'services/codebank/farragna/dist'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));
app.get('/farragna/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'services/codebank/farragna/dist/index.html'));
});

// E7ki! routes
app.get('/e7ki', (req, res) => {
  res.sendFile(path.join(__dirname, 'services/codebank/e7ki/frontend/build/index.html'));
});

// Serve E7ki! static files
app.use('/e7ki/static', express.static(path.join(__dirname, 'services/codebank/e7ki/frontend/build/static'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// OneWorld routes
app.get('/oneworld', (req, res) => {
  res.sendFile(path.join(__dirname, 'services/codebank/oneworld/index.html'));
});

// Community routes
app.get('/community', (req, res) => {
  res.sendFile(path.join(__dirname, 'services/codebank/community/index.html'));
});

// Games Centre routes
// Serve Games Centre static assets
// Games Centre removed in cleanup phase

const nostagliaClients = new Set();
function nostagliaBroadcast(event, payload) {
  const data = `event: ${event}\n` + `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of nostagliaClients) {
    try { res.write(data); } catch (e) { }
  }
}
// AUTH REMOVED — CLEAN RESET

let nostagliaStore = {
  uploads: [],
  reactions: new Map(),
  comments: new Map(),
  shares: new Map(),
  cycles: [],
};

// AUTH REMOVED — CLEAN RESET

// AUTH REMOVED — CLEAN RESET

// AUTH REMOVED — CLEAN RESET

function isAdmin(req) {
  const roles = req.user?.roles || [];
  return roles.includes('admin') || req.user?.id === 'admin';
}

// AUTH REMOVED — CLEAN RESET
// AUTH REMOVED — CLEAN RESET
// AUTH REMOVED — CLEAN RESET
// AUTH REMOVED — CLEAN RESET

function adjustCodes(userId, delta) {
  // LEGACY MUTATION REMOVED
  console.warn('Attempted legacy adjustCodes call. Ignored.');
}

// AUTH REMOVED — CLEAN RESET

// AUTH REMOVED — CLEAN RESET
// AUTH REMOVED — CLEAN RESET

// AUTH REMOVED — CLEAN RESET

// AUTH REMOVED — CLEAN RESET
// AUTH REMOVED — CLEAN RESET

// Login route
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Public health/version endpoints
app.get('/api/health', (req, res) => { res.status(404).end() });
app.get('/api/reconcile', (req, res) => {
  // [SECURITY] HOLE 7 FIX: Remove dangerous client-authoritative reconciliation
  return res.status(403).json({ status: 'failed', error: 'dangerous_operation_blocked', message: 'Client cannot send ledger values to server.' });
});

// Core API endpoints for yt-new integrations
app.get('/api/user-assets', (req, res, next) => {
  return next();
});

app.get('/api/youtube/status', (req, res) => { res.status(404).end() });

// Session endpoint bound to Neon users.id (UUID) via Clerk session
app.get('/api/auth/session', (req, res) => { res.status(404).end() })

// Neon-backed API routes
app.get('/api/users/:id', (req, res) => { res.status(404).end() })

app.get('/api/user-assets', (req, res) => { res.status(404).end() })

app.get('/api/rewards/balance', requireAuth, async (req, res) => {
  try {
    const session = readSessionFromCookie(req);
    if (!session || !session.userId) return res.status(401).json({ error: 'unauthorized' });

    const { userId } = session;
    
    if (process.env.DATABASE_URL) {
      // [SECURITY] ARCHITECTURE ALIGNMENT: Fetch counts only from users table
      const result = await dbQuery(
        "SELECT COALESCE(codes_count, 0) as codes, COALESCE(silver_count, 0) as silver, COALESCE(gold_count, 0) as gold FROM users WHERE id = $1::uuid",
        [userId]
      );
      
      const row = result.rows[0] || { codes: 0, silver: 0, gold: 0 };

      return res.json({
        codes: Number(row.codes),
        silver: Number(row.silver),
        gold: Number(row.gold),
        likes: 0,
        superlikes: 0,
        games: 0,
        transactions: 0,
        updatedAt: Date.now(),
        last_updated: Date.now()
      });
    }

    return res.json({ codes: 0, silver: 0, gold: 0, likes: 0, updatedAt: Date.now() });
  } catch (err) {
    console.error('[REWARDS BALANCE ERROR]', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/api/rewards', (req, res) => { res.status(404).end() })

app.post('/api/telemetry', (req, res) => {
  try { console.error('[SIGNAL] TELEMETRY', req.body) } catch (_) { }
  res.sendStatus(204)
})

app.post('/api/balloon/pop', async (req, res) => {
  try {
    const body = req.body || {}
    const p = Number(body.points || 0)
    const ts = Number(body.timestamp || Date.now())
    let uid = (body.userId || '').toString().trim()
    if (!uid) {
      const s = readSessionFromCookie(req)
      if (s && s.userId) uid = s.userId
    }
    if (!uid) return res.status(401).json({ ok: false, error: 'unauthorized' })
    if (!Number.isFinite(p) || p < 0 || p > 25) return res.status(400).json({ ok: false, error: 'invalid_points' })
    if (!Number.isFinite(ts) || (Date.now() - ts) > 5 * 60 * 1000) return res.status(400).json({ ok: false, error: 'invalid_timestamp' })
    global.__balloonClicks = global.__balloonClicks || new Map()
    const now = Date.now()
    const list = global.__balloonClicks.get(uid) || []
    const recent = list.filter(t => now - t < 60 * 1000)
    if (recent.length >= 20) return res.status(429).json({ ok: false, error: 'rate_limit' })
    recent.push(now)
    global.__balloonClicks.set(uid, recent)
    try { console.log('[BALLOON POP]', { userId: uid, points: p }) } catch (_){}
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'internal_error' })
  }
})

// Neon codes persistence endpoint
app.post('/api/sqlite/codes', async (req, res) => {
  try {
    const { code } = req.body || {};
    const session = readSessionFromCookie(req);

    if (!session || !session.userId) {
      return res.status(401).json({ success: false, error: 'unauthorized' });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'code_required' });
    }

    // 1. Validate Code Format: xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-Pn
    const codePattern = /^([A-Z0-9]{4}-){6}P\d$/;
    if (!codePattern.test(code)) {
      console.warn(`[CLAIM REJECTED] Invalid code format: ${code}`);
      return res.status(400).json({ success: false, error: 'invalid_code_format' });
    }

    // 2. Prevent Double Spend using SHA256 Hash
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    const userId = session.userId;

    await query('BEGIN');
    try {
      // Check if hash already used
      const used = await query("INSERT INTO used_codes (code_hash, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [hash, userId]);
      if (used.rowCount === 0) {
        console.warn(`[CLAIM REJECTED] Code already claimed (hash collision or duplicate): ${hash.slice(0, 8)}...`);
        await query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'code_already_claimed' });
      }

      // 3. Update Balance (Counts only)
      await query(
        "UPDATE users SET codes_count = COALESCE(codes_count, 0) + 1, last_sync_at = NOW() WHERE id = $1::uuid",
        [userId]
      );

      // [SECURITY] ARCHITECTURE FIX: Actually persist the code string to the codes table
      // This ensures the GET /api/sqlite/codes endpoint can return the actual codes
      await query(
        "INSERT INTO codes (id, user_id, code, type, created_at) VALUES ($1, $2, $3, 'codes', CURRENT_TIMESTAMP)",
        [crypto.randomUUID(), userId, code]
      );

      // 4. Record in Ledger
      await query(
        "INSERT INTO ledger (tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1, $2, 'credit', 'codes', 1, 'claim')",
        [crypto.randomUUID(), userId]
      );

      await query('COMMIT');
      return res.json({ success: true });
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[CLAIM ERROR]', err);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
});


// GET /api/sqlite/codes — returns user's codes from DB
// Called by bankode-core.js and yt-new-clear.html
app.get('/api/sqlite/codes', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch counts from users table
    const userRes = await query(
      "SELECT COALESCE(codes_count, 0) as count, COALESCE(silver_count, 0) as silver, COALESCE(gold_count, 0) as gold FROM users WHERE id = $1",
      [userId]
    );
    const userRow = userRes.rows[0] || { count: 0, silver: 0, gold: 0 };

    // Fetch actual codes from codes table
    const codesRes = await query(
      "SELECT code, type, created_at FROM codes WHERE user_id = $1 AND spent = 0 ORDER BY created_at DESC",
      [userId]
    );

    // [FIX] Use live count from actual codes table (not stale counter)
    const liveCount = codesRes.rows.length;
    // Auto-heal: keep codes_count in sync with reality
    if (Number(userRow.count) !== liveCount) {
      try {
        await query("UPDATE users SET codes_count = $1 WHERE id = $2", [liveCount, userId]);
      } catch(_) {}
    }
    return res.json({
      success: true,
      status: 'success',
      count: liveCount,
      silver_count: Number(userRow.silver),
      gold_count: Number(userRow.gold),
      codes: codesRes.rows,
      rows: codesRes.rows,
      latest: codesRes.rows.length > 0 ? codesRes.rows[0].code : null
    });
  } catch (e) {
    console.error('[API] GET /api/sqlite/codes error:', e.message);
    return res.status(500).json({
      success: false,
      status: 'failed',
      error: 'internal_error'
    });
  }
});

// AUTHORITATIVE CODES RETRIEVAL
app.get('/api/codes/list', requireAuth, async (req, res) => { 
  try { 
    const userId = req.user.id;

    // [SECURITY] ARCHITECTURE RESTORATION: Return actual codes for SafeCode rendering
    const userRes = await query(
      "SELECT COALESCE(codes_count, 0) as count, COALESCE(silver_count, 0) as silver, COALESCE(gold_count, 0) as gold FROM users WHERE id = $1",
      [userId]
    );
    const userRow = userRes.rows[0] || { count: 0, silver: 0, gold: 0 };
    
    // Fetch actual codes from codes table
    const codesRes = await query(
      "SELECT code, type, created_at FROM codes WHERE user_id = $1 AND spent = 0 ORDER BY created_at DESC",
      [userId]
    );
    
    const allCodes = codesRes.rows.map(r => r.code);
    const silverCodes = codesRes.rows.filter(r => r.type === 'silver').map(r => r.code);
    const goldCodes = codesRes.rows.filter(r => r.type === 'gold').map(r => r.code);

    return res.json({
      success: true,
      status: 'success',
      count: Number(userRow.count),
      silver_count: Number(userRow.silver),
      gold_count: Number(userRow.gold),
      codes: codesRes.rows, // Return full objects for storage adapter
      rows: codesRes.rows, // For legacy compatibility
      latest: allCodes.length > 0 ? allCodes[0] : null
    });

  } catch (e) { 
    console.error('[API CODES ERROR]', e);
    return res.status(500).json({ 
      success: false,
      status: 'failed', 
      error: 'internal_error' 
    }); 
  } 
}); 

import WatchdogAI from './services/watchdog-ai.js';

// PRODUCTION-GRADE UNIFIED TRANSFER ENDPOINT
const transferLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 transfers per user/IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (_req, res) => {
    res.status(429).json({ success: false, error: 'TRANSFER_RATE_LIMIT_EXCEEDED' })
  }
});

app.post('/api/transfer', requireAuth, transferLimiter, enforceFinancialSecurity, async (req, res) => {
  const client = await pool.connect();
  const { transactionId, receiverEmail, codes, type } = req.body || {};
  const fromUserId = req.user.id;
  const assetType = type || 'codes';
  const amount = Array.isArray(codes) ? codes.length : 0;

  // 1. HARD VALIDATION: AUTH STATUS
  if (!req.user || !req.user.id) {
    console.error(`[AUDIT] [FAIL] [UNAUTHENTICATED] attempt from IP: ${req.ip}`);
    return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', status: 'unauthenticated' });
  }

  if (!transactionId) return res.status(400).json({ success: false, error: 'MISSING_TRANSACTION_ID' });
  if (!receiverEmail) return res.status(400).json({ success: false, error: 'MISSING_RECEIVER' });
  if (amount <= 0) return res.status(400).json({ success: false, error: 'NO_ASSETS_PROVIDED' });

  // [SECURITY] STEP 0: WATCHDOG AI RISK ANALYSIS
  const riskAnalysis = WatchdogAI.evaluateRisk(fromUserId);
  if (riskAnalysis.decision !== 'ALLOW') {
    console.warn(`[AUDIT] [WATCHDOG_BLOCK] user=${fromUserId} | decision=${riskAnalysis.decision} | reason=${riskAnalysis.reasons}`);
    return res.status(403).json({ 
      success: false, 
      error: 'SECURITY_RESTRICTION', 
      decision: riskAnalysis.decision, 
      message: riskAnalysis.decision === 'FREEZE' ? 'Your account is temporarily in a cool-down period. Please wait a few minutes.' : 'Your request was flagged for security review.'
    });
  }

  try {
    // [FIX] Try DB first, fall back to in-memory users if not found
    let receiver = await sqliteFindUserByEmail(receiverEmail);
    if (!receiver || !receiver.id) {
      receiver = memFindUserByEmail(receiverEmail);
    }
    if (!receiver || !receiver.id) {
      console.warn(`[AUDIT] [FAIL] [RECEIVER_NOT_FOUND] sender=${fromUserId} receiverEmail=${receiverEmail}`);
      return res.status(404).json({ success: false, error: 'RECEIVER_NOT_FOUND' });
    }
    const toUserId = receiver.id;

    if (fromUserId === toUserId) {
      console.warn(`[AUDIT] [FRAUD_FLAG] [SELF_TRANSFER] user=${fromUserId}`);
      return res.status(400).json({ success: false, error: 'SELF_TRANSFER_FORBIDDEN' });
    }

    const balanceField = assetType === 'silver' ? 'silver_count' : (assetType === 'gold' ? 'gold_count' : 'codes_count');

    // 2. ATOMIC LOCKING & TRANSACTION
    await client.query('BEGIN');
    try {
      // [SECURITY] STEP 1: IDEMPOTENCY BINDING (Inside transaction)
      const idempRes = await client.query(
        "INSERT INTO processed_transactions (tx_id) VALUES ($1) ON CONFLICT DO NOTHING",
        [transactionId]
      );
      
      if (idempRes.rowCount === 0) {
        await client.query('ROLLBACK');
        console.log(`[AUDIT] [IDEMPOTENCY] Transaction ${transactionId} already processed.`);
        return res.json({ success: true, message: 'ALREADY_PROCESSED', txId: transactionId });
      }

      // [SECURITY] STEP 2: PRE-TRANSACTION BALANCE SNAPSHOT
      // FIX: For 'codes' type, use live COUNT from codes table (users.codes_count is denormalized and can be stale)
      let senderPre, receiverPre;
      if (assetType === 'codes') {
        const senderCountRes = await client.query(
          "SELECT COUNT(*) AS cnt FROM codes WHERE user_id = $1 AND spent = 0",
          [fromUserId]
        );
        senderPre = parseInt(senderCountRes.rows[0]?.cnt || 0, 10);
        const receiverCountRes = await client.query(
          "SELECT COUNT(*) AS cnt FROM codes WHERE user_id = $1 AND spent = 0",
          [toUserId]
        );
        receiverPre = parseInt(receiverCountRes.rows[0]?.cnt || 0, 10);
      } else {
        const preSnapshot = await client.query(
          `SELECT id, ${balanceField} FROM users WHERE id IN ($1, $2)`,
          [fromUserId, toUserId]
        );
        senderPre = preSnapshot.rows.find(r => r.id === fromUserId)?.[balanceField] || 0;
        receiverPre = preSnapshot.rows.find(r => r.id === toUserId)?.[balanceField] || 0;
      }

      if (senderPre < amount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // [SECURITY] STEP 3: OWNERSHIP TRANSFER
      if (assetType === 'codes') {
        let transferredCount = 0;
        for (const code of codes) {
          const transferRes = await client.query(
            "UPDATE codes SET user_id = $1, created_at = CURRENT_TIMESTAMP WHERE code = $2 AND user_id = $3 AND spent = 0",
            [toUserId, code, fromUserId]
          );

          if (transferRes.rowCount === 0) {
            throw new Error(`OWNERSHIP_FAILED_OR_CODE_SPENT: ${code}`);
          }
          transferredCount++;
        }

        if (transferredCount !== amount) {
          throw new Error(`TRANSFER_COUNT_MISMATCH: Expected ${amount}, got ${transferredCount}`);
        }
      }

      // [SECURITY] STEP 4: BALANCE UPDATES
      // FIX: For 'codes' type, recount from codes table (STEP 3 already transferred ownership rows)
      let senderBalanceRes;
      if (assetType === 'codes') {
        senderBalanceRes = await client.query(
          "UPDATE users SET codes_count = (SELECT COUNT(*) FROM codes WHERE user_id = $1 AND spent = 0) WHERE id = $2 RETURNING codes_count",
          [fromUserId, fromUserId]
        );
      } else {
        senderBalanceRes = await client.query(
          `UPDATE users SET ${balanceField} = ${balanceField} - $1 WHERE id = $2 AND ${balanceField} >= $1 RETURNING ${balanceField}`,
          [amount, fromUserId]
        );
      }

      if (senderBalanceRes.rows.length === 0) {
        throw new Error('INSUFFICIENT_BALANCE_DURING_UPDATE');
      }

      let receiverUpdateRes;
      if (assetType === 'codes') {
        receiverUpdateRes = await client.query(
          "UPDATE users SET codes_count = (SELECT COUNT(*) FROM codes WHERE user_id = $1 AND spent = 0) WHERE id = $2",
          [toUserId, toUserId]
        );
      } else {
        receiverUpdateRes = await client.query(
          `UPDATE users SET ${balanceField} = COALESCE(${balanceField}, 0) + $1 WHERE id = $2`,
          [amount, toUserId]
        );
      }

      if (receiverUpdateRes.rowCount === 0) {
        throw new Error('RECEIVER_BALANCE_UPDATE_FAILED');
      }

      // [SECURITY] STEP 5: POST-TRANSACTION SNAPSHOT VERIFICATION
      // FIX: For 'codes' type, verify using live COUNT from codes table
      let senderPost, receiverPost;
      if (assetType === 'codes') {
        const senderPostRes = await client.query(
          "SELECT COUNT(*) AS cnt FROM codes WHERE user_id = $1 AND spent = 0",
          [fromUserId]
        );
        senderPost = parseInt(senderPostRes.rows[0]?.cnt || 0, 10);
        const receiverPostRes = await client.query(
          "SELECT COUNT(*) AS cnt FROM codes WHERE user_id = $1 AND spent = 0",
          [toUserId]
        );
        receiverPost = parseInt(receiverPostRes.rows[0]?.cnt || 0, 10);
      } else {
        const postSnapshot = await client.query(
          `SELECT id, ${balanceField} FROM users WHERE id IN ($1, $2)`,
          [fromUserId, toUserId]
        );
        senderPost = postSnapshot.rows.find(r => r.id === fromUserId)?.[balanceField] || 0;
        receiverPost = postSnapshot.rows.find(r => r.id === toUserId)?.[balanceField] || 0;
      }

      if (senderPost !== (senderPre - amount) || receiverPost !== (receiverPre + amount)) {
        console.error(`[AUDIT] [FRAUD_FLAG] [BALANCE_MISMATCH] txId=${transactionId} senderPre=${senderPre} senderPost=${senderPost} receiverPre=${receiverPre} receiverPost=${receiverPost} amount=${amount}`);
        throw new Error('BALANCE_INTEGRITY_VIOLATION');
      }

      // [SECURITY] STEP 6: RECORD LEDGER
      await client.query(
        "INSERT INTO ledger (tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1, $2, 'debit', $3, $4, 'transfer_out')",
        [transactionId, fromUserId, assetType, amount]
      );
      await client.query(
        "INSERT INTO ledger (tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1, $2, 'credit', $3, $4, 'transfer_in')",
        [transactionId, toUserId, assetType, amount]
      );

      await client.query('COMMIT');
      
      // [SECURITY] WATCHDOG AI SUCCESS TRACKING
      WatchdogAI.trackSuccess(fromUserId, 'TRANSFER');
      
      console.log(`[AUDIT] [SUCCESS] txId=${transactionId} | sender=${fromUserId} | receiver=${toUserId} | amount=${amount} | asset=${assetType}`);
      
      return res.json({ 
        success: true, 
        txId: transactionId, 
        amount, 
        newBalance: Number(senderPost) 
      });

    } catch (txError) {
      await client.query('ROLLBACK');
      
      // [SECURITY] WATCHDOG AI FAILURE TRACKING
      WatchdogAI.trackFailure(fromUserId, txError.message);
      
      console.error(`[AUDIT] [FAIL] txId=${transactionId} | error=${txError.message}`);
      return res.status(400).json({ success: false, error: txError.message });
    }

  } catch (err) {
    console.error(`[AUDIT] [FAIL] [SYSTEM_ERROR] txId=${transactionId} | error=${err.message}`);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  } finally {
    client.release();
  }
});

// Admin-only manual deposit endpoint
app.post('/api/admin/deposit', async (req, res) => {
  try {
    const session = readSessionFromCookie(req);
    let authEmail = null;
    try {
      const h = req.headers && req.headers.authorization || '';
      const parts = h.split(' ');
      if (parts[0] === 'Bearer' && parts[1]) {
        const decoded = jwt.verify(parts[1], JWT_SECRET);
        authEmail = decoded && decoded.email || null;
      }
    } catch(err) { 
      console.error('[AUTH] JWT decode error:', err)
      authEmail = null; 
    }
    if (!session && !authEmail) return res.status(401).json({ ok: false, error: 'unauthorized' });
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
    const isDev = String(process.env.NODE_ENV||'development') !== 'production';
    const allowDev = isDev && (process.env.DEV_ALLOW_ADMIN_DEPOSIT === '1' || adminEmails.length === 0);
    const isAdmin = !!(allowDev || (session && (session.isAdmin || session.role === 'dev' || (session.email && adminEmails.includes(String(session.email).toLowerCase())))) || (authEmail && adminEmails.includes(String(authEmail).toLowerCase())));
    if (!isAdmin) return res.status(403).json({ ok: false, error: 'forbidden' });

    const { email, code, type, amount } = req.body || {};
    if (!email || !code || !type || !amount) return res.status(400).json({ ok: false, error: 'missing_fields' });
    const t = String(type);
    const kind = (t==='silver' || t==='gold') ? t : 'codes';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const u = await client.query('SELECT id FROM users WHERE email=$1 LIMIT 1', [String(email).trim()]);
      if (!u.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ ok: false, error: 'user_not_found' }); }
      const userId = u.rows[0].id;

      // Ensure type column exists
      try { 
        const tableInfo = await client.query("PRAGMA table_info(codes)", [], { silent: true });
        const hasTypeCol = tableInfo.rows.some(row => {
          const name = (typeof row === 'object' && row !== null) ? (row.name || row[1] || '') : '';
          return name.toLowerCase() === 'type';
        });
        if (!hasTypeCol) {
          await client.query("ALTER TABLE codes ADD COLUMN type VARCHAR(20) DEFAULT 'codes'", [], { silent: true });
        }
      } catch(e){
        if (!e.message.includes('duplicate column name') && !e.message.includes('ENOTFOUND')) {
          console.error('[DB] Failed to ensure type column in codes:', e.message);
        }
      }

      // Attempt N inserts; unique(code) prevents duplicates
      const amt = Math.max(1, parseInt(amount, 10) || 1);
      const ins = await client.query(
        "INSERT INTO codes (id, user_id, code, type, created_at, generated_at, next_at, meta) " +
        "VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $5) ON CONFLICT (code) DO NOTHING",
        [crypto.randomUUID(), userId, String(code).trim(), kind, JSON.stringify({ from_admin: true })]
      );

      await client.query('COMMIT');
      try {
        if (wss) {
          const count = Math.max(1, parseInt(amt, 10) || 1);
          const codesPayload = Array(count).fill(String(code).trim());
          const payload = { type: 'CODES_RECEIVED', codes: codesPayload, assetType: kind, from_admin: true, to: userId, timestamp: Date.now() };
          if (typeof wss.__emitToUser === 'function') {
            wss.__emitToUser(userId, payload);
          } else if (wss.clients) {
            const s = JSON.stringify(payload);
            wss.clients.forEach(ws => { try { if (ws && ws.readyState === 1 && ws.userId === String(userId)) ws.send(s); } catch(_){} });
          }
        }
      } catch(_){ }
      
      // Get updated balances for immediate UI update
      const balancesRes = await client.query(
        "SELECT asset_type, SUM(amount) AS total FROM balance_projection WHERE user_id=$1 GROUP BY asset_type ORDER BY asset_type ASC",
        [userId]
      );
      const balances = {};
      for (const row of balancesRes.rows) {
        const key = row.asset_type === 'codebank' ? 'codes' : row.asset_type;
        balances[key] = typeof row.total === 'number' ? row.total : 0;
      }
      
      return res.json({ 
        ok: true, 
        inserted: ins.rowCount || 0, 
        userId, 
        type: kind,
        balances: balances
      });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch(_){ }
      try { console.error('[Admin Deposit]', e); } catch(_){ }
      return res.status(500).json({ ok: false, error: e && e.message || 'deposit_failed' });
    } finally {
      try { client.release(); } catch(_){ }
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e && e.message || 'internal_error' });
  }
});

app.get('/api/sqlite/diag', async (req, res) => {
    try {
      const tables = ['users','codes','ledger','rewards','events','transactions','vault'];
      const columns = [];
      for (const t of tables) {
        try {
          const { rows } = await query(`PRAGMA table_info(${t})`);
          rows.forEach(r => columns.push({ column_name: r.name, table_name: t }));
        } catch (_) {}
      }
      return res.json({ status: 'success', columns, foreign_keys: [] })
    } catch (e) {
      return res.status(500).json({ status: 'failed', error: e && e.message })
    }
})

// Watch-Dog Guardian API Endpoints
// [SECURITY] PROTECTOR: Enforcer | Gatekeeper | Security Layer

// Tables initialization - disabled due to startup crashes
// Tables will be created on first API call instead
console.log('[INIT] Tables will be created on first use')

// WatchDog routes registered via app.use('/api/watchdog', watchdogRoutes) in main init section

// POST /api/watchdog/feed - Feed the watchdog (costs 10 codes) - Enhanced Security
app.post('/api/watchdog/feed', requireAuth, enforceFinancialSecurity, async (req, res) => {
  try {
    const userId = req.user && req.user.id
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' })
    
    // Get idempotency key from request
    const idempotencyKey = req.headers['x-idempotency-key'] || req.body.idempotencyKey || null
    
    // Use enhanced Watch-Dog Guardian feed function
    const result = await feedWatchDog(userId, idempotencyKey)
    
    // Store idempotency response if key was provided
    if (idempotencyKey && result.success) {
      storeIdempotencyResponse(userId, idempotencyKey, result)
    }
    
    if (result.success) {
      console.log(`[WATCHDOG] [OK] Dog fed for user ${userId}, cost: ${result.cost} codes`)
      return res.json({ 
        success: true, 
        cost: result.cost, 
        newBalance: result.newBalance,
        dogState: result.dogState,
        idempotent: result.idempotent || false,
        txId: result.txId
      })
    } else {
      return res.status(400).json({ 
        success: false, 
        error: result.error,
        message: result.message,
        details: result
      })
    }
    
  } catch (err) {
    console.error('[WATCHDOG] feed outer error:', err)
    return res.status(500).json({ success: false, error: err && err.message })
  }
})

// =============================================================================
// QARSAN API ENDPOINTS - Server-Side Financial Operations
// CRITICAL: All operations MUST go through security middleware
// =============================================================================

// Tables will be auto-created on first API call via ON CONFLICT DO UPDATE
console.log('[QARSAN] Tables auto-created on first use')

// GET /api/qarsan/status - Get Qarsan status for current user
app.get('/api/qarsan/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user && req.user.id
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' })
    
    const userEmailRes = await query(
      'SELECT email FROM users WHERE id = $1::uuid',
      [userId]
    )
    const userEmail = userEmailRes.rows.length > 0 ? userEmailRes.rows[0].email : null
    
    // Get Watch-Dog state
    const dogResult = await query(
      'SELECT last_fed_at, dog_state FROM watchdog_state WHERE user_id = $1::uuid',
      [userId]
    )
    let dogState = 'SLEEPING'
    let lastFedAt = null
    if (dogResult.rows.length > 0) {
      dogState = dogResult.rows[0].dog_state
      lastFedAt = dogResult.rows[0].last_fed_at
      // Check if dead based on last fed time
      if (lastFedAt) {
        const hoursSinceLastFeed = (new Date() - new Date(lastFedAt)) / (1000 * 60 * 60)
        if (hoursSinceLastFeed >= 72) dogState = 'DEAD'
      }
    }
    
    // Get Qarsan state
    const qarsanResult = await query(
      'SELECT mode, wallet_balance FROM qarsan_state WHERE user_id = $1::uuid',
      [userId]
    )
    const qarsanMode = qarsanResult.rows.length > 0 ? qarsanResult.rows[0].mode : 'OFF'
    const walletBalance = qarsanResult.rows.length > 0 ? parseInt(qarsanResult.rows[0].wallet_balance || 0, 10) : 0
    
    // Calculate steal scope
    let stealScope = 'NONE'
    if (dogState === 'SLEEPING') {
      if (qarsanMode === 'RANGED') stealScope = 'QARSAN_WALLET_ONLY'
      else if (qarsanMode === 'EXPOSURE') stealScope = 'ALL_ASSETS'
    }
    
    return res.json({
      success: true,
      userId,
      userEmail,
      qarsanMode,
      walletBalance,
      watchDogState: dogState,
      stealScope,
      lastFedAt
    })
  } catch (err) {
    console.error('[QARSAN] status error:', err)
    return res.status(500).json({ success: false, error: err && err.message })
  }
})

app.post('/api/qarsan/mode', requireAuth, enforceFinancialSecurity, async (req, res) => {
  try {
    const userId = req.user && req.user.id
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' })
    const { mode, depositAmount } = req.body || {}
    if (!mode || !['OFF', 'RANGED', 'EXPOSURE'].includes(mode)) {
      return res.status(400).json({ success: false, error: 'invalid_mode' })
    }
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const dogResult = await client.query(
        'SELECT dog_state, last_fed_at FROM watchdog_state WHERE user_id = $1::uuid',
        [userId]
      )
      let dogState = 'SLEEPING'
      if (dogResult.rows.length > 0) {
        dogState = dogResult.rows[0].dog_state
        const lastFedAt = dogResult.rows[0].last_fed_at
        if (lastFedAt) {
          const hoursSinceLastFeed = (new Date() - new Date(lastFedAt)) / (1000 * 60 * 60)
          if (hoursSinceLastFeed >= 72) dogState = 'DEAD'
        }
      }
      if (dogState === 'DEAD') {
        await client.query('ROLLBACK')
        return res.status(403).json({ success: false, error: 'DOG_DEAD' })
      }
      let currentMode = 'OFF'
      let currentWallet = 0
      const existing = await client.query(
        'SELECT mode, wallet_balance FROM qarsan_state WHERE user_id = $1::uuid',
        [userId]
      )
      if (existing.rows.length > 0) {
        currentMode = existing.rows[0].mode
        currentWallet = parseInt(existing.rows[0].wallet_balance || 0, 10)
      }
      let newWallet = currentWallet
      if (mode === 'RANGED' && depositAmount > 0) {
        const balanceResult = await client.query(
          "SELECT COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END), 0)::int as balance FROM ledger WHERE user_id = $1::uuid AND asset_type = 'codes'",
          [userId]
        )
        const balance = parseInt(balanceResult.rows[0]?.balance || 0, 10)
        if (balance < depositAmount) {
          await client.query('ROLLBACK')
          return res.status(400).json({ success: false, error: 'INSUFFICIENT_BALANCE' })
        }
        const txIdResult = await client.query('SELECT gen_random_uuid() AS id')
        const txId = txIdResult.rows[0].id
        await client.query(
          "INSERT INTO ledger (tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1::uuid, $2::uuid, 'debit', 'codes', $3, 'QARSAN_MODE_CHANGE')",
          [txId, userId, depositAmount]
        )
        newWallet = currentWallet + depositAmount
      }
      await client.query(
        `INSERT INTO qarsan_state (user_id, mode, wallet_balance, updated_at) 
         VALUES ($1::uuid, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE SET mode = $2, wallet_balance = $3, updated_at = NOW()`,
        [userId, mode, newWallet]
      )
      const modeTxId = await client.query('SELECT gen_random_uuid() AS id')
      await client.query(
        "INSERT INTO ledger (tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1::uuid, $2::uuid, 'debit', 'codes', 0, 'QARSAN_MODE_CHANGE')",
        [modeTxId.rows[0].id, userId]
      )
      await client.query(
        "INSERT INTO audit_log (type, payload) VALUES ($1, $2::jsonb)",
        ['QARSAN_MODE_CHANGE', JSON.stringify({ userId, mode, walletBalance: newWallet, ts: new Date().toISOString() })]
      )
      await client.query('COMMIT')
      __sseEmit(userId, { type: 'QARSAN_UPDATE', action: 'mode', mode, walletBalance: newWallet })
      __sseEmit(userId, { type: 'ASSET_UPDATE', assetType: 'codes' })
      return res.json({ success: true, qarsanMode: mode, walletBalance: newWallet })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      if (typeof client.release === 'function') client.release()
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err && err.message })
  }
})

// POST /api/qarsan/activate - legacy alias
app.post('/api/qarsan/activate', requireAuth, enforceFinancialSecurity, async (req, res) => {
  try {
    const userId = req.user && req.user.id
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' })
    
    const { mode, depositAmount } = req.body || {}
    if (!mode || !['OFF', 'RANGED', 'EXPOSURE'].includes(mode)) {
      return res.status(400).json({ success: false, error: 'invalid_mode' })
    }
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Check Watch-Dog state
      const dogResult = await client.query(
        'SELECT dog_state, last_fed_at FROM watchdog_state WHERE user_id = $1::uuid',
        [userId]
      )
      
      let dogState = 'SLEEPING'
      if (dogResult.rows.length > 0) {
        dogState = dogResult.rows[0].dog_state
        const lastFedAt = dogResult.rows[0].last_fed_at
        if (lastFedAt) {
          const hoursSinceLastFeed = (new Date() - new Date(lastFedAt)) / (1000 * 60 * 60)
          if (hoursSinceLastFeed >= 72) dogState = 'DEAD'
        }
      }
      
      // Cannot activate if dog is DEAD
      if (dogState === 'DEAD') {
        await client.query('ROLLBACK')
        return res.status(403).json({ success: false, error: 'DOG_DEAD', message: 'Cannot activate Qarsan - Watch-Dog has died' })
      }
      
      // Get or create Qarsan state
      let currentMode = 'OFF'
      let currentWallet = 0
      const existing = await client.query(
        'SELECT mode, wallet_balance FROM qarsan_state WHERE user_id = $1::uuid',
        [userId]
      )
      if (existing.rows.length > 0) {
        currentMode = existing.rows[0].mode
        currentWallet = parseInt(existing.rows[0].wallet_balance || 0, 10)
      }
      
      // Handle deposit for RANGED mode
      let newWallet = currentWallet
      if (mode === 'RANGED' && depositAmount > 0) {
        const balanceResult = await client.query(
          "SELECT COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END), 0)::int as balance FROM ledger WHERE user_id = $1::uuid AND asset_type = 'codes'",
          [userId]
        )
        const balance = parseInt(balanceResult.rows[0]?.balance || 0, 10)
        
        if (balance < depositAmount) {
          await client.query('ROLLBACK')
          return res.status(400).json({ success: false, error: 'INSUFFICIENT_BALANCE', message: `Need ${depositAmount} codes but only have ${balance}` })
        }
        
        const txIdResult = await client.query('SELECT gen_random_uuid() AS id')
        const txId = txIdResult.rows[0].id
        await client.query(
          "INSERT INTO ledger (tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1::uuid, $2::uuid, 'debit', 'codes', $3, 'QARSAN_MODE_CHANGE')",
          [txId, userId, depositAmount]
        )
        newWallet = currentWallet + depositAmount
      }
      
      // Update Qarsan state
      await client.query(
        `INSERT INTO qarsan_state (user_id, mode, wallet_balance, updated_at) 
         VALUES ($1::uuid, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE SET mode = $2, wallet_balance = $3, updated_at = NOW()`,
        [userId, mode, newWallet]
      )
      
      const modeTxId = await client.query('SELECT gen_random_uuid() AS id')
      await client.query(
        "INSERT INTO ledger (tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1::uuid, $2::uuid, 'debit', 'codes', 0, 'QARSAN_MODE_CHANGE')",
        [modeTxId.rows[0].id, userId]
      )
      await client.query(
        "INSERT INTO audit_log (type, payload) VALUES ($1, $2::jsonb)",
        ['QARSAN_MODE_CHANGE', JSON.stringify({ userId, mode, walletBalance: newWallet, ts: new Date().toISOString() })]
      )
      
      await client.query('COMMIT')
      
      __sseEmit(userId, { type: 'QARSAN_UPDATE', action: 'mode', mode, walletBalance: newWallet })
      __sseEmit(userId, { type: 'ASSET_UPDATE', assetType: 'codes' })
      return res.json({ success: true, qarsanMode: mode, walletBalance: newWallet })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      if (typeof client.release === 'function') client.release()
    }
  } catch (err) {
    console.error('[QARSAN] activate error:', err)
    return res.status(500).json({ success: false, error: err && err.message })
  }
})

// POST /api/qarsan/deactivate - Deactivate Qarsan
app.post('/api/qarsan/deactivate', requireAuth, enforceFinancialSecurity, async (req, res) => {
  try {
    const userId = req.user && req.user.id
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' })
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Get current Qarsan state
      const existing = await client.query(
        'SELECT wallet_balance FROM qarsan_state WHERE user_id = $1::uuid',
        [userId]
      )
      
      const currentWallet = existing.rows.length > 0 ? parseInt(existing.rows[0].wallet_balance || 0, 10) : 0
      
      if (currentWallet > 0) {
        const txIdResult = await client.query('SELECT gen_random_uuid() AS id')
        const txId = txIdResult.rows[0].id
        await client.query(
          "INSERT INTO ledger (tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1::uuid, $2::uuid, 'credit', 'codes', $3, 'QARSAN_MODE_CHANGE')",
          [txId, userId, currentWallet]
        )
      }
      
      // Set mode to OFF
      await client.query(
        "INSERT INTO qarsan_state (user_id, mode, wallet_balance, updated_at) VALUES ($1::uuid, 'OFF', 0, NOW()) ON CONFLICT (user_id) DO UPDATE SET mode = 'OFF', wallet_balance = 0, updated_at = NOW()",
        [userId]
      )
      
      await client.query('COMMIT')
      
      __sseEmit(userId, { type: 'QARSAN_UPDATE', action: 'mode', mode: 'OFF', walletBalance: 0 })
      __sseEmit(userId, { type: 'ASSET_UPDATE', assetType: 'codes' })
      return res.json({ success: true, message: 'Qarsan deactivated' })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      if (typeof client.release === 'function') client.release()
    }
  } catch (err) {
    console.error('[QARSAN] deactivate error:', err)
    return res.status(500).json({ success: false, error: err && err.message })
  }
})

// POST /api/qarsan/attack - Execute theft (THE CRITICAL SECURITY OPERATION)
app.post('/api/qarsan/attack', requireAuth, enforceFinancialSecurity, async (req, res) => {
  try {
    const attackerId = req.user && req.user.id
    if (!attackerId) return res.status(401).json({ success: false, error: 'unauthorized' })
    
    const { targetUserId, amount, txId: providedTxId } = req.body || {}
    if (!targetUserId) return res.status(400).json({ success: false, error: 'target_required' })
    if (attackerId === targetUserId) return res.status(400).json({ success: false, error: 'self_attack_not_allowed' })
    if (!providedTxId) return res.status(400).json({ success: false, error: 'txId_required' })
    
    const stealAmount = parseInt(amount || 0, 10)
    if (stealAmount <= 0) return res.status(400).json({ success: false, error: 'invalid_amount' })
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      // SQLite doesn't need advisory locks as it's single-write
      // await client.query("SELECT pg_advisory_xact_lock((('x'||substr(md5($1||$2),1,16))::bit(64))::bigint)", [attackerId, targetUserId])
      
      const prior = await client.query('SELECT 1 FROM ledger WHERE tx_id = $1::uuid LIMIT 1', [providedTxId])
      if (prior.rows.length > 0) {
        await client.query('ROLLBACK')
        return res.json({ success: true, idempotent: true, amount: 0, message: 'duplicate_tx' })
      }
      
      // Check target's Watch-Dog state
      const targetDogResult = await client.query(
        'SELECT dog_state, last_fed_at FROM watchdog_state WHERE user_id = $1::uuid',
        [targetUserId]
      )
      
      let targetDogState = 'SLEEPING'
      if (targetDogResult.rows.length > 0) {
        targetDogState = targetDogResult.rows[0].dog_state
        const lastFedAt = targetDogResult.rows[0].last_fed_at
        if (lastFedAt) {
          const hoursSinceLastFeed = (new Date() - new Date(lastFedAt)) / (1000 * 60 * 60)
          if (hoursSinceLastFeed >= 72) targetDogState = 'DEAD'
        }
      }
      
      // Cannot steal from ACTIVE or DEAD dog
      if (targetDogState !== 'SLEEPING') {
        await client.query('ROLLBACK')
        return res.status(403).json({ 
          success: false, 
          error: targetDogState === 'ACTIVE' ? 'DOG_ACTIVE' : 'DOG_DEAD',
          message: `Cannot steal from user with ${targetDogState} dog`
        })
      }
      
      // Get target's Qarsan mode
      const targetQarsanResult = await client.query(
        'SELECT mode, wallet_balance FROM qarsan_state WHERE user_id = $1',
        [targetUserId]
      )
      const targetMode = targetQarsanResult.rows.length > 0 ? targetQarsanResult.rows[0].mode : 'OFF'
      const targetWallet = parseInt(targetQarsanResult.rows[0]?.wallet_balance || 0, 10)
      
      // Get target's actual balance
      const targetBalanceResult = await client.query(
        "SELECT COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END), 0) as balance FROM ledger WHERE user_id = $1 AND asset_type = 'codes'",
        [targetUserId]
      )
      const targetBalance = parseInt(targetBalanceResult.rows[0]?.balance || 0, 10)
      
      // Calculate steal scope
      let stealScope = 'NONE'
      let actualStealAmount = 0
      
      if (targetMode === 'RANGED') {
        stealScope = 'QARSAN_WALLET_ONLY'
        actualStealAmount = Math.min(stealAmount, targetWallet)
      } else if (targetMode === 'EXPOSURE') {
        stealScope = 'ALL_ASSETS'
        actualStealAmount = Math.min(stealAmount, targetBalance + targetWallet)
      }
      
      if (actualStealAmount <= 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ success: false, error: 'NOTHING_TO_STEAL', message: 'Target has no stealable assets' })
      }
      
      const txId = providedTxId
      await client.query(
        "INSERT INTO ledger (id, tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1, $2, $3, 'debit', 'codes', $4, 'QARSAN_THEFT_DEBIT')",
        [crypto.randomUUID(), txId, targetUserId, actualStealAmount]
      )
      
      // Credit to attacker
      await client.query(
        "INSERT INTO ledger (id, tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1, $2, $3, 'credit', 'codes', $4, 'QARSAN_THEFT_CREDIT')",
        [crypto.randomUUID(), txId, attackerId, actualStealAmount]
      )
      
      // Update Qarsan wallet if wallet was stolen
      if (stealScope === 'QARSAN_WALLET_ONLY') {
        await client.query(
          "UPDATE qarsan_state SET wallet_balance = MAX(0, wallet_balance - $1), updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
          [actualStealAmount, targetUserId]
        )
      }
      
      await client.query(
        "INSERT INTO audit_log (type, payload) VALUES ($1, $2)",
        ['QARSAN_THEFT', JSON.stringify({ attackerId, targetUserId, amount: actualStealAmount, scope: stealScope, txId, ts: new Date().toISOString() })]
      )
      
      await client.query('COMMIT')
      
      console.log(`[QARSAN] Theft: ${attackerId} stole ${actualStealAmount} codes from ${targetUserId}, scope: ${stealScope}`)
      
      __sseEmit(attackerId, { type: 'ASSET_UPDATE', assetType: 'codes' })
      __sseEmit(targetUserId, { type: 'ASSET_UPDATE', assetType: 'codes' })
      __sseEmit(attackerId, { type: 'QARSAN_UPDATE', action: 'attack', targetUserId, amount: actualStealAmount, txId, scope: stealScope })
      __sseEmit(targetUserId, { type: 'QARSAN_UPDATE', action: 'attacked', attackerId, amount: actualStealAmount, txId, scope: stealScope })
      
      return res.json({
        success: true,
        amount: actualStealAmount,
        scope: stealScope,
        message: `Successfully stole ${actualStealAmount} codes`
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      if (typeof client.release === 'function') client.release()
    }
  } catch (err) {
    console.error('[QARSAN] attack error:', err)
    return res.status(500).json({ success: false, error: err && err.message })
  }
})

// GET /api/qarsan/users - Get virtual users for attack targets
app.get('/api/qarsan/users', requireAuth, async (req, res) => {
  try {
    const userId = req.user && req.user.id
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' })
    
    // Get virtual users with email information
    let virtualUsers = await query(`
      SELECT 
        virtual_user_id as id, 
        email, 
        name, 
        dog_state, 
        qarsan_mode, 
        balance, 
        qarsan_wallet,
        last_fed_at
      FROM qarsan_virtual_users 
      ORDER BY created_at DESC 
      LIMIT 20
    `)
    
    if (virtualUsers.rows.length === 0) {
      // Generate virtual users if none exist
      await generateVirtualUsers()
      
      // Re-query after generation
      virtualUsers = await query(`
        SELECT 
          virtual_user_id as id, 
          email, 
          name, 
          dog_state, 
          qarsan_mode, 
          balance, 
          qarsan_wallet,
          last_fed_at
        FROM qarsan_virtual_users 
        ORDER BY created_at DESC 
        LIMIT 20
      `)
    }
    
    // Filter out current user and calculate attackability
    const users = await Promise.all(virtualUsers.rows.map(async row => {
      let dogState = row.dog_state
      // Check if dead
      if (row.last_fed_at) {
        const hoursSinceLastFeed = (new Date() - new Date(row.last_fed_at)) / (1000 * 60 * 60)
        if (hoursSinceLastFeed >= 72) dogState = 'DEAD'
      }
      
      let stealScope = 'NONE'
      if (dogState === 'SLEEPING') {
        if (row.qarsan_mode === 'RANGED') stealScope = 'QARSAN_WALLET_ONLY'
        else if (row.qarsan_mode === 'EXPOSURE') stealScope = 'ALL_ASSETS'
      }
      
    // Fetch balance from LEDGER (source of truth) instead of direct columns
    const balanceRes = await query(
      "SELECT COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END),0) AS balance FROM ledger WHERE user_id = $1 AND asset_type='codes'",
      [row.id]
    )
    
    // For virtual users, qarsan_wallet is maintained separately but should also use ledger
    const qarsanWalletRes = await query(
      "SELECT COALESCE(SUM(CASE WHEN reference LIKE 'QARSAN_%' THEN CASE WHEN direction='credit' THEN amount ELSE -amount END ELSE 0 END),0) AS qarsan_balance FROM ledger WHERE user_id = $1 AND asset_type='codes'",
      [row.id]
    )
      
      return {
        id: row.id,
        email: row.email,
        name: row.name,
        dogState,
        qarsanMode: row.qarsan_mode,
        balance: parseInt(balanceRes.rows[0]?.balance || 0, 10),
        qarsanWallet: parseInt(qarsanWalletRes.rows[0]?.qarsan_balance || 0, 10),
        stealScope,
        canAttack: dogState === 'SLEEPING' && stealScope !== 'NONE'
      }
    }))
    
    return res.json({ success: true, users })
  } catch (err) {
    console.error('[QARSAN] users error:', err)
    return res.status(500).json({ success: false, error: err && err.message })
  }
})

app.post('/api/qarsan/feed-dog', requireAuth, enforceFinancialSecurity, async (req, res) => {
  try {
    const userId = req.user && req.user.id
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' })
    const idempotencyKey = req.headers['x-idempotency-key'] || req.body.idempotencyKey || null
    const result = await feedWatchDog(userId, idempotencyKey)
    if (idempotencyKey && result.success) {
      storeIdempotencyResponse(userId, idempotencyKey, result)
    }
    if (result.success) {
      __sseEmit(userId, { type: 'ASSET_UPDATE', assetType: 'codes' })
      __sseEmit(userId, { type: 'QARSAN_UPDATE', action: 'dog_fed' })
      return res.json({ 
        success: true, 
        cost: result.cost, 
        newBalance: result.newBalance,
        dogState: result.dogState,
        idempotent: result.idempotent || false,
        txId: result.txId
      })
    } else {
      return res.status(400).json({ success: false, error: result.error, message: result.message, details: result })
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err && err.message })
  }
})

// Smart Compression Logic (normal -> silver -> gold)
async function compressToSilver(userId) {
  try {
    const r = await query(
      'SELECT codes_count FROM balances WHERE user_id=$1',
      [userId]
    );

    if (r.rows.length > 0 && r.rows[0].codes_count >= 100) {
      await query(
        'UPDATE balances SET codes_count = codes_count - 100, silver_count = silver_count + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id=$1',
        [userId]
      );
      // Also sync users table
      await query(
        'UPDATE users SET codes_count = codes_count - 100, silver_count = silver_count + 1 WHERE id=$1',
        [userId]
      );
      console.log(`[COMPRESSION] 100 normal -> 1 silver for user ${userId}`);
    }
  } catch (err) {
    console.error('[COMPRESSION ERROR] compressToSilver:', err.message);
  }
}

async function compressToGold(userId) {
  try {
    const r = await query(
      'SELECT silver_count FROM balances WHERE user_id=$1',
      [userId]
    );

    if (r.rows.length > 0 && r.rows[0].silver_count >= 10) {
      await query(
        'UPDATE balances SET silver_count = silver_count - 10, gold_count = gold_count + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id=$1',
        [userId]
      );
      // Also sync users table
      await query(
        'UPDATE users SET silver_count = silver_count - 10, gold_count = gold_count + 1 WHERE id=$1',
        [userId]
      );
      console.log(`[COMPRESSION] 10 silver -> 1 gold for user ${userId}`);
    }
  } catch (err) {
    console.error('[COMPRESSION ERROR] compressToGold:', err.message);
  }
}

// Mint endpoint - Server generates codes only when requested
app.post('/api/mint', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const amount = 5;
    const codes = [];

    // Helper to generate a code (reusing existing logic or standard format)
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 26; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    for (let i = 0; i < amount; i++) {
      codes.push(generateCode());
    }

    // Batch insert codes
    for (const code of codes) {
      await query(
        'INSERT INTO codes (user_id, code, type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [userId, code, 'normal']
      );
    }

    // Update balances (Upsert)
    await query(
      `INSERT INTO balances (user_id, codes_count) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id) 
       DO UPDATE SET codes_count = codes_count + EXCLUDED.codes_count, updated_at = CURRENT_TIMESTAMP`,
      [userId, codes.length]
    );

    // Also sync users table
    await query(
      `UPDATE users SET codes_count = COALESCE(codes_count, 0) + $1 WHERE id = $2`,
      [codes.length, userId]
    );

    res.json({ minted: codes.length });
  } catch (err) {
    console.error('[MINT ERROR]', err);
    res.status(500).json({ error: 'mint_failed', message: err.message });
  }
});

app.post('/api/rewards/claim', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.body; // 'silver' or 'gold'

    if (!type || (type !== 'silver' && type !== 'gold')) {
      return res.status(400).json({ error: 'Invalid reward type' });
    }

    // Use UPSERT to initialize balance if it doesn't exist
    await query(
      `INSERT INTO balances (user_id, ${type}_count) VALUES ($1, 1) 
       ON CONFLICT (user_id) DO UPDATE SET ${type}_count = ${type}_count + 1, updated_at = CURRENT_TIMESTAMP`,
      [userId]
    );

    // Also sync users table
    await query(
      `UPDATE users SET ${type}_count = COALESCE(${type}_count, 0) + 1 WHERE id = $1`,
      [userId]
    );

    console.log(`[REWARD CLAIM] 1 ${type} bar added to user ${userId}`);
    res.json({ success: true, claimed: type });

  } catch (err) {
    console.error('[REWARD CLAIM ERROR]', err);
    res.status(500).json({ error: 'claim_failed', message: err.message });
  }
});

setInterval(async () => {
  try {
    const users = await query('SELECT id FROM users');

    for (const u of users.rows) {
      await compressToSilver(u.id);
      await compressToGold(u.id);
    }
  } catch (err) {
    console.error('[SMART WATCHDOG ERROR]', err.message);
  }
}, 30000);

app.get('/api/balances', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const r = await query(
      'SELECT codes_count, silver_count, gold_count FROM balances WHERE user_id=$1',
      [userId]
    );

    if (r.rows.length === 0) {
      return res.json({ codes_count: 0, silver_count: 0, gold_count: 0 });
    }

    res.json(r.rows[0]);
  } catch (err) {
    console.error('[BALANCES ERROR]', err);
    res.status(500).json({ error: 'fetch_balances_failed' });
  }
});



app.get('/api/diag/ledger-schema', async (req, res) => {
  try {
    const { rows } = await query("PRAGMA table_info(ledger)");
    return res.json({ columns: rows.map(r => r.name) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Diagnostic endpoints (REMOVED balances view dependency)
app.get('/api/diag/neon-sync', async (req, res) => {
  try {
    const s = readSessionFromCookie(req);
    if (!s || !s.userId) {
      return res.json({ ok: false, reason: 'no_session' });
    }
    return res.json({ ok: true, userId: s.userId, message: 'balances view deprecated - use watchdog' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e && e.message })
  }
})

// Neon codes diagnostic endpoint (session required)
app.get('/api/diag/sqlite-codes', async (req, res) => {
  try {
    const s = readSessionFromCookie(req);
    if (!s || !s.userId) {
      return res.json({ ok: false, reason: 'no_session' });
    }
    if (!process.env.DATABASE_URL) {
      return res.json({ ok: true, count: 0, latest: null, codes: [] });
    }
    const { rows } = await query(
      'SELECT code, created_at FROM codes WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',
      [s.userId]
    )
    const latest = rows && rows[0] ? rows[0].code : null;
    return res.json({ ok: true, count: rows.length, latest, codes: rows })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e && e.message })
  }
})

// Rewards transfer (codes) — atomic Neon transaction - Enhanced Security
app.post('/api/rewards/transfer', requireAuth, enforceFinancialSecurity, async (req, res) => {
  try {
    const session = readSessionFromCookie(req);
    if (!session || !session.userId) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const fromUserId = session.userId;
    const { toUserId, asset, amount } = req.body || {};

    if (!toUserId || !asset || typeof amount !== 'number') {
      return res.status(400).json({ error: 'bad_request' });
    }
    if (toUserId === fromUserId) {
      return res.status(400).json({ error: 'self_transfer_not_allowed' });
    }
    if (amount <= 0) {
      return res.status(400).json({ error: 'invalid_amount' });
    }
    if (asset !== 'codes') {
      return res.status(400).json({ error: 'unsupported_asset' });
    }

    const client = await pool.connect();

    const MAX_RETRIES = 3;
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        await client.query('BEGIN');
        // SQLite doesn't need advisory locks as it's single-write
      // await client.query("SELECT pg_advisory_xact_lock((('x'||substr(md5($1||$2),1,16))::bit(64))::bigint)", [fromUserId, toUserId]);

        const lockRes = await client.query(
          "SELECT COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END),0) AS amount FROM ledger WHERE user_id=$1 AND asset_type='codes'",
          [fromUserId]
        );
        try { console.log('[TRANSFER] lock sender amount =', (lockRes.rows[0] && Number(lockRes.rows[0].amount)) || 0) } catch(_){ }
        const fromAmount = (lockRes.rows[0] && Number(lockRes.rows[0].amount)) || 0;
        if (fromAmount < amount) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'insufficient_balance' });
        }

        const txId2 = crypto.randomUUID();
        await client.query(
          "INSERT INTO ledger (id, tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1, $2, $3, 'debit', 'codes', $4, 'reward_transfer')",
          [crypto.randomUUID(), txId2, fromUserId, amount]
        );
        try { console.log('[TRANSFER] deducted', amount, 'from', fromUserId) } catch(_){ }

        await client.query(
          "INSERT INTO ledger (id, tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1, $2, $3, 'credit', 'codes', $4, 'reward_transfer')",
          [crypto.randomUUID(), txId2, toUserId, amount]
        );
        try { console.log('[TRANSFER] credited', amount, 'to', toUserId) } catch(_){ }

        const finalBal = await client.query(
          "SELECT COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END),0) AS amount FROM ledger WHERE user_id=$1 AND asset_type='codes'",
          [fromUserId]
        );
        try { console.log('[TRANSFER] final sender amount =', (finalBal.rows[0] && Number(finalBal.rows[0].amount)) || 0) } catch(_){ }
        const finalBalB = await client.query(
          "SELECT COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END),0) AS amount FROM ledger WHERE user_id=$1 AND asset_type='codes'",
          [toUserId]
        );
        try { console.log('[TRANSFER] commit sender->receiver', { from: fromUserId, to: toUserId, amount, sender_final: (finalBal.rows[0] && Number(finalBal.rows[0].amount)) || 0, receiver_final: (finalBalB.rows[0] && Number(finalBalB.rows[0].amount)) || 0, attempt }) } catch(_){}

        await client.query('COMMIT');

        return res.json({
          status: 'success',
          balances: {
            codes: (finalBal.rows[0] && Number(finalBal.rows[0].amount)) || 0
          }
        });
      } catch (e) {
        try { await client.query('ROLLBACK') } catch(_){}
        const code = e && e.code || '';
        const retriable = code === '40001' || code === '40P01';
        try { console.warn('[REWARD TX RETRY]', { attempt, code, message: e && e.message }) } catch(_){}
        if (retriable && attempt < MAX_RETRIES) { await new Promise(r => setTimeout(r, 80 * attempt)); continue; }
        console.error('[REWARD TX ERROR]', e);
        return res.status(500).json({ error: 'tx_failed' });
      } finally {
        if (attempt >= MAX_RETRIES) { try { client.release() } catch(_){ } }
      }
    }
  } catch (e) {
    console.error('[REWARD API ERROR]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// Events inbox for the current user (last 24h or unseen)
app.get('/api/events/inbox', async (req, res) => {
  try {
    const s = readSessionFromCookie(req);
    if (!s || !s.userId) return res.status(401).json({ ok: false, error: 'unauthorized' });
    if (!process.env.DATABASE_URL) return res.json({ ok: true, events: [] });
    const { rows } = await query(
      `SELECT id, type, meta, created_at, expires_at, seen
       FROM events
       WHERE user_id=$1
         AND (seen=0 OR created_at > datetime('now', '-24 hours'))
       ORDER BY created_at DESC
       LIMIT 100`,
      [s.userId]
    );
    return res.json({ ok: true, events: rows });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e && e.message });
  }
});

// Acknowledge events (mark seen)
app.post('/api/events/ack', async (req, res) => {
  try {
    const s = readSessionFromCookie(req);
    if (!s || !s.userId) return res.status(401).json({ ok: false, error: 'unauthorized' });
    const ids = Array.isArray((req.body||{}).ids) ? (req.body.ids) : [];
    if (!ids.length) return res.json({ ok: true, updated: 0 });
    if (!process.env.DATABASE_URL) return res.json({ ok: true, updated: 0 });
    const placeholders = ids.map((_, i) => '$' + (i + 2)).join(',');
    const { rowCount } = await query(
      `UPDATE events SET seen=1, updated_at=CURRENT_TIMESTAMP WHERE user_id=$1 AND id IN (${placeholders})`,
      [s.userId, ...ids]
    );
    return res.json({ ok: true, updated: rowCount|0 });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e && e.message });
  }
});

// Balances endpoint (Unified)
app.get('/api/balances', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const r = await query(
      'SELECT codes_count, silver_count, gold_count FROM balances WHERE user_id=$1',
      [userId]
    );

    if (r.rows.length === 0) {
      return res.json({ status: 'success', balances: { codes: 0, silver: 0, gold: 0 } });
    }

    const row = r.rows[0];
    res.json({ 
      status: 'success', 
      balances: {
        codes: row.codes_count || 0,
        silver: row.silver_count || 0,
        gold: row.gold_count || 0
      }
    });
  } catch (err) {
    console.error('[BALANCES ERROR]', err);
    res.status(500).json({ status: 'failed', error: err.message });
  }
});

app.get('/api/games', requireAuth, async (req, res) => {
  try {
    let userId = req.query.userId || null
    if (!userId) {
      const email = (req.query?.email || '').toString().trim()
      if (email) {
        try {
          const found = await query('SELECT id FROM users WHERE email=$1 LIMIT 1', [email])
          userId = found?.rows?.[0]?.id || null
        } catch (err) { 
          console.error('[GAMES] Error finding user by email:', err)
          userId = null 
        }
      }
    }
    
    // Authorization check - if userId is provided, it must match the authenticated user
    if (userId && req.user.id !== userId) {
      return res.status(403).json({ status: 'failed', error: 'unauthorized_access' })
    }
    
    // If no userId provided, use the authenticated user
    if (!userId) {
      userId = req.user.id
    }

    const { rows } = await query(
      'SELECT id, game_name, score FROM games WHERE user_id=$1 ORDER BY score DESC',
      [userId]
    )
    res.json(rows || [])
  } catch (e) {
    res.json([])
  }
})

app.post('/api/transactions', async (req, res) => {
  try {
    const { sender_id, receiver_id, asset_name, amount } = req.body || {}
    if (!sender_id || !receiver_id || !asset_name || typeof amount !== 'number') {
      return res.status(400).json({ message: 'Invalid payload' })
    }
    const { rows } = await query(
      'INSERT INTO transactions (sender_id, receiver_id, asset_name, amount) VALUES ($1,$2,$3,$4) RETURNING id',
      [sender_id, receiver_id, asset_name, amount]
    )
    res.status(201).json({ id: rows && rows[0] ? rows[0].id : null })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Ensure Neon schema compatibility for auth sessions
// try {
//   await query('ALTER TABLE IF EXISTS auth_sessions ADD COLUMN IF NOT EXISTS token TEXT');
//   await query('ALTER TABLE IF EXISTS auth_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + interval \'7 days\')');
//   await query('ALTER TABLE IF EXISTS auth_sessions ALTER COLUMN token DROP NOT NULL');
// } catch (e) {
//   console.warn('Schema ensure failed:', e.message);
// }


// New endpoint for Samma3ny with direct Cloudinary fetch
app.get('/api/samma3ny/list', async (req, res) => {
  try {
    console.log('[SYNC] Fetching Samma3ny songs with direct Cloudinary API call...');

    const CLOUDINARY_CLOUD = process.env.CLOUDINARY_CLOUD_NAME || 'dhpyneqgk';
    const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '799518422494748';
    const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'zfSbK0-zK3tHdmCWdcCduPcxtU4';

    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/resources/video?prefix=samma3ny/&type=upload&max_results=500`;

    const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString("base64");

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Cloudinary API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const files = data.resources || [];

    console.log(`[OK] Direct fetch: Found ${files.length} resources in samma3ny/ folder`);

    res.json({ ok: true, files });
  } catch (error) {
    console.error('[ERROR] Direct Cloudinary fetch error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/samma3ny/songs', handleSamma3nySongs);

// Farragna media listing handled in unified API

// Enhanced bulk upload endpoint for Samma3ny with metadata extraction
app.post('/api/samma3ny/upload', upload.any(), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please select audio files to upload'
      });
    }

    console.log(`[SEND] Starting bulk upload for ${files.length} Samma3ny files`);

    const uploadResults = [];
    const errors = [];
    let successCount = 0;
    let failCount = 0;

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileIndex = i + 1;

      try {
        console.log(`[SEND] Processing file ${fileIndex}/${files.length}: ${file.originalname}`);

        // Validate file type
        if (!file.mimetype.startsWith('audio/')) {
          errors.push({
            file: file.originalname,
            error: 'Invalid file type',
            message: 'Only audio files are allowed'
          });
          failCount++;

          // Clean up temp file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          continue;
        }

        // Validate file size (100MB limit)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
          errors.push({
            file: file.originalname,
            error: 'File too large',
            message: `Maximum file size is ${Math.round(maxSize / (1024 * 1024))}MB`
          });
          failCount++;

          // Clean up temp file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          continue;
        }

        // Extract metadata from filename (basic parsing)
        const metadata = extractMetadataFromFilename(file.originalname);

        // Generate unique public ID
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const publicId = `media-player/audio_${timestamp}_${randomId}`;

        try {
          // Upload to Cloudinary
          const result = await cloudinary.v2.uploader.upload(file.path, {
            resource_type: 'video', // Cloudinary uses 'video' for audio
            folder: 'media-player',
            public_id: publicId,
            format: 'mp3',
            quality: 'auto',
            // Add metadata context
            context: {
              title: metadata.title,
              artist: metadata.artist || 'Unknown Artist',
              album: metadata.album || 'Samma3ny Collection',
              uploaded_by: 'admin',
              upload_date: new Date().toISOString()
            }
          });

          // Clean up temp file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }

          const uploadResult = {
            success: true,
            file: file.originalname,
            url: result.secure_url,
            public_id: result.public_id,
            duration: result.duration || 0,
            format: result.format,
            bytes: result.bytes,
            size: formatFileSize(result.bytes),
            metadata: {
              title: metadata.title,
              artist: metadata.artist || 'Unknown Artist',
              album: metadata.album || 'Samma3ny Collection'
            },
            uploaded_at: new Date().toISOString()
          };

          uploadResults.push(uploadResult);
          successCount++;

          console.log(`[OK] Successfully uploaded: ${file.originalname} (${formatFileSize(result.bytes)})`);

        } catch (uploadError) {
          console.error(`[ERROR] Cloudinary upload failed for ${file.originalname}:`, uploadError.message);

          // Fallback to local storage
          try {
            const localPath = path.join(__dirname, 'services/codebank/samma3ny/uploads');
            if (!fs.existsSync(localPath)) {
              fs.mkdirSync(localPath, { recursive: true });
            }

            const localFileName = `local_${timestamp}_${file.originalname}`;
            const localFilePath = path.join(localPath, localFileName);

            // Move file to local storage
            fs.moveSync(file.path, localFilePath);

            const uploadResult = {
              success: true,
              file: file.originalname,
              url: `/services/codebank/samma3ny/uploads/${localFileName}`,
              public_id: `local_${timestamp}`,
              duration: 0,
              format: 'mp3',
              bytes: file.size,
              size: formatFileSize(file.size),
              offline_mode: true,
              metadata: {
                title: metadata.title,
                artist: metadata.artist || 'Unknown Artist',
                album: metadata.album || 'Samma3ny Collection'
              },
              message: 'Uploaded locally - Cloudinary temporarily unavailable',
              uploaded_at: new Date().toISOString()
            };

            uploadResults.push(uploadResult);
            successCount++;

            console.log(`[WARN] Uploaded locally: ${file.originalname}`);

          } catch (localError) {
            console.error(`[ERROR] Local storage failed for ${file.originalname}:`, localError.message);
            errors.push({
              file: file.originalname,
              error: 'Upload failed',
              message: 'Both Cloudinary and local storage failed'
            });
            failCount++;

            // Clean up temp file
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          }
        }

      } catch (fileError) {
        console.error(`[ERROR] Error processing ${file.originalname}:`, fileError.message);
        errors.push({
          file: file.originalname,
          error: 'Processing failed',
          message: fileError.message
        });
        failCount++;

        // Clean up temp file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    // Send comprehensive response
    const response = {
      total_files: files.length,
      successful_uploads: successCount,
      failed_uploads: failCount,
      results: uploadResults,
      errors: errors,
      summary: `${successCount} files uploaded successfully, ${failCount} failed`
    };

    // Log summary
    console.log(`[STATS] Bulk upload completed: ${successCount}/${files.length} files successful`);

    if (successCount > 0) {
      console.log('[MUSIC] New songs are now available in the playlist');
    }

    res.json(response);

  } catch (error) {
    console.error('[ERROR] Bulk upload error:', error);
    res.status(500).json({
      error: 'Bulk upload service error',
      message: error.message,
      total_files: 0,
      successful_uploads: 0,
      failed_uploads: 0,
      results: [],
      errors: [{ error: 'Server error', message: error.message }]
    });
  }
});

// Helper function to extract metadata from filename
function extractMetadataFromFilename(filename) {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  // Common patterns: "Artist - Title", "Title - Artist", "Artist_Title", etc.
  let title = nameWithoutExt;
  let artist = 'Unknown Artist';
  let album = null;

  // Try to extract artist and title
  const separators = [' - ', '_-_', '__', ' – '];

  for (const separator of separators) {
    if (nameWithoutExt.includes(separator)) {
      const parts = nameWithoutExt.split(separator);
      if (parts.length >= 2) {
        // Assume first part is artist, rest is title
        artist = parts[0].trim();
        title = parts.slice(1).join(separator).trim();
        break;
      }
    }
  }

  // Clean up common prefixes/suffixes
  title = title.replace(/^(official|music|video|audio|song)\s+/i, '');
  title = title.replace(/\s+(official|music|video|audio|song)$/i, '');

  return {
    title: title || nameWithoutExt,
    artist: artist,
    album: album
  };
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

// Enhanced bulk upload endpoint for Farragna with metadata extraction
app.post('/api/farragna/upload', upload.any(), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please select video files to upload'
      });
    }

    console.log(`[SEND] Starting bulk upload for ${files.length} Farragna files`);

    const uploadResults = [];
    const errors = [];
    let successCount = 0;
    let failCount = 0;

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileIndex = i + 1;

      try {
        console.log(`[SEND] Processing file ${fileIndex}/${files.length}: ${file.originalname}`);

        // Validate file type
        if (!file.mimetype.startsWith('video/')) {
          errors.push({
            file: file.originalname,
            error: 'Invalid file type',
            message: 'Only video files are allowed'
          });
          failCount++;

          // Clean up temp file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          continue;
        }

        // Validate file size (500MB limit for videos)
        const maxSize = 500 * 1024 * 1024;
        if (file.size > maxSize) {
          errors.push({
            file: file.originalname,
            error: 'File too large',
            message: `Maximum file size is ${Math.round(maxSize / (1024 * 1024))}MB`
          });
          failCount++;

          // Clean up temp file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          continue;
        }

        // Extract metadata from filename (basic parsing)
        const metadata = extractMetadataFromFilename(file.originalname);

        // Generate unique public ID
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const publicId = `farragna/video_${timestamp}_${randomId}`;

        try {
          // Upload to Cloudinary
          const result = await cloudinary.v2.uploader.upload(file.path, {
            resource_type: 'video',
            folder: 'farragna',
            public_id: publicId,
            format: 'mp4',
            quality: 'auto',
            // Add metadata context
            context: {
              title: metadata.title,
              creator: metadata.artist || 'Unknown Creator',
              uploaded_by: 'admin',
              upload_date: new Date().toISOString()
            }
          });

          // Clean up temp file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }

          const uploadResult = {
            success: true,
            file: file.originalname,
            url: result.secure_url,
            public_id: result.public_id,
            duration: result.duration || 0,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
            size: formatFileSize(result.bytes),
            metadata: {
              title: metadata.title,
              creator: metadata.artist || 'Unknown Creator'
            },
            uploaded_at: new Date().toISOString()
          };

          uploadResults.push(uploadResult);
          successCount++;

          console.log(`[OK] Successfully uploaded: ${file.originalname} (${formatFileSize(result.bytes)})`);

        } catch (uploadError) {
          console.error(`[ERROR] Cloudinary upload failed for ${file.originalname}:`, uploadError.message);

          // Fallback to local storage
          try {
            const localPath = path.join(__dirname, 'services/codebank/farragna/uploads');
            if (!fs.existsSync(localPath)) {
              fs.mkdirSync(localPath, { recursive: true });
            }

            const localFileName = `local_${timestamp}_${file.originalname}`;
            const localFilePath = path.join(localPath, localFileName);

            // Move file to local storage
            fs.moveSync(file.path, localFilePath);

            const uploadResult = {
              success: true,
              file: file.originalname,
              url: `/services/codebank/farragna/uploads/${localFileName}`,
              public_id: `local_${timestamp}`,
              duration: 0,
              width: 0,
              height: 0,
              format: 'mp4',
              bytes: file.size,
              size: formatFileSize(file.size),
              offline_mode: true,
              metadata: {
                title: metadata.title,
                creator: metadata.artist || 'Unknown Creator'
              },
              message: 'Uploaded locally - Cloudinary temporarily unavailable',
              uploaded_at: new Date().toISOString()
            };

            uploadResults.push(uploadResult);
            successCount++;

            console.log(`[WARN] Uploaded locally: ${file.originalname}`);

          } catch (localError) {
            console.error(`[ERROR] Local storage failed for ${file.originalname}:`, localError.message);
            errors.push({
              file: file.originalname,
              error: 'Upload failed',
              message: 'Both Cloudinary and local storage failed'
            });
            failCount++;

            // Clean up temp file
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          }
        }

      } catch (fileError) {
        console.error(`[ERROR] Error processing ${file.originalname}:`, fileError.message);
        errors.push({
          file: file.originalname,
          error: 'Processing failed',
          message: fileError.message
        });
        failCount++;

        // Clean up temp file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    // Send comprehensive response
    const response = {
      total_files: files.length,
      successful_uploads: successCount,
      failed_uploads: failCount,
      results: uploadResults,
      errors: errors,
      summary: `${successCount} files uploaded successfully, ${failCount} failed`
    };

    // Log summary
    console.log(`[STATS] Bulk upload completed: ${successCount}/${files.length} files successful`);

    if (successCount > 0) {
      console.log('[VIDEO] New videos are now available in the gallery');
    }

    res.json(response);

  } catch (error) {
    console.error('[ERROR] Bulk upload error:', error);
    res.status(500).json({
      error: 'Bulk upload service error',
      message: error.message,
      total_files: 0,
      successful_uploads: 0,
      failed_uploads: 0,
      results: [],
      errors: [{ error: 'Server error', message: error.message }]
    });
  }
});

// Upload status endpoint for real-time updates
app.get('/api/samma3ny/upload-status', (req, res) => { res.status(404).end() });

// Force playlist refresh endpoint
app.post('/api/samma3ny/refresh-playlist', (req, res) => { res.status(404).end() });

app.post('/api/samma3ny/order', (req, res) => { res.status(404).end() });

app.post('/api/samma3ny/rename', (req, res) => { res.status(404).end() });

app.post('/api/samma3ny/rename-bulk', async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const name = (req.body?.name || '').trim();
    if (ids.length === 0 || !name) return res.status(400).json({ ok: false, error: 'INVALID_INPUT' });
    let updated = 0;
    for (const id of ids) {
      try {
        await cloudinary.v2.api.update(id, { context: { title: name, display_name: name } });
        updated++;
      } catch (_) { }
    }
    res.json({ ok: true, updated });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Farragna Webhook endpoint for Cloudinary notifications
app.post('/api/farragna/webhook', (req, res) => { res.status(404).end() });

// Samma3ny legacy endpoints (from separate server)
app.get('/api/songs/count', (req, res) => { res.status(404).end() });

// YouTube API proxy endpoints (legacy)
app.get('/api/youtube/search', (req, res) => { res.status(404).end() });
app.get('/api/youtube/videos', (req, res) => { res.status(404).end() });

// Samma3ny metadata endpoint (legacy)
app.post('/api/samma3ny/songs', (req, res) => { res.status(404).end() });

// Guest upload disabled; use unified API with JWT

// Guest create disabled; use unified API with JWT

// Admin API routes for Farragna
app.all('/api/admin/videos', (req, res) => { res.status(404).end() });
app.all('/api/admin/views', (req, res) => { res.status(404).end() });

// Health check
app.get('/health', (req, res) => { res.json({ status: 'ok', timestamp: new Date().toISOString() }) });

app.get('/api/auth/health', (req, res) => { res.status(404).end() });
app.get('/api/auth/test', (req, res) => { res.status(404).end() });

// Screenshot Service Integration
// Global crash protection handlers with enhanced logging
process.on('uncaughtException', (err) => {
  console.error('[CRASH] [CRITICAL] UNCAUGHT EXCEPTION DETECTED:');
  console.error('Error message:', err.message);
  console.error('Error stack:', err.stack);
  console.error('Error code:', err.code);
  console.error('Timestamp:', new Date().toISOString());
  
  // [SECURITY] CRITICAL: If we hit a serious error, we MUST exit so PM2 can restart the process
  // This prevents the server from hanging in a broken state.
  if (err.code === 'EADDRINUSE') {
    console.error('Port already in use, exiting...');
  }
  
  // Give some time for logs to flush before exiting
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRASH] [CRITICAL] UNHANDLED REJECTION DETECTED:');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  console.error('Timestamp:', new Date().toISOString());
  
  // Most unhandled rejections are recoverable, but logging is vital
});

// [SECURITY] CRITICAL: Global Server Error Handling
let isRetrying = false;
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    if (isRetrying) return;
    isRetrying = true;
    console.error(`[CRASH] Port ${PORT} is already in use. Retrying in 5 seconds...`);
    setTimeout(() => {
      isRetrying = false;
      server.close();
      server.listen(PORT);
    }, 5000);
  } else {
    console.error('[CRASH] Server error:', e);
  }
});

// Port availability check & server start
server.once('listening', async () => {
  console.log(`[INFO] [SERVER] Ledger Absolutism active on http://localhost:${PORT}`);
  
  // Apply DDL and start event processor
  try {
    await applyNeonCompressionDDL();
    
  // Enable WAL mode for SQLite ONLY if not using Turso
  if (process.env.TURSO_URL || process.env.TURSO_DATABASE_URL) {
    console.log('ℹ️ [DB] Turso detected, skipping WAL PRAGMA commands');
  } else {
    try {
      await query('PRAGMA journal_mode = WAL;');
      await query('PRAGMA synchronous = NORMAL;');
      console.log('[OK] [SQLITE] WAL mode enabled for high concurrency');
    } catch (e) {
      console.warn('[WARN] [SQLITE] WAL mode failed:', e.message);
    }
  }

    await __startEventProcessor();
    await ensureQarsanVirtualUsers();
    console.log('[OK] [INIT] All systems ready');
  } catch (err) {
    console.error('[ERROR] [INIT] Startup sequence failed:', err);
    // [SECURITY] CRITICAL: If startup fails, we MUST exit so PM2 can restart
    setTimeout(() => process.exit(1), 1000);
  }

  // Background WatchDog Loop
  if (!global.watchdogInterval) {
    global.isWatchdogRunning = false;
    global.watchdogInterval = setInterval(async () => {
      if (global.isWatchdogRunning) return;
      global.isWatchdogRunning = true;

      try {
        const result = await watchdog.verifySystemIntegrity();
        if (result.status === 'alert') {
          await watchdog.autoHeal(result.issues);
        }
      } catch (e) {
        console.error('[WARN] [WATCHDOG LOOP ERROR]', e.message);
      } finally {
        global.isWatchdogRunning = false;
      }
    }, 30000);
  }
});

server.listen(PORT);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[STOP] Shutting down server gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[STOP] Shutting down server gracefully...');
  process.exit(0);
});
// Consolidated API Router
const apiRouter = express.Router();

// Middleware for API router
apiRouter.use(express.json());
apiRouter.use(cookieParser());
apiRouter.use(cors({ origin: true, credentials: true }));

// API-wide rate limit
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ ok: false, error: 'RATE_LIMIT_EXCEEDED' })
  }
});
apiRouter.use(apiLimiter);

// Routers from modules
const testRouter = testMod.default || testMod.router || testMod;
const rewardsRouter = rewardsMod.default || rewardsMod.router || rewardsMod;
const farragnaRouter = farragnaDefault || farragnaDefault?.router || farragnaDefault;
const logicodeRouter = logicodeMod.default || logicodeMod.router || logicodeMod;
const corsaRouter = corsaMod.default || corsaMod.router || corsaMod;
const monetizationRouter = monetizationMod.default || monetizationMod.router || monetizationMod;
const samma3nyRouter = samma3nyMod.default || samma3nyMod.router || samma3nyMod;
const nostagliaRouter = nostagliaMod.default || nostagliaMod.router || nostagliaMod;
const pebalaashRouter = pebalaashMod.default || pebalaashMod.router || pebalaashMod;
const codesRouter = codesMod.default || codesMod.router || codesMod;
const settaRouter = settaDefault || settaDefault?.router || settaDefault;
const balloonRouter = balloonMod.default || balloonMod.router || balloonMod;
const adminRouter = adminMod.default || adminMod.router || adminMod;

// Routes
apiRouter.use('/test', testRouter);
apiRouter.get('/health', (req, res) => res.json({ ok: true }));
apiRouter.get('/version', (req, res) => res.json({ version: process.env.APP_VERSION || 'dev' }));

apiRouter.get('/youtube/status', async (req, res) => {
  try {
    const channelId = process.env.YOUTUBE_CHANNEL_ID || 'UCZ5heNyv3s5dIw9mtjsAGsg';
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      try {
        const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`);
        if (r.ok) {
          const j = await r.json();
          const subs = parseInt(j?.items?.[0]?.statistics?.subscriberCount || '0', 10);
          const isMonetized = subs >= 1000;
          const progressPercentage = Math.min((subs / 1000) * 100, 100);
          const remainingSubscribers = Math.max(1000 - subs, 0);
          return res.json({ subscribers: subs, isMonetized, progressPercentage, remainingSubscribers });
        }
      } catch (_) {}
    }
    return res.json({ subscribers: 0, isMonetized: false, progressPercentage: 0, remainingSubscribers: 1000 });
  } catch (_) {
    return res.json({ subscribers: 0, isMonetized: false, progressPercentage: 0, remainingSubscribers: 1000 });
  }
});

apiRouter.get('/flags', (_req, res) => res.json({ ok: true, flags: featureFlags }));
apiRouter.post('/flags', (req, res) => {
  const { key, value } = req.body || {};
  if (!(key in featureFlags)) return res.status(400).json({ ok: false, error: 'UNKNOWN_FLAG' });
  setFlag(key, value);
  res.json({ ok: true, flags: featureFlags });
});

apiRouter.post('/farragna/webhook/cloudflare', farragnaWebhook);

apiRouter.use('/codes', codesRouter);
apiRouter.use('/setta', settaRouter);
apiRouter.use('/rewards', rewardsRouter);
apiRouter.use('/logicode', logicodeRouter);
apiRouter.use('/corsa', corsaRouter);
apiRouter.use('/monetization', monetizationRouter);
apiRouter.use('/samma3ny', samma3nyRouter);
apiRouter.use('/pebalaash', pebalaashRouter);
apiRouter.use('/farragna', farragnaRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/balloon', balloonRouter);

apiRouter.post('/identity/sync', async (req, res) => {
  try {
    const { name, country, religion, telephone, email, userId } = req.body || {};
    if (!email && !userId) return res.json({ ok: true });
    try {
      const col = userId ? 'id' : 'email';
      await query(`UPDATE users SET name = $1, country = $2, religion = $3, phone = $4 WHERE ${col} = $5`, [name || null, country || null, religion || null, telephone || null, userId || email]);
    } catch (_) {}
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: true });
  }
});

apiRouter.post('/sqlite/assets/sync', async (req, res) => {
  try {
    const { userId, code, codes, rewards, source, ts, meta } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const u = await query('SELECT id FROM users WHERE id=$1 LIMIT 1', [userId])
    if (!u?.rows?.[0]) return res.status(404).json({ error: 'User not found' })
    
    const list = Array.isArray(codes) ? codes : (code ? [code] : [])
    let saved = 0
    
    for (const c of list) {
      const codeStr = typeof c === 'string' ? c : (c?.code || '')
      if (!codeStr || codeStr.length < 5) continue
      
      const dup = await query('SELECT id FROM codes WHERE code=$1', [codeStr])
      if (dup?.rows?.length) continue
      
      try {
        await query(
          'INSERT INTO codes (id, user_id, code, type, metadata, created_at) VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)',
          [crypto.randomUUID(), userId, codeStr, 'codes', JSON.stringify({ source: source || 'sqlite', ts, ...(meta || {}) })]
        )
        saved++
      } catch (e) {
        console.error('Error saving code:', e.message)
      }
    }

    if (rewards && typeof rewards === 'number') {
      await query(
        'INSERT INTO user_rewards (user_id, balance, last_updated) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET balance = user_rewards.balance + $2, last_updated = CURRENT_TIMESTAMP',
        [userId, rewards]
      )
    }

    return res.status(200).json({ ok: true, saved, userId })
  } catch (e) {
    console.error('Assets sync error:', e)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
});

apiRouter.get('/sqlite/assets/sync', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    
    const codes = await query('SELECT code, source, created_at, metadata FROM codes WHERE user_id = $1', [userId])
    const rewards = await query('SELECT balance, last_updated FROM user_rewards WHERE user_id = $1', [userId])
    
    return res.status(200).json({
      ok: true,
      codes: codes.rows,
      rewards: rewards.rows[0] || { balance: 0 }
    })
  } catch (e) {
    console.error('Assets sync error:', e)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
});

// Finally mount the consolidated router
app.use('/api', apiRouter);

// [SECURITY] Global error handler - add this at the END of all routes (from actly.md)
app.use((err, req, res, next) => {
  console.error('[ALERT] GLOBAL ERROR:', err);
  console.error('Stack:', err.stack);
  res.status(500).json({ success: false, error: err.message });
});

// Apply DDL (Unified Schema Verification)
async function applyNeonCompressionDDL(){
  // [SECURITY] Ensure columns exist (Fix for "no column named religion")
  try {
    const columns = ['religion', 'country', 'phone'];
    
    // Check existing columns first to avoid "duplicate column" errors in logs
    let existingColumns = [];
    try {
      const tableInfo = await query("PRAGMA table_info(users)", [], { silent: true });
      existingColumns = tableInfo.rows.map(row => {
        if (typeof row === 'object' && row !== null) {
          return (row.name || row[1] || '').toLowerCase();
        }
        return '';
      }).filter(Boolean);
    } catch (e) {
      if (!e.message.includes('ENOTFOUND')) {
        console.warn('[DB] Failed to get table info, will try ALTER TABLE with catch:', e.message);
      }
    }

    for (const col of columns) {
      if (existingColumns.includes(col.toLowerCase())) {
        continue;
      }
      try {
        await query(`ALTER TABLE users ADD COLUMN ${col} TEXT`, [], { silent: true });
        console.log(`[DB] Added missing column: ${col}`);
      } catch (e) {
        // Still ignore if column already exists (fallback)
        if (!e.message.includes('duplicate column name') && !e.message.includes('ENOTFOUND')) {
          console.error(`[DB] Failed to add column ${col}:`, e.message);
        }
      }
    }
  } catch (e) {
    console.error('[DB] Schema migration failed:', e.message);
  }

  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()), 
      email TEXT UNIQUE, 
      username TEXT UNIQUE,
      user_type TEXT DEFAULT 'user',
      password_hash TEXT,
      codes_count INT DEFAULT 0,
      silver_count INT DEFAULT 0,
      gold_count INT DEFAULT 0,
      religion TEXT,
      country TEXT,
      phone TEXT,
      last_sync_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_sync_hash TEXT,
      is_untrusted BOOLEAN DEFAULT 0,
      flagged_reason TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS qarsan_virtual_users (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      email TEXT UNIQUE,
      name TEXT,
      dog_state TEXT,
      qarsan_mode TEXT DEFAULT 'OFF',
      balance INT DEFAULT 0,
      qarsan_wallet INT DEFAULT 0,
      last_fed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS ledger (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      tx_id TEXT NOT NULL,
      tx_hash TEXT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      direction TEXT NOT NULL CHECK (direction IN ('debit','credit')),
      asset_type TEXT NOT NULL,
      amount INT NOT NULL CHECK (amount > 0),
      reference TEXT,
      meta TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS ledger_tx_unique ON ledger (tx_id, user_id, direction)`,
    `CREATE TABLE IF NOT EXISTS user_assets (
      user_id TEXT NOT NULL, 
      asset_id TEXT NOT NULL, 
      PRIMARY KEY(user_id, asset_id)
    )`,
    `CREATE TABLE IF NOT EXISTS event_vault (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      event_type TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '1.0',
      actor_user_id TEXT,
      target_user_id TEXT,
      amount NUMERIC,
      asset_id TEXT,
      metadata TEXT,
      status TEXT NOT NULL DEFAULT 'success',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      tx_hash TEXT UNIQUE
    )`,
    `CREATE TABLE IF NOT EXISTS used_codes (
      code_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      used_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sync_events (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      user_id TEXT NOT NULL REFERENCES users(id),
      delta_codes INT DEFAULT 0,
      delta_silver INT DEFAULT 0,
      delta_gold INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS balances (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      codes_count INT DEFAULT 0,
      silver_count INT DEFAULT 0,
      gold_count INT DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS codes (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL UNIQUE,
      type TEXT DEFAULT 'normal',
      spent BOOLEAN DEFAULT 0,
      is_compressed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_codes_user ON codes(user_id)`,
    `CREATE TABLE IF NOT EXISTS processed_transactions (
      tx_id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS applied_events (
      event_id INT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS event_store (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS balance_projection (
      user_id TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      amount INT DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, asset_type)
    )`,
    `CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      token_hash TEXT,
      user_id TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS event_offsets (
      key TEXT PRIMARY KEY,
      last_id INT DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    "INSERT INTO event_offsets (key, last_id) VALUES ('default', 0) ON CONFLICT (key) DO NOTHING"
  ];
  
  try {
    for (const sql of statements) {
      try { await query(sql) } catch (e) { console.warn('[DB DDL] stmt failed:', e.message) }
    }
    console.log('[OK] [DB] Schema Verified on startup');
  } catch(e) { console.warn('[DB DDL] apply failed:', e.message) }
}

