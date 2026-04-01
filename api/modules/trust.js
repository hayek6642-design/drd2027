import { Router } from 'express'
import { TrustEngine } from '../../services/trust-engine/trust-engine.js'
import { getTrustData } from '../../services/trust-engine/trust-score.store.js'

const router = Router()
const trustEngine = new TrustEngine()

router.get('/score', (req, res) => {
  try {
    const userId = (req.query && req.query.userId) ? String(req.query.userId) : ''
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const data = getTrustData(userId)
    const score = typeof data?.trustScore === 'number' ? data.trustScore : 0.5
    const level = score > 0.8 ? 'premium' : (score > 0.5 ? 'mid' : 'basic')
    return res.json({ trustScore: score, level })
  } catch (e) {
    try { console.error('[TRUST GET]', e && e.message ? e.message : e) } catch(_){}
    return res.status(500).json({ error: 'Failed to get trust score' })
  }
})

router.post('/event', (req, res) => {
  try {
    const body = req.body || {}
    const userId = String(body.userId || '')
    const balloonType = String(body.balloonType || '')
    const reactionTime = Number(body.reactionTime)
    const clickAccuracy = Number(body.clickAccuracy)
    if (!userId || !balloonType || !Number.isFinite(reactionTime) || !Number.isFinite(clickAccuracy)) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    const event = { balloonType, reactionTime, clickAccuracy, timestamp: Date.now() }
    const newScore = trustEngine.update(userId, event)
    const data = getTrustData(userId)
    const level = newScore > 0.8 ? 'premium' : (newScore > 0.5 ? 'mid' : 'basic')
    return res.json({ trustScore: newScore, level, flags: Array.isArray(data?.flags) ? data.flags : [] })
  } catch (e) {
    try { console.error('[TRUST EVENT]', e && e.message ? e.message : e) } catch(_){}
    return res.status(500).json({ error: 'Failed to update trust score' })
  }
})

export default router
