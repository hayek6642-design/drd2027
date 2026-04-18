/**
 * Universal Persistent Storage Manager V3
 * Handles all CodeBank services with conflict resolution, multi-device sync, and AI features
 * 
 * Services: samma3ny, battalooda, farragna, nostalgia, eb3at, corsa, yahood, 
 *           games_centre, settaXtes3a, e7ki, zagel, pebalaash, safecode, coRsA, prayer_system
 */

class UniversalPersistentStorage {
  constructor() {
    this.dbName = 'DRD_Universal_v3';
    this.dbVersion = 3;
    this.db = null;
    this.isOnline = navigator.onLine;
    this.tursoUrl = window.TURSO_URL || 'https://your-db.turso.io';
    this.tursoToken = window.TURSO_TOKEN || 'your-token';
    
    // Service registry - all CodeBank services
    this.SERVICE_CONTENT_TYPES = {
      // MP3/Music
      samma3ny: { type: 'audio', format: 'mp3', category: 'music' },
      battalooda: { type: 'audio', format: 'mp3', category: 'music' },
      // Video
      farragna: { type: 'video', format: 'mp4', category: 'video' },
      nostalgia: { type: 'video', format: 'mp4', category: 'video' },
      eb3at: { type: 'video', format: 'mp4', category: 'video' },
      corsa: { type: 'video', format: 'mp4', category: 'video' },
      yahood: { type: 'video', format: 'mp4', category: 'video' },
      // Gaming
      games_centre: { type: 'game', format: 'html5', category: 'gaming' },
      settaXtes3a: { type: 'game', format: 'html5', category: 'gaming' },
      // Communication
      e7ki: { type: 'chat', format: 'text', category: 'communication' },
      zagel: { type: 'chat', format: 'text', category: 'communication' },
      // Financial/Social
      pebalaash: { type: 'barter', format: 'mixed', category: 'marketplace' },
      safecode: { type: 'asset', format: 'codes', category: 'finance' },
      // Utility
      coRsA: { type: 'tool', format: 'mixed', category: 'utility' },
      prayer_system: { type: 'utility', format: 'info', category: 'religious' }
    };

    this.init();
  }

  async init() {
    await this.initIndexedDB();
    this.setupOnlineListeners();
    this.startPeriodicSync();
  }

  initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store 1: Universal Actions (all services)
        if (!db.objectStoreNames.contains('universalActions')) {
          const store = db.createObjectStore('universalActions', { keyPath: 'universalKey' });
          store.createIndex('service', 'service', { unique: false });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('vectorClock', 'vectorClock', { unique: false });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Store 2: Media Progress (audio/video)
        if (!db.objectStoreNames.contains('mediaProgress')) {
          const store = db.createObjectStore('mediaProgress', { keyPath: 'progressKey' });
          store.createIndex('service', 'service', { unique: false });
          store.createIndex('contentType', 'contentType', { unique: false });
        }

        // Store 3: Conflicts
        if (!db.objectStoreNames.contains('conflicts')) {
          db.createObjectStore('conflicts', { keyPath: 'conflictId', autoIncrement: true });
        }

        // Store 4: Sync Queue
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'queueId', autoIncrement: true });
          store.createIndex('priority', 'priority', { unique: false });
        }

        // Store 5: Activity Stream
        if (!db.objectStoreNames.contains('activityStream')) {
          const store = db.createObjectStore('activityStream', { keyPath: 'activityId', autoIncrement: true });
          store.createIndex('service', 'service', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store 6: User Identity
        if (!db.objectStoreNames.contains('userIdentity')) {
          db.createObjectStore('userIdentity', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Universal API: Save any action from any service
   */
  async saveAction(service, action, itemId, data = {}, metadata = {}) {
    const contentType = this.SERVICE_CONTENT_TYPES[service]?.type || 'unknown';
    const userId = this.getEffectiveUserId();
    const deviceId = this.getDeviceId();
    const universalKey = `${service}_${action}_${itemId}_${userId}`;

    // Get existing for conflict detection
    const existing = await this.getFromStore('universalActions', universalKey);

    // Build vector clock
    const vectorClock = existing
      ? this.incrementVectorClock(existing.vectorClock, deviceId)
      : { [deviceId]: 1 };

    const record = {
      universalKey,
      service,
      action,
      itemId,
      contentType,
      userId,
      userFingerprint: this.getUserIdentity().fingerprint,
      deviceId,
      timestamp: Date.now(),
      vectorClock,
      data: this.enrichDataForContentType(contentType, data),
      metadata: {
        ...metadata,
        userAgent: navigator.userAgent,
        screenSize: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      syncStatus: 'pending',
      version: existing ? existing.version + 1 : 1
    };

    // Conflict resolution
    if (existing && this.hasConflict(existing, record)) {
      const resolved = await this.resolveConflict(existing, record);
      if (!resolved) return null;
      
      // Broadcast conflict resolution
      this.broadcastActivity({
        type: 'conflict_resolved',
        service,
        itemId,
        resolution: resolved.conflictInfo
      });
    }

    // Save locally
    await this.saveToStore('universalActions', record);

    // Queue for sync
    await this.queueForSync({ type: 'action', record });

    // Log activity
    this.logActivity({
      type: 'user_action',
      service,
      action,
      itemId,
      timestamp: record.timestamp
    });

    return record;
  }

  /**
   * Content-type specific data enrichment
   */
  enrichDataForContentType(contentType, data) {
    switch (contentType) {
      case 'audio':
        return {
          ...data,
          waveformData: data.waveformData || null,
          bitrate: data.bitrate || '128kbps',
          duration: data.duration || 0
        };
      case 'video':
        return {
          ...data,
          resolution: data.resolution || '720p',
          thumbnailFrame: data.thumbnailFrame || 0,
          duration: data.duration || 0
        };
      case 'game':
        return {
          ...data,
          score: data.score || 0,
          level: data.level || 1,
          playTime: data.playTime || 0
        };
      default:
        return data;
    }
  }

  /**
   * Conflict Detection & Resolution
   */
  hasConflict(existing, incoming) {
    if (existing.universalKey !== incoming.universalKey) return false;
    const existingDominates = this.dominates(existing.vectorClock, incoming.vectorClock);
    const incomingDominates = this.dominates(incoming.vectorClock, existing.vectorClock);
    return !existingDominates && !incomingDominates;
  }

  dominates(clockA, clockB) {
    let allGreaterOrEqual = true;
    let atLeastOneGreater = false;
    const allDevices = new Set([...Object.keys(clockA), ...Object.keys(clockB)]);
    
    for (const device of allDevices) {
      const a = clockA[device] || 0;
      const b = clockB[device] || 0;
      if (a < b) allGreaterOrEqual = false;
      if (a > b) atLeastOneGreater = true;
    }
    return allGreaterOrEqual && atLeastOneGreater;
  }

  incrementVectorClock(clock, deviceId) {
    return { ...clock, [deviceId]: (clock[deviceId] || 0) + 1 };
  }

  async resolveConflict(existing, incoming) {
    const strategy = this.selectStrategy(existing.action);
    let resolved;

    switch (strategy) {
      case 'merge':
        resolved = this.resolveMerge(existing, incoming);
        break;
      case 'max-value':
        resolved = this.resolveMaxValue(existing, incoming);
        break;
      case 'set-union':
        resolved = this.resolveSetUnion(existing, incoming);
        break;
      default:
        resolved = this.resolveLWW(existing, incoming);
    }

    await this.logConflict(existing, incoming, resolved, strategy);
    return resolved;
  }

  selectStrategy(action) {
    const strategies = {
      'like': 'lww',
      'comment': 'set-union',
      'score': 'max-value',
      'message': 'set-union',
      'offer': 'lww',
      'transfer': 'lww'
    };
    return strategies[action] || 'lww';
  }

  resolveLWW(existing, incoming) {
    const winner = incoming.timestamp >= existing.timestamp ? incoming : existing;
    return {
      ...winner,
      conflictResolved: true,
      conflictInfo: {
        resolvedAt: Date.now(),
        strategy: 'last-write-wins',
        loser: incoming.timestamp >= existing.timestamp ? 'existing' : 'incoming'
      }
    };
  }

  resolveMerge(existing, incoming) {
    const mergedData = {
      ...existing.data,
      ...incoming.data,
      duration: (existing.data.duration || 0) + (incoming.data.duration || 0),
      history: [...(existing.data.history || []), ...(incoming.data.history || [])]
    };
    return {
      ...incoming,
      data: mergedData,
      vectorClock: this.mergeVectorClocks(existing.vectorClock, incoming.vectorClock),
      conflictResolved: true,
      conflictInfo: {
        resolvedAt: Date.now(),
        strategy: 'merge'
      }
    };
  }

  resolveMaxValue(existing, incoming) {
    const existingVal = existing.data.value || existing.data.score || 0;
    const incomingVal = incoming.data.value || incoming.data.score || 0;
    const winner = incomingVal >= existingVal ? incoming : existing;
    return {
      ...winner,
      conflictResolved: true,
      conflictInfo: {
        resolvedAt: Date.now(),
        strategy: 'max-value',
        maxValue: Math.max(existingVal, incomingVal)
      }
    };
  }

  resolveSetUnion(existing, incoming) {
    const existingItems = existing.data.items || [existing.data];
    const incomingItems = incoming.data.items || [incoming.data];
    const seen = new Set();
    const mergedItems = [...existingItems, ...incomingItems].filter(item => {
      const id = item.id || JSON.stringify(item);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return {
      ...incoming,
      data: { items: mergedItems, count: mergedItems.length },
      vectorClock: this.mergeVectorClocks(existing.vectorClock, incoming.vectorClock),
      conflictResolved: true,
      conflictInfo: {
        resolvedAt: Date.now(),
        strategy: 'set-union',
        totalItems: mergedItems.length
      }
    };
  }

  mergeVectorClocks(clockA, clockB) {
    const merged = {};
    const allDevices = new Set([...Object.keys(clockA), ...Object.keys(clockB)]);
    for (const device of allDevices) {
      merged[device] = Math.max(clockA[device] || 0, clockB[device] || 0);
    }
    return merged;
  }

  async logConflict(existing, incoming, resolved, strategy) {
    const conflictRecord = {
      timestamp: Date.now(),
      universalKey: existing.universalKey,
      existing: { timestamp: existing.timestamp, deviceId: existing.deviceId },
      incoming: { timestamp: incoming.timestamp, deviceId: incoming.deviceId },
      resolved: { strategy }
    };
    await this.saveToStore('conflicts', conflictRecord);
  }

  /**
   * Media Progress Tracking (Audio/Video)
   */
  async saveMediaProgress(service, contentId, progress, metadata = {}) {
    const contentType = this.SERVICE_CONTENT_TYPES[service]?.type;
    const userId = this.getEffectiveUserId();
    const progressKey = `${service}_${contentId}_${userId}`;

    const record = {
      progressKey,
      service,
      contentId,
      contentType,
      userId,
      currentTime: progress.currentTime,
      duration: progress.duration,
      percentage: (progress.currentTime / progress.duration) * 100,
      completed: progress.currentTime >= progress.duration * 0.95,
      metadata,
      timestamp: Date.now(),
      syncStatus: 'pending'
    };

    await this.saveToStore('mediaProgress', record);
    await this.queueForSync({ type: 'mediaProgress', record });

    return record;
  }

  async getMediaProgress(service, contentId) {
    const userId = this.getEffectiveUserId();
    const progressKey = `${service}_${contentId}_${userId}`;
    return this.getFromStore('mediaProgress', progressKey);
  }

  async getResumePosition(service, contentId) {
    const progress = await this.getMediaProgress(service, contentId);
    if (!progress) return 0;
    
    // For video: resume from keyframe (round to nearest 10s)
    if (progress.contentType === 'video') {
      return Math.floor(progress.currentTime / 10) * 10;
    }
    return progress.currentTime;
  }

  /**
   * Get Actions with Filtering
   */
  async getActions(options = {}) {
    const {
      service,
      action,
      itemId,
      userId = this.getEffectiveUserId(),
      since,
      limit
    } = options;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['universalActions'], 'readonly');
      const store = transaction.objectStore('universalActions');
      let request;

      if (service) {
        request = store.index('service').getAll(service);
      } else if (userId) {
        request = store.index('userId').getAll(userId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        let results = request.result;
        if (service) results = results.filter(r => r.service === service);
        if (action) results = results.filter(r => r.action === action);
        if (itemId) results = results.filter(r => r.itemId === itemId);
        if (since) results = results.filter(r => r.timestamp >= since);
        
        results.sort((a, b) => b.timestamp - a.timestamp);
        if (limit) results = results.slice(0, limit);

        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if action exists
   */
  async hasAction(service, action, itemId, userId = this.getEffectiveUserId()) {
    const universalKey = `${service}_${action}_${itemId}_${userId}`;
    const record = await this.getFromStore('universalActions', universalKey);
    return !!record;
  }

  /**
   * Activity Stream & Logging
   */
  logActivity(activity) {
    this.saveToStore('activityStream', {
      activityId: `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ...activity
    });
  }

  broadcastActivity(activity) {
    window.dispatchEvent(new CustomEvent('persistent_activity', { detail: activity }));
  }

  /**
   * Sync Management
   */
  async queueForSync(operation) {
    const queueItem = {
      ...operation,
      queueId: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      queuedAt: Date.now(),
      attempts: 0,
      priority: this.calculatePriority(operation)
    };

    await this.saveToStore('syncQueue', queueItem);
    if (this.isOnline) {
      setTimeout(() => this.processSyncQueue(), 0);
    }

    return queueItem;
  }

  calculatePriority(operation) {
    const priorities = {
      'mediaProgress': 'high',
      'action': 'normal',
      'activity': 'low'
    };
    return priorities[operation.type] || 'normal';
  }

  async processSyncQueue() {
    if (!this.isOnline) return;

    const queue = await this.getAllFromStore('syncQueue');
    if (queue.length === 0) return;

    const sorted = queue.sort((a, b) => {
      const order = { high: 0, normal: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

    // Batch sync - collect all pending items
    const actions = [];
    const mediaProgress = [];
    const actionQueueIds = [];
    const progressQueueIds = [];

    for (const item of sorted) {
      if (item.attempts >= 5) continue;
      
      if (item.type === 'action') {
        actions.push(item.record);
        actionQueueIds.push(item.queueId);
      } else if (item.type === 'progress') {
        mediaProgress.push(item.record);
        progressQueueIds.push(item.queueId);
      }
    }

    if (actions.length === 0 && mediaProgress.length === 0) return;

    try {
      const identity = this.getUserIdentity();
      
      // Call server API to sync
      const response = await fetch('/api/persistence/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          actions,
          mediaProgress,
          userId: identity.userId || null,
          userFingerprint: identity.fingerprint,
          deviceId: identity.deviceId
        })
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Mark synced items
        for (const queueId of actionQueueIds) {
          await this.deleteFromStore('syncQueue', queueId);
        }
        for (const queueId of progressQueueIds) {
          await this.deleteFromStore('syncQueue', queueId);
        }

        console.log(`[PersistentStorage] Synced ${result.synced} items to server`);
      }
    } catch (err) {
      console.error('[PersistentStorage] Sync error:', err);
      
      // Increment attempt counts on all items
      for (const item of sorted.slice(0, actions.length + mediaProgress.length)) {
        await this.updateInStore('syncQueue', item.queueId, {
          attempts: (item.attempts || 0) + 1,
          lastError: err.message
        });
      }
    }
  }

  /**
   * Identity Management
   */
  getUserIdentity() {
    let identity = JSON.parse(localStorage.getItem('drd_identity_v3') || 'null');
    if (!identity) {
      identity = {
        userId: null,
        fingerprint: this.generateFingerprint(),
        deviceId: 'dev_' + Date.now(),
        createdAt: Date.now()
      };
      localStorage.setItem('drd_identity_v3', JSON.stringify(identity));
    }
    return identity;
  }

  generateFingerprint() {
    return Math.random().toString(36).substr(2, 16);
  }

  getEffectiveUserId() {
    const identity = this.getUserIdentity();
    return identity.userId || identity.fingerprint;
  }

  getDeviceId() {
    return this.getUserIdentity().deviceId;
  }

  /**
   * IndexedDB Utilities
   */
  saveToStore(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  getFromStore(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  updateInStore(storeName, key, updates) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const getReq = store.get(key);
      getReq.onsuccess = () => {
        const data = { ...getReq.result, ...updates };
        const putReq = store.put(data);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
    });
  }

  deleteFromStore(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  getAllFromStore(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Lifecycle
   */
  setupOnlineListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  startPeriodicSync() {
    setInterval(() => {
      if (this.isOnline) this.processSyncQueue();
    }, 30000);
  }
}

// Global instance
window.universalStorage = new UniversalPersistentStorage();
