/**
 * ZAGEL Storage v2.0.0
 * Isolated storage layer using IndexedDB + localStorage
 * All keys prefixed with zagel_global_ for namespace isolation
 */

(function () {
  'use strict';
  if (window.__ZAGEL_STORAGE__) return;

  const PREFIX = 'zagel_global_';
  const DB_NAME = 'ZagelOS';
  const STORE_NAME = 'zagel_store';
  const DB_VERSION = 1;

  class ZagelStorage {
    constructor() {
      this._db = null;
      this._ready = this._initDB();
      console.log('💾 [Zagel-Storage] Initialized');
    }

    async _initDB() {
      try {
        this._db = await new Promise((resolve, reject) => {
          const req = indexedDB.open(DB_NAME, DB_VERSION);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        return true;
      } catch (e) {
        console.warn('💾 [Zagel-Storage] IndexedDB unavailable, localStorage only');
        return false;
      }
    }

    async set(key, value) {
      const prefixedKey = PREFIX + key;
      const serialized = JSON.stringify(value);

      // localStorage fallback (always)
      try { localStorage.setItem(prefixedKey, serialized); } catch (e) { /* quota */ }

      // IndexedDB primary
      await this._ready;
      if (!this._db) return;

      return new Promise((resolve) => {
        try {
          const tx = this._db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put({ key: prefixedKey, value, updatedAt: Date.now() });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) { resolve(false); }
      });
    }

    async get(key, defaultValue = null) {
      const prefixedKey = PREFIX + key;
      await this._ready;

      if (this._db) {
        try {
          const result = await new Promise((resolve) => {
            const tx = this._db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(prefixedKey);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
          });
          if (result) return result.value;
        } catch (e) { /* fallthrough */ }
      }

      // localStorage fallback
      try {
        const raw = localStorage.getItem(prefixedKey);
        return raw ? JSON.parse(raw) : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    }

    async remove(key) {
      const prefixedKey = PREFIX + key;
      try { localStorage.removeItem(prefixedKey); } catch (e) { /* */ }

      await this._ready;
      if (!this._db) return;

      return new Promise((resolve) => {
        try {
          const tx = this._db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).delete(prefixedKey);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) { resolve(false); }
      });
    }

    async keys() {
      await this._ready;
      const results = [];

      if (this._db) {
        try {
          const all = await new Promise((resolve) => {
            const tx = this._db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).getAllKeys();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          });
          return all.filter(k => k.startsWith(PREFIX)).map(k => k.slice(PREFIX.length));
        } catch (e) { /* fallthrough */ }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) results.push(k.slice(PREFIX.length));
      }
      return results;
    }

    async clear() {
      // Clear localStorage
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));

      // Clear IndexedDB
      await this._ready;
      if (!this._db) return;
      return new Promise((resolve) => {
        try {
          const tx = this._db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).clear();
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) { resolve(false); }
      });
    }

    async export() {
      const keys = await this.keys();
      const data = {};
      for (const k of keys) {
        data[k] = await this.get(k);
      }
      return data;
    }

    async import(data) {
      for (const [k, v] of Object.entries(data)) {
        await this.set(k, v);
      }
    }
  }

  window.__ZAGEL_STORAGE__ = new ZagelStorage();
  window.ZagelStore = window.__ZAGEL_STORAGE__;
})();
