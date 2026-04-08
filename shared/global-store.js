/**
 * Global Store - Unified State Management
 * Single source of truth for all app state
 */

(function() {
    'use strict';

    // Initialize global state
    window.AppState = {
        user: null,
        isAuthenticated: false,
        assets: {
            codes: [],
            silver: [],
            gold: []
        },
        sessionId: null,
        lastSync: null,
        // Service state
        activeService: null,
        services: {}
    };

    // Private storage for listeners
    const _listeners = new Map();

    // Core state methods
    window.AppState.setUser = function(user) {
        window.AppState.user = user;
        window.AppState.isAuthenticated = !!user;
        window.AppState.sessionId = user?.sessionId || null;
        _dispatch('auth:changed', { user, isAuthenticated: window.AppState.isAuthenticated });
    };

    window.AppState.setAssets = function(assets) {
        window.AppState.assets = {
            codes: assets.codes || [],
            silver: assets.silver || [],
            gold: assets.gold || []
        };
        window.AppState.lastSync = Date.now();
        _dispatch('assets:updated', window.AppState.assets);
    };

    window.AppState.updateAssets = function(type, data) {
        if (!window.AppState.assets[type]) {
            window.AppState.assets[type] = [];
        }
        
        if (data.action === 'add') {
            window.AppState.assets[type] = [...window.AppState.assets[type], ...(data.items || [data.item])];
        } else if (data.action === 'remove') {
            const idsToRemove = data.ids || [data.id];
            window.AppState.assets[type] = window.AppState.assets[type].filter(item => 
                !idsToRemove.includes(item.id || item)
            );
        } else if (data.action === 'set') {
            window.AppState.assets[type] = data.items || [];
        }
        
        window.AppState.lastSync = Date.now();
        _dispatch('assets:updated', window.AppState.assets);
        _dispatch(`assets:${type}:updated`, window.AppState.assets[type]);
    };

    window.AppState.getAssets = function() {
        return window.AppState.assets;
    };

    window.AppState.getAssetCount = function(type) {
        return (window.AppState.assets[type] || []).length;
    };

    window.AppState.setActiveService = function(serviceName) {
        window.AppState.activeService = serviceName;
        _dispatch('service:changed', { service: serviceName });
    };

    window.AppState.isLoggedIn = function() {
        return window.AppState.isAuthenticated && window.AppState.user;
    };

    // Event system
    function _dispatch(event, data) {
        if (_listeners.has(event)) {
            _listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`[AppState] Error in listener for ${event}:`, e);
                }
            });
        }
    }

    window.AppState.on = function(event, callback) {
        if (!_listeners.has(event)) {
            _listeners.set(event, new Set());
        }
        _listeners.get(event).add(callback);
        
        // Return unsubscribe function
        return function() {
            _listeners.get(event)?.delete(callback);
        };
    };

    window.AppState.off = function(event, callback) {
        _listeners.get(event)?.delete(callback);
    };

    window.AppState.once = function(event, callback) {
        const unsubscribe = window.AppState.on(event, (data) => {
            unsubscribe();
            callback(data);
        });
        return unsubscribe;
    };

    // Initialize from localStorage if available
    try {
        const saved = localStorage.getItem('appState');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.user) window.AppState.setUser(parsed.user);
            if (parsed.assets) window.AppState.setAssets(parsed.assets);
        }
    } catch (e) {
        console.log('[AppState] No saved state found');
    }

    // Persist state changes
    window.addEventListener('beforeunload', () => {
        try {
            localStorage.setItem('appState', JSON.stringify({
                user: window.AppState.user,
                assets: window.AppState.assets
            }));
        } catch (e) {}
    });

    console.log('[AppState] Initialized');
})();