/**
 * Service Persistence Helper
 * Drop-in helper for ANY CodeBank service to use persistent storage
 */

class ServicePersistenceHelper {
  constructor(serviceName) {
    this.service = serviceName;
    this.storage = window.universalStorage;
    this.actionCache = new Map();
    this.isRestored = false;
    
    // Wait for storage to be ready
    if (this.storage?.db) {
      this.init();
    } else {
      // Retry after short delay
      setTimeout(() => this.init(), 500);
    }
  }

  async init() {
    await this.restorePersistedState();
    this.setupEventListeners();
    this.isRestored = true;
    
    // Emit ready event
    window.dispatchEvent(new CustomEvent(`${this.service}_ready`, {
      detail: { service: this.service, helper: this }
    }));
  }

  /**
   * Auto-save any action
   * Usage: helper.autoSave('like', videoId, { liked: true })
   */
  async autoSave(action, itemId, data = {}, options = {}) {
    try {
      const record = await this.storage.saveAction(
        this.service,
        action,
        itemId,
        data,
        {
          priority: options.priority || 'normal',
          tags: options.tags || [],
          expiresAt: options.expiresAt
        }
      );

      // Update cache
      const cacheKey = `${action}_${itemId}`;
      this.actionCache.set(cacheKey, record);

      // Emit event for UI
      window.dispatchEvent(new CustomEvent(`${this.service}_${action}`, {
        detail: { itemId, data, record }
      }));

      console.log(`[${this.service}] ${action}(${itemId}) saved`);
      return record;
    } catch (err) {
      console.error(`[${this.service}] Error saving ${action}:`, err);
      return null;
    }
  }

  /**
   * Quick check: has user done this action?
   * Usage: if (await helper.has('like', videoId)) { ... }
   */
  async has(action, itemId) {
    return this.storage.hasAction(this.service, action, itemId);
  }

  /**
   * Get all actions of a type
   * Usage: const likes = await helper.getAll('like')
   */
  async getAll(action = null, options = {}) {
    return this.storage.getActions({
      service: this.service,
      action,
      ...options
    });
  }

  /**
   * Count actions
   * Usage: const likeCount = await helper.count('like')
   */
  async count(action = null) {
    const actions = await this.getAll(action);
    return actions.length;
  }

  /**
   * Restore all persisted state on init
   */
  async restorePersistedState() {
    try {
      const actions = await this.getAll();
      
      // Group by action type
      const grouped = actions.reduce((acc, action) => {
        if (!acc[action.action]) acc[action.action] = [];
        acc[action.action].push(action);
        return acc;
      }, {});

      // Apply to UI
      for (const [actionType, records] of Object.entries(grouped)) {
        await this.applyActionState(actionType, records);
      }

      console.log(`[${this.service}] Restored ${actions.length} persisted actions`);
      return grouped;
    } catch (err) {
      console.error(`[${this.service}] Restore failed:`, err);
      return {};
    }
  }

  /**
   * Override in service-specific class
   * Applies restored state to UI
   */
  async applyActionState(actionType, records) {
    // Default: dispatch event for service to handle
    window.dispatchEvent(new CustomEvent(`${this.service}_restore_${actionType}`, {
      detail: { records }
    }));
  }

  /**
   * Media Progress (for audio/video services)
   * Usage: helper.saveProgress(videoId, 120.5, 600)
   */
  async saveProgress(contentId, currentTime, duration, metadata = {}) {
    return this.storage.saveMediaProgress(
      this.service,
      contentId,
      { currentTime, duration, ...metadata }
    );
  }

  async getProgress(contentId) {
    return this.storage.getMediaProgress(this.service, contentId);
  }

  async getResumePosition(contentId) {
    return this.storage.getResumePosition(this.service, contentId);
  }

  /**
   * Setup cross-tab sync
   */
  setupEventListeners() {
    window.addEventListener('persistent_activity', (e) => {
      const { service, action, itemId, record } = e.detail;
      if (service === this.service) {
        this.actionCache.set(`${action}_${itemId}`, record);
        this.onExternalUpdate(action, itemId, record);
      }
    });
  }

  /**
   * Override: handle external updates (from other tabs/devices)
   */
  onExternalUpdate(action, itemId, record) {
    // Dispatch event for service UI
    window.dispatchEvent(new CustomEvent(`${this.service}_external_update`, {
      detail: { action, itemId, record }
    }));
  }

  /**
   * Batch save for performance
   * Usage: helper.batchSave([
   *   { action: 'like', itemId: 'vid1', data: {} },
   *   { action: 'like', itemId: 'vid2', data: {} }
   * ])
   */
  async batchSave(actions) {
    const results = [];
    for (const a of actions) {
      const result = await this.autoSave(a.action, a.itemId, a.data, a.options);
      results.push(result);
    }
    // Trigger sync
    if (this.storage.isOnline) {
      this.storage.processSyncQueue();
    }
    return results;
  }

  /**
   * Export service data
   */
  async export() {
    const actions = await this.getAll();
    return {
      service: this.service,
      exportedAt: Date.now(),
      actions,
      stats: {
        totalActions: actions.length,
        byType: actions.reduce((acc, a) => {
          acc[a.action] = (acc[a.action] || 0) + 1;
          return acc;
        }, {})
      }
    };
  }

  /**
   * Import service data (for migration/restore)
   */
  async import(data) {
    for (const action of data.actions || []) {
      await this.storage.saveToStore('universalActions', {
        ...action,
        syncStatus: 'pending'
      });
    }
    if (this.storage.isOnline) {
      this.storage.processSyncQueue();
    }
  }

  /**
   * Clear all data for this service
   */
  async clearAll() {
    const actions = await this.getAll();
    for (const action of actions) {
      await this.storage.deleteFromStore('universalActions', action.universalKey);
    }
    console.log(`[${this.service}] Cleared all data`);
  }
}

// Export for use
window.ServicePersistenceHelper = ServicePersistenceHelper;
