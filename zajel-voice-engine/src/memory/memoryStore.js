/**
 * Memory Store
 * AsyncStorage-based persistence layer for user data, rules, and history
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

const STORAGE_KEYS = {
  USER_PREFERENCES: '@zajel_user_preferences',
  BEHAVIOR_RULES: '@zajel_behavior_rules',
  CONVERSATION_HISTORY: '@zajel_conversation_history',
  INSTRUCTIONS: '@zajel_instructions',
  APP_STATE: '@zajel_app_state'
};

class MemoryStore {
  constructor() {
    this.cache = new Map();
    this.isReady = false;
  }

  async init() {
    try {
      // Preload critical data into cache
      const [prefs, rules] = await Promise.all([
        this.getUserPreferences(),
        this.getBehaviorRules()
      ]);
      
      this.cache.set('preferences', prefs);
      this.cache.set('rules', rules);
      
      this.isReady = true;
      logger.log('Memory store initialized');
    } catch (err) {
      logger.error('Failed to init memory store:', err);
    }
  }

  // ==================== USER PREFERENCES ====================

  async getUserPreferences() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      const prefs = data ? JSON.parse(data) : this.getDefaultPreferences();
      return prefs;
    } catch (err) {
      logger.error('Failed to get preferences:', err);
      return this.getDefaultPreferences();
    }
  }

  async setUserPreferences(preferences) {
    try {
      const current = await this.getUserPreferences();
      const merged = { ...current, ...preferences, updatedAt: Date.now() };
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PREFERENCES, 
        JSON.stringify(merged)
      );
      
      this.cache.set('preferences', merged);
      logger.log('Preferences saved:', merged);
      return merged;
    } catch (err) {
      logger.error('Failed to save preferences:', err);
      throw err;
    }
  }

  getDefaultPreferences() {
    return {
      name: '',
      responseStyle: 'normal',
      language: 'ar',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  // ==================== BEHAVIOR RULES ====================

  async getBehaviorRules() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BEHAVIOR_RULES);
      const rules = data ? JSON.parse(data) : [];
      
      // Filter out inactive/replaced rules
      return rules.filter(r => r.active !== false);
    } catch (err) {
      logger.error('Failed to get rules:', err);
      return [];
    }
  }

  async saveBehaviorRule(rule) {
    try {
      const rules = await this.getBehaviorRules();
      
      // Check for conflicts and deactivate old ones
      if (rule.replaces) {
        rule.replaces.forEach(id => {
          const idx = rules.findIndex(r => r.id === id);
          if (idx >= 0) rules[idx].active = false;
        });
      }
      
      rules.push(rule);
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.BEHAVIOR_RULES,
        JSON.stringify(rules)
      );
      
      this.cache.set('rules', rules.filter(r => r.active !== false));
      logger.log('Rule saved:', rule.id);
      return rule;
    } catch (err) {
      logger.error('Failed to save rule:', err);
      throw err;
    }
  }

  async updateBehaviorRule(ruleId, updates) {
    try {
      const rules = await this.getAllRules(); // Include inactive
      const idx = rules.findIndex(r => r.id === ruleId);
      
      if (idx >= 0) {
        rules[idx] = { ...rules[idx], ...updates, updatedAt: Date.now() };
        
        await AsyncStorage.setItem(
          STORAGE_KEYS.BEHAVIOR_RULES,
          JSON.stringify(rules)
        );
        
        this.cache.set('rules', rules.filter(r => r.active !== false));
        return rules[idx];
      }
      
      return null;
    } catch (err) {
      logger.error('Failed to update rule:', err);
      throw err;
    }
  }

  async deleteBehaviorRule(ruleId) {
    try {
      const rules = await this.getAllRules();
      const filtered = rules.filter(r => r.id !== ruleId);
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.BEHAVIOR_RULES,
        JSON.stringify(filtered)
      );
      
      this.cache.set('rules', filtered.filter(r => r.active !== false));
      return true;
    } catch (err) {
      logger.error('Failed to delete rule:', err);
      throw err;
    }
  }

  async getAllRules() {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BEHAVIOR_RULES);
    return data ? JSON.parse(data) : [];
  }

  // ==================== CONVERSATION HISTORY ====================

  async getConversationHistory(limit = 50) {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSATION_HISTORY);
      const history = data ? JSON.parse(data) : [];
      return history.slice(-limit); // Return last N messages
    } catch (err) {
      logger.error('Failed to get history:', err);
      return [];
    }
  }

  async addToHistory(message) {
    try {
      const history = await this.getConversationHistory(1000); // Get all for append
      
      const entry = {
        id: `msg_${Date.now()}`,
        timestamp: Date.now(),
        ...message
      };
      
      history.push(entry);
      
      // Keep only last 200 messages
      const trimmed = history.slice(-200);
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.CONVERSATION_HISTORY,
        JSON.stringify(trimmed)
      );
      
      return entry;
    } catch (err) {
      logger.error('Failed to add to history:', err);
      throw err;
    }
  }

  async clearHistory() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CONVERSATION_HISTORY);
      return true;
    } catch (err) {
      logger.error('Failed to clear history:', err);
      throw err;
    }
  }

  // ==================== INSTRUCTIONS ====================

  async getInstructions() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.INSTRUCTIONS);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      logger.error('Failed to get instructions:', err);
      return [];
    }
  }

  async saveInstruction(instruction) {
    try {
      const instructions = await this.getInstructions();
      instructions.push({
        ...instruction,
        savedAt: Date.now()
      });
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.INSTRUCTIONS,
        JSON.stringify(instructions)
      );
      
      return instruction;
    } catch (err) {
      logger.error('Failed to save instruction:', err);
      throw err;
    }
  }

  // ==================== UTILITY ====================

  async clearAll() {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      this.cache.clear();
      logger.log('All memory cleared');
      return true;
    } catch (err) {
      logger.error('Failed to clear all:', err);
      throw err;
    }
  }

  getCache(key) {
    return this.cache.get(key);
  }

  setCache(key, value) {
    this.cache.set(key, value);
  }
}

// Singleton
const memoryStore = new MemoryStore();

export default memoryStore;
export { STORAGE_KEYS };
