/**
 * Instruction Classifier
 * Detects if user input is a command to modify Zajel/Zagel behavior
 * Supports Arabic instruction keywords
 * Accepts both "Zajel" and "Zagel" as system names
 */

import { logger } from '../utils/logger';
import { SYSTEM_NAMES, getSystemNamePattern, isValidSystemName } from '../constants/systemNames';

// Arabic instruction keywords and their meanings
const INSTRUCTION_KEYWORDS = {
  // Core instruction starters
  'خلي': 'set',           // "Make it..." / "Set..."
  'خلى': 'set',
  'افتكر': 'remember',    // "Remember..."
  'إفتكر': 'remember',
  'ركز': 'focus',         // "Focus on..."
  'غير': 'change',        // "Change..."
  'غيّر': 'change',
  'عدل': 'adjust',        // "Adjust..."
  'من دلوقتي': 'from_now', // "From now on..."
  'من النهاردة': 'from_today',
  
  // English equivalents (for bilingual support)
  'set': 'set',
  'make': 'set',
  'remember': 'remember',
  'focus': 'focus',
  'change': 'change',
  'adjust': 'adjust',
  'from now': 'from_now'
};

// Instruction patterns (regex for more complex detection)
const INSTRUCTION_PATTERNS = [
  /^(خلي|خلى|make|set)\s+/i,
  /^(افتكر|إفتكر|remember)\s+/i,
  /^(ركز|focus)(\s+(على|on)?)?\s*/i,
  /^(غير|غيّر|change|adjust)\s+/i,
  /^(من دلوقتي|من النهاردة|from now|from today)/i
];

// Response style indicators
const RESPONSE_STYLE_KEYWORDS = {
  short: ['قصير', 'short', 'مختصر', 'brief', 'quick'],
  detailed: ['طويل', 'long', 'مفصل', 'detailed', 'كامل', 'full'],
  normal: ['عادي', 'normal', 'متوسط', 'medium'],
  funny: ['مضحك', 'funny', 'فكاهي', 'humor', 'haha'],
  serious: ['جاد', 'serious', 'رسمي', 'formal'],
  poetic: ['شاعري', 'poetic', 'أدبي', 'literary']
};

export class InstructionClassifier {
  constructor() {
    this.confidenceThreshold = 0.7;
    this.systemNamePattern = getSystemNamePattern();
  }

  /**
   * Classify input text as instruction or normal message
   * Returns: { isInstruction: boolean, type: string, confidence: number, parsed: object, addressedToSystem: boolean }
   */
  classify(text) {
    if (!text || typeof text !== 'string') {
      return { isInstruction: false, type: 'unknown', confidence: 0, parsed: null, addressedToSystem: false };
    }

    const normalizedText = text.trim().toLowerCase();
    logger.log('Classifying:', normalizedText);

    // Check if text is addressed to Zajel/Zagel
    const addressedToSystem = this.checkSystemName(normalizedText);

    // Check 1: Keyword matching at start
    const keywordResult = this.checkKeywords(normalizedText);
    if (keywordResult.isInstruction) {
      return { ...keywordResult, addressedToSystem };
    }

    // Check 2: Pattern matching
    const patternResult = this.checkPatterns(normalizedText);
    if (patternResult.isInstruction) {
      return { ...patternResult, addressedToSystem };
    }

    // Check 3: Context analysis (if contains behavioral terms)
    const contextResult = this.checkBehavioralContext(normalizedText);
    if (contextResult.isInstruction) {
      return { ...contextResult, addressedToSystem };
    }

    // Default: Normal message
    return {
      isInstruction: false,
      type: 'message',
      confidence: 0.9,
      parsed: { text: normalizedText },
      addressedToSystem
    };
  }

  /**
   * Check if text addresses Zajel/Zagel by name
   * Returns true if text starts with or contains direct address to the system
   */
  checkSystemName(text) {
    // Check for pattern: "Zajel/Zagel, ..." or "يا Zajel/Zagel"
    const directionPatterns = [
      /^(يا\s+)?(zajel|zagel)\b/i,    // "يا zajel" or just "zajel"
      /(zajel|zagel)\s*[,\:]?\s+/i,   // "zajel: " or "zajel, "
    ];

    for (const pattern of directionPatterns) {
      if (pattern.test(text)) {
        logger.log('System name detected:', text.match(pattern)?.[0]);
        return true;
      }
    }

    return false;
  }

  /**
   * Normalize and validate system names
   * Accepts both "Zajel" and "Zagel"
   */
  isValidSystemName(name) {
    return isValidSystemName(name);
  }

  checkKeywords(text) {
    const words = text.split(/\s+/);
    const firstWord = words[0];
    
    if (INSTRUCTION_KEYWORDS[firstWord]) {
      const instructionType = INSTRUCTION_KEYWORDS[firstWord];
      logger.log('Keyword match:', firstWord, '->', instructionType);
      
      return {
        isInstruction: true,
        type: instructionType,
        confidence: 0.95,
        parsed: {
          keyword: firstWord,
          instructionType: instructionType,
          remainingText: words.slice(1).join(' ')
        }
      };
    }

    // Check for multi-word starters
    const firstTwoWords = words.slice(0, 2).join(' ');
    if (INSTRUCTION_KEYWORDS[firstTwoWords]) {
      return {
        isInstruction: true,
        type: INSTRUCTION_KEYWORDS[firstTwoWords],
        confidence: 0.95,
        parsed: {
          keyword: firstTwoWords,
          instructionType: INSTRUCTION_KEYWORDS[firstTwoWords],
          remainingText: words.slice(2).join(' ')
        }
      };
    }

    return { isInstruction: false };
  }

  checkPatterns(text) {
    for (const pattern of INSTRUCTION_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        logger.log('Pattern match:', pattern);
        return {
          isInstruction: true,
          type: 'pattern_match',
          confidence: 0.9,
          parsed: {
            matchedPattern: match[0],
            remainingText: text.replace(pattern, '').trim()
          }
        };
      }
    }
    return { isInstruction: false };
  }

  checkBehavioralContext(text) {
    // Check if text mentions response style without explicit command
    const detectedStyle = this.detectResponseStyle(text);
    
    if (detectedStyle && text.length < 50) {
      // Short text mentioning style = likely instruction
      return {
        isInstruction: true,
        type: 'implicit_style_change',
        confidence: 0.75,
        parsed: {
          suggestedStyle: detectedStyle,
          originalText: text
        }
      };
    }

    return { isInstruction: false };
  }

  detectResponseStyle(text) {
    for (const [style, keywords] of Object.entries(RESPONSE_STYLE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return style;
        }
      }
    }
    return null;
  }

  /**
   * Extract what user wants to change/instruct
   */
  extractInstructionDetails(classification) {
    const { type, parsed } = classification;
    
    switch (type) {
      case 'set':
      case 'change':
      case 'adjust':
        return this.extractPreferenceChange(parsed.remainingText);
      
      case 'remember':
        return this.extractMemoryItem(parsed.remainingText);
      
      case 'focus':
        return this.extractFocusTopic(parsed.remainingText);
      
      case 'implicit_style_change':
        return {
          category: 'response_style',
          value: parsed.suggestedStyle
        };
      
      default:
        return { category: 'general', value: parsed.remainingText };
    }
  }

  extractPreferenceChange(text) {
    // Extract "X to be Y" or "X as Y" patterns
    const patterns = [
      /(?:ردودك|responses?|replies?)\s*(?:تكون|to be|as)?\s*(.+)/i,
      /(?:اسلوبك|style|tone)\s*(?:يكون|to be)?\s*(.+)/i,
      /(?:نبرتك|mood|vibe)\s*(?:تكون|to be)?\s*(.+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = match[1].trim();
        const style = this.detectResponseStyle(value) || 'custom';
        
        return {
          category: 'response_style',
          value: style,
          customValue: value,
          original: text
        };
      }
    }

    return { category: 'general_preference', value: text };
  }

  extractMemoryItem(text) {
    // "Remember that I like X" or "افتكر اني بحب X"
    const patterns = [
      /(?:اني|that I|I)\s*(?:بحب|like|love|prefer)\s*(.+)/i,
      /(?:اسمي|my name is|name)\s*(?:هو|is)?\s*(.+)/i,
      /(?:عمر|age|سني)\s