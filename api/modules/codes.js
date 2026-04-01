import { Router } from 'express'
import { query, batch as dbBatch } from '../config/db.js'
import { getIdentity } from '../middleware/clerk.js'
import { auditLog } from '../utils/audit.js'
import crypto from 'crypto'
import fs from 'fs-extra'
import path from 'path'

const router = Router()

// Configuration
const CODE_LENGTH = 29; // Was 26 - now includes hyphens and P-suffix 
const CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-P[0-9]$/; 
const RATE_LIMIT_SECONDS = 30; 
const CODE_EXPIRY_HOURS = 24; 
const BATCH_INTERVAL = 5 * 60 * 1000; // 5 minutes as recommended in actly.md
const MAX_QUEUE_SIZE = 10000; // Limit to prevent memory/disk bloat
const QUEUE_FILE = path.join(process.cwd(), 'data/pending_codes_queue.json');

// Phase 3: Batch writing optimization with File Persistence
const pendingCodes = []

// Load persisted queue on startup
try {
  if (fs.existsSync(QUEUE_FILE)) {
    const persisted = fs.readJsonSync(QUEUE_FILE);
    if (Array.isArray(persisted) && persisted.length > 0) {
      pendingCodes.push(...persisted);
      console.log(`📦 [CODE BATCHER] Restored ${persisted.length} codes from persistence`);
    }
  }
} catch (err) {
  console.error('⚠️ [CODE BATCHER] Persistence restore failed:', err.message);
}

function saveQueueToDisk() {
  try {
    fs.ensureDirSync(path.dirname(QUEUE_FILE));
    fs.writeJsonSync(QUEUE_FILE, pendingCodes);
  } catch (err) {
    console.error('❌ [CODE BATCHER] Persistence save failed:', err.message);
  }
}

async function flushBatch() {
  if (pendingCodes.length === 0) return
  
  const batchToProcess = [...pendingCodes]
  pendingCodes.length = 0
  saveQueueToDisk(); // Update disk state immediately after clearing memory
  
  console.log(`🚀 [CODE BATCHER] Flushing ${batchToProcess.length} codes to Turso/DB`);
  
  try {
    await dbBatch(batchToProcess.map(c => ({
      sql: `INSERT INTO codes (id, user_id, code, source, expires_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (code) DO NOTHING`,
      args: [c.id, c.userId, c.code, c.source, c.expiresAt, c.metadata]
    })));
    console.log('✅ [CODE BATCHER] Batch flush successful');
  } catch (err) {
    console.error('❌ [CODE BATCHER] Batch flush failed:', err.message);
    // Restore failed batch to queue (at the beginning)
    pendingCodes.unshift(...batchToProcess);
    saveQueueToDisk();
  }
}

// Start batch timer
setInterval(flushBatch, BATCH_INTERVAL);

// Ensure flush on process exit
process.on('SIGTERM', async () => {
  console.log('[CODE BATCHER] SIGTERM received. Flushing pending codes...');
  await flushBatch();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[CODE BATCHER] SIGINT received. Saving queue to disk...');
  saveQueueToDisk();
  process.exit(0);
});

function generateCode() {
  console.warn('[CODE GENERATION] Backend generation deprecated. Use frontend Bankode.generateSecureCode()'); 
  return null; 
}

// Rate limiting storage (in-memory for now, should use Redis in production)
const rateLimitStore = new Map()

function checkRateLimit(userId) {
  const lastCodeTime = rateLimitStore.get(userId)
  const now = Date.now()
  
  if (lastCodeTime && (now - lastCodeTime) < (RATE_LIMIT_SECONDS * 1000)) {
    return false
  }
  
  rateLimitStore.set(userId, now)
  return true
}

// New autosave endpoint for Phase 3
router.post('/save', async (req, res) => {
  const identity = await getIdentity(req)
  if (!identity) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })
  }

  const { code, source, metadata } = req.body
  
  // Input validation
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ ok: false, error: 'INVALID_CODE' })
  }
  
  // 🛡️ STRICT FORMAT VALIDATION 
  if (!CODE_PATTERN.test(code)) { 
    console.error('[CODE SAVE] Invalid format:', code, 'Expected: xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-P[0-9]'); 
    return res.status(400).json({ 
      ok: false, 
      error: 'INVALID_CODE_FORMAT', 
      expected: 'xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-P[0-9]' 
    }); 
  } 
  
  if (!source || !['yt-new', 'game', 'reward'].includes(source)) {
    return res.status(400).json({ ok: false, error: 'INVALID_SOURCE' })
  }

  try {
    // Check rate limiting
    if (!checkRateLimit(identity.userId)) {
      return res.status(429).json({ ok: false, error: 'RATE_LIMIT_EXCEEDED' })
    }

    // Check for duplicate codes (Check both memory queue and DB)
    const inQueue = pendingCodes.some(c => c.code === code)
    if (inQueue) {
      return res.status(409).json({ ok: false, error: 'DUPLICATE_CODE' })
    }

    const duplicateCheck = await query(
      'SELECT id FROM codes WHERE code = $1',
      [code]
    )
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ ok: false, error: 'DUPLICATE_CODE' })
    }

    // Insert code into memory queue for batching (Phase 3 Optimization)
    const expiresAt = new Date(Date.now() + (CODE_EXPIRY_HOURS * 60 * 60 * 1000)).toISOString()
    const codeId = crypto.randomUUID()
    
    pendingCodes.push({
      id: codeId,
      userId: identity.userId,
      code: code,
      source: source,
      expiresAt: expiresAt,
      metadata: metadata ? JSON.stringify(metadata) : null
    });
    saveQueueToDisk(); // Phase 3: Persist new addition

    // If queue reaches max size, flush immediately
    if (pendingCodes.length >= MAX_QUEUE_SIZE) {
      console.log('⚡ [CODE BATCHER] Queue reached MAX_QUEUE_SIZE. Triggering immediate flush.');
      flushBatch();
    }

    // Audit logging (still happens immediately)
    await auditLog({
      actor_user_id: identity.userId,
      actor_role: 'user',
      action: 'CODE_QUEUED',
      target_type: 'code',
      target_id: codeId,
      metadata: {
        code_length: code.length,
        source: source,
        expires_at: expiresAt,
        status: 'queued_for_batch'
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    })

    res.json({
      ok: true,
      code: code,
      source: source,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      message: 'CODE_QUEUED_FOR_SYNC'
    })
  } catch (error) {
    console.error('[CODE SAVE] Error:', error)
    res.status(500).json({ ok: false, error: 'INTERNAL_SERVER_ERROR' })
  }
})

// Legacy endpoints for backward compatibility (can be removed later)
router.get('/last', async (req, res) => {
  const identity = await getIdentity(req)
  if (!identity) return res.status(401).end()
  try {
    const r = await query(
      'SELECT id, code as code, created_at as generated_at FROM codes WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',
      [identity.userId]
    )
    if (!r.rows[0]) return res.status(404).end()
    res.json(r.rows[0])
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch last code' })
  }
})

router.post('/generate', async (req, res) => {
  const identity = await getIdentity(req)
  if (!identity) return res.status(401).end()
  
  // Check rate limiting
  if (!checkRateLimit(identity.userId)) {
    return res.status(429).json({ ok: false, error: 'RATE_LIMIT_EXCEEDED' })
  }

  try {
    const code = generateCode()
    const expiresAt = new Date(Date.now() + (CODE_EXPIRY_HOURS * 60 * 60 * 1000)).toISOString()
    
    const result = await query(
      `INSERT INTO codes (id, user_id, code, source, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO NOTHING
       RETURNING id, code, created_at, expires_at`,
      [crypto.randomUUID(), identity.userId, code, 'legacy', expiresAt]
    )

    const savedCode = result.rows[0]

    // Audit logging
    await auditLog({
      actor_user_id: identity.userId,
      actor_role: 'user',
      action: 'CODE_GENERATED',
      target_type: 'code',
      target_id: savedCode.id,
      metadata: {
        code_length: code.length,
        source: 'legacy'
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    })

    res.json({
      code: savedCode.code,
      created_at: savedCode.created_at,
      expires_at: savedCode.expires_at
    })
  } catch (e) {
    console.error('[CODE GENERATION] Error:', e)
    res.status(500).json({ message: 'Generation failed' })
  }
})

// List user's codes endpoint
router.get('/list', async (req, res) => {
  try {
    const identity = await getIdentity(req)
    if (!identity) {
      return res.status(401).json({ success: false, message: 'UNAUTHORIZED' })
    }

    // Get user's codes
    const result = await query(
      'SELECT code, source, created_at, expires_at FROM codes WHERE user_id = $1 ORDER BY created_at DESC',
      [identity.userId]
    )

    const codes = result.rows.map(row => ({
      code: row.code,
      source: row.source,
      created_at: row.created_at,
      expires_at: row.expires_at
    }))

    res.json({
      success: true,
      codes: codes,
      count: codes.length
    })
  } catch (err) {
    console.error('[CODES LIST ERROR]', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
})

// Send codes endpoint
router.post('/send-codes', async (req, res) => {
  try {
    const identity = await getIdentity(req)
    if (!identity) {
      return res.status(401).json({ success: false, message: 'UNAUTHORIZED' })
    }

    const { codes, receiverEmail } = req.body
    
    // Input validation
    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ success: false, message: 'NO_CODES_SELECTED' })
    }
    
    if (!receiverEmail || typeof receiverEmail !== 'string' || !receiverEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'INVALID_EMAIL' })
    }

    // Prevent self-transfer
    const senderResult = await query(
      'SELECT email FROM users WHERE id = $1',
      [identity.userId]
    )
    
    if (senderResult.rows.length > 0 && senderResult.rows[0].email.toLowerCase() === receiverEmail.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'CANNOT_SEND_TO_SELF' })
    }

    // Check if receiver exists
    const receiverResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [receiverEmail.toLowerCase()]
    )
    
    if (receiverResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'RECEIVER_NOT_FOUND' })
    }

    const receiverId = receiverResult.rows[0].id

    // Verify sender owns the codes
    const codesToSend = []
    for (const code of codes) {
      const codeResult = await query(
        'SELECT id, code FROM codes WHERE code = $1 AND user_id = $2',
        [code, identity.userId]
      )
      
      if (codeResult.rows.length > 0) {
        codesToSend.push(codeResult.rows[0])
      }
    }

    if (codesToSend.length === 0) {
      return res.status(403).json({ success: false, message: 'NO_CODES_OWNED' })
    }

    // Transfer codes to receiver
    for (const codeData of codesToSend) {
      await query(
        'UPDATE codes SET user_id = $1 WHERE id = $2',
        [receiverId, codeData.id]
      )

      // Audit logging
      await auditLog({
        actor_user_id: identity.userId,
        actor_role: 'user',
        action: 'CODE_SENT',
        target_type: 'code',
        target_id: codeData.id,
        metadata: {
          code: codeData.code,
          receiver_email: receiverEmail,
          receiver_id: receiverId
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      })
    }

    res.json({
      success: true,
      message: 'CODES_SENT_SUCCESSFULLY',
      sentCodesCount: codesToSend.length,
      receiverEmail: receiverEmail
    })
  } catch (err) {
    console.error('[SEND-CODES ERROR]', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
})

export default router
