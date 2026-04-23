import { Router } from 'express'
import crypto from 'crypto'
import { query } from '../config/db.js'
import { publishEvent } from './logicode.js'

const router = Router()

async function ensureUserProfile(client, userId) {
  const userRes = await client.query('SELECT email FROM users WHERE id=$1 LIMIT 1', [userId])
  const email = userRes.rows[0]?.email || null
  const base = email ? String(email).split('@')[0] : `user_${String(userId).replace(/-/g, '').slice(0, 8)}`
  const username = base || `user_${String(userId).replace(/-/g, '').slice(0, 8)}`
  await client.query(
    'INSERT INTO users_profiles(user_id, username, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (user_id) DO UPDATE SET username = COALESCE(users_profiles.username, EXCLUDED.username)',
    [userId, username]
  )
}

/**
 * Central reward engine - grants rewards from multiple sources
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {number} params.amount - Reward amount
 * @param {string} params.source - Source of reward (watch, code, game, corsa, asset, admin)
 * @param {Object} params.meta - Additional metadata
 * @returns {Promise<Object>} Result with transaction details
 */
export async function grantReward({ userId, amount, source, meta = {} }) {
  const client = await (await import('../config/db.js')).pool.connect()
  
  try {
    await client.query('BEGIN')
    await ensureUserProfile(client, userId)
    
    // Validate amount
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new Error('Invalid reward amount')
    }
    
    // Validate source
    const validSources = ['watch', 'code', 'game', 'corsa', 'asset', 'admin']
    if (!validSources.includes(source)) {
      throw new Error('Invalid reward source')
    }
    
    // Insert into reward_events (source of truth)
    const eventResult = await client.query(
      'INSERT INTO reward_events(id, user_id, amount, type, meta, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING id',
      [crypto.randomUUID(), userId, amt, source, typeof meta === 'object' ? JSON.stringify(meta) : meta]
    )
    
    // Update user_rewards aggregate (atomic balance update)
    const balanceResult = await client.query(
      'INSERT INTO user_rewards(user_id, balance, last_updated) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (user_id) DO UPDATE SET balance = user_rewards.balance + EXCLUDED.balance, last_updated = CURRENT_TIMESTAMP RETURNING balance',
      [userId, Math.floor(amt)]
    )
    
    await client.query('COMMIT')
    
    // Emit real-time SSE event
    try {
      publishEvent('wealth', 'balance', {
        user_id: userId,
        delta: Math.floor(amt),
        source: source,
        new_balance: balanceResult.rows[0].balance
      })
    } catch (sseError) {
      console.warn('SSE publish failed:', sseError.message)
    }
    
    return {
      success: true,
      eventId: eventResult.rows[0].id,
      newBalance: balanceResult.rows[0].balance,
      amount: Math.floor(amt),
      source
    }
    
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    if (typeof client.release === 'function') client.release()
  }
}

export async function spendCodes({ userId, amount, source, meta = {} }) {
  const client = await (await import('../config/db.js')).pool.connect()
  try {
    await client.query('BEGIN')

    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new Error('Invalid spend amount')
    }

    const balRes = await client.query('SELECT balance FROM user_rewards WHERE user_id=$1', [userId])
    const current = balRes.rows[0]?.balance || 0
    if (current < Math.floor(amt)) {
      throw new Error('Insufficient balance')
    }

    const eventResult = await client.query(
      'INSERT INTO reward_events(id, user_id, amount, type, meta, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING id',
      [crypto.randomUUID(), userId, -Math.floor(amt), source || 'asset', typeof meta === 'object' ? JSON.stringify(meta) : meta]
    )

    const balanceResult = await client.query(
      'UPDATE user_rewards SET balance = balance - $2, last_updated = CURRENT_TIMESTAMP WHERE user_id=$1 RETURNING balance',
      [userId, Math.floor(amt)]
    )

    await client.query('COMMIT')

    try {
      publishEvent('wealth', 'balance', {
        user_id: userId,
        delta: -Math.floor(amt),
        source: source || 'asset',
        new_balance: balanceResult.rows[0].balance
      })
    } catch {}

    return {
      success: true,
      eventId: eventResult.rows[0].id,
      newBalance: balanceResult.rows[0].balance,
      amount: Math.floor(amt)
    }
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    if (typeof client.release === 'function') client.release()
  }
}

// Legacy endpoint for backward compatibility
router.post('/claim', async (req, res) => {
  try {
    const { reward_type, amount } = req.body || {}
    
    if (!reward_type || !amount) {
      return res.status(400).json({ message: 'Missing reward_type or amount' })
    }
    
    const result = await grantReward({
      userId: req.user.clerkUserId,
      amount: amount,
      source: reward_type,
      meta: { reward_type }
    })
    
    res.json({ ok: true, result })
  } catch (error) {
    console.error('Reward claim failed:', error.message)
    res.status(500).json({ message: 'Reward claim failed', error: error.message })
  }
})

// Get user's reward history
router.get('/history', async (req, res) => {
  try {
    const r = await query(
      'SELECT * FROM reward_events WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user.clerkUserId]
    )
    res.json(r.rows)
  } catch (error) {
    console.error('Failed to fetch reward history:', error.message)
    res.status(500).json({ message: 'Failed to fetch reward history' })
  }
})

// Get user's current balance
router.get('/balance', async (req, res) => {
  try {
    const r = await query(
      'SELECT balance, last_updated FROM user_rewards WHERE user_id=$1',
      [req.user.clerkUserId]
    )
    const balance = r.rows[0] || { balance: 0, last_updated: null }
    res.json({
      user_id: req.user.clerkUserId,
      balance: balance.balance || 0,
      last_updated: balance.last_updated
    })
  } catch (error) {
    console.error('Failed to fetch balance:', error.message)
    res.status(500).json({ message: 'Failed to fetch balance' })
  }
})

// Local → Neon sync endpoint
router.post('/sync', async (req, res) => {
  const { events } = req.body || {}
  
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ message: 'Events array is required' })
  }
  
  const client = await (await import('../config/db.js')).pool.connect()
  
  try {
    await client.query('BEGIN')
    
    let totalDelta = 0
    const processedEvents = []
    
    for (const event of events) {
      const { amount, source, created_at, meta = {} } = event
      
      // Validate event
      if (!amount || !source || !created_at) {
        continue // Skip invalid events
      }
      
      // Insert into reward_events
      const eventResult = await client.query(
        'INSERT INTO reward_events(user_id, amount, type, meta, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [req.user.clerkUserId, amount, source, meta, created_at]
      )
      
      // Update user_rewards aggregate
      const balanceResult = await client.query(
        'INSERT INTO user_rewards(user_id, balance, last_updated) VALUES ($1, $2, NOW()) ON CONFLICT (user_id) DO UPDATE SET balance = user_rewards.balance + EXCLUDED.balance, last_updated = NOW() RETURNING balance',
        [req.user.clerkUserId, Math.floor(amount)]
      )
      
      totalDelta += Math.floor(amount)
      processedEvents.push({
        event_id: eventResult.rows[0].id,
        amount: amount,
        source: source,
        created_at: created_at
      })
    }
    
    await client.query('COMMIT')
    
    // Emit batch SSE update
    try {
      publishEvent('wealth', 'balance', {
        user_id: req.user.clerkUserId,
        delta: totalDelta,
        source: 'sync',
        processed_events: processedEvents.length
      })
    } catch (sseError) {
      console.warn('Sync SSE publish failed:', sseError.message)
    }
    
    res.json({
      ok: true,
      processed_events: processedEvents.length,
      total_delta: totalDelta,
      new_balance: processedEvents.length > 0 ?
        (await query('SELECT balance FROM user_rewards WHERE user_id=$1', [req.user.clerkUserId])).rows[0]?.balance : null
    })
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Sync failed:', error.message)
    res.status(500).json({ message: 'Sync failed', error: error.message })
  } finally {
    client.release()
  }
})

export default router
