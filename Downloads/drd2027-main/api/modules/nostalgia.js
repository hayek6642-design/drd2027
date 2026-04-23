import express from 'express'
import multer from 'multer'
import cloudinary from 'cloudinary'
import { query } from '../config/db.js'

const router = express.Router()

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dhpyneqgk',
  api_key: process.env.CLOUDINARY_API_KEY || '799518422494748',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'zfSbK0-zK3tHdmCWdcCduPcxtU4'
})

// Configure multer
const upload = multer({ dest: '/tmp/', limits: { fileSize: 200 * 1024 * 1024 } })

// In-memory store for nostalgia
let nostalgiaStore = {
  uploads: [],
  reactions: new Map(),
  comments: new Map(),
  shares: new Map(),
  cycles: [],
}

// SSE clients
const nostalgiaClients = new Set()

function nostalgiaBroadcast(event, payload) {
  const data = `event: ${event}\n` + `data: ${JSON.stringify(payload)}\n\n`
  for (const res of nostalgiaClients) {
    try { res.write(data) } catch (e) {}
  }
}

// Authentication is now handled by Clerk middleware - no JWT logic needed

function isAdmin(req) {
  if (!req.user) return false
  const roles = req.user?.roles || []
  return roles.includes('admin') || req.user?.id === 'admin'
}

// SSE endpoint
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
  nostalgiaClients.add(res)
  req.on('close', () => { nostalgiaClients.delete(res) })
})

// Feed
router.get('/feed', (req, res) => {
  const approved = nostalgiaStore.uploads.filter(u => u.status === 'approved')
  approved.sort((a,b) => new Date(a.admin_date) - new Date(b.admin_date))
  res.json(approved)
})

// Upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { title, artist, note } = req.body || {}
    const file = req.file
    if (!file || !title) return res.status(400).json({ message: 'Missing file or title' })
    const result = await cloudinary.v2.uploader.upload(file.path, { resource_type: 'video', folder: 'nostalgia', access_mode: 'private' })
    const upload = { id: String(Date.now()) + Math.random(), user_id: req.user.clerkUserId, title, artist, note, cloudinary_public_id: result.public_id, url: result.secure_url, status: 'pending', admin_date: null, created_at: new Date().toISOString() }
    nostalgiaStore.uploads.push(upload)
    res.json({ ok: true, upload })
  } catch (e) { res.status(500).json({ message: 'Upload failed' }) }
})

// Admin pending
router.get('/admin/pending', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Forbidden' })
  res.json(nostalgiaStore.uploads.filter(u => u.status === 'pending'))
})

// Admin assign date
router.post('/admin/assign-date', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Forbidden' })
  const { id, date } = req.body || {}
  const u = nostalgiaStore.uploads.find(x => x.id === id)
  if (!u) return res.status(404).json({ message: 'Not found' })
  u.admin_date = date
  res.json({ ok: true, upload: u })
})

// Admin approve
router.post('/admin/approve', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Forbidden' })
  const { id } = req.body || {}
  const u = nostalgiaStore.uploads.find(x => x.id === id)
  if (!u || !u.admin_date) return res.status(400).json({ message: 'Missing or date not assigned' })
  u.status = 'approved'
  nostalgiaBroadcast('feed_publish', { id })
  res.json({ ok: true, upload: u })
})

// Admin reject
router.post('/admin/reject', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Forbidden' })
  const { id } = req.body || {}
  const idx = nostalgiaStore.uploads.findIndex(x => x.id === id)
  if (idx === -1) return res.status(404).json({ message: 'Not found' })
  const [removed] = nostalgiaStore.uploads.splice(idx,1)
  res.json({ ok: true, removed })
})

// Adjust codes function
function adjustCodes(userId, delta) {
  try {
    const rewards = JSON.parse(global.codebank_rewards_cache || localStorage.getItem('codebank_rewards') || '{}')
    rewards.codes = (rewards.codes || 0) + delta
    rewards.lastUpdated = new Date().toISOString()
    global.codebank_rewards_cache = JSON.stringify(rewards)
    nostalgiaBroadcast('balance_change', { user_id: userId, codes: rewards.codes })
  } catch (e) {}
}

// React
router.post('/react', (req, res) => {
  const { upload_id, type, cancel } = req.body || {}
  const valid = ['like','super','mega']
  if (!valid.includes(type)) return res.status(400).json({ message: 'Invalid type' })
  const u = nostalgiaStore.uploads.find(x => x.id === upload_id)
  if (!u) return res.status(404).json({ message: 'Not found' })
  const key = `${upload_id}:${req.user.clerkUserId}`
  const cur = nostalgiaStore.reactions.get(key) || { like:0, super:0, mega:0 }
  const cost = type==='like'?1:type==='super'?100:1000
  if (cancel) {
    const refund = cur[type]*cost
    cur[type] = 0
    nostalgiaStore.reactions.set(key, cur)
    adjustCodes(req.user.clerkUserId, refund)
    adjustCodes(u.user_id, -refund)
    nostalgiaBroadcast('reaction_removed', { upload_id, user_id: req.user.clerkUserId, type })
    return res.json({ ok: true, reaction: cur })
  }
  cur[type] += 1
  nostalgiaStore.reactions.set(key, cur)
  adjustCodes(req.user.clerkUserId, -cost)
  adjustCodes(u.user_id, cost)
  nostalgiaBroadcast('reaction_added', { upload_id, user_id: req.user.clerkUserId, type, count: cur[type] })
  res.json({ ok: true, reaction: cur })
})

// Comments
router.post('/comments', (req, res) => {
  const { upload_id, text } = req.body || {}
  if (!text) return res.status(400).json({ message: 'Missing text' })
  const list = nostalgiaStore.comments.get(upload_id) || []
  const c = { id: String(Date.now())+Math.random(), user_id: req.user.clerkUserId, text, created_at: new Date().toISOString() }
  list.push(c)
  nostalgiaStore.comments.set(upload_id, list)
  nostalgiaBroadcast('comment_added', { upload_id, comment: c })
  res.json({ ok: true, comment: c })
})

router.get('/comments', (req, res) => {
  const { upload_id } = req.query || {}
  res.json(nostalgiaStore.comments.get(upload_id) || [])
})

// Share
router.post('/share', (req, res) => {
  const { upload_id } = req.body || {}
  const count = (nostalgiaStore.shares.get(upload_id) || 0) + 1
  nostalgiaStore.shares.set(upload_id, count)
  nostalgiaBroadcast('share', { upload_id, count })
  res.json({ ok: true, count, url: `${req.protocol}://${req.get('host')}/codebank?nostalgia=${upload_id}` })
})

// Cycle publish
router.post('/cycle/publish', (req, res) => {
  const approved = nostalgiaStore.uploads.filter(u => u.status==='approved')
  approved.sort((a,b)=> new Date(a.admin_date) - new Date(b.admin_date))
  nostalgiaStore.cycles.push({ id: String(Date.now()), published_at: new Date().toISOString(), count: approved.length })
  nostalgiaBroadcast('feed_publish', { count: approved.length })
  res.json({ ok: true })
})

// Cycle winner
router.post('/cycle/winner', (req, res) => {
  const uploads = nostalgiaStore.uploads.filter(u=>u.status==='approved')
  let best=null, bestScore=-1
  for (const u of uploads) {
    let totals={like:0,super:0,mega:0}
    for (const [key,val] of nostalgiaStore.reactions.entries()) {
      if (key.startsWith(u.id+':')) { totals.like+=val.like; totals.super+=val.super; totals.mega+=val.mega; }
    }
    const score = totals.like*1 + totals.super*3 + totals.mega*7
    if (score>bestScore || (score===bestScore && new Date(u.admin_date)<new Date(best.admin_date))) { best=u; bestScore=score; }
  }
  if (!best) return res.status(400).json({ message: 'No approved uploads' })
  adjustCodes(best.user_id, 5000)
  nostalgiaBroadcast('winner', { upload_id: best.id, score: bestScore })
  res.json({ ok: true, winner: best, score: bestScore })
})

export default router