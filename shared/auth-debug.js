/**
 * Auth Debug Logger
 * Temporary for refactor verification
 */

(function(window) {
    'use strict';

    const LOG_KEY = 'auth_debug_logs';
    const MAX_LOGS = 50;

    /**
     * Log an auth event
     */
    window.logAuthEvent = function(event, data) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            event,
            data,
            url: window.location.href
        };
        
        console.log('[AuthDebug]', event, data);
        
        // Store last 50 events
        try {
            const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
            logs.push(logEntry);
            if (logs.length > MAX_LOGS) logs.shift();
            localStorage.setItem(LOG_KEY, JSON.stringify(logs));
        } catch (e) {
            console.warn('[AuthDebug] Storage error:', e);
        }
    };

    /**
     * Get all logs
     */
    window.getAuthLogs = function() {
        return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    };

    /**
     * Clear logs
     */
    window.clearAuthLogs = function() {
        localStorage.removeItem(LOG_KEY);
        console.log('[AuthDebug] Logs cleared');
    };

    /**
     * Get recent logs
     */
    window.getAuthLogsRecent = function(count = 10) {
        const logs = window.getAuthLogs();
        return logs.slice(-count);
    };

    // Auto-log session changes from session-manager
    if (window.sessionManager) {
        window.sessionManager.subscribe(function(session) {
            window.logAuthEvent('session_changed', {
                type: session?.type,
                id: session?.type === 'user' ? session.userId : session?.guestId
            });
        });
    }

    // Also listen for session:changed event
    window.addEventListener('session:changed', function(e) {
        window.logAuthEvent('session_event', e.detail);
    });

    console.log('[AuthDebug] Logger loaded');

})(typeof window !== 'undefined' ? window : global);