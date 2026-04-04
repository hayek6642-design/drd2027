import { Router } from 'express'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { query, pool } from '../config/db.js'
import { requireRole } from '../middleware/admin.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ─── Config ────────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'gogodblbless@gmail.com'

// Asset conversion rates (from bankode-core.js)
const CODES_PER_SILVER = 100    // 100 codes = 1 silver bar
const CODES_PER_GOLD   = 10000  // 10,000 codes = 1 gold bar (100 silver × 100 codes)

// ─── Email Transporter ─────────────────────────────────────────────────────────
const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
})

// ─── Startup Migration: ensure silver_count / gold_count columns exist ─────────
async function ensureBalanceColumns() {
  const cols = ['silver_count', 'gold_count']
  for (const col of cols) {
    try {
      await query(`ALTER TABLE balances ADD COLUMN ${col} INTEGER DEFAULT 0`, [])
    } catch (_) { /* column already exists – SQLite throws on duplicate */ }
  }
}
// Run silently on startup
ensureBalanceColumns().catch(() => {})

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a code-denominated price to the target currency */
function getPriceInCurrency(priceCodes, paymentType) {
  if (paymentType === 'silver') return Math.ceil(priceCodes / CODES_PER_SILVER)
  if (paymentType === 'gold')   return Math.max(1, Math.ceil(priceCodes / CODES_PER_GOLD))
  return priceCodes // 'codes' default
}

/** Build a product response object (includes derived silver/gold prices) */
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
    createdAt:   row.created_at,
  }
}

/** Send order notification email to admin (non-fatal) */
async function sendOrderNotification({ orderId, userId, product, customer, paymentType, amountPaid }) {
  const paymentLabel =
    paymentType === 'silver' ? 'Silver Bars' :
    paymentType === 'gold'   ? 'Gold Bars'   :
    'DR.D Codes'

  const html = `
    <div style="font-family:sans-serif;max-width:620px;margin:auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:12px;border:1px solid #1e3a5f;">
      <h1 style="color:#3b82f6;border-bottom:2px solid #3b82f6;padding-bottom:12px;margin-top:0;">
        🛒 New Pebalaash Order
      </h1>

      <h2 style="color:#60a5fa;font-size:15px;margin-bottom:6px;">📦 Product Details</h2>
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
          <td style="padding:8px 12px;color:#94a3b8;">Order Time</td>
          <td style="padding:8px 12px;">${new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo', dateStyle: 'full', timeStyle: 'medium' })}</td>
        </tr>
      </table>

      <h2 style="color:#60a5fa;font-size:15px;margin-bottom:6px;">👤 Customer Information</h2>
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

      <p style="color:#475569;font-size:11px;margin:0;">
        Sent automatically by Pebalaash Store · ${new Date().toISOString()}
      </p>
    </div>
  `

  try {
    await emailTransporter.sendMail({
      from:    `"Pebalaash Store 🛒" <${process.env.EMAIL_USER}>`,
      to:      ADMIN_EMAIL,
      subject: `🛒 New Order: ${product.name} · ${amountPaid} ${paymentLabel}`,
      html,
      text:    `New Order!\nProduct: ${product.name}\nOrder ID: ${orderId}\nPayment: ${amountPaid} ${paymentLabel}\nCustomer: ${customer.name}\nPhone: ${customer.phone}\nAddress: ${customer.address}\nNotes: ${customer.notes || 'None'}\nUser ID: ${userId}`,
    })
    console.log('[PEBALAASH] Order notification email sent to', ADMIN_EMAIL)
  } catch (emailErr) {
    console.error('[PEBALAASH] Email notification failed (non-fatal):', emailErr.message)
  }
}

// ─── Public routes ─────────────────────────────────────────────────────────────

router.get('/categories', async (_req, res) => {
  try {
    const r = await query('SELECT id, name, slug, created_at FROM categories ORDER BY name ASC')
    res.json(r.rows.map(row => ({
      id:        row.id,
      name:      row.name,
      slug:      row.slug,
      createdAt: row.created_at,
    })))
  } catch (e) {
    console.error('[PEBALAASH] categories error:', e.message)
    res.status(500).json({ message: 'Failed to fetch categories' })
  }
})

router.get('/products', async (req, res) => {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined
    const r = categoryId
      ? await query('SELECT * FROM products WHERE category_id=$1 ORDER BY id DESC', [categoryId])
      : await query('SELECT * FROM products ORDER BY id DESC')
    res.json(r.rows.map(mapProduct))
  } catch (e) {
    console.error('[PEBALAASH] products error:', e.message)
    res.status(500).json({ message: 'Failed to fetch products' })
  }
})

router.get('/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const r  = await query('SELECT * FROM products WHERE id=$1', [id])
    const row = r.rows[0]
    if (!row) return res.status(404).json({ message: 'Product not found' })
    res.json(mapProduct(row))
  } catch (e) {
    console.error('[PEBALAASH] product/:id error:', e.message)
    res.status(500).json({ message: 'Failed to fetch product' })
  }
})

// ─── Protected routes ──────────────────────────────────────────────────────────

/**
 * GET /api/pebalaash/wallet
 * Returns ALL three asset balances: codes, silver, gold.
 * Linked to the ACC / balances table so any sync updates are reflected live.
 */
router.get('/wallet', requireAuth, async (req, res) => {
  const userId = req.user.id
  try {
    // Try to read all three columns (silver_count / gold_count added by migration)
    const r = await query(
      `SELECT codes_count,
              IFNULL(silver_count, 0) AS silver_count,
              IFNULL(gold_count,   0) AS gold_count
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
    // Graceful fallback – return codes only
    try {
      const r2 = await query('SELECT codes_count FROM balances WHERE user_id=$1', [userId])
      res.json({ userId, codes: Number(r2.rows[0]?.codes_count) || 0, silver: 0, gold: 0 })
    } catch {
      res.status(500).json({ message: 'Failed to fetch wallet' })
    }
  }
})

/**
 * POST /api/pebalaash/checkout
 * Body: { productId, customerInfo, paymentType }
 *   paymentType: 'codes' | 'silver' | 'gold'  (default: 'codes')
 *
 * - Validates balance for the chosen currency
 * - Atomically deducts balance & updates product stock
 * - Creates order record
 * - Sends admin notification email with full customer details
 */
router.post('/checkout', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const { productId, customerInfo, paymentType = 'codes' } = req.body || {}
    const userId = req.user.id

    if (!productId || !customerInfo) {
      return res.status(400).json({ message: 'productId and customerInfo are required' })
    }

    const validPaymentTypes = ['codes', 'silver', 'gold']
    if (!validPaymentTypes.includes(paymentType)) {
      return res.status(400).json({ message: 'paymentType must be one of: codes, silver, gold' })
    }

    await client.query('BEGIN')

    // ── 1. Fetch product ──
    const pr = await client.query(
      'SELECT id, name, price_codes, stock FROM products WHERE id=$1',
      [productId]
    )
    const product = pr.rows[0]
    if (!product) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Product not found' })
    }
    if (Number(product.stock) <= 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Out of stock' })
    }

    // ── 2. Calculate required amount in chosen currency ──
    const priceCodes      = Number(product.price_codes)
    const priceInCurrency = getPriceInCurrency(priceCodes, paymentType)

    // ── 3. Fetch user balance for the chosen currency ──
    const balColSelect = paymentType === 'silver' ? 'IFNULL(silver_count, 0)' :
                         paymentType === 'gold'   ? 'IFNULL(gold_count,   0)' :
                         'codes_count'

    const balRes = await client.query(
      `SELECT ${balColSelect} AS balance FROM balances WHERE user_id=$1`,
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

    const newBalance = currentBalance - priceInCurrency

    // ── 4. Deduct balance ──
    const balColUpdate = paymentType === 'silver' ? 'silver_count' :
                         paymentType === 'gold'   ? 'gold_count'   :
                         'codes_count'

    await client.query(
      `UPDATE balances SET ${balColUpdate} = $1 WHERE user_id=$2`,
      [newBalance, userId]
    )

    // ── 5. Decrement stock & increment sold count ──
    await client.query(
      'UPDATE products SET stock = stock - 1, sold_count = sold_count + 1 WHERE id=$1',
      [productId]
    )

    // ── 6. Create order record ──
    const orderId = crypto.randomUUID()
    await client.query(
      `INSERT INTO orders(id, user_id, product_id, customer_info, status, total_codes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)`,
      [
        orderId,
        userId,
        productId,
        JSON.stringify({ ...customerInfo, paymentType, amountPaid: priceInCurrency }),
        'completed',
        priceCodes,
      ]
    )

    await client.query('COMMIT')

    // ── 7. Fetch updated balances for response ──
    let updatedWallet = { codes: 0, silver: 0, gold: 0 }
    try {
      const upd = await query(
        `SELECT codes_count, IFNULL(silver_count,0) AS silver_count, IFNULL(gold_count,0) AS gold_count
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

    // ── 8. Send admin notification email (non-blocking) ──
    sendOrderNotification({
      orderId,
      userId,
      product:    { name: product.name },
      customer:   customerInfo,
      paymentType,
      amountPaid: priceInCurrency,
    })

    res.json({
      success:        true,
      orderId,
      paymentType,
      amountPaid:     priceInCurrency,
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
    const recent = await query(
      `SELECT o.id, o.user_id, o.product_id, o.customer_info, o.status,
              o.total_codes, o.created_at, p.name AS product_name
         FROM orders o
         LEFT JOIN products p ON p.id = o.product_id
        ORDER BY o.created_at DESC LIMIT 50`
    )
    const totalSold    = await query('SELECT COUNT(*) AS count FROM orders')
    const totalRevenue = await query('SELECT COALESCE(SUM(total_codes),0) AS sum FROM orders')
    const lowStock     = await query('SELECT * FROM products WHERE stock < 5')
    res.json({
      totalSold:         Number(totalSold.rows[0]?.count)    || 0,
      totalRevenueCodes: Number(totalRevenue.rows[0]?.sum)   || 0,
      recentOrders:      recent.rows,
      lowStockProducts:  lowStock.rows,
    })
  } catch (e) {
    console.error('[PEBALAASH] admin/stats error:', e.message)
    res.status(500).json({ message: 'Failed to fetch admin stats' })
  }
})

export default router
