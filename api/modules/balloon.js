import { Router } from 'express'
import { validateClick, handlePop } from '../../services/balloon/balloon.service.js'

const router = Router()

// Validate balloon click (deprecated - use /pop instead)
router.post('/click', async (req, res) => {
  try {
    const { userId, balloonId, token } = req.body

    if (!userId || !balloonId || !token) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const result = await validateClick({ userId, balloonId, token })
    res.json(result)
  } catch (error) {
    console.error('Balloon click validation error:', error)
    res.status(400).json({ error: error.message })
  }
})

// Handle balloon pop with points
router.post('/pop', async (req, res) => {
  try {
    const { points, timestamp, userId } = req.body

    if (!userId || points === undefined || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate timestamp (must be within last 5 minutes)
    const timeDiff = Date.now() - timestamp
    if (timeDiff > 5 * 60 * 1000) {
      return res.status(400).json({ error: 'Invalid timestamp' })
    }

    const result = await handlePop({ userId, points, timestamp })
    res.json({ 
      success: true, 
      points, 
      message: 'Points credited',
      engagementUpdated: true 
    })
  } catch (error) {
    console.error('Balloon pop error:', error)
    res.status(400).json({ error: error.message })
  }
})

export default router