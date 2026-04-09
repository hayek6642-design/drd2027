function detectIntent(message) {
  if (!message || typeof message !== 'string') {
    return { type: 'general', confidence: 0 };
  }
  
  const msg = message.toLowerCase().trim();
  
  // Asset inquiry patterns
  const assetPatterns = [
    /code|asset|silver|gold|balance|portfolio|value|رصيد|كود|فضة|ذهب|أصول/i,
    /how many|كم|عندي/i
  ];
  
  for (const pattern of assetPatterns) {
    if (pattern.test(msg)) {
      return { 
        type: 'asset_inquiry', 
        priority: 'high',
        confidence: 0.9,
        requiresContext: true 
      };
    }
  }
  
  // Navigation patterns - Pebalaash
  if (/pebalaash|barter|trade|exchange|swap|تبادل|تداول|بلااش/i.test(msg)) {
    return { 
      type: 'navigate', 
      target: 'pebalaash',
      confidence: 0.95,
      requiresAuth: true 
    };
  }
  
  // Navigation patterns - Games
  if (/game|play|gamble|bet|win|risk|لعب|رهان|ربح/i.test(msg)) {
    return { 
      type: 'navigate', 
      target: 'games',
      confidence: 0.95,
      requiresAuth: true 
    };
  }
  
  // Navigation patterns - SafeCode
  if (/safe|vault|secure|store|protect|حماية|خزنة|آمن/i.test(msg)) {
    return { 
      type: 'navigate', 
      target: 'safecode',
      confidence: 0.9,
      requiresAuth: true 
    };
  }
  
  // Navigation patterns - Farragna
  if (/farragna|like|boost|social|إعجاب|لايك|شهرة/i.test(msg)) {
    return { 
      type: 'navigate', 
      target: 'farragna',
      confidence: 0.9 
    };
  }
  
  // Navigation patterns - Samma3ny
  if (/samma3ny|social|chat|friend|people|تواصل|أصدقاء/i.test(msg)) {
    return { 
      type: 'navigate', 
      target: 'samma3ny',
      confidence: 0.9 
    };
  }
  
  // Navigation patterns - YT Player (earning)
  if (/earn|watch|video|youtube|yt|gain|اكسب|شاهد|فيديو/i.test(msg)) {
    return { 
      type: 'navigate', 
      target: 'ytplayer',
      confidence: 0.9 
    };
  }
  
  // Action patterns - Transfer
  if (/transfer|send|move|give|ارسل|حول|نقل/i.test(msg)) {
    return { 
      type: 'action', 
      action: 'transfer',
      confidence: 0.85,
      requiresAuth: true 
    };
  }
  
  // Action patterns - Purchase/Buy
  if (/buy|purchase|get|shop|اشتري|شراء/i.test(msg)) {
    return { 
      type: 'action', 
      action: 'purchase',
      confidence: 0.85 
    };
  }
  
  // Help patterns
  if (/help|how|what|explain|guide|مساعدة|شرح|كيف/i.test(msg)) {
    return { 
      type: 'help',
      confidence: 0.8 
    };
  }
  
  // Greeting patterns
  if (/hello|hi|hey|مرحبا|أهلا|سلام/i.test(msg)) {
    return { 
      type: 'greeting',
      confidence: 0.9 
    };
  }
  
  return { 
    type: 'general',
    confidence: 0.5 
  };
}

function extractEntities(message) {
  const entities = {
    numbers: [],
    services: [],
    assets: []
  };
  
  // Extract numbers
  const numberMatches = message.match(/\d+/g);
  if (numberMatches) {
    entities.numbers = numberMatches.map(n => parseInt(n));
  }
  
  // Extract service mentions
  const serviceMap = {
    'pebalaash': ['pebalaash', 'بلااش', 'تبادل'],
    'games': ['games', 'ألعاب', 'لعبة'],
    'safecode': ['safecode', 'كود آمن', 'خزنة'],
    'farragna': ['farragna', 'فراجنة', 'لايك'],
    'samma3ny': ['samma3ny', 'سمعني', 'تواصل']
  };
  
  for (const [service, keywords] of Object.entries(serviceMap)) {
    for (const keyword of keywords) {
      if (message.toLowerCase().includes(keyword)) {
        entities.services.push(service);
        break;
      }
    }
  }
  
  // Extract asset mentions
  if (/code|كود/i.test(message)) entities.assets.push('codes');
  if (/silver|فضة/i.test(message)) entities.assets.push('silver');
  if (/gold|ذهب/i.test(message)) entities.assets.push('gold');
  
  return entities;
}

module.exports = { detectIntent, extractEntities };