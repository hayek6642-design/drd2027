/**
 * service-loader.js
 * Replaces iframe mounting with direct div injection.
 * Services render into container divs, reading from window.AppState directly.
 * No postMessage. No bridge initialization. No retry loops.
 */
(function(window) {
    'use strict';

    const BRIDGE_PATTERNS = [
        'bankode-assetbus-bridge',
        'auth-bridge',
        'safe-code-bridge',
        'iframe-auth-client',
        'local-asset-bus'
    ];

    function isBridgeScript(src, content) {
        return BRIDGE_PATTERNS.some(p => (src && src.includes(p)) || (content && content.includes(p + '.js')));
    }

    window.ServiceLoader = {
        _container: null,
        _currentUrl: null,
        _injectedStyleUrls: new Set(),
        _injectedScriptUrls: new Set(),

        init(containerEl) {
            this._container = containerEl;
        },

        async mount(serviceUrl, title) {
            if (this._currentUrl === serviceUrl) return;
            this.unmount();
            this._currentUrl = serviceUrl;

            console.log('[ServiceLoader] Mounting:', serviceUrl);
            window.EventBus.dispatch('service:loading', { url: serviceUrl, title });

            try {
                const html = await fetch(serviceUrl, { credentials: 'include' }).then(r => {
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.text();
                });
                await this._inject(html, serviceUrl);
                window.EventBus.dispatch('service:ready', { name: title, url: serviceUrl });
                console.log('[ServiceLoader] Mounted:', serviceUrl);
            } catch(err) {
                console.error('[ServiceLoader] Mount failed:', err);
                if (this._container) {
                    this._container.innerHTML =
                        '<div style="color:#f87171;padding:40px;text-align:center;">' +
                        'Failed to load service.<br><small>' + err.message + '</small></div>';
                }
                window.EventBus.dispatch('service:error', { url: serviceUrl, error: err.message });
            }
        },

        unmount() {
            if (this._container) this._container.innerHTML = '';
            this._currentUrl = null;
        },

        async _inject(html, baseUrl) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const wrapper = document.createElement('div');
            wrapper.className = 'service-injected-wrapper';
            wrapper.setAttribute('data-service', baseUrl);
            wrapper.style.cssText = 'width:100%;min-height:100%;background:#0f172a;position:relative;';

            // Inject <style> blocks
            doc.querySelectorAll('style').forEach(style => {
                const s = document.createElement('style');
                s.textContent = style.textContent;
                wrapper.appendChild(s);
            });

            // Inject external stylesheets
            doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                const href = link.getAttribute('href');
                if (!href) return;
                const resolved = new URL(href, baseUrl).href;
                if (!this._injectedStyleUrls.has(resolved)) {
                    const l = document.createElement('link');
                    l.rel = 'stylesheet'; l.href = resolved;
                    document.head.appendChild(l);
                    this._injectedStyleUrls.add(resolved);
                }
            });

            // Body content without scripts
            const body = document.createElement('div');
            body.innerHTML = doc.body.innerHTML;
            body.querySelectorAll('script').forEach(s => s.remove());
            wrapper.appendChild(body);

            this._container.innerHTML = '';
            this._container.appendChild(wrapper);

            // Execute scripts in order
            for (const script of [...doc.querySelectorAll('script')]) {
                await this._execScript(script, baseUrl);
            }
        },

        async _execScript(script, baseUrl) {
            const src     = script.getAttribute('src') || '';
            const content = script.textContent || '';
            const type    = script.getAttribute('type') || '';

            if (isBridgeScript(src, content)) {
                console.log('[ServiceLoader] Skipping bridge script:', src || '(inline bridge code)');
                return;
            }

            return new Promise(resolve => {
                const s = document.createElement('script');

                if (src) {
                    const resolved = src.startsWith('http') ? src : new URL(src, baseUrl).href;
                    if (this._injectedScriptUrls.has(resolved)) { resolve(); return; }
                    s.src = resolved;
                    this._injectedScriptUrls.add(resolved);
                    s.onload  = resolve;
                    s.onerror = () => { console.warn('[ServiceLoader] Script load failed:', resolved); resolve(); };
                } else {
                    // Patch out parent.postMessage calls — not needed without iframe
                    let code = content
                        .replace(/window\.parent\.postMessage\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/g, '/*[bridge-removed]*/')
                        .replace(/parent\.postMessage\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/g, '/*[bridge-removed]*/');
                    s.textContent = code;
                    setTimeout(resolve, 0);
                }

                if (type === 'module') s.type = 'module';
                document.head.appendChild(s);
            });
        }
    };

    console.log('[ServiceLoader] Initialized. Ready to inject services.');

})(window);
