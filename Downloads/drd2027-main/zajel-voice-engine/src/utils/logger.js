/**
 * Simple Logging System
 * Logs to console and optionally to AsyncStorage for debugging
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_LEVELS = {
  DEBUG: 0,
  LOG: 1,
  WARN: 2,
  ERROR: 3
};

const CURRENT_LEVEL = LOG_LEVELS.LOG;
const MAX_LOGS = 100;

class Logger {
  constructor() {
    this.logs = [];
    this.persistLogs = false; // Set to true for debugging
  }

  async saveToStorage(level, message, data) {
    if (!this.persistLogs) return;
    
    try {
      const entry = {
        timestamp: Date.now(),
        level,
        message,
        data: data ? JSON.stringify(data) : null
      };
      
      const existing = await AsyncStorage.getItem('@zajel_logs');
      const logs = existing ? JSON.parse(existing) : [];
      
      logs.push(entry);
      if (logs.length > MAX_LOGS) logs.shift();
      
      await AsyncStorage.setItem('@zajel_logs', JSON.stringify(logs));
    } catch (e) {
      // Silent fail
    }
  }

  debug(message, ...data) {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(`[Zajel:DEBUG]`, message, ...data);
      this.saveToStorage('DEBUG', message, data);
    }
  }

  log(message, ...data) {
    if (CURRENT_LEVEL <= LOG_LEVELS.LOG) {
      console.log(`[Zajel]`, message, ...data);
      this.saveToStorage('LOG', message, data);
    }
  }

  warn(message, ...data) {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(`[Zajel:WARN]`, message, ...data);
      this.saveToStorage('WARN', message, data);
    }
  }

  error(message, ...data) {
    if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(`[Zajel:ERROR]`, message, ...data);
      this.saveToStorage('ERROR', message, data);
    }
  }

  async getLogs() {
    try {
      const data = await AsyncStorage.getItem('@zajel_logs');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  async clearLogs() {
    await AsyncStorage.removeItem('@zajel_logs');
  }
}

export const logger = new Logger();
