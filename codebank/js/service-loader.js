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
            let iframe = containerEl.querySelector('iframe#service-iframe');
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.id = 'service-iframe';
                iframe.style.cssText =
                    'width:100%;height:100%;border:none;display:block;' +
                    'background:#0f172a;';
                iframe.setAttribute('allow', 'autoplay; clipboard-write; fullscreen');
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
