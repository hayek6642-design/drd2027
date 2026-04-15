/**
 * Zagel Brain - Response Engine
 * Orchestrates all brain modules, connects to Gemini API and 3D animations
 */

class ResponseEngine {
  constructor() {
    this.recognition = window.ZagelRecognition;
    this.memory = window.zagelMemory;
    this.personality = window.zagelPersonality;
    this.promptBuilder = window.zagelPromptBuilder;
    
    // Gemini API configuration
    this.geminiConfig = {
      apiKey: null,
      model: 'gemini-1.5-pro',
      temperature: 0.7,
      maxTokens: 500
    };
    
    // Response state
    this.isProcessing = false;
    this.lastResponse = null;
    
    // Animation controller reference
    this.animationController = null;
  }
  
  /**
   * Initialize with API key
   */
  async initialize(apiKey, animationController = null) {
    this.geminiConfig.apiKey = apiKey;
    this.animationController = animationController;
    
    console.log('[ZagelBrain] ResponseEngine initialized');
  }
  
  /**
   * Process user input and generate response
   */
  async process(userInput) {
    if (this.isProcessing) {
      return { response: '🐦 *busy preening* Give me a moment...', isTyping: true };
    }
    
    this.isProcessing = true;
    
    try {
      // Step 1: Recognize intent and sentiment
      const analysis = this.recognition.analyze(userInput);
      console.log('[ZagelBrain] Analysis:', analysis);
      
      // Step 2: Update personality mood
      this.personality.updateMood(analysis.sentiment, analysis.mood, analysis.isGreeting);
      
      // Step 3: Get conversation context
      const context = this.memory.getContext({ count: 5 });
      
      // Step 4: Get user preferences
      const userPrefs = await this.memory.getUserPreferences();
      
      // Step 5: Detect scenario
      const scenario = this.detectScenario(analysis);
      
      // Step 6: Build prompt
      const prompt = scenario !== 'general'
        ? this.promptBuilder.buildScenarioPrompt(scenario, userInput, {
            conversationHistory: context.recent,
            userPreferences: userPrefs,
            personality: this.personality.getState(),
            sentiment: analysis.sentiment,
            intents: analysis.intents
          })
        : this.promptBuilder.buildPrompt(userInput, {
            conversationHistory: context.recent,
            userPreferences: userPrefs,
            personality: this.personality.getState(),
            sentiment: analysis.sentiment,
            intents: analysis.intents
          });
      
      // Step 7: Generate response via Gemini
      const rawResponse = await this.callGemini(prompt);
      
      // Step 8: Post-process response
      const response = this.promptBuilder.postProcessResponse(rawResponse);
      
      // Step 9: Save to memory
      await this.memory.addMessage(userInput, response, {
        type: 'conversation',
        sentiment: analysis.sentiment.label,
        intent: analysis.intents.primary
      });
      
      // Step 10: Trigger animation
      const animationTrigger = this.personality.getAnimationTrigger();
      this.triggerAnimation(animationTrigger);
      
      // Step 11: Adapt personality based on feedback
      this.adaptToUser(userInput, response);
      
      this.lastResponse = response;
      
      return {
        response,
        animation: animationTrigger,
        sentiment: analysis.sentiment,
        intents: analysis.intents
      };
      
    } catch (error) {
      console.error('[ZagelBrain] Error:', error);
      return this.getFallbackResponse();
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Call Gemini API
   */
  async callGemini(prompt) {
    if (!this.geminiConfig.apiKey) {
      return this.getFallbackResponse().response;
    }
    
    const url = `https://generativelanguage.googleapis.com/v1/models/${this.geminiConfig.model}:generateContent?key=${this.geminiConfig.apiKey}`;
    
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: this.geminiConfig.temperature,
        maxOutputTokens: this.geminiConfig.maxTokens,
        topP: 0.95,
        topK: 40
      }
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
    } catch (error) {
      console.error('[ZagelBrain] Gemini call failed:', error);
      throw error;
    }
  }
  
  /**
   * Detect conversation scenario
   */
  detectScenario(analysis) {
    if (analysis.isGreeting) return 'greeting';
    if (analysis.mood === 'venting' || analysis.sentiment.label === 'angry') return 'venting';
    if (analysis.mood === 'hopeful' || analysis.intents.all.includes('dream')) return 'deep_thought';
    if (analysis.intents.all.includes('secret')) return 'secret_share';
    if (analysis.intents.all.includes('joke') || analysis.sentiment.label === 'joking') return 'joke_request';
    if (analysis.intents.all.includes('help') || analysis.isQuestion) return 'asking_help';
    if (analysis.intents.all.includes('farewell')) return 'farewell';
    if (analysis.isPraise || analysis.sentiment.label === 'happy') return 'emotional_support';
    
    return 'general';
  }
  
  /**
   * Trigger 3D animation
   */
  triggerAnimation(trigger) {
    if (!this.animationController) return;
    
    const animationMap = {
      'wing-flap': 'wingFlap',
      'head-tilt': 'headTilt',
      'hop': 'hop',
      'side-eye': 'sideEye'
    };
    
    const animation = animationMap[trigger] || 'idle';
    
    if (typeof this.animationController.trigger === 'function') {
      this.animationController.trigger(animation);
    } else if (typeof this.animationController[animation] === 'function') {
      this.animationController[animation]();
    }
    
    console.log('[ZagelBrain] Triggering animation:', trigger);
  }
  
  /**
   * Adapt personality to user feedback
   */
  adaptToUser(userInput, response) {
    // Check for positive reactions in user input
    const positiveReactions = ['thanks', 'love it', 'great', 'awesome', 'lol', 'haha', 'شكرا', 'جميل'];
    const negativeReactions = ['boring', 'stupid', 'bad', 'whatever', 'meh', 'سيء'];
    
    const lowerInput = userInput.toLowerCase();
    
    if (positiveReactions.some(p => lowerInput.includes(p))) {
      this.personality.adaptToUser({
        humorLevel: Math.min(1, this.personality.userAdaptations.humorLevel + 0.1),
        emotionalSupport: Math.min(1, this.personality.userAdaptations.emotionalSupport + 0.1)
      });
    } else if (negativeReactions.some(p => lowerInput.includes(p))) {
      this.personality.adaptToUser({
        humorLevel: Math.max(0.1, this.personality.userAdaptations.humorLevel - 0.1)
      });
    }
  }
  
  /**
   * Get fallback response when API fails
   */
  getFallbackResponse() {
    const fallbacks = [
      '🐦 *tilts head thoughtfully* The winds carry many thoughts today...',
      '*ruffles feathers* Interesting question, friend.',
      'A dove considers this... sometimes the sky knows best.',
      '*looks at you with one eye* What do YOU think?',
      'Even the wisest dove doesn\'t have all the answers. But we try!',
      '🐦 *coos softly* Tell me more about what matters to you.',
      'That\'s a question for the open skies, not just little me.',
      '*does a small hop* Let me think about this differently...'
    ];
    
    return {
      response: fallbacks[Math.floor(Math.random() * fallbacks.length)],
      isFallback: true
    };
  }
  
  /**
   * Get conversation context
   */
  getContext() {
    return this.memory.getContext();
  }
  
  /**
   * Get personality state
   */
  getPersonalityState() {
    return this.personality.getState();
  }
  
  /**
   * Reset brain
   */
  reset() {
    this.memory.clear();
    console.log('[ZagelBrain] Brain reset');
  }
}

// Export
window.ResponseEngine = ResponseEngine;

// ==========================================
// ZAGEL BRAIN INTEGRATION CLASS
// ==========================================
class ZagelBrainIntegration {
  constructor() {
    this.responseEngine = new ResponseEngine();
    this.isInitialized = false;
  }
  
  /**
   * Initialize Zagel Brain
   */
  async initialize(apiKey, animationController = null) {
    if (this.isInitialized) {
      console.warn('[ZagelBrain] Already initialized');
      return;
    }
    
    // Initialize response engine
    await this.responseEngine.initialize(apiKey, animationController);
    
    this.isInitialized = true;
    console.log('[ZagelBrain] Full integration initialized');
  }
  
  /**
   * Process user message
   */
  async respond(userInput) {
    if (!this.isInitialized) {
      return '🐦 *needs initialization*';
    }
    
    return await this.responseEngine.process(userInput);
  }
  
  /**
   * Get brain state
   */
  getState() {
    return {
      personality: this.responseEngine.getPersonalityState(),
      context: this.responseEngine.getContext(),
      initialized: this.isInitialized
    };
  }
  
  /**
   * Trigger animation
   */
  animate(trigger) {
    this.responseEngine.triggerAnimation(trigger);
  }
  
  /**
   * Reset brain
   */
  reset() {
    this.responseEngine.reset();
  }
}

// Export integration class
window.ZagelBrainIntegration = ZagelBrainIntegration;
window.zagelBrain = new ZagelBrainIntegration();