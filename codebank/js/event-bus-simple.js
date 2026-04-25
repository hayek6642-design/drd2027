/**
 * event-bus-simple.js
 * Lightweight event bus replacing postMessage bridge communication.
 * Services use on/off/dispatch — no iframes, no postMessage needed.
 *
 * Events:
 *   auth:changed   { user, isAuthenticated, sessionId }
 *   assets:updated { codes, silver, gold, lastSync }
 *   assets:update  { type, action, data }  <- write request from service
 *   service:ready  { name, url }
 *   service:loading{ url, title }
 *   service:error  { url, error }
 */
(function(window) {
    'use strict';

    const _listeners = new Map();

    window.EventBus = {
        on(event, callback) {
            if (!_listeners.has(event)) _listeners.set(event, new Set());
            _listeners.get(event).add(callback);
            return () => this.off(event, callback);
        },
        off(event, callback) {
            _listeners.get(event)?.delete(callback);
        },
        dispatch(event, data) {
            _listeners.get(event)?.forEach(cb => {
                try { cb(data); } catch(e) { console.error('[EventBus] Error in handler for', event, e); }
            });
            // Also fire as CustomEvent for legacy service compatibility
            try {
                window.dispatchEvent(new CustomEvent(event, { detail: data, bubbles: false }));
            } catch(_) {}
        },
        once(event, callback) {
            const unsub = this.on(event, (data) => { callback(data); unsub(); });
            return unsub;
        }
    };

    // Legacy shim: services that use window.AssetBus.subscribe() still work
    if (!window.AssetBus) {
        window.AssetBus = {
            subscribe: (event, cb) => window.EventBus.on(event, cb),
            publish:   (event, data) => window.EventBus.dispatch(event, data),
            snapshot:  () => window.AppState ? window.AppState.assets : null,
            sync:      () => window.AssetsManager ? window.AssetsManager.sync() : null
        };
    }

    console.log('[EventBus] Simple event bus initialized.');

})(window);
