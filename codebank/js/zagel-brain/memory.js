/**
 * Zagel Brain v3 - Memory Module
 * Short-term (RAM) + Long-term (IndexedDB) with importance scoring
 */
(function() {
  'use strict';
  const DB_NAME = 'ZagelBrainMemory';
  const DB_VERSION = 1;
  const STORE_NAME = 'memories';
  const SHORT_TERM_LIMIT = 10;
  const IMPORTANCE_THRESHOLD = 0.6;
  class Memory {
    constructor() {
      this._shortTerm = [];
      this._db = null;
      this._ready = false;
      this._initDB();
      console.log('💾 [ZagelBrain-Memory] Online');
    }
    async _initDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('importance', 'importance', { unique: false });
            store.createIndex('sentiment', 'sentiment', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('topic', 'topic', { unique: false });
          }
        };
        request.onsuccess = (e) => {
          this._db = e.target.result;
          this._ready = true;
          resolve();
        };
        request.onerror = (e) => {
          console.error('💾 [Memory] IndexedDB error:', e);
          reject(e);
        };
      });
    }
    store(message, metadata = {}) {
      const entry = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        text: message,
        role: metadata.role || 'user',
        sentiment: metadata.sentiment || 'neutral',
        confidence: metadata.confidence || 0,
        topic: metadata.topic || 'general',
        importance: this._calculateImportance(message, metadata),
        timestamp: Date.now(),
        tags: metadata.tags || [],
        context: metadata.context || {}
      };
      this._shortTerm.push(entry);
      if (this._shortTerm.length > SHORT_TERM_LIMIT) {
        const evicted = this._shortTerm.shift();
        if (evicted.importance >= IMPORTANCE_THRESHOLD) this._saveLongTerm(evicted);
      }
      if (entry.importance >= IMPORTANCE_THRESHOLD) this._saveLongTerm(entry);
      if (window.ZagelBus) window.ZagelBus.emit('brain:memory_stored', { id: entry.id, importance: entry.importance });
      return entry;
    }
    _calculateImportance(text, metadata) {
      let importance = 0.3;
      if (metadata.confidence > 0.7) importance += 0.2;
      if (metadata.sentiment && metadata.sentiment !== 'neutral') importance += 0.15;
      if (/\?|؟/.test(text)) importance += 0.15;
      if (/أنا|اسمي|my name|I am/i.test(text)) importance += 0.2;
      if (text.length > 100) importance += 0.1;
      if (/\d{2,}/.test(text)) importance += 0.1;
      const recentTopics = this._shortTerm.map(m => m.topic);
      const topicCount = recentTopics.filter(t => t === (metadata.topic || 'general')).length;
      if (topicCount >= 2) importance += 0.15;
      return Math.min(1, Math.round(importance * 100) / 100);
    }
    async _saveLongTerm(entry) {
      if (!this._db) return;
      try {
        const tx = this._db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(entry);
      } catch (e) {
        console.error('💾 [Memory] Save error:', e);
      }
    }
    getShortTerm() { return [...this._shortTerm]; }
    getRecentContext(count = 5) {
      return this._shortTerm.slice(-count).map(m => ({ role: m.role, text: m.text, sentiment: m.sentiment }));
    }
    async searchLongTerm(query, options = {}) {
      if (!this._db) return [];
      return new Promise((resolve) => {
        const tx = this._db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const results = [];
        store.openCursor().onsuccess = (e) => {
          const cursor = e.target.result;
          if (!cursor) {
            results.sort((a, b) => b.relevance - a.relevance);
            resolve(results.slice(0, options.limit || 10));
            return;
          }
          const mem = cursor.value;
          let relevance = 0;
          const queryLower = query.toLowerCase();
          if (mem.text.toLowerCase().includes(queryLower)) relevance += 0.5;
          if (mem.tags.some(t => t.includes(queryLower))) relevance += 0.3;
          if (options.sentiment && mem.sentiment === options.sentiment) relevance += 0.2;
          const ageHours = (Date.now() - mem.timestamp) / (1000 * 60 * 60);
          const timeFactor = Math.max(0, 1 - (ageHours / 720));
          relevance *= (0.5 + 0.5 * timeFactor);
          if (relevance > 0.1) results.push({ ...mem, relevance: Math.round(relevance * 100) / 100 });
          cursor.continue();
        };
      });
    }
    async getImportantMemories(limit = 5) {
      if (!this._db) return [];
      return new Promise((resolve) => {
        const tx = this._db.transaction(STORE_NAME, 'readonly');
        const index = tx.objectStore(STORE_NAME).index('importance');
        const results = [];
        index.openCursor(null, 'prev').onsuccess = (e) => {
          const cursor = e.target.result;
          if (!cursor || results.length >= limit) {
            resolve(results);
            return;
          }
          results.push(cursor.value);
          cursor.continue();
        };
      });
    }
    clearShortTerm() { this._shortTerm = []; }
    async clearAll() {
      this._shortTerm = [];
      if (this._db) {
        const tx = this._db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
      }
    }
    getStats() {
      return {
        shortTermCount: this._shortTerm.length,
        shortTermLimit: SHORT_TERM_LIMIT,
        dbReady: this._ready,
        avgImportance: this._shortTerm.length > 0
          ? Math.round(this._shortTerm.reduce((s, m) => s + m.importance, 0) / this._shortTerm.length * 100) / 100
          : 0
      };
    }
  }
  if (!window.ZagelBrainV3) window.ZagelBrainV3 = {};
  window.ZagelBrainV3.Memory = new Memory();
})();
