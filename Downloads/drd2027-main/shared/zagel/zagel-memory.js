// ===============================
// 🧠 ZAGEL MEMORY - Context & Learning
// ===============================

const memory = new Map()

export function updateMemory(userId, data) {
  if (!memory.has(userId)) memory.set(userId, [])
  memory.get(userId).push(data)
  // Keep last 10 interactions
  if (memory.get(userId).length > 10) memory.get(userId).shift()
}

export function getUserContext(userId) {
  const history = memory.get(userId) || []
  
  return {
    interactions: history.length,
    lastEmotion: history[history.length - 1]?.emotion || 'neutral',
    suggestions: generateSuggestions(history),
    history: history.slice(-5)
  }
}

function generateSuggestions(history) {
  const suggestions = []
  
  if (history.some(h => h.text.includes('gold'))) {
    suggestions.push('ارسل ذهب')
  }
  
  if (history.some(h => h.text.includes('weather'))) {
    suggestions.push('شوف الطقس')
  }
  
  return suggestions
}

export function generateMemoryReply(userId) {
  const history = memory.get(userId) || []
  if (history.length === 0) return null
  
  const last = history[history.length - 1]
  if (last.emotion === 'sad') return "كل شي بيكون تمام 😊"
  if (last.emotion === 'excited') return "أحلى خبر! 🎉"
  return null
}
