// ===============================
// 🎯 ZAGEL INTENTS - Hybrid Detection
// ===============================

// Rules-based patterns (fast, no latency)
const INTENT_PATTERNS = {
  CODES_CHECK: {
    keywords: ['code', 'كود', 'codes', 'أكواد', 'كم عندي كود'],
    patterns: [/how many codes/i, /عندي كم كود/i]
  },
  
  GOLD_TRANSFER: {
    keywords: ['gold', 'ذهب', 'transfer', 'ارسل', 'ابعت', 'حول'],
    patterns: [/send.*gold/i, /transfer.*gold/i, /ارسل.*ذهب/i],
    extract: (text) => ({
      amount: extractNumber(text),
      target: extractContact(text),
      reason: extractReason(text)
    })
  },
  
  SILVER_TRANSFER: {
    keywords: ['silver', 'فضة', 'send silver', 'ارسل فضة'],
    patterns: [/send.*silver/i, /transfer.*silver/i],
    extract: (text) => ({
      amount: extractNumber(text),
      target: extractContact(text)
    })
  },
  
  BALANCE_CHECK: {
    keywords: ['balance', 'رصيد', 'كم عندي', 'شحنتي', 'assets'],
    patterns: [/my balance/i, /كم رصيدي/i, /شحنتي/i]
  },
  
  OPEN_APP: {
    keywords: ['open', 'افتح', 'شغل', 'افتحلي'],
    patterns: [/open\s+(\w+)/i, /افتح\s+(\w+)/i],
    extract: (text) => ({
      appName: extractAppName(text)
    })
  },
  
  WEATHER: {
    keywords: ['weather', 'طقس', 'جو', 'temperature', 'حرارة'],
    patterns: [/what.*weather/i, /كيف.*الجو/i, /طقس/i]
  },
  
  CALL: {
    keywords: ['call', 'اتصل', 'phone', 'ring', 'ادق'],
    patterns: [/call\s+(\w+)/i, /اتصل\s+بـ?(\w+)/i],
    extract: (text) => ({
      contact: extractContact(text),
      phone: extractPhone(text)
    })
  },
  
  MATH: {
    keywords: ['calculate', 'احسب', 'كم', 'result', 'ناتج'],
    patterns: [/[\d+\-*/().]+/, /calculate/i, /احسب/i],
    extract: (text) => ({
      expression: text.replace(/[^0-9+\-*/().]/g, '')
    })
  }
}

// Helper extractors
function extractNumber(text) {
  const match = text.match(/\d+/)
  return match ? parseInt(match[0]) : null
}

function extractContact(text) {
  const contacts = {
    'wife': ['wife', 'زوجتي', 'مراتي'],
    'son': ['son', 'ابني', 'ولدي'],
    'daughter': ['daughter', 'بنتي'],
    'husband': ['husband', 'زوجي', 'جوزي'],
    'friend': ['friend', 'صاحبي', 'صديق']
  }
  
  for (const [key, words] of Object.entries(contacts)) {
    if (words.some(w => text.toLowerCase().includes(w))) return key
  }
  return null
}

function extractAppName(text) {
  const apps = {
    'safecode': ['safecode', 'safe', 'صاف', 'سيف'],
    'samma3ny': ['samma3ny', 'سمعني', 'music', 'موسيقى'],
    'pebalaash': ['pebalaash', 'barter', 'تبادل', 'peb'],
    'farragna': ['farragna', 'likes', 'لايكات', 'فراجنة'],
    'battalooda': ['battalooda', 'battle', 'حرب', 'بتالودة'],
    'games': ['games', 'game', 'لعبة', 'العاب'],
    'e7ki': ['e7ki', 'احكي', 'chat', 'chatting']
  }
  
  const lower = text.toLowerCase()
  for (const [app, keywords] of Object.entries(apps)) {
    if (keywords.some(k => lower.includes(k))) return app
  }
  return null
}

function extractReason(text) {
  const match = text.match(/for\s+(.+?)(?:\s+to|$)/i)
  return match ? match[1] : null
}

function extractPhone(text) {
  const match = text.match(/[\d\s-]{7,}/)
  return match ? match[0].replace(/\s/g, '') : null
}

// ===============================
// 🧠 Main Intent Detector
// ===============================

export function detectIntent(text, context = {}) {
  const lower = text.toLowerCase()
  
  // Check for multi-action (and, then, وبعدين)
  if (/\b(and|then|وبعدين|ثم)\b/i.test(text)) {
    const actions = text.split(/\b(and|then|وبعدين|ثم)\b/i)
      .filter(t => t.trim().length > 3 && !/\b(and|then|وبعدين|ثم)\b/i.test(t))
      .map(t => ({ text: t.trim() }))
    
    if (actions.length > 1) {
      return { type: 'MULTI_ACTION', actions }
    }
  }
  
  // Rules-based matching (fast path)
  for (const [intentType, config] of Object.entries(INTENT_PATTERNS)) {
    // Check keywords
    const hasKeyword = config.keywords.some(k => lower.includes(k.toLowerCase()))
    
    // Check regex patterns
    const hasPattern = config.patterns?.some(p => p.test(text))
    
    if (hasKeyword || hasPattern) {
      const result = { type: intentType, text }
      
      // Extract entities if extractor exists
      if (config.extract) {
        Object.assign(result, config.extract(text))
      }
      
      return result
    }
  }
  
  // Fallback to chat intent
  return { type: 'CHAT', text }
}

export default { detectIntent }
