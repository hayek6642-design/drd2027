/**
 * native-storage.js - Persistent Native Storage for CodeBank
 * 
 * Wraps Capacitor Preferences (formerly Storage) plugin for native platforms.
 * Falls back to localStorage on web. Provides identical API regardless of platform.
 * 
 * Key differences from localStorage:
 * - Async API (all methods return Promises)
 * - Data persists across app updates on native
 * - Not shared between WebView instances (unlike localStorage in some cases)
 * - No size limits imposed by WebView
 * 
 * Usage:
 *   import { NativeStorage } from './native-storage.js';
 *   await NativeStorage.set('key', { some: 'data' });
 *   const val = await NativeStorage.get('key');
 */

const NativeStorage = (() => {
  'use strict';

  let _isNative = false;
  let _prefsPlugin = null;

  // Initialize
  try {
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      _isNative = true;
      _prefsPlugin = window.Capacitor.Plugins.Preferences;
    }
  } catch (_) {}

  // ==========================================
  // Core CRUD Operations
  // ==========================================

  /**
   * Store a value. Objects are auto-serialized to JSON.
   */
  async function set(key, value) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    if (_isNative && _prefsPlugin) {
      try {
        await _prefsPlugin.set({ key, value: stringValue });
        return true;
      } catch (e) {
        console.warn('[NativeStorage] set() native error, using localStorage:', e.message);
      }
    }

    try {
      localStorage.setItem(key, stringValue);
      return true;
    } catch (e) {
      console.error('[NativeStorage] set() failed entirely:', e.message);
      return false;
    }
  }

  /**
   * Get a value. Auto-parses JSON if possible.
   * Returns null if key doesn't exist.
   */
  async function get(key) {
    let raw = null;

    if (_isNative && _prefsPlugin) {
      try {
        const result = await _prefsPlugin.get({ key });
        raw = result.value;
      } catch (e) {
        console.warn('[NativeStorage] get() native error, using localStorage:', e.message);
        raw = localStorage.getItem(key);
      }
    } else {
      raw = localStorage.getItem(key);
    }

    if (raw === null || raw === undefined) return null;

    // Try JSON parse
    try {
      return JSON.parse(raw);
    } catch (_) {
      return raw; // Return as string if not JSON
    }
  }

  /**
   * Get raw string value without JSON parsing.
   */
  async function getString(key) {
    if (_isNative && _prefsPlugin) {
      try {
        const result = await _prefsPlugin.get({ key });
        return result.value;
      } catch (e) {
        return localStorage.getItem(key);
      }
    }
    return localStorage.getItem(key);
  }

  /**
   * Remove a key.
   */
  async function remove(key) {
    if (_isNative && _prefsPlugin) {
      try {
        await _prefsPlugin.remove({ key });
      } catch (e) {
        console.warn('[NativeStorage] remove() native error:', e.message);
      }
    }
    // Always clean localStorage too for consistency
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  }

  /**
   * Clear all stored data.
   */
  async function clear() {
    if (_isNative && _prefsPlugin) {
      try {
        await _prefsPlugin.clear();
      } catch (e) {
        console.warn('[NativeStorage] clear() native error:', e.message);
      }
    }
    try {
      localStorage.clear();
    } catch (_) {}
  }

  /**
   * Get all stored keys.
   */
  async function keys() {
    if (_isNative && _prefsPlugin) {
      try {
        const result = await _prefsPlugin.keys();
        return result.keys || [];
      } catch (e) {
        console.warn('[NativeStorage] keys() native error:', e.message);
      }
    }
    return Object.keys(localStorage);
  }

  // ==========================================
  // Batch Operations (for sync efficiency)
  // ==========================================

  /**
   * Set multiple key-value pairs at once.
   */
  async function setMultiple(entries) {
    const promises = Object.entries(entries).map(([key, value]) => set(key, value));
    await Promise.all(promises);
  }

  /**
   * Get multiple values at once.
   * Returns an object with key-value pairs.
   */
  async function getMultiple(keyList) {
    const results = {};
    const promises = keyList.map(async (key) => {
      results[key] = await get(key);
    });
    await Promise.all(promises);
    return results;
  }

  // ==========================================
  // Migration: localStorage → NativeStorage
  // ==========================================

  /**
   * Migrate critical keys from localStorage to native storage.
   * Call this once on first native launch to preserve user data.
   */
  async function migrateFromLocalStorage(criticalKeys) {
    if (!_isNative || !_prefsPlugin) return;

    const keysToMigrate = criticalKeys || [
      'session_token',
      'session_active',
      'user_email',
      'user_name',
      'verified_codes',
      'asset_snapshot',
      'push_token',
      'app_settings'
    ];

    let migrated = 0;
    for (const key of keysToMigrate) {
      const localValue = localStorage.getItem(key);
      if (localValue !== null) {
        try {
          const existing = await _prefsPlugin.get({ key });
          if (!existing.value) {
            await _prefsPlugin.set({ key, value: localValue });
            migrated++;
          }
        } catch (e) {
          console.warn(`[NativeStorage] Migration failed for key "${key}":`, e.message);
        }
      }
    }

    if (migrated > 0) {
      console.log(`[NativeStorage] Migrated ${migrated} keys from localStorage`);
    }
  }

  // ==========================================
  // Sync Bridge: Keep localStorage & native in sync
  // ==========================================

  /**
   * Write to both native storage AND localStorage simultaneously.
   * This ensures iframe-based services (which use localStorage) stay in sync.
   */
  async function syncSet(key, value) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    // Always write to localStorage for iframe compatibility
    try {
      localStorage.setItem(key, stringValue);
    } catch (_) {}

    // Also write to native storage for persistence
    if (_isNative && _prefsPlugin) {
      try {
        await _prefsPlugin.set({ key, value: stringValue });
      } catch (e) {
        console.warn('[NativeStorage] syncSet native error:', e.message);
      }
    }
  }

  /**
   * Read from native storage first, fall back to localStorage.
   * If native has a value that localStorage doesn't, sync it back.
   */
  async function syncGet(key) {
    if (!_isNative || !_prefsPlugin) {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      try { return JSON.parse(raw); } catch (_) { return raw; }
    }

    try {
      const nativeResult = await _prefsPlugin.get({ key });
      const nativeValue = nativeResult.value;
      const localValue = localStorage.getItem(key);

      if (nativeValue !== null && localValue === null) {
        // Sync native → localStorage for iframe access
        localStorage.setItem(key, nativeValue);
      } else if (nativeValue === null && localValue !== null) {
        // Sync localStorage → native
        await _prefsPlugin.set({ key, value: localValue });
      }

      const raw = nativeValue || localValue;
      if (raw === null) return null;
      try { return JSON.parse(raw); } catch (_) { return raw; }
    } catch (e) {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      try { return JSON.parse(raw); } catch (_) { return raw; }
    }
  }

  // ==========================================
  // Public API
  // ==========================================

  return {
    // Core
    set,
    get,
    getString,
    remove,
    clear,
    keys,

    // Batch
    setMultiple,
    getMultiple,

    // Sync (recommended for auth/session data)
    syncSet,
    syncGet,

    // Migration
    migrateFromLocalStorage,

    // Info
    isNative: () => _isNative,
    
    // Constants - critical keys that must survive app updates
    CRITICAL_KEYS: [
      'session_token',
      'session_active',
      'user_email',
      'user_name',
      'verified_codes',
      'asset_snapshot',
      'push_token',
      'app_settings',
      'theme_preference',
      'last_sync_time'
    ]
  };
})();

// Make globally available
window.NativeStorage = NativeStorage;

// Auto-migrate on first native launch
if (NativeStorage.isNative()) {
  NativeStorage.migrateFromLocalStorage().catch(e => {
    console.warn('[NativeStorage] Auto-migration failed:', e.message);
  });
}

export { NativeStorage };
