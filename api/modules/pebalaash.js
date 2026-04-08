import express, { Router } from 'express'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { query } from '../config/db.js'
import { requireRole, validateAdminSession } from '../middleware/admin.js'
import { requireAuth } from '../middleware/auth.js'
import { publishEvent } from './logicode.js'

const router = Router()
router.use(express.json())
router.use(express.urlencoded({ extended: true }))

// ─── Config ────────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'dia201244@gmail.com'

// Asset conversion rates
const CODES_PER_SILVER = 100    // 100 codes = 1 silver bar
const CODES_PER_GOLD   = 10000  // 10,000 codes = 1 gold bar

// ─── Email Transporter ─────────────────────────────────────────────────────────
const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
})

// ─── Startup: ensure all required tables exist (Turso/libsql-compatible) ──────
async function ensureSchema() {
  // categories
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id         INTEGER PRIMARY KEY,
        name       TEXT NOT NULL,
        slug       TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      )
    `, [])
  } catch (e) { console.error('[PEBALAASH] schema error (categories):', e.message) }

  // products  ── TEXT timestamps, no PostgreSQL-specific types
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id           INTEGER PRIMARY KEY,
        name         TEXT NOT NULL,
        description  TEXT,
        price_codes  INTEGER NOT NULL DEFAULT 0,
        image_url    TEXT,
        category_id  INTEGER,
        stock        INTEGER NOT NULL DEFAULT 0,
        sold_count   INTEGER NOT NULL DEFAULT 0,
        avg_rating   REAL DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        country_code TEXT DEFAULT 'ALL',
        created_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      )
    `, [])
  } catch (e) { console.error('[PEBALAASH] schema error (products):', e.message) }

  // balances  ── stores silver/gold bars per user (codes live in user_rewards)
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS balances (
        user_id      TEXT PRIMARY KEY,
        codes_count  INTEGER NOT NULL DEFAULT 0,
        silver_count INTEGER DEFAULT 0,
        gold_count   INTEGER DEFAULT 0,
        updated_at   TEXT DEFAULT (CURRENT_TIMESTAMP)
      )
    `, [])
  } catch (e) { console.error('[PEBALAASH] schema error (balances):', e.message) }

  // Add silver/gold columns if the table already existed without them
  for (const sql of [
    `ALTER TABLE balances ADD COLUMN silver_count INTEGER DEFAULT 0`,
    `ALTER TABLE balances ADD COLUMN gold_count   INTEGER DEFAULT 0`,
  ]) {
    try { await query(sql, []) } catch (_) {} // silently ignore "column already exists"
  }

  // pebalaash_orders  ── TEXT instead of JSONB/TIMESTAMPTZ, INTEGER not SERIAL
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS pebalaash_orders (
        id            TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL,
        product_id    INTEGER NOT NULL,
        product_name  TEXT NOT NULL,
        payment_type  TEXT NOT NULL DEFAULT 'codes',
        amount_paid   INTEGER NOT NULL,
        price_codes   INTEGER NOT NULL,
        status        TEXT NOT NULL DEFAULT 'completed',
        customer_info TEXT,
        created_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      )
    `, [])
  } catch (e) { console.error('[PEBALAASH] schema error (orders):', e.message) }

  // pebalaash_ratings  ── INTEGER PRIMARY KEY (not SERIAL)
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS pebalaash_ratings (
        id         INTEGER PRIMARY KEY,
        user_id    TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        rating     INTEGER NOT NULL,
        review     TEXT,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        UNIQUE (user_id, product_id)
      )
    `, [])
  } catch (e) { console.error('[PEBALAASH] schema error (ratings):', e.message) }

  // pebalaash_wallet_items — shipping wallet per user
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS pebalaash_wallet_items (
        id           TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL,
        order_id     TEXT NOT NULL,
        product_id   INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        image_url    TEXT,
        status       TEXT NOT NULL DEFAULT 'pending',
        from_gift    INTEGER NOT NULL DEFAULT 0,
        gifted_from  TEXT,
        gift_note    TEXT,
        acquired_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      )
    `, [])
  } catch (e) { console.error('[PEBALAASH] schema error (wallet_items):', e.message) }

  console.log('[PEBALAASH] Schema ready')
}
ensureSchema().catch(e => console.error('[PEBALAASH] schema init error:', e.message))

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getPriceInCurrency(priceCodes, paymentType) {
  if (paymentType === 'silver') return Math.ceil(priceCodes / CODES_PER_SILVER)
  if (paymentType === 'gold')   return Math.max(1, Math.ceil(priceCodes / CODES_PER_GOLD))
  return priceCodes
}

function mapProduct(row) {
  return {
    id:          row.id,
    name:        row.name,
    description: row.description,
    priceCodes:  row.price_codes,
    priceSilver: Math.ceil(row.price_codes / CODES_PER_SILVER),
    priceGold:   Math.max(1, Math.ceil(row.price_codes / CODES_PER_GOLD)),
    imageUrl:    row.image_url,
    categoryId:  row.category_id,
    stock:       row.stock,
    soldCount:   row.sold_count,
    avgRating:   row.avg_rating   ? Number(Number(row.avg_rating).toFixed(1))   : null,
    ratingCount: row.rating_count ? Number(row.rating_count) : 0,
    createdAt:   row.created_at,
  }
}

// ─── Email helpers ─────────────────────────────────────────────────────────────

async function sendAdminOrderEmail({ orderId, userId, product, customer, paymentType, amountPaid }) {
  const paymentLabel =
    paymentType === 'silver' ? 'Silver Bars' :
    paymentType === 'gold'   ? 'Gold Bars'   : 'DR.D Codes'

  const html = `
    <div style="font-family:sans-serif;max-width:640px;margin:auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:12px;border:1px solid #1e3a5f;">
      <h1 style="color:#3b82f6;border-bottom:2px solid #3b82f6;padding-bottom:12px;margin-top:0;">
        🛒 New Pebalaash Order
      </h1>
      <h2 style="color:#60a5fa;font-size:15px;margin-bottom:6px;">📦 Product</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr style="border-bottom:1px solid #1e293b;">
          <td style="padding:8px 12px;color:#94a3b8;width:140px;">Product</td>
          <td style="padding:8px 12px;font-weight:700;">${product.name}</td>
        </tr>
        <tr style="border-bottom:1px solid #1e293b;">
          <td style="padding:8px 12px;color:#94a3b8;">Order ID</td>
          <td style="padding:8px 12px;font-family:monospace;font-size:12px;">${orderId}</td>
        </tr>
        <tr style="border-bottom:1px solid #1e293b;">
          <td style="padding:8px 12px;color:#94a3b8;">Payment</td>
          <td style="padding:8px 12px;color:#34d399;font-weight:700;">${amountPaid} ${paymentLabel}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;color:#94a3b8;">Time</td>
          <td style="padding:8px 12px;">${new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo', dateStyle: 'full', timeStyle: 'medium' })}</td>
        </tr>
      </table>
      <h2 style="color:#60a5fa;font-size:15px;margin-bottom:6px;">👤 Customer</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr style="border-bottom:1px solid #1e293b;">
          <td style="padding:8px 12px;color:#94a3b8;width:140px;">Full Name</td>
          <td style="padding:8px 12px;font-weight:700;">${customer.name || '—'}</td>
        </tr>
        <tr style="border-bottom:1px solid #1e293b;">
          <td style="padding:8px 12px;color:#94a3b8;">Phone</td>
          <td style="padding:8px 12px;">${customer.phone || '—'}</td>
        </tr>
        <tr style="border-bottom:1px solid #1e293b;">
          <td style="padding:8px 12px;color:#94a3b8;">Email</td>
          <td style="padding:8px 12px;">${customer.email || '—'}</td>
        </tr>
        <tr style="border-bottom:1px solid #1e293b;">
          <td style="padding:8px 12px;color:#94a3b8;">Delivery Address</td>
          <td style="padding:8px 12px;">${customer.address || '—'}</td>
        </tr>
        <tr style="border-bottom:1px solid #1e293b;">
          <td style="padding:8px 12px;color:#94a3b8;">Notes</td>
          <td style="padding:8px 12px;">${customer.notes || 'None'}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;color:#94a3b8;">User ID</td>
          <td style="padding:8px 12px;font-family:monospace;font-size:11px;color:#475569;">${userId}</td>
        </tr>
      </table>
      <div style="padding:14px 18px;background:#1e3a5f;border-radius:8px;border-left:4px solid #3b82f6;margin-bottom:16px;">
        <strong style="color:#60a5fa;">⚡ Action Required:</strong>
        <span style="color:#cbd5e1;"> Prepare and ship <strong style="color:#f1f5f9;">${product.name}</strong> to the address above.</span>
      </div>
      <p style="color:#475569;font-size:11px;margin:0;">Pebalaash Store · ${new Date().toISOString()}</p>
    </div>`

  try {
    await emailTransporter.sendMail({
      from:    `"Pebalaash Store 🛒" <${process.env.EMAIL_USER}>`,
      to:      ADMIN_EMAIL,
      subject: `🛒 New Order: ${product.name} · ${amountPaid} ${paymentLabel}`,
      html,
      text: `New Order!\nProduct: ${product.name}\nOrder ID: ${orderId}\nPayment: ${amountPaid} ${paymentLabel}\nCustomer: ${customer.name}\nPhone: ${customer.phone}\nEmail: ${customer.email || '—'}\nAddress: ${customer.address}\nNotes: ${customer.notes || 'None'}\nUser ID: ${userId}`,
    })
    console.log('[PEBALAASH] Admin order email sent to', ADMIN_EMAIL)
  } catch (e) {
    console.error('[PEBALAASH] Admin email failed (non-fatal):', e.message)
  }
}

async function sendBuyerConfirmationEmail({ orderId, product, customer, paymentType, amountPaid }) {
  if (!customer.email) return
  const paymentLabel =
    paymentType === 'silver' ? 'Silver Bars' :
    paymentType === 'gold'   ? 'Gold Bars'   : 'DR.D Codes'

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:12px;border:1px solid #1e3a5f;">
      <h1 style="color:#34d399;border-bottom:2px solid #34d399;padding-bottom:12px;margin-top:0;">
        ✅ Order Confirmed!
      </h1>
      <p style="color:#cbd5e1;font-size:16px;">Hi <strong>${customer.name}</strong>, your order has been received and is being processed.</p>
      <div style="background:#1e293b;border-radius:10px;padding:20px;margin:20px 0;border:1px solid #334155;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#94a3b8;">Product</span>
          <strong>${product.name}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#94a3b8;">Order ID</span>
          <span style="font-family:monospace;font-size:12px;">${orderId}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#94a3b8;">You Paid</span>
          <strong style="color:#34d399;">${amountPaid} ${paymentLabel}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#94a3b8;">Deliver To</span>
          <span style="max-width:220px;text-align:right;">${customer.address}</span>
        </div>
      </div>
      <p style="color:#94a3b8;font-size:13px;">We'll contact you shortly at <strong>${customer.phone}</strong> to arrange delivery. Thank you for shopping at Pebalaash! 🛒</p>
      <p style="color:#475569;font-size:11px;margin-top:24px;">Pebalaash Store · ${new Date().toISOString()}</p>
    </div>`

  try {
    await emailTransporter.sendMail({
      from:    `"Pebalaash Store 🛒" <${process.env.EMAIL_USER}>`,
      to:      customer.email,
      subject: `✅ Your Order is Confirmed — ${product.name}`,
      html,
      text: `Hi ${customer.name}!\n\nYour order for "${product.name}" has been confirmed.\nOrder ID: ${orderId}\nYou Paid: ${amountPaid} ${paymentLabel}\nDeliver To: ${customer.address}\n\nWe'll contact you at ${customer.phone} to arrange delivery.\n\nThank you for shopping at Pebalaash!`,
    })
    console.log('[PEBALAASH] Buyer confirmation email sent to', customer.email)
  } catch (e) {
    console.error('[PEBALAASH] Buyer email failed (non-fatal):', e.message)
  }
}

// ─── Public routes ─────────────────────────────────────────────────────────────

router.get('/categories', async (_req, res) => {
  try {
    const r = await query('SELECT id, name, slug, created_at FROM categories ORDER BY name ASC')
    res.json(r.rows.map(row => ({ id: row.id, name: row.name, slug: row.slug, createdAt: row.created_at })))
  } catch (e) {
    console.error('[PEBALAASH] categories error:', e.message)
    res.status(500).json({ message: 'Failed to fetch categories' })
  }
})

router.get('/products', async (req, res) => {
  try {
    const categoryId  = req.query.categoryId  ? Number(req.query.categoryId) : undefined
    const countryCode = req.query.countryCode  ? String(req.query.countryCode).toUpperCase() : undefined

    // Build WHERE clauses dynamically
    const conditions = []
    const params     = []

    if (categoryId) {
      params.push(categoryId)
      conditions.push(`p.category_id=$${params.length}`)
    }
    if (countryCode && countryCode !== 'ALL') {
      params.push(countryCode)
      conditions.push(`(p.country_code='ALL' OR p.country_code=$${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const sql = `SELECT p.*, COALESCE(AVG(r.rating),0) AS avg_rating, COUNT(r.id) AS rating_count
                   FROM products p
                   LEFT JOIN pebalaash_ratings r ON r.product_id = p.id
                 ${where}
                 GROUP BY p.id ORDER BY p.id DESC`

    const r = await query(sql, params)
    res.json(r.rows.map(mapProduct))
  } catch (e) {
    console.error('[PEBALAASH] products error:', e.message)
    res.status(500).json({ message: 'Failed to fetch products' })
  }
})

router.get('/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const r = await query(
      `SELECT p.*, COALESCE(AVG(r.rating),0) AS avg_rating, COUNT(r.id) AS rating_count
         FROM products p
         LEFT JOIN pebalaash_ratings r ON r.product_id = p.id
        WHERE p.id=$1 GROUP BY p.id`,
      [id]
    )
    const row = r.rows[0]
    if (!row) return res.status(404).json({ message: 'Product not found' })
    res.json(mapProduct(row))
  } catch (e) {
    console.error('[PEBALAASH] product/:id error:', e.message)
    res.status(500).json({ message: 'Failed to fetch product' })
  }
})

// ─── Product Ratings ───────────────────────────────────────────────────────────

router.get('/products/:id/ratings', async (req, res) => {
  try {
    const productId = Number(req.params.id)
    const r = await query(
      `SELECT id, rating, review, created_at FROM pebalaash_ratings
        WHERE product_id=$1 ORDER BY created_at DESC LIMIT 20`,
      [productId]
    )
    const summary = await query(
      `SELECT COALESCE(AVG(rating),0) AS avg_rating, COUNT(*) AS count
         FROM pebalaash_ratings WHERE product_id=$1`,
      [productId]
    )
    res.json({
      ratings:    r.rows,
      avgRating:  Number(Number(summary.rows[0]?.avg_rating || 0).toFixed(1)),
      totalCount: Number(summary.rows[0]?.count || 0),
    })
  } catch (e) {
    console.error('[PEBALAASH] ratings GET error:', e.message)
    res.status(500).json({ message: 'Failed to fetch ratings' })
  }
})

router.post('/products/:id/ratings', requireAuth, async (req, res) => {
  try {
    const productId = Number(req.params.id)
    const userId    = req.user.id
    const { rating, review } = req.body || {}

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' })
    }

    const bought = await query(
      `SELECT 1 FROM pebalaash_orders WHERE user_id=$1 AND product_id=$2 AND status='completed' LIMIT 1`,
      [userId, productId]
    )
    if (!bought.rows.length) {
      return res.status(403).json({ message: 'You must purchase this product before rating it' })
    }

    // Use EXCLUDED.* instead of numbered params in DO UPDATE (Turso-compatible)
    await query(
      `INSERT INTO pebalaash_ratings (user_id, product_id, rating, review)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET rating=EXCLUDED.rating, review=EXCLUDED.review, created_at=CURRENT_TIMESTAMP`,
      [userId, productId, Number(rating), review || null]
    )

    const updated = await query(
      `SELECT COALESCE(AVG(rating),0) AS avg_rating, COUNT(*) AS count
         FROM pebalaash_ratings WHERE product_id=$1`,
      [productId]
    )

    res.json({
      success:    true,
      avgRating:  Number(Number(updated.rows[0]?.avg_rating || 0).toFixed(1)),
      totalCount: Number(updated.rows[0]?.count || 0),
    })
  } catch (e) {
    console.error('[PEBALAASH] ratings POST error:', e.message)
    res.status(500).json({ message: 'Failed to submit rating' })
  }
})

// ─── Protected routes ──────────────────────────────────────────────────────────

/**
 * GET /api/pebalaash/wallet
 * Codes come from user_rewards (the canonical ACC ledger).
 * Silver & gold come from the balances table.
 */
router.get('/wallet', requireAuth, async (req, res) => {
  const userId = req.user.id
  try {
    // DR.D Codes ── canonical balance in user_rewards (ACC-linked)
    let codes = 0
    try {
      const r = await query('SELECT balance FROM user_rewards WHERE user_id=$1', [userId])
      codes = Number(r.rows[0]?.balance) || 0
    } catch (_) {
      // Fallback: try balances.codes_count
      try {
        const r2 = await query('SELECT codes_count FROM balances WHERE user_id=$1', [userId])
        codes = Number(r2.rows[0]?.codes_count) || 0
      } catch (_) {}
    }

    // Silver & Gold bars
    let silver = 0, gold = 0
    try {
      const r = await query(
        `SELECT COALESCE(silver_count, 0) AS silver_count,
                COALESCE(gold_count,   0) AS gold_count
           FROM balances WHERE user_id=$1`,
        [userId]
      )
      silver = Number(r.rows[0]?.silver_count) || 0
      gold   = Number(r.rows[0]?.gold_count)   || 0
    } catch (_) {}

    res.json({ userId, codes, silver, gold })
  } catch (e) {
    console.error('[PEBALAASH] wallet error:', e.message)
    res.status(500).json({ message: 'Failed to fetch wallet' })
  }
})

/**
 * GET /api/pebalaash/orders
 * Returns the authenticated user's order history.
 */
router.get('/orders', requireAuth, async (req, res) => {
  const userId = req.user.id
  const page   = Math.max(1, Number(req.query.page) || 1)
  const limit  = Math.min(50, Number(req.query.limit) || 20)
  const offset = (page - 1) * limit

  try {
    const r = await query(
      `SELECT id, product_id, product_name, payment_type, amount_paid,
              price_codes, status, created_at
         FROM pebalaash_orders
        WHERE user_id=$1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )
    const countRes = await query(
      'SELECT COUNT(*) AS total FROM pebalaash_orders WHERE user_id=$1',
      [userId]
    )
    res.json({
      orders: r.rows.map(o => ({
        id:          o.id,
        productId:   o.product_id,
        productName: o.product_name,
        paymentType: o.payment_type,
        amountPaid:  o.amount_paid,
        priceCodes:  o.price_codes,
        status:      o.status,
        createdAt:   o.created_at,
      })),
      total: Number(countRes.rows[0]?.total || 0),
      page,
      limit,
    })
  } catch (e) {
    console.error('[PEBALAASH] orders GET error:', e.message)
    res.status(500).json({ message: 'Failed to fetch order history' })
  }
})

/**
 * POST /api/pebalaash/checkout
 *
 * Body: { productId, customerInfo, paymentType }
 *   paymentType: 'codes' | 'silver' | 'gold'  (default: 'codes')
 *
 * Flow:
 *  1. Validate product & stock
 *  2. Atomic balance deduction via WHERE balance >= price  (no pool/BEGIN/COMMIT)
 *  3. Write audit record to reward_events  → Safe Code hears it
 *  4. Fire SSE publishEvent('wealth','balance')  → ACC + all components hear it
 *  5. Decrement stock
 *  6. Insert pebalaash_orders with shipping info  → Turso persists it
 *  7. Emails to admin + buyer
 */
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { productId, customerInfo, paymentType = 'codes' } = req.body || {}
    const userId = req.user.id

    if (!productId || !customerInfo) {
      return res.status(400).json({ message: 'productId and customerInfo are required' })
    }
    if (!['codes', 'silver', 'gold'].includes(paymentType)) {
      return res.status(400).json({ message: 'paymentType must be: codes, silver, or gold' })
    }

    // ── 1. Fetch product ────────────────────────────────────────────────────────
    const pr = await query('SELECT id, name, price_codes, stock FROM products WHERE id=$1', [productId])
    const product = pr.rows[0]
    if (!product) return res.status(404).json({ message: 'Product not found' })
    if (Number(product.stock) <= 0) return res.status(400).json({ message: 'Out of stock' })

    const priceCodes      = Number(product.price_codes)
    const priceInCurrency = getPriceInCurrency(priceCodes, paymentType)
    const orderId         = crypto.randomUUID()

    const spendMeta = {
      type:        'pebalaash_purchase',
      orderId,
      productId:   Number(productId),
      productName: product.name,
      paymentType,
      customerName: customerInfo?.name || '',
    }

    // ── 2. Atomic balance deduction ────────────────────────────────────────────
    // Each DB engine (Turso/libsql, SQLite, PostgreSQL) processes a single UPDATE
    // atomically.  We use "WHERE balance >= $1" as a compare-and-swap so the
    // deduction only happens if funds are available — no BEGIN/COMMIT required.
    let deductResult
    if (paymentType === 'codes') {
      // Codes live in user_rewards.balance (the canonical ACC ledger)
      // NOTE: $1 used twice → split into $1 (SET) and $3 (WHERE) to avoid Turso positional-param mismatch
      deductResult = await query(
        `UPDATE user_rewards
            SET balance = balance - $1, last_updated = CURRENT_TIMESTAMP
          WHERE user_id=$2 AND balance >= $3`,
        [priceInCurrency, userId, priceInCurrency]
      )
    } else if (paymentType === 'silver') {
      deductResult = await query(
        `UPDATE balances
            SET silver_count = silver_count - $1
          WHERE user_id=$2 AND COALESCE(silver_count, 0) >= $3`,
        [priceInCurrency, userId, priceInCurrency]
      )
    } else {
      deductResult = await query(
        `UPDATE balances
            SET gold_count = gold_count - $1
          WHERE user_id=$2 AND COALESCE(gold_count, 0) >= $3`,
        [priceInCurrency, userId, priceInCurrency]
      )
    }

    // rowsAffected is 0 if the WHERE condition failed (insufficient balance)
    const rowsAffected = deductResult?.rowsAffected ?? deductResult?.rowCount ?? (deductResult?.rows?.length ?? 1)
    if (!rowsAffected || Number(rowsAffected) === 0) {
      // Re-read actual balance for a helpful error message
      let actualBalance = 0
      try {
        if (paymentType === 'codes') {
          const r = await query('SELECT balance FROM user_rewards WHERE user_id=$1', [userId])
          actualBalance = Number(r.rows[0]?.balance) || 0
        } else {
          const col = paymentType === 'silver' ? 'silver_count' : 'gold_count'
          const r = await query(`SELECT COALESCE(${col}, 0) AS bal FROM balances WHERE user_id=$1`, [userId])
          actualBalance = Number(r.rows[0]?.bal) || 0
        }
      } catch (_) {}
      const typeLabel = paymentType === 'silver' ? 'Silver Bars' : paymentType === 'gold' ? 'Gold Bars' : 'DR.D Codes'
      return res.status(400).json({
        message:   `Insufficient ${typeLabel} balance`,
        required:  priceInCurrency,
        available: actualBalance,
        paymentType,
      })
    }

    // ── 3. Audit trail in reward_events  (Safe Code reads this) ────────────────
    try {
      // Express amount in codes-equivalent for a uniform audit ledger
      const codesEquivalent = paymentType === 'silver' ? priceInCurrency * CODES_PER_SILVER
                            : paymentType === 'gold'   ? priceInCurrency * CODES_PER_GOLD
                            : priceInCurrency
      await query(
        `INSERT INTO reward_events(id, user_id, amount, type, meta, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [
          crypto.randomUUID(), userId, -codesEquivalent, 'asset',
          JSON.stringify(spendMeta),
        ]
      )
    } catch (auditErr) {
      console.warn('[PEBALAASH] audit insert failed (non-fatal):', auditErr.message)
    }

    // ── 4. SSE broadcast  (ACC, Safe Code, and every subscribed component) ─────
    try {
      // Fetch the new balance for the event payload
      let newBalance = 0
      if (paymentType === 'codes') {
        const r = await query('SELECT balance FROM user_rewards WHERE user_id=$1', [userId])
        newBalance = Number(r.rows[0]?.balance) || 0
      } else {
        const col = paymentType === 'silver' ? 'silver_count' : 'gold_count'
        const r = await query(`SELECT COALESCE(${col}, 0) AS bal FROM balances WHERE user_id=$1`, [userId])
        newBalance = Number(r.rows[0]?.bal) || 0
      }
      publishEvent('wealth', 'balance', {
        user_id:      userId,
        delta:        -priceInCurrency,
        source:       'pebalaash_purchase',
        payment_type: paymentType,
        order_id:     orderId,
        product_name: product.name,
        new_balance:  newBalance,
      })
    } catch (sseErr) {
      console.warn('[PEBALAASH] SSE publish failed (non-fatal):', sseErr.message)
    }

    // ── 5. Decrement product stock ─────────────────────────────────────────────
    try {
      await query(
        'UPDATE products SET stock = stock - 1, sold_count = sold_count + 1 WHERE id=$1',
        [productId]
      )
    } catch (e) {
      console.warn('[PEBALAASH] stock decrement failed (non-fatal):', e.message)
    }

    // ── 6. Register order in Turso with full shipping info ────────────────────
    try {
      await query(
        `INSERT INTO pebalaash_orders
           (id, user_id, product_id, product_name, payment_type,
            amount_paid, price_codes, status, customer_info, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)`,
        [
          orderId, userId, Number(productId), product.name, paymentType,
          priceInCurrency, priceCodes, 'completed',
          JSON.stringify(customerInfo),
        ]
      )
    } catch (insertErr) {
      console.error('[PEBALAASH] order record insert failed:', insertErr.message)
      // Payment already deducted — attempt refund
      try {
        if (paymentType === 'codes') {
          await query(
            'UPDATE user_rewards SET balance = balance + $1 WHERE user_id=$2',
            [priceInCurrency, userId]
          )
        } else {
          const col = paymentType === 'silver' ? 'silver_count' : 'gold_count'
          await query(
            `UPDATE balances SET ${col} = ${col} + $1 WHERE user_id=$2`,
            [priceInCurrency, userId]
          )
        }
        // Fire refund SSE
        try {
          publishEvent('wealth', 'balance', {
            user_id: userId, delta: priceInCurrency, source: 'pebalaash_refund', order_id: orderId,
          })
        } catch (_) {}
      } catch (_) {}
      return res.status(500).json({ message: 'Order registration failed — payment refunded' })
    }

    // ── 6b. Insert into shipping wallet ────────────────────────────────────────
    try {
      const productImg = pr.rows[0]?.image_url || null
      await query(
        `INSERT INTO pebalaash_wallet_items
           (id, user_id, order_id, product_id, product_name, image_url, status, from_gift, acquired_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,'pending',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        [crypto.randomUUID(), userId, orderId, Number(productId), product.name, productImg]
      )
    } catch (walletErr) {
      console.warn('[PEBALAASH] wallet item insert failed (non-fatal):', walletErr.message)
    }

    // ── 7. Fetch updated wallet for response ───────────────────────────────────
    let updatedWallet = { codes: 0, silver: 0, gold: 0 }
    try {
      const cr = await query('SELECT balance FROM user_rewards WHERE user_id=$1', [userId])
      updatedWallet.codes = Number(cr.rows[0]?.balance) || 0
    } catch (_) {}
    try {
      const br = await query(
        `SELECT COALESCE(silver_count,0) AS sc, COALESCE(gold_count,0) AS gc
           FROM balances WHERE user_id=$1`,
        [userId]
      )
      updatedWallet.silver = Number(br.rows[0]?.sc) || 0
      updatedWallet.gold   = Number(br.rows[0]?.gc) || 0
    } catch (_) {}

    // ── 8. Emails (fire-and-forget) ────────────────────────────────────────────
    sendAdminOrderEmail({
      orderId, userId, product: { name: product.name },
      customer: customerInfo, paymentType, amountPaid: priceInCurrency,
    })
    sendBuyerConfirmationEmail({
      orderId, product: { name: product.name },
      customer: customerInfo, paymentType, amountPaid: priceInCurrency,
    })

    res.json({
      success:         true,
      orderId,
      paymentType,
      amountPaid:      priceInCurrency,
      remainingCodes:  updatedWallet.codes,
      remainingSilver: updatedWallet.silver,
      remainingGold:   updatedWallet.gold,
    })
  } catch (e) {
    console.error('[PEBALAASH] checkout error:', e.message)
    res.status(500).json({ message: 'Transaction failed: ' + e.message })
  }
})

// ─── Wallet Items ──────────────────────────────────────────────────────────────

/**
 * GET /api/pebalaash/wallet-items
 * Returns the authenticated user's items awaiting shipping (status=pending) + received gifts
 */
router.get('/wallet-items', requireAuth, async (req, res) => {
  const userId = req.user.id
  try {
    const r = await query(
      `SELECT w.id, w.user_id, w.order_id, w.product_id, w.product_name,
              w.image_url, w.status, w.from_gift, w.gifted_from, w.gift_note, w.acquired_at,
              up.username AS gifter_username
         FROM pebalaash_wallet_items w
         LEFT JOIN users_profiles up ON up.user_id = w.gifted_from
        WHERE w.user_id=$1 AND w.status IN ('pending','received')
        ORDER BY w.acquired_at DESC`,
      [userId]
    )
    res.json(r.rows.map(row => ({
      id:             row.id,
      orderId:        row.order_id,
      productId:      row.product_id,
      productName:    row.product_name,
      imageUrl:       row.image_url,
      status:         row.status,
      fromGift:       Number(row.from_gift) === 1,
      gifterUsername: row.gifter_username || null,
      giftNote:       row.gift_note || null,
      acquiredAt:     row.acquired_at,
    })))
  } catch (e) {
    console.error('[PEBALAASH] wallet-items GET error:', e.message)
    res.status(500).json({ message: 'Failed to fetch wallet items' })
  }
})

/**
 * GET /api/pebalaash/users/search?q=
 * Search users by username or email prefix for gift recipient lookup.
 * Returns id + username + avatar — NO sensitive data.
 */
router.get('/users/search', requireAuth, async (req, res) => {
  const q      = String(req.query.q || '').trim()
  const selfId = req.user.id
  if (q.length < 2) return res.json([])
  try {
    // Simple safe search: email only (username may not exist in all DB versions)
    const r = await query(
      `SELECT id, email FROM users WHERE id != $1 AND LOWER(email) LIKE LOWER($2) LIMIT 10`,
      [selfId, `%${q}%`]
    )
    res.json(r.rows.map(row => ({
      id:        row.id,
      username:  row.email ? row.email.split('@')[0] : 'user',
      avatarUrl: null,
    })))
  } catch (e) {
    console.error('[PEBALAASH] users/search error:', e.message)
    res.status(500).json({ message: 'Search failed' })
  }
})

/**
 * POST /api/pebalaash/wallet-items/:id/gift
 * Body: { recipientId, giftNote? }
 * Transfers a wallet item to another user's wallet.
 */
router.post('/wallet-items/:id/gift', requireAuth, async (req, res) => {
  const itemId      = req.params.id
  const senderId    = req.user.id
  const { recipientId, giftNote } = req.body || {}

  if (!recipientId) return res.status(400).json({ message: 'recipientId is required' })
  if (recipientId === senderId) return res.status(400).json({ message: 'Cannot gift to yourself' })

  try {
    // 1. Verify the item belongs to sender and is pending
    const itemRes = await query(
      `SELECT * FROM pebalaash_wallet_items WHERE id=$1 AND user_id=$2 AND status='pending'`,
      [itemId, senderId]
    )
    const item = itemRes.rows[0]
    if (!item) return res.status(404).json({ message: 'Item not found or already shipped/gifted' })

    // 2. Verify recipient exists
    const recipRes = await query('SELECT id FROM users WHERE id=$1', [recipientId])
    if (!recipRes.rows[0]) return res.status(404).json({ message: 'Recipient user not found' })

    // 3. Mark sender's item as gifted
    await query(
      `UPDATE pebalaash_wallet_items
          SET status='gifted', updated_at=CURRENT_TIMESTAMP
        WHERE id=$1 AND user_id=$2`,
      [itemId, senderId]
    )

    // 4. Insert new wallet item for recipient
    const newItemId = crypto.randomUUID()
    await query(
      `INSERT INTO pebalaash_wallet_items
         (id, user_id, order_id, product_id, product_name, image_url, status, from_gift, gifted_from, gift_note, acquired_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'pending',1,$7,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      [newItemId, recipientId, item.order_id, item.product_id, item.product_name, item.image_url, senderId, giftNote || null]
    )

    // 5. Get sender username for Dr.D-mail notification
    let senderUsername = 'A user'
    try {
      const sr = await query('SELECT COALESCE(username,\'anonymous\') AS username FROM users_profiles WHERE user_id=$1', [senderId])
      senderUsername = sr.rows[0]?.username || 'A user'
    } catch (_) {}

    // 6. Send Dr.D-mail notification to recipient (non-fatal)
    try {
      await query(
        `INSERT INTO drmail_messages (id, sender_id, recipient_id, thread_id, subject, body, is_read, created_at)
         VALUES ($1,'SYSTEM',$2,$3,$4,$5,0,CURRENT_TIMESTAMP)`,
        [
          crypto.randomUUID(),
          recipientId,
          crypto.randomUUID(),
          '🎁 You received a Pebalaash gift!',
          `${senderUsername} sent you **${item.product_name}** as a gift from Pebalaash!${giftNote ? `\n\n💌 Gift note: "${giftNote}"` : ''}\n\nCheck your Pebalaash Wallet to see your gift.`,
        ]
      )
    } catch (mailErr) {
      console.warn('[PEBALAASH] gift Dr.D-mail failed (non-fatal):', mailErr.message)
    }

    // 7. SSE notification (non-fatal)
    try {
      publishEvent('pebalaash', 'gift', {
        recipientId,
        senderId,
        productName: item.product_name,
        walletItemId: newItemId,
      })
    } catch (_) {}

    res.json({ success: true, newWalletItemId: newItemId, productName: item.product_name })
  } catch (e) {
    console.error('[PEBALAASH] gift error:', e.message)
    res.status(500).json({ message: 'Gift failed: ' + e.message })
  }
})

// ─── Admin routes ──────────────────────────────────────────────────────────────

/**
 * POST /api/pebalaash/admin/products
 * Create a new product (admin only)
 * Body: { name, description, price_codes, image_url, category_id, stock, country_code }
 */
router.post('/admin/products', requireAuth, async (req, res) => {
  // Allow only the owner account or any user with role=admin/superadmin
  if (req.user.email !== 'dia201244@gmail.com' && !['admin','superadmin'].includes(req.user.role)) {
    return res.status(403).json({ ok: false, error: 'FORBIDDEN' })
  }
  try {
    const { name, description = '', price_codes, image_url = '', category_id = null, stock = 10, country_code = 'ALL' } = req.body || {}
    if (!name || price_codes == null) return res.status(400).json({ ok: false, error: 'name and price_codes required' })
    const r = await query(
      `INSERT INTO products (name, description, price_codes, image_url, category_id, stock, country_code, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)`,
      [name, description, Number(price_codes), image_url, category_id, Number(stock), country_code]
    )
    const row = await query('SELECT * FROM products ORDER BY id DESC LIMIT 1', [])
    res.json({ ok: true, product: row.rows[0] })
  } catch (e) {
    console.error('[PEBALAASH] admin/products POST error:', e.message)
    res.status(500).json({ ok: false, error: e.message })
  }
})

/**
 * POST /api/pebalaash/admin/users/:userId/credit
 * Add balance (codes) to a user for testing purposes (admin only)
 * Body: { amount }
 */
router.post('/admin/users/:userId/credit', requireAuth, async (req, res) => {
  if (req.user.email !== 'dia201244@gmail.com' && !['admin','superadmin'].includes(req.user.role)) {
    return res.status(403).json({ ok: false, error: 'FORBIDDEN' })
  }
  try {
    const { userId } = req.params
    const { amount } = req.body || {}
    if (!amount || Number(amount) <= 0) return res.status(400).json({ ok: false, error: 'amount required and must be > 0' })
    // Upsert into user_rewards (the canonical codes ledger)
    await query(
      `INSERT INTO user_rewards (user_id, balance, last_updated)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET balance = balance + $3, last_updated = CURRENT_TIMESTAMP`,
      [userId, Number(amount), Number(amount)]
    )
    const r = await query('SELECT balance FROM user_rewards WHERE user_id=$1', [userId])
    res.json({ ok: true, userId, newBalance: r.rows[0]?.balance ?? Number(amount) })
  } catch (e) {
    console.error('[PEBALAASH] admin/credit error:', e.message)
    res.status(500).json({ ok: false, error: e.message })
  }
})

router.get('/admin/stats', requireRole('admin'), async (_req, res) => {
  try {
    const recent       = await query(`SELECT o.*, p.name AS product_name_display FROM pebalaash_orders o LEFT JOIN products p ON p.id = o.product_id ORDER BY o.created_at DESC LIMIT 50`)
    const totalSold    = await query('SELECT COUNT(*) AS count FROM pebalaash_orders')
    const totalRevenue = await query('SELECT COALESCE(SUM(price_codes),0) AS sum FROM pebalaash_orders')
    const lowStock     = await query('SELECT id, name, stock FROM products WHERE stock < 5')
    const ratingStats  = await query(`SELECT p.name, ROUND(AVG(r.rating),1) AS avg, COUNT(r.id) AS count FROM pebalaash_ratings r JOIN products p ON p.id=r.product_id GROUP BY p.name ORDER BY avg DESC`)
    res.json({
      totalSold:         Number(totalSold.rows[0]?.count)    || 0,
      totalRevenueCodes: Number(totalRevenue.rows[0]?.sum)   || 0,
      recentOrders:      recent.rows,
      lowStockProducts:  lowStock.rows,
      topRatedProducts:  ratingStats.rows,
    })
  } catch (e) {
    console.error('[PEBALAASH] admin/stats error:', e.message)
    res.status(500).json({ message: 'Failed to fetch admin stats' })
  }
})

export default router
