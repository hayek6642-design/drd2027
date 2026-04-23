/**
 * Storage Bridge - Syncs localStorage to native Capacitor Preferences
 * Prevents data loss when app closes on Android
 */

import { Preferences } from '@capacitor/preferences';

const NativeStorage = {
    async getItem(key) {
        try {
            const { value } = await Preferences.get({ key });
            return value;
        } catch (error) {
            console.error('[NativeStorage] Error reading:', key, error);
            return null;
        }
    },
    
    async setItem(key, value) {
        try {
            await Preferences.set({ key, value: String(value) });
        } catch (error) {
            console.error('[NativeStorage] Error writing:', key, error);
        }
    },
    
    async removeItem(key) {
        try {
            await Preferences.remove({ key });
        } catch (error) {
            console.error('[NativeStorage] Error removing:', key, error);
        }
    },
    
    async clear() {
        try {
            await Preferences.clear();
        } catch (error) {
            console.error('[NativeStorage] Error clearing:', error);
        }
    },
    
    async getAllKeys() {
        try {
            const { keys } = await Preferences.keys();
            return keys;
        } catch (error) {
            console.error('[NativeStorage] Error getting keys:', error);
            return [];
        }
    }
};

/**
 * Initialize Storage Bridge
 * Restores localStorage from native storage on app start
 */
async function initializeStorageBridge() {
    console.log('[StorageBridge] Initializing...');
    
    try {
        // Restore all keys from native storage to localStorage
        const allKeys = await NativeStorage.getAllKeys();
        console.log('[StorageBridge] Restoring', allKeys.length, 'keys');
        
        for (const key of allKeys) {
            const value = await NativeStorage.getItem(key);
            if (value !== null) {
                localStorage.setItem(key, value);
            }
        }
        
        console.log('[StorageBridge] Restored from native storage');
    } catch (error) {
        console.error('[StorageBridge] Initialization error:', error);
    }
}

/**
 * Sync localStorage to native storage on changes
 * This ensures data persists even if the WebView is destroyed
 */
function setupStorageSync() {
    // Sync on storage events (from other tabs/windows)
    window.addEventListener('storage', async (event) => {
        if (event.key && event.newValue !== null) {
            await NativeStorage.setItem(event.key, event.newValue);
            console.log('[StorageBridge] Synced key:', event.key);
        }
    });
    
    // Sync all localStorage to native storage periodically
    setInterval(async () => {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key);
                await NativeStorage.setItem(key, value);
            }
        }
        console.log('[StorageBridge] Periodic sync completed');
    }, 5000); // Every 5 seconds
    
    // Aggressive sync on before unload
    window.addEventListener('beforeunload', async () => {
        console.log('[StorageBridge] Syncing on unload...');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key);
                await NativeStorage.setItem(key, value);
            }
        }
    });
}

// Fix 3: Remove escaped text sequences
function fixHTMLEscaping() {
    const originalSetInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    
    Object.defineProperty(Element.prototype, 'innerHTML', {
        ...originalSetInnerHTML,
        set(value) {
            // Remove common escape sequences
            const cleaned = value
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\r/g, '\r')
                .replace(/\\"/g, '"')
                .replace(/\\'/g, "'")
                .replace(/\\\\/g, '\\');
            
            originalSetInnerHTML.set.call(this, cleaned);
        }
    });
}

/**
 * Start the storage bridge
 */
export async function startStorageBridge() {
    console.log('[StorageBridge] Starting...');
    
    // Initialize storage sync
    await initializeStorageBridge();
    setupStorageSync();
    fixHTMLEscaping();
    
    console.log('[StorageBridge] Ready!');
}

// Auto-start when imported
document.addEventListener('DOMContentLoaded', startStorageBridge);
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startStorageBridge);
} else {
    startStorageBridge();
}

export { NativeStorage };
