/**
 * EngagementEngine - Farragna/Battalooda Viral Engagement System
 * Sigmoid growth curves, engagement personas, comment generation
 * @version 1.0.0
 */

// ==========================================
// ENGAGEMENT PERSONAS
// ==========================================
const EngagementPersonas = {
  earlyAdopter: {
    name: 'Early Adopter',
    weight: 0.1,
    behavior: 'likes immediately, leaves short comments',
    timeWindow: [0, 2], // hours after post
    commentStyle: 'enthusiastic',
    likeProbability: 0.9
  },
  
  mainstream: {
    name: 'Mainstream',
    weight: 0.6,
    behavior: 'likes after social proof, detailed comments',
    timeWindow: [2, 24],
    commentStyle: 'balanced',
    likeProbability: 0.6
  },
  
  lateComer: {
    name: 'Late Comer',
    weight: 0.2,
    behavior: 'discovers via algorithm, nostalgic comments',
    timeWindow: [24, 168], // 24h - 1 week
    commentStyle: 'reflective',
    likeProbability: 0.3
  },
  
  viralAmplifier: {
    name: 'Viral Amplifier',
    weight: 0.1,
    behavior: 'shares, tags friends, creates discussions',
    trigger: 'engagement_velocity > threshold',
    commentStyle: 'provocative',
    likeProbability: 0.95,
    shareProbability: 0.7
  }
};

// ==========================================
// COMMENT TEMPLATES
// ==========================================
const CommentTemplates = {
  enthusiastic: [
    "This is absolutely {adjective}! 🔥",
    "Can't believe how {adjective} this is!",
    "Instantly shared with my {group}!",
    "The {feature} at {time} is everything!",
    "This deserves way more attention! {emoji}"
  ],
  
  question: [
    "How did you achieve that {effect}?",
    "What {tool} did you use for this?",
    "Is this available for {platform}?",
    "Can you make a tutorial on {topic}?",
    "How long did this take you?"
  ],
  
  appreciative: [
    "This helped me with {problem}, thank you!",
    "Exactly what I needed today 🙏",
    "Your content keeps getting better",
    "Quality post as always",
    "Saved this for later reference"
  ],
  
  reflective: [
    "Found this after {time}, still amazing!",
    "Wish I had seen this earlier",
    "This aged like fine wine 🍷",
    "Still one of the best posts here",
    "Discovered this gem today"
  ],
  
  provocative: [
    "Hot take: {hotTake}",
    "Unpopular opinion but {opinion}",
    "This is why {group} needs to pay attention",
    "Tag someone who needs to see this!",
    "Not enough people talking about this!"
  ]
};

const CommentFillers = {
  adjective: ['fire', 'amazing', 'insane', 'next level', 'clean', 'smooth', 'absolute madness'],
  group: ['friends', 'team', 'followers', 'network', 'family'],
  feature: ['drop', 'transition', 'chorus', 'build-up', 'hook', 'drop'],
  emoji: ['🔥', '💯', '✨', '🚀', '👏', '🎯', '💪'],
  effect: ['that', 'this', 'what you did', 'your result'],
  tool: ['tool', 'method', 'technique', 'strategy'],
  platform: ['platform', 'this', 'us', 'everyone'],
  topic: ['topic', 'subject', 'this', 'it'],
  time: ['time', 'point', 'moment', 'minute'],
  problem: ['problem', 'issue', 'struggle', 'question'],
  hotTake: ['this is overrated', 'it could be better', 'I disagree', 'this is just the beginning'],
  opinion: ['this is better', 'this is underrated', 'this needs more hype']
};

// ==========================================
// ENGAGEMENT GROWTH CURVE (Sigmoid)
// ==========================================
class EngagementGrowthCurve {
  constructor(options = {}) {
    this.params = {
      L: options.maxLikes || 1000,      // Max likes
      k: options.growthRate || 0.1,      // Growth rate
      t0: options.inflectionPoint || 12,  // Inflection point (hours)
      noiseFactor: options.noise || 0.15  // Organic noise
    };
  }
  
  /**
   * Calculate expected engagement using sigmoid function
   * f(t) = L / (1 + e^(-k(t - t0)))
   */
  calculateExpectedEngagement(ageHours, contentTier = 'standard') {
    const { L, k, t0 } = this.params;
    
    const tierMultipliers = {
      viral: 5.0,
      trending: 2.5,
      standard: 1.0,
      niche: 0.5,
      new: 0.3
    };
    
    const multiplier = tierMultipliers[contentTier] || 1.0;
    
    // Sigmoid calculation
    const baseEngagement = L / (1 + Math.exp(-k * (ageHours - t0)));
    
    // Add organic noise (realistic variation)
    const noise = 1 + (Math.random() * 2 - 1) * this.params.noiseFactor;
    
    return Math.floor(baseEngagement * multiplier * noise);
  }
  
  /**
   * Get expected likes at specific hour
   */
  getHourlyTarget(totalAgeHours) {
    const currentTotal = this.calculateExpectedEngagement(totalAgeHours);
    const previousTotal = this.calculateExpectedEngagement(Math.max(0, totalAgeHours - 1));
    return Math.max(0, currentTotal - previousTotal);
  }
  
  /**
   * Get realistic engagement with variance
   */
  getRealisticEngagement(ageHours, tier = 'standard') {
    const expected = this.calculateExpectedEngagement(ageHours, tier);
    const variance = expected * 0.2; // ±20% variance
    
    return {
      likes: Math.floor(expected + (Math.random() * 2 - 1) * variance),
      comments: Math.floor(expected * 0.1 + Math.random() * 5),
      shares: Math.floor(expected * 0.05 + Math.random() * 2)
    };
  }
}

// ==========================================
// COMMENT GENERATION ENGINE
// ==========================================
class CommentGenerationEngine {
  constructor() {
    this.templates = CommentTemplates;
    this.fillers = CommentFillers;
  }
  
  /**
   * Generate a comment based on persona
   */
  generate(contentContext = {}, persona = 'mainstream') {
    const template = this.selectTemplate(persona);
    return this.fillTemplate(template, contentContext);
  }
  
  /**
   * Select template based on persona
   */
  selectTemplate(persona) {
    const pools = {
      earlyAdopter: ['enthusiastic'],
      mainstream: ['appreciative', 'question'],
      lateComer: ['appreciative', 'reflective'],
      viralAmplifier: ['enthusiastic', 'question', 'provocative']
    };
    
    const pool = pools[persona] || ['appreciative'];
    const category = pool[Math.floor(Math.random() * pool.length)];
    const templates = this.templates[category];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  /**
   * Fill template with context and random fillers
   */
  fillTemplate(template, context) {
    return template.replace(/{(\w+)}/g, (match, key) => {
      // Use context value if available
      if (context[key]) return context[key];
      
      // Otherwise use random filler
      if (this.fillers[key]) {
        const options = this.fillers[key];
        return options[Math.floor(Math.random() * options.length)];
      }
      
      return match;
    });
  }
  
  /**
   * Generate multiple comments
   */
  generateBatch(count, context = {}) {
    const comments = [];
    const personas = Object.keys(EngagementPersonas);
    
    for (let i = 0; i < count; i++) {
      const persona = personas[Math.floor(Math.random() * personas.length)];
      comments.push(this.generate(context, persona));
    }
    
    return comments;
  }
}

// ==========================================
// ENGAGEMENT ENGINE (Main Class)
// ==========================================
class EngagementEngine {
  constructor(options = {}) {
    this.growthCurve = new EngagementGrowthCurve(options);
    this.commentEngine = new CommentGenerationEngine();
    this.personas = EngagementPersonas;
    
    // State
    this.contentId = null;
    this.ageHours = 0;
    this.tier = options.tier || 'standard';
    this.engagement = {
      likes: 0,
      comments: 0,
      shares: 0
    };
    
    // Configuration
    this.config = {
      enableComments: options.enableComments !== false,
      enableLikes: options.enableLikes !== false,
      enableShares: options.enableShares !== false,
      maxComments: options.maxComments || 50,
      commentDelay: options.commentDelay || 2000
    };
  }
  
  /**
   * Initialize engagement for a piece of content
   */
  initialize(contentId, ageHours = 0, tier = 'standard') {
    this.contentId = contentId;
    this.ageHours = ageHours;
    this.tier = tier;
    
    // Calculate initial engagement
    const realistic = this.growthCurve.getRealisticEngagement(ageHours, tier);
    
    this.engagement = {
      likes: realistic.likes,
      comments: realistic.comments,
      shares: realistic.shares
    };
    
    console.log(`[Engagement] Initialized for ${contentId}:`, this.engagement);
    
    return this.engagement;
  }
  
  /**
   * Update engagement based on time
   */
  tick() {
    this.ageHours += 1 / 3600; // Add 1 second
    
    const newEngagement = this.growthCurve.getRealisticEngagement(this.ageHours, this.tier);
    
    // Calculate delta
    const delta = {
      likes: newEngagement.likes - this.engagement.likes,
      comments: newEngagement.comments - this.engagement.comments,
      shares: newEngagement.shares - this.engagement.shares
    };
    
    this.engagement = newEngagement;
    
    return {
      total: this.engagement,
      delta
    };
  }
  
  /**
   * Get next comment (for display simulation)
   */
  getNextComment() {
    if (!this.config.enableComments) return null;
    
    // Determine persona based on current engagement
    const persona = this.determinePersona();
    
    // Generate comment
    return this.commentEngine.generate({}, persona);
  }
  
  /**
   * Determine which persona is most likely to engage now
   */
  determinePersona() {
    const hour = this.ageHours;
    
    if (hour < 2) return 'earlyAdopter';
    if (hour < 24) return 'mainstream';
    if (hour < 168) return 'lateComer';
    
    // Check velocity for viral amplifier
    const velocity = this.engagement.likes / Math.max(1, hour);
    if (velocity > 10) return 'viralAmplifier';
    
    return 'mainstream';
  }
  
  /**
   * Simulate engagement for testing
   */
  async simulateEngagement(durationSeconds = 60) {
    const updates = [];
    const steps = Math.floor(durationSeconds);
    
    for (let i = 0; i < steps; i++) {
      const tick = this.tick();
      
      // Maybe add a comment
      if (this.config.enableComments && Math.random() < 0.1) {
        tick.comment = this.getNextComment();
      }
      
      updates.push(tick);
      
      await new Promise(r => setTimeout(r, 1000));
    }
    
    return updates;
  }
  
  /**
   * Get analytics data
   */
  getAnalytics() {
    const velocity = this.ageHours > 0 ? this.engagement.likes / this.ageHours : 0;
    const projected24h = this.growthCurve.calculateExpectedEngagement(24, this.tier);
    const projected7d = this.growthCurve.calculateExpectedEngagement(168, this.tier);
    
    return {
      current: this.engagement,
      ageHours: this.ageHours,
      tier: this.tier,
      velocity: velocity.toFixed(2),
      projected24h,
      projected7d,
      topPersona: this.determinePersona()
    };
  }
}

// ==========================================
// VIRTUAL PROFILE GENERATOR (Anti-Detection)
// ==========================================
class VirtualProfileGenerator {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    ];
    
    this.timezones = [
      'America/New_York',
      'America/Los_Angeles',
      'America/Chicago',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Dubai',
      'Asia/Tokyo',
      'Asia/Singapore',
      'Africa/Cairo'
    ];
    
    this.languages = [
      'en-US', 'en-GB', 'ar-SA', 'fr-FR', 'de-DE', 'es-ES', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'
    ];
  }
  
  /**
   * Generate a virtual engagement profile
   */
  generateProfile() {
    return {
      userAgent: this.randomItem(this.userAgents),
      timezone: this.randomItem(this.timezones),
      language: this.randomItem(this.languages),
      screenRes: this.randomResolution(),
      sessionDuration: this.randomSessionDuration(),
      viewportSize: this.randomViewport(),
      platform: this.randomPlatform()
    };
  }
  
  randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  
  randomResolution() {
    const res = [
      '1920x1080', '1366x768', '1536x864', '1440x900',
      '1280x720', '2560x1440', '3840x2160'
    ];
    return res[Math.floor(Math.random() * res.length)];
  }
  
  randomViewport() {
    return {
      width: Math.floor(Math.random() * (1920 - 320) + 320),
      height: Math.floor(Math.random() * (1080 - 320) + 320)
    };
  }
  
  randomSessionDuration() {
    return Math.floor(Math.random() * 300) + 30; // 30s - 5min
  }
  
  randomPlatform() {
    const platforms = ['Windows', 'Macintosh', 'Linux', 'iOS', 'Android'];
    return platforms[Math.floor(Math.random() * platforms.length)];
  }
}

// ==========================================
// EXPORTS
// ==========================================
window.EngagementEngine = EngagementEngine;
window.EngagementGrowthCurve = EngagementGrowthCurve;
window.CommentGenerationEngine = CommentGenerationEngine;
window.VirtualProfileGenerator = VirtualProfileGenerator;
window.EngagementPersonas = EngagementPersonas;

// Also export as ES module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EngagementEngine,
    EngagementGrowthCurve,
    CommentGenerationEngine,
    VirtualProfileGenerator,
    EngagementPersonas
  };
}