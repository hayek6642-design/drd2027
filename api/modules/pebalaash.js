import { Router } from 'express'
import crypto from 'crypto'
import { query, pool } from '../config/db.js'
import { requireRole } from '../middleware/admin.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ─── Public routes (no auth needed) ───────────────────────────────────────────

router.get('/categories', async (_req, res) => {
  try {
    const r = await query('SELECT id, name, slug, created_at FROM categories ORDER BY name ASC')
    res.json(r.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
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
    res.json(r.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      priceCodes: row.price_codes,
      imageUrl: row.image_url,
      categoryId: row.category_id,
      stock: row.stock,
      soldCount: row.sold_count,
      createdAt: row.created_at,
    })))
  } catch (e) {
    console.error('[PEBALAASH] products error:', e.message)
    res.status(500).json({ message: 'Failed to fetch products' })
  }
})

router.get('/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const r = await query('SELECT * FROM products WHERE id=$1', [id])
    const row = r.rows[0]
    if (!row) return res.status(404).json({ message: 'Product not found' })
    res.json({
      id: row.id,
      name: row.name,
      description: row.description,
      priceCodes: row.price_codes,
      imageUrl: row.image_url,
      categoryId: row.category_id,
      stock: row.stock,
      soldCount: row.sold_count,
      createdAt: row.created_at,
    })
  } catch (e) {
    console.error('[PEBALAASH] product/:id error:', e.message)
    res.status(500).json({ message: 'Failed to fetch product' })
  }
})

// ─── Protected routes (session required) ──────────────────────────────────────

/**
 * GET /api/pebalaash/wallet
 * Returns the authenticated user's current DR.D code balance (from `balances` table).
 * This is the real balance earned by watching — not the legacy user_rewards table.
 */
router.get('/wallet', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const r = await query(
      'SELECT codes_count FROM balances WHERE user_id=$1',
      [userId]
    )
    const codes = Number(r.rows[0]?.codes_count) || 0
    res.json({ userId, codes })
  } catch (e) {
    console.error('[PEBALAASH] wallet error:', e.message)
    res.status(500).json({ message: 'Failed to fetch wallet' })
  }
})

/**
 * POST /api/pebalaash/checkout
 * Atomically deducts codes from the user's balance and creates an order.
 * Uses SELECT FOR UPDATE to prevent double-spend race conditions.
 */
router.post('/checkout', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const { productId, customerInfo } = req.body || {}
    const userId = req.user.id

    if (!productId || !customerInfo) {
      return res.status(400).json({ message: 'productId and customerInfo are required' })
    }

    await client.query('BEGIN')

    // Lock product row to prevent overselling
    const pr = await client.query(
      'SELECT id, price_codes, stock FROM products WHERE id=$1 FOR UPDATE',
      [productId]
    )
    const product = pr.rows[0]
    if (!product) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Product not found' })
    }
    if (product.stock <= 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Out of stock' })
    }

    // Lock user balance row to prevent double-spend
    const balRes = await client.query(
      'SELECT codes_count FROM balances WHERE user_id=$1 FOR UPDATE',
      [userId]
    )
    const current = Number(balRes.rows[0]?.codes_count) || 0
    if (current < product.price_codes) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Insufficient codes balance' })
    }

    const newBalance = current - product.price_codes

    // Deduct balance
    await client.query(
      'UPDATE balances SET codes_count=$1 WHERE user_id=$2',
      [newBalance, userId]
    )

    // Decrement stock, increment sold count
    await client.query(
      'UPDATE products SET stock = stock - 1, sold_count = sold_count + 1 WHERE id=$1',
      [productId]
    )

    // Create order record
    const ord = await client.query(
      `INSERT INTO orders(id, user_id, product_id, customer_info, status, total_codes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP) RETURNING id`,
      [
        crypto.randomUUID(),
        userId,
        productId,
        JSON.stringify(customerInfo),
        'completed',
        product.price_codes,
      ]
    )

    await client.query('COMMIT')

    res.json({
      success: true,
      remainingCodes: newBalance,
      orderId: ord.rows[0].id,
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
    const totalSold = await query('SELECT COUNT(*) AS count FROM orders')
    const totalRevenue = await query('SELECT COALESCE(SUM(total_codes),0) AS sum FROM orders')
    const lowStock = await query('SELECT * FROM products WHERE stock < 5')
    res.json({
      totalSold: Number(totalSold.rows[0]?.count) || 0,
      totalRevenueCodes: Number(totalRevenue.rows[0]?.sum) || 0,
      recentOrders: recent.rows,
      lowStockProducts: lowStock.rows,
    })
  } catch (e) {
    console.error('[PEBALAASH] admin/stats error:', e.message)
    res.status(500).json({ message: 'Failed to fetch admin stats' })
  }
})

export default router
