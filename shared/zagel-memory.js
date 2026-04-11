// ===============================
// 🧠 ZAGEL MEMORY - User Context
// ===============================

const memory = new Map()

export function updateMemory(userId, data) {
  if (!memory.has(userId)) memory.set(userId, [])
  memory.get(userId).push(data)
  // Keep last 20 interactions
  if (memory.get(userId).length > 20) memory.get(userId).shift()
}

export function generateMemoryReply(userId) {
  const history = memory.get(userId) || []
  if (history.length === 0) return null
  
  const last = history[history.length - 1]
  if (last.emotion === 'sad') return "كل شي بيكون تمام 😊"
  if (last.emotion === 'excited') return "أحلى خبر! 🎉"
  return null
}

export function getUserContext(userId) {
  const history = memory.get(userId) || []
  
  // Analyze patterns
  const commands = history.map(h => h.text).slice(-5)
  const emotions = history.map(h => h.emotion).slice(-5)
  const hasEmojis = history.some(h => /😄|😊|🎉/.test(h.text))
  
  // Generate suggestions based on history
  const suggestions = []
  if (commands.some(c => /ذهب|gold/i.test(c))) {
    suggestions.push("ارسل ذهب آخر؟")
  }
  if (commands.some(c => /كود|code/i.test(c))) {
    suggestions.push("كم كود عندك؟")
  }
  
  return {
    history: commands,
    emotions,
    hasEmojis,
    suggestions,
    interactionCount: history.length
  }
}

export function clearUserMemory(userId) {
  memory.delete(userId)
}

export default {
  updateMemory,
  generateMemoryReply,
  getUserContext,
  clearUserMemory
}
