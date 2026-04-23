// ===============================
// 🎭 ZAGEL PERSONALITY - Evolution System
// ===============================

const PERSONALITY_DB = new Map()

const TRAITS = {
  friendliness: 0.5,
  humor: 0.3,
  formality: 0.2,
  proactivity: 0.4
}

export function getPersonalityResponse(userId, text) {
  const profile = getOrCreateProfile(userId)
  evolveProfile(profile, text)
  return generateGreeting(profile)
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
  
  if (text.includes('😄') || text.includes('😊')) {
    profile.friendliness = Math.min(1, profile.friendliness + 0.05)
  }
  
  if (text.includes('??') || text.includes('!!')) {
    profile.humor = Math.min(1, profile.humor + 0.03)
  }
}

function generateGreeting(profile) {
  const greetings = [
    "أهلاً 😄",
    "هلا والله 🎉",
    "كيفك؟",
    "أممم، أنا هنا 😊"
  ]
  
  if (profile.friendliness > 0.7) {
    return "ياااا! اشتقت لك 😄🎉"
  }
  
  return greetings[Math.floor(Math.random() * greetings.length)]
}

export function getProactiveSuggestion(userId) {
  const profile = getOrCreateProfile(userId)
  if (profile.interactions < 5) return null
  return "أي شي تبي تفعل؟ 😄"
}
