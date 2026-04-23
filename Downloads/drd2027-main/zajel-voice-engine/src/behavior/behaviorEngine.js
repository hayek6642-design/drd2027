/**
 * Behavior Engine
 * Modifies AI responses based on stored user preferences and rules
 */

import memoryManager from '../memory/memoryManager';
import { logger } from '../utils/logger';

class BehaviorEngine {
  constructor() {
    this.defaultModifiers = {
      maxLength: null,
      minLength: null,
      tone: 'neutral',
      includeEmojis: true,
      includeExamples: false,
      useMetaphors: false
    };
  }

  /**
   * Apply behavior modifications to response
   */
  async modifyResponse(rawResponse, context = {}) {
    try {
      // Get active rules and preferences
      const [rules, preferences] = await Promise.all([
        memoryManager.getActiveBehaviorRules(),
        memoryManager.getUserPreference('responseStyle')
      ]);
      
      // Build modifier set from rules
      const modifiers = this.buildModifiers(rules, preferences);
      
      // Apply modifications
      let modifiedResponse = rawResponse;
      
      // Apply length constraints
      modifiedResponse = this.applyLengthConstraints(modifiedResponse, modifiers);
      
      // Apply tone modifications
      modifiedResponse = this.applyTone(modifiedResponse, modifiers);
      
      // Apply content modifications
      modifiedResponse = this.applyContentStyle(modifiedResponse, modifiers);
      
      logger.log('Response modified with:', modifiers);
      
      return {
        text: modifiedResponse,
        appliedModifiers: modifiers,
        originalLength: rawResponse.length,
        modifiedLength: modifiedResponse.length
      };
      
    } catch (err) {
      logger.error('Behavior modification failed:', err);
      return { text: rawResponse, appliedModifiers: {}, error: err.message };
    }
  }

  buildModifiers(rules, preferredStyle) {
    const modifiers = { ...this.defaultModifiers };
    
    // Apply style-based defaults
    if (preferredStyle) {
      Object.assign(modifiers, this.getStyleDefaults(preferredStyle));
    }
    
    // Apply specific rules (highest priority last)
    const sortedRules = rules.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    
    for (const rule of sortedRules) {
      if (rule.action) {
        Object.assign(modifiers, rule.action);
      }
    }
    
    return modifiers;
  }

  getStyleDefaults(style) {
    const defaults = {
      short: {
        maxLength: 150,
        tone: 'concise',
        includeExamples: false,
        includeEmojis: false
      },
      detailed: {
        minLength: 200,
        tone: 'comprehensive',
        includeExamples: true,
        includeEmojis: true
      },
      normal: {
        maxLength: 500,
        tone: 'neutral',
        includeExamples: false,
        includeEmojis: true
      },
      funny: {
        tone: 'humorous',
        includeEmojis: true,
        useMetaphors: true
      },
      serious: {
        tone: 'formal',
        includeEmojis: false,
        avoidJokes: true
      },
      poetic: {
        tone: 'poetic',
        useMetaphors: true,
        includeEmojis: false
      }
    };
    
    return defaults[style] || defaults.normal;
  }

  applyLengthConstraints(text, modifiers) {
    let result = text;
    
    if (modifiers.maxLength && text.length > modifiers.maxLength) {
      // Smart truncation at sentence boundary
      const truncated = text.substring(0, modifiers.maxLength);
      const lastSentence = truncated.lastIndexOf('.');
      
      if (lastSentence > modifiers.maxLength * 0.7) {
        result = truncated.substring(0, lastSentence + 1);
      } else {
        result = truncated + '...';
      }
    }
    
    // Note: minLength is harder to enforce on existing text
    // Usually requires regenerating, so we just flag it
    
    return result;
  }

  applyTone(text, modifiers) {
    // Tone modifications are mostly hints to the AI
    // But we can do some post-processing
    
    if (modifiers.tone === 'formal') {
      // Remove excessive punctuation
      result = text.replace(/!!+/g, '!').replace(/\?\?+/g, '?');
    }
    
    if (modifiers.tone === 'humorous' && modifiers.includeEmojis) {
      // Could add emoji analysis here
    }
    
    return text;
  }

  applyContentStyle(text, modifiers) {
    // Add style indicators at start if needed
    if (modifiers.useMetaphors && !text.includes('مثل')) {
      // Text already has metaphors or we can't easily add them
    }
    
    return text;
  }

  /**
   * Prepare context for AI based on memory
   */
  async prepareContext(userMessage) {
    const memory = await memoryManager.getMemory();
    
    const context = {
      userPreferences: memory.userPreferences,
      activeRules: memory.behaviorRules,
      recentHistory: memory.conversationHistory,
      systemPrompt: this.buildSystemPrompt(memory)
    };
    
    return context;
  }

  buildSystemPrompt(memory) {
    const parts = ['You are Zagel, a helpful AI assistant.'];
    
    // Add user name if known
    if (memory.userPreferences.name) {
      parts.push(`The user's name is ${memory.userPreferences.name}.`);
    }
    
    // Add response style instruction
    const style = memory.userPreferences.responseStyle || 'normal';
    const styleInstructions = {
      short: 'Keep responses brief and concise.',
      detailed: 'Provide comprehensive, detailed responses with examples.',
      funny: 'Be humorous and light-hearted in your responses.',
      serious: 'Maintain a formal, professional tone.',
      poetic: 'Use poetic, literary language and metaphors.',
      normal: 'Respond in a natural, balanced way.'
    };
    
    parts.push(styleInstructions[style] || styleInstructions.normal);
    
    // Add active behavior rules
    for (const rule of memory.behaviorRules.slice(0, 3)) {
      if (rule.action?.customInstructions) {
        parts.push(rule.action.customInstructions);
      }
    }
    
    return parts.join(' ');
  }

  /**
   * Check if message should trigger behavior update
   */
  async shouldUpdateBehavior(message) {
    // This is a hook for future ML-based detection
    return false;
  }
}

// Singleton
const behaviorEngine = new BehaviorEngine();

export default behaviorEngine;
