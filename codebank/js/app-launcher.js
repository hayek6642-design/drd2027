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

// Recursive function to try URLs until one works
function tryOpenService(app, fallbackIndex = 0) {
    // 🚀 PHASE 4: Single Instance Policy
    if (State.openedApps.has(app.id)) {
        console.log("⚠️ App already open, focusing:", app.id);
        const modal = document.getElementById('service-modal');
        if (modal) modal.classList.add('active');
        return;
    }

    const urls = [app.url, ...(app.fallbackUrls || [])];
    
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
        }, 8000);
        
        // Set the source to load the service
        modalIframe.src = url;
    } else {
        // Fallback: open in new window
        window.open(url, app.name, 'width=800,height=600');
    }
}

// Initialize the launcher UI
export function initLauncher() {
    console.log('[AppLauncher] Initializing...');
    
    // Categories and their container IDs
    const categories = {
        core: 'core-apps',
        media: 'media-apps',
        finance: 'finance-apps',
        games: 'games-apps',
        tools: 'tools-apps'
    };

    // Render each category
    Object.entries(categories).forEach(([category, containerId]) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Clear container
        container.innerHTML = '';

        // Get apps for this category
        const apps = AppRegistry[category] || [];
        
        apps.forEach(app => {
            const card = document.createElement('div');
            card.className = 'app-card';
            card.setAttribute('data-id', app.id);
            
            // Icon wrapper
            const iconWrapper = document.createElement('div');
            iconWrapper.className = 'app-icon-wrapper';
            if (app.color) iconWrapper.style.color = app.color;
            
            const icon = document.createElement('i');
            // Ensure font-awesome classes are correct
            const iconClass = app.icon.startsWith('fa-') ? `fas ${app.icon}` : app.icon;
            icon.className = iconClass;
            
            iconWrapper.appendChild(icon);
            
            // App name
            const name = document.createElement('span');
            name.className = 'text-xs font-semibold text-gray-300 text-center';
            name.textContent = app.name;
            
            // Badge (if exists)
            if (app.badge) {
                const badge = document.createElement('div');
                badge.className = 'absolute -top-1 -right-1 bg-blue-600 text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold';
                badge.textContent = app.badge;
                iconWrapper.style.position = 'relative';
                iconWrapper.appendChild(badge);
            }
            
            card.appendChild(iconWrapper);
            card.appendChild(name);
            
            // Click handler
            card.addEventListener('click', () => tryOpenService(app, 0));
            
            container.appendChild(card);
        });
    });

    // Set up modal controls if not already done
    setupModalControls();
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
            
            // Phase 1: Proper Iframe Destruction
            if (iframe) {
                console.log('[AppLauncher] Destroying iframe for GC');
                
                // 🚀 PHASE 4: Remove from tracked apps
                if (State.currentApp) {
                    State.openedApps.delete(State.currentApp.id);
                }

                try {
                    // Send destroy signal
                    if (iframe.contentWindow) {
                        iframe.contentWindow.postMessage({ type: 'service:destroy' }, "*");
                    }
                    iframe.src = 'about:blank';
                    
                    // Remove from DOM and re-add fresh one
                    const container = iframe.parentNode;
                    if (container) {
                        const newIframe = document.createElement('iframe');
                        newIframe.id = 'service-modal-iframe';
                        newIframe.sandbox = iframe.sandbox;
                        container.replaceChild(newIframe, iframe);
                    }
                } catch (e) {
                    iframe.src = 'about:blank';
                }
            }
            
            State.isAppOpen = false;
            State.currentApp = null;
            
            // Trigger GC hint
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

