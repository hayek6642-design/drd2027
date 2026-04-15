/**
 * Zagel Brain - Memory Module
 * Short-term (10 messages) + Long-term (IndexedDB) memory with importance scoring
 */

class ZagelMemory {
  constructor() {
    this.shortTermCapacity = 10;
    this.shortTerm = []; // Last 10 messages
    this.dbName = 'ZagelBrainDB';
    this.storeName = 'longTermMemory';
    this.db = null;
    this.importanceThreshold = 0.5;
    
    this.initDB();
  }
  
  /**
   * Initialize IndexedDB for long-term memory
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => {
        console.warn('[ZagelMemory] IndexedDB not available, using localStorage fallback');
        resolve(false);
      };
      
      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('[ZagelMemory] IndexedDB initialized');
        resolve(true);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('importance', 'importance', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }
  
  /**
   * Add a message to memory
   */
  async addMessage(userInput, zagelResponse, metadata = {}) {
    const message = {
      id: Date.now() + Math.random(),
      userInput,
      zagelResponse,
      timestamp: Date.now(),
      type: metadata.type || 'conversation',
      ...metadata
    };
    
    // Calculate importance score
    message.importance = this.calculateImportance(userInput, zagelResponse);
    
    // Add to short-term memory
    this.shortTerm.push(message);
    
    // Trim short-term to capacity
    if (this.shortTerm.length > this.shortTermCapacity) {
      this.shortTerm.shift();
    }
    
    // Save important memories to long-term
    if (message.importance >= this.importanceThreshold) {
      await this.saveToLongTerm(message);
    }
    
    return message;
  }
  
  /**
   * Calculate importance score (0-1)
   */
  calculateImportance(userInput, response) {
    let score = 0.3; // Base score
    
    // Personal information detection
    const personalPatterns = /(my name|i am|i'm|i'm from|i live|i work|عندي|اسمي|انا من)/gi;
    if (personalPatterns.test(userInput)) {
      score += 0.3;
    }
    
    // Emotional content
    const emotionalPatterns = /(love|hate|happy|sad|angry|excited|miss|worried|تعبان|بحب|اكره|سعيد)/gi;
    if (emotionalPatterns.test(userInput)) {
      score += 0.2;
    }
    
    // Preferences (likes/dislikes)
    const preferencePatterns = /(i like|i hate|i prefer|i enjoy|i dislike|i want|i wish|i hope|احب|اكره|اتمنى)/gi;
    if (preferencePatterns.test(userInput)) {
      score += 0.25;
    }
    
    // Relationships
    const relationshipPatterns = /(my (wife|husband|friend|mom|dad|brother|sister|son|daughter|family)| Husband|Wife|Family|صديقي|زوجي|اهلي)/gi;
    if (relationshipPatterns.test(userInput)) {
      score += 0.25;
    }
    
    // Long messages are more likely to be important
    if (userInput.length > 100) {
      score += 0.1;
    }
    
    // Repeated topics get boost
    const recentTopics = this.shortTerm.map(m => this.extractTopic(m.userInput));
    const currentTopic = this.extractTopic(userInput);
    if (recentTopics.includes(currentTopic)) {
      score += 0.15;
    }
    
    return Math.min(1, score);
  }
  
  /**
   * Extract main topic from input
   */
  extractTopic(input) {
    const words = input.toLowerCase().split(/\s+/);
    // Return last meaningful word as topic
    return words[words.length - 1] || 'unknown';
  }
  
  /**
   * Save to long-term memory
   */
  async saveToLongTerm(message) {
    if (!this.db) {
      // Fallback to localStorage
      return this.saveToLocalStorage(message);
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        store.add(message);
        
        transaction.oncomplete = () => {
          console.log('[ZagelMemory] Saved to long-term:', message.type);
          resolve(true);
        };
        
        transaction.onerror = (e) => {
          console.error('[ZagelMemory] Save error:', e);
          resolve(false);
        };
      } catch (e) {
        resolve(this.saveToLocalStorage(message));
      }
    });
  }
  
  /**
   * LocalStorage fallback
   */
  saveToLocalStorage(message) {
    try {
      const key = `zagel_memory_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(message));
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Get recent conversation context
   */
  getContext(preferences = {}) {
    const count = preferences.count || 5;
    const recent = this.shortTerm.slice(-count);
    
    return {
      recent,
      hasHistory: this.shortTerm.length > 0,
      messageCount: this.shortTerm.length,
      topics: this.extractTopics()
    };
  }
  
  /**
   * Extract mentioned topics from conversation
   */
  extractTopics() {
    const topics = new Set();
    
    for (const msg of this.shortTerm) {
      const topic = this.extractTopic(msg.userInput);
      if (topic !== 'unknown') {
        topics.add(topic);
      }
    }
    
    return Array.from(topics);
  }
  
  /**
   * Get user's preferences from memory
   */
  async getUserPreferences() {
    const prefs = {
      humorPreference: null,
      preferredTone: null,
      positiveSpin: false,
      relationshipInfo: {},
      mentionedNames: [],
      interests: []
    };
    
    // Scan short-term memory
    for (const msg of this.shortTerm) {
      // Humor preference
      if (/funny|joke| comedy|ضحك/i.test(msg.userInput)) {
        prefs.humorPreference = 'appreciates';
      }
      
      // Tone preference
      if (/serious|formal|جاد/i.test(msg.userInput)) {
        prefs.preferredTone = 'formal';
      } else if (/casual|fun|مرح/i.test(msg.userInput)) {
        prefs.preferredTone = 'casual';
      }
      
      // Positive spin expectation
      if (/cheer me|make me feel better|positive|امل|افرحني/i.test(msg.userInput)) {
        prefs.positiveSpin = true;
      }
      
      // Names mentioned
      const nameMatch = msg.userInput.match(/(my (wife|husband|friend|mom|dad|brother|sister|name is) (\w+))/gi);
      if (nameMatch) {
        prefs.mentionedNames.push(...nameMatch);
      }
    }
    
    // Try to get from long-term
    if (this.db) {
      const longTermPrefs = await this.getLongTermPreferences();
      return { ...prefs, ...longTermPrefs };
    }
    
    return prefs;
  }
  
  /**
   * Get preferences from long-term memory
   */
  async getLongTermPreferences() {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({});
        return;
      }
      
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        
        request.onsuccess = () => {
          const memories = request.result || [];
          const prefs = {};
          
          for (const mem of memories) {
            if (mem.type === 'preference') {
              Object.assign(prefs, mem.data);
            }
          }
          
          resolve(prefs);
        };
        
        request.onerror = () => resolve({});
      } catch (e) {
        resolve({});
      }
    });
  }
  
  /**
   * Search long-term memory
   */
  async search(query) {
    const results = [];
    
    if (!this.db) {
      // Search localStorage fallback
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('zagel_memory_')) {
          try {
            const item = JSON.parse(localStorage.getItem(key));
            if (item.userInput.toLowerCase().includes(query.toLowerCase())) {
              results.push(item);
            }
          } catch (e) {}
        }
      }
      return results;
    }
    
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        
        request.onsuccess = () => {
          const all = request.result || [];
          const filtered = all.filter(m => 
            m.userInput.toLowerCase().includes(query.toLowerCase()) ||
            m.zagelResponse?.toLowerCase().includes(query.toLowerCase())
          );
          resolve(filtered);
        };
        
        request.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }
  
  /**
   * Clear memory
   */
  clear() {
    this.shortTerm = [];
    console.log('[ZagelMemory] Short-term cleared');
  }
}

// Export
window.ZagelMemory = ZagelMemory;
window.zagelMemory = new ZagelMemory();