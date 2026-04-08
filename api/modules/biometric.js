/**
 * Biometric Authentication Module — WebAuthn / Passkeys
 * Works natively in iOS Safari (Face ID / Touch ID) and Android Chrome (fingerprint)
 * Also bridges to @capacitor-community/biometric-auth for native app builds
 */

import { Router }                          from 'express'
import crypto                              from 'crypto'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import { query }                           from '../config/db.js'
import { requireAuth, devSessions }        from '../middleware/auth.js'

const router = Router()

// ─── Config ────────────────────────────────────────────────────────────────────
const RP_NAME     = 'DRD2027'
const RP_ID       = process.env.RP_ID       || 'drd2027.onrender.com'
const ORIGIN      = process.env.APP_ORIGIN  || `https://${RP_ID}`
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000   // 30 days

// ─── In-Memory Challenge Store (TTL: 5 min) ────────────────────────────────────
const challenges = new Map()   // userId → { challenge, expiresAt }

function saveChallenge(userId, challenge) {
  challenges.set(String(userId), { challenge, expiresAt: Date.now() + 5 * 60_000 })
}
function consumeChallenge(userId) {
  const entry = challenges.get(String(userId))
  if (!entry || Date.now() > entry.expiresAt) { challenges.delete(String(userId)); return null }
  challenges.delete(String(userId))
  return entry.challenge
}

// ─── DB Init ────────────────────────────────────────────────────────────────────
;(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS webauthn_credentials (
        id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id      TEXT NOT NULL,
        credential_id TEXT NOT NULL UNIQUE,
        public_key   TEXT NOT NULL,
        sign_count   INTEGER DEFAULT 0,
        transports   TEXT,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('[BIOMETRIC] webauthn_credentials table ready')
  } catch (e) {
    console.error('[BIOMETRIC] table init error:', e.message)
  }
})()

// ─── Helper: resolve userId from req ────────────────────────────────────────────
function getUid(req) {
  return req.session?.userId || req.user?.userId || req.auth?.userId || null
}

// ────────────────────────────────────────────────────────────────────────────────
// REGISTRATION — Step 1: Generate options
// POST /api/auth/biometric/register-begin   (requires session)
// ────────────────────────────────────────────────────────────────────────────────
router.post('/biometric/register-begin', requireAuth, async (req, res) => {
  try {
    const userId = getUid(req)
    const email  = req.session?.email || req.user?.email || req.auth?.email || ''

    // Exclude credentials already registered
    const existing = await query(
      'SELECT credential_id FROM webauthn_credentials WHERE user_id = $1',
      [userId]
    )
    const excludeCredentials = existing.rows.map(r => ({
      id:   Buffer.from(r.credential_id, 'base64url'),
      type: 'public-key',
    }))

    const options = await generateRegistrationOptions({
      rpName:    RP_NAME,
      rpID:      RP_ID,
      userID:    Buffer.from(String(userId)),
      userName:  email,
      userDisplayName: email,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',   // built-in sensor only
        userVerification:        'required',
        residentKey:             'preferred',
      },
    })

    saveChallenge(userId, options.challenge)
    res.json({ success: true, options })
  } catch (e) {
    console.error('[BIOMETRIC] register-begin:', e.message)
    res.status(500).json({ success: false, error: e.message })
  }
})

// ────────────────────────────────────────────────────────────────────────────────
// REGISTRATION — Step 2: Verify & save
// POST /api/auth/biometric/register-finish   (requires session)
// Body: { response: PublicKeyCredential (JSON) }
// ────────────────────────────────────────────────────────────────────────────────
router.post('/biometric/register-finish', requireAuth, async (req, res) => {
  try {
    const userId           = getUid(req)
    const { response }     = req.body
    const expectedChallenge = consumeChallenge(userId)
    if (!expectedChallenge) return res.status(400).json({ success: false, error: 'Challenge expired — try again' })

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID:   RP_ID,
      requireUserVerification: true,
    })

    if (!verification.verified)
      return res.status(400).json({ success: false, error: 'Biometric verification failed' })

    const { credential } = verification.registrationInfo

    await query(
      `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, sign_count, transports)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (credential_id) DO UPDATE SET sign_count = $4`,
      [
        userId,
        Buffer.from(credential.id).toString('base64url'),
        Buffer.from(credential.publicKey).toString('base64'),
        credential.counter,
        JSON.stringify(credential.transports || []),
      ]
    )

    res.json({ success: true, message: 'Biometric registered — you can now sign in with your fingerprint / face' })
  } catch (e) {
    console.error('[BIOMETRIC] register-finish:', e.message)
    res.status(500).json({ success: false, error: e.message })
  }
})

// ────────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION — Step 1: Generate options
// POST /api/auth/biometric/auth-begin
// Body: { email }
// ────────────────────────────────────────────────────────────────────────────────
router.post('/biometric/auth-begin', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ success: false, error: 'Email required' })

    const userRes = await query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [email.toLowerCase().trim()]
    )
    if (!userRes.rows[0]) return res.status(404).json({ success: false, error: 'User not found' })

    const userId = userRes.rows[0].id

    const credRes = await query(
      'SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = $1',
      [userId]
    )
    if (credRes.rows.length === 0)
      return res.status(404).json({ success: false, error: 'No biometric registered for this account. Please log in with password first.' })

    const allowCredentials = credRes.rows.map(r => ({
      id:         Buffer.from(r.credential_id, 'base64url'),
      type:       'public-key',
      transports: JSON.parse(r.transports || '[]'),
    }))

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials,
      userVerification: 'required',
    })

    saveChallenge(userId, options.challenge)
    res.json({ success: true, options, userId })
  } catch (e) {
    console.error('[BIOMETRIC] auth-begin:', e.message)
    res.status(500).json({ success: false, error: e.message })
  }
})

// ────────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION — Step 2: Verify & create session
// POST /api/auth/biometric/auth-finish
// Body: { userId, response: PublicKeyCredential (JSON) }
// ────────────────────────────────────────────────────────────────────────────────
router.post('/biometric/auth-finish', async (req, res) => {
  try {
    const { userId, response } = req.body
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' })

    const expectedChallenge = consumeChallenge(userId)
    if (!expectedChallenge) return res.status(400).json({ success: false, error: 'Challenge expired — try again' })

    // Load credential from DB
    const credId  = response.id
    const credRes = await query(
      'SELECT * FROM webauthn_credentials WHERE credential_id = $1 AND user_id = $2',
      [credId, userId]
    )
    if (!credRes.rows[0]) return res.status(404).json({ success: false, error: 'Credential not found' })

    const credRow = credRes.rows[0]

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID:   RP_ID,
      credential: {
        id:         Buffer.from(credRow.credential_id, 'base64url'),
        publicKey:  Buffer.from(credRow.public_key, 'base64'),
        counter:    credRow.sign_count,
        transports: JSON.parse(credRow.transports || '[]'),
      },
      requireUserVerification: true,
    })

    if (!verification.verified)
      return res.status(401).json({ success: false, error: 'Biometric authentication failed' })

    // Update sign count
    await query(
      'UPDATE webauthn_credentials SET sign_count = $1 WHERE credential_id = $2',
      [verification.authenticationInfo.newCounter, credId]
    )

    // Load user
    const userRes = await query(
      'SELECT id, email, username, user_type FROM users WHERE id = $1',
      [userId]
    )
    const user = userRes.rows[0]

    // Create session (same mechanics as password login)
    const sessionToken = crypto.randomUUID()
    const expiresAt    = new Date(Date.now() + SESSION_TTL)

    await query(
      'INSERT INTO auth_sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [sessionToken, userId, expiresAt]
    )

    const sessionData = {
      userId,
      email:     user.email,
      role:      user.user_type || 'user',
      sessionId: sessionToken,
    }
    devSessions.set(sessionToken, sessionData)

    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure:   true,
      sameSite: 'Lax',
      expires:  expiresAt,
      path:     '/',
    })

    res.json({
      status:    'success',
      sessionId: sessionToken,
      userId,
      user: { id: user.id, email: user.email, username: user.username },
    })
  } catch (e) {
    console.error('[BIOMETRIC] auth-finish:', e.message)
    res.status(500).json({ success: false, error: e.message })
  }
})

// ────────────────────────────────────────────────────────────────────────────────
// STATUS — is biometric registered for current user?
// GET /api/auth/biometric/status   (requires session)
// ────────────────────────────────────────────────────────────────────────────────
router.get('/biometric/status', requireAuth, async (req, res) => {
  try {
    const userId = getUid(req)
    const r = await query(
      'SELECT COUNT(*) as count FROM webauthn_credentials WHERE user_id = $1',
      [userId]
    )
    res.json({ success: true, registered: parseInt(r.rows[0].count) > 0 })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ────────────────────────────────────────────────────────────────────────────────
// REVOKE — remove all biometric credentials for current user
// DELETE /api/auth/biometric/revoke   (requires session)
// ────────────────────────────────────────────────────────────────────────────────
router.delete('/biometric/revoke', requireAuth, async (req, res) => {
  try {
    const userId = getUid(req)
    await query('DELETE FROM webauthn_credentials WHERE user_id = $1', [userId])
    res.json({ success: true, message: 'All biometric credentials removed' })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router
