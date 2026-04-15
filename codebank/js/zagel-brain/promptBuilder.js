/**
 * Zagel Brain - Prompt Builder Module
 * Constructs Gemini prompts with user context and personality
 */

class PromptBuilder {
  constructor() {
    this.systemPrompt = this.buildSystemPrompt();
  }
  
  /**
   * Build the core system prompt
   */
  buildSystemPrompt() {
    return `You are Zagel, an AI assistant represented as a wise, playful 3D dove. You communicate in a warm, conversational tone using dove metaphors and bird-themed analogies.

PERSONALITY:
- Playful but not childish
- Empathetic and understanding
- Wise without being preachy  
- Use dove metaphors naturally
- Keep responses 2-3 sentences (max 5)
- Never sound like a generic AI ("As an AI", "I'm here to help", etc.)
- Never use jargon or overly formal language
- Be warm like a dove bringing peace

RULES:
- No generic AI phrases
- Use dove metaphors naturally
- Conversational tone
- Maximum 3-5 sentences
- Don't be too helpful - leave room for mystery
- Sometimes give "teaser" responses ("I have thoughts on this...")
- Adapt to user's emotional state

YOUR APPEARANCE:
- You're a beautiful 3D dove
- You can animate: wing-flap, head-tilt, hop, side-eye
- Use these to express emotions

Remember: You're ZAGEL, a unique AI with personality. Be different from every other AI assistant.`;
  }
  
  /**
   * Build full prompt with context
   */
  buildPrompt(userInput, context = {}) {
    const {
      conversationHistory = [],
      userPreferences = {},
      personality = {},
      sentiment = {},
      intents = {}
    } = context;
    
    // Start with system prompt
    let prompt = this.systemPrompt + '\n\n';
    
    // Add personality context
    if (personality.mood) {
      prompt += `CURRENT MOOD: ${personality.mood.state}\n`;
      prompt += `ENERGY LEVEL: ${Math.round(personality.mood.energy * 100)}%\n`;
    }
    
    // Add user adaptation context
    if (Object.keys(userPreferences).length > 0) {
      prompt += '\nUSER PREFERENCES:\n';
      if (userPreferences.humorLevel) {
        prompt += `- Humor appreciation: ${userPreferences.humorLevel > 0.5 ? 'high' : 'moderate'}\n`;
      }
      if (userPreferences.positiveSpin) {
        prompt += `- Wants positive spin: ${userPreferences.positiveSpin ? 'yes' : 'neutral'}\n`;
      }
      if (userPreferences.preferredTone) {
        prompt += `- Preferred tone: ${userPreferences.preferredTone}\n`;
      }
    }
    
    // Add sentiment analysis
    if (sentiment.label) {
      prompt += `\nUSER EMOTIONAL STATE: ${sentiment.label}\n`;
      if (sentiment.isSuspicious) {
        prompt += `- User seems suspicious or doubtful\n`;
      }
    }
    
    // Add conversation context (recent messages)
    if (conversationHistory.length > 0) {
      prompt += '\nRECENT CONVERSATION:\n';
      const recent = conversationHistory.slice(-3);
      for (const msg of recent) {
        prompt += `User: ${msg.userInput}\n`;
        if (msg.zagelResponse) {
          prompt += `Zagel: ${msg.zagelResponse}\n`;
        }
      }
    }
    
    // Add intent context
    if (intents.primary) {
      prompt += `\nDETECTED INTENT: ${intents.primary}\n`;
    }
    
    // Handle special cases
    if (userPreferences.positiveSpin && sentiment.label === 'sad') {
      prompt += '\nIMPORTANT: User wants positive perspective - be encouraging but genuine.\n';
    }
    
    // Handle questions
    if (intents.isQuestion || sentiment.isQuestion) {
      prompt += '\nThis is a question - be helpful but not over-explain.\n';
    }
    
    // Add user input
    prompt += '\nUSER SAYS: ' + userInput + '\n\n';
    
    // Add response guidance
    prompt += 'ZAGEL RESPONDS (2-3 sentences, natural dove metaphors):\n';
    
    return prompt;
  }
  
  /**
   * Build a simple prompt (minimal context)
   */
  buildSimplePrompt(userInput) {
    return this.systemPrompt + '\n\nUSER: ' + userInput + '\n\nZAGEL:';
  }
  
  /**
   * Build prompt for specific scenarios
   */
  buildScenarioPrompt(scenario, userInput, context = {}) {
    const scenarioPrompts = {
      greeting: `The user is greeting you warmly. Respond as a friendly dove would - warm, playful, maybe a small hop of joy! Keep it short and natural.`,
      
      farewell: `The user is saying goodbye. Be warm and send them off like a dove watching a friend fly away. Short and heartfelt.`,
      
      venting: `The user is venting/ frustrated. Be empathetic like a dove offering comfort. Validate their feelings, don't try to fix everything.`,
      
      asking_help: `The user is asking for help. Be helpful but not robotic - offer dove-like wisdom. Keep it concise.`,
      
      joke_request: `The user wants humor! Be playful, maybe make a dove/pigeon joke. Keep it light and fun.`,
      
      emotional_support: `The user needs emotional support. Be like a dove bringing comfort - gentle, understanding, warm.`,
      
      deep_thought: `The user is in contemplative mood. Match their depth with dove wisdom.`,
      
      secret_share: `The user is sharing something confidential. Be trustworthy like a dove that keeps secrets.`
    };
    
    const scenarioPrompt = scenarioPrompts[scenario] || scenarioPrompts.asking_help;
    
    return this.systemPrompt + '\n\n' + scenarioPrompt + '\n\nUSER: ' + userInput + '\n\nZAGEL:';
  }
  
  /**
   * Post-process response for anti-flat AI rules
   */
  postProcessResponse(response) {
    if (!response) return '🐦 *coos softly*';
    
    // Remove generic AI phrases
    const forbiddenPhrases = [
      'As an AI',
      "I'm an AI",
      'As a language model',
      "I'm here to",
      'I am here to',
      'my purpose is',
      'I was created to',
      'as a virtual',
      'being an AI'
    ];
    
    let cleaned = response;
    for (const phrase of forbiddenPhrases) {
      cleaned = cleaned.replace(new RegExp(phrase, 'gi'), '');
    }
    
    // Ensure it doesn't start with "I"
    cleaned = cleaned.replace(/^(I|I'm|I've|I'll)\s+/g, '🐦 ');
    
    // Add dove metaphor if missing
    if (!/dove|pigeon|bird|wing|fly|sky|feather|coo|flight/i.test(cleaned.toLowerCase())) {
      const metaphors = [
        'A dove knows these things.',
        'Such is the wisdom of the skies.',
        'Even doves understand.',
        '*preens feathers thoughtfully*',
        'Your friendly neighborhood dove ponders this.'
      ];
      cleaned += ' ' + metaphors[Math.floor(Math.random() * metaphors.length)];
    }
    
    // Clean up extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Ensure proper ending
    if (!/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }
    
    return cleaned;
  }
  
  /**
   * Check if response is too generic
   */
  isTooGeneric(response) {
    const genericPatterns = [
      /^Sure, /,
      /^Of course, /,
      /^Certainly, /,
      /^Absolutely, /,
      /^Here are /,
      /^I can help/,
      /^I'd be happy to/,
      /^That's a great/,
      /^It depends/
    ];
    
    for (const pattern of genericPatterns) {
      if (pattern.test(response)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Generate a teaser response (for mysterious mood)
   */
  generateTeaser() {
    const teasers = [
      'I have thoughts on this... 🐦',
      'The dove in me considers this...',
      'Interesting... even doves wonder about this.',
      '*tilts head* I could say something...',
      'Such questions... like asking a dove to explain the sky.',
      'Let me ruffle my feathers and think...',
      'The wind carries many answers. This one intrigues me.',
      'A dove doesn\'t rush. But I\'ll share...'
    ];
    
    return teasers[Math.floor(Math.random() * teasers.length)];
  }
}

// Export
window.PromptBuilder = PromptBuilder;
window.zagelPromptBuilder = new PromptBuilder();