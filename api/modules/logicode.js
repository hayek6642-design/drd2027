import { Router } from 'express'
import { query } from '../config/db.js'
import { requireRole } from '../middleware/admin.js'

const router = Router()

const channels = new Map()

function subscribe(channel, res) {
  if (!channels.has(channel)) channels.set(channel, new Set())
  channels.get(channel).add(res)
}

function unsubscribe(channel, res) {
  const set = channels.get(channel)
  if (!set) return
  set.delete(res)
  if (set.size === 0) channels.delete(channel)
}

function publish(channel, event, data) {
  const set = channels.get(channel)
  if (!set) return
  const line = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const res of set) {
    try { res.write(line) } catch {}
  }
}

export function publishEvent(channel, event, data) {
  publish(channel, event, data)
}

router.get('/events/stream', async (req, res) => {
  const channel = (req.query.channel || 'global').toString()
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  subscribe(channel, res)
  res.write(`data: ${JSON.stringify({ ok: true, channel })}\n\n`)
  const interval = setInterval(() => {
    try { res.write(`event: ping\ndata: ${Date.now()}\n\n`) } catch {}
  }, 25000)
  req.on('close', () => {
    clearInterval(interval)
    unsubscribe(channel, res)
  })
})

router.post('/events/publish', requireRole('admin'), async (req, res) => {
  const { channel, event, data } = req.body || {}
  const ch = (channel || 'global').toString()
  const ev = (event || 'update').toString()
  publish(ch, ev, data ?? {})
  res.json({ ok: true })
})

router.post('/scores', async (req, res) => {
  const { game_name, score } = req.body || {}
  const g = await query('SELECT 1 FROM games WHERE name=$1', [game_name])
  if (g.rowCount === 0) return res.status(400).json({ message: 'unknown game' })
  await query('INSERT INTO game_scores(id, user_id, game_name, score, created_at) VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)', [crypto.randomUUID(), req.user.clerkUserId, game_name, score])
  publish(`game:${game_name}`, 'score', { user_id: req.user.clerkUserId, game_name, score })
  res.status(201).json({ ok: true })
})

router.get('/leaderboard', async (req, res) => {
  const { game_name } = req.query
  const r = await query('SELECT u.display_name, s.score, s.created_at FROM game_scores s JOIN users u ON u.id=s.user_id WHERE s.game_name=$1 ORDER BY s.score DESC LIMIT 100', [game_name])
  res.json(r.rows)
})

router.get('/history/me', async (req, res) => {
  const r = await query('SELECT game_name, score, created_at FROM game_scores WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [req.user.clerkUserId])
  res.json(r.rows)
})

router.get('/stats/me', async (req, res) => {
  const r = await query('SELECT game_name, MAX(score) AS max_score, COUNT(*) AS plays FROM game_scores WHERE user_id=$1 GROUP BY game_name ORDER BY max_score DESC', [req.user.clerkUserId])
  res.json(r.rows)
})

export async function getWealthLeaderboard(limit = 10) {
  const r = await query(
    'SELECT up.user_id AS user_id, up.username AS username, COALESCE(ur.balance, 0) AS balance FROM users_profiles up LEFT JOIN user_rewards ur ON ur.user_id = up.user_id ORDER BY balance DESC LIMIT $1',
    [limit]
  )
  return r.rows
}

// Wealth Leaderboard endpoint - JWT protected
router.get('/wealth-leaderboard', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50))
    const rows = await getWealthLeaderboard(limit)
    res.json(rows)
  } catch (e) {
    console.error('Wealth leaderboard fetch failed:', e.message)
    res.status(500).json({ error: 'Failed to fetch wealth leaderboard' })
  }
})

export default router