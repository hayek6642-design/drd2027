/**
 * service-loader.js
 * Uses an <iframe> for service rendering (proper CSS isolation for full HTML pages).
 * Services access AppState via window.parent.AppState directly — no bridge needed.
 * No postMessage. No retry loops.
 */
(function(window) {
    'use strict';

    window.ServiceLoader = {
        _iframe: null,
        _currentUrl: null,

        init(containerEl) {
            // Create or reuse iframe inside the container
            // Check for service-modal-iframe first (from indexCB.html), then service-iframe (fallback)
            let iframe = containerEl.querySelector('iframe#service-modal-iframe') || containerEl.querySelector('iframe#service-iframe');
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.id = 'service-modal-iframe';
                iframe.style.cssText =
                    'width:100%;height:100%;border:none;display:block;' +
                    'background:#0f172a;';
                iframe.setAttribute('allow', 'autoplay; clipboard-write; fullscreen');
                iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation');
                containerEl.innerHTML = '';
                containerEl.appendChild(iframe);
            }
            this._iframe = iframe;
        },

        async mount(serviceUrl, title) {
            if (!this._iframe) {
                console.warn('[ServiceLoader] Not initialized — call init() first');
                return;
            }
            if (this._currentUrl === serviceUrl) return;
            this._currentUrl = serviceUrl;

            console.log('[ServiceLoader] Loading service into iframe:', serviceUrl);

            return new Promise((resolve) => {
                this._iframe.onload = () => {
                    // Expose AppState/EventBus/AuthManager to service via parent reference
                    try {
                        const iwin = this._iframe.contentWindow;
                        if (iwin && !iwin.AppState) {
                            iwin.AppState    = window.AppState;
                            iwin.EventBus   = window.EventBus;
                            iwin.AuthManager = window.AuthManager;
                        }
                        
                        // 🔧 FIX: Directly inject window.Auth so services can access auth synchronously
                        // This ensures automode.js apiCall can call window.Auth.getToken() immediately
                        if (iwin && window.AuthManager) {
                            try {
                                const authState = window.AuthManager.getState ? window.AuthManager.getState() : {};
                                const sessionToken = authState.sessionToken || '';
                                const userData = authState.user || {};
                                const isAuthenticated = !!(userData.id || userData.uid || userData.email);
                                
                                iwin.Auth = {
                                    isAuthenticated: () => isAuthenticated,
                                    getToken: () => sessionToken,
                                    getUser: () => userData,
                                    getState: () => authState
                                };
                            } catch (e) {
                                console.warn('[ServiceLoader] Failed to inject Auth:', e.message);
                            }
                        }
                    } catch(e) { /* cross-origin guard */ }
                    window.EventBus && window.EventBus.dispatch('service:ready', { name: title, url: serviceUrl });
                    resolve();
                };
                this._iframe.onerror = () => { resolve(); };
                this._iframe.src = serviceUrl;
            });
        },

        unmount() {
            if (this._iframe) {
                this._iframe.src = 'about:blank';
                this._iframe.onload = null;
            }
            this._currentUrl = null;
        }
    };

    console.log('[ServiceLoader] Initialized (iframe mode). Services share AppState via window.parent.');

})(window);
