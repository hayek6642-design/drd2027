/**
 * ==============================
 * 💾 URL CACHE SERVICE
 * ==============================
 * In-memory cache with TTL support
 * Required for Pixabay 24h URL retention
 */

class URLCache {
  constructor(name = 'default') {
    this.name = name;
    this.cache = new Map();
    this.timers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  /**
   * Set a cached URL with TTL
   * @param {string} key - Cache key
   * @param {string} value - URL value
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = 3600000) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl
    });

    const timer = setTimeout(() => {
      this._evict(key);
    }, ttl);

    this.timers.set(key, timer);
    return this;
  }

  /**
   * Get a cached URL
   * @param {string} key - Cache key
   * @returns {string|null} Cached URL or null if expired/missing
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this._evict(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Check if key exists and is valid
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this._evict(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a cache entry
   */
  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.cache.clear();
    return this;
  }

  /**
   * Internal eviction with stats
   */
  _evict(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.stats.evictions++;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : 'N/A'
    };
  }

  /**
   * Print cache info
   */
  info() {
    const stats = this.getStats();
    console.log(`\n📊 Cache [${this.name}]`);
    console.log(`   Entries: ${stats.size}`);
    console.log(`   Hits: ${stats.hits} | Misses: ${stats.misses}`);
    console.log(`   Hit Rate: ${stats.hitRate}`);
    console.log(`   Evictions: ${stats.evictions}\n`);
  }
}

module.exports = URLCache;
