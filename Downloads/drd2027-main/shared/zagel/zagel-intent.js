// ===============================
// 🎯 ZAGEL INTENTS - Hybrid Detection
// ===============================

const INTENT_PATTERNS = {
  CODES_CHECK: {
    keywords: ['code', 'كود', 'codes', 'أكواد'],
    patterns: [/how many codes/i, /عندي كم كود/i]
  },
  
  GOLD_TRANSFER: {
    keywords: ['gold', 'ذهب', 'transfer', 'ارسل'],
    patterns: [/send.*gold/i, /transfer.*gold/i],
    extract: (text) => ({
      amount: extractNumber(text),
      target: extractContact(text),
      reason: extractReason(text)
    })
  },
  
  SILVER_TRANSFER: {
    keywords: ['silver', 'فضة', 'send silver'],
    patterns: [/send.*silver/i, /transfer.*silver/i],
    extract: (text) => ({
      amount: extractNumber(text),
      target: extractContact(text)
    })
  },
  
  BALANCE_CHECK: {
    keywords: ['balance', 'رصيد', 'كم عندي'],
    patterns: [/my balance/i, /كم رصيدي/i]
  },
  
  OPEN_APP: {
    keywords: ['open', 'افتح', 'شغل'],
    patterns: [/open\s+(\w+)/i, /افتح\s+(\w+)/i],
    extract: (text) => ({
      appName: extractAppName(text)
    })
  },
  
  WEATHER: {
    keywords: ['weather', 'طقس', 'جو'],
    patterns: [/what.*weather/i, /كيف.*الجو/i]
  },
  
  CALL: {
    keywords: ['call', 'اتصل', 'phone'],
    patterns: [/call\s+(\w+)/i, /اتصل\s+بـ?(\w+)/i],
    extract: (text) => ({
      contact: extractContact(text),
      phone: extractPhone(text)
    })
  },
  
  MATH: {
    keywords: ['calculate', 'احسب', 'كم'],
    patterns: [/[\d+\-*/().]+/, /calculate/i],
    extract: (text) => ({
      expression: text.replace(/[^0-9+\-*/().]/g, '')
    })
  }
}

function extractNumber(text) {
  const match = text.match(/\d+/)
  return match ? parseInt(match[0]) : null
}

function extractContact(text) {
  const contacts = {
    'wife': ['wife', 'زوجتي', 'مراتي'],
    'son': ['son', 'ابني', 'ولدي'],
    'daughter': ['daughter', 'بنتي'],
    'friend': ['friend', 'صاحبي']
  }
  
  for (const [key, words] of Object.entries(contacts)) {
    if (words.some(w => text.toLowerCase().includes(w))) return key
  }
  return null
}

function extractAppName(text) {
  const apps = {
    'safecode': ['safecode', 'safe', 'صاف'],
    'samma3ny': ['samma3ny', 'سمعني', 'music'],
    'pebalaash': ['pebalaash', 'barter', 'تبادل'],
    'e7ki': ['e7ki', 'احكي', 'chat']
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

export function detectIntent(text, context = {}) {
  const lower = text.toLowerCase()
  
  // Check for multi-action
  if (/\b(and|then|وبعدين|ثم)\b/i.test(text)) {
    const actions = text.split(/\b(and|then|وبعدين|ثم)\b/i)
      .filter(t => t.trim().length > 3)
      .map(t => ({ text: t.trim() }))
    
    if (actions.length > 1) {
      return { type: 'MULTI_ACTION', actions }
    }
  }
  
  // Rules-based matching
  for (const [intentType, config] of Object.entries(INTENT_PATTERNS)) {
    const hasKeyword = config.keywords.some(k => lower.includes(k.toLowerCase()))
    const hasPattern = config.patterns?.some(p => p.test(text))
    
    if (hasKeyword || hasPattern) {
      const result = { type: intentType, text }
      
      if (config.extract) {
        Object.assign(result, config.extract(text))
      }
      
      return result
    }
  }
  
  return { type: 'CHAT', text }
}
