/**
 * USER ACTIVITY TRACKER - Comprehensive persistence system
 * 
 * Tracks ALL user actions and activities:
 * - Likes, comments, shares, downloads for all services
 * - Watch time / counter persistence
 * - Generated codes (CodeBank)
 * - Last generated code
 * - User activity log
 * 
 * Auto-restores on app initialization
 * Syncs with server (Turso) + IndexedDB + localStorage
 */

(function (global) {
  'use strict';

  var STORAGE_KEY_PREFIX = 'uact_';
  var DB_NAME = 'UserActivityDB';
  var DB_VERSION = 3;
  var STORES = {
    actions: 'actions',           // like, comment, share, download
    watchTime: 'watchTime',       // video/audio watch progress
    codes: 'codes',               // generated codes
    stats: 'stats',               // aggregated statistics
    syncLog: 'syncLog'            // sync history
  };

  // ── Memory cache ────────────────────────────────────────

  var memoryCache = {};

  function getCacheKey(type, id) {
    return type + ':' + id;
  }

  // ── IndexedDB Setup ─────────────────────────────────────

  var db = null;
  var dbReady = new Promise(function (resolve, reject) {
    var request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = function () {
      console.error('[UserActivityTracker] IndexedDB open failed:', request.error);
      reject(request.error);
    };

    request.onsuccess = function () {
      db = request.result;
      console.log('[UserActivityTracker] IndexedDB ready');
      resolve();
    };

    request.onupgradeneeded = function (event) {
      var idb = event.target.result;

      // Actions store (like, comment, share, download)
      if (!idb.objectStoreNames.contains(STORES.actions)) {
        var actionStore = idb.createObjectStore(STORES.actions, { keyPath: 'id' });
        actionStore.createIndex('byService', 'service', { unique: false });
        actionStore.createIndex('byAction', 'action', { unique: false });
        actionStore.createIndex('byItemId', 'itemId', { unique: false });
        actionStore.createIndex('byTimestamp', 'timestamp', { unique: false });
      }

      // Watch time store
      if (!idb.objectStoreNames.contains(STORES.watchTime)) {
        var watchStore = idb.createObjectStore(STORES.watchTime, { keyPath: 'contentId' });
        watchStore.createIndex('byService', 'service', { unique: false });
        watchStore.createIndex('byLastUpdated', 'lastUpdated', { unique: false });
      }

      // Generated codes store
      if (!idb.objectStoreNames.contains(STORES.codes)) {
        var codeStore = idb.createObjectStore(STORES.codes, { keyPath: 'id' });
        codeStore.createIndex('byService', 'service', { unique: false });
        codeStore.createIndex('byTimestamp', 'timestamp', { unique: false });
      }

      // Stats store
      if (!idb.objectStoreNames.contains(STORES.stats)) {
        idb.createObjectStore(STORES.stats, { keyPath: 'statKey' });
      }

      // Sync log
      if (!idb.objectStoreNames.contains(STORES.syncLog)) {
        idb.createObjectStore(STORES.syncLog, { keyPath: 'id', autoIncrement: true });
      }
    };
  });

  // ── IndexedDB Operations ────────────────────────────────

  function idbGet(storeName, key) {
    return dbReady.then(function () {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction([storeName], 'readonly');
        var store = tx.objectStore(storeName);
        var req = store.get(key);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function idbPut(storeName, data) {
    return dbReady.then(function () {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction([storeName], 'readwrite');
        var store = tx.objectStore(storeName);
        var req = store.put(data);
        req.onsuccess = function () { resolve(data); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function idbGetAll(storeName, index, value) {
    return dbReady.then(function () {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction([storeName], 'readonly');
        var store = tx.objectStore(storeName);
        var req;

        if (index && value !== undefined) {
          req = store.index(index).getAll(value);
        } else {
          req = store.getAll();
        }

        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function idbDelete(storeName, key) {
    return dbReady.then(function () {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction([storeName], 'readwrite');
        var store = tx.objectStore(storeName);
        var req = store.delete(key);
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  // ── User Activity Tracker API ───────────────────────────

  var UserActivityTracker = {
    ready: dbReady,

    /**
     * SAVE ACTION - like, comment, share, download
     * Usage: UserActivityTracker.saveAction('farragna', 'like', 'video_123', { })
     */
    saveAction: function (service, action, itemId, data, options) {
      options = options || {};

      var record = {
        id: service + '_' + action + '_' + itemId + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        service: service,
        action: action,
        itemId: itemId,
        data: data,
        timestamp: Date.now(),
        synced: false,
        priority: options.priority || 'normal'
      };

      // Save to cache
      var cacheKey = getCacheKey(action + '_' + itemId, service);
      memoryCache[cacheKey] = record;

      // Save to IndexedDB
      return idbPut(STORES.actions, record).then(function () {
        // Queue for server sync
        UserActivityTracker._queueServerSync(STORES.actions, record);

        // Emit event
        window.dispatchEvent(new CustomEvent('activity:saved', {
          detail: { service: service, action: action, itemId: itemId, record: record }
        }));

        console.log('[UserActivityTracker] Saved ' + action + ' for ' + itemId + ' in ' + service);
        return record;
      });
    },

    /**
     * SAVE WATCH TIME
     * Usage: UserActivityTracker.saveWatchTime('farragna', 'video_123', 120.5, 600, { title: '...' })
     */
    saveWatchTime: function (service, contentId, currentTime, duration, metadata) {
      metadata = metadata || {};

      var record = {
        contentId: contentId,
        service: service,
        currentTime: currentTime,
        duration: duration,
        percentageWatched: duration > 0 ? (currentTime / duration) * 100 : 0,
        lastUpdated: Date.now(),
        metadata: metadata,
        synced: false
      };

      // Save to cache
      memoryCache[getCacheKey('watchTime', contentId)] = record;

      // Save to IndexedDB
      return idbPut(STORES.watchTime, record).then(function () {
        // Queue for sync (debounced)
        UserActivityTracker._queueServerSync(STORES.watchTime, record, 5000);
        return record;
      });
    },

    /**
     * GET WATCH TIME (for resume functionality)
     */
    getWatchTime: function (contentId) {
      return dbReady.then(function () {
        var cacheKey = getCacheKey('watchTime', contentId);
        if (memoryCache[cacheKey]) {
          return Promise.resolve(memoryCache[cacheKey]);
        }
        return idbGet(STORES.watchTime, contentId);
      });
    },

    /**
     * SAVE GENERATED CODE
     * Usage: UserActivityTracker.saveCode('safecode', 'code_123', { language: 'js', content: '...' })
     */
    saveCode: function (service, codeId, codeData) {
      var record = {
        id: codeId,
        service: service,
        content: codeData.content || '',
        language: codeData.language || 'javascript',
        title: codeData.title || 'Untitled Code',
        timestamp: Date.now(),
        metadata: codeData.metadata || {}
      };

      return idbPut(STORES.codes, record).then(function () {
        // Save as "last generated code"
        localStorage.setItem(STORAGE_KEY_PREFIX + 'last_code_' + service, JSON.stringify(record));

        // Queue for sync
        UserActivityTracker._queueServerSync(STORES.codes, record);

        window.dispatchEvent(new CustomEvent('code:saved', {
          detail: { service: service, codeId: codeId, record: record }
        }));

        return record;
      });
    },

    /**
     * GET LAST GENERATED CODE
     */
    getLastCode: function (service) {
      var cached = localStorage.getItem(STORAGE_KEY_PREFIX + 'last_code_' + service);
      if (cached) {
        try {
          return Promise.resolve(JSON.parse(cached));
        } catch (e) {
          // Ignore
        }
      }

      // Try IndexedDB
      return idbGetAll(STORES.codes, 'byService', service).then(function (codes) {
        if (codes.length > 0) {
          // Return most recent
          return codes.sort(function (a, b) { return b.timestamp - a.timestamp; })[0];
        }
        return null;
      });
    },

    /**
     * GET ALL CODES FOR SERVICE
     */
    getAllCodes: function (service) {
      return idbGetAll(STORES.codes, 'byService', service);
    },

    /**
     * CHECK IF USER DID ACTION
     * Usage: if (await UserActivityTracker.hasAction('like', 'video_123')) { ... }
     */
    hasAction: function (action, itemId) {
      return idbGetAll(STORES.actions, 'byItemId', itemId).then(function (actions) {
        return actions.some(function (a) { return a.action === action; });
      });
    },

    /**
     * GET ALL ACTIONS FOR ITEM
     */
    getActionsForItem: function (itemId) {
      return idbGetAll(STORES.actions, 'byItemId', itemId);
    },

    /**
     * GET ALL ACTIONS FOR SERVICE
     */
    getActionsForService: function (service, action) {
      return idbGetAll(STORES.actions, 'byService', service).then(function (actions) {
        if (action) {
          return actions.filter(function (a) { return a.action === action; });
        }
        return actions;
      });
    },

    /**
     * GET STATISTICS
     */
    getStats: function (service) {
      return idbGet(STORES.stats, 'stats_' + service).then(function (stat) {
        if (stat) return stat;

        // Calculate on the fly
        return idbGetAll(STORES.actions, 'byService', service).then(function (actions) {
          var grouped = {};
          actions.forEach(function (a) {
            grouped[a.action] = (grouped[a.action] || 0) + 1;
          });

          var stats = {
            statKey: 'stats_' + service,
            service: service,
            likes: grouped.like || 0,
            comments: grouped.comment || 0,
            shares: grouped.share || 0,
            downloads: grouped.download || 0,
            totalActions: actions.length,
            lastUpdated: Date.now()
          };

          // Cache it
          idbPut(STORES.stats, stats);
          return stats;
        });
      });
    },

    /**
     * RESTORE ALL ACTIVITY ON APP INIT
     * Call this when app loads to restore persisted state
     */
    restoreAll: function (callback) {
      var restoreOps = [];

      // Restore watch times for all services
      restoreOps.push(
        idbGetAll(STORES.watchTime).then(function (watches) {
          var restored = [];
          watches.forEach(function (watch) {
            memoryCache[getCacheKey('watchTime', watch.contentId)] = watch;
            restored.push(watch);
          });
          console.log('[UserActivityTracker] Restored ' + restored.length + ' watch time records');

          // Emit restore event
          window.dispatchEvent(new CustomEvent('activity:restored', {
            detail: { type: 'watchTime', count: restored.length, records: restored }
          }));

          return restored;
        })
      );

      // Restore all actions
      restoreOps.push(
        idbGetAll(STORES.actions).then(function (actions) {
          var restored = [];
          actions.forEach(function (action) {
            var cacheKey = getCacheKey(action.action + '_' + action.itemId, action.service);
            memoryCache[cacheKey] = action;
            restored.push(action);
          });
          console.log('[UserActivityTracker] Restored ' + restored.length + ' user actions');

          window.dispatchEvent(new CustomEvent('activity:restored', {
            detail: { type: 'actions', count: restored.length, records: restored }
          }));

          return restored;
        })
      );

      // Restore all codes
      restoreOps.push(
        idbGetAll(STORES.codes).then(function (codes) {
          var restored = [];
          codes.forEach(function (code) {
            memoryCache[getCacheKey('code', code.id)] = code;
            restored.push(code);
          });
          console.log('[UserActivityTracker] Restored ' + restored.length + ' generated codes');

          window.dispatchEvent(new CustomEvent('activity:restored', {
            detail: { type: 'codes', count: restored.length, records: restored }
          }));

          return restored;
        })
      );

      return Promise.all(restoreOps).then(function (results) {
        console.log('[UserActivityTracker] Full restore complete');
        if (callback) callback(results);
        return results;
      });
    },

    /**
     * SYNC WITH SERVER
     * Call periodically or on demand
     */
    syncWithServer: function (endpoint) {
      endpoint = endpoint || '/api/activity/sync';

      return dbReady.then(function () {
        // Get all unsynced records
        return Promise.all([
          idbGetAll(STORES.actions).then(function (actions) {
            return actions.filter(function (a) { return !a.synced; });
          }),
          idbGetAll(STORES.watchTime).then(function (watches) {
            return watches.filter(function (w) { return !w.synced; });
          }),
          idbGetAll(STORES.codes).then(function (codes) {
            return codes.filter(function (c) { return !c.synced; });
          })
        ]).then(function (results) {
          var actionsToSync = results[0];
          var watchesToSync = results[1];
          var codesToSync = results[2];

          if (actionsToSync.length === 0 && watchesToSync.length === 0 && codesToSync.length === 0) {
            console.log('[UserActivityTracker] Nothing to sync');
            return { synced: 0 };
          }

          var payload = {
            actions: actionsToSync,
            watchTimes: watchesToSync,
            codes: codesToSync
          };

          // Get auth token
          var token = null;
          try {
            var match = document.cookie.match(/cb_token=([^;]+)/);
            if (match) token = match[1];
          } catch (e) {
            // Ignore
          }

          var headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = 'Bearer ' + token;

          return fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
          }).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
          }).then(function (result) {
            // Mark as synced
            var syncedIds = result.syncedIds || [];

            return Promise.all([
              Promise.all(
                actionsToSync.filter(function (a) { return syncedIds.includes(a.id); })
                  .map(function (a) {
                    a.synced = true;
                    return idbPut(STORES.actions, a);
                  })
              ),
              Promise.all(
                watchesToSync.filter(function (w) { return syncedIds.includes(w.contentId); })
                  .map(function (w) {
                    w.synced = true;
                    return idbPut(STORES.watchTime, w);
                  })
              ),
              Promise.all(
                codesToSync.filter(function (c) { return syncedIds.includes(c.id); })
                  .map(function (c) {
                    c.synced = true;
                    return idbPut(STORES.codes, c);
                  })
              )
            ]).then(function () {
              console.log('[UserActivityTracker] Synced ' + syncedIds.length + ' records to server');

              // Log sync
              idbPut(STORES.syncLog, {
                timestamp: Date.now(),
                synced: syncedIds.length,
                endpoint: endpoint
              });

              return result;
            });
          });
        });
      }).catch(function (err) {
        console.error('[UserActivityTracker] Sync failed:', err);
        return { error: err.message, synced: 0 };
      });
    },

    /**
     * INTERNAL: Queue for server sync (debounced)
     */
    _syncQueue: {},
    _syncTimer: null,
    _queueServerSync: function (storeName, record, delay) {
      delay = delay || 1000;
      var queueKey = storeName + '_' + record.id;
      this._syncQueue[queueKey] = record;

      if (this._syncTimer) clearTimeout(this._syncTimer);

      var self = this;
      this._syncTimer = setTimeout(function () {
        // Debounced sync will happen automatically on next sync call
        console.log('[UserActivityTracker] Sync queue ready with ' + Object.keys(self._syncQueue).length + ' items');
      }, delay);
    },

    /**
     * CLEAR ALL DATA (for testing / logout)
     */
    clearAll: function () {
      memoryCache = {};
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'last_code');

      return dbReady.then(function () {
        return Promise.all([
          idbGetAll(STORES.actions).then(function (actions) {
            return Promise.all(actions.map(function (a) { return idbDelete(STORES.actions, a.id); }));
          }),
          idbGetAll(STORES.watchTime).then(function (watches) {
            return Promise.all(watches.map(function (w) { return idbDelete(STORES.watchTime, w.contentId); }));
          }),
          idbGetAll(STORES.codes).then(function (codes) {
            return Promise.all(codes.map(function (c) { return idbDelete(STORES.codes, c.id); }));
          })
        ]);
      });
    }
  };

  global.UserActivityTracker = UserActivityTracker;
})(window);
