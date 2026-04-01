import { Router } from 'express'
import { query } from '../config/db.js'
import { grantReward } from './rewards.js'

const router = Router()

router.post('/redeem', async (req, res) => {
  const { code } = req.body || {}
  const pool = (await import('../config/db.js')).pool
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Lock and validate code
    const lockRes = await client.query('SELECT * FROM corsa_codes WHERE code=$1', [code])
    if (lockRes.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Invalid code' })
    }
    
    const row = lockRes.rows[0]
    if (row.redeemed_at) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Code already redeemed' })
    }
    
    // Mark code as redeemed
    await client.query('UPDATE corsa_codes SET redeemed_by=$1, redeemed_at=CURRENT_TIMESTAMP WHERE id=$2', [req.user.clerkUserId, row.id])
    
    // Record transaction
    await client.query(
      'INSERT INTO corsa_transactions(id, user_id, code_id, amount, meta, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
      [crypto.randomUUID(), req.user.clerkUserId, row.id, row.value, JSON.stringify({ code })]
    )
    
    await client.query(
      'INSERT INTO transactions(id, user_id, type, amount, meta, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
      [crypto.randomUUID(), req.user.clerkUserId, 'corsa_redeem', row.value, JSON.stringify({ code })]
    )
    
    await client.query('COMMIT')
    
    // Use central reward engine
    const result = await grantReward({
      userId: req.user.clerkUserId,
      amount: row.value,
      source: 'corsa',
      meta: { code, code_id: row.id }
    })
    
    res.json({
      ok: true,
      value: row.value,
      reward_result: result
    })
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Corsa code redeem failed:', error.message)
    res.status(500).json({ message: 'Code redeem failed', error: error.message })
  } finally {
    if (typeof client.release === 'function') client.release()
  }
})

router.get('/transactions', async (req, res) => {
  try {
    const r = await query(
      'SELECT ct.*, cc.code FROM corsa_transactions ct JOIN corsa_codes cc ON ct.code_id = cc.id WHERE ct.user_id=$1 ORDER BY ct.created_at DESC',
      [req.user.clerkUserId]
    )
    res.json(r.rows)
  } catch (error) {
    console.error('Failed to fetch corsa transactions:', error.message)
    res.status(500).json({ message: 'Failed to fetch transactions' })
  }
})

export default router