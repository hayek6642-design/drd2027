/**
 * ZAGEL Memory Engine v2.0.0
 * Human-like memory: short/mid/long-term with decay and reinforcement
 * Memories fade naturally and get stronger with repetition
 */

(function () {
  'use strict';
  if (window.__ZAGEL_MEMORY__) return;

  const MEMORY_TIERS = {
    short: { maxAge: 5 * 60 * 1000, decayRate: 0.1, capacity: 50 },     // 5 min
    mid:   { maxAge: 24 * 60 * 60 * 1000, decayRate: 0.02, capacity: 200 }, // 24 hrs
    long:  { maxAge: Infinity, decayRate: 0.001, capacity: 500 }           // permanent
  };

  const PROMOTION_THRESHOLD = 0.7; // strength to promote to next tier
  const MIN_STRENGTH = 0.05;       // below this = forgotten

  class ZagelMemoryEngine {
    constructor() {
      this._memories = { short: [], mid: [], long: [] };
      this._associationMap = {}; // tag -> [memoryIds]
      this._lastCleanup = Date.now();
      this._cleanupInterval = null;

      this._startCleanupCycle();
      console.log('🧠 [Zagel-Memory] Engine initialized');
    }

    remember(content, options = {}) {
      const memory = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        content,
        tier: options.tier || 'short',
        strength: options.strength || 1.0,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        tags: options.tags || [],
        associations: options.associations || [],
        emotion: options.emotion || 'neutral',
        source: options.source || 'observation',
        metadata: options.metadata || {}
      };

      const tier = MEMORY_TIERS[memory.tier];
      this._memories[memory.tier].push(memory);

      // Enforce capacity
      if (this._memories[memory.tier].length > tier.capacity) {
        this._memories[memory.tier].sort((a, b) => a.strength - b.strength);
        this._memories[memory.tier].shift(); // remove weakest
      }

      // Build associations
      for (const tag of memory.tags) {
        if (!this._associationMap[tag]) this._associationMap[tag] = [];
        this._associationMap[tag].push(memory.id);
      }

      if (window.ZagelBus) {
        window.ZagelBus.emit('memory:stored', { id: memory.id, tier: memory.tier, content: memory.content });
      }

      return memory.id;
    }

    recall(query, options = {}) {
      const results = [];
      const tiers = options.tier ? [options.tier] : ['long', 'mid', 'short'];
      const limit = options.limit || 10;

      for (const tier of tiers) {
        for (const mem of this._memories[tier]) {
          let relevance = 0;

          // Content match
          if (typeof query === 'string') {
            const content = typeof mem.content === 'string' ? mem.content : JSON.stringify(mem.content);
            if (content.toLowerCase().includes(query.toLowerCase())) {
              relevance += 0.5;
            }
          }

          // Tag match
          if (options.tags) {
            const tagOverlap = mem.tags.filter(t => options.tags.includes(t)).length;
            relevance += tagOverlap * 0.3;
          }

          // Emotion match
          if (options.emotion && mem.emotion === options.emotion) relevance += 0.2;

          if (relevance > 0) {
            // Reinforce on recall
            mem.lastAccessed = Date.now();
            mem.accessCount++;
            mem.strength = Math.min(1, mem.strength + 0.05);

            results.push({ ...mem, relevance: relevance * mem.strength });
          }
        }
      }

      results.sort((a, b) => b.relevance - a.relevance);
      return results.slice(0, limit);
    }

    reinforce(memoryId) {
      for (const tier of Object.keys(this._memories)) {
        const mem = this._memories[tier].find(m => m.id === memoryId);
        if (mem) {
          mem.strength = Math.min(1, mem.strength + 0.1);
          mem.accessCount++;
          mem.lastAccessed = Date.now();

          // Promote if strong enough
          if (mem.strength >= PROMOTION_THRESHOLD) {
            this._promote(mem, tier);
          }

          return true;
        }
      }
      return false;
    }

    _promote(memory, currentTier) {
      const tierOrder = ['short', 'mid', 'long'];
      const currentIdx = tierOrder.indexOf(currentTier);
      if (currentIdx >= tierOrder.length - 1) return; // already at long

      const nextTier = tierOrder[currentIdx + 1];

      // Remove from current
      this._memories[currentTier] = this._memories[currentTier].filter(m => m.id !== memory.id);

      // Add to next
      memory.tier = nextTier;
      memory.strength = 0.5; // reset strength in new tier
      this._memories[nextTier].push(memory);

      if (window.ZagelBus) {
        window.ZagelBus.emit('memory:promoted', { id: memory.id, from: currentTier, to: nextTier });
      }

      console.log(`🧠 [Memory] Promoted "${memory.id}" from ${currentTier} to ${nextTier}`);
    }

    forget(memoryId) {
      for (const tier of Object.keys(this._memories)) {
        const idx = this._memories[tier].findIndex(m => m.id === memoryId);
        if (idx !== -1) {
          this._memories[tier].splice(idx, 1);
          return true;
        }
      }
      return false;
    }

    _decay() {
      const now = Date.now();

      for (const [tier, config] of Object.entries(MEMORY_TIERS)) {
        this._memories[tier] = this._memories[tier].filter(mem => {
          const age = now - mem.lastAccessed;

          // Natural decay based on time since last access
          const decayAmount = config.decayRate * (age / (60 * 60 * 1000)); // per hour
          mem.strength = Math.max(0, mem.strength - decayAmount);

          // Remove if too weak
          if (mem.strength < MIN_STRENGTH) {
            if (window.ZagelBus) {
              window.ZagelBus.emit('memory:forgotten', { id: mem.id, tier });
            }
            return false;
          }

          // Remove if too old (for short/mid)
          if (config.maxAge !== Infinity && age > config.maxAge && mem.strength < PROMOTION_THRESHOLD) {
            return false;
          }

          return true;
        });
      }
    }

    _startCleanupCycle() {
      this._cleanupInterval = setInterval(() => this._decay(), 60000); // every minute
    }

    getStats() {
      return {
        short: this._memories.short.length,
        mid: this._memories.mid.length,
        long: this._memories.long.length,
        total: this._memories.short.length + this._memories.mid.length + this._memories.long.length,
        associations: Object.keys(this._associationMap).length
      };
    }

    getByTag(tag) {
      const ids = this._associationMap[tag] || [];
      const results = [];
      for (const tier of Object.values(this._memories)) {
        for (const mem of tier) {
          if (ids.includes(mem.id)) results.push(mem);
        }
      }
      return results;
    }

    async save() {
      if (window.ZagelStore) {
        await window.ZagelStore.set('memory_data', this._memories);
        await window.ZagelStore.set('memory_associations', this._associationMap);
      }
    }

    async load() {
      if (window.ZagelStore) {
        const data = await window.ZagelStore.get('memory_data');
        if (data) this._memories = data;
        const assoc = await window.ZagelStore.get('memory_associations');
        if (assoc) this._associationMap = assoc;
      }
    }

    destroy() {
      if (this._cleanupInterval) clearInterval(this._cleanupInterval);
      this._memories = { short: [], mid: [], long: [] };
      this._associationMap = {};
      delete window.__ZAGEL_MEMORY__;
    }
  }

  window.__ZAGEL_MEMORY__ = new ZagelMemoryEngine();
  window.ZagelMemory = window.__ZAGEL_MEMORY__;
})();
