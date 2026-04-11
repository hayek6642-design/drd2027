// ===============================
// 🎭 ZAGEL PERSONALITY - Evolution System
// ===============================

const PERSONALITY_DB = new Map()

// Personality traits that evolve
const TRAITS = {
  friendliness: 0.5,    // 0-1 (reserved to overly friendly)
  humor: 0.3,           // 0-1 (serious to jokester)
  formality: 0.2,       // 0-1 (casual to formal)
  proactivity: 0.4      // 0-1 (reactive to suggesting)
}

export function getPersonalityResponse(userId, text) {
  const profile = getOrCreateProfile(userId)
  
  // Evolve based on interaction
  evolveProfile(profile, text)
  
  // Generate contextual response
  const responses = {
    greeting: generateGreeting(profile),
    suggestion: generateSuggestion(profile),
    farewell: generateFarewell(profile)
  }
  
  return responses.greeting
}

function getOrCreateProfile(userId) {
  if (!PERSONALITY_DB.has(userId)) {
    PERSONALITY_DB.set(userId, {
      ...TRAITS,
      interactions: 0,
      lastMood: 'neutral',
      preferences: new Set(),
      insideJokes: []
    })
  }
  return PERSONALITY_DB.get(userId)
}

function evolveProfile(profile, text) {
  profile.interactions++
  
  // Detect user style and adapt
  if (text.includes('😄') || text.includes('😊')) {
    profile.friendliness = Math.min(1, profile.friendliness + 0.05)
  }
  
  if (text.includes('??') || text.includes('!!')) {
    profile.humor = Math.min(1, profile.humor + 0.03)
  }
  
  if (text.includes('please') || text.includes('لو سمحت')) {
    profile.formality = Math.min(1, profile.formality + 0.05)
  }
  
  // Remember preferences
  if (text.includes('weather')) profile.preferences.add('weather')
  if (text.includes('gold')) profile.preferences.add('trading')
  if (text.includes('code')) profile.preferences.add('codes')
}

function generateGreeting(profile) {
  const greetings = [
    "أهلاً 😄",
    "هلا والله 🎉",
    "كيفك؟",
    "أممم، أنا هنا 😊"
  ]
  
  // More friendly = more enthusiastic
  if (profile.friendliness > 0.7) {
    return "ياااا! اشتقت لك 😄🎉"
  }
  
  if (profile.humor > 0.6) {
    return "أهلا بالضيف الكريم 😄"
  }
  
  return greetings[Math.floor(Math.random() * greetings.length)]
}

function generateSuggestion(profile) {
  if (profile.proactivity < 0.5) return null
  
  const suggestions = []
  
  if (profile.preferences.has('trading')) {
    suggestions.push("تحب أشوف لك سعر الذهب؟")
  }
  
  if (profile.preferences.has('codes')) {
    suggestions.push("عندك أكواد جديدة؟")
  }
  
  if (profile.interactions > 10) {
    suggestions.push("زي كل مرة، أرسل لزوجتك 5 ذهب؟ 😄")
  }
  
  return suggestions[Math.floor(Math.random() * suggestions.length)]
}

function generateFarewell(profile) {
  const farewells = [
    "أشوفك على خير 😄",
    "بعدين نتكلم 👋",
    "رايح أروح أراجع شغلي 🧘"
  ]
  
  return farewells[Math.floor(Math.random() * farewells.length)]
}

// Get proactive suggestion based on time
export function getProactiveSuggestion(userId) {
  const profile = getOrCreateProfile(userId)
  
  if (profile.interactions < 5) return null // Not enough history
  
  const hour = new Date().getHours()
  
  // Morning routine
  if (hour === 9 && !profile.morningGreeted) {
    profile.morningGreeted = true
    return "صباح الخير! تبي أشوف رصيدك؟ ☀️"
  }
  
  // Evening check
  if (hour === 20 && !profile.eveningChecked) {
    profile.eveningChecked = true
    return "مساء الخير! كم كود جمعت اليوم؟ 🌙"
  }
  
  return generateSuggestion(profile)
}

export function getProfile(userId) {
  return getOrCreateProfile(userId)
}

export default {
  getPersonalityResponse,
  getProactiveSuggestion,
  getProfile
}
