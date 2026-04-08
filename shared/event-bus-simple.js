/**
 * Simple Event Bus - Lightweight Cross-Service Communication
 * Replace all postMessage/bridge complexity with direct events
 */

(function() {
    'use strict';

    // Private storage
    const _events = new Map();
    const _onceEvents = new Map();

    /**
     * Dispatch an event to all listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    window.dispatch = function(event, data) {
        // Handle once listeners
        if (_onceEvents.has(event)) {
            const listeners = _onceEvents.get(event);
            _onceEvents.delete(event);
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`[EventBus] Error in once listener for ${event}:`, e);
                }
            });
        }

        // Handle persistent listeners
        if (_events.has(event)) {
            _events.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`[EventBus] Error in listener for ${event}:`, e);
                }
            });
        }

        // Log in debug mode
        if (window.DEBUG_MODE) {
            console.log(`[EventBus] Dispatched: ${event}`, data);
        }
    };

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {function} callback - Callback function
     * @returns {function} Unsubscribe function
     */
    window.on = function(event, callback) {
        if (!_events.has(event)) {
            _events.set(event, new Set());
        }
        _events.get(event).add(callback);

        // Return unsubscribe function
        return function() {
            _events.get(event)?.delete(callback);
        };
    };

    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {function} callback - Callback function
     */
    window.once = function(event, callback) {
        if (!_onceEvents.has(event)) {
            _onceEvents.set(event, new Set());
        }
        _onceEvents.get(event).add(callback);
    };

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {function} callback - Callback function
     */
    window.off = function(event, callback) {
        _events.get(event)?.delete(callback);
        _onceEvents.get(event)?.delete(callback);
    };

    /**
     * Clear all listeners for an event or all events
     * @param {string} [event] - Optional event name
     */
    window.clearEvents = function(event) {
        if (event) {
            _events.delete(event);
            _onceEvents.delete(event);
        } else {
            _events.clear();
            _onceEvents.clear();
        }
    };

    // Common events
    window.EventBus = {
        AUTH_CHANGED: 'auth:changed',
        ASSETS_UPDATED: 'assets:updated',
        ASSETS_CODES_UPDATED: 'assets:codes:updated',
        ASSETS_SILVER_UPDATED: 'assets:silver:updated',
        ASSETS_GOLD_UPDATED: 'assets:gold:updated',
        SERVICE_READY: 'service:ready',
        SERVICE_CHANGED: 'service:changed',
        SERVICE_CLOSED: 'service:closed',
        SYNC_COMPLETE: 'sync:complete',
        SYNC_ERROR: 'sync:error'
    };

    console.log('[EventBus] Initialized');
})();