import { Router } from 'express'
import crypto from 'crypto'
import { query, pool } from '../config/db.js'
import { requireRole } from '../middleware/admin.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ─── Category → emoji mapping ─────────────────────────────────────────────────
const CATEGORY_EMOJI = {
  cosmetics: '💄', beauty: '✨', women: '👗', men: '👔',
  kids: '🧒', children: '🧒', toys: '🧸', electronics: '📱',
  food: '🍕', accessories: '👜', sports: '⚽', books: '📚',
  home: '🏡', general: '🛍️'
}
function catEmoji(name) {
  if (!name) return '🛍️'
  return CATEGORY_EMOJI[name.toLowerCase().trim()] || '🛍️'
}

// ─── Public routes ─────────────────────────────────────────────────────────────

router.get('/categories', async (_req, res) => {
  try {
    const r = await query('SELECT id, name, slug FROM categories ORDER BY name ASC')
    res.json({
      ok: true,
      categories: r.rows.map(row => ({
        id: row.id, name: row.name, slug: row.slug, emoji: catEmoji(row.name)
      }))
    })
  } catch (e) {
    console.error('[PEBALAASH] categories error:', e.message)
    res.status(500).json({ ok: false, error: 'Failed to fetch categories' })
  }
})

router.get('/products', async (req, res) => {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined
    const sql = categoryId
      ? `SELECT p.*, c.name AS category_name
         FROM products p LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.category_id = $1 ORDER BY p.id DESC`
      : `SELECT p.*, c.name AS category_name
         FROM products p LEFT JOIN categories c ON c.id = p.category_id
         ORDER BY p.id DESC`
    const r = categoryId ? await query(sql, [categoryId]) : await query(sql)
    res.json({
      ok: true,
      products: r.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price_codes: row.price_codes,
        image_emoji: catEmoji(row.category_name),
        image_url: row.image_url || null,
        category: row.category_name || 'General',
        stock: row.stock,
        sold_count: row.sold_count
      }))
    })
  } catch (e) {
    console.error('[PEBALAASH] products error:', e.message)
    res.status(500).json({ ok: false, error: 'Failed to fetch products' })
  }
})

router.get('/products/:id', async (req, res) => {
  try {
    const r = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [req.params.id]
    )
    const row = r.rows[0]
    if (!row) return res.status(404).json({ ok: false, error: 'Product not found' })
    res.json({
      ok: true,
      product: {
        id: row.id, name: row.name, description: row.description,
        price_codes: row.price_codes, image_emoji: catEmoji(row.category_name),
        image_url: row.image_url || null, category: row.category_name || 'General',
        stock: row.stock, sold_count: row.sold_count
      }
    })
  } catch (e) {
    console.error('[PEBALAASH] product/:id error:', e.message)
    res.status(500).json({ ok: false, error: 'Failed to fetch product' })
  }
})

// ─── Protected routes (session required) ──────────────────────────────────────

/**
 * GET /api/pebalaash/wallet
 * Returns the authenticated user's codes balance from DR.D's `balances` table.
 * This is the real earned-by-watching balance — NOT the legacy user_rewards table.
 */
router.get('/wallet', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const r = await query(
      'SELECT codes_count FROM balances WHERE user_id = $1',
      [userId]
    )
    const codes_count = Number(r.rows[0]?.codes_count) || 0
    res.json({ ok: true, codes_count, userId })
  } catch (e) {
    console.error('[PEBALAASH] wallet error:', e.message)
    res.status(500).json({ ok: false, error: 'Failed to fetch wallet' })
  }
})

/**
 * GET /api/pebalaash/orders
 * Returns the authenticated user's own order history (newest first, max 50).
 */
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const r = await query(
      `SELECT o.id, o.status, o.total_codes, o.customer_info, o.created_at,
              p.name AS product_name
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC LIMIT 50`,
      [userId]
    )
    const orders = r.rows.map(row => {
      let info = {}
      try { info = JSON.parse(row.customer_info || '{}') } catch (_) {}
      return {
        id: row.id,
        product_name: row.product_name || 'Unknown Product',
        status: row.status,
        codes_spent: row.total_codes,
        customer_name: info.name || '',
        customer_phone: info.phone || '',
        customer_address: info.address || '',
        created_at: row.created_at
      }
    })
    res.json({ ok: true, orders })
  } catch (e) {
    console.error('[PEBALAASH] orders error:', e.message)
    res.status(500).json({ ok: false, error: 'Failed to fetch orders' })
  }
})

/**
 * POST /api/pebalaash/checkout
 * Atomically deducts codes from the user's DR.D balance and creates an order.
 * Uses BEGIN/COMMIT with SELECT FOR UPDATE to prevent double-spend race conditions.
 */
router.post('/checkout', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const { productId, customerInfo } = req.body || {}
    const userId = req.user.id

    if (!productId || !customerInfo) {
      return res.status(400).json({ ok: false, error: 'productId and customerInfo are required' })
    }
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
      return res.status(400).json({ ok: false, error: 'customerInfo must include name, phone, address' })
    }

    await client.query('BEGIN')

    // Lock product row to prevent overselling
    const pr = await client.query(
      'SELECT id, price_codes, stock FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    )
    const product = pr.rows[0]
    if (!product) {
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, error: 'Product not found' })
    }
    if (product.stock <= 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ ok: false, error: 'Out of stock' })
    }

    // Lock user balance row to prevent double-spend
    const balRes = await client.query(
      'SELECT codes_count FROM balances WHERE user_id = $1 FOR UPDATE',
      [userId]
    )
    const current = Number(balRes.rows[0]?.codes_count) || 0
    if (current < product.price_codes) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        ok: false,
        error: `Insufficient codes: need ${product.price_codes}, have ${current}`
      })
    }

    const newBalance = current - product.price_codes

    // Deduct from DR.D balance
    await client.query(
      'UPDATE balances SET codes_count = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [newBalance, userId]
    )

    // Decrement stock + increment sold count
    await client.query(
      'UPDATE products SET stock = stock - 1, sold_count = sold_count + 1 WHERE id = $1',
      [productId]
    )

    // Create order record
    const orderId = crypto.randomUUID()
    await client.query(
      `INSERT INTO orders (id, user_id, product_id, customer_info, status, total_codes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [orderId, userId, productId, JSON.stringify(customerInfo), 'pending', product.price_codes]
    )

    await client.query('COMMIT')

    res.json({ ok: true, newBalance, orderId })
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('[PEBALAASH] checkout error:', e.message)
    res.status(500).json({ ok: false, error: 'Transaction failed — please try again' })
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
       FROM orders o LEFT JOIN products p ON p.id = o.product_id
       ORDER BY o.created_at DESC LIMIT 50`
    )
    const totalSold = await query('SELECT COUNT(*) AS count FROM orders')
    const totalRevenue = await query('SELECT COALESCE(SUM(total_codes), 0) AS sum FROM orders')
    const lowStock = await query('SELECT * FROM products WHERE stock < 5 ORDER BY stock ASC')
    res.json({
      ok: true,
      totalSold: Number(totalSold.rows[0]?.count) || 0,
      totalRevenueCodes: Number(totalRevenue.rows[0]?.sum) || 0,
      recentOrders: recent.rows,
      lowStockProducts: lowStock.rows
    })
  } catch (e) {
    console.error('[PEBALAASH] admin/stats error:', e.message)
    res.status(500).json({ ok: false, error: 'Failed to fetch admin stats' })
  }
})

export default router
