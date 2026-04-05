import { Router } from 'express'
import { query, pool } from '../config/db.js'
import fetch from 'node-fetch'
import { grantReward } from './rewards.js'
import multer from 'multer'
import cloudinary from 'cloudinary'
import fs from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'
import { requireFarragnaAuth, softFarragnaAuth } from '../middleware/farragna-auth.js'

const JWT_SECRET = process.env.JWT_SECRET || 'secret-demo'

// ─────────────────────────────────────────
// SCHEMA MIGRATION: Add missing columns safely
// ─────────────────────────────────────────
async function runFarragnaSchemaSetup() {
  const migrations = [
    // Core farragna_videos table (create if not exists)
    `CREATE TABLE IF NOT EXISTS farragna_videos (
      id TEXT PRIMARY KEY,
      owner_id TEXT,
      stream_uid TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'processing',
      url TEXT,
      playback_url TEXT,
      thumbnail_url TEXT,
      caption TEXT DEFAULT 'Untitled',
      category TEXT DEFAULT 'entertainment',
      cloud_public_id TEXT,
      duration INTEGER DEFAULT 0,
      size BIGINT DEFAULT 0,
      views_count INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0,
      comments_count INTEGER NOT NULL DEFAULT 0,
      rewards_earned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    // Add missing columns if they don't exist (safe migrations)
    `ALTER TABLE farragna_videos ADD COLUMN url TEXT`,
    `ALTER TABLE farragna_videos ADD COLUMN thumbnail_url TEXT`,
    `ALTER TABLE farragna_videos ADD COLUMN caption TEXT DEFAULT 'Untitled'`,
    `ALTER TABLE farragna_videos ADD COLUMN category TEXT DEFAULT 'entertainment'`,
    `ALTER TABLE farragna_videos ADD COLUMN cloud_public_id TEXT`,
    `ALTER TABLE farragna_videos ADD COLUMN likes INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE farragna_videos ADD COLUMN comments_count INTEGER NOT NULL DEFAULT 0`,
    // Views table
    `CREATE TABLE IF NOT EXISTS farragna_views (
      id TEXT PRIMARY KEY,
      video_id UUID NOT NULL,
      viewer_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(video_id, viewer_id)
    )`,
    // Likes table
    `CREATE TABLE IF NOT EXISTS farragna_likes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id UUID NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, video_id)
    )`,
    // Comments table
    `CREATE TABLE IF NOT EXISTS farragna_comments (
      id TEXT PRIMARY KEY,
      video_id UUID NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    // Indexes for performance
    `CREATE INDEX IF NOT EXISTS idx_farragna_videos_status ON farragna_videos(status)`,
    `CREATE INDEX IF NOT EXISTS idx_farragna_videos_created ON farragna_videos(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_farragna_videos_stream_uid ON farragna_videos(stream_uid)`,
    `CREATE INDEX IF NOT EXISTS idx_farragna_views_video ON farragna_views(video_id)`,
    `CREATE INDEX IF NOT EXISTS idx_farragna_likes_video ON farragna_likes(video_id)`,
    // Like transactions (replaces simple farragna_likes for paid likes)
    `CREATE TABLE IF NOT EXISTS farragna_like_transactions (
      id TEXT PRIMARY KEY,
      giver_id TEXT NOT NULL,
      video_id UUID NOT NULL,
      like_type TEXT NOT NULL,
      codes_value INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(giver_id, video_id, like_type)
    )`,
    // Wallets table (ensure exists for codes)
    `CREATE TABLE IF NOT EXISTS wallets (
      user_id TEXT PRIMARY KEY,
      codes BIGINT NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    // Index on like transactions
    `CREATE INDEX IF NOT EXISTS idx_farragna_like_tx_video ON farragna_like_transactions(video_id)`,
    `CREATE INDEX IF NOT EXISTS idx_farragna_like_tx_giver ON farragna_like_transactions(giver_id)`,
    // likes_breakdown column on videos
    `ALTER TABLE farragna_videos ADD COLUMN likes_breakdown TEXT DEFAULT '{"like":0,"super":0,"mega":0,"drd":0}'`,
  ]
  for (const sql of migrations) {
    try { await query(sql) } catch (e) {
      // Only warn, don't crash - migrations may partially fail on some DBs
      console.warn('[Farragna Schema]', e.message?.slice(0, 120))
    }
  }
  console.log('[Farragna] Schema migration complete')
}

// Run migration on startup (non-blocking)
runFarragnaSchemaSetup().catch(e => console.warn('[Farragna] Schema setup failed:', e.message))

// Like constants
const LIKE_TYPES = {
  like: 1,
  super: 10,
  mega: 100,
  drd: 1000
}
const ADMIN_EMAIL = 'dia201244@gmail.com'

// Rate limiting for uploads (DB-backed, 1 video/day for non-admin)
async function checkUploadRateLimit(userId, email) {
  if (email === 'dia201244@gmail.com') return { allowed: true }
  try {
    const r = await query(
      `SELECT COUNT(*) as count FROM farragna_videos WHERE owner_id=$1 AND created_at >= CURRENT_DATE`,
      [userId]
    )
    const count = parseInt(r.rows[0]?.count || 0)
    if (count >= 1) return { allowed: false, reason: 'Daily upload limit reached (1 video per day)' }
  } catch (e) { /* allow on error */ }
  return { allowed: true }
}

const router = Router()

// CORS middleware — allow same-origin and trusted origins
router.use((req, res, next) => {
  const origin = req.headers.origin
  const allowedOrigins = [
    'https://drd2027.onrender.com',
    'http://localhost:3000',
    'http://localhost:3001',
  ]
  if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
    res.header('Access-Control-Allow-Origin', origin || '*')
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  res.header('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// Configure multer
const upload = multer({
  dest: '/tmp/',
  limits: { fileSize: 500 * 1024 * 1024, files: 50, fieldSize: 100 * 1024 * 1024, fields: 20 },
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/avi', 'video/mov']
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'))
  }
})

// Configure Cloudinary (if available)
try {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (cloudName && apiKey && apiSecret) {
    cloudinary.v2.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })
  }
} catch (_) {}

// Helper: Cloudflare headers
function cfHeaders() {
  const token = process.env.CLOUDFLARE_STREAM_TOKEN || process.env.farragna_cloudflare_tokens_api
  if (!token) throw new Error('CF_TOKEN_MISSING')
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
}

function cfAccountId() {
  const id = process.env.Farragna_cloudflare_account_id || process.env.CLOUDFLARE_ACCOUNT_ID
  if (!id) throw new Error('CF_ACCOUNT_MISSING')
  return id.replace(/\s+/g, '')
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

function extractMetadataFromFilename(filename) {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
  let title = nameWithoutExt
  let artist = 'Unknown Creator'
  for (const sep of [' - ', '_-_', '__', ' – ']) {
    if (nameWithoutExt.includes(sep)) {
      const parts = nameWithoutExt.split(sep)
      if (parts.length >= 2) {
        artist = parts[0].trim()
        title = parts.slice(1).join(sep).trim()
        break
      }
    }
  }
  return { title: title || nameWithoutExt, artist }
}

// ─────────────────────────────────────────
// AUTH: Token Exchange
// Exchange session cookie for a Farragna JWT token
// ─────────────────────────────────────────
router.get('/auth/token', async (req, res) => {
  try {
    const sessionToken = (req.cookies && req.cookies.session_token) || null
    if (!sessionToken) return res.status(401).json({ ok: false, error: 'No session' })

    // Look up session in devSessions (set by main server)
    const devSessions = req.app.get('devSessions')
    let userId = null
    let email = null

    if (devSessions) {
      const s = devSessions.get(sessionToken)
      if (s) { userId = s.userId; email = s.email }
    }

    if (!userId) {
      // DB fallback
      try {
        const r = await query('SELECT user_id FROM auth_sessions WHERE token=$1', [sessionToken])
        if (r.rows && r.rows.length > 0) {
          userId = r.rows[0].user_id
          const ur = await query('SELECT email FROM users WHERE id=$1', [userId])
          if (ur.rows && ur.rows.length > 0) email = ur.rows[0].email
        }
      } catch (_) {}
    }

    if (!userId) return res.status(401).json({ ok: false, error: 'Invalid session' })

    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ ok: true, token, userId, email })
  } catch (e) {
    console.error('[Farragna] Token exchange error:', e)
    res.status(500).json({ ok: false, error: 'Token exchange failed' })
  }
})

// ─────────────────────────────────────────
// FEED: Public video feed (no auth needed)
// ─────────────────────────────────────────
router.get('/feed', async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
  const pageSize = Math.min(parseInt(req.query.page_size, 10) || 20, 100)
  const category = req.query.category || null
  const offset = (page - 1) * pageSize
  try {
    let q, params
    if (category && category !== 'all') {
      q = `SELECT id, owner_id, url, playback_url, thumbnail_url, caption, category, duration, views_count, likes, comments_count, rewards_earned, created_at
           FROM farragna_videos WHERE status='ready' AND category=$3
           ORDER BY created_at DESC LIMIT $1 OFFSET $2`
      params = [pageSize, offset, category]
    } else {
      q = `SELECT id, owner_id, url, playback_url, thumbnail_url, caption, category, duration, views_count, likes, comments_count, rewards_earned, created_at
           FROM farragna_videos WHERE status='ready'
           ORDER BY created_at DESC LIMIT $1 OFFSET $2`
      params = [pageSize, offset]
    }
    const r = await query(q, params)
    res.json({ ok: true, videos: r.rows, page, page_size: pageSize })
  } catch (e) {
    console.error('[Farragna] Feed error:', e)
    res.status(500).json({ ok: false, error: 'FEED_ERROR', videos: [] })
  }
})

// ─────────────────────────────────────────
// TRENDING: Scored by views + recency
// ─────────────────────────────────────────
router.get('/trending', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100)
  try {
    const r = await query(
      `SELECT id, owner_id, url, playback_url, thumbnail_url, caption, category, duration, views_count, likes, comments_count, rewards_earned, created_at
       FROM farragna_videos WHERE status='ready'
       ORDER BY (views_count * 1.5 + likes * 3 + (julianday('now') - julianday(created_at)) * -24.0) DESC
       LIMIT $1`,
      [limit]
    )
    res.json({ ok: true, videos: r.rows })
  } catch (e) {
    console.error('[Farragna] Trending error:', e)
    res.status(500).json({ ok: false, error: 'TRENDING_ERROR', videos: [] })
  }
})

// ─────────────────────────────────────────
// SEARCH: Search videos by caption/category
// ─────────────────────────────────────────
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim()
  if (!q) return res.json({ ok: true, videos: [] })
  try {
    const r = await query(
      `SELECT id, owner_id, url, playback_url, thumbnail_url, caption, category, views_count, likes, created_at
       FROM farragna_videos WHERE status='ready' AND (caption LIKE $1 OR category LIKE $1)
       ORDER BY views_count DESC LIMIT 50`,
      [`%${q}%`]
    )
    res.json({ ok: true, videos: r.rows })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'SEARCH_ERROR', videos: [] })
  }
})

// ─────────────────────────────────────────
// VIEW VIDEO: Record view and reward creator
// ─────────────────────────────────────────
router.post('/:id/view', softFarragnaAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const id = req.params.id
    const vres = await client.query('SELECT id, owner_id, status, url, playback_url FROM farragna_videos WHERE id=$1', [id])
    const v = vres.rows[0]
    if (!v) { await client.query('ROLLBACK'); return res.status(404).json({ ok: false, error: 'NOT_FOUND' }) }
    if (v.status !== 'ready') { await client.query('ROLLBACK'); return res.status(404).json({ ok: false, error: 'NOT_READY' }) }

    let viewerKey = req.user?.id || req.ip
    const exists = await client.query('SELECT 1 FROM farragna_views WHERE video_id=$1 AND viewer_id=$2', [id, viewerKey])
    if (!exists.rowCount) {
      try {
        await client.query('INSERT INTO farragna_views (id, video_id, viewer_id, created_at) VALUES ($1,$2,$3,NOW())', [crypto.randomUUID(), id, viewerKey])
        await client.query('UPDATE farragna_videos SET views_count=views_count+1, rewards_earned=rewards_earned+1 WHERE id=$1', [id])
      } catch (_) {
        await client.query('UPDATE farragna_videos SET views_count=views_count+1 WHERE id=$1', [id])
      }
    }
    await client.query('COMMIT')

    if (!exists.rowCount && v.owner_id) {
      try { await grantReward({ userId: v.owner_id, amount: 1, source: 'watch', meta: { video_id: id } }) } catch (_) {}
    }

    res.json({ ok: true, id: v.id, playback_url: v.playback_url || v.url, status: v.status })
  } catch (e) {
    try { await client.query('ROLLBACK') } catch (_) {}
    res.status(500).json({ ok: false, error: 'VIEW_ERROR' })
  } finally {
    try { client.release() } catch (_) {}
  }
})

// ─────────────────────────────────────────
// LIKE SYSTEM (4-tier: like=1, super=10, mega=100, drd=1000 codes)
// ─────────────────────────────────────────
router.get('/me/balance', requireFarragnaAuth, async (req, res) => {
  try {
    const r = await query('SELECT codes FROM wallets WHERE user_id=$1', [req.user.id])
    res.json({ success: true, codes: parseInt(r.rows[0]?.codes || 0) })
  } catch (e) {
    res.status(500).json({ success: false, codes: 0 })
  }
})

router.post('/:id/like', requireFarragnaAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const videoId = req.params.id
    const userId = req.user.id
    const userEmail = req.user.email || ''
    const likeType = req.body.like_type || 'like'

    // Validate like type
    if (!LIKE_TYPES[likeType]) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, error: 'Invalid like_type. Use: like, super, mega, drd' })
    }

    // Dr.D like: admin only
    if (likeType === 'drd' && userEmail !== ADMIN_EMAIL) {
      await client.query('ROLLBACK')
      return res.status(403).json({ success: false, error: 'Dr.D like is admin only' })
    }

    // Get video info
    const vres = await client.query('SELECT id, owner_id FROM farragna_videos WHERE id=$1', [videoId])
    const video = vres.rows[0]
    if (!video) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, error: 'Video not found' })
    }

    // Can't like own video
    if (video.owner_id === userId) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, error: 'Cannot like your own video' })
    }

    // Check duplicate like
    const dupCheck = await client.query(
      'SELECT 1 FROM farragna_like_transactions WHERE giver_id=$1 AND video_id=$2 AND like_type=$3',
      [userId, videoId, likeType]
    )
    if (dupCheck.rowCount) {
      await client.query('ROLLBACK')
      return res.status(409).json({ success: false, error: 'Already gave this like type to this video' })
    }

    const codesValue = LIKE_TYPES[likeType]
    const receiverId = video.owner_id

    // Deduct from giver's wallet (skip for admin Dr.D like)
    if (likeType !== 'drd') {
      // Ensure giver wallet exists
      await client.query(
        'INSERT INTO wallets (user_id, codes) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING',
        [userId]
      )
      const walletRes = await client.query('SELECT codes FROM wallets WHERE user_id=$1', [userId])
      const currentBalance = parseInt(walletRes.rows[0]?.codes || 0)
      if (currentBalance < codesValue) {
        await client.query('ROLLBACK')
        return res.status(402).json({ success: false, error: `Insufficient codes. Need ${codesValue}, have ${currentBalance}` })
      }
      await client.query('UPDATE wallets SET codes = codes - $1, updated_at = NOW() WHERE user_id=$2', [codesValue, userId])
    }

    // Credit to receiver's wallet
    if (receiverId) {
      await client.query(
        'INSERT INTO wallets (user_id, codes) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET codes = wallets.codes + EXCLUDED.codes, updated_at = NOW()',
        [receiverId, codesValue]
      )
    }

    // Record transaction
    await client.query(
      'INSERT INTO farragna_like_transactions (id, giver_id, video_id, like_type, codes_value, created_at) VALUES ($1,$2,$3,$4,$5,NOW())',
      [crypto.randomUUID(), userId, videoId, likeType, codesValue]
    )

    // Update video likes count and breakdown
    await client.query(
      `UPDATE farragna_videos SET likes=likes+1,
       likes_breakdown = jsonb_set(COALESCE(likes_breakdown,'{"like":0,"super":0,"mega":0,"drd":0}'::jsonb), $2::text[], 
         (COALESCE((likes_breakdown->$3)::int,0)+1)::text::jsonb)
       WHERE id=$1`,
      [videoId, `{${likeType}}`, likeType]
    )

    await client.query('COMMIT')

    // Get new balances
    let giverBalance = null
    let receiverBalance = null
    try {
      if (likeType !== 'drd') {
        const gb = await query('SELECT codes FROM wallets WHERE user_id=$1', [userId])
        giverBalance = parseInt(gb.rows[0]?.codes || 0)
      }
      if (receiverId) {
        const rb = await query('SELECT codes FROM wallets WHERE user_id=$1', [receiverId])
        receiverBalance = parseInt(rb.rows[0]?.codes || 0)
      }
    } catch (_) {}

    return res.json({
      success: true,
      like_type: likeType,
      codes_value: codesValue,
      giver_balance: giverBalance,
      receiver_balance: receiverBalance
    })
  } catch (e) {
    try { await client.query('ROLLBACK') } catch (_) {}
    console.error('[Farragna] Like error:', e)
    res.status(500).json({ success: false, error: 'LIKE_ERROR', message: e.message })
  } finally {
    try { client.release() } catch (_) {}
  }
})

router.get('/:id/likes', softFarragnaAuth, async (req, res) => {
  try {
    const videoId = req.params.id
    const userId = req.user?.id
    const vres = await query('SELECT likes, likes_breakdown FROM farragna_videos WHERE id=$1', [videoId])
    const video = vres.rows[0]
    let myLikes = {}
    if (userId) {
      const r = await query('SELECT like_type FROM farragna_like_transactions WHERE giver_id=$1 AND video_id=$2', [userId, videoId])
      r.rows.forEach(row => { myLikes[row.like_type] = true })
    }
    res.json({
      success: true,
      count: video?.likes || 0,
      breakdown: video?.likes_breakdown || { like: 0, super: 0, mega: 0, drd: 0 },
      my_likes: myLikes
    })
  } catch (e) {
    res.status(500).json({ success: false, error: 'LIKES_ERROR' })
  }
})

// ─────────────────────────────────────────
// UPLOAD REQUEST: Get Cloudflare direct upload URL
// ─────────────────────────────────────────
router.post('/upload/request', requireFarragnaAuth, async (req, res) => {
  const limit = await checkUploadRateLimit(req.user.id, req.user.email)
  if (!limit.allowed) return res.status(429).json({ success: false, error: limit.reason })
  try {
    const id = cfAccountId()
    const url = `https://api.cloudflare.com/client/v4/accounts/${id}/stream/direct_upload`
    const body = {
      maxDurationSeconds: 3600,
      requireSignedURLs: false,
      allowedOrigins: ['*'],
      meta: {
        caption: req.body.caption || 'Untitled',
        category: req.body.category || 'entertainment',
        uploaded_by: req.user.id
      }
    }
    const r = await fetch(url, { method: 'POST', headers: cfHeaders(), body: JSON.stringify(body) })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      console.error('[Farragna] CF direct upload error:', err)
      return res.status(500).json({ ok: false, error: 'CF_DIRECT_UPLOAD_FAILED', details: err?.errors })
    }
    const data = await r.json()
    const upload_url = data?.result?.uploadURL
    const stream_uid = data?.result?.uid
    if (!upload_url || !stream_uid) return res.status(500).json({ ok: false, error: 'CF_RESPONSE_INVALID' })

    // Pre-create DB record
    try {
      await query(
        `INSERT INTO farragna_videos (id, owner_id, stream_uid, status, url, caption, category, views_count, likes, created_at)
         VALUES ($1, $2, $3, 'processing', $4, $5, $6, 0, 0, NOW())
         ON CONFLICT DO NOTHING`,
        [
          crypto.randomUUID(),
          req.user.id,
          stream_uid,
          `https://customer-${id}.cloudflarestream.com/${stream_uid}/manifest/video.m3u8`,
          req.body.caption || 'Untitled',
          req.body.category || 'entertainment'
        ]
      )
    } catch (dbErr) { console.warn('[Farragna] DB pre-create failed:', dbErr.message) }

    res.json({ ok: true, upload_url, stream_uid })
  } catch (e) {
    console.error('[Farragna] Upload request error:', e)
    res.status(500).json({ ok: false, error: 'UPLOAD_REQUEST_ERROR', message: e.message })
  }
})

// ─────────────────────────────────────────
// CLOUDFLARE WEBHOOK: Update video status when ready
// ─────────────────────────────────────────
export async function webhookCloudflare(req, res) {
  try {
    const secret = process.env.CF_STREAM_WEBHOOK_SECRET
    if (secret) {
      const hdr = req.headers['x-webhook-token'] || req.headers['x-cf-webhook-token'] || req.headers['webhook-secret']
      if (hdr !== secret) return res.status(403).json({ ok: false })
    }
    const body = req.body || {}
    const uid = body?.uid || body?.video?.uid
    const status = body?.status || body?.video?.status?.state
    const duration = Math.floor(body?.duration || body?.video?.duration || 0)
    const size = Math.floor(body?.size || body?.video?.size || 0)
    const hls = body?.playback?.hls || body?.video?.playback?.hls

    if (!uid) return res.status(400).json({ ok: false, error: 'MISSING_UID' })

    let newStatus = 'processing'
    if (['ready', 'success'].includes(status)) newStatus = 'ready'
    else if (['error', 'failed'].includes(status)) newStatus = 'failed'

    try {
      await query(
        `UPDATE farragna_videos SET status=$2, playback_url=COALESCE($3, playback_url), duration=COALESCE($4, duration), size=COALESCE($5, size)
         WHERE stream_uid=$1`,
        [uid, newStatus, hls || null, duration || null, size || null]
      )
    } catch (dbErr) { console.warn('[Farragna] Webhook DB update failed:', dbErr.message) }

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false })
  }
}

router.post('/webhook/cloudflare', webhookCloudflare)

// ─────────────────────────────────────────
// SEED: Import free Pexels/free videos into DB
// ─────────────────────────────────────────
router.post('/seed', requireFarragnaAuth, async (req, res) => {
  const videos = req.body.videos
  if (!Array.isArray(videos) || videos.length === 0) {
    return res.status(400).json({ ok: false, error: 'No videos provided' })
  }

  const results = []
  const errors = []
  const ownerId = req.user.id

  for (const v of videos) {
    if (!v.url) { errors.push({ url: v.url, error: 'Missing URL' }); continue }
    try {
      const r = await query(
        `INSERT INTO farragna_videos (id, owner_id, url, playback_url, thumbnail_url, caption, category, status, views_count, likes, created_at)
         VALUES ($1, $2, $3, $3, $4, $5, $6, 'ready', $7, $8, NOW())
         ON CONFLICT DO NOTHING RETURNING id`,
        [
          crypto.randomUUID(),
          ownerId,
          v.url,
          v.thumbnail_url || null,
          v.caption || 'Free stock video',
          v.category || 'entertainment',
          v.views || 0,
          v.likes || 0
        ]
      )
      if (r.rows && r.rows.length > 0) {
        results.push({ id: r.rows[0].id, url: v.url, status: 'inserted' })
      } else {
        results.push({ url: v.url, status: 'skipped (duplicate)' })
      }
    } catch (e) {
      errors.push({ url: v.url, error: e.message })
    }
  }

  res.json({
    ok: true,
    inserted: results.filter(r => r.status === 'inserted').length,
    skipped: results.filter(r => r.status !== 'inserted').length,
    errors: errors.length,
    results,
    error_details: errors
  })
})

// ─────────────────────────────────────────
// UPLOAD: Simple single file upload
// ─────────────────────────────────────────
router.post('/upload/simple', requireFarragnaAuth, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' })

    let videoUrl = null
    let cloudPublicId = null

    // Try Cloudflare Stream upload
    try {
      const id = cfAccountId()
      const uploadReq = await fetch(`https://api.cloudflare.com/client/v4/accounts/${id}/stream/direct_upload`, {
        method: 'POST',
        headers: cfHeaders(),
        body: JSON.stringify({ maxDurationSeconds: 3600, requireSignedURLs: false })
      })
      if (uploadReq.ok) {
        const uploadData = await uploadReq.json()
        const uploadUrl = uploadData?.result?.uploadURL
        const uid = uploadData?.result?.uid

        if (uploadUrl && uid) {
          const fileBuffer = fs.readFileSync(req.file.path)
          const cfUpload = await fetch(uploadUrl, {
            method: 'POST',
            body: fileBuffer,
            headers: { 'Content-Type': req.file.mimetype }
          })
          if (cfUpload.ok || cfUpload.status === 204) {
            videoUrl = `https://customer-${id}.cloudflarestream.com/${uid}/manifest/video.m3u8`
            cloudPublicId = uid
          }
        }
      }
    } catch (cfErr) { console.warn('[Farragna] CF upload failed, trying Cloudinary:', cfErr.message) }

    // Fallback to Cloudinary
    if (!videoUrl) {
      try {
        const result = await cloudinary.v2.uploader.upload(req.file.path, {
          resource_type: 'video',
          folder: 'farragna',
          format: 'mp4',
          quality: 'auto'
        })
        videoUrl = result.secure_url
        cloudPublicId = result.public_id
      } catch (clErr) { console.warn('[Farragna] Cloudinary upload failed:', clErr.message) }
    }

    // Cleanup temp file
    try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path) } catch (_) {}

    if (!videoUrl) return res.status(500).json({ success: false, error: 'All upload methods failed' })

    // Save to DB
    const meta = extractMetadataFromFilename(req.file.originalname)
    try {
      const r = await query(
        `INSERT INTO farragna_videos (id, owner_id, url, playback_url, cloud_public_id, caption, category, status, views_count, likes, created_at)
         VALUES ($1,$2,$3,$3,$4,$5,$6,'ready',0,0,NOW()) RETURNING id`,
        [crypto.randomUUID(), req.user.id, videoUrl, cloudPublicId, req.body.caption || meta.title, req.body.category || 'entertainment']
      )
      res.json({ success: true, id: r.rows[0]?.id, url: videoUrl })
    } catch (dbErr) {
      res.json({ success: true, url: videoUrl, warning: 'DB save failed: ' + dbErr.message })
    }
  } catch (e) {
    console.error('[Farragna] Simple upload error:', e)
    res.status(500).json({ success: false, error: 'Upload failed: ' + e.message })
  }
})

// ─────────────────────────────────────────
// UPLOAD: Bulk multi-file upload
// ─────────────────────────────────────────
router.post('/upload', requireFarragnaAuth, upload.any(), async (req, res) => {
  try {
    const files = req.files
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' })
    }

    console.log(`[Farragna] Starting bulk upload for ${files.length} files`)
    const uploadResults = []
    const errors = []
    let successCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        if (!file.mimetype.startsWith('video/')) {
          errors.push({ file: file.originalname, error: 'Not a video file' })
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path)
          continue
        }
        if (file.size > 500 * 1024 * 1024) {
          errors.push({ file: file.originalname, error: 'File too large (max 500MB)' })
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path)
          continue
        }

        const meta = extractMetadataFromFilename(file.originalname)
        let videoUrl = null
        let cloudPublicId = null

        // Try Cloudinary first (batch-friendly)
        try {
          const result = await cloudinary.v2.uploader.upload(file.path, {
            resource_type: 'video',
            folder: 'farragna',
            format: 'mp4',
            quality: 'auto',
            context: { title: meta.title, creator: meta.artist }
          })
          videoUrl = result.secure_url
          cloudPublicId = result.public_id
        } catch (clErr) {
          console.warn(`[Farragna] Cloudinary failed for ${file.originalname}:`, clErr.message)
        }

        if (fs.existsSync(file.path)) fs.unlinkSync(file.path)

        if (!videoUrl) {
          errors.push({ file: file.originalname, error: 'Upload service unavailable' })
          continue
        }

        try {
          const r = await query(
            `INSERT INTO farragna_videos (id, owner_id, url, playback_url, cloud_public_id, caption, category, status, views_count, likes, created_at)
             VALUES ($1,$2,$3,$3,$4,$5,$6,'ready',0,0,NOW()) RETURNING id`,
            [crypto.randomUUID(), req.user.id, videoUrl, cloudPublicId, meta.title, req.body.category || 'entertainment']
          )
          uploadResults.push({ success: true, file: file.originalname, url: videoUrl, id: r.rows[0]?.id, size: formatFileSize(file.size) })
          successCount++
        } catch (dbErr) {
          uploadResults.push({ success: true, file: file.originalname, url: videoUrl, warning: 'DB save failed', size: formatFileSize(file.size) })
          successCount++
        }
      } catch (fileErr) {
        errors.push({ file: file.originalname, error: fileErr.message })
        if (fs.existsSync(file.path)) try { fs.unlinkSync(file.path) } catch (_) {}
      }
    }

    console.log(`[Farragna] Bulk upload: ${successCount}/${files.length} successful`)
    res.json({
      total_files: files.length,
      successful_uploads: successCount,
      failed_uploads: errors.length,
      results: uploadResults,
      errors,
      summary: `${successCount} videos uploaded successfully`
    })
  } catch (e) {
    console.error('[Farragna] Bulk upload error:', e)
    res.status(500).json({ error: 'Bulk upload failed', message: e.message, successful_uploads: 0, failed_uploads: 0 })
  }
})

// ─────────────────────────────────────────
// ADMIN: List ALL videos (including restricted)
// ─────────────────────────────────────────
router.get('/admin/videos', requireFarragnaAuth, async (req, res) => {
  try {
    const status = req.query.status || null
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const pageSize = Math.min(parseInt(req.query.page_size, 10) || 50, 200)
    const offset = (page - 1) * pageSize

    let q, params
    if (status && status !== 'all') {
      q = `SELECT id, owner_id, url, playback_url, thumbnail_url, caption, category, status, duration, size, views_count, likes, comments_count, rewards_earned, created_at
           FROM farragna_videos WHERE status=$3 ORDER BY created_at DESC LIMIT $1 OFFSET $2`
      params = [pageSize, offset, status]
    } else {
      q = `SELECT id, owner_id, url, playback_url, thumbnail_url, caption, category, status, duration, size, views_count, likes, comments_count, rewards_earned, created_at
           FROM farragna_videos ORDER BY created_at DESC LIMIT $1 OFFSET $2`
      params = [pageSize, offset]
    }

    const r = await query(q, params)
    const countR = await query('SELECT COUNT(*) FROM farragna_videos' + (status && status !== 'all' ? ' WHERE status=$1' : ''), status && status !== 'all' ? [status] : [])
    res.json({ ok: true, videos: r.rows, total: parseInt(countR.rows[0]?.count || '0'), page, page_size: pageSize })
  } catch (e) {
    console.error('[Farragna] Admin videos error:', e)
    res.status(500).json({ ok: false, error: 'ADMIN_VIDEOS_ERROR' })
  }
})

// ─────────────────────────────────────────
// ADMIN: Moderate a video (approve/restrict/delete)
// ─────────────────────────────────────────
router.patch('/admin/videos/:id', requireFarragnaAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { action } = req.body // 'approve', 'restrict', 'delete'

    if (!['approve', 'restrict', 'delete'].includes(action)) {
      return res.status(400).json({ ok: false, error: 'Invalid action. Use: approve, restrict, delete' })
    }

    if (action === 'delete') {
      // Cascade delete via FK constraints
      await query('DELETE FROM farragna_likes WHERE video_id=$1', [id])
      await query('DELETE FROM farragna_views WHERE video_id=$1', [id])
      await query('DELETE FROM farragna_comments WHERE video_id=$1', [id])
      await query('DELETE FROM farragna_videos WHERE id=$1', [id])
      return res.json({ ok: true, action: 'deleted', id })
    }

    const newStatus = action === 'approve' ? 'ready' : 'restricted'
    await query('UPDATE farragna_videos SET status=$2 WHERE id=$1', [id, newStatus])
    res.json({ ok: true, action, id, new_status: newStatus })
  } catch (e) {
    console.error('[Farragna] Admin moderate error:', e)
    res.status(500).json({ ok: false, error: 'MODERATE_ERROR', message: e.message })
  }
})

// ─────────────────────────────────────────
// ADMIN: Bulk moderation
// ─────────────────────────────────────────
router.post('/admin/videos/bulk', requireFarragnaAuth, async (req, res) => {
  try {
    const { ids, action } = req.body
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ ok: false, error: 'No IDs provided' })
    if (!['approve', 'restrict', 'delete'].includes(action)) return res.status(400).json({ ok: false, error: 'Invalid action' })

    let affected = 0
    for (const id of ids) {
      try {
        if (action === 'delete') {
          await query('DELETE FROM farragna_likes WHERE video_id=$1', [id])
          await query('DELETE FROM farragna_views WHERE video_id=$1', [id])
          await query('DELETE FROM farragna_comments WHERE video_id=$1', [id])
          await query('DELETE FROM farragna_videos WHERE id=$1', [id])
        } else {
          const newStatus = action === 'approve' ? 'ready' : 'restricted'
          await query('UPDATE farragna_videos SET status=$2 WHERE id=$1', [id, newStatus])
        }
        affected++
      } catch (_) {}
    }
    res.json({ ok: true, affected, action })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'BULK_MODERATE_ERROR' })
  }
})

// ─────────────────────────────────────────
// ADMIN: Analytics overview
// ─────────────────────────────────────────
router.get('/admin/analytics', requireFarragnaAuth, async (req, res) => {
  try {
    const [total, ready, processing, restricted] = await Promise.all([
      query('SELECT COUNT(*) as count, COALESCE(SUM(views_count),0) as views, COALESCE(SUM(likes),0) as likes FROM farragna_videos'),
      query("SELECT COUNT(*) as count FROM farragna_videos WHERE status='ready'"),
      query("SELECT COUNT(*) as count FROM farragna_videos WHERE status='processing'"),
      query("SELECT COUNT(*) as count FROM farragna_videos WHERE status='restricted'")
    ])
    const topVideos = await query(
      `SELECT id, caption, category, views_count, likes, created_at FROM farragna_videos WHERE status='ready'
       ORDER BY views_count DESC LIMIT 10`
    )
    const dailyUploads = await query(
      `SELECT DATE(created_at) as date, COUNT(*) as count FROM farragna_videos
       WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30`
    )
    res.json({
      ok: true,
      stats: {
        total_videos: parseInt(total.rows[0]?.count || 0),
        total_views: parseInt(total.rows[0]?.views || 0),
        total_likes: parseInt(total.rows[0]?.likes || 0),
        ready: parseInt(ready.rows[0]?.count || 0),
        processing: parseInt(processing.rows[0]?.count || 0),
        restricted: parseInt(restricted.rows[0]?.count || 0)
      },
      top_videos: topVideos.rows,
      daily_uploads: dailyUploads.rows
    })
  } catch (e) {
    console.error('[Farragna] Analytics error:', e)
    res.status(500).json({ ok: false, error: 'ANALYTICS_ERROR' })
  }
})

// Legacy admin routes (delegate to new admin endpoints)
router.all('/admin/views', async (req, res) => {
  try {
    const { default: adminViewsHandler } = await import('../../api/admin/views.js')
    await adminViewsHandler(req, res)
  } catch (error) {
    res.status(500).json({ error: 'Admin API error' })
  }
})

export default router
