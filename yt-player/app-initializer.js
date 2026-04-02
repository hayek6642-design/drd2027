// UV: SAFE-UI-UNIFY-2026-02-15
/**
 * Application Initializer - Orchestrates all components in correct order
 * Ensures proper loading sequence: DOM → Utils → API → Player → UI → Features
 * Freeze-Guard Compatible - Production Safe
 */

class AppInitializer {
    constructor() {
        this.initialized = false;
        this.components = new Map();
        this.initStartTime = Date.now();
        this.loadingOverlay = null;
        this.flags = { threeWayToggle: false, codeBankApp: false, loadingOverlay: false };
    }

    /**
     * Initialize the entire application
     */
  async initialize() {
        if (this.initialized) {
            console.warn('[App Initializer] Already initialized');
            return;
        }

        try {   
            console.log('[App Initializer] Starting application initialization...');

            window.__EXTRA_MODE_LOCKED__ = true;
            this.loadingOverlay = new ((window.Corsa && window.Corsa.CoRsALoadingOverlay) || window.CoRsALoadingOverlay)();
            this.flags.loadingOverlay = true;
            await this.loadingOverlay.showGate();
            this.loadingOverlay.updateProgress(5, 'تهيئة النظام');

            // Phase 1: DOM and Core Utils
            await this.initializeCore();
            this.loadingOverlay.updateProgress(15, 'DOM جاهز');
            await this.waitForStylesheets();
            this.loadingOverlay.updateProgress(25, 'CSS جاهز');

            // Phase 2: Authentication gate
            const authDetail = await new Promise((resolve) => {
                try {   
                    const h = (e) => { try {    window.removeEventListener('auth:ready', h); resolve(e && e.detail || { authenticated: false }); } catch(_) { resolve({ authenticated: false }) } };
                    window.addEventListener('auth:ready', h);
                } catch(_) { resolve({ authenticated: false }) }
            });
            const isAuthed = !!(authDetail && authDetail.authenticated);
            if (!isAuthed) {
                try {    this.loadingOverlay.updateProgress(100, 'جاهز'); } catch(_){}
                try {    await this.loadingOverlay.hide(); } catch(_){}
                window.__EXTRA_MODE_LOCKED__ = false;
                this.initialized = true;
                console.log('[App Initializer] Unauthenticated — UI unlocked for login');
                return;
            }

            // Phase 3: YouTube API and Player (only after auth)
            await this.initializePlayer();
            if (window.YouTubeAPIManager && window.YouTubeAPIManager.waitForPlayerReady) {
                await window.YouTubeAPIManager.waitForPlayerReady();
            }
            this.loadingOverlay.updateProgress(45, 'المشغّل جاهز');

            // Phase 4: UI Components
            await this.initializeUI();
            this.loadingOverlay.updateProgress(55, 'واجهة المستخدم جاهزة');

            // Phase 5: Features and Sections
            await this.initializeFeatures();
            await this.waitForFlag(() => window.__SWITCHES_READY__ === true, 'المفاتيح جاهزة');
            this.loadingOverlay.updateProgress(70, 'المفاتيح جاهزة');

            // Phase 6: Final Setup
            await this.finalizeSetup();
            await this.waitForFlag(() => window.__COUNTER_READY__ === true, 'العداد جاهز');
            this.loadingOverlay.updateProgress(85, 'العداد جاهز');

            const backendOk = await window.SystemProtection.verifyBackendReachable();
            if (!backendOk) {
                window.SystemProtection.activateOffline('تعذر الاتصال بالخادم', 'يرجى إعادة الاتصال للمتابعة');
                return;
            }
            this.loadingOverlay.updateProgress(100, 'جاهز');
            await this.loadingOverlay.hide();
            window.__EXTRA_MODE_LOCKED__ = false;

            this.initialized = true;
            const initTime = Date.now() - this.initStartTime;
            console.log(`[App Initializer] Application initialized successfully in ${initTime}ms`);

        } catch (error) {
            console.error('[App Initializer] Initialization failed:', error);
            this.showInitError(error);
            throw error;
        }
    }

    /**
     * Phase 1: Initialize core DOM utilities
     */
    async initializeCore() {
        console.log('[App Initializer] Phase 1: Initializing core utilities...');

        // Wait for DOM to be ready
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });

        // Initialize DOM utilities
        if (window.DOMUtils) {
            console.log('[App Initializer] DOM utilities already loaded');
        } else {
            console.error('[App Initializer] DOM utilities not found');
            throw new Error('DOM utilities not available');
        }

        console.log('[App Initializer] Core utilities initialized');
    }

    /**
     * Phase 2: Initialize YouTube API and Player
     */
    async initializePlayer() {
        console.log('[App Initializer] Phase 2: Initializing YouTube player...');

        // Load YouTube API
        if (window.YouTubeAPIManager) {
            await window.YouTubeAPIManager.loadAPI();

            // Create player
            const player = await window.YouTubeAPIManager.createPlayer('video-container', 'PLD60YBjiIjQPryp_T2IdNm9fukceO8AtN');
            this.components.set('player', player);

            console.log('[App Initializer] YouTube player initialized');
        } else {
            throw new Error('YouTube API Manager not available');
        }
    }

    /**
     * Phase 3: Initialize UI Components
     */
    async initializeUI() {
        console.log('[App Initializer] Phase 3: Initializing UI components...');

        // Initialize touch overlay blocker
        if (window.TouchOverlayBlocker) {
            await window.TouchOverlayBlocker.initialize();
            await window.TouchOverlayBlocker.activate();
            console.log('[App Initializer] Touch overlay blocker initialized');
        }

        // Initialize code display click dim toggle
        this.initializeCodeDisplayDimToggle();

        // Initialize counter hover reveal
        this.initializeCounterHoverReveal();

        console.log('[App Initializer] UI components initialized');
    }

    /**
     * Phase 4: Initialize Features and Sections
     */
    async initializeFeatures() {
        console.log('[App Initializer] Phase 4: Initializing features...');

        // Initialize section manager
        if (window.SectionManager) {
            await window.SectionManager.initialize();
            console.log('[App Initializer] Section manager initialized');
        }

        // Initialize extra mode system
        if (window.ExtraMode && window.ExtraMode.initialize) {
            window.ExtraMode.initialize();
            console.log('[App Initializer] Extra mode system initialized');
        }

        // Initialize 3-way toggle
        if (!this.flags.threeWayToggle && window.initThreeWayToggle) {
            window.initThreeWayToggle();
            this.flags.threeWayToggle = true;
            console.log('[App Initializer] 3-way toggle initialized');
        }

        // Initialize sound button
        this.initializeSoundButton();

        // Initialize play/pause button
        this.initializePlayPauseButton();

        this.initializeCodeBankApp();
        console.log('[App Initializer] Features initialized');
    }

    /**
     * Phase 5: Final setup and event bindings
     */
    async finalizeSetup() {
        console.log('[App Initializer] Phase 5: Finalizing setup...');

        // Set up global event listeners
        this.setupGlobalEventListeners();

        // Initialize session data
        await this.initializeSessionData();

        // Start counters and timers
        this.startApplicationTimers();

        // Set up error handling
        this.setupErrorHandling();

        console.log('[App Initializer] Setup finalized');
    }

    initializeCodeBankApp() {
        if (this.flags.codeBankApp) return;
        try {   
            if (!window.__CODEBANK_APP_INIT__) {
                window.__CODEBANK_APP_INIT__ = true;
                window.codeBankApp = new CodeBankApp();
            }
            this.flags.codeBankApp = true;
            console.log('[App Initializer] CodeBankApp initialized');
        } catch (e) {
            console.warn('[App Initializer] CodeBankApp init skipped:', e && e.message);
        }
    }
    

    /**
     * Initialize code display click-based dim toggle
     */
    initializeCodeDisplayDimToggle() {
        const codeDisplay = window.DOMUtils.safeGetElement('code-display');
        const videoContainer = window.DOMUtils.safeGetElement('video-container');
        if (!codeDisplay || !videoContainer) return;

        const applyDimState = (state) => {
            videoContainer.classList.remove('dim-50', 'dim-100');
            if (state === 1) {
                videoContainer.classList.add('dim-50');
            } else if (state === 2) {
                videoContainer.classList.add('dim-100');
            }
        };

        // Click cycle: 0→1→2→1→0 and repeat
        let cycle = [1, 2, 1, 0];
        let idx = -1; // start before first
        codeDisplay.addEventListener('click', () => {
            idx = (idx + 1) % cycle.length;
            const state = cycle[idx];
            applyDimState(state);
        });
    }

    /**
     * Initialize counter hover reveal
     */
    initializeCounterHoverReveal() {
        const codeDisplay = window.DOMUtils.safeGetElement('code-display');
        if (!codeDisplay) return;

        let hoverStartX = null;
        let revealTriggered = false;

        const resetHoverTracking = () => {
            hoverStartX = null;
            revealTriggered = false;
        };

        codeDisplay.addEventListener('mouseenter', resetHoverTracking);

        codeDisplay.addEventListener('mousemove', (event) => {
            if (revealTriggered) return;

            if (hoverStartX === null) {
                hoverStartX = event.offsetX;
                return;
            }

            const elementWidth = codeDisplay.clientWidth || 1;
            const startedOnLeft = hoverStartX <= elementWidth * 0.25;
            const reachedRightEdge = event.offsetX >= elementWidth * 0.75;

            if (startedOnLeft && reachedRightEdge) {
                revealTriggered = true;
                this.showCounterTemporarily();
            }
        });

        codeDisplay.addEventListener('mouseleave', resetHoverTracking);
    }

    /**
     * Initialize sound button
     */
    initializeSoundButton() {
        const soundButton = window.DOMUtils.safeGetElement('sound-button');
        if (!soundButton) return;

        let longPressTimer;
        let isLongPress = false;

        // Normal click behavior
        soundButton.addEventListener('click', (e) => {
            if (isLongPress) {
                isLongPress = false;
                return;
            }

            const player = window.YouTubeAPIManager?.getPlayer();
            if (player) {
                if (player.isMuted()) {
                    player.unMute();
                    soundButton.textContent = '🔊';
                } else {
                    player.mute();
                    soundButton.textContent = '🔇';
                }
            }
        });

        // Long press for azan clock
        const startLongPress = (e) => {
            isLongPress = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                this.showAzanClockPopup();
            }, 1000);
        };

        const cancelLongPress = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        soundButton.addEventListener('mousedown', startLongPress);
        soundButton.addEventListener('mouseup', cancelLongPress);
        soundButton.addEventListener('mouseleave', cancelLongPress);

        soundButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startLongPress(e);
        }, { passive: false });

        soundButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            cancelLongPress();
        });

        soundButton.addEventListener('touchcancel', cancelLongPress);
    }

    /**
     * Initialize play/pause button
     */
    initializePlayPauseButton() {
        const playPauseButton = window.DOMUtils.safeGetElement('play-pause-button');
        if (!playPauseButton) return;

        let longPressTimer = null;
        const LONG_PRESS_MS = 700;

        const startLongPress = () => {
            clearTimeout(longPressTimer);
            longPressTimer = setTimeout(() => {
                try {   
                    if (typeof window.showCodeBankPanel === 'function') {
                        window.showCodeBankPanel();
                        try {    window.CodeBankSidePanel && window.CodeBankSidePanel.switchTab && window.CodeBankSidePanel.switchTab('assets'); } catch(_){}
                    }
                    try {    window.dispatchEvent(new CustomEvent('section:changed', { detail: { section: 'assets' } })); } catch(_){}
                    try {    if (window.fixAssetsAndSafeCode) window.fixAssetsAndSafeCode(); } catch(_){}
                } catch(_){}
            }, LONG_PRESS_MS);
        };

        const cancelLongPress = () => { clearTimeout(longPressTimer); longPressTimer = null; };

        playPauseButton.addEventListener('mousedown', startLongPress);
        playPauseButton.addEventListener('mouseup', cancelLongPress);
        playPauseButton.addEventListener('mouseleave', cancelLongPress);
        playPauseButton.addEventListener('touchstart', (e) => { e.preventDefault(); startLongPress(); }, { passive: false });
        playPauseButton.addEventListener('touchend', (e) => { e.preventDefault(); cancelLongPress(); });
        playPauseButton.addEventListener('touchcancel', cancelLongPress);
    }

    /**
     * Show alternative dashboard (stock market)
     */
    showAlternativeDashboard() {
        try {   
            const overlay = window.DOMUtils.safeGetElement('code-popup-overlay');
            const iframe = window.DOMUtils.safeGetElement('code-popup-iframe');

            if (!overlay || !iframe) {
                console.error('Code popup elements not found');
                return;
            }

            overlay.classList.add('open');
            overlay.style.display = 'flex';
            iframe.src = '/services/yt-clear/codebank/indexCB.html';

        } catch (error) {
            console.error('Error opening CodeBank dashboard:', error);
        }
    }

    /**
     * Show counter temporarily
     */
    showCounterTemporarily(duration = 10000) {
        const counter = window.DOMUtils.safeGetElement('counter');
        if (counter) {
            window.DOMUtils.safeRemoveClass('counter', 'hidden');

            if (this.counterRevealTimeout) {
                clearTimeout(this.counterRevealTimeout);
            }

            this.counterRevealTimeout = setTimeout(() => {
                window.DOMUtils.safeAddClass('counter', 'hidden');
            }, duration);
        }
    }

    /**
     * Show azan clock popup
     */
    showAzanClockPopup() {
        try {   
            const url = '/services/yt-clear/azan-clock.html';
            const w = window.open(url, 'azanClock', 'width=600,height=700,resizable=yes');
            if (w) w.focus();
        } catch(_) {}
    }

    /**
     * Set up global event listeners
     */
    setupGlobalEventListeners() {
        // Visibility change for counter pause/resume
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                if (window.pauseCounter) window.pauseCounter();
            } else {
                if (window.startCounter) window.startCounter();
            }
        });

        // Online/offline handling
        window.addEventListener('online', () => {
            console.log('Browser is online');
            if (window.startCounter) window.startCounter();
            if (window.SystemProtection?.isProtectionActive()) {
                window.SystemProtection.deactivate();
            }
        });

        window.addEventListener('offline', () => {
            console.log('Browser is offline');
            if (window.pauseCounter) window.pauseCounter();
        });

        // Popup close handlers
        const popupClose = window.DOMUtils.safeGetElement('popup-close');
        if (popupClose) {
            window.DOMUtils.safeAddEventListener('popup-close', 'click', () => {
                const overlay = window.DOMUtils.safeGetElement('popup-overlay');
                const iframe = window.DOMUtils.safeGetElement('popup-iframe');
                if (overlay) { overlay.classList.remove('open'); overlay.style.display = 'none'; }
                if (iframe) iframe.src = '';
                const shield = document.getElementById('global-touch-shield');
                if (shield) shield.style.display = 'block';
                window.shieldDisabled = false;
            });
        }

        const codePopupClose = window.DOMUtils.safeGetElement('code-popup-close');
        if (codePopupClose) {
            window.DOMUtils.safeAddEventListener('code-popup-close', 'click', () => {
                const overlay = window.DOMUtils.safeGetElement('code-popup-overlay');
                const iframe = window.DOMUtils.safeGetElement('code-popup-iframe');
                if (overlay) overlay.style.display = 'none';
                if (iframe) iframe.src = '';
            });
        }
    }

    async waitForStylesheets() {
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        if (links.length === 0) return;
        await Promise.all(links.map(link => new Promise(resolve => {
            if (link.sheet) return resolve();
            link.addEventListener('load', resolve, { once: true });
            link.addEventListener('error', resolve, { once: true });
        })));
    }

    async waitForFlag(predicate) {
        return new Promise(resolve => {
            const check = () => {
                try {   
                    if (predicate()) {
                        resolve();
                        return;
                    }
                } catch (_) {}
                setTimeout(check, 50);
            };
            check();
        });
    }

    /**
     * Initialize session data
     */
    async initializeSessionData() {
        // Load saved watch time and code
        if (window.AuthSyncManager && window.AuthSyncManager.isInitialized) {
            try {   
                const savedWatchTime = window.AuthSyncManager.getUserData('watchTime');
                const watchTime = window.sanitizeWatchTime ? window.sanitizeWatchTime(savedWatchTime) : 0;

                const savedCode = window.AuthSyncManager.getUserData('uniqueCode');
                if (savedCode) {
                    window.DOMUtils.safeSetText('code-display', savedCode);
                }

                // Update counter display
                this.updateCounterDisplay(watchTime);

            } catch (error) {
                console.warn('[App Initializer] Error loading session data:', error);
            }
        }
    }

    /**
     * Start application timers
     */
    startApplicationTimers() {
        // Start watch time counter
        if (window.startCounter) {
            window.startCounter();
        }

        // Start periodic cleanup
        setInterval(() => {
            if (window.cleanupOldData) {
                window.cleanupOldData();
            }
        }, 86400000); // Daily cleanup
    }

    /**
     * Set up error handling
     */
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('[App Initializer] Global error:', event.error);
            // Don't show to user unless critical
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('[App Initializer] Unhandled promise rejection:', event.reason);
            event.preventDefault(); // Prevent default browser handling
        });
    }

    /**
     * Update counter display
     */
    updateCounterDisplay(watchTime) {
        const counter = window.DOMUtils.safeGetElement('counter');
        if (counter && window.formatTime) {
            const time = window.formatTime(watchTime);
            const digits = time.split('').map(digit => `
                <span>
                    ${digit}
                    <span class="shine"></span>
                </span>
            `).join('');
            counter.innerHTML = digits;
        }
    }

    /**
     * Show initialization error
     */
    showInitError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff4444;
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            text-align: center;
            max-width: 400px;
        `;
        errorDiv.innerHTML = `
            <h3>Application Initialization Failed</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: white; color: #ff4444; border: none; border-radius: 5px; cursor: pointer;">Reload Page</button>
        `;
        document.body.appendChild(errorDiv);
    }

    /**
     * Check if application is initialized
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Get initialization time
     */
    getInitTime() {
        return this.initialized ? Date.now() - this.initStartTime : 0;
    }
}

// Create singleton instance
const appInitializer = new AppInitializer();

// Export globally
window.AppInitializer = appInitializer;

// Auto-initialize when all scripts are loaded
if (window.DOMUtils) {
    window.DOMUtils.onDOMReady(() => {
        appInitializer.initialize().catch(error => {
            console.error('[App Initializer] Auto-initialization failed:', error);
        });
    });
}

// Export for ES modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = appInitializer;
}
