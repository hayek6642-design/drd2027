/**
 * quota.js — DRD2027 Database Quota Monitor
 *
 * Tracks row-reads/writes, storage, and user growth in-process so the admin
 * can see real-time quota pressure BEFORE Turso blocks requests.
 *
 * GET  /api/quota           — full dashboard (admin only)
 * GET  /api/quota/snapshot  — lightweight JSON for health checks
 *
 * Plan limits (Turso FREE tier — update PLAN_LIMITS if you upgrade):
 *   Storage  :  5 GB
 *   Rows Read:  500 Million / month
 *   Rows Write: 10 Million  / month
 */

import { Router } from 'express'
import { query } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'
import { validateAdminSession } from '../middleware/admin.js'

const router = Router()

// ─── Turso plan limits ───────────────────────────────────────────────────────
// Change these if you upgrade your Turso plan:
//   Free      : 500M reads | 10M writes | 5 GB
//   Developer : 2500M reads | 25M writes | 9 GB
//   Scaler    : 100B reads  | 100M writes | 24 GB
const PLAN = {
  name: 'Free',
  reads:   500_000_000,
  writes:  10_000_000,
  storage: 5 * 1024 * 1024 * 1024, // 5 GB in bytes
}

// ─── In-memory counters (reset monthly via resetCounters()) ─────────────────
let counters = {
  reads:  0,
  writes: 0,
  resetAt: startOfMonth(),
}

function startOfMonth() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function maybeReset() {
  const now = new Date()
  const resetDate = new Date(counters.resetAt)
  if (now.getFullYear() !== resetDate.getFullYear() ||
      now.getMonth()    !== resetDate.getMonth()) {
    counters = { reads: 0, writes: 0, resetAt: startOfMonth() }
  }
}

/**
 * Call this from db.js (or any query wrapper) to track operations.
 * rowsRead  — number of rows scanned by this query
 * rowsWritten — number of rows inserted/updated
 */
export function trackQuery(rowsRead = 0, rowsWritten = 0) {
  maybeReset()
  counters.reads  += rowsRead
  counters.writes += rowsWritten
}

// ─── Estimate DB size from sqlite dbstat ────────────────────────────────────
async function estimateStorageBytes() {
  try {
    const r = await query(
      `SELECT SUM(payload) * 4096 AS used_bytes FROM dbstat WHERE aggregate = TRUE`,
      []
    )
    return Number(r.rows[0]?.used_bytes ?? 0)
  } catch {
    return 0 // dbstat not always available
  }
}

// ─── Count all rows across key tables ───────────────────────────────────────
async function getTableStats() {
  const tables = [
    'users', 'messages', 'farragna_views', 'farragna_likes',
    'farragna_comments', 'farragna_videos', 'transactions',
    'e7ki_message_reads', 'e7ki_message_reactions',
    'battalooda_recordings', 'nostalgia_uploads', 'drmail_messages',
    'pebalaash_orders', 'rewards', 'assets_media',
  ]
  const stats = []
  for (const t of tables) {
    try {
      const r = await query(`SELECT COUNT(*) AS cnt FROM ${t}`, [])
      stats.push({ table: t, rows: Number(r.rows[0]?.cnt ?? 0) })
    } catch { /* table may not exist yet */ }
  }
  return stats.sort((a, b) => b.rows - a.rows)
}

// ─── Danger thresholds ───────────────────────────────────────────────────────
function danger(used, limit) {
  const pct = (used / limit) * 100
  if (pct >= 90) return '🔴 CRITICAL'
  if (pct >= 70) return '🟡 WARNING'
  return '🟢 OK'
}

function pct(used, limit) {
  return ((used / limit) * 100).toFixed(1) + '%'
}

function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

function fmtBytes(b) {
  if (b >= 1e9) return (b / 1e9).toFixed(2) + ' GB'
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'
  return (b / 1e3).toFixed(0) + ' KB'
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Full admin dashboard
router.get('/', validateAdminSession, async (req, res) => {
  try {
    maybeReset()

    const [storageBytes, tableStats, userRow] = await Promise.all([
      estimateStorageBytes(),
      getTableStats(),
      query('SELECT COUNT(*) AS cnt FROM users', []),
    ])

    const totalUsers = Number(userRow.rows[0]?.cnt ?? 0)

    // Projections
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const dayOfMonth  = new Date().getDate()
    const daysFraction = dayOfMonth / daysInMonth
    const projectedReads  = daysFraction > 0 ? Math.round(counters.reads  / daysFraction) : 0
    const projectedWrites = daysFraction > 0 ? Math.round(counters.writes / daysFraction) : 0

    res.json({
      plan: PLAN.name,
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      users: { total: totalUsers },
      storage: {
        used: fmtBytes(storageBytes),
        limit: fmtBytes(PLAN.storage),
        pct: pct(storageBytes, PLAN.storage),
        status: danger(storageBytes, PLAN.storage),
      },
      rowsRead: {
        monthToDate: fmt(counters.reads),
        projected:   fmt(projectedReads),
        limit:       fmt(PLAN.reads),
        pct:         pct(counters.reads, PLAN.reads),
        status:      danger(counters.reads, PLAN.reads),
      },
      rowsWritten: {
        monthToDate: fmt(counters.writes),
        projected:   fmt(projectedWrites),
        limit:       fmt(PLAN.writes),
        pct:         pct(counters.writes, PLAN.writes),
        status:      danger(counters.writes, PLAN.writes),
      },
      tables: tableStats,
      advice: buildAdvice(counters.reads, counters.writes, storageBytes, projectedReads, projectedWrites),
      recommendations: {
        upgradeAt: 'If projected reads > 400M or projected writes > 8M, upgrade to Developer plan ($4.99/mo)',
        developerPlan: '2.5B reads | 25M writes | 9 GB — handles ~10,000+ DAU comfortably',
        scalerPlan:    '100B reads | 100M writes | 24 GB — handles 50,000+ DAU',
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Lightweight snapshot — use for health-check polling
router.get('/snapshot', validateAdminSession, (req, res) => {
  maybeReset()
  const readPct  = (counters.reads  / PLAN.reads)  * 100
  const writePct = (counters.writes / PLAN.writes) * 100
  res.json({
    reads:  { used: fmt(counters.reads),  pct: readPct.toFixed(1),  status: danger(counters.reads,  PLAN.reads)  },
    writes: { used: fmt(counters.writes), pct: writePct.toFixed(1), status: danger(counters.writes, PLAN.writes) },
    alert:  readPct >= 70 || writePct >= 70,
  })
})

function buildAdvice(reads, writes, storage, projR, projW) {
  const tips = []
  if (projR > PLAN.reads * 0.7)
    tips.push('⚠️  Row reads on track to exceed 70% of monthly limit — consider upgrading to Developer plan or audit unindexed queries')
  if (projW > PLAN.writes * 0.7)
    tips.push('⚠️  Row writes on track to exceed 70% — check for write amplification in bulk operations')
  if (storage > PLAN.storage * 0.5)
    tips.push('⚠️  Storage over 50% — consider archiving old farragna_views / e7ki_message_reads rows')
  if (tips.length === 0)
    tips.push('✅  All quotas healthy — no action needed')
  return tips
}

export default router
