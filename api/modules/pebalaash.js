import { Router } from 'express'
import { query } from '../config/db.js'
import { requireRole } from '../middleware/admin.js'
import { spendCodes } from './rewards.js'

const router = Router()

router.get('/categories', async (_req, res) => {
  try {
    const r = await query('SELECT id, name, slug, created_at FROM categories ORDER BY name ASC')
    res.json(r.rows.map(row => ({ id: row.id, name: row.name, slug: row.slug, createdAt: row.created_at })))
  } catch (e) {
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
    res.status(500).json({ message: 'Failed to fetch product' })
  }
})

router.get('/wallet', async (req, res) => {
  try {
    const r = await query('SELECT balance FROM user_rewards WHERE user_id=$1', [req.user.clerkUserId])
    const codes = r.rows[0]?.balance || 0
    res.json({ userId: req.user.clerkUserId, codes })
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch wallet' })
  }
})

router.post('/checkout', async (req, res) => {
  try {
    const { productId, customerInfo } = req.body || {}
    const pr = await query('SELECT id, price_codes, stock FROM products WHERE id=$1', [productId])
    const product = pr.rows[0]
    if (!product) return res.status(404).json({ message: 'Product not found' })
    if (product.stock <= 0) return res.status(400).json({ message: 'Out of stock' })

    await spendCodes({ userId: req.user.clerkUserId, amount: product.price_codes, source: 'asset', meta: { productId } })

    await query('UPDATE products SET stock = stock - 1, sold_count = sold_count + 1 WHERE id=$1', [productId])

    const ord = await query(
      'INSERT INTO orders(id, user_id, product_id, customer_info, status, total_codes, created_at) VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP) RETURNING id',
      [crypto.randomUUID(), req.user.clerkUserId, productId, JSON.stringify(customerInfo), 'completed', product.price_codes]
    )

    const bal = await query('SELECT balance FROM user_rewards WHERE user_id=$1', [req.user.clerkUserId])
    res.json({ success: true, remainingCodes: bal.rows[0]?.balance || 0, orderId: ord.rows[0].id })
  } catch (e) {
    res.status(500).json({ message: 'Transaction failed' })
  }
})

router.get('/admin/stats', requireRole('admin'), async (_req, res) => {
  try {
    const recent = await query(
      'SELECT o.id, o.user_id, o.product_id, o.customer_info, o.status, o.total_codes, o.created_at, p.name AS product_name FROM orders o LEFT JOIN products p ON p.id=o.product_id ORDER BY o.created_at DESC LIMIT 50'
    )
    const totalSold = await query('SELECT COUNT(*) AS count FROM orders')
    const totalRevenue = await query('SELECT COALESCE(SUM(total_codes),0) AS sum FROM orders')
    const lowStock = await query('SELECT * FROM products WHERE stock < 5')
    res.json({
      totalSold: totalSold.rows[0]?.count || 0,
      totalRevenueCodes: totalRevenue.rows[0]?.sum || 0,
      recentOrders: recent.rows,
      lowStockProducts: lowStock.rows,
    })
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch admin stats' })
  }
})

export default router