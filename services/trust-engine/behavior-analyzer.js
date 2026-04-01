import { getHistory, recordEventStats, addFlags } from './trust-score.store.js' 
 
function stdDev(arr) { 
  if (!arr || arr.length < 2) return 0 
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length 
  const variance = arr.reduce((a, b) => Math.pow(a - mean, 2), 0) / arr.length 
  return Math.sqrt(variance) 
} 
 
export function analyzeBehavior(userId, event) { 
  const { balloonType, reactionTime, clickAccuracy, timestamp } = event || {} 
  const flags = [] 
  let delta = 0 
 
  // 🎯 Balloon rewards 
  if (balloonType === 'golden') delta += 0.05 
  if (balloonType === 'low') delta += 0.01 
  if (balloonType === 'existence') delta += 0.005 
 
  // 🔴 Trap 
  if (balloonType === 'trap') { 
    delta -= 0.08 
    flags.push('trap_click') 
  } 
 
  // ⚡ Reaction time 
  if (Number.isFinite(reactionTime)) { 
    if (reactionTime < 200) { 
      delta -= 0.05 
      flags.push('too_fast') 
    } else if (reactionTime > 300 && reactionTime < 1500) { 
      delta += 0.01 
    } 
  } 
 
  // 🎯 Accuracy 
  if (Number.isFinite(clickAccuracy)) { 
    if (clickAccuracy > 0.8) delta += 0.02 
    else delta -= 0.02 
  } 
 
  // 💾 Store stats 
  recordEventStats(userId, { 
    reactionTime, 
    clickAccuracy, 
    balloonType, 
    timestamp 
  }) 
 
  const history = getHistory(userId) 
  const now = timestamp || Date.now() 
 
  // 🔁 Trap pattern 
  const recentTraps = (history.trapClicks || []).filter(t => now - t < 30000) 
  if (recentTraps.length >= 3) { 
    delta -= 0.15 
    flags.push('random_clicker') 
  } 
 
  // 🤖 Bot detection 
  const rtStd = stdDev(history.reactionTimes || []) 
  const accStd = stdDev(history.accuracies || []) 
 
  if (rtStd < 30 || accStd < 0.01) { 
    delta -= 0.2 
    flags.push('bot_behavior') 
  } 
 
  if (flags.length) addFlags(userId, flags) 
 
  return { delta, flags } 
}
