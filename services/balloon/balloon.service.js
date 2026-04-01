import { BalloonValidator } from '../../shared/balloon-engine/balloon-validator.js'

const validator = new BalloonValidator()

// Rate limiting store
const userClickHistory = new Map()

async function verifyBalloonToken(balloonId, token) {
  return validator.verifyBalloonToken(balloonId, token)
}

async function getBalloonValue(balloonId) {
  return validator.getBalloonValue(balloonId)
}

import { grantReward } from '../../api/modules/rewards.js'

async function addUserPoints(userId, value) {
  try {
    await grantReward({
      userId,
      amount: value,
      source: 'balloon',
      meta: { type: 'pop' }
    })
    console.log(`Added ${value} points to user ${userId} via reward engine`)
  } catch (error) {
    console.error(`Failed to add points to user ${userId}:`, error.message)
    throw error
  }
}

// Anti-cheat: Rate limiting
function checkRateLimit(userId) {
  const now = Date.now()
  const ONE_MINUTE = 60 * 1000
  const MAX_CLICKS_PER_MINUTE = 20

  if (!userClickHistory.has(userId)) {
    userClickHistory.set(userId, [now])
    return true
  }

  const clicks = userClickHistory.get(userId)
  const recentClicks = clicks.filter(timestamp => now - timestamp < ONE_MINUTE)

  if (recentClicks.length >= MAX_CLICKS_PER_MINUTE) {
    return false
  }

  recentClicks.push(now)
  userClickHistory.set(userId, recentClicks)
  return true
}

export async function validateClick({ userId, balloonId, token }) {
  const valid = await verifyBalloonToken(balloonId, token)

  if (!valid) {
    throw new Error('Invalid balloon')
  }

  const value = await getBalloonValue(balloonId)

  await addUserPoints(userId, value)

  return { success: true, value }
}

export async function handlePop({ userId, points, timestamp }) {
  // Check rate limit
  if (!checkRateLimit(userId)) {
    throw new Error('Rate limit exceeded')
  }

  // Validate points value
  if (points < 0 || points > 25) {
    throw new Error('Invalid points value')
  }

  // Add points to user
  await addUserPoints(userId, points)

  return { success: true, points }
}

export function generateBalloonToken(balloonId) {
  return validator.generateBalloonToken(balloonId)
}