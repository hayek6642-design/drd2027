/**
 * Zajel/Zagel Bridge
 * Clean interface between Zajel Voice Engine and existing Zajel/Zagel OS
 * Accepts both "Zajel" and "Zagel" as system names
 */

import memoryManager from '../memory/memoryManager';
import behaviorEngine from '../behavior/behaviorEngine';
import { logger } from '../utils/logger';
import { SYSTEM_NAMES, isValidSystemName, normalizeSystemName } from '../constants/systemNames';

class ZagelBridge {
  constructor() {
    this.zagelCore = null; // Will be injected
    this.messageHandlers = new Map();
    this.systemName = SYSTEM_NAMES.PRIMARY; // Default to "Zajel"
    this.acceptedNames = new Set(SYSTEM_NAMES.ALL);
  }

  /**
   * Initialize bridge with existing Zajel/Zagel instance
   * Accepts both "Zajel" and "Zagel" as system names
   */
  initialize(zagelCoreInstance, systemName = null) {
    this.zagelCore = zagelCoreInstance;
    
    // Set system name if provided and valid
    if (systemName && isValidSystemName(systemName)) {
      this.systemName = normalizeSystemName(systemName);
    }
    
    logger.log(`Bridge initialized as: ${this.systemName}`);
  }

  /**
   * Get current system name
   */
  getSystemName() {
    return this.systemName;
  }

  /**
   * Check if a name is accepted by this system
   */
  acceptsName(name) {
    return isValidSystemName(name);
  }

  /**
   * Set system name (Zajel or Zagel)
   */
  setSystemName(name) {
    if (isValidSystemName(name)) {
      this.systemName = normalizeSystemName(name);
      logger.log(`System name changed to: ${this.systemName}`);
      return true;
    }
    return false;
  }

  /**
   * Main method: Send message to Zajel/Zagel and get response
   */
  async sendMessageToZagel(text, options = {}) {
    try {
      // 1. Prepare context from memory
      const context = await behaviorEngine.prepareContext(text);
      
      // 2. Add to conversation history
      await memoryManager.addToConversation('user', text, {
        timestamp: Date.now(),
        ...options.metadata
      });
      
      // 3. Call Zajel/Zagel core with enriched context
      const rawResponse = await this.callZagelCore(text, context);
      
      // 4. Apply behavior modifications
      const modifiedResponse = await behaviorEngine.modifyResponse(
        rawResponse, 
        { userMessage: text }
      );
      
      // 5. Save to history
      await memoryManager.addToConversation('assistant', modifiedResponse.text, {
        modifiers: modifiedResponse.appliedModifiers,
        originalLength: modifiedResponse.originalLength
      });
      
      // 6. Return formatted response
      return {
        success: true,
        text: modifiedResponse.text,
        metadata: {
          appliedModifiers: modifiedResponse.appliedModifiers,
          context: context.userPreferences
        }
      };
      
    } catch (err) {
      logger.error('Bridge error:', err);
      return {
        success: false,
        error: err.message,
        text: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
      };
    }
  }

  /**
   * Call existing Zajel/Zagel core
   */
  async callZagelCore(text, context) {
    // If core is provided, use it
    if (this.zagelCore && typeof this.zagelCore.generateResponse === 'function') {
      return await this.zagelCore.generateResponse(text, {
        systemPrompt: context.systemPrompt,
        history: context.recentHistory
      });
    }
    
    // Fallback: Simulate response (for testing)
    logger.log(`Using fallback simulation for: ${this.systemName}`);
    return this.simulateZagelResponse(text, context);
  }

  /**
   * Fallback simulation for testing without Zajel/Zagel core
   * Uses current system name (Zajel or Zagel) in responses
   */
  simulateZagelResponse(text, context) {
    const systemName = this.systemName;
    const responses = {
      greeting: `أهلاً! أنا ${systemName}، كيف أقدر أساعدك؟`,
      question: 'سؤال ممتع! دعني أفكر في ذلك...',
      instruction: 'تمام، فهمتك!',
      default: 'أفهم. يمكنك إعطائي تعليمات مثل "خلي ردودك قصيرة" لتغيير طريقة ردي.'
    };
    
    // Simple intent detection
    if (text.includes('أهلا') || text.includes('مرحبا') || text.includes('hello')) {
      return responses.greeting;
    }
    
    if (text.includes('؟') || text.includes('?')) {
      return responses.question;
    }
    
    return responses.default;
  }

  /**
   * Handle instruction confirmation
   */
  async confirmInstruction(rule, confirmation) {
    await memoryManager.saveInstruction(rule, confirmation);
    
    return {
      success: true,
      confirmation: confirmation,
      rule: rule
    };
  }

  /**
   * Get bridge status
   */
  getStatus() {
    return {
      initialized: !!this.zagelCore,
      hasCore: this.zagelCore !== null,
      systemName: this.systemName,
      acceptedNames: Array.from(this.acceptedNames),
      memoryReady: true
    };
  }

  /**
   * Register message handler
   */
  onMessage(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Cleanup
   */
  destroy() {
    this.zagelCore = null;
    this.messageHandlers.clear();
  }
}

// Singleton
const zagelBridge = new ZagelBridge();

export default zagelBridge;
