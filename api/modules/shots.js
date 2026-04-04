import { Router } from 'express'
import nodemailer from 'nodemailer'
import { query } from '../config/db.js'

const router = Router()

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'gogodblbless@gmail.com'

// ─── Email Transporter ─────────────────────────────────────────────────────
const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
})

// ─── Schema ────────────────────────────────────────────────────────────────
async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS shots (
      id           SERIAL PRIMARY KEY,
      shot_uid     TEXT UNIQUE NOT NULL,
      image_data   TEXT NOT NULL,
      track_title  TEXT,
      campaign_url TEXT,
      user_hint    TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      confirmed    BOOLEAN NOT NULL DEFAULT FALSE,
      email_sent   BOOLEAN NOT NULL DEFAULT FALSE
    )
  `, [])
  console.log('[Shots] Table ready')
}

ensureSchema().catch(e => console.error('[Shots] Schema error:', e))

// ─── POST /api/shots/save ──────────────────────────────────────────────────
// Body: { shotUid, imageData (base64 data URL), trackTitle, campaignUrl, userHint }
router.post('/save', async (req, res) => {
  try {
    const { shotUid, imageData, trackTitle, campaignUrl, userHint } = req.body
    if (!shotUid || !imageData) {
      return res.status(400).json({ success: false, error: 'Missing shotUid or imageData' })
    }

    // Limit: max 5MB image data
    if (imageData.length > 5 * 1024 * 1024) {
      return res.status(413).json({ success: false, error: 'Image too large' })
    }

    await query(
      `INSERT INTO shots (shot_uid, image_data, track_title, campaign_url, user_hint)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (shot_uid) DO NOTHING`,
      [shotUid, imageData, trackTitle || null, campaignUrl || null, userHint || null]
    )

    res.json({ success: true, shotUid })
  } catch (err) {
    console.error('[Shots] Save error:', err)
    res.status(500).json({ success: false, error: 'Failed to save shot' })
  }
})

// ─── GET /api/shots ────────────────────────────────────────────────────────
// Returns list of shots (without full image data for performance)
router.get('/', async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, shot_uid, track_title, campaign_url, user_hint,
              created_at, confirmed, email_sent,
              LEFT(image_data, 200) AS image_thumb,
              LENGTH(image_data) AS image_size
       FROM shots
       ORDER BY created_at DESC
       LIMIT 100`,
      []
    )
    res.json({ success: true, shots: rows.rows || [] })
  } catch (err) {
    console.error('[Shots] List error:', err)
    res.status(500).json({ success: false, error: 'Failed to list shots' })
  }
})

// ─── GET /api/shots/:uid ───────────────────────────────────────────────────
// Returns full shot including image data
router.get('/:uid', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM shots WHERE shot_uid = $1`,
      [req.params.uid]
    )
    const shot = result.rows?.[0]
    if (!shot) return res.status(404).json({ success: false, error: 'Shot not found' })
    res.json({ success: true, shot })
  } catch (err) {
    console.error('[Shots] Get error:', err)
    res.status(500).json({ success: false, error: 'Failed to get shot' })
  }
})

// ─── DELETE /api/shots/:uid ────────────────────────────────────────────────
router.delete('/:uid', async (req, res) => {
  try {
    await query(`DELETE FROM shots WHERE shot_uid = $1`, [req.params.uid])
    res.json({ success: true })
  } catch (err) {
    console.error('[Shots] Delete error:', err)
    res.status(500).json({ success: false, error: 'Failed to delete shot' })
  }
})

// ─── POST /api/shots/:uid/confirm ─────────────────────────────────────────
// Confirms a purchase for this shot → sends email to admin with screenshot
router.post('/:uid/confirm', async (req, res) => {
  try {
    const { buyerName, buyerEmail, notes } = req.body || {}

    const result = await query(
      `SELECT * FROM shots WHERE shot_uid = $1`,
      [req.params.uid]
    )
    const shot = result.rows?.[0]
    if (!shot) return res.status(404).json({ success: false, error: 'Shot not found' })

    if (shot.email_sent) {
      return res.json({ success: true, alreadySent: true, message: 'Purchase already confirmed' })
    }

    // Mark confirmed
    await query(
      `UPDATE shots SET confirmed = TRUE, email_sent = TRUE WHERE shot_uid = $1`,
      [shot.shot_uid]
    )

    // Build email with embedded screenshot
    const screenshotHtml = shot.image_data.startsWith('data:image')
      ? `<br><br><img src="${shot.image_data}" style="max-width:100%;border-radius:8px;border:2px solid #f59e0b;" alt="Campaign Screenshot" />`
      : ''

    const emailHtml = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#f59e0b;font-size:28px;margin:0;">📸 New Campaign Purchase!</h1>
          <p style="color:#94a3b8;margin:8px 0 0;">Shot confirmed from Shots! service</p>
        </div>

        <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h3 style="color:#f59e0b;margin:0 0 16px;">Purchase Details</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="color:#94a3b8;padding:6px 0;width:140px;">Track / Campaign:</td><td style="color:#e2e8f0;font-weight:600;">${shot.track_title || 'N/A'}</td></tr>
            <tr><td style="color:#94a3b8;padding:6px 0;">Shot ID:</td><td style="color:#e2e8f0;font-family:monospace;">${shot.shot_uid}</td></tr>
            <tr><td style="color:#94a3b8;padding:6px 0;">Captured At:</td><td style="color:#e2e8f0;">${new Date(shot.created_at).toLocaleString('en-GB')}</td></tr>
            <tr><td style="color:#94a3b8;padding:6px 0;">Confirmed At:</td><td style="color:#e2e8f0;">${new Date().toLocaleString('en-GB')}</td></tr>
            ${buyerName ? `<tr><td style="color:#94a3b8;padding:6px 0;">Buyer Name:</td><td style="color:#e2e8f0;">${buyerName}</td></tr>` : ''}
            ${buyerEmail ? `<tr><td style="color:#94a3b8;padding:6px 0;">Buyer Email:</td><td style="color:#e2e8f0;">${buyerEmail}</td></tr>` : ''}
            ${shot.user_hint ? `<tr><td style="color:#94a3b8;padding:6px 0;">User Hint:</td><td style="color:#e2e8f0;">${shot.user_hint}</td></tr>` : ''}
            ${notes ? `<tr><td style="color:#94a3b8;padding:6px 0;">Notes:</td><td style="color:#e2e8f0;">${notes}</td></tr>` : ''}
            ${shot.campaign_url ? `<tr><td style="color:#94a3b8;padding:6px 0;">Page URL:</td><td style="color:#e2e8f0;font-size:12px;">${shot.campaign_url}</td></tr>` : ''}
          </table>
        </div>

        <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h3 style="color:#f59e0b;margin:0 0 12px;">📌 Action Required</h3>
          <p style="color:#94a3b8;margin:0;line-height:1.6;">
            Go to <strong style="color:#e2e8f0;">Admin Bankode</strong> → enter the buyer's email → 
            deduct the campaign ad amount from their balance.<br><br>
            The screenshot below shows what ad/campaign they viewed when confirming this purchase.
          </p>
        </div>

        <div style="border-radius:12px;overflow:hidden;">
          <h3 style="color:#f59e0b;margin:0 0 12px;">🖼️ Campaign Screenshot</h3>
          ${screenshotHtml || '<p style="color:#94a3b8;">No screenshot data attached.</p>'}
        </div>

        <div style="margin-top:24px;text-align:center;color:#475569;font-size:12px;">
          <p>Shots! Service — drd2027 CodeBank</p>
        </div>
      </div>
    `

    await emailTransporter.sendMail({
      from: `"Shots! Service 📸" <${process.env.EMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `📸 New Campaign Purchase — ${shot.track_title || 'Unknown Track'} [${shot.shot_uid.slice(-8)}]`,
      html: emailHtml,
    })

    res.json({ success: true, message: 'Purchase confirmed and admin notified!' })
  } catch (err) {
    console.error('[Shots] Confirm error:', err)
    res.status(500).json({ success: false, error: 'Failed to confirm purchase: ' + err.message })
  }
})

export default router
