import { Router } from 'express'
import { query } from '../config/db.js'

const router = Router()

// Create monetization_windows table if it doesn't exist
async function ensureMonetizationTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS monetization_windows (
        id TEXT PRIMARY KEY,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_rewards BIGINT NOT NULL DEFAULT 0,
        top_1_percent_threshold BIGINT NOT NULL DEFAULT 0,
        achieved BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_monetization_windows_dates ON monetization_windows(start_date, end_date)
    `)
  } catch (error) {
    console.error('Failed to ensure monetization table:', error.message)
  }
}

// Calculate and store monthly monetization window
export async function calculateMonthlyMonetizationWindow() {
  try {
    await ensureMonetizationTable()
    
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    // Check if window already exists for this month
    const existing = await query(
      'SELECT id FROM monetization_windows WHERE start_date = $1 AND end_date = $2',
      [startOfMonth, endOfMonth]
    )
    
    if (existing.rowCount > 0) {
      console.log('Monetization window already exists for this month')
      return
    }
    
    // Calculate total rewards for the month
    const totalRewardsResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_rewards 
       FROM reward_events 
       WHERE created_at >= $1 AND created_at <= $2`,
      [startOfMonth, endOfMonth]
    )
    
    const totalRewards = parseInt(totalRewardsResult.rows[0]?.total_rewards || '0')
    
    // Calculate top 1% threshold
    // SQLite doesn't have PERCENTILE_CONT - using a simpler approach for now
    const totalsResult = await query(`
      SELECT SUM(amount) as monthly_total
      FROM reward_events 
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY user_id
      ORDER BY monthly_total DESC
    `, [startOfMonth, endOfMonth])
    
    const totals = totalsResult.rows.map(r => parseInt(r.monthly_total))
    const index = Math.floor(totals.length * 0.01)
    const threshold = totals.length > 0 ? totals[index] || 0 : 0
    
    // Insert monetization window
    await query(`
      INSERT INTO monetization_windows (id, start_date, end_date, total_rewards, top_1_percent_threshold)
      VALUES ($1, $2, $3, $4, $5)
    `, [crypto.randomUUID(), startOfMonth, endOfMonth, totalRewards, threshold])
    
    console.log(`Monetization window created for ${startOfMonth.toISOString()} - ${endOfMonth.toISOString()}`)
    console.log(`Total rewards: ${totalRewards}, Top 1% threshold: ${threshold}`)
    
  } catch (error) {
    console.error('Failed to calculate monetization window:', error.message)
  }
}

// Get current monetization window
router.get('/current', async (req, res) => {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    const result = await query(
      `SELECT * FROM monetization_windows 
       WHERE start_date = $1 AND end_date = $2`,
      [startOfMonth, endOfMonth]
    )
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'No monetization window found for current month' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Failed to fetch current monetization window:', error.message)
    res.status(500).json({ message: 'Failed to fetch monetization window' })
  }
})

// Get user's progress in current monetization window
router.get('/progress', async (req, res) => {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    // Get user's monthly rewards
    const userRewardsResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as monthly_total
      FROM reward_events
      WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3
    `, [req.user.clerkUserId, startOfMonth, endOfMonth])
    
    const userTotal = parseInt(userRewardsResult.rows[0]?.monthly_total || '0')
    
    // Get monetization window
    const windowResult = await query(
      `SELECT * FROM monetization_windows 
       WHERE start_date = $1 AND end_date = $2`,
      [startOfMonth, endOfMonth]
    )
    
    const window = windowResult.rows[0]
    const threshold = window ? parseInt(window.top_1_percent_threshold) : 0
    const qualifies = userTotal >= threshold && threshold > 0
    
    res.json({
      user_id: req.user.clerkUserId,
      monthly_rewards: userTotal,
      window_threshold: threshold,
      qualifies_for_monetization: qualifies,
      window_exists: !!window
    })
    
  } catch (error) {
    console.error('Failed to fetch monetization progress:', error.message)
    res.status(500).json({ message: 'Failed to fetch monetization progress' })
  }
})

// Admin endpoint to trigger calculation
router.post('/calculate', async (req, res) => {
  try {
    await calculateMonthlyMonetizationWindow()
    res.json({ ok: true, message: 'Monetization window calculated successfully' })
  } catch (error) {
    console.error('Failed to calculate monetization window:', error.message)
    res.status(500).json({ message: 'Failed to calculate monetization window' })
  }
})

export default router