const store = new Map()

function getUser(userId) {
  const id = String(userId)
  if (!store.has(id)) {
    store.set(id, {
      userId: id,
      trustScore: 0.5,
      lastUpdated: Date.now(),
      flags: [],
      reactionTimes: [],
      accuracies: [],
      trapClicks: [],
      lock: false
    })
  }
  return store.get(id)
}

export function getTrustScore(userId) {
  return getUser(userId).trustScore
}

export function saveTrustScore(userId, score) {
  const u = getUser(userId)
  u.trustScore = Number(score)
  u.lastUpdated = Date.now()
  return u.trustScore
}

export function addFlags(userId, flags = []) {
  const u = getUser(userId)
  for (const f of flags) {
    if (!u.flags.includes(f)) u.flags.push(f)
  }
  u.lastUpdated = Date.now()
  return u.flags.slice()
}

export function recordEventStats(userId, { reactionTime, clickAccuracy, balloonType, timestamp }) {
  const u = getUser(userId)
  if (Number.isFinite(reactionTime)) {
    u.reactionTimes.push(reactionTime)
    if (u.reactionTimes.length > 100) u.reactionTimes.shift()
  }
  if (Number.isFinite(clickAccuracy)) {
    u.accuracies.push(clickAccuracy)
    if (u.accuracies.length > 100) u.accuracies.shift()
  }
  if (balloonType === 'trap' && Number.isFinite(timestamp)) {
    u.trapClicks.push(timestamp)
    // keep last 20 timestamps
    if (u.trapClicks.length > 20) u.trapClicks.shift()
  }
}

export function getHistory(userId) {
  const u = getUser(userId)
  return {
    reactionTimes: u.reactionTimes.slice(),
    accuracies: u.accuracies.slice(),
    trapClicks: u.trapClicks.slice(),
    flags: u.flags.slice(),
    trustScore: u.trustScore
  }
}

export function withLock(userId, fn) {
  const u = getUser(userId)
  if (u.lock) return { ok: false, error: 'locked' }
  u.lock = true
  try {
    const r = fn()
    return { ok: true, result: r }
  } finally {
    u.lock = false
  }
}

export function getTrustData(userId) {
  const u = getUser(userId)
  return {
    userId: u.userId,
    trustScore: u.trustScore,
    lastUpdated: u.lastUpdated,
    flags: u.flags.slice()
  }
}
