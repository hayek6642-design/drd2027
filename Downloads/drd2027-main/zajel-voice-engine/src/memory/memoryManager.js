/**
 * Memory Manager
 * High-level interface for saving and retrieving user memory
 */

import memoryStore from './memoryStore';
import { logger } from '../utils/logger';

class MemoryManager {
  constructor() {
    this.store = memoryStore;
  }

  async init() {
    await this.store.init();
    logger.log('Memory manager ready');
  }

  // ==================== INSTRUCTION OPERATIONS ====================

  /**
   * Save a parsed instruction to memory
   */
  async saveInstruction(parsedRule, confirmation) {
    try {
      // Save as behavior rule if it's a behavior change
      if (parsedRule.type === 'behavior') {
        await this.store.saveBehaviorRule(parsedRule);
      }
      
      // Save as user preference if it's a preference
      if (parsedRule.category === 'response_style') {
        await this.store.setUserPreferences({
          responseStyle: parsedRule.action.style
        });
      }
      
      // Save as memory fact
      if (parsedRule.type === 'memory') {
        await this.store.saveInstruction({
          ...parsedRule,
          confirmation: confirmation
        });
      }
      
      // Add to history
      await this.store.addToHistory({
        type: 'instruction',
        role: 'user',
        content: parsedRule.rawText,
        ruleId: parsedRule.id,
        confirmation: confirmation
      });
      
      logger.log('Instruction saved:', parsedRule.id);
      return {
        success: true,
        rule: parsedRule,
        confirmation: confirmation
      };
      
    } catch (err) {
      logger.error('Failed to save instruction:', err);
      throw err;
    }
  }

  // ==================== MEMORY RETRIEVAL ====================

  async getMemory() {
    const [preferences, rules, history] = await Promise.all([
      this.store.getUserPreferences(),
      this.store.getBehaviorRules(),
      this.store.getConversationHistory(20) // Last 20 messages
    ]);
    
    return {
      userPreferences: preferences,
      behaviorRules: rules,
      conversationHistory: history,
      timestamp: Date.now()
    };
  }

  async getActiveBehaviorRules() {
    const rules = await this.store.getBehaviorRules();
    return rules.filter(r => r.active !== false);
  }

  async getUserPreference(key) {
    const prefs = await this.store.getUserPreferences();
    return prefs[key];
  }

  // ==================== PREFERENCE UPDATES ====================

  async updatePreferences(updates) {
    return await this.store.setUserPreferences(updates);
  }

  async updateResponseStyle(style) {
    return await this.store.setUserPreferences({ responseStyle: style });
  }

  // ==================== HISTORY OPERATIONS ====================

  async addToConversation(role, content, metadata = {}) {
    return await this.store.addToHistory({
      role,
      content,
      ...metadata
    });
  }

  async getRecentContext(messageCount = 10) {
    const history = await this.store.getConversationHistory(messageCount);
    return history.map(h => ({
      role: h.role,
      content: h.content
    }));
  }

  // ==================== CLEANUP ====================

  async clearAllMemory() {
    return await this.store.clearAll();
  }

  async deleteRule(ruleId) {
    return await this.store.deleteBehaviorRule(ruleId);
  }
}

// Singleton
const memoryManager = new MemoryManager();

export default memoryManager;
