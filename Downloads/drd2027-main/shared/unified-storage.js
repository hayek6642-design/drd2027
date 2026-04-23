/**
 * UNIFIED-STORAGE.js - Single storage interface for all CodeBank assets
 *
 * Replaces:
 *  - Direct localStorage calls in bankode-core.js
 *  - Separate IndexedDB usage in SafeCode
 *  - Disconnected ACC bridges
 *
 * Storage hierarchy (source of truth priority):
 *  1. Server (Turso/SQLite) — master, cross-device
 *  2. IndexedDB (browser)   — structured local cache
 *  3. localStorage           — auth tokens, simple flags only
 *  4. Memory                 — runtime cache
 *
 * USAGE:
 *   <script src="/shared/unified-storage.js"></script>
 *   <script>
 *     // Wait for init
 *     UnifiedStorage.ready.then(function() {
 *       UnifiedStorage.getAll('codes').then(console.log);
 *     });
 *   </script>
 */

(function (global) {
  'use strict';

  var DB_NAME = 'CodeBankDB';
  var DB_VERSION = 2;
  var STORES = ['codes', 'silver', 'gold', 'transactions'];
  var SERVER_BASE = ''; // Same origin — adjust if needed

  // ── Memory cache ────────────────────────────────────────

  var cache = {};

  function cacheKey(type, key) { return type + ':' + key; }

  // ── BroadcastChannel (cross-tab sync) ───────────────────

  var channel = null;
  try {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('codebank_sync');
    }
  } catch (e) { /* unsupported */ }

  // ── Event system ────────────────────────────────────────

  var listeners = {};

  function subscribe(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    return function unsubscribe() {
      listeners[event] = listeners[event].filter(function (cb) { return cb !== callback; });
    };
  }

  function broadcast(event, data) {
    // Local listeners
    (listeners[event] || []).forEach(function (cb) {
      try { cb(data); } catch (e) { console.error('[Storage] Listener error:', e); }
    });

    // Cross-tab
    if (channel) {
      try { channel.postMessage({ event: event, data: data }); } catch (e) { /* ignore */ }
    }

    // Notify parent (if in iframe)
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'storage:broadcast', event: event, data: data }, '*');
      } catch (e) { /* ignore */ }
    }
  }

  // Listen for cross-tab broadcasts
  if (channel) {
    channel.onmessage = function (evt) {
      var msg = evt.data;
      if (msg && msg.event) {
        (listeners[msg.event] || []).forEach(function (cb) {
          try { cb(msg.data); } catch (e) { /* ignore */ }
        });
      }
    };
  }

  // ── IndexedDB ───────────────────────────────────────────

  var db = null;
  var dbReady = new Promise(function (resolve, reject) {
    var request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = function () {
      console.error('[Storage] IndexedDB open failed:', request.error);
      reject(request.error);
    };

    request.onsuccess = function () {
      db = request.result;
      console.log('[Storage] IndexedDB ready');
      resolve();
    };

    request.onupgradeneeded = function (event) {
      var idb = event.target.result;
      STORES.forEach(function (storeName) {
        if (!idb.objectStoreNames.contains(storeName)) {
          var store = idb.createObjectStore(storeName, { keyPath: 'id' });
          store.createIndex('byUser', 'userId', { unique: false });
          store.createIndex('byTimestamp', 'timestamp', { unique: false });
          store.createIndex('bySyncStatus', 'syncStatus', { unique: false });
        }
      });
    };
  });

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
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function idbGetAll(storeName) {
    return dbReady.then(function () {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction([storeName], 'readonly');
        var store = tx.objectStore(storeName);
        var req = store.getAll();
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

  // ── Server sync ─────────────────────────────────────────

  function getAuthHeaders() {
    // Try cookie first
    var match = document.cookie.match(/cb_token=([^;]+)/);
    var token = match ? match[1] : null;
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
  }

  function fetchFromServer(endpoint) {
    return fetch(SERVER_BASE + endpoint, { headers: getAuthHeaders() })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .catch(function (err) {
        console.warn('[Storage] Server fetch failed:', endpoint, err.message);
        return null;
      });
  }

  // Debounced sync queue
  var syncQueue = {};
  var syncTimer = null;

  function queueSync(type, key, value) {
    syncQueue[type + ':' + key] = { type: type, key: key, value: value, timestamp: Date.now() };

    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(flushSyncQueue, 500); // Debounce 500ms
  }

  function flushSyncQueue() {
    var items = Object.values(syncQueue);
    syncQueue = {};

    if (items.length === 0) return;

    // Batch sync
    fetch(SERVER_BASE + '/api/assets/sync-batch', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ items: items })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (result) {
        // Mark items as synced in IndexedDB
        items.forEach(function (item) {
          idbGet(item.type, item.key).then(function (existing) {
            if (existing) {
              existing.syncStatus = 'synced';
              idbPut(item.type, existing);
            }
          });
        });
        broadcast('storage:synced', { count: items.length });
      })
      .catch(function (err) {
        console.warn('[Storage] Batch sync failed, items re-queued:', err.message);
        // Re-queue failed items
        items.forEach(function (item) {
          syncQueue[item.type + ':' + item.key] = item;
        });
      });
  }

  // ── Public API ──────────────────────────────────────────

  var UnifiedStorage = {
    ready: dbReady,
    subscribe: subscribe,
    broadcast: broadcast,

    /**
     * Get a single item.
     */
    get: function (key, type) {
      type = type || 'codes';

      // 1. Memory cache
      var ck = cacheKey(type, key);
      if (cache[ck]) return Promise.resolve(cache[ck]);

      // 2. IndexedDB
      return idbGet(type, key).then(function (item) {
        if (item) {
          cache[ck] = item;
          return item;
        }

        // 3. Server
        return fetchFromServer('/api/assets/' + type + '/' + encodeURIComponent(key))
          .then(function (remote) {
            if (remote) {
              cache[ck] = remote;
              idbPut(type, Object.assign({}, remote, { syncStatus: 'synced' }));
            }
            return remote;
          });
      });
    },

    /**
     * Save an item (writes to IndexedDB + queues server sync + broadcasts).
     */
    set: function (key, value, type) {
      type = type || 'codes';

      var data = Object.assign({}, value, {
        id: key,
        type: type,
        timestamp: value.timestamp || Date.now(),
        syncStatus: 'pending'
      });

      // 1. Memory cache
      cache[cacheKey(type, key)] = data;

      // 2. IndexedDB
      return idbPut(type, data).then(function () {
        // 3. Broadcast
        broadcast('storage:change', { key: key, value: data, type: type });

        // 4. Queue server sync (debounced)
        queueSync(type, key, value);

        return true;
      });
    },

    /**
     * Get all items of a type.
     */
    getAll: function (type) {
      type = type || 'codes';

      return idbGetAll(type).then(function (items) {
        // Also trigger background server refresh
        fetchFromServer('/api/assets/' + type + '/all').then(function (remote) {
          if (remote && Array.isArray(remote) && remote.length > 0) {
            // Merge: server wins for items with newer server_timestamp
            remote.forEach(function (serverItem) {
              idbPut(type, Object.assign({}, serverItem, { syncStatus: 'synced' }));
              cache[cacheKey(type, serverItem.id)] = serverItem;
            });
            broadcast('storage:refreshed', { type: type, count: remote.length });
          }
        });

        return items;
      });
    },

    /**
     * Delete an item.
     */
    remove: function (key, type) {
      type = type || 'codes';
      delete cache[cacheKey(type, key)];

      return idbDelete(type, key).then(function () {
        broadcast('storage:change', { key: key, value: null, type: type, deleted: true });
        // Sync deletion to server
        fetch(SERVER_BASE + '/api/assets/' + type + '/' + encodeURIComponent(key), {
          method: 'DELETE',
          headers: getAuthHeaders()
        }).catch(function () { /* queue for retry */ });
      });
    },

    /**
     * Full pull from server (call on login or manual refresh).
     */
    pullFromServer: function () {
      var promises = STORES.map(function (type) {
        return fetchFromServer('/api/assets/' + type + '/all').then(function (remote) {
          if (!remote || !Array.isArray(remote)) return 0;
          var puts = remote.map(function (item) {
            cache[cacheKey(type, item.id)] = item;
            return idbPut(type, Object.assign({}, item, { syncStatus: 'synced' }));
          });
          return Promise.all(puts).then(function () { return remote.length; });
        });
      });

      return Promise.all(promises).then(function (counts) {
        var total = counts.reduce(function (a, b) { return a + b; }, 0);
        broadcast('storage:pulled', { total: total });
        return total;
      });
    },

    /**
     * Push all pending items to server.
     */
    pushToServer: function () {
      flushSyncQueue();
    },

    /**
     * Get count of items by type.
     */
    count: function (type) {
      type = type || 'codes';
      return idbGetAll(type).then(function (items) { return items.length; });
    }
  };

  global.UnifiedStorage = UnifiedStorage;
})(window);
