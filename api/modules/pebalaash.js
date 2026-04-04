import { Router } from 'express'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { query, pool } from '../config/db.js'
import { requireRole } from '../middleware/admin.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ─── Config ────────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'dia201244@gmail.com'

// Asset conversion rates (from bankode-core.js)
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

// ─── Startup: ensure all required columns & tables exist ──────────────────────
async function ensureSchema() {
  // Silver / gold columns on balances.
  // Turso/libsql does NOT support "ADD COLUMN IF NOT EXISTS" (PostgreSQL-only).
  // We simply attempt the ALTER TABLE without IF NOT EXISTS and catch the
  // "duplicate column" error silently on subsequent startups.
  const alterCols = [
    `ALTER TABLE balances ADD COLUMN silver_count INTEGER DEFAULT 0`,
    `ALTER TABLE balances ADD COLUMN gold_count   INTEGER DEFAULT 0`,
  ]
  for (const sql of alterCols) {
    try { await query(sql, [], { silent: true }) } catch (_) {}
  }

  // Pebalaash orders table (stores full purchase history per user)
  await query(`
    CREATE TABLE IF NOT EXISTS pebalaash_orders (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      product_id   INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      payment_type TEXT NOT NULL DEFAULT 'codes',
      amount_paid  INTEGER NOT NULL,
      price_codes  INTEGER NOT NULL,
      status       TEXT NOT NULL DEFAULT 'completed',
      customer_info JSONB,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `, [])

  // Product ratings table
  await query(`
    CREATE TABLE IF NOT EXISTS pebalaash_ratings (
      id         SERIAL PRIMARY KEY,
      user_id    TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      review     TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, product_id)
    )
  `, [])
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
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined
    const sql = categoryId
      ? `SELECT p.*, COALESCE(AVG(r.rating),0) AS avg_rating, COUNT(r.id) AS rating_count
           FROM products p
           LEFT JOIN pebalaash_ratings r ON r.product_id = p.id
          WHERE p.category_id=$1
          GROUP BY p.id ORDER BY p.id DESC`
      : `SELECT p.*, COALESCE(AVG(r.rating),0) AS avg_rating, COUNT(r.id) AS rating_count
           FROM products p
           LEFT JOIN pebalaash_ratings r ON r.product_id = p.id
          GROUP BY p.id ORDER BY p.id DESC`
    const r = categoryId ? await query(sql, [categoryId]) : await query(sql, [])
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

/** GET /api/pebalaash/products/:id/ratings  — public */
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

/** POST /api/pebalaash/products/:id/ratings  — authenticated */
router.post('/products/:id/ratings', requireAuth, async (req, res) => {
  try {
    const productId = Number(req.params.id)
    const userId    = req.user.id
    const { rating, review } = req.body || {}

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' })
    }

    // Check the user actually bought this product
    const bought = await query(
      `SELECT 1 FROM pebalaash_orders WHERE user_id=$1 AND product_id=$2 AND status='completed' LIMIT 1`,
      [userId, productId]
    )
    if (!bought.rows.length) {
      return res.status(403).json({ message: 'You must purchase this product before rating it' })
    }

    // Upsert rating
    await query(
      `INSERT INTO pebalaash_ratings (user_id, product_id, rating, review)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET rating=$3, review=$4, created_at=CURRENT_TIMESTAMP`,
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
 * Returns all three asset balances: codes, silver, gold (ACC-linked).
 */
router.get('/wallet', requireAuth, async (req, res) => {
  const userId = req.user.id
  try {
    const r = await query(
      `SELECT codes_count,
              COALESCE(silver_count, 0) AS silver_count,
              COALESCE(gold_count,   0) AS gold_count
         FROM balances WHERE user_id=$1`,
      [userId]
    )
    const row = r.rows[0] || {}
    res.json({
      userId,
      codes:  Number(row.codes_count)  || 0,
      silver: Number(row.silver_count) || 0,
      gold:   Number(row.gold_count)   || 0,
    })
  } catch (e) {
    console.error('[PEBALAASH] wallet error:', e.message)
    try {
      const r2 = await query('SELECT codes_count FROM balances WHERE user_id=$1', [userId])
      res.json({ userId, codes: Number(r2.rows[0]?.codes_count) || 0, silver: 0, gold: 0 })
    } catch {
      res.status(500).json({ message: 'Failed to fetch wallet' })
    }
  }
})

/**
 * GET /api/pebalaash/orders
 * Returns the authenticated user's order history (most recent first, paginated).
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
 * Body: { productId, customerInfo, paymentType }
 *   paymentType: 'codes' | 'silver' | 'gold'  (default: 'codes')
 */
router.post('/checkout', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const { productId, customerInfo, paymentType = 'codes' } = req.body || {}
    const userId = req.user.id

    if (!productId || !customerInfo) {
      return res.status(400).json({ message: 'productId and customerInfo are required' })
    }
    if (!['codes', 'silver', 'gold'].includes(paymentType)) {
      return res.status(400).json({ message: 'paymentType must be: codes, silver, or gold' })
    }

    await client.query('BEGIN')

    // 1. Fetch product
    const pr = await client.query(
      'SELECT id, name, price_codes, stock FROM products WHERE id=$1',
      [productId]
    )
    const product = pr.rows[0]
    if (!product) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Product not found' }) }
    if (Number(product.stock) <= 0) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'Out of stock' }) }

    // 2. Calculate price in chosen currency
    const priceCodes      = Number(product.price_codes)
    const priceInCurrency = getPriceInCurrency(priceCodes, paymentType)

    // 3. Fetch user balance
    const balCol = paymentType === 'silver' ? 'COALESCE(silver_count,0)' :
                   paymentType === 'gold'   ? 'COALESCE(gold_count,0)'   : 'codes_count'
    const balRes = await client.query(
      `SELECT ${balCol} AS balance FROM balances WHERE user_id=$1`,
      [userId]
    )
    const currentBalance = Number(balRes.rows[0]?.balance) || 0

    if (currentBalance < priceInCurrency) {
      await client.query('ROLLBACK')
      const typeLabel = paymentType === 'silver' ? 'Silver Bars' :
                        paymentType === 'gold'   ? 'Gold Bars'   : 'DR.D Codes'
      return res.status(400).json({
        message:     `Insufficient ${typeLabel} balance`,
        required:    priceInCurrency,
        available:   currentBalance,
        paymentType,
      })
    }

    // 4. Deduct balance
    const balUpdateCol = paymentType === 'silver' ? 'silver_count' :
                         paymentType === 'gold'   ? 'gold_count'   : 'codes_count'
    await client.query(
      `UPDATE balances SET ${balUpdateCol} = ${balUpdateCol} - $1 WHERE user_id=$2`,
      [priceInCurrency, userId]
    )

    // 5. Decrement stock & increment sold_count
    await client.query(
      'UPDATE products SET stock = stock - 1, sold_count = sold_count + 1 WHERE id=$1',
      [productId]
    )

    // 6. Create order record in pebalaash_orders
    const orderId = crypto.randomUUID()
    await client.query(
      `INSERT INTO pebalaash_orders
         (id, user_id, product_id, product_name, payment_type, amount_paid, price_codes, status, customer_info)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        orderId, userId, productId, product.name,
        paymentType, priceInCurrency, priceCodes,
        'completed',
        JSON.stringify(customerInfo),
      ]
    )

    await client.query('COMMIT')

    // 7. Fetch updated wallet
    let updatedWallet = { codes: 0, silver: 0, gold: 0 }
    try {
      const upd = await query(
        `SELECT codes_count, COALESCE(silver_count,0) AS silver_count, COALESCE(gold_count,0) AS gold_count
           FROM balances WHERE user_id=$1`,
        [userId]
      )
      const row = upd.rows[0] || {}
      updatedWallet = {
        codes:  Number(row.codes_count)  || 0,
        silver: Number(row.silver_count) || 0,
        gold:   Number(row.gold_count)   || 0,
      }
    } catch { /* non-fatal */ }

    // 8. Send emails (non-blocking)
    sendAdminOrderEmail({ orderId, userId, product: { name: product.name }, customer: customerInfo, paymentType, amountPaid: priceInCurrency })
    sendBuyerConfirmationEmail({ orderId, product: { name: product.name }, customer: customerInfo, paymentType, amountPaid: priceInCurrency })

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
    await client.query('ROLLBACK')
    console.error('[PEBALAASH] checkout error:', e.message)
    res.status(500).json({ message: 'Transaction failed' })
  } finally {
    client.release()
  }
})

// ─── Admin routes ──────────────────────────────────────────────────────────────

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
