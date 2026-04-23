/**
 * bankode-assetbus-bridge.js
 * 
 * Establishes two-way communication between SafeCode iframe and parent window:
 * - Requests initial auth state from parent
 * - Receives asset snapshots from parent
 * - Listens for auth changes
 * - Stores codes in localStorage/IndexedDB for persistence
 */

(function() {
    'use strict';

    const BRIDGE_ID = 'safecode-' + Math.random().toString(36).substr(2, 9);
    let authState = { authenticated: false, user: null, sessionId: null };
    let assetsSnapshot = null;
    let authRequestId = 0;
    const pendingAuthRequests = new Map();

    // =============================
    // 1. AUTH STATE MANAGEMENT
    // =============================
    
    /**
     * Request auth state from parent window
     */
    function requestAuthFromParent() {
        authRequestId++;
        const requestId = authRequestId;
        
        return new Promise((resolve) => {
            // Set timeout for parent response (5 seconds)
            const timeout = setTimeout(() => {
                pendingAuthRequests.delete(requestId);
                console.warn('[SafeCode Bridge] Auth request timeout, using cached state:', authState);
                resolve(authState);
            }, 5000);

            pendingAuthRequests.set(requestId, { resolve, timeout });

            if (window.parent !== window) {
                window.parent.postMessage({
                    type: 'AUTH_REQUEST',
                    requestId: requestId,
                    source: 'safecode-iframe'
                }, '*');
                console.log('[SafeCode Bridge] Requested AUTH_REQUEST from parent (ID:', requestId + ')');
            } else {
                clearTimeout(timeout);
                pendingAuthRequests.delete(requestId);
                console.warn('[SafeCode Bridge] Not in iframe, auth will fail');
                resolve({ authenticated: false, user: null });
            }
        });
    }

    /**
     * Handle auth response from parent
     */
    function handleAuthResponse(data) {
        const requestId = data.requestId;
        const pending = pendingAuthRequests.get(requestId);

        if (!pending) {
            console.warn('[SafeCode Bridge] Unexpected AUTH_RESPONSE for unknown requestId:', requestId);
            return;
        }

        clearTimeout(pending.timeout);
        pendingAuthRequests.delete(requestId);

        const newAuthState = {
            authenticated: !!data.authenticated,
            user: data.user || null,
            sessionId: data.sessionId || null,
            userId: data.userId || (data.user?.id)
        };

        authState = newAuthState;
        console.log('[SafeCode Bridge] Auth state updated:', { authenticated: authState.authenticated, userId: authState.userId });
        
        // Store in local cache for offline access
        try {
            localStorage.setItem('safecode_auth_state', JSON.stringify(authState));
        } catch (e) {
            console.warn('[SafeCode Bridge] Could not cache auth state:', e.message);
        }

        pending.resolve(authState);
        
        // Notify listeners of auth change
        window.dispatchEvent(new CustomEvent('safecode:auth-updated', { detail: authState }));
    }

    /**
     * Periodic auth refresh (every 30 seconds)
     */
    function startAuthRefreshLoop() {
        setInterval(() => {
            if (window.parent !== window) {
                requestAuthFromParent().catch(err => {
                    console.error('[SafeCode Bridge] Auth refresh failed:', err);
                });
            }
        }, 30000);
    }

    // =============================
    // 2. ASSETS SNAPSHOT HANDLING
    // =============================

    /**
     * Request assets snapshot from parent
     */
    function requestAssetsFromParent() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.warn('[SafeCode Bridge] Assets request timeout');
                resolve(assetsSnapshot || { codes: [], silver: [], gold: [] });
            }, 5000);

            const messageId = 'assets-' + Date.now();
            
            const handler = (event) => {
                if (event.data.type === 'assetbus:snapshot' && event.data.messageId === messageId) {
                    clearTimeout(timeout);
                    window.removeEventListener('message', handler);
                    assetsSnapshot = event.data.data || {};
                    console.log('[SafeCode Bridge] Assets snapshot received:', assetsSnapshot);
                    
                    // Store in localStorage
                    try {
                        localStorage.setItem('safecode_assets_snapshot', JSON.stringify(assetsSnapshot));
                    } catch (e) {
                        console.warn('[SafeCode Bridge] Could not cache assets:', e.message);
                    }
                    
                    // Notify listeners
                    window.dispatchEvent(new CustomEvent('safecode:assets-updated', { detail: assetsSnapshot }));
                    resolve(assetsSnapshot);
                }
            };

            window.addEventListener('message', handler);

            if (window.parent !== window) {
                window.parent.postMessage({
                    type: 'bridge:request-assets',
                    messageId: messageId,
                    source: 'safecode-iframe'
                }, '*');
                console.log('[SafeCode Bridge] Requested assets snapshot from parent');
            } else {
                clearTimeout(timeout);
                resolve(assetsSnapshot || { codes: [], silver: [], gold: [] });
            }
        });
    }

    // =============================
    // 3. WINDOW MESSAGE HANDLER
    // =============================

    window.addEventListener('message', (event) => {
        try {
            const data = event.data;
            if (!data || typeof data !== 'object') return;

            // Handle AUTH_RESPONSE
            if (data.type === 'AUTH_RESPONSE' && data.requestId) {
                handleAuthResponse(data);
            }

            // Handle assetbus:snapshot (direct update)
            if (data.type === 'assetbus:snapshot' && data.data) {
                assetsSnapshot = data.data;
                try {
                    localStorage.setItem('safecode_assets_snapshot', JSON.stringify(assetsSnapshot));
                } catch (e) {
                    console.warn('[SafeCode Bridge] Could not cache assets:', e.message);
                }
                window.dispatchEvent(new CustomEvent('safecode:assets-updated', { detail: assetsSnapshot }));
                console.log('[SafeCode Bridge] Received unsolicited assets update');
            }

            // Handle AUTH_REFRESH from parent
            if (data.type === 'AUTH_REFRESH') {
                requestAuthFromParent().catch(err => {
                    console.error('[SafeCode Bridge] Forced refresh failed:', err);
                });
            }

        } catch (err) {
            console.error('[SafeCode Bridge] Message handler error:', err);
        }
    });

    // =============================
    // 4. INITIALIZATION
    // =============================

    function initialize() {
        console.log('[SafeCode Bridge] Initializing...');

        // Try to restore cached state
        try {
            const cachedAuth = localStorage.getItem('safecode_auth_state');
            if (cachedAuth) {
                authState = JSON.parse(cachedAuth);
                console.log('[SafeCode Bridge] Restored cached auth state');
            }

            const cachedAssets = localStorage.getItem('safecode_assets_snapshot');
            if (cachedAssets) {
                assetsSnapshot = JSON.parse(cachedAssets);
                console.log('[SafeCode Bridge] Restored cached assets snapshot');
            }
        } catch (e) {
            console.warn('[SafeCode Bridge] Could not restore cached state:', e.message);
        }

        // Expose API to global scope
        window.SafeCodeBridge = {
            getAuthState: () => authState,
            getAssets: () => assetsSnapshot,
            requestAuth: requestAuthFromParent,
            requestAssets: requestAssetsFromParent,
            onAuthUpdate: (callback) => {
                window.addEventListener('safecode:auth-updated', (e) => callback(e.detail));
            },
            onAssetsUpdate: (callback) => {
                window.addEventListener('safecode:assets-updated', (e) => callback(e.detail));
            }
        };

        console.log('[SafeCode Bridge] Exposed SafeCodeBridge API');

        // Initial requests
        Promise.all([
            requestAuthFromParent(),
            requestAssetsFromParent()
        ]).then(() => {
            console.log('[SafeCode Bridge] Initial auth and assets loaded');
            window.dispatchEvent(new CustomEvent('safecode:bridge-ready', { detail: { auth: authState, assets: assetsSnapshot } }));
        }).catch(err => {
            console.error('[SafeCode Bridge] Initial load failed:', err);
        });

        // Start periodic auth refresh
        startAuthRefreshLoop();

        // Signal parent that bridge is ready
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'safecode:bridge-ready',
                source: 'safecode-iframe',
                bridgeId: BRIDGE_ID
            }, '*');
            console.log('[SafeCode Bridge] Signaled parent that bridge is ready');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
