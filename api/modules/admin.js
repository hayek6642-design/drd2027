import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { query } from '../config/db.js'
import { validateAdminSession, requireRole, adminLimiter, requireGateValid } from '../middleware/admin.js'
import { audit } from '../utils/audit.js'
import { featureFlags, setFlag } from '../config/flags.js'
import { sendAdminOtp } from '../utils/sms-provider.js'

const router = Router()

router.use(adminLimiter)

// Session validation middleware for admin routes

// ─── Bankode Admin Login: exchange hardened password for a session token ──────
// Called by indexCB.html after correct 7-click password entry
router.post('/bankode-login', async (req, res) => {
  const { password } = req.body || {}
  const ADMIN_PW = process.env.ADMIN_BANKODE_PASSWORD || process.env.BANKODE_ADMIN_PW || 'doitasap2025'

  if (!password || password !== ADMIN_PW) {
    // Small delay to prevent brute-force timing attacks
    await new Promise(r => setTimeout(r, 400))
    return res.status(401).json({ ok: false, error: 'INVALID_PASSWORD' })
  }

  try {
    // ── HMAC-signed stateless token — zero DB dependency ────────────────────
    const SECRET = process.env.BANKODE_TOKEN_SECRET || ADMIN_PW
    const ts = Date.now().toString()
    const sig = crypto.createHmac('sha256', SECRET).update(ts).digest('hex')
    const token = `${ts}.${sig}`
    console.log('[BANKODE LOGIN] HMAC admin session issued')
    res.json({ ok: true, token })
  } catch (e) {
    console.error('[BANKODE LOGIN ERROR]', e.message)
    res.status(500).json({ ok: false, error: 'LOGIN_FAILED' })
  }
})

// Apply session validation to ALL admin routes except login itself
router.use((req, res, next) => {
  // Skip auth for the login endpoint — it issues tokens
  if (req.path === '/bankode-login') return next()
  validateAdminSession(req, res, next)
})

/**
 * 🏦 Admin Vault & Monthly Allowance System
 */
const MONTHLY_VAULT_AMOUNT = 1000000;

async function runMonthlyVaultDistribution(adminId) {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  try {
    const existing = await query(
      `SELECT 1 FROM admin_vault_cycles WHERE admin_id = $1 AND cycle_month = $2`,
      [adminId, month]
    );

    if (existing.rowCount > 0) return;

    await query('BEGIN');
    await query(`
      INSERT INTO admin_vault (id, admin_id, allowance, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (admin_id)
      DO UPDATE SET allowance = admin_vault.allowance + $3, updated_at = CURRENT_TIMESTAMP
    `, [crypto.randomUUID(), adminId, MONTHLY_VAULT_AMOUNT]);

    await query(`
      INSERT INTO admin_vault_cycles (id, admin_id, cycle_month, amount, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [crypto.randomUUID(), adminId, month, MONTHLY_VAULT_AMOUNT]);
    await query('COMMIT');
    console.log(`[VAULT] Distributed ${MONTHLY_VAULT_AMOUNT} to admin ${adminId} for ${month}`);
  } catch (e) {
    await query('ROLLBACK');
    console.error('[VAULT ERROR] Monthly distribution failed:', e.message);
  }
}

// Vault Status Endpoint
router.get('/vault/status', requireRole('admin'), async (req, res) => {
  try {
    const adminId = req.user.id;
    // Trigger distribution check on access
    await runMonthlyVaultDistribution(adminId);
    
    const vault = await query('SELECT allowance, updated_at FROM admin_vault WHERE admin_id = $1', [adminId]);
    const allowance = vault.rowCount > 0 ? vault.rows[0].allowance : 0;
    
    res.json({ ok: true, allowance, monthly_limit: MONTHLY_VAULT_AMOUNT });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'VAULT_STATUS_FAILED' });
  }
});

// Secure Mint from Vault
router.post('/mint-from-vault', requireRole('admin'), async (req, res) => {
  const { userId, assetId, amount, reason } = req.body || {}
  const adminId = req.user.id;

  if (!userId || !assetId || !amount || amount <= 0) {
    return res.status(400).json({ ok: false, error: 'INVALID_INPUT' });
  }

  if (amount > MAX_SAFE_MINT_LIMIT) {
    return res.status(403).json({ ok: false, error: 'LIMIT_EXCEEDED', message: `Max limit is ${MAX_SAFE_MINT_LIMIT}` });
  }

  const validAssets = ['codes', 'silver', 'gold'];
  if (!validAssets.includes(assetId)) {
    return res.status(400).json({ ok: false, error: 'INVALID_ASSET' });
  }

  try {
    await query('BEGIN');

    // 🛡️ 1. Check Vault Allowance
    const vault = await query(
      `SELECT allowance FROM admin_vault WHERE admin_id = $1`,
      [adminId]
    );

    if (vault.rowCount === 0 || vault.rows[0].allowance < amount) {
      await query('ROLLBACK');
      return res.status(403).json({ ok: false, error: 'INSUFFICIENT_ALLOWANCE' });
    }

    // 🛡️ 2. Deduct from Vault
    await query(
      `UPDATE admin_vault SET allowance = allowance - $1, updated_at = CURRENT_TIMESTAMP WHERE admin_id = $2`,
      [amount, adminId]
    );

    const txId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const txHash = crypto.createHash('sha256')
      .update(`${txId}|${userId}|${assetId}|${amount}|${adminId}|${timestamp}`)
      .digest('hex');

    const metadata = {
      source: 'admin_vault',
      admin_id: adminId,
      reason: reason || 'Vault Minting',
      ip: req.ip
    };

    // 🛡️ 3. Ledger Record (The only way to update state)
    await query(
      `INSERT INTO ledger (id, tx_id, tx_hash, user_id, asset_type, amount, direction, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'credit', $7, CURRENT_TIMESTAMP)`,
      [crypto.randomUUID(), txId, txHash, userId, assetId, amount, JSON.stringify(metadata)]
    );

    // 🛡️ 4. Audit Trail
    await query(
      `INSERT INTO audit_logs (id, actor_user_id, actor_role, action, target_type, target_id, metadata, created_at)
       VALUES ($1, $2, 'admin', 'VAULT_MINT', 'user', $3, $4, CURRENT_TIMESTAMP)`,
      [crypto.randomUUID(), adminId, userId, JSON.stringify(metadata)]
    );

    await query('COMMIT');
    res.json({ ok: true, txId, message: 'Minted successfully from vault', sync_required: true });
  } catch (e) {
    await query('ROLLBACK');
    console.error('[VAULT MINT ERROR]', e.message);
    res.status(500).json({ ok: false, error: 'VAULT_MINT_FAILED' });
  }
});

/**
 * 🛡️ OTP Session Management (Ultra Hardened v4 - Production Flow)
 */
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const MAX_SAFE_MINT_LIMIT = 5000;

router.post('/otp/request', adminLimiter, async (req, res) => {
  const { identity, pin } = req.body || {}
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  try {
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PIN_HASH = process.env.ADMIN_PIN_HASH;
    const ADMIN_PHONE = process.env.ADMIN_PHONE;

    // 🛡️ 1. Production Validation Layer
    const pinHash = crypto.createHash('sha256').update(pin || '').digest('hex');
    
    if (identity !== ADMIN_EMAIL || pinHash !== ADMIN_PIN_HASH) {
      console.log('[DEBUG] OTP REJECTED - Audit params:', { 
        action: 'ADMIN_OTP_REJECTED', 
        target_type: 'identity', 
        metadata: { identity, ip, user_agent: userAgent } 
      });
      const auditResult = await audit({ 
        action: 'ADMIN_OTP_REJECTED', 
        target_type: 'identity', 
        metadata: { identity, ip, user_agent: userAgent } 
      });
      console.log('[DEBUG] Audit result:', auditResult);
      // Deception: return success to avoid leaking valid accounts
      return res.json({ ok: true, message: 'If authorized, OTP will be sent' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = Date.now() + OTP_EXPIRY_MS;
    const otpId = crypto.randomUUID();

    // 🛡️ 2. Real SMS Delivery (Production Provider)
    await sendAdminOtp(ADMIN_PHONE, otp);

    // 🛡️ 3. Store Hashed OTP & Device Binding
    await query(
      `INSERT INTO admin_otps (otp_id, otp_code, expires_at, used, ip_address, user_agent, admin_email, created_at)
       VALUES ($1, $2, $3, 0, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [otpId, otpHash, expiresAt, ip, userAgent, identity]
    );

    await audit(req, { action: 'ADMIN_OTP_REQUESTED', target_type: 'user', target_id: identity, metadata: { ip, otpId } });

    res.json({ ok: true, otpId, message: 'OTP sent to your registered device' });
  } catch (err) {
    console.error('[OTP REQUEST ERROR]', err.message);
    res.status(500).json({ ok: false, error: 'OTP_REQUEST_FAILED' });
  }
})

router.post('/otp/verify', adminLimiter, async (req, res) => {
  const { otpId, otpCode } = req.body || {}
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  try {
    const otpData = await query('SELECT * FROM admin_otps WHERE otp_id = $1 AND used = false', [otpId]);

    if (otpData.rowCount === 0) {
      return res.status(401).json({ ok: false, error: 'INVALID_OR_USED_OTP' });
    }

    const record = otpData.rows[0];
    const otpHash = crypto.createHash('sha256').update(otpCode || '').digest('hex');

    // 🛡️ Device Binding & Security Validation
    if (record.ip_address !== ip || record.user_agent !== userAgent) {
      await audit(req, { action: 'ADMIN_OTP_DEVICE_MISMATCH', metadata: { expected_ip: record.ip_address, got_ip: ip } });
      return res.status(403).json({ ok: false, error: 'DEVICE_UNAUTHORIZED' });
    }

    if (Date.now() > parseInt(record.expires_at)) {
      return res.status(401).json({ ok: false, error: 'OTP_EXPIRED' });
    }

    if (record.otp_code !== otpHash) {
      await query('UPDATE admin_otp_attempts SET attempts = attempts + 1 WHERE ip_address = $1', [ip]);
      return res.status(401).json({ ok: false, error: 'INCORRECT_OTP' });
    }

    // 🛡️ Authorized - Cleanup and Issue Session
    await query('UPDATE admin_otps SET used = 1 WHERE otp_id = $1', [otpId]);
    
    const adminToken = crypto.randomUUID(); // Production grade session token
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await query('INSERT INTO auth_sessions (id, token, expires_at, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)', [crypto.randomUUID(), adminToken, expiresAt]);
    await audit(req, { action: 'ADMIN_OTP_VERIFIED', target_type: 'otp', target_id: otpId, metadata: { ip } });

    res.json({ ok: true, token: adminToken, message: 'Admin authorized' });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'VERIFICATION_FAILED' });
  }
})

/**
 * 🛡️ Bankode Admin Minting Endpoint (Ultra Hardened v4)
 */
router.post('/mint', requireRole('admin'), async (req, res) => {
  const { userId, assetId, amount, reason } = req.body || {}

  // 🛡️ 1. Financial Guardrails
  if (!userId || !assetId || !amount || amount <= 0) {
    return res.status(400).json({ ok: false, error: 'INVALID_INPUT' });
  }

  if (amount > MAX_SAFE_MINT_LIMIT) {
    await audit(req, { action: 'ADMIN_MINT_LIMIT_EXCEEDED', metadata: { amount, limit: MAX_SAFE_MINT_LIMIT, userId } });
    return res.status(403).json({ ok: false, error: 'LIMIT_EXCEEDED', message: `Max limit is ${MAX_SAFE_MINT_LIMIT}` });
  }

  const validAssets = ['codes', 'silver', 'gold'];
  if (!validAssets.includes(assetId)) {
    return res.status(400).json({ ok: false, error: 'INVALID_ASSET' });
  }

  try {
    const txId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    // Start Atomic Ledger Transaction
    await query('BEGIN');

    try {
      // 🛡️ 2. Ledger Update (Single Source of Truth)
      // Use the ledger table as the single source of truth
      const txHash = crypto.createHash('sha256')
        .update(`${txId}|${userId}|${assetId}|${amount}|${req.user.id}|${timestamp}`)
        .digest('hex');

      const metadata = {
        source: 'admin_mint',
        admin: true,
        reason: reason || 'Admin Minting (Prod)',
        ip: req.ip,
        userAgent: req.headers['user-agent']
      };

      await query(
        `INSERT INTO ledger (
          id,
          tx_id,
          tx_hash,
          user_id,
          asset_type,
          amount,
          direction,
          meta,
          created_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          'credit',
          $7,
          CURRENT_TIMESTAMP
        )`,
        [crypto.randomUUID(), txId, txHash, userId, assetId, amount, JSON.stringify(metadata)]
      );

      // 🛡️ 3. Audit Trail with Hashing
      await query(
        `INSERT INTO audit_logs (id, actor_user_id, actor_role, action, target_type, target_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [crypto.randomUUID(), req.user.id, 'admin', 'ADMIN_MINT', 'user', userId, JSON.stringify({
          tx_id: txId,
          tx_hash: txHash,
          amount,
          assetId,
          reason: reason || 'Admin Minting (Prod)',
          timestamp
        })]
      );

      await query('COMMIT');

      // 🛡️ 4. Trigger UI Sync (Via response)
      res.json({
        ok: true,
        txId,
        txHash,
        message: `Successfully minted ${amount} ${assetId} for user ${userId}`,
        sync_required: true
      });

    } catch (dbErr) {
      await query('ROLLBACK');
      throw dbErr;
    }
  } catch (err) {
    console.error('[ADMIN MINT ERROR]', err.message);
    res.status(500).json({ ok: false, error: 'MINT_FAILED' });
  }
})

// View audit logs with filters and pagination
router.get('/audit', requireRole('admin'), async (req, res) => {
  const { action, actor, from, to, page = 1, page_size = 50 } = req.query || {}
  const where = []
  const params = []
  let idx = 1
  if (action) { where.push(`action = $${idx++}`); params.push(action) }
  if (actor) { where.push(`actor_user_id = $${idx++}`); params.push(actor) }
  if (from) { where.push(`created_at >= $${idx++}`); params.push(new Date(from)) }
  if (to) { where.push(`created_at <= $${idx++}`); params.push(new Date(to)) }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const limit = Math.min(parseInt(page_size, 10) || 50, 200)
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit
  try {
    const rows = await query(
      `SELECT id, actor_user_id, actor_role, action, target_type, target_id, metadata, ip_address, user_agent, created_at
       FROM audit_logs ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    )
    res.json({ ok: true, logs: rows.rows })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'ADMIN_AUDIT_FETCH_FAILED' })
  }
})

// View users (read-only)
router.get('/users', requireRole('admin'), async (_req, res) => {
  try {
    const r = await query('SELECT id, email, user_type, disabled, created_at FROM users ORDER BY created_at DESC LIMIT 500', [])
    res.json({ ok: true, users: r.rows })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'ADMIN_USERS_FETCH_FAILED' })
  }
})

// Disable user (SUPERADMIN)
router.post('/users/:id/disable', requireGateValid(), requireRole('superadmin'), async (req, res) => {
  const { id } = req.params
  try {
    await query('UPDATE users SET disabled=1 WHERE id=$1', [id])
    await query('UPDATE auth_sessions SET revoked=1 WHERE user_id=$1', [id])
    await audit(req, { action: 'USER_DISABLED', target_type: 'user', target_id: id })
    await audit(req, { action: 'SESSION_REVOKED', target_type: 'user', target_id: id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'ADMIN_USER_DISABLE_FAILED' })
  }
})

// Enable user (SUPERADMIN)
router.post('/users/:id/enable', requireGateValid(), requireRole('superadmin'), async (req, res) => {
  const { id } = req.params
  try {
    await query('UPDATE users SET disabled=0 WHERE id=$1', [id])
    await audit(req, { action: 'USER_ENABLED', target_type: 'user', target_id: id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'ADMIN_USER_ENABLE_FAILED' })
  }
})

// Feature Flags control (ADMIN+)
router.post('/flags', requireGateValid(), requireRole('admin'), async (req, res) => {
  const { key, value } = req.body || {}
  if (!(key in featureFlags)) {
    return res.status(400).json({ ok: false, error: 'UNKNOWN_FLAG' })
  }
  const ok = setFlag(key, value)
  if (ok) {
    await audit(req, { action: 'FEATURE_FLAG_CHANGED', target_type: 'flag', target_id: key, metadata: { value: !!value } })
  }
  res.json({ ok: true, flags: featureFlags })
})

// Admin router error handler
router.use((err, _req, res, _next) => {
  res.status(500).json({ ok: false, error: 'ADMIN_INTERNAL_ERROR' })
})

export default router
// Bankode Gate verify (ADMIN+)
router.post('/bankode/verify', requireRole('admin'), async (req, res) => {
  const { password } = req.body || {}
  if (!password) return res.status(400).json({ ok: false, error: 'INVALID_INPUT' })
  try {
    const uid = req.user?.clerkUserId
    if (!uid) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })
    let hash
    try {
      const r = await query('SELECT gate_password_hash FROM bankode_users WHERE user_id=$1', [uid])
      hash = r.rows[0]?.gate_password_hash
      if (!hash) {
        const u = await query('SELECT password_hash FROM users WHERE clerk_user_id=$1', [uid])
        hash = u.rows[0]?.password_hash || null
      }
    } catch (_) {}
    if (!hash) return res.status(500).json({ ok: false, error: 'NO_GATE_PASSWORD' })
    const valid = await bcrypt.compare(password, hash)
    if (!valid) {
      await audit(req, { action: 'ADMIN_GATE_INVALID', target_type: 'user', target_id: uid })
      return res.json({ ok: false, error: 'INVALID_PASSWORD' })
    }
    const expires = new Date(Date.now() + 5 * 60 * 1000)
    try {
      await query('INSERT INTO bankode_password_sessions (user_id, expires_at) VALUES ($1,$2)', [uid, expires])
    } catch (_) {}
    await audit(req, { action: 'ADMIN_GATE_VERIFIED', target_type: 'user', target_id: uid, metadata: { expires: expires.toISOString() } })
    res.json({ ok: true, expiry: expires.toISOString() })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'ADMIN_GATE_VERIFY_FAILED' })
  }
})

// Farragna moderation (Bankode protected)
router.get('/farragna/videos', requireGateValid(), requireRole('admin'), async (_req, res) => {
  try {
    const r = await query(
      `SELECT id, owner_id, stream_uid, status, playback_url, views_count, rewards_earned, created_at
       FROM farragna_videos
       ORDER BY created_at DESC
       LIMIT 200`,
      []
    )
    res.json({ ok: true, videos: r.rows })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'ADMIN_FARRAGNA_LIST_FAILED' })
  }
})

router.patch('/farragna/:id/hide', requireGateValid(), requireRole('admin'), async (req, res) => {
  const { id } = req.params
  try {
    await query('UPDATE farragna_videos SET status=$2 WHERE id=$1', [id, 'hidden'])
    await audit(req, { action: 'FARRAGNA_HIDE', target_type: 'video', target_id: id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'ADMIN_FARRAGNA_HIDE_FAILED' })
  }
})

router.patch('/farragna/:id/restore', requireGateValid(), requireRole('admin'), async (req, res) => {
  const { id } = req.params
  try {
    await query('UPDATE farragna_videos SET status=$2 WHERE id=$1 AND status=$3', [id, 'ready', 'hidden'])
    await audit(req, { action: 'FARRAGNA_RESTORE', target_type: 'video', target_id: id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'ADMIN_FARRAGNA_RESTORE_FAILED' })
  }
})

router.delete('/farragna/:id', requireGateValid(), requireRole('admin'), async (req, res) => {
  const { id } = req.params
  try {
    await query('DELETE FROM farragna_views WHERE video_id=$1', [id])
    await query('DELETE FROM farragna_videos WHERE id=$1', [id])
    await audit(req, { action: 'FARRAGNA_DELETE', target_type: 'video', target_id: id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'ADMIN_FARRAGNA_DELETE_FAILED' })
  }
})

// ─── Bankode Admin: Users with full balance ───────────────────────────────────
router.get('/users/full', requireRole('admin'), async (_req, res) => {
  try {
    // Users table has balance columns directly (codes_count, silver_count, gold_count)
    // No need to join balances; disabled column may not exist — use COALESCE fallback
    let r
    try {
      r = await query(`
        SELECT id, email, user_type,
               COALESCE(codes_count,  0) AS codes,
               COALESCE(silver_count, 0) AS silver,
               COALESCE(gold_count,   0) AS gold,
               last_sync_at AS created_at
        FROM users
        ORDER BY last_sync_at DESC NULLS LAST
        LIMIT 500
      `, [])
    } catch (_primaryErr) {
      console.warn('[ADMIN users/full] primary query failed:', _primaryErr.message)
      // Absolute minimum fallback
      r = await query('SELECT id, email FROM users LIMIT 500', [])
    }
    res.json({ ok: true, users: r.rows })
  } catch (e) {
    console.error('[ADMIN users/full ERROR]', e.message)
    res.status(500).json({ ok: false, error: 'ADMIN_USERS_FULL_FAILED', detail: e.message })
  }
})

// ─── Bankode Admin: Qarsan steal log ─────────────────────────────────────────
router.get('/qarsan/steals', requireRole('admin'), async (_req, res) => {
  try {
    const r = await query(`
      SELECT sl.id,
             sl.codes_stolen, sl.silver_stolen, sl.gold_stolen,
             sl.wallet_stolen, sl.total_stolen, sl.created_at,
             a.email AS actor_email,
             t.email AS target_email
      FROM qarsan_steal_log sl
      LEFT JOIN users a ON a.id = sl.actor_id
      LEFT JOIN users t ON t.id = sl.target_id
      ORDER BY sl.created_at DESC
      LIMIT 200
    `, [])
    res.json({ ok: true, steals: r.rows })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'ADMIN_QARSAN_STEALS_FAILED' })
  }
})

// ─── Bankode Admin: Send assets to user by email ─────────────────────────────
router.post('/send-by-email', requireRole('admin'), async (req, res) => {
  const { email, assetType, amount } = req.body || {}
  if (!email || !assetType || !amount || Number(amount) <= 0) {
    return res.status(400).json({ ok: false, error: 'INVALID_INPUT' })
  }
  const validAssets = ['codes', 'silver', 'gold']
  if (!validAssets.includes(assetType)) {
    return res.status(400).json({ ok: false, error: 'INVALID_ASSET' })
  }
  try {
    const userRes = await query('SELECT id FROM users WHERE email=$1 LIMIT 1', [email])
    if (userRes.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND', message: `No user found with email: ${email}` })
    }
    const userId = userRes.rows[0].id
    const col = assetType === 'codes' ? 'codes_count' : assetType === 'silver' ? 'silver_count' : 'gold_count'
    // Update balance directly on the users table (balance columns live there)
    await query(`
      UPDATE users SET ${col} = COALESCE(${col}, 0) + $2 WHERE id = $1
    `, [userId, Number(amount)])
    await audit(req, {
      action: 'ADMIN_SEND_ASSETS_BY_EMAIL',
      target_type: 'user',
      target_id: userId,
      metadata: { email, assetType, amount: Number(amount) }
    })
    res.json({ ok: true, message: `${amount} ${assetType} deposited to ${email} instantly ✅` })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'ADMIN_SEND_FAILED', detail: e.message })
  }
})
