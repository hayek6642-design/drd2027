import { AppRegistry } from './app-registry.js';

// State for the launcher
const State = {
    isAppOpen: false,
    currentApp: null,
    openedApps: new Map(), // 🚀 PHASE 4: PREVENT MULTIPLE IFRAMES
    stats: {
        codes: 0
    }
};

// ==========================================
// NATIVE PATH RESOLUTION (Capacitor Support)
// ==========================================
const NativePathResolver = (() => {
    const isNative = (() => {
        try {
            return window.Capacitor && window.Capacitor.isNativePlatform();
        } catch (_) { return false; }
    })();

    const serverUrl = 'https://drd2027.onrender.com';

    /**
     * Resolve a relative/absolute service URL for native platforms.
     * On web: paths like './safecode.html' or '/codebank/safecode.html' work as-is.
     * On native: relative paths must be converted to absolute URLs pointing to the server.
     */
    function resolveUrl(url) {
        if (!isNative) return url;
        if (!url) return url;

        // Already absolute URL
        if (url.startsWith('http://') || url.startsWith('https://')) return url;

        // Remove leading ./ for consistency
        let cleanPath = url.replace(/^\.\//, '');
        
        // Ensure leading slash
        if (!cleanPath.startsWith('/')) {
            cleanPath = '/codebank/' + cleanPath;
        }

        return serverUrl + cleanPath;
    }

    return { isNative, resolveUrl, serverUrl };
})();

// Recursive function to try URLs until one works
function tryOpenService(app, fallbackIndex = 0) {
    // 🚀 PHASE 4: Single Instance Policy
    if (State.openedApps.has(app.id)) {
        console.log("⚠️ App already open, focusing:", app.id);
        const modal = document.getElementById('service-modal');
        if (modal) modal.classList.add('active');
        
        // Set data attributes for auth bridge communication
        modalIframe.setAttribute('data-service', app.id);
        modalIframe.setAttribute('data-origin', window.location.origin);
        console.log('[CodeBank] Set iframe data:', { service: app.id, origin: window.location.origin });
        return;
    }

    // Resolve URLs for native platform
    const urls = [app.url, ...(app.fallbackUrls || [])].map(u => NativePathResolver.resolveUrl(u));
    
    if (fallbackIndex >= urls.length) {
        // All URLs failed
        console.error('[CodeBank] All URLs failed for', app.id, ':', urls);
        if (window.showToast) window.showToast(`Failed to open ${app.name}. Service not found.`, 'error', 5000);
        State.isAppOpen = false;
        State.currentApp = null;
        return;
    }
    
    const url = urls[fallbackIndex];
    console.log(`[CodeBank] Opening service:`, url);
    
    // Set current app state
    State.currentApp = app;
    State.isAppOpen = true;

    // Use the modal implementation from indexCB.html
    const modal = document.getElementById('service-modal');
    const modalIframe = document.getElementById('service-modal-iframe');
    const modalTitle = document.getElementById('service-modal-title');
    const modalLoading = document.getElementById('service-modal-loading');

    if (modal && modalIframe) {
        modal.classList.add('active');
        
        // Set data attributes for auth bridge communication
        modalIframe.setAttribute('data-service', app.id);
        modalIframe.setAttribute('data-origin', window.location.origin);
        console.log('[CodeBank] Set iframe data:', { service: app.id, origin: window.location.origin });
        if (modalTitle) modalTitle.textContent = app.name;
        modalLoading?.classList.remove('hidden');

        // Set up error detection
        let loadTimeout;
        
        const cleanup = () => {
            clearTimeout(loadTimeout);
            modalIframe.onerror = null;
            modalIframe.onload = null;
        };
        
        // Success handler
        modalIframe.onload = () => {
            cleanup();
            modalLoading?.classList.add('hidden');
            console.log('[CodeBank] Service opened successfully:', app.name);
            
            // 🚀 PHASE 4: Track opened app
            State.openedApps.set(app.id, modalIframe);
            
            // 🔧 FIX: Send auth + assets to service iframe after it loads
            setTimeout(() => {
                if (typeof window.sendInitToIframe === 'function') {
                    window.sendInitToIframe();
                }
            }, 400);
        };
        
        // Error handler
        modalIframe.onerror = () => {
            cleanup();
            console.error('[CodeBank] Iframe error for:', url);
            if (fallbackIndex + 1 < urls.length) {
                tryOpenService(app, fallbackIndex + 1);
            }
        };
        
        // Timeout handler
        loadTimeout = setTimeout(() => {
            cleanup();
            console.warn('[CodeBank] Load timeout for:', url);
            if (fallbackIndex + 1 < urls.length) {
                tryOpenService(app, fallbackIndex + 1);
            } else {
                modalLoading?.classList.add('hidden');
            }
        }, 30000); // Extended for Render.com cold start (was 8000ms)
        
        // On native platforms, adjust iframe sandbox to allow cross-origin loading
        if (NativePathResolver.isNative) {
            modalIframe.removeAttribute('sandbox');
            // Allow all necessary features for native WebView
            modalIframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; clipboard-write');
        }

        // Set the source to load the service
        modalIframe.src = url;
        
        // Notify iframe that auth system is ready
        setTimeout(() => {
            try {
                modalIframe.contentWindow.postMessage({ 
                    type: 'auth:ready',
                    service: app.id,
                    origin: window.location.origin
                }, window.location.origin);
                console.log('[CodeBank] Sent auth:ready to iframe');
            } catch(e) { 
                console.warn('[CodeBank] Could not notify iframe:', e);
            }
        }, 500);
    } else {
        // Fallback: open in new window
        window.open(url, app.name, 'width=800,height=600');
    }
}

// Initialize the launcher UI with organized categories
export function initLauncher() {
    console.log('[AppLauncher] Initializing...');

    const container = document.getElementById('all-apps');
    if (!container) return;
    container.innerHTML = '';

    // Category display order and labels
    const categoryOrder = [
        { key: 'core', label: '🔐 Core', color: '#10b981' },
        { key: 'tools', label: '🛠 Tools', color: '#06b6d4' },
        { key: 'media', label: '🎬 Media', color: '#8b5cf6' },
        { key: 'finance', label: '💰 Finance', color: '#f59e0b' },
        { key: 'games', label: '🎮 Games', color: '#ec4899' }
    ];

    // Create category sections
    categoryOrder.forEach(({ key, label, color }) => {
        const apps = AppRegistry[key] || [];
        if (apps.length === 0) return;

        // Create category header
        const header = document.createElement('div');
        header.style.cssText = `
            grid-column: 1 / -1;
            margin-top: 12px;
            margin-bottom: 4px;
            padding: 0 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        const headerText = document.createElement('h3');
        headerText.style.cssText = `
            font-size: 13px;
            font-weight: 600;
            color: rgba(255,255,255,0.7);
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        `;
        headerText.textContent = label;
        const headerLine = document.createElement('div');
        headerLine.style.cssText = `
            flex: 1;
            height: 1px;
            background: linear-gradient(90deg, ${color}44, transparent);
        `;
        header.appendChild(headerText);
        header.appendChild(headerLine);
        container.appendChild(header);

        // Create app tiles for this category
        apps.forEach(app => {
            const card = document.createElement('div');
            card.className = 'app-card app-launcher-icon';
            card.setAttribute('data-id', app.id);
            card.setAttribute('data-category', key);

            const tileColor = app.color || '#6366f1';

            // Icon wrapper — rounded square like iOS/Android
            const iconWrapper = document.createElement('div');
            iconWrapper.className = 'app-icon-wrapper';
            iconWrapper.style.cssText = `background: ${tileColor}22; border-radius: 18px; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;`;

            const icon = document.createElement('i');
            const iconClass = app.icon.startsWith('fa-') ? `fas ${app.icon}` : app.icon;
            icon.className = iconClass;
            icon.style.cssText = `color: ${tileColor}; font-size: 26px;`;

            iconWrapper.appendChild(icon);

            // App name
            const name = document.createElement('span');
            name.className = 'app-tile-name';
            name.textContent = app.name;

            // Badge (if exists)
            if (app.badge) {
                const badge = document.createElement('div');
                badge.className = 'app-tile-badge';
                badge.textContent = app.badge;
                badge.style.backgroundColor = tileColor;
                card.appendChild(badge);
            }

            card.appendChild(iconWrapper);
            card.appendChild(name);

            card.addEventListener('click', () => tryOpenService(app, 0));
            container.appendChild(card);
        });
    });

    // Set up modal controls if not already done
    setupModalControls();

    // 🌐 Notify translate.js that app tiles are rendered
    window.dispatchEvent(new CustomEvent('cb:apps-rendered'));
}

function setupModalControls() {
    const modal = document.getElementById('service-modal');
    const closeBtn = document.getElementById('service-modal-close');
    const backBtn = document.getElementById('service-modal-back');
    const reloadBtn = document.getElementById('service-modal-reload');
    const iframe = document.getElementById('service-modal-iframe');

    if (closeBtn && modal) {
        closeBtn.onclick = () => {
            modal.classList.remove('active');
            
            // 🔧 FIX: Reset iframe WITHOUT replacing DOM element
            // Replacing the element makes Consolidated Service Manager's reference stale
            if (iframe) {
                // 🚀 PHASE 4: Remove from tracked apps
                if (State.currentApp) {
                    State.openedApps.delete(State.currentApp.id);
                }

                try {
                    if (iframe.contentWindow) {
                        iframe.contentWindow.postMessage({ type: 'service:destroy' }, "*");
                    }
                } catch (e) {}
                
                // Reset src to blank — do NOT replace DOM element
                try { iframe.src = 'about:blank'; } catch(e) {}
            }
            
            State.isAppOpen = false;
            State.currentApp = null;
            
            if (window.gc) try { window.gc(); } catch(_) {}
        };
    }

    if (backBtn && modal) {
        backBtn.onclick = () => {
            if (closeBtn) closeBtn.click(); // Reuse cleanup logic
        };
    }

    if (reloadBtn && iframe) {
        reloadBtn.onclick = () => {
            const currentUrl = iframe.src;
            iframe.src = 'about:blank';
            setTimeout(() => { iframe.src = currentUrl; }, 100);
        };
    }
}

// Update launcher statistics
export function updateStats(stats) {
    if (!stats) return;
    
    if (typeof stats.codes === 'number') {
        State.stats.codes = stats.codes;
        
        // Update UI elements
        const headerCount = document.getElementById('header-codes-count');
        if (headerCount) headerCount.textContent = stats.codes;
        
        const missionCurrent = document.getElementById('mission-current-count');
        if (missionCurrent) missionCurrent.textContent = stats.codes;

        // Update mission progress bar
        const missionFill = document.getElementById('mission-progress-fill');
        const missionTarget = 1000; // Default target
        if (missionFill) {
            const percentage = Math.min(100, (stats.codes / missionTarget) * 100);
            missionFill.style.width = `${percentage}%`;
            
            // Update tier colors
            missionFill.className = 'progress-fill';
            if (percentage < 30) missionFill.classList.add('tier-grey');
            else if (percentage < 70) missionFill.classList.add('tier-green');
            else missionFill.classList.add('tier-silver');
        }
    }
}

