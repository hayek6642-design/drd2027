// Advanced Cache Layer with Offline Support
// Multi-tier caching system with localStorage, IndexedDB, and memory layers
// Provides robust offline support and intelligent cache management

import { transactionCache } from './transaction-cache.js';
import { transactionMonitor } from './transaction-monitor.js';

export class AdvancedCacheLayer {
    constructor(options = {}) {
        this.memoryCache = new Map();
        this.persistenceEnabled = options.persistence !== false;
        this.indexedDBEnabled = options.indexedDB !== false;
        this.maxMemorySize = options.maxMemorySize || 1000;
        this.maxLocalStorageSize = options.maxLocalStorageSize || 50 * 1024 * 1024; // 50MB
        this.defaultTTL = options.defaultTTL || 300000; // 5 minutes

        // Cache tiers
        this.tiers = {
            memory: { priority: 1, maxSize: this.maxMemorySize, currentSize: 0 },
            localStorage: { priority: 2, maxSize: this.maxLocalStorageSize, currentSize: 0 },
            indexedDB: { priority: 3, maxSize: Infinity, currentSize: 0 }
        };

        // Cache statistics
        this.stats = {
            hits: { memory: 0, localStorage: 0, indexedDB: 0 },
            misses: 0,
            sets: { memory: 0, localStorage: 0, indexedDB: 0 },
            evictions: { memory: 0, localStorage: 0, indexedDB: 0 }
        };

        // Offline queue for pending operations
        this.offlineQueue = [];
        this.isOnline = navigator.onLine;

        // Initialize storage
        this._initializeStorage();

        // Set up event listeners
        this._setupEventListeners();

        // Start maintenance tasks
        this._startMaintenanceTasks();

        console.log('🚀 Advanced Cache Layer initialized');
    }

    // Get item from cache with tier fallback
    async get(key, options = {}) {
        const startTime = Date.now();
        const strategy = options.strategy || 'default';
        const tierPreference = options.tier || 'auto';

        try {
            // Try memory cache first (fastest)
            if (tierPreference === 'memory' || tierPreference === 'auto') {
                const memoryResult = this._getFromMemory(key);
                if (memoryResult && !this._isExpired(memoryResult)) {
                    this.stats.hits.memory++;
                    console.log(`🎯 Memory cache hit for key: ${key} (${Date.now() - startTime}ms)`);
                    return memoryResult.data;
                }
            }

            // Try localStorage
            if (tierPreference === 'localStorage' || tierPreference === 'auto') {
                const localResult = await this._getFromLocalStorage(key);
                if (localResult && !this._isExpired(localResult)) {
                    this.stats.hits.localStorage++;

                    // Promote to memory cache
                    if (tierPreference === 'auto') {
                        this._setToMemory(key, localResult);
                    }

                    console.log(`🎯 localStorage cache hit for key: ${key}`);
                    return localResult.data;
                }
            }

            // Try IndexedDB (slowest but most persistent)
            if (this.indexedDBEnabled && (tierPreference === 'indexedDB' || tierPreference === 'auto')) {
                const indexedResult = await this._getFromIndexedDB(key);
                if (indexedResult && !this._isExpired(indexedResult)) {
                    this.stats.hits.indexedDB++;

                    // Promote to higher tiers
                    if (tierPreference === 'auto') {
                        this._setToMemory(key, indexedResult);
                        await this._setToLocalStorage(key, indexedResult);
                    }

                    console.log(`🎯 IndexedDB cache hit for key: ${key}`);
                    return indexedResult.data;
                }
            }

            // Cache miss
            this.stats.misses++;
            console.log(`❌ Cache miss for key: ${key}`);
            return null;

        } catch (error) {
            console.error('Cache get error:', error);
            this.stats.misses++;
            return null;
        }
    }

    // Set item in cache with intelligent tier placement
    async set(key, data, options = {}) {
        const startTime = Date.now();
        const strategy = options.strategy || 'default';
        const ttl = options.ttl || this._getStrategyTTL(strategy);
        const tierPreference = options.tier || 'auto';
        const persistOffline = options.persistOffline !== false;

        try {
            const item = {
                data,
                timestamp: Date.now(),
                ttl,
                strategy,
                key,
                size: this._estimateSize(data),
                persistOffline
            };

            // Determine tier placement
            const tiers = this._determineTierPlacement(key, item, tierPreference);

            // Set in each tier
            for (const tier of tiers) {
                await this[`_setTo${tier}`](key, item);
                this.stats.sets[tier.toLowerCase()]++;
            }

            // If offline and item should persist, add to offline queue
            if (!this.isOnline && persistOffline) {
                this._addToOfflineQueue('set', { key, data: item, options });
            }

            console.log(`💾 Cache set for key: ${key} in tiers: ${tiers.join(', ')} (${Date.now() - startTime}ms)`);

        } catch (error) {
            console.error('Cache set error:', error);
            throw error;
        }
    }

    // Delete item from all cache tiers
    async delete(key, options = {}) {
        const tierPreference = options.tier || 'all';

        try {
            if (tierPreference === 'all' || tierPreference === 'memory') {
                this._deleteFromMemory(key);
            }

            if (tierPreference === 'all' || tierPreference === 'localStorage') {
                await this._deleteFromLocalStorage(key);
            }

            if (this.indexedDBEnabled && (tierPreference === 'all' || tierPreference === 'indexedDB')) {
                await this._deleteFromIndexedDB(key);
            }

            // If offline, add to offline queue
            if (!this.isOnline) {
                this._addToOfflineQueue('delete', { key, options });
            }

            console.log(`🗑️ Cache deleted for key: ${key}`);

        } catch (error) {
            console.error('Cache delete error:', error);
        }
    }

    // Clear all caches
    async clear() {
        try {
            this.memoryCache.clear();
            this.tiers.memory.currentSize = 0;

            if (this.persistenceEnabled) {
                this._clearLocalStorage();
                this.tiers.localStorage.currentSize = 0;
            }

            if (this.indexedDBEnabled) {
                await this._clearIndexedDB();
                this.tiers.indexedDB.currentSize = 0;
            }

            // Clear offline queue
            this.offlineQueue = [];

            // Reset stats
            this.stats = {
                hits: { memory: 0, localStorage: 0, indexedDB: 0 },
                misses: 0,
                sets: { memory: 0, localStorage: 0, indexedDB: 0 },
                evictions: { memory: 0, localStorage: 0, indexedDB: 0 }
            };

            console.log('🧹 All caches cleared');

        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }

    // Get cache statistics
    getStats() {
        const totalHits = this.stats.hits.memory + this.stats.hits.localStorage + this.stats.hits.indexedDB;
        const totalMisses = this.stats.misses;
        const totalRequests = totalHits + totalMisses;
        const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

        return {
            ...this.stats,
            hitRate: Math.round(hitRate * 100) / 100,
            totalRequests,
            tierInfo: { ...this.tiers },
            offlineQueueSize: this.offlineQueue.length,
            isOnline: this.isOnline
        };
    }

    // Warm up cache with initial data
    async warmUp(warmUpData = {}) {
        const promises = [];

        if (warmUpData.balances) {
            for (const [userId, balance] of Object.entries(warmUpData.balances)) {
                promises.push(this.set(`balance_${userId}`, balance, {
                    strategy: 'balance',
                    tier: 'memory'
                }));
            }
        }

        if (warmUpData.users) {
            for (const [userId, user] of Object.entries(warmUpData.users)) {
                promises.push(this.set(`user_${userId}`, user, {
                    strategy: 'user',
                    tier: 'memory'
                }));
            }
        }

        await Promise.allSettled(promises);
        console.log(`🔥 Cache warmed up with ${promises.length} items`);
    }

    // Process offline queue when coming back online
    async processOfflineQueue() {
        if (this.isOnline || this.offlineQueue.length === 0) {
            return;
        }

        console.log(`📦 Processing offline queue with ${this.offlineQueue.length} items`);

        const results = [];

        for (const operation of this.offlineQueue) {
            try {
                switch (operation.type) {
                    case 'set':
                        await this.set(operation.data.key, operation.data.data, operation.data.options);
                        break;
                    case 'delete':
                        await this.delete(operation.data.key, operation.data.options);
                        break;
                }
                results.push({ success: true, operation });
            } catch (error) {
                console.error('Error processing offline operation:', error);
                results.push({ success: false, operation, error: error.message });
            }
        }

        // Clear processed queue
        this.offlineQueue = [];

        // Persist empty queue
        this._persistOfflineQueue();

        const successCount = results.filter(r => r.success).length;
        console.log(`✅ Processed ${successCount}/${results.length} offline operations`);

        return results;
    }

    // Memory cache operations
    _getFromMemory(key) {
        return this.memoryCache.get(key);
    }

    _setToMemory(key, item) {
        // Check size limit
        if (this.tiers.memory.currentSize + item.size > this.tiers.memory.maxSize) {
            this._evictFromMemory(Math.floor(this.tiers.memory.maxSize * 0.1)); // Evict 10%
        }

        this.memoryCache.set(key, item);
        this.tiers.memory.currentSize += item.size;
    }

    _deleteFromMemory(key) {
        const item = this.memoryCache.get(key);
        if (item) {
            this.tiers.memory.currentSize -= item.size;
            this.memoryCache.delete(key);
        }
    }

    _evictFromMemory(count) {
        const entries = Array.from(this.memoryCache.entries());
        const toEvict = entries.slice(0, count);

        for (const [key] of toEvict) {
            const item = this.memoryCache.get(key);
            this.tiers.memory.currentSize -= item.size;
            this.memoryCache.delete(key);
            this.stats.evictions.memory++;
        }

        console.log(`🔄 Evicted ${toEvict.length} entries from memory cache`);
    }

    // localStorage operations
    async _getFromLocalStorage(key) {
        try {
            const stored = localStorage.getItem(`cache_${key}`);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn('Failed to get from localStorage:', error);
            return null;
        }
    }

    async _setToLocalStorage(key, item) {
        try {
            // Check size limit
            const currentSize = this._getLocalStorageSize();
            if (currentSize + item.size > this.tiers.localStorage.maxSize) {
                await this._evictFromLocalStorage();
            }

            localStorage.setItem(`cache_${key}`, JSON.stringify(item));
            this.tiers.localStorage.currentSize += item.size;
        } catch (error) {
            console.warn('Failed to set to localStorage:', error);
        }
    }

    async _deleteFromLocalStorage(key) {
        try {
            const item = await this._getFromLocalStorage(key);
            if (item) {
                localStorage.removeItem(`cache_${key}`);
                this.tiers.localStorage.currentSize -= item.size;
            }
        } catch (error) {
            console.warn('Failed to delete from localStorage:', error);
        }
    }

    _clearLocalStorage() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('cache_')) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });

            this.tiers.localStorage.currentSize = 0;
            console.log(`🗑️ Cleared ${keysToRemove.length} items from localStorage cache`);
        } catch (error) {
            console.warn('Failed to clear localStorage cache:', error);
        }
    }

    async _evictFromLocalStorage() {
        try {
            const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
            const items = [];

            // Get all cache items with timestamps
            for (const key of keys) {
                const item = JSON.parse(localStorage.getItem(key));
                items.push({ key, item });
            }

            // Sort by timestamp (oldest first)
            items.sort((a, b) => a.item.timestamp - b.item.timestamp);

            // Evict oldest 20%
            const toEvict = Math.ceil(items.length * 0.2);

            for (let i = 0; i < toEvict; i++) {
                localStorage.removeItem(items[i].key);
                this.tiers.localStorage.currentSize -= items[i].item.size;
                this.stats.evictions.localStorage++;
            }

            console.log(`🔄 Evicted ${toEvict} entries from localStorage cache`);
        } catch (error) {
            console.warn('Failed to evict from localStorage:', error);
        }
    }

    _getLocalStorageSize() {
        let total = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('cache_')) {
                    total += localStorage.getItem(key).length;
                }
            }
        } catch (error) {
            console.warn('Failed to calculate localStorage size:', error);
        }
        return total;
    }

    // IndexedDB operations
    async _getFromIndexedDB(key) {
        if (!this.db) return null;

        try {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['cache'], 'readonly');
                const store = transaction.objectStore('cache');
                const request = store.get(key);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('Failed to get from IndexedDB:', error);
            return null;
        }
    }

    async _setToIndexedDB(key, item) {
        if (!this.db) return;

        try {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['cache'], 'readwrite');
                const store = transaction.objectStore('cache');
                const request = store.put({ key, ...item });

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('Failed to set to IndexedDB:', error);
        }
    }

    async _deleteFromIndexedDB(key) {
        if (!this.db) return;

        try {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['cache'], 'readwrite');
                const store = transaction.objectStore('cache');
                const request = store.delete(key);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('Failed to delete from IndexedDB:', error);
        }
    }

    async _clearIndexedDB() {
        if (!this.db) return;

        try {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['cache'], 'readwrite');
                const store = transaction.objectStore('cache');
                const request = store.clear();

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('Failed to clear IndexedDB cache:', error);
        }
    }

    // Utility methods
    _initializeStorage() {
        if (this.indexedDBEnabled) {
            this._initializeIndexedDB();
        }

        if (this.persistenceEnabled) {
            this._loadPersistedData();
        }
    }

    _initializeIndexedDB() {
        const request = indexedDB.open('AdvancedCacheDB', 1);

        request.onerror = () => {
            console.warn('Failed to open IndexedDB');
            this.indexedDBEnabled = false;
        };

        request.onsuccess = (event) => {
            this.db = event.target.result;
            console.log('📦 IndexedDB initialized');
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('cache')) {
                const store = db.createObjectStore('cache', { keyPath: 'key' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('strategy', 'strategy', { unique: false });
            }
        };
    }

    _setupEventListeners() {
        // Online/offline detection
        window.addEventListener('online', () => {
            console.log('🌐 Connection restored');
            this.isOnline = true;
            this.processOfflineQueue();
        });

        window.addEventListener('offline', () => {
            console.log('📴 Connection lost');
            this.isOnline = false;
        });

        // Memory pressure detection
        if ('memory' in performance) {
            // Monitor memory usage if available
            setInterval(() => {
                const memInfo = performance.memory;
                const usageRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;

                if (usageRatio > 0.8) {
                    console.log('⚠️ High memory usage, evicting cache');
                    this._evictFromMemory(Math.floor(this.memoryCache.size * 0.2));
                }
            }, 30000);
        }
    }

    _startMaintenanceTasks() {
        // Cleanup expired entries every minute
        setInterval(() => {
            this._cleanupExpiredEntries();
        }, 60000);

        // Persist statistics every 5 minutes
        setInterval(() => {
            this._persistStatistics();
        }, 300000);
    }

    _cleanupExpiredEntries() {
        const now = Date.now();

        // Clean memory cache
        for (const [key, item] of this.memoryCache.entries()) {
            if (now - item.timestamp > item.ttl) {
                this.tiers.memory.currentSize -= item.size;
                this.memoryCache.delete(key);
            }
        }

        // Clean localStorage cache
        if (this.persistenceEnabled) {
            this._cleanupExpiredLocalStorageEntries();
        }

        // Clean IndexedDB cache
        if (this.indexedDBEnabled) {
            this._cleanupExpiredIndexedDBEntries();
        }
    }

    _cleanupExpiredLocalStorageEntries() {
        try {
            const keysToRemove = [];
            const now = Date.now();

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('cache_')) {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (now - item.timestamp > item.ttl) {
                        keysToRemove.push(key);
                        this.tiers.localStorage.currentSize -= item.size;
                    }
                }
            }

            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });

            if (keysToRemove.length > 0) {
                console.log(`🧹 Cleaned up ${keysToRemove.length} expired localStorage entries`);
            }
        } catch (error) {
            console.warn('Failed to cleanup localStorage:', error);
        }
    }

    _cleanupExpiredIndexedDBEntries() {
        // This would require a more complex implementation
        // For now, we'll rely on TTL checks during get operations
    }

    _determineTierPlacement(key, item, preference) {
        const tiers = [];

        switch (preference) {
            case 'memory':
                tiers.push('Memory');
                break;
            case 'localStorage':
                tiers.push('LocalStorage');
                if (this.persistenceEnabled) tiers.push('Memory');
                break;
            case 'indexedDB':
                tiers.push('IndexedDB');
                if (this.persistenceEnabled) tiers.push('LocalStorage');
                tiers.push('Memory');
                break;
            case 'auto':
            default:
                // Intelligent placement based on item characteristics
                if (item.size < 1024) { // Small items in memory
                    tiers.push('Memory');
                }

                if (this.persistenceEnabled) {
                    if (item.persistOffline || item.strategy === 'balance') {
                        tiers.push('LocalStorage');
                    }
                }

                if (this.indexedDBEnabled && item.size > 1024 * 1024) { // Large items in IndexedDB
                    tiers.push('IndexedDB');
                }
                break;
        }

        return tiers;
    }

    _getStrategyTTL(strategy) {
        const strategyTTLs = {
            balance: 60000,    // 1 minute
            transaction: 300000, // 5 minutes
            user: 600000,      // 10 minutes
            default: this.defaultTTL
        };

        return strategyTTLs[strategy] || this.defaultTTL;
    }

    _isExpired(item) {
        return Date.now() - item.timestamp > item.ttl;
    }

    _estimateSize(data) {
        return JSON.stringify(data).length * 2; // Rough estimate in bytes
    }

    _addToOfflineQueue(type, data) {
        this.offlineQueue.push({
            type,
            data,
            timestamp: Date.now()
        });

        // Keep only recent operations (last 24 hours)
        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
        this.offlineQueue = this.offlineQueue.filter(op => op.timestamp > cutoffTime);

        this._persistOfflineQueue();
    }

    _persistOfflineQueue() {
        try {
            localStorage.setItem('cache_offline_queue', JSON.stringify(this.offlineQueue));
        } catch (error) {
            console.warn('Failed to persist offline queue:', error);
        }
    }

    _loadPersistedData() {
        try {
            // Load offline queue
            const queueData = localStorage.getItem('cache_offline_queue');
            if (queueData) {
                this.offlineQueue = JSON.parse(queueData);
            }
        } catch (error) {
            console.warn('Failed to load persisted data:', error);
        }
    }

    _persistStatistics() {
        try {
            localStorage.setItem('cache_statistics', JSON.stringify(this.stats));
        } catch (error) {
            console.warn('Failed to persist statistics:', error);
        }
    }

    // Get cache contents for debugging
    getContents(tier = null) {
        const contents = {};

        if (!tier || tier === 'memory') {
            for (const [key, item] of this.memoryCache.entries()) {
                contents[`memory_${key}`] = {
                    tier: 'memory',
                    age: Date.now() - item.timestamp,
                    ttl: item.ttl,
                    size: item.size,
                    strategy: item.strategy
                };
            }
        }

        return contents;
    }

    // Destroy cache layer
    destroy() {
        if (this.db) {
            this.db.close();
        }

        this.memoryCache.clear();
        console.log('💥 Advanced Cache Layer destroyed');
    }
}

// Create global instance
export const advancedCacheLayer = new AdvancedCacheLayer();

// Auto-initialize
if (typeof window !== 'undefined') {
    window.advancedCacheLayer = advancedCacheLayer;
    console.log('🚀 Advanced Cache Layer ready');
}

export default AdvancedCacheLayer;