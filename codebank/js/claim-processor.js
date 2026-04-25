/**
 * RewardClaimProcessor
 * 
 * Handles the complete reward claim lifecycle:
 * 1. Validate code format
 * 2. Store in local/indexed DB
 * 3. Update AssetsManager
 * 4. Emit events
 * 5. Track history
 */

import { rewardValidator } from './reward-validator.js';

export class RewardClaimProcessor {
  constructor(options = {}) {
    this.validator = rewardValidator;
    this.storageKey = options.storageKey || 'extra_mode_rewards';
    this.idbStoreName = options.idbStoreName || 'rewards';
    this.eventNamespace = options.eventNamespace || 'reward';
    this.assetBus = options.assetBus || window.AssetBus;
    this.useIndexedDB = options.useIndexedDB !== false;
    
    // In-memory cache
    this._claimedCodes = new Set();
    this._claimedAssets = [];
    
    this._initDb();
    this._loadClaimed();
  }

  /**
   * Initialize IndexedDB if available
   * @private
   */
  _initDb() {
    if (!this.useIndexedDB || typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[ClaimProcessor] IndexedDB not available');
      return;
    }

    try {
      const dbReq = window.indexedDB.open('zagel_rewards', 1);
      
      dbReq.onerror = () => {
        console.error('[ClaimProcessor] Failed to open IndexedDB');
      };

      dbReq.onsuccess = (e) => {
        this._db = e.target.result;
        console.log('[ClaimProcessor] IndexedDB initialized');
      };

      dbReq.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.idbStoreName)) {
          const store = db.createObjectStore(this.idbStoreName, { keyPath: 'id' });
          store.createIndex('code', 'code', { unique: true });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('period', 'period', { unique: false });
          store.createIndex('claimedAt', 'claimedAt', { unique: false });
          console.log('[ClaimProcessor] IndexedDB schema created');
        }
      };
    } catch (e) {
      console.warn('[ClaimProcessor] Failed to initialize IndexedDB:', e.message);
    }
  }

  /**
   * Load previously claimed codes from storage
   * @private
   */
  _loadClaimed() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this._claimedAssets = parsed;
          this._claimedCodes = new Set(parsed.map(a => a.code));
          console.log(`[ClaimProcessor] Loaded ${parsed.length} claimed codes`);
        }
      }
    } catch (e) {
      console.error('[ClaimProcessor] Failed to load claimed codes:', e.message);
    }
  }

  /**
   * Save claimed codes to storage
   * @private
   */
  _saveClaimed() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this._claimedAssets));
    } catch (e) {
      console.error('[ClaimProcessor] Failed to save claimed codes:', e.message);
    }
  }

  /**
   * Process a reward claim
   * @param {object} asset - Asset object to claim
   * @returns {Promise<object>} Result with success status and details
   */
  async processClaim(asset) {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!asset || typeof asset !== 'object') {
        throw new Error('Invalid asset object');
      }

      const { code, type, amount = 1 } = asset;

      // Validate code format
      if (!this.validator.isValid(code)) {
        const errors = this.validator.getReport(code).errors;
        throw new Error(`Invalid code format: ${errors.join(', ')}`);
      }

      // Check for duplicate
      if (this._claimedCodes.has(code)) {
        throw new Error(`Code already claimed: ${code}`);
      }

      // Extract details from code
      const details = this.validator.validate(code);

      // Build complete asset record
      const record = {
        id: this._generateId(),
        code: code,
        type: details.type,
        amount: amount,
        source: 'extra_mode',
        status: 'claimed',
        period: details.period,
        claimedAt: Date.now(),
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
        ...asset // Merge in any additional data
      };

      // Store in local storage
      this._claimedAssets.push(record);
      this._claimedCodes.add(code);
      this._saveClaimed();

      // Store in IndexedDB if available
      if (this._db) {
        await this._saveToIDB(record);
      }

      // Update AssetBus if available
      if (this.assetBus?.addAsset) {
        try {
          this.assetBus.addAsset(record);
        } catch (e) {
          console.warn('[ClaimProcessor] AssetBus error:', e.message);
        }
      }

      // Emit success event
      this._emitEvent('claimed', record);

      const duration = Date.now() - startTime;
      console.log(`[ClaimProcessor] Claim processed in ${duration}ms:`, code);

      return {
        success: true,
        code: code,
        type: details.type,
        period: details.period,
        amount: amount,
        claimedAt: record.claimedAt,
        record: record,
        duration: duration
      };

    } catch (error) {
      console.error('[ClaimProcessor] Claim failed:', error.message);
      this._emitEvent('failed', { error: error.message, asset });

      return {
        success: false,
        error: error.message,
        asset: asset,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Save record to IndexedDB
   * @private
   */
  _saveToIDB(record) {
    return new Promise((resolve, reject) => {
      if (!this._db) {
        return reject(new Error('IndexedDB not initialized'));
      }

      const tx = this._db.transaction([this.idbStoreName], 'readwrite');
      const store = tx.objectStore(this.idbStoreName);
      const req = store.add(record);

      req.onerror = () => {
        reject(new Error(`IndexedDB save failed: ${req.error}`));
      };

      req.onsuccess = () => {
        resolve(record);
      };

      tx.onerror = () => {
        reject(new Error(`IndexedDB transaction failed: ${tx.error}`));
      };
    });
  }

  /**
   * Check if code has been claimed
   * @param {string} code - Code to check
   * @returns {boolean}
   */
  isClaimed(code) {
    return this._claimedCodes.has(code);
  }

  /**
   * Get claim details for a code
   * @param {string} code - Code to lookup
   * @returns {object|null} Asset record or null
   */
  getClaim(code) {
    return this._claimedAssets.find(a => a.code === code) || null;
  }

  /**
   * Get all claimed assets
   * @returns {object[]} Array of claimed assets
   */
  getAllClaimed() {
    return [...this._claimedAssets];
  }

  /**
   * Get claimed assets by type
   * @param {string} type - 'silver' or 'gold'
   * @returns {object[]} Filtered assets
   */
  getByType(type) {
    return this._claimedAssets.filter(a => a.type === type);
  }

  /**
   * Get claimed assets by period
   * @param {number} period - Period number
   * @returns {object[]} Filtered assets
   */
  getByPeriod(period) {
    return this._claimedAssets.filter(a => a.period === period);
  }

  /**
   * Get claim statistics
   * @returns {object} Summary statistics
   */
  getStats() {
    const all = this._claimedAssets;
    const silver = all.filter(a => a.type === 'silver');
    const gold = all.filter(a => a.type === 'gold');

    const byPeriod = {};
    for (const asset of all) {
      if (!byPeriod[asset.period]) {
        byPeriod[asset.period] = 0;
      }
      byPeriod[asset.period]++;
    }

    return {
      totalClaimed: all.length,
      silverCount: silver.length,
      goldCount: gold.length,
      totalAmount: all.reduce((sum, a) => sum + (a.amount || 0), 0),
      byPeriod: byPeriod,
      oldestClaim: all.length > 0 ? Math.min(...all.map(a => a.claimedAt)) : null,
      newestClaim: all.length > 0 ? Math.max(...all.map(a => a.claimedAt)) : null
    };
  }

  /**
   * Clear all claimed codes (careful!)
   * @returns {number} Number of records cleared
   */
  clearAll() {
    const count = this._claimedAssets.length;
    this._claimedAssets = [];
    this._claimedCodes.clear();
    this._saveClaimed();
    this._emitEvent('cleared', { count });
    console.warn('[ClaimProcessor] Cleared all claims');
    return count;
  }

  /**
   * Generate unique ID for claim record
   * @private
   */
  _generateId() {
    return `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Emit custom event
   * @private
   */
  _emitEvent(type, data) {
    try {
      const eventName = `${this.eventNamespace}-${type}`;
      const event = new CustomEvent(eventName, { detail: data });
      window.dispatchEvent(event);
      console.log(`[ClaimProcessor] Event emitted: ${eventName}`);
    } catch (e) {
      console.error('[ClaimProcessor] Event emission failed:', e.message);
    }
  }
}

// Export singleton
export const claimProcessor = new RewardClaimProcessor();

// Attach to window
if (typeof window !== 'undefined') {
  window.RewardClaimProcessor = RewardClaimProcessor;
  window.claimProcessor = claimProcessor;
}
