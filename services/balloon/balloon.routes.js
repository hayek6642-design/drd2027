import express from 'express'
import { validateClick, generateBalloonToken } from './balloon.service.js'

const router = express.Router()

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

router.post('/generate-token', (req, res) => {
  try {
    const { balloonId } = req.body

    if (!balloonId) {
      return res.status(400).json({ error: 'Missing balloonId' })
    }

    const token = generateBalloonToken(balloonId)
    res.json({ token })
  } catch (error) {
    console.error('Token generation error:', error)
    res.status(500).json({ error: 'Failed to generate token' })
  }
})

export default router