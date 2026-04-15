/**
 * Zagel Brain - Recognition Module
 * Intent detection, sentiment analysis, entity extraction
 */

class IntentRecognizer {
  constructor() {
    this.intentPatterns = {
      greeting: /^(hi|hello|hey|مرحبا|اهلا|ماخبارك|كيفك)/i,
      question: /\?$|^(what|how|why|when|where|who|which|هل|ما|كيف|ليش)/i,
      farewell: /^(bye|goodbye|see you|مع السلامة|وداعا|باي)/i,
      complaint: /(bad|terrible|worst|hate|لا يعجبني|سيء|شكوى|مش مريح)/i,
      praise: /(great|amazing|awesome|love|excellent|جميل|ممتاز|عجبني|احب)/i,
      request: /(please|could you|can you|هل ممكن|لو تكرمت|عايز|ابغى)/i,
      joke: /(joke|haha|lol|funny|ضحك|فكاهي|مسلي)/i,
      thank: /(thanks|thank you|merci|shukran|شكرا|表示感谢)/i,
      help: /(help|aid|assist|مساعدة|مساعده|هل تقدر)/i,
      vent: /(frustrated|annoyed|upset| stressed|تعبان|زهقت|محبط)/i,
      secret: /(secret|private|don't tell| بيني و بينك|سر)/i,
      dream: /(dream|vision|hope|توقع| надежда|حلم)/i
    };
    
    this.sentimentLexicon = {
      positive: ['good', 'great', 'awesome', 'love', 'happy', 'amazing', 'excellent', 'beautiful', 'perfect', 'best', 'thank', 'good', 'cool', 'nice', 'fun', 'enjoy', 'glad', 'joy', 'pleased', 'satisfied', 'wonderful', 'fantastic', 'brilliant', 'superb', 'outstanding', 'marvelous', 'delightful', 'lovely', 'graceful', 'peaceful', 'calm', 'blessed', 'grateful', 'appreciate', 'positive', 'optimistic', 'hopeful', 'excited', 'thrilled', 'ecstatic', 'elated', 'cheerful', 'content', 'fulfilled', 'satisfied'],
      negative: ['bad', 'terrible', 'awful', 'hate', 'horrible', 'worst', 'poor', 'disappointing', 'sad', 'angry', 'upset', 'frustrated', 'annoyed', 'irritated', 'angry', 'furious', 'outraged', 'offended', 'hurt', 'pain', 'suffering', 'struggling', 'difficult', 'hard', 'challenging', 'stressful', 'anxious', 'worried', 'scared', 'afraid', 'fearful', 'terrified', 'horrified', 'shocked', 'appalled', 'disgusted', 'revolted', 'repulsed', 'miserable', 'depressed', 'desperate', 'hopeless', 'helpless', 'worthless', 'guilty', 'ashamed', 'embarrassed', 'humiliated', 'shameful'],
      questioning: ['?', 'why', 'how', 'what', 'when', 'where', 'who', 'which', 'whether', 'ask', 'wonder', 'curious', 'confused', 'unclear', 'explain', 'clarify', 'detail', 'elaborate'],
      joking: ['lol', 'haha', '😂', '🤣', 'joke', 'funny', 'rofl', 'lmao', 'funny', 'humor', 'comedy', 'comic', 'gag', 'prank', 'teasing', 'kidding'],
      suspicious: ['really', 'sure', 'honest', 'truth', 'suspicious', 'doubt', 'fake', 'lie', 'scam', 'trick', 'suspicious', 'strange', 'weird', 'odd', 'unusual']
    };
  }
  
  /**
   * Analyze user input and extract all recognition data
   */
  analyze(input) {
    if (!input || typeof input !== 'string') {
      return this.defaultResult();
    }
    
    const cleaned = input.trim().toLowerCase();
    
    return {
      intents: this.detectIntents(cleaned),
      sentiment: this.analyzeSentiment(cleaned),
      entities: this.extractEntities(cleaned),
      mood: this.detectMood(cleaned),
      isQuestion: this.intentPatterns.question.test(cleaned),
      isGreeting: this.intentPatterns.greeting.test(cleaned),
      isComplaint: this.intentPatterns.complaint.test(cleaned),
      isPraise: this.intentPatterns.praise.test(cleaned),
      confidence: this.calculateConfidence(cleaned),
      originalInput: input
    };
  }
  
  /**
   * Detect multiple intents from input
   */
  detectIntents(input) {
    const intents = [];
    
    for (const [intent, pattern] of Object.entries(this.intentPatterns)) {
      if (pattern.test(input)) {
        intents.push(intent);
      }
    }
    
    // Default to 'statement' if no intent matched
    if (intents.length === 0) {
      intents.push('statement');
    }
    
    // Get primary intent (first matched)
    const primary = intents[0];
    
    return { primary, all: intents };
  }
  
  /**
   * Analyze sentiment of input
   */
  analyzeSentiment(input) {
    const words = input.split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;
    let questioningScore = 0;
    let jokingScore = 0;
    
    for (const word of words) {
      if (this.sentimentLexicon.positive.some(w => input.includes(w))) positiveScore++;
      if (this.sentimentLexicon.negative.some(w => input.includes(w))) negativeScore++;
      if (this.sentimentLexicon.questioning.some(w => input.includes(w))) questioningScore++;
      if (this.sentimentLexicon.joking.some(w => input.includes(w))) jokingScore++;
    }
    
    const total = Math.max(1, positiveScore + negativeScore);
    
    let label = 'neutral';
    let score = 0;
    
    if (positiveScore > negativeScore && positiveScore > 0) {
      label = 'happy';
      score = positiveScore / total;
    } else if (negativeScore > positiveScore && negativeScore > 0) {
      label = 'sad';
      score = -negativeScore / total;
    } else if (jokingScore > 0) {
      label = 'joking';
      score = jokingScore / total;
    } else if (this.intentPatterns.complaint.test(input)) {
      label = 'angry';
      score = -0.5;
    }
    
    return {
      label,
      score: Math.max(0, Math.min(1, Math.abs(score))),
      rawScores: { positive: positiveScore, negative: negativeScore, joking: jokingScore, questioning: questioningScore },
      isSuspicious: this.sentimentLexicon.suspicious.some(w => input.includes(w))
    };
  }
  
  /**
   * Extract entities (simple pattern-based)
   */
  extractEntities(input) {
    const entities = {
      timeReferences: [],
      moneyReferences: [],
      nameReferences: [],
      locationReferences: [],
      pronounReferences: []
    };
    
    // Time patterns
    const timePatterns = {
      today: /today|اليوم|yom/i,
      tomorrow: /tomorrow|غدا|godb/i,
      yesterday: /yesterday|امس|ams/i,
      now: /now| сейчас|now/i,
      later: /later|بعد|later/i,
      week: /week|اسبوع|week/i,
      month: /month|شهر|month/i,
      year: /year|سنة|year/i
    };
    
    for (const [key, pattern] of Object.entries(timePatterns)) {
      if (pattern.test(input)) {
        entities.timeReferences.push(key);
      }
    }
    
    // Money patterns
    const moneyMatches = input.match(/(\$|د\.إ|دولار|ريال|euro|جنيه)\s*(\d+)/gi);
    if (moneyMatches) {
      entities.moneyReferences = moneyMatches;
    }
    
    // Pronoun detection (for context)
    if (/\b(I|me|my|mine|انا|لي|i)\b/i.test(input)) {
      entities.pronounReferences.push('first_person');
    }
    if (/\b(you|your|yours|انت|لك)\b/i.test(input)) {
      entities.pronounReferences.push('second_person');
    }
    if (/\b(he|she|they|he|she|هو|هي|هم)\b/i.test(input)) {
      entities.pronounReferences.push('third_person');
    }
    
    return entities;
  }
  
  /**
   * Detect user's mood from input
   */
  detectMood(input) {
    if (this.intentPatterns.joke.test(input)) return 'playful';
    if (this.intentPatterns.greeting.test(input)) return 'warm';
    if (this.intentPatterns.complaint.test(input)) return 'frustrated';
    if (this.intentPatterns.vent.test(input)) return 'venting';
    if (this.intentPatterns.dream.test(input)) return 'hopeful';
    if (this.intentPatterns.secret.test(input)) return 'confidential';
    if (this.intentPatterns.thank.test(input)) return 'grateful';
    if (this.intentPatterns.question.test(input)) return 'curious';
    
    return 'neutral';
  }
  
  /**
   * Calculate confidence in analysis
   */
  calculateConfidence(input) {
    let confidence = 0.5;
    
    // Longer inputs get higher confidence
    if (input.length > 50) confidence += 0.1;
    if (input.length > 100) confidence += 0.1;
    
    // More words = more confident
    const wordCount = input.split(/\s+/).length;
    if (wordCount > 5) confidence += 0.1;
    if (wordCount > 10) confidence += 0.1;
    
    return Math.min(0.95, confidence);
  }
  
  defaultResult() {
    return {
      intents: { primary: 'unknown', all: [] },
      sentiment: { label: 'neutral', score: 0, isSuspicious: false },
      entities: {},
      mood: 'neutral',
      isQuestion: false,
      isGreeting: false,
      isComplaint: false,
      isPraise: false,
      confidence: 0,
      originalInput: ''
    };
  }
}

// Export
window.IntentRecognizer = IntentRecognizer;
window.ZagelRecognition = new IntentRecognizer();