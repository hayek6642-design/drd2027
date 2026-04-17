/**
 * YT-New Runtime - Complete JavaScript Extraction
 * All JavaScript logic from yt-new.html migrated to this single file
 * No modularization, no refactoring - exact copy as requested
 */

// ===== CODEBANK SIDE PANEL (Lines 1398-2005) =====
(function () {
  try {
    window.addEventListener('auth:ready', function(e){
      try {
        var ok = !!(e && e.detail && e.detail.authenticated);
        if (ok && typeof window.initCodeBank === 'function') { window.initCodeBank(); }
      } catch(_){}
    });
  } catch(_){}
  class CodeBankSidePanel {
        constructor() {
            this.panel = null;
            this.isOpen = false;
            this.isInitialized = false;
            this.currentTab = 'overview';
            this.init();
        }

        async init() {
            // Prevent modal from showing after auth is ready


            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
            }

            this.createPanel();
            this.setupEventListeners();
            this.isInitialized = true;

            console.log('✅ CodeBank Side Panel initialized');
        }

        createPanel() {
            // Create panel container
            this.panel = document.createElement('div');
            this.panel.id = 'codebank-side-panel';
            this.panel.style.cssText = `
        position: fixed;
        top: 0;
        right: -100vw;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        backdrop-filter: blur(20px);
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: -10px 0 30px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        transition: right 0.3s ease;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      `;

            // Create panel header
            const header = document.createElement('div');
            header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
      `;

            header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #FF6B35, #8B5CF6);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
          ">🏦</div>
          <div>
            <h3 style="margin: 0; color: white; font-size: 18px; font-weight: 600;">CodeBank</h3>
            <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 12px;">Professional Banking</p>
          </div>
        </div>
        <button id="close-panel-btn" style="
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 24px;
          cursor: pointer;
          padding: 5px;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        ">✕</button>
      `;

            // Create tab navigation
            const tabNav = document.createElement('div');
            tabNav.style.cssText = `
        display: flex;
        padding: 0 20px;
        gap: 5px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.2);
      `;

            tabNav.innerHTML = `
        <button class="cb-tab-btn active" data-tab="overview">
          <i class="fas fa-chart-line"></i> Overview
        </button>
        <button class="cb-tab-btn" data-tab="eb3at">
          <i class="fas fa-paper-plane"></i> Eb3at
        </button>
        <button class="cb-tab-btn" data-tab="games">
          <i class="fas fa-gamepad"></i> Games
        </button>
        <button class="cb-tab-btn" data-tab="piston">
          <i class="fas fa-cog"></i> Piston
        </button>
        <button class="cb-tab-btn" data-tab="samma3ny">
          <i class="fas fa-music"></i> Samma3ny
        </button>
        <button class="cb-tab-btn" data-tab="farragna">
          <i class="fas fa-play-circle"></i> Farragna
        </button>
        <button class="cb-tab-btn" data-tab="nostalgia">
          <i class="fas fa-music"></i> Nostalgia
        </button>
        <button class="cb-tab-btn" data-tab="pebalaash">
          <i class="fas fa-gift"></i> Pebalaash
        </button>
        <button class="cb-tab-btn" data-tab="oneworld">
          <i class="fas fa-globe"></i> OneWorld
        </button>
        <button class="cb-tab-btn" data-tab="e7ki">
          <i class="fas fa-comments"></i> E7ki!
        </button>
        <button class="cb-tab-btn" data-tab="setta">
          <i class="fas fa-camera"></i> Setta X Tes3a
        </button>
        <button class="cb-tab-btn" data-tab="shots">
          <i class="fas fa-image"></i> Shots!
        </button>
        <button class="cb-tab-btn" data-tab="corsa">
          <i class="fas fa-brain"></i> CoRsA
        </button>
        <button class="cb-tab-btn" data-tab="rewards">
          <i class="fas fa-gift"></i> Rewards
        </button>
        <button class="cb-tab-btn" data-tab="challenges">
          <i class="fas fa-trophy"></i> Challenges
        </button>
        <button class="cb-tab-btn" data-tab="ads">
          <i class="fas fa-ad"></i> Ads & Earn
        </button>
        <button class="cb-tab-btn" data-tab="assets">
          <i class="fas fa-coins"></i> Assets
        </button>
      `;

            // Create content area
            const content = document.createElement('div');
            content.id = 'codebank-content';
            content.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      `;

            // Create reset button at bottom
            const resetSection = document.createElement('div');
            resetSection.style.cssText = `
        padding: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.2);
      `;

            resetSection.innerHTML = `
        <button id="reset-btn" style="
          width: 100%;
          background: linear-gradient(135deg, #dc3545, #c82333);
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        ">
          <i class="fas fa-trash-alt mr-2"></i>Reset Account
        </button>
      `;

            // Add tab button styles
            const tabStyle = document.createElement('style');
            tabStyle.textContent = `
        .cb-tab-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          padding: 10px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          min-width: 60px;
        }
        .cb-tab-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .cb-tab-btn.active {
          background: linear-gradient(135deg, #FF6B35, #8B5CF6);
          color: white;
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
        }
        .cb-tab-btn i {
          font-size: 14px;
        }
      `;
            document.head.appendChild(tabStyle);

            // Assemble panel
            this.panel.appendChild(header);
            this.panel.appendChild(tabNav);
            this.panel.appendChild(content);
            this.panel.appendChild(resetSection);
            document.body.appendChild(this.panel);

            // Setup tab switching
            this.setupTabNavigation();
        }

        setupEventListeners() {
            // Close button
            const closeBtn = this.panel.querySelector('#close-panel-btn');
            closeBtn.addEventListener('click', () => this.close());

            // Reset button
            const resetBtn = this.panel.querySelector('#reset-btn');
            resetBtn.addEventListener('click', () => this.handleReset());

            // Click outside to close
            document.addEventListener('click', (e) => {
                if (this.isOpen && !this.panel.contains(e.target)) {
                    this.close();
                }
            });

            // Escape key to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });
        }

        setupTabNavigation() {
            const tabBtns = this.panel.querySelectorAll('.cb-tab-btn');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tabName = btn.dataset.tab;
                    this.switchTab(tabName);
                });
            });
        }

        async switchTab(tabName) {
            // Update active tab button
            const tabBtns = this.panel.querySelectorAll('.cb-tab-btn');
            tabBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabName);
            });

            this.currentTab = tabName;

            // Load tab content
            const content = this.panel.querySelector('#codebank-content');
            content.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

            try {
                await this.loadTabContent(tabName);
            } catch (error) {
                console.error('Failed to load tab content:', error);
                content.innerHTML = '<div style="text-align: center; padding: 40px; color: #dc3545;">Failed to load content</div>';
            }
        }

        async loadTabContent(tabName) {
            const content = this.panel.querySelector('#codebank-content');

            // Simulate loading different tab content
            // In a real implementation, this would load the actual tab components
            switch (tabName) {
                case 'overview':
                    content.innerHTML = await this.loadOverviewTab();
                    break;
                case 'eb3at':
                    content.innerHTML = await this.loadEb3atTab();
                    break;
                case 'games':
                    content.innerHTML = await this.loadGamesTab();
                    break;
                case 'piston':
                    content.innerHTML = await this.loadPistonTab();
                    break;
                case 'samma3ny':
                    content.innerHTML = await this.loadSamma3nyTab();
                    break;
                case 'farragna':
                    content.innerHTML = await this.loadFarragnaTab();
                    break;
                case 'nostalgia':
                    content.innerHTML = await this.loadNostalgiaTab();
                    break;
                case 'pebalaash':
                    content.innerHTML = await this.loadPebalaashTab();
                    break;
                case 'oneworld':
                    content.innerHTML = await this.loadOneworldTab();
                    break;
                case 'e7ki':
                    content.innerHTML = await this.loadE7kiTab();
                    break;
                case 'setta':
                    content.innerHTML = await this.loadSettaTab();
                    break;
                case 'shots':
                    content.innerHTML = await this.loadShotsTab();
                    break;
                case 'corsa':
                    content.innerHTML = await this.loadCorsaTab();
                    break;
                case 'rewards':
                    content.innerHTML = await this.loadRewardsTab();
                    break;
                case 'challenges':
                    content.innerHTML = await this.loadChallengesTab();
                    break;
                case 'ads':
                    content.innerHTML = await this.loadAdsTab();
                    break;
                case 'assets':
                    content.innerHTML = await this.loadAssetsTab();
                    break;
                default:
                    content.innerHTML = '<div style="text-align: center; padding: 40px;">Tab not found</div>';
            }
        }

        async loadOverviewTab() {
            // Auth removed: mirror-only
            const user = null;
            const jwt = null;

            return `
        <div style="color: white;">
          <h4 style="margin-bottom: 20px; color: #FF6B35;">Your Assets</h4>
          <div style="display: grid; gap: 15px;">
            <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <i class="fas fa-code text-blue-500"></i>
                  <span>Codes</span>
                </div>
                <span style="font-weight: bold; color: #00ff88;">0</span>
              </div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <i class="fas fa-medal text-gray-500"></i>
                  <span>Silver Bars</span>
                </div>
                <span style="font-weight: bold; color: #C0C0C0;">0</span>
              </div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <i class="fas fa-medal text-yellow-500"></i>
                  <span>Gold Bars</span>
                </div>
                <span style="font-weight: bold; color: #FFD700;">0</span>
              </div>
            </div>
          </div>
          ${user ? `<div style="margin-top: 20px; padding: 15px; background: rgba(0, 255, 136, 0.1); border-radius: 8px; border-left: 4px solid #00ff88;">
            <div style="font-weight: bold; margin-bottom: 5px;">Welcome back!</div>
            <div style="font-size: 14px; opacity: 0.9;">${user.email || user.sub}</div>
          </div>` : ''}
        </div>
      `;
        }

        async loadEb3atTab() {
            return `
        <div style="color: white;">
          <h4 style="margin-bottom: 20px; color: #FF6B35;">Eb3at Transaction Service</h4>
          <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 8px; text-align: center;">
            <i class="fas fa-paper-plane" style="font-size: 48px; color: #8B5CF6; margin-bottom: 15px;"></i>
            <p>Transaction service interface will be loaded here</p>
            <button style="
              background: linear-gradient(135deg, #8B5CF6, #FF6B35);
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              margin-top: 10px;
            ">Open Eb3at</button>
          </div>
        </div>
      `;
        }

        async loadGamesTab() {
            return `
        <div style="color: white;">
          <h4 style="margin-bottom: 20px; color: #FF6B35;">Games Centre</h4>
          <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 8px; text-align: center;">
            <i class="fas fa-gamepad" style="font-size: 48px; color: #FF6B35; margin-bottom: 15px;"></i>
            <p>Games interface will be loaded here</p>
            <button style="
              background: linear-gradient(135deg, #FF6B35, #8B5CF6);
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              margin-top: 10px;
            ">Play Games</button>
          </div>
        </div>
      `;
        }

        // Placeholder implementations for other tabs
        async loadPistonTab() {
            return `<div style="color: white; text-align: center; padding: 40px;"><i class="fas fa-cog" style="font-size: 48px; color: #FF6B35; margin-bottom: 15px;"></i><p>Piston interface loading...</p></div>`;
        }

        async loadSamma3nyTab() {
            return `<div style="color: white; text-align: center; padding: 40px;"><i class="fas fa-music" style="font-size: 48px; color: #FF6B35; margin-bottom: 15px;"></i><p>Samma3ny player loading...</p></div>`;
        }

        async loadFarragnaTab() {
            return `<div style="color: white; text-align: center; padding: 40px;"><i class="fas fa-play-circle" style="font-size: 48px; color: #FF6B35; margin-bottom: 15px;"></i><p>Farragna player loading...</p></div>`;
        }

        async loadNostalgiaTab() {
            return `<div style="color: white; text-align: center; padding: 40px;"><i class="fas fa-music" style="font-size: 48px; color: #FF6B35; margin-bottom: 15px;"></i><p>Nostalgia interface loading...</p></div>`;
        }

        async loadPebalaashTab() {
            return `<div style="color: white; text-align: center; padding: 40px;"><i class="fas fa-gift" style="font-size: 48px; color: #FF6B35; margin-bottom: 15px;"></i><p>Pebalaash rewards loading...</p></div>`;
        }

        async loadOneworldTab() {
            return `<div style="color: white; text-align: center; padding: 40px;"><i class="fas fa-globe" style="font-size: 48px; color: #FF6B35; margin-bottom: 15px;"></i><p>OneWorld interface loading...</p></div>`;
        }

        async loadE7kiTab() {
            return `<div style="color: white; text-align: center; padding: 40px;"><i class="fas fa-comments" style="font-size: 48px; color: #FF6B35; margin-bottom: 15px;"></i><p>E7ki chat loading...</p></div>`;
        }

        async loadSettaTab() {
            return `<div style="color: white; text-align: center; padding: 40px;"><i class="fas fa-camera" style="font-size: 48px; color: #FF6B35; margin-bottom: 15px;"></i><p>Setta X Tes3a loading...</p></div>`;
        }

        async loadShotsTab() {
            return `<div style="color: white; text-align: center; padding: 40px;"><i class="fas fa-image" style="font-size: 48px; color: #FF6B35; margin-bottom: 15px;"></i><p>Shots gallery loading...</p></div>`;
        }

        async loadCorsaTab() {
            return `<div style="color: white; text-align: center; padding: 40px;"><i class="fas fa-brain" style="font-size: 48px; color: #FF6B35; margin-bottom: 15px;"></i><p>CoRsA interface loading...</p></div>`;
        }

        async loadRewardsTab() {
            return `<div style="color: white; text-align: center; padding: 40px;"><i class="fas fa-gift" style="font-size: 48px; color: #FF6B35; margin-bottom: 15px;"></i><p>Rewards & Wallet loading...</p></div>`;
        }

        async loadChallengesTab() {
            return `<div style="color: white; text-align: center; padding: 40px;"><i class="fas fa-trophy" style="font-size: 48px; color: #FF6B35; margin-bottom: 15px;"></i><p>Challenges interface loading...</p></div>`;
        }

        async loadAdsTab() {
            return `<div style="color: white; text-align: center; padding: 40px;"><i class="fas fa-ad" style="font-size: 48px; color: #FF6B35; margin-bottom: 15px;"></i><p>Ads & Watch & Earn loading...</p></div>`;
        }

        async loadAssetsTab() {
            return `<div style="color: white; text-align: center; padding: 40px;"><i class="fas fa-coins" style="font-size: 48px; color: #FF6B35; margin-bottom: 15px;"></i><p>Assets management loading...</p></div>`;
        }

        async handleReset() {
            const confirmed = confirm(`⚠️ Attention!

You are about to reset your account.
All your assets, history, rewards, and data will be permanently deleted.
This action cannot be undone.

Are you sure you want to continue?`);

            if (!confirmed) return;

            try {
                // Call reset API
                const jwt = null;
                const response = await fetch('/api/auth/reset-account', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwt}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Reset failed');
                }

                // Clear local data
                if (window.unifiedStorage) {
                    await window.unifiedStorage.cacheRemove('identitySetupCompleted');
                    await window.unifiedStorage.cacheRemove('userPreferences');
                    await window.unifiedStorage.cacheRemove('hasReached1000Hours');
                    await window.unifiedStorage.cacheRemove('totalWatchHours');
                }

                // Clear localStorage
                localStorage.clear();

                // Clear sessionStorage
                sessionStorage.clear();

                // Close panel
                this.close();

                // Reload application — guarded to prevent loop
                console.warn('🚫 [Runtime] Reload after reset BLOCKED to prevent reload loop');
                // window.location.reload(); // DISABLED — use manual refresh instead

            } catch (error) {
                console.error('Reset failed:', error);
                alert('Reset failed. Please try again.');
            }
        }

        open() {
            if (this.panel && !this.isOpen) {
                // Deactivate Extra Mode if active
                if (window.ExtraMode && window.ExtraMode.isActive && window.ExtraMode.isActive()) {
                    console.log('[CodeBank] Deactivating Extra Mode (mutual exclusivity)');
                    if (window.ExtraMode.deactivate) {
                        window.ExtraMode.deactivate();
                    }
                }
                // Also check for the other extra mode system
                if (window.deactivateExtraMode && typeof window.deactivateExtraMode === 'function') {
                    window.deactivateExtraMode();
                }

                this.panel.style.right = '0px';
                this.isOpen = true;
                window.CODEBANK_ACTIVE = true;

                // Load current tab content
                this.switchTab(this.currentTab);

                // Dispatch event
                window.dispatchEvent(new CustomEvent('codebank:opened'));
            }
        }

        close() {
            if (this.panel && this.isOpen) {
                this.panel.style.right = '-100vw';
                this.isOpen = false;
                window.CODEBANK_ACTIVE = false;

                // Dispatch event
                window.dispatchEvent(new CustomEvent('codebank:closed'));
            }
        }

        toggle() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        }
    }

    // Disable virtual panel: use injected indexCB.html in the popup overlay
    window.CodeBankSidePanel = {
        open: function () { if (typeof window.showAlternativeDashboard === 'function') window.showAlternativeDashboard(); },
        close: function () { const overlay = document.getElementById('code-popup-overlay'); const content = document.getElementById('code-popup-content'); if (overlay) overlay.style.display = 'none'; if (content) content.innerHTML = ''; }
    };

    // Global functions
    window.showCodeBankPanel = () => window.CodeBankSidePanel.open();
    window.hideCodeBankPanel = () => window.CodeBankSidePanel.close();
})();

// ===== COUNTER STATE (Lines 2007-2100) =====
window.player = window.player || null;
let authReady = false;

// Centralized Counter State
window.COUNTER_STATE = {
    currentCode: null,
    startedAt: null,
    lastTickAt: null,
    isRunning: false
};

// Declare counterRevealTimeout to avoid TDZ
let counterRevealTimeout = null;

// Listen for auth:ready event
window.addEventListener('auth:ready', () => {
    authReady = true;
    // If player is playing and timer not started, start it
    if (player && player.getPlayerState() === YT.PlayerState.PLAYING && !timerInterval) {
        startCounter();
    }
});
let watchTime = 0;
let timerInterval = null;
let currentInterval = 5 * 60 * 1000; // 5 minutes code generation interval
let isFirstCodeAfterReload = true; // Track if it's the first code after reload
const playPauseButton = document.getElementById('play-pause-button');


// Persist counter state to localStorage
function persistCounterState() {
}

// Sync from CodeBank data
function syncFromCodeBank(data) {
    if (data.codesCount !== undefined) {
        // Update codes count if needed
        console.log('[BC] Synced codes count:', data.codesCount);
    }
    if (data.silverCount !== undefined) {
        // Update silver count if needed
        console.log('[BC] Synced silver count:', data.silverCount);
    }
    if (data.goldCount !== undefined) {
        // Update gold count if needed
        console.log('[BC] Synced gold count:', data.goldCount);
    }
}

// Expose helpers globally for external callbacks
window.syncFromCodeBank = syncFromCodeBank;
window.persistCounterState = persistCounterState;

// Time-based counter tick function
function tickCounter() {
    if (!window.COUNTER_STATE.isRunning) return;

    if (window.ExtraMode && window.ExtraMode.isActive && window.ExtraMode.isActive()) {
        return;
    }

    const now = Date.now();
    const elapsed = now - window.COUNTER_STATE.startedAt;
    updateCounterUI(elapsed);

    if (typeof updateProgressBar === 'function') {
        updateProgressBar();
    }

    const progressTextEl = document.getElementById('progress-text');
    if (progressTextEl) {
        const next = window.Bankode && window.Bankode._nextDueAt ? window.Bankode._nextDueAt : Date.now();
        const progress = calculateProgress(next);
        progressTextEl.textContent = `${progress.toFixed(2)}%`;
    }

    // Mirror-only: no generation from counter

    if (watchTime >= 9999 * 60 * 60 * 1000) {
        watchTime = 0;
        updateCounterDisplay();
    }

    persistCounterState();
}

// Ensure external timers call global function
window.tickCounter = tickCounter;

// Update counter UI with elapsed time
function updateCounterUI(elapsed) {
    // Update watchTime for compatibility
    watchTime = elapsed;
    updateCounterDisplay();
}

// Function to toggle play/pause
function togglePlayPause() {
    if (!window.player || typeof player.getPlayerState !== 'function') {
        return;
    }
    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
        if (typeof player.pauseVideo === 'function') player.pauseVideo();
        playPauseButton.classList.add('paused');
        // Hide recommended videos when pausing
        hideRecommendedVideos();
    } else {
        if (typeof player.playVideo === 'function') player.playVideo();
        playPauseButton.classList.remove('paused');
    }
}

const initialContentId = 'PLD60YBjiIjQPryp_T2IdNm9fukceO8AtN'; // Home playlist (default) - can be video ID or playlist ID
const YOUTUBE_CONFIG = {
    apiKey: window.YOUTUBE_DATA_API_KEY || '',
    clientId: window.YOUTUBE_OAUTH_CLIENT_ID || ''
};
const videoContainer = document.getElementById('video-container');
const channelId = 'UCZ5heNyv3s5dIw9mtjsAGsg';
const codeDisplay = document.getElementById('code-display');
const progressBar = document.getElementById('progress-bar');
let startTime = Date.now(); // Ensure startTime is defined globally
let lastPlaybackTime = 0; // Initialize lastPlaybackTime variable (will be loaded from saved Home data)

// Load saved playback time for Home section on initialization
(async function loadInitialPlaybackTime() {
    const videoIds = {
        'home': 'PLD60YBjiIjQPryp_T2IdNm9fukceO8AtN', // Home (Playlist ID)
        'nour': 'SJUH0qthtCA', // Nour (Single Video ID)
        'afra7': 'fUehe82E5yU' // Afra7 (Single Video ID)
    };

    try {
        let savedData = { time: 0, index: 0 };
        // Mirror-only: do not use AuthSyncManager
        const localData = localStorage.getItem(`video_${videoIds.home}`);
        if (localData) {
            savedData = JSON.parse(localData);
        }

        if (savedData && savedData.time) {
            lastPlaybackTime = savedData.time;
            console.log('[Initialization] Loaded saved Home playback time:', lastPlaybackTime);
        }
    } catch (e) {
        console.warn('[Initialization] Error loading saved Home playback time:', e);
        // Keep lastPlaybackTime as 0 if loading fails
    }
})();

// Fixed: Ensure YouTube IFrame API loads exactly once with proper guards
// YouTube IFrame API is loaded via static script tag; no dynamic injection

function sanitizeWatchTime(value) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue >= 0) {
        return numericValue;
    }
    return 0;
}

// Dummy updateProgressBar if not defined
if (typeof updateProgressBar !== 'function') {
    function updateProgressBar() { }
}

// Global player reference
window.player = null;

// YouTube API Ready Handler - This is called by the YouTube API when it's loaded
function onYouTubeIframeAPIReady() {
    console.log('[YouTube API] onYouTubeIframeAPIReady called - API is ready');

    // Ensure we have the YouTube API loaded
    if (typeof YT === 'undefined' || !YT.Player) {
        console.error('[YouTube API] YT.Player not available');
        return;
    }

    // Create the player with the initial content
    const initialContentId = 'PLD60YBjiIjQPryp_T2IdNm9fukceO8AtN';
    createPlayer(initialContentId);
}

// Set the global handler that YouTube API looks for
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

// Promise-based player creation to avoid race conditions
function createPlayer(videoIdOrPlaylistId) {
    // Initialize promise variable if not exists
    if (!createPlayer._playerCreationPromise) {
        createPlayer._playerCreationPromise = null;
    }

    // Guard: Prevent multiple simultaneous player creations
    if (createPlayer._playerCreationPromise) {
        console.log('[YouTube Player] Player creation already in progress');
        return createPlayer._playerCreationPromise;
    }

    createPlayer._playerCreationPromise = (async () => {
        const container = document.getElementById('video-container');
        if (!container) {
            console.error('[YouTube Player] Video container not found!');
            createPlayer._playerCreationPromise = null;
            return;
        }

        // Wait for YouTube API to be ready (max 10 seconds)
        const maxWait = 10000;
        const startTime = Date.now();
        while (typeof YT === 'undefined' || !YT.Player) {
            if (Date.now() - startTime > maxWait) {
                console.error('[YouTube Player] API not ready after timeout');
                createPlayer._playerCreationPromise = null;
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Check if player already exists and destroy it
        if (window.player && typeof window.player.destroy === 'function') {
            try {
                window.player.destroy();
                console.log('[YouTube Player] Destroyed existing player');
            } catch (e) {
                console.warn('[YouTube Player] Error destroying existing player:', e);
            }
        }

        // Check if it's a playlist (starts with 'PL') or a single video
        const isPlaylist = videoIdOrPlaylistId && videoIdOrPlaylistId.startsWith('PL');

        console.log('[YouTube Player] Creating player with', isPlaylist ? 'playlist' : 'video', ':', videoIdOrPlaylistId);

        try {
            const playerConfig = {
                height: '100%',
                width: '100%',
                playerVars: {
                    controls: 0,
                    disablekb: 1,
                    autoplay: 1,
                    mute: 1,
                    modestbranding: 1,
                    rel: 0,
                    fs: 0,
                    iv_load_policy: 3,
                    loop: 1,
                    playsinline: 1,
                    origin: window.location.origin,
                    enablejsapi: 1
                },
                events: {
                    onReady: onPlayerReady,
                    onStateChange: onPlayerStateChange,
                    onError: onPlayerError
                }
            };

            if (isPlaylist) {
                // For playlists, use listType and list parameters
                playerConfig.playerVars.listType = 'playlist';
                playerConfig.playerVars.list = videoIdOrPlaylistId;
            } else {
                // For single videos, use videoId
                playerConfig.videoId = videoIdOrPlaylistId;
                playerConfig.playerVars.playlist = videoIdOrPlaylistId;
            }

            // Create the player
            window.player = new YT.Player('video-container', playerConfig);
            console.log('[YouTube Player] Player created successfully');
            createPlayer._playerCreationPromise = null;
            return window.player;

        } catch (error) {
            console.error('[YouTube Player] Error creating player:', error);
            createPlayer._playerCreationPromise = null;
            throw error;
        }
    })();

    return createPlayer._playerCreationPromise;
}

// Player ready event handler
function onPlayerReady(event) {
    console.log('[YouTube Player] Player ready!');
    player = event.target;

    // Ensure video container is visible
    const container = document.getElementById('video-container');
    if (container) {
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.opacity = '1';
    }

    enableTheatreMode(event.target);

    // Use lastPlaybackTime if it's available
    if (typeof lastPlaybackTime !== 'undefined' && lastPlaybackTime > 0) {
        event.target.seekTo(lastPlaybackTime);
    }

    // Start playing
    try {
        try { event.target.mute(); } catch (_) { }
        event.target.playVideo();
        console.log('[YouTube Player] Video playback started');
    } catch (error) {
        console.warn('[YouTube Player] Autoplay may be blocked:', error);
    }

    // Move player-dependent logic here
    if (player && player.getPlayerState() === YT.PlayerState.PLAYING) {
        startCounter();
    }

    // Always enable theatre mode for full screen video
    enableTheatreMode(event.target);

    // ENHANCED: Add video change detection for screenshot system
    setupVideoChangeDetection(event.target);

    // Hide recommended videos on pause (with error handling)
    try {
        const iframe = (player && typeof player.getIframe === 'function') ? player.getIframe() : null;
        if (iframe && iframe.contentWindow && iframe.contentWindow.document) {
            const video = iframe.contentWindow.document.querySelector('video');
            if (video) {
                video.addEventListener('pause', hideRecommendedVideos);
            }
        }
    } catch (e) {
        console.warn('[YouTube Player] Could not attach pause listener (cross-origin):', e);
    }

    // Trigger Home section load for 3-way toggle (handle starts in center)
    // This ensures Home section loads when player is ready
    if (window.showHomeSection && typeof window.showHomeSection === 'function') {
        setTimeout(() => {
            console.log('[YouTube Player] Triggering Home section load after player ready');
            window.showHomeSection().catch(err => console.error('[YouTube Player] Error loading Home section:', err));
        }, 500);
    }

}
window.onPlayerReady = onPlayerReady;

// Helper function to generate YouTube embed URLs
function getYouTubeURL({ videoId = null, playlistId = null }) {
    const base = "https://www.youtube.com/embed/";
    const params = "?autoplay=1&controls=0&mute=1&playsinline=1&rel=0&enablejsapi=1";

    if (playlistId) {
        return `${base}videoseries?list=${playlistId}${params}`;
    }

    if (videoId) {
        return `${base}${videoId}${params}`;
    }

    console.error("No YouTube ID provided");
    return "";
}

// Function to create the YouTube player
document.addEventListener('DOMContentLoaded', () => {
    initializeCodeDisplayLongPress();
    initializeCounterHoverReveal();
    initializeTouchOverlayBlocker();

    // Bind 3-way toggle and Extra Mode controls
    const threeWay = document.getElementById('three-way-toggle');
    const toggleTrack = threeWay ? threeWay.querySelector('.toggle-track') : null;
    const toggleHandle = threeWay ? threeWay.querySelector('.toggle-handle') : null;

    function updateThreeWayUI(section) {
        if (!threeWay || !toggleHandle) return;
        threeWay.classList.remove('state-home', 'state-nour', 'state-afra7');
        const s = (section || window.currentSection || 'home').toLowerCase();
        threeWay.classList.add(`state-${s}`);
        // Smooth handle transition
        toggleHandle.style.transition = 'transform 200ms ease';
        toggleHandle.style.willChange = 'transform';
        const pos = s === 'home' ? 0 : (s === 'nour' ? 50 : 100);
        toggleHandle.style.transform = `translateX(${pos}%)`;
        threeWay.setAttribute('aria-label', `Active section: ${s}`);
        console.log(`[SWITCH] Active section: ${s}`);
    }

    function getSectionByClick(e) {
        if (!toggleTrack) return null;
        const rect = toggleTrack.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        if (x < 1 / 3) return 'home';
        if (x < 2 / 3) return 'nour';
        return 'afra7';
    }

    if (threeWay) {
        threeWay.addEventListener('click', (e) => {
            const targetSection = getSectionByClick(e) || 'home';
            if (targetSection === 'home' && typeof window.showHomeSection === 'function') {
                window.showHomeSection();
            } else if (targetSection === 'nour' && typeof window.showNourSection === 'function') {
                window.showNourSection();
            } else if (targetSection === 'afra7' && typeof window.showAfra7Section === 'function') {
                window.showAfra7Section();
            }
            updateThreeWayUI(targetSection);
        });
        // Initial sync
        updateThreeWayUI(window.currentSection || 'home');
    }

    // Extra Mode minimal state manager with drag support
    (function ensureExtraMode() {
        if (window.ExtraMode && typeof window.ExtraMode.isActive === 'function') return;
        let active = false;
        const container = document.getElementById('extra-switch-container');
        const knob = document.getElementById('extra-switch-knob');
        let isDragging = false;
        let startX = 0;
        let currentX = 0;

        function syncUI() {
            if (container) container.classList.toggle('active', active);
            if (knob) {
                knob.style.transition = isDragging ? 'none' : 'transform 200ms ease';
                knob.style.transform = active ? 'translateX(100%)' : 'translateX(0)';
            }
            document.body.classList.toggle('extra-mode', active);
            const counterEl = document.getElementById('counter');
            if (counterEl) {
                counterEl.classList.toggle('paused', active);
            }
            console.log(`[EXTRA] Mode: ${active ? 'ON' : 'OFF'}`);
        }

        function handleDragStart(e) {
            if (!knob) return;
            isDragging = true;
            startX = e.clientX || e.touches[0].clientX;
            currentX = startX;
            knob.style.transition = 'none';
            e.preventDefault();
        }

        function handleDragMove(e) {
            if (!isDragging || !knob || !container) return;
            currentX = e.clientX || e.touches[0].clientX;
            const deltaX = currentX - startX;
            const containerRect = container.getBoundingClientRect();
            const knobRect = knob.getBoundingClientRect();
            const maxTranslate = containerRect.width - knobRect.width;
            let translateX = Math.max(0, Math.min(maxTranslate, (active ? maxTranslate : 0) + deltaX));
            knob.style.transform = `translateX(${translateX}px)`;
            e.preventDefault();
        }

        function handleDragEnd(e) {
            if (!isDragging || !knob || !container) return;
            isDragging = false;
            const containerRect = container.getBoundingClientRect();
            const knobRect = knob.getBoundingClientRect();
            const centerX = knobRect.left + knobRect.width / 2;
            const containerCenter = containerRect.left + containerRect.width / 2;
            const newActive = centerX > containerCenter;
            active = newActive;
            // Only allow on Home
            const s = (window.currentSection || 'home').toLowerCase();
            if (s !== 'home') active = false;
            syncUI();
        }

        // Add drag event listeners
        if (knob) {
            knob.addEventListener('mousedown', handleDragStart);
            knob.addEventListener('touchstart', handleDragStart, { passive: false });
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('touchmove', handleDragMove, { passive: false });
            document.addEventListener('mouseup', handleDragEnd);
            document.addEventListener('touchend', handleDragEnd);
        }

        window.ExtraMode = {
            isActive: () => active,
            activate: () => { active = true; syncUI(); },
            deactivate: () => { active = false; syncUI(); if (window.player && window.player.getPlayerState() === YT.PlayerState.PLAYING) { startCounter(); } }
        };
    })();

    const extraSwitch = document.getElementById('extra-switch-container');
    if (extraSwitch) {
        extraSwitch.addEventListener('click', () => {
            try {
                if (window.ExtraMode.isActive()) {
                    window.ExtraMode.deactivate();
                } else {
                    // Only allow on Home
                    const s = (window.currentSection || 'home').toLowerCase();
                    if (s === 'home') window.ExtraMode.activate();
                }
            } catch (_) { }
        });
    }

    // Mirror-only mode: no local generation

    // Start counter regardless of auth
    try { resumeCounter(); } catch (_) { }

    // Also generate code immediately when player starts playing (backup)
    let initialCodeGenerated = false;

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            // Pause the counter when the page is not visible
            pauseCounter();
        } else {
            // Resume the counter when the page becomes visible again
            startCounter();
        }
    });

    // Pause counter when leaving the page
    window.addEventListener('beforeunload', () => {
        stopCounter();
        persistCounterState();
    });

});
function onPlayerStateChange(event) {
    // ENHANCED: Track video changes for screenshot optimization
    let previousVideoId = null;
    try {
        if (player && typeof player.getVideoData === 'function') {
            previousVideoId = player.getVideoData()?.video_id;
        }
    } catch (e) {
        // Ignore errors
    }

    if (event.data === YT.PlayerState.PLAYING) {
        if (!authReady) return;

        resumeCounter();

        // ENHANCED: Check for video changes shortly after playback starts
        setTimeout(() => {
            try {
                if (player && typeof player.getVideoData === 'function') {
                    const currentVideoId = player.getVideoData()?.video_id;
                    if (currentVideoId && currentVideoId !== previousVideoId) {
                        console.log('🎬 Video change detected during playback:', currentVideoId);
                        // Trigger screenshot background refresh
                        if (typeof refreshScreenshotBackground === 'function') {
                            refreshScreenshotBackground(currentVideoId);
                        }
                    }
                }
            } catch (error) {
                console.warn('Error detecting video change:', error);
            }
        }, 1500);

    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.BUFFERING) {
        stopCounter();
    } else if (event.data === YT.PlayerState.ENDED) {
        stopCounter();

        // ENHANCED: Preload next video thumbnail for better screenshots
        setTimeout(() => {
            try {
                if (player && typeof player.getVideoData === 'function') {
                    const nextVideoData = player.getVideoData();
                    if (nextVideoData?.video_id) {
                        preloadVideoThumbnail(nextVideoData.video_id);
                    }
                }
            } catch (error) {
                console.warn('Error preloading next video thumbnail:', error);
            }
        }, 1000);

        // Check if the last video in the playlist has ended
        if (videoIds[currentVideoIndex] === 'PLD60YBjiIjQPryp_T2IdNm9fukceO8AtN') { // Home (Playlist)
            // Retrieve the saved playback state for the Home playlist
            const savedDataStr = window.YTSOLAAccessControl ? window.YTSOLAAccessControl.getSessionData(`video_${videoIds[currentVideoIndex]}`) : null;
            const savedData = savedDataStr ? JSON.parse(savedDataStr) : {};
            const startSeconds = savedData.time || 0; // Last saved playback time
            const startIndex = savedData.index || 0; // Last saved playlist index

            // Loop the Home playlist from the last saved state
            if (player && typeof player.loadPlaylist === 'function') player.loadPlaylist({
                listType: 'playlist',
                list: videoIds[currentVideoIndex], // Use the playlist ID directly
                index: startIndex, // Continue from the last saved index
                startSeconds: startSeconds // Continue from the last saved time
            });
        } else if (videoIds[currentVideoIndex] === 'fUehe82E5yU') { // Afra7 (Single Video)
            // Loop the Afra7 video
            if (player && typeof player.loadVideoById === 'function') player.loadVideoById({
                videoId: videoIds[currentVideoIndex],
                startSeconds: 0 // Start from the beginning
            });
        } else {
            // Move to the next video in the playlist
            if (player && typeof player.nextVideo === 'function') player.nextVideo();
        }
    }
}
window.onPlayerStateChange = onPlayerStateChange;

function switchToNextSection() {
    const order = ['home', 'nour', 'afra7'];
    const current = (window.currentSection || 'home').toLowerCase();
    const idx = order.indexOf(current);
    const next = order[(idx + 1) % order.length];
    if (next === 'home' && typeof window.showHomeSection === 'function') {
        window.showHomeSection();
        return;
    }
    if (next === 'nour' && typeof window.showNourSection === 'function') {
        window.showNourSection();
        return;
    }
    if (next === 'afra7' && typeof window.showAfra7Section === 'function') {
        window.showAfra7Section();
        return;
    }
}

// Check internet connection periodically
setInterval(checkInternetConnection, 5000);

// Function to convert time in milliseconds to hours, minutes, and seconds
function formatTime(milliseconds) {
    milliseconds = sanitizeWatchTime(milliseconds);
    const totalSeconds = Math.floor(milliseconds / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;
    const totalDays = Math.floor(totalHours / 24);
    const days = totalDays % 365;
    const years = Math.floor(totalDays / 365);

    const formattedSeconds = String(seconds).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedHours = String(hours).padStart(2, '0');
    const formattedDays = String(days).padStart(3, '0');
    const formattedYears = String(years).padStart(1, '0').slice(-1);

    return `${formattedYears}:${formattedDays}:${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

// Mirror-only architecture: no local code generation functions

function showGuestModeMessage() {
    // Create a temporary notification for guest users
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: Arial, sans-serif;
        max-width: 300px;
    `;
    notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px;">🔐 Sign In Required</div>
        <div style="font-size: 14px; line-height: 1.4;">
            Codes and rewards are exclusive to authenticated users.
            <br><br>
            <strong>Sign in to earn and save your progress!</strong>
        </div>
    `;

    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Function to start the counter
function startCounter() {
    if (window.COUNTER_STATE.isRunning) return;
    watchTime = sanitizeWatchTime(watchTime);
    window.COUNTER_STATE.startedAt = Date.now() - watchTime;
    window.COUNTER_STATE.lastTickAt = Date.now();
    window.COUNTER_STATE.isRunning = true;
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    persistCounterState();
}

function stopCounter() {
    clearInterval(timerInterval);
    timerInterval = null;
    window.COUNTER_STATE.isRunning = false;
    persistCounterState();
}

// Function to reset the counter
function resetCounter() {
    watchTime = 0;
    updateCounterDisplay();
    clearInterval(timerInterval);
    timerInterval = null;
}

// Function to reset progress and start over
function resetProgress() {
    const nextTime = Date.now() + currentInterval;
    if (window.AuthSyncManager && window.AuthSyncManager.isAuthenticated && window.AuthSyncManager.isAuthenticated()) {

    } else {

    }
    updateProgressBar();
    console.log('Progress reset. New nextCodeGenerationTime:', nextTime);
}

// Mirror-only: no next code time initialization or auth usage

// Verify codeDisplay element
console.log('codeDisplay element:', document.getElementById('code-display'));

// Function to update the counter display
function updateCounterDisplay() {
    const counterElement = document.getElementById('counter');
    if (counterElement) {
        const safeWatchTime = sanitizeWatchTime(watchTime);
        const time = formatTime(safeWatchTime);
        const digits = time.split('').map(digit => `
            <span>
                ${digit}
                <span class="shine"></span>
            </span>
        `).join('');
        counterElement.innerHTML = digits;
    } else {
        console.error("Counter element not found!"); // Handle the case where element isn't there
    }
}

// Function to safely set session data using access control
function safeSetSessionData(key, value) {
    try {
        if (window.YTSOLAAccessControl) {
            window.YTSOLAAccessControl.setSessionData(key, value);
        } else {
            // Fallback to localStorage if access control not ready
            localStorage.setItem(key, value);
        }
    } catch (error) {
        if (isQuotaExceededError(error)) {
            console.warn("Session storage is full. Cleaning up old data...");
            cleanupOldData();
            try {
                if (window.YTSOLAAccessControl) {
                    window.YTSOLAAccessControl.setSessionData(key, value);
                } else {
                    localStorage.setItem(key, value);
                }
            } catch (retryError) {
                console.error("Failed to save session data after cleanup:", retryError);
            }
        } else {
            console.error("Failed to save session data:", error);
        }
    }
}

// Function to check if the error is due to exceeding localStorage quota
function isQuotaExceededError(error) {
    let quotaExceeded = false;
    if (error) {
        if (error.code) {
            switch (error.code) {
                case 22:
                    quotaExceeded = true;
                    break;
                case 1014:
                    if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                        quotaExceeded = true;
                    }
                    break;
                default:
                    break;
            }
        } else if (error.number === -2147024882) {
            quotaExceeded = true;
        }
    }
    return quotaExceeded;
}

// Function to clean up old data in localStorage
function cleanupOldData() {
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        try {
            const item = JSON.parse(localStorage.getItem(key));
            if (item.timestamp && item.timestamp < oneMonthAgo) {
                localStorage.removeItem(key);
                console.log(`Removed old item: ${key}`);
            }
        } catch (error) {
            console.warn(`Skipping invalid item: ${key}`);
        }
    }
}

// Call this function periodically or when you need to clean up old data
setInterval(cleanupOldData, 86400000); // Run every 24 hours

// Function to calculate progress percentage based on real time
function calculateProgress(nextCodeGenerationTime) {
    const startTime = nextCodeGenerationTime - currentInterval;
    const elapsed = Date.now() - startTime;
    const progress = (elapsed / currentInterval) * 100;
    return Math.min(progress, 100); // Ensure progress does not exceed 100%
}

// Function to handle screen orientation changes
function handleOrientationChange() {
    const counterContainer = document.getElementById('counter-container');

    function updateOrientation() {
        if (screen.orientation.type.startsWith('landscape')) {
            // Keep counter container visible in fullscreen mode
            counterContainer.style.display = 'flex';
            enableTheatreMode(player);
        } else {
            // Keep counter container visible in normal mode
            counterContainer.style.display = 'flex';
            disableTheatreMode(player);
        }
    }

    // Listen for orientation changes
    screen.orientation.addEventListener('change', updateOrientation);

    // Initial check
    updateOrientation();
}

// Call the function to handle orientation changes
handleOrientationChange();

// Function to enable theatre mode
function enableTheatreMode(player) {
    if (player && typeof player.getIframe === 'function') {
        const iframe = player.getIframe();
        const container = document.getElementById('video-container');
        if (iframe && container) {
            iframe.classList.add('theatre-mode');
            container.classList.add('theatre-mode');
            document.body.classList.add('theatre-mode-active');
            // Disable touch shield in theatre mode since iframe is blocked
            const shield = document.getElementById('global-touch-shield');
            if (shield) {
                shield.style.display = 'none';
            }
        }
    }
}

// Function to disable theatre mode
function disableTheatreMode(player) {
    const iframe = (player && typeof player.getIframe === 'function') ? player.getIframe() : null;
    const container = document.getElementById('video-container');
    if (iframe) iframe.classList.remove('theatre-mode');
    if (container) container.classList.remove('theatre-mode');
    document.body.classList.remove('theatre-mode-active');
    // Re-enable touch shield when exiting theatre mode
    const shield = document.getElementById('global-touch-shield');
    if (shield) {
        shield.style.display = 'block';
    }
}

// Function to handle internet connection check
function checkInternetConnection() {
    // Implement your logic to check internet connection here
}

// Function to pause the counter

window.addEventListener('online', function () {
    // The browser is back online, you can restart the counter or any other logic here
    console.log('Browser is online');
});

window.addEventListener('offline', function () {
    // The browser is offline, pause the counter and show a message
    pauseCounter();
});

function pauseCounter() {
    if (!window.COUNTER_STATE.isRunning) return;
    window.COUNTER_STATE.isRunning = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    persistCounterState();
}

// Make timer functions globally accessible for Extra Mode
window.startCounter = startCounter;
window.stopCounter = stopCounter;
window.pauseCounter = pauseCounter;

// Function to hide recommended videos
function hideRecommendedVideos() {
    try {
        if (player && typeof player.getIframe === 'function') {
            const iframe = player.getIframe();
            if (iframe && iframe.contentWindow && iframe.contentWindow.document) {
                const video = iframe.contentWindow.document.querySelector('video');
                if (video) video.style.display = 'none'; // Hide video element
            }
        }
    } catch (e) {
        // Ignore errors if iframe is not ready
    }
}


window.addEventListener('scroll', () => {
    window.scrollTo(0, 0);
});


document.addEventListener('DOMContentLoaded', function () {
    try {
        if (player && typeof player.getIframe === 'function') {
            const iframe = player.getIframe();
            if (iframe && iframe.contentWindow && iframe.contentWindow.document) {
                const video = iframe.contentWindow.document.querySelector('video');
                if (video) video.addEventListener('pause', hideRecommendedVideos);
            }
        }
    } catch (_) { }

    const touchOverlay = document.querySelector('.touch-overlay');
    if (touchOverlay) {
        ['click', 'touchstart', 'touchend', 'touchmove', 'mousedown', 'mouseup', 'contextmenu'].forEach(function (eventType) {
            touchOverlay.addEventListener(eventType, function (e) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }, { passive: false, capture: true });
        });
    }

    window.addEventListener('load', function () {
        try {
            if (!window.player && typeof window.initYouTubePlayer === 'function' && !window.__YT_PLAYER_INIT__) {
                setTimeout(function(){ if (!window.__YT_PLAYER_INIT__) window.initYouTubePlayer(); }, 1000);
            }
        } catch (_) { }
    });
});

// ===== SOUND BUTTON (Lines 2641-2937) =====
const soundButton = document.getElementById('sound-button');
const soundPopup = document.getElementById('sound-popup');
let longPressTimer;
let isLongPress = false;
let timeUpdateInterval;

// Hover popup functionality - only on left-to-right hover
let enterX = 0;
let hasShown = false;

soundButton.addEventListener('mouseenter', (e) => {
    enterX = e.clientX;
    hasShown = false;
});

soundButton.addEventListener('mousemove', (e) => {
    if (!hasShown && e.clientX > enterX + 10) { // Moved right by at least 10px
        updatePopupContent();
        soundPopup.style.display = 'block';
        timeUpdateInterval = setInterval(updatePopupContent, 1000); // Update every second
        hasShown = true;
    }
});

soundButton.addEventListener('mouseleave', () => {
    soundPopup.style.display = 'none';
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
    }
    hasShown = false;
});

function getTimeZoneFromCountry(countryCode) {
    const timeZoneMap = {
        'US': 'America/New_York',
        'GB': 'Europe/London',
        'DE': 'Europe/Berlin',
        'FR': 'Europe/Paris',
        'AE': 'Asia/Dubai',
        'SA': 'Asia/Riyadh',
        'EG': 'Africa/Cairo',
        'PK': 'Asia/Karachi',
        'IN': 'Asia/Kolkata',
        'BD': 'Asia/Dhaka',
        'MY': 'Asia/Kuala_Lumpur',
        'ID': 'Asia/Jakarta',
        'TR': 'Europe/Istanbul',
        'IR': 'Asia/Tehran',
        'IQ': 'Asia/Baghdad',
        'JO': 'Asia/Amman',
        'LB': 'Asia/Beirut',
        'SY': 'Asia/Damascus',
        'YE': 'Asia/Aden',
        'OM': 'Asia/Muscat',
        'KW': 'Asia/Kuwait',
        'QA': 'Asia/Qatar',
        'BH': 'Asia/Bahrain',
        'IL': 'Asia/Jerusalem',
        'PS': 'Asia/Gaza',
        'MA': 'Africa/Casablanca',
        'TN': 'Africa/Tunis',
        'DZ': 'Africa/Algiers',
        'LY': 'Africa/Tripoli',
        'SD': 'Africa/Khartoum',
        'SO': 'Africa/Mogadishu',
        'ET': 'Africa/Addis_Ababa',
        'KE': 'Africa/Nairobi',
        'UG': 'Africa/Kampala',
        'TZ': 'Africa/Dar_es_Salaam',
        'ZA': 'Africa/Johannesburg',
        'NG': 'Africa/Lagos',
        'GH': 'Africa/Accra',
        'CI': 'Africa/Abidjan',
        'SN': 'Africa/Dakar',
        'ML': 'Africa/Bamako',
        'BF': 'Africa/Ouagadougou',
        'NE': 'Africa/Niamey',
        'TD': 'Africa/Ndjamena',
        'CM': 'Africa/Douala',
        'GA': 'Africa/Libreville',
        'CG': 'Africa/Brazzaville',
        'CD': 'Africa/Kinshasa',
        'RW': 'Africa/Kigali',
        'BI': 'Africa/Bujumbura',
        'MW': 'Africa/Blantyre',
        'MZ': 'Africa/Maputo',
        'ZW': 'Africa/Harare',
        'ZM': 'Africa/Lusaka',
        'BW': 'Africa/Gaborone',
        'NA': 'Africa/Windhoek',
        'AO': 'Africa/Luanda'
    };
    return timeZoneMap[countryCode] || 'America/New_York';
}

function updatePopupContent() {
    const now = new Date();

    // Get user timezone based on selected country
    const userPrefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
    const countryCode = userPrefs.country || 'US';
    const timeZone = getTimeZoneFromCountry(countryCode);

    // Update current time in 12-hour format with AM/PM - use local system time like azan-clock
    const timeString = now.toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit'
    });

    document.getElementById('current-time').textContent = timeString;

    // Update Gregorian date
    const gregorianString = now.toLocaleDateString('en-US', {
        timeZone: timeZone,
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    document.getElementById('gregorian-date').textContent = gregorianString;

    // Update Hijri date using hijri-date library or fallback calculation
    if (typeof HijriDate !== 'undefined') {
        try {
            const hijri = new HijriDate(now);
            // HijriDate months are 0-indexed (0 = Muharram, 11 = Dhu al-Hijjah)
            const monthNames = [
                'Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani',
                'Jumada al-awwal', 'Jumada al-thani', 'Rajab', 'Sha\'ban',
                'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
            ];
            const monthIndex = hijri.getMonth();
            const day = hijri.getDate();
            const year = hijri.getFullYear();

            // Validate the values
            if (monthIndex >= 0 && monthIndex < 12 && day > 0 && day <= 30 && year > 0) {
                const hijriString = `${day} ${monthNames[monthIndex]} ${year}`;
                document.getElementById('hijri-date').textContent = hijriString;
            } else {
                // Invalid values from library, use fallback
                console.warn('Invalid HijriDate values, using fallback');
                document.getElementById('hijri-date').textContent = getHijriDate(now);
            }
        } catch (error) {
            console.warn('HijriDate library error, using fallback:', error);
            document.getElementById('hijri-date').textContent = getHijriDate(now);
        }
    } else {
        // Wait a bit for library to load, then retry
        setTimeout(() => {
            if (typeof HijriDate !== 'undefined') {
                try {
                    const hijri = new HijriDate(now);
                    const monthNames = [
                        'Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani',
                        'Jumada al-awwal', 'Jumada al-thani', 'Rajab', 'Sha\'ban',
                        'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
                    ];
                    const monthIndex = hijri.getMonth();
                    const day = hijri.getDate();
                    const year = hijri.getFullYear();

                    if (monthIndex >= 0 && monthIndex < 12 && day > 0 && day <= 30 && year > 0) {
                        const hijriString = `${day} ${monthNames[monthIndex]} ${year}`;
                        document.getElementById('hijri-date').textContent = hijriString;
                    } else {
                        document.getElementById('hijri-date').textContent = getHijriDate(now);
                    }
                } catch (retryError) {
                    document.getElementById('hijri-date').textContent = getHijriDate(now);
                }
            } else {
                document.getElementById('hijri-date').textContent = getHijriDate(now);
            }
        }, 1000);
    }
}

function getHijriDate(date) {
    // More accurate Hijri date calculation using astronomical method
    // Based on the Islamic calendar calculation
    const gregorianEpoch = new Date(622, 7, 16); // August 16, 622 AD (corrected epoch)
    const daysSinceEpoch = Math.floor((date - gregorianEpoch) / (1000 * 60 * 60 * 24));

    // Average Hijri year is 354.3667 days, month is 29.530588 days
    const avgYearDays = 354.3667;
    const avgMonthDays = 29.530588;

    // Calculate year
    const hijriYear = Math.floor(daysSinceEpoch / avgYearDays) + 1;

    // Calculate days within the year
    const daysInYear = daysSinceEpoch - Math.floor((hijriYear - 1) * avgYearDays);

    // Calculate month and day
    let monthDays = 0;
    let hijriMonth = 0;
    let hijriDay = 0;

    // Hijri months with alternating 30/29 days (approximate)
    const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];

    for (let i = 0; i < 12; i++) {
        if (daysInYear < monthDays + monthLengths[i]) {
            hijriMonth = i;
            hijriDay = daysInYear - monthDays + 1;
            break;
        }
        monthDays += monthLengths[i];
    }

    // If we went through all months, adjust
    if (hijriMonth === 0) {
        hijriMonth = 11; // Dhu al-Hijjah
        hijriDay = daysInYear - monthDays + 1;
    }

    const monthNames = [
        'Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani',
        'Jumada al-awwal', 'Jumada al-thani', 'Rajab', 'Sha\'ban',
        'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
    ];

    return `${hijriDay} ${monthNames[hijriMonth]} ${hijriYear}`;
}

// Normal click behavior (mute/unmute)
soundButton.addEventListener('click', (e) => {
    if (isLongPress) {
        isLongPress = false; // Ignore if it was a long press
        return;
    }
    if (!window.player || typeof player.isMuted !== 'function') {
        return;
    }
    if (player.isMuted()) {
        if (typeof player.unMute === 'function') player.unMute();
        soundButton.textContent = '';
    } else {
        if (typeof player.mute === 'function') player.mute();
        soundButton.textContent = '';
    }
});

// Start timer on press (mouse or touch)
function startLongPressTimer(e) {
    isLongPress = false; // Reset flag
    longPressTimer = setTimeout(() => {
        isLongPress = true;
        showAzanClockPopup();
    }, 1000); // 1 second delay (adjust if needed)
}

// Cancel timer on release (mouse or touch)
function cancelLongPressTimer() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

// Mouse events
soundButton.addEventListener('mousedown', startLongPressTimer);
soundButton.addEventListener('mouseup', cancelLongPressTimer);
soundButton.addEventListener('mouseleave', cancelLongPressTimer);

// Touch events (for mobile)
soundButton.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling/ghost clicks
    startLongPressTimer(e);
}, { passive: false });

soundButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    cancelLongPressTimer();
});

soundButton.addEventListener('touchcancel', cancelLongPressTimer);

// Popup logic for azan-clock.html
function showAzanClockPopup() {
    const overlay = document.getElementById('popup-overlay');
    const iframe = document.getElementById('popup-iframe');
    if (!overlay || !iframe) return;
    overlay.style.display = 'flex';
    overlay.classList.add('open');
    overlay.classList.add('modal');
    iframe.src = '/services/yt-clear/azan-clock.html';
    // Remove video pause when opening popup
}

document.getElementById('popup-close').addEventListener('click', function () {
    const overlay = document.getElementById('popup-overlay');
    const iframe = document.getElementById('popup-iframe');
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.classList.remove('modal');
    overlay.style.display = 'none';
    if (iframe) iframe.src = '';
});

// Code display popup close handler
document.getElementById('code-popup-close').addEventListener('click', function () {
    const overlay = document.getElementById('code-popup-overlay');
    const content = document.getElementById('code-popup-content');
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(() => {
        overlay.style.display = 'none';
        if (content) content.innerHTML = '';
    }, 200);
});

// Initialize code display long press functionality
function initializeCodeDisplayLongPress() {
    const codeDisplay = document.getElementById('code-display');
    if (!codeDisplay) return;
    let longPressTimer;

    codeDisplay.addEventListener('mousedown', () => {
        longPressTimer = setTimeout(openCodeBankPanel, 600);
    });
    codeDisplay.addEventListener('mouseup', () => {
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    });
    codeDisplay.addEventListener('mouseleave', () => {
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    });
    codeDisplay.addEventListener('touchstart', () => {
        longPressTimer = setTimeout(openCodeBankPanel, 600);
    }, { passive: true });
    codeDisplay.addEventListener('touchend', () => {
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    });
}

// CodeBank Dashboard Integration
function openCodeBankPanel() {
    if (window.codebankPanel) return;
    const container = document.createElement('div');
    container.id = 'codebank-panel-container';
    container.style.cssText = 'position:fixed;top:0;right:0;width:40vw;max-width:640px;height:100vh;z-index:9999;background:#0d1117;border-left:1px solid rgba(255,255,255,0.1);box-shadow:-8px 0 24px rgba(0,0,0,0.4);';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✖';
    closeBtn.style.cssText = 'position:absolute;top:8px;left:8px;background:transparent;color:#bbb;border:none;font-size:20px;cursor:pointer;';
    closeBtn.addEventListener('click', () => {
        try {
            container.remove();
            window.codebankPanel = null;
        } catch (_) { }
    });
    const iframe = document.createElement('iframe');
    iframe.src = 'codebank/indexCB.html';
    iframe.style.cssText = 'width:100%;height:100%;border:0;';
    container.appendChild(closeBtn);
    container.appendChild(iframe);
    document.body.appendChild(container);
    window.codebankPanel = iframe;
}

function showAlternativeDashboard() {
    const overlay = document.getElementById('code-popup-overlay');
    const content = document.getElementById('code-popup-content');
    if (!overlay || !content) return;
    overlay.style.display = 'flex';
    content.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = '/services/codebank/indexCB.html';
    iframe.style.cssText = 'width:100%;height:100%;border:0;';
    content.appendChild(iframe);
}

window.showAlternativeDashboard = showAlternativeDashboard;

// Function to show error message
function showErrorMessage(message) {
    const content = document.getElementById('code-popup-content');
    if (content) {
        content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ff6b6b;font-family:system-ui,Arial,sans-serif">' + String(message) + '</div>';
    }
}

// ===== PLAY/PAUSE BUTTON (Lines 3019-3132) =====
// Migrated play/pause button logic from yt-new.html

document.addEventListener('DOMContentLoaded', () => {
    if (YOUTUBE_CONFIG.apiKey) {
        // Note: This API call only works for videos, not playlists. If initialContentId is a playlist, it will fail and fall back to createPlayer
        fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet&id=' + initialContentId + '&key=' + YOUTUBE_CONFIG.apiKey)
            .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('YouTube Data API error')) })
            .then(function (json) { createPlayer(initialContentId); })
            .catch(function () { createPlayer(initialContentId); });
    } else {
        createPlayer(initialContentId);
    }
});

// ----------------------------------------------
// LONG PRESS → OPEN SCREENSHOT GALLERY
// SHORT PRESS → CAPTURE SCREENSHOT
// ----------------------------------------------

(function () {
    const playPauseButton = document.getElementById("play-pause-button");
    if (!playPauseButton) return;

    // ضغط عادي = التقاط لقطة
    playPauseButton.addEventListener("click", () => {
        capturePageWithThumbnail();
    });

    if (window.Hammer) {
        const hammer = new Hammer(playPauseButton);
        hammer.on("press", () => {
            openScreenshotPopup();
        });
    }
})();

function showCounterTemporarily(duration = 10000) {
    const counterElement = document.getElementById('counter');
    if (!counterElement) {
        return;
    }
    counterElement.classList.remove('hidden');
    if (window.counterRevealTimeout) {
        clearTimeout(window.counterRevealTimeout);
    }
    window.counterRevealTimeout = setTimeout(() => {
        counterElement.classList.add('hidden');
    }, duration);
}

function initializeCounterHoverReveal() {
    const codeDisplayElement = document.getElementById('code-display');
    if (!codeDisplayElement) {
        console.warn('Code display element not found for hover reveal.');
        return;
    }

    let hoverStartX = null;
    let revealTriggered = false;

    const resetHoverTracking = () => {
        hoverStartX = null;
        revealTriggered = false;
    };

    codeDisplayElement.addEventListener('mouseenter', () => {
        resetHoverTracking();
    });

    codeDisplayElement.addEventListener('mousemove', (event) => {
        if (revealTriggered) {
            return;
        }

        if (hoverStartX === null) {
            hoverStartX = event.offsetX;
            return;
        }

        const elementWidth = codeDisplayElement.clientWidth || 1;
        const startedOnLeft = hoverStartX <= elementWidth * 0.25;
        const reachedRightEdge = event.offsetX >= elementWidth * 0.75;

        if (startedOnLeft && reachedRightEdge) {
            revealTriggered = true;
            showCounterTemporarily();
        }
    });

    codeDisplayElement.addEventListener('mouseleave', () => {
        resetHoverTracking();
    });
}

function initializeTouchOverlayBlocker() {
    const overlay = document.querySelector('.touch-overlay');
    if (!overlay) {
        console.warn('Touch overlay element not found; unable to block video interactions.');
        return;
    }

    overlay.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
    });
}

function cancelTimer() {
    if (pressTimer) {
        window.clearTimeout(pressTimer);
        pressTimer = null;
    }
}

// Fixed: Prevent interaction with the video container - use safe DOM query
document.addEventListener('DOMContentLoaded', () => {
    const touchOverlaySafe = document.querySelector('.touch-overlay');
    if (touchOverlaySafe) {
        touchOverlaySafe.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
    }

    // Prevent any clicks on the video container from affecting playback
    const videoContainerEl = document.getElementById('video-container');
    if (videoContainerEl) {
        videoContainerEl.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
    }

    // Check internet connection periodically
    if (typeof checkInternetConnection === 'function') {
        setInterval(checkInternetConnection, 5000);
    }

    // Lock screen orientation to lockScreenOrientation();
});

// ===== SECTION SWITCHING (Lines 3166-3771) =====
// Section switching functions for 3-way toggle
const videoIds = {
    'home': 'PLD60YBjiIjQPryp_T2IdNm9fukceO8AtN', // Home (Playlist ID)
    'nour': 'SJUH0qthtCA', // Nour (Single Video ID)
    'afra7': 'fUehe82E5yU' // Afra7 (Single Video ID)
};

// Track current section (Home, Nour, or Afra7)
window.currentSection = 'home'; // Default to Home

// Function to show popup when extra mode cannot be activated
window.showExtraModeBlockedPopup = function () {
    // Use the same popup system as section switching
    if (window.showSectionPopup) {
        window.showSectionPopup("You can't activate the extra mode");
    } else {
        // Fallback: create a simple popup
        let existing = document.querySelector('.extra-mode-blocked-popup');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.className = 'extra-mode-blocked-popup section-switch-popup';
        el.textContent = "You can't activate the extra mode";
        document.body.appendChild(el);
        void el.offsetWidth; // force reflow
        el.classList.add('in');
        setTimeout(() => {
            el.classList.remove('in');
            el.classList.add('out');
        }, 560);
        setTimeout(() => {
            el.remove();
        }, 800);
    }
};

// Helper function to save current playback time before switching
window.saveCurrentSectionTime = async function (sectionId) {
    if (!player || !sectionId) return;

    try {
        const currentTime = player.getCurrentTime ? player.getCurrentTime() : 0;
        const playlistIndex = player.getPlaylistIndex ? player.getPlaylistIndex() : 0;

        const saveData = {
            time: currentTime,
            index: playlistIndex
        };

        if (window.AuthSyncManager && window.AuthSyncManager.setUserData) {

            console.log(`[Section Switch] Saved time for ${sectionId}:`, saveData);
        } else {
            // Fallback to localStorage
            localStorage.setItem(`video_${videoIds[sectionId]}`, JSON.stringify(saveData));
        }
    } catch (e) {
        console.warn(`[Section Switch] Error saving time for ${sectionId}:`, e);
    }
};

// Debounced initialization promises to prevent multiple attempts
let homeInitPromise = null;
let nourInitPromise = null;
let afra7InitPromise = null;

// Enhanced player readiness check
function isPlayerReadyForSectionLegacy() {
    if (!player || !player.getPlayerState) {
        return false;
    }

    const playerState = player.getPlayerState();
    // Allow UNSTARTED state as it means player exists but video not loaded yet
    // Block only when player doesn't exist or getPlayerState is unavailable
    return playerState !== undefined;
}

// Section switching functions - called by 3-way toggle (OPTIMIZED)
window.showHomeSection = async function () {
    console.log('[Section Switch] Switching to Home section');

    // Return existing promise if already initializing
    if (homeInitPromise) {
        console.log('[Section Switch] Home section initialization already in progress');
        return homeInitPromise;
    }

    // Enhanced player readiness check
    if (!isPlayerReadyForSectionLegacy()) {
        console.warn('[Section Switch] Player not ready for section switching, waiting...');
        homeInitPromise = new Promise(resolve => {
            const checkPlayerReady = setInterval(() => {
                if (isPlayerReadyForSectionLegacy()) {
                    clearInterval(checkPlayerReady);
                    resolve(window.showHomeSection());
                }
            }, 300);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkPlayerReady);
                console.warn('[Section Switch] Home section initialization timeout');
                homeInitPromise = null;
                resolve();
            }, 10000);
        });

        return homeInitPromise.finally(() => {
            homeInitPromise = null;
        });
    }

    // Update current section
    window.currentSection = 'home';

    // Load saved playback time for Home (continues from last position)
    let savedData = { time: 0, index: 0 };
    if (window.AuthSyncManager && window.AuthSyncManager.getUserData) {
        try {
            const savedDataStr = null;
            if (savedDataStr && typeof savedDataStr === 'string') {
                savedData = JSON.parse(savedDataStr);
            } else if (savedDataStr && typeof savedDataStr === 'object') {
                savedData = savedDataStr;
            }
        } catch (e) {
            console.warn('[Section Switch] Error loading saved data for Home:', e);
            // Try localStorage fallback
            try {
                const localData = localStorage.getItem(`video_${videoIds.home}`);
                if (localData) savedData = JSON.parse(localData);
            } catch (e2) { }
        }
    } else {
        // Fallback to localStorage
        try {
            const localData = localStorage.getItem(`video_${videoIds.home}`);
            if (localData) savedData = JSON.parse(localData);
        } catch (e) { }
    }

    const startSeconds = savedData.time || 0;
    const startIndex = savedData.index || 0;

    try {
        // OPTIMIZED: Use player content update instead of recreation
        if (window.YouTubeAPIManager && typeof window.YouTubeAPIManager.updatePlayerContent === 'function') {
            console.log('[Section Switch] Using optimized player content update for Home');
            await window.YouTubeAPIManager.updatePlayerContent(videoIds.home);

            // Seek to saved position after content loads
            setTimeout(() => {
                try {
                    if (player && startSeconds > 0 && typeof player.seekTo === 'function') {
                        player.seekTo(startSeconds, true);
                    }
                } catch (seekError) {
                    console.warn('[Section Switch] Error seeking to saved position:', seekError);
                }
            }, 1000);

        } else {
            // FALLBACK: Traditional method for backward compatibility
            console.log('[Section Switch] Using fallback method for Home section');

            // Check if player is ready and in a valid state
            if (!player || typeof player.getPlayerState !== 'function') {
                console.warn('[Section Switch] Player not ready, waiting...');
                setTimeout(() => window.showHomeSection(), 500);
                return;
            }

            // Stop current playback before switching to playlist
            try {
                if (player && typeof player.stopVideo === 'function') {
                    player.stopVideo();
                }
            } catch (stopError) {
                console.warn('[Section Switch] Error stopping video:', stopError);
            }

            // Small delay to ensure player is ready for new content
            setTimeout(() => {
                try {
                    // Use loadPlaylist with proper parameters
                    if (player && typeof player.loadPlaylist === 'function') player.loadPlaylist({
                        listType: 'playlist',
                        list: videoIds.home,
                        index: startIndex,
                        startSeconds: startSeconds
                    });
                    console.log(`[Section Switch] Home playlist loaded from saved position: ${startSeconds}s, index: ${startIndex}`);
                } catch (loadError) {
                    console.warn('[Section Switch] Error with loadPlaylist, trying alternative method:', loadError);
                    // Alternative: cue playlist first, then load
                    try {
                        if (player && typeof player.cuePlaylist === 'function') player.cuePlaylist({
                            listType: 'playlist',
                            list: videoIds.home,
                            index: startIndex
                        });

                        // Wait for playlist to cue, then seek and play
                        setTimeout(() => {
                            try {
                                if (player && startSeconds > 0 && typeof player.seekTo === 'function') {
                                    player.seekTo(startSeconds, true);
                                }
                                if (player && typeof player.playVideo === 'function') {
                                    player.playVideo();
                                }
                            } catch (seekError) {
                                console.warn('[Section Switch] Error seeking/playing:', seekError);
                            }
                        }, 500);
                    } catch (cueError) {
                        console.error('[Section Switch] Error with cuePlaylist:', cueError);
                    }
                }
            }, 100);
        }
    } catch (e) {
        console.error('[Section Switch] Error loading Home playlist:', e);
        // Retry after a short delay
        setTimeout(() => {
            console.log('[Section Switch] Retrying Home section load...');
            window.showHomeSection();
        }, 1000);
    }
};

window.showNourSection = async function () {
    console.log('[Section Switch] Switching to Nour section');

    // Return existing promise if already initializing
    if (nourInitPromise) {
        console.log('[Section Switch] Nour section initialization already in progress');
        return nourInitPromise;
    }

    // Enhanced player readiness check
    if (!isPlayerReadyForSectionLegacy()) {
        console.warn('[Section Switch] Player not ready for section switching, waiting...');
        nourInitPromise = new Promise(resolve => {
            const checkPlayerReady = setInterval(() => {
                if (isPlayerReadyForSectionLegacy()) {
                    clearInterval(checkPlayerReady);
                    resolve(window.showNourSection());
                }
            }, 300);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkPlayerReady);
                console.warn('[Section Switch] Nour section initialization timeout');
                nourInitPromise = null;
                resolve();
            }, 10000);
        });

        return nourInitPromise.finally(() => {
            nourInitPromise = null;
        });
    }

    // Update current section
    window.currentSection = 'nour';

    // Deactivate extra mode if active (extra mode only works on Home)
    if (window.ExtraMode && window.ExtraMode.isActive && window.ExtraMode.isActive()) {
        console.log('[Section Switch] Deactivating extra mode (not available on Nour section)');
        if (window.ExtraMode.deactivate) {
            window.ExtraMode.deactivate();
        }
    }
    // Also check for the other extra mode system
    if (window.deactivateExtraMode && typeof window.deactivateExtraMode === 'function') {
        window.deactivateExtraMode();
    }

    // Load saved playback time for Nour (continues from last position)
    let savedData = { time: 0 };
    if (window.AuthSyncManager && window.AuthSyncManager.getUserData) {
        try {
            const savedDataStr = null;
            if (savedDataStr && typeof savedDataStr === 'string') {
                savedData = JSON.parse(savedDataStr);
            } else if (savedDataStr && typeof savedDataStr === 'object') {
                savedData = savedDataStr;
            }
        } catch (e) {
            console.warn('[Section Switch] Error loading saved data for Nour:', e);
            // Try localStorage fallback
            try {
                const localData = localStorage.getItem(`video_${videoIds.nour}`);
                if (localData) savedData = JSON.parse(localData);
            } catch (e2) { }
        }
    } else {
        // Fallback to localStorage
        try {
            const localData = localStorage.getItem(`video_${videoIds.nour}`);
            if (localData) savedData = JSON.parse(localData);
        } catch (e) { }
    }

    const startSeconds = savedData.time || 0;

    try {
        if (player && typeof player.loadVideoById === 'function') {
            player.loadVideoById({
                videoId: videoIds.nour,
                startSeconds: startSeconds
            });
            console.log(`[Section Switch] Nour loaded from saved position: ${startSeconds}s`);
        }
    } catch (e) {
        console.error('[Section Switch] Error loading Nour video:', e);
    }
};

window.showAfra7Section = async function () {
    console.log('[Section Switch] Switching to Afra7 section');

    // Return existing promise if already initializing
    if (afra7InitPromise) {
        console.log('[Section Switch] Afra7 section initialization already in progress');
        return afra7InitPromise;
    }

    // Enhanced player readiness check
    if (!isPlayerReadyForSectionLegacy()) {
        console.warn('[Section Switch] Player not ready for section switching, waiting...');
        afra7InitPromise = new Promise(resolve => {
            const checkPlayerReady = setInterval(() => {
                if (isPlayerReadyForSectionLegacy()) {
                    clearInterval(checkPlayerReady);
                    resolve(window.showAfra7Section());
                }
            }, 300);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkPlayerReady);
                console.warn('[Section Switch] Afra7 section initialization timeout');
                afra7InitPromise = null;
                resolve();
            }, 10000);
        });

        return afra7InitPromise.finally(() => {
            afra7InitPromise = null;
        });
    }

    // Update current section
    window.currentSection = 'afra7';

    // Deactivate extra mode if active (extra mode only works on Home)
    if (window.ExtraMode && window.ExtraMode.isActive && window.ExtraMode.isActive()) {
        console.log('[Section Switch] Deactivating extra mode (not available on Afra7 section)');
        if (window.ExtraMode.deactivate) {
            window.ExtraMode.deactivate();
        }
    }
    // Also check for the other extra mode system
    if (window.deactivateExtraMode && typeof window.deactivateExtraMode === 'function') {
        window.deactivateExtraMode();
    }

    // Afra7 always starts from beginning (no saved time)
    const startSeconds = 0;

    try {
        if (player && typeof player.loadVideoById === 'function') {
            player.loadVideoById({
                videoId: videoIds.afra7,
                startSeconds: startSeconds
            });
            console.log('[Section Switch] Afra7 loaded from beginning (0s)');
        }
    } catch (e) {
        console.error('[Section Switch] Error loading Afra7 video:', e);
    }
};

// Toggle Button Functionality - Updated for Conditional Authentication (OLD - DISABLED)
const toggleButton = document.getElementById('toggle-button');
let currentVideoIndex = 0;
const videoNames = ['Home', 'Nour', 'Afra7'];

let togglePressTimer;
let toggleLongPress = false;
const TOGGLE_LONG_PRESS_DURATION = 2000; // 2 seconds

// Function to handle secure action (accessing codebank)
async function accessCodebank() {
    try {
        // Use AuthSyncManager to require authentication for codebank access

        if (typeof window.showAlternativeDashboard === 'function') {
            window.showAlternativeDashboard();
        }
    } catch (error) {
        console.error('Failed to access codebank:', error);
        // User cancelled authentication or it failed
        console.log('Codebank access cancelled');
    }
}

if (toggleButton) {
    toggleButton.addEventListener('mousedown', (e) => {
        toggleLongPress = false;
        togglePressTimer = setTimeout(() => {
            toggleLongPress = true;
            // Instead of direct redirect, use conditional authentication
            accessCodebank();
        }, TOGGLE_LONG_PRESS_DURATION);
    });

    toggleButton.addEventListener('mouseup', (e) => {
        clearTimeout(togglePressTimer);
    });
    toggleButton.addEventListener('mouseleave', (e) => {
        clearTimeout(togglePressTimer);
    });

    toggleButton.addEventListener('touchstart', (e) => {
        toggleLongPress = false;
        togglePressTimer = setTimeout(() => {
            toggleLongPress = true;
            // Instead of direct redirect, use conditional authentication
            accessCodebank();
        }, TOGGLE_LONG_PRESS_DURATION);
    }, { passive: true });

    toggleButton.addEventListener('touchend', (e) => {
        clearTimeout(togglePressTimer);
    }, { passive: true });
    toggleButton.addEventListener('touchcancel', (e) => {
        clearTimeout(togglePressTimer);
    }, { passive: true });

    toggleButton.addEventListener('click', (e) => {
        if (toggleLongPress) {
            // Prevent normal click if long press was triggered
            e.preventDefault();
            return;
        }
        // Normal press: switch between sections
        const currentTime = player && typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
        const nextVideoIndex = (currentVideoIndex + 1) % videoIds.length;

        // Save playback time and index locally (mirror-only, no auth)
        try {
            const key = `video_${videoIds[currentVideoIndex]}`;
            const data = {
                time: currentTime,
                index: player && typeof player.getPlaylistIndex === 'function' ? player.getPlaylistIndex() : 0
            };
            localStorage.setItem(key, JSON.stringify(data));
        } catch (_) { }

        currentVideoIndex = nextVideoIndex;

        // Load the new video/playlist; always start from the saved time or 0 if none saved
        let startSeconds = 0;
        let startIndex = 0;
        if (currentVideoIndex !== 2) {
            const savedDataStr = null;
            const savedData = savedDataStr ? JSON.parse(savedDataStr) : {};
            startSeconds = savedData.time || 0;
            startIndex = savedData.index || 0;
        }

        // Load the playlist for Home, or the single video for Nour and Afra7
        if (!player) return;
        if (currentVideoIndex === 1 || currentVideoIndex === 2) { // Nour or Afra7 (Single Video)
            if (typeof player.loadVideoById === 'function') {
                player.loadVideoById({
                    videoId: videoIds[currentVideoIndex],
                    startSeconds: startSeconds
                });
            }
        } else { // Home (Playlist)
            if (typeof player.loadPlaylist === 'function') {
                player.loadPlaylist({
                    listType: 'playlist',
                    list: videoIds[currentVideoIndex], // Use the playlist ID directly
                    index: startIndex, // Continue from the last saved index
                    startSeconds: startSeconds // Continue from the last saved time
                });
            }
        }

        // Update button text to show the next video's name
        toggleButton.textContent = videoNames[currentVideoIndex];
    });
}

// ===== SCREENSHOT HANDLER (Lines 4139-4427) =====
document.addEventListener('DOMContentLoaded', function () {
    // Function to update the monthly screenshot indicator
    function updateScreenshotIndicator() {
        try {
            const raw = localStorage.getItem("user_screenshots");
            const data = (function () {
                try { return raw ? JSON.parse(raw) : { count: 0, month: new Date().getMonth(), year: new Date().getFullYear() }; }
                catch (_) { return { count: 0, month: new Date().getMonth(), year: new Date().getFullYear() }; }
            })();


            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            // Reset if it's a new month
            if (data.month !== currentMonth || data.year !== currentYear) {
                data.count = 0;
                data.month = currentMonth;
                data.year = currentYear;
                localStorage.setItem("user_screenshots", JSON.stringify(data));
            }

            const count = data.count || 0;
            const indicator = document.getElementById('monthly-limit-indicator');
            const countSpan = document.getElementById('screenshot-count');

            if (indicator && countSpan) {
                countSpan.textContent = count;

                // Show indicator when user has taken at least one screenshot or is near limit
                if (count > 0 || count >= 8) {
                    indicator.style.display = 'block';

                    // Change color based on proximity to limit
                    if (count >= 10) {
                        indicator.style.background = 'rgba(255, 0, 0, 0.9)'; // Red when limit reached
                        indicator.innerHTML = '🚫 Limit reached!';
                    } else if (count >= 8) {
                        indicator.style.background = 'rgba(255, 165, 0, 0.9)'; // Orange when close
                        indicator.innerHTML = `⚠️ ${count}/10 this month`;
                    } else {
                        indicator.style.background = 'rgba(50, 205, 50, 0.9)'; // Green when safe
                        indicator.innerHTML = `📸 ${count}/10 this month`;
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to update screenshot indicator:', e);
        }
    }

    // Update indicator on page load
    updateScreenshotIndicator();

    // Listen for screenshot updates
    window.addEventListener('storage', function (e) {
        if (e.key === 'user_screenshots') {
            updateScreenshotIndicator();
        }
    });

    // Update every 5 seconds as backup
    setInterval(updateScreenshotIndicator, 5000);
});

// ===== TOUCH SHIELD (Lines 4206-4312) =====
(function () {
    const SHIELD_ID = 'global-touch-shield';

    function blockEvent(e) {
        // Disable shield when CodeBank panel is open
        if (window.shieldDisabled) {
            return;
        }
        // Allow events on counter container and its children
        const counterContainer = document.getElementById('counter-container');
        if (counterContainer && (e.target === counterContainer || counterContainer.contains(e.target))) {
            return; // Don't block
        }
        // stop everything else (capture phase)
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
    }

    function ensureShield() {
        let shield = document.getElementById(SHIELD_ID);
        if (!shield) {
            shield = document.createElement('div');
            shield.id = SHIELD_ID;
            shield.setAttribute('aria-hidden', 'true');
            // Make sure it is appended last in body so it's above everything
            document.body.appendChild(shield);
        }

        const eventsToBlock = [
            'click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup',
            'touchstart', 'touchend', 'touchmove', 'dblclick', 'contextmenu', 'wheel', 'keydown'
        ];

        // Remove previous listeners to avoid duplicates (safety)
        shield._shieldCleanup && shield._shieldCleanup();
        const listeners = [];
        eventsToBlock.forEach(evt => {
            const fn = (e) => blockEvent(e);
            shield.addEventListener(evt, fn, { passive: false, capture: true });
            listeners.push({ evt, fn });
        });
        // helper to remove listeners later
        shield._shieldCleanup = () => {
            listeners.forEach(({ evt, fn }) => shield.removeEventListener(evt, fn, { capture: true }));
            shield._shieldCleanup = null;
        };

        // Also protect against events that might target the iframe directly by blocking at document level
        // if the event target is the iframe or inside it (best-effort).
        if (!document._iframeProtectionInstalled) {
            document._iframeProtectionInstalled = true;
            eventsToBlock.forEach(evt => {
                document.addEventListener(evt, function (e) {
                    try {
                        const iframe = document.querySelector('#video-container iframe, .theatre-mode iframe, iframe.theatre-mode');
                        if (iframe && (e.target === iframe || iframe.contains && iframe.contains(e.target))) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            return false;
                        }
                    } catch (err) {
                        // cross-origin access may throw — ignore safely
                    }
                }, { passive: false, capture: true });
            });
        }
    }

    // Setup on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureShield);
    } else {
        ensureShield();
    }

    // Coordinate with CodeBank side panel
    window.addEventListener('codebank:opened', () => {
        window.shieldDisabled = true;
    });
    window.addEventListener('codebank:closed', () => {
        window.shieldDisabled = false;
    });

    // Observe DOM changes and re-ensure shield whenever an iframe is added
    const obs = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const n of m.addedNodes) {
                if (n && (n.tagName === 'IFRAME' || (n.querySelector && n.querySelector('iframe')))) {
                    // Re-apply shield in case iframe insertion changed stacking
                    ensureShield();
                    return;
                }
            }
        }
    });

    obs.observe(document.body, { childList: true, subtree: true });

    // Clean up on unload (defensive)
    window.addEventListener('beforeunload', () => {
        const shield = document.getElementById(SHIELD_ID);
        if (shield && shield._shieldCleanup) shield._shieldCleanup();
        obs.disconnect();
    });
})();

// ===== VIDEO CHANGE DETECTION (Lines 4316-4427) =====
// Enhanced video change detection for screenshots
(function () {
    function setupVideoChangeDetection(player) {
        let lastVideoId = null;

        // Function to check current video and update thumbnail
        function checkVideoChange() {
            try {
                if (player && typeof player.getVideoData === 'function') {
                    const videoData = player.getVideoData();
                    const currentVideoId = videoData?.video_id;

                    if (currentVideoId && currentVideoId !== lastVideoId) {
                        console.log('🎬 Video changed to:', currentVideoId);
                        lastVideoId = currentVideoId;

                        // Preload new video thumbnail for better screenshots
                        preloadVideoThumbnail(currentVideoId);

                        // Update iframe src for better background capture
                        updateIframeSrc(currentVideoId);
                    }
                }
            } catch (error) {
                console.warn('Error checking video change:', error);
            }
        }

        // Check for video changes every 2 seconds
        setInterval(checkVideoChange, 2000);

        // Also check on player state changes
        if (player) {
            player.addEventListener('onStateChange', (event) => {
                if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.BUFFERING) {
                    setTimeout(checkVideoChange, 1000); // Check after a delay
                }
            });
        }
    }

    // Preload video thumbnail for better screenshot quality
    function preloadVideoThumbnail(videoId) {
        if (!videoId) return;

        const thumbnailUrls = [
            `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        ];

        thumbnailUrls.forEach(url => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => console.log('✅ Thumbnail preloaded:', url);
            img.onerror = () => console.warn('❌ Thumbnail failed:', url);
            img.src = url;
        });
    }

    // Update iframe src for better background capture
    function updateIframeSrc(videoId) {
        const iframe = document.getElementById('yt-iframe');
        if (iframe && videoId) {
            // Update iframe src to ensure proper loading
            const currentSrc = iframe.src;
            const expectedSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&disablekb=1&modestbranding=1&rel=0&fs=0&iv_load_policy=3&loop=1&playlist=${videoId}`;

            if (currentSrc !== expectedSrc) {
                iframe.src = expectedSrc;
                console.log('🔄 Updated iframe src for better screenshot capture');
            }
        }
    }

    // Enhanced screenshot compatibility check
    function checkScreenshotCompatibility() {
        const issues = [];

        // Check if html2canvas is loaded
        if (typeof html2canvas === 'undefined') {
            issues.push('html2canvas library not loaded');
        }

        // Check if YouTube iframe exists
        const iframe = document.getElementById('yt-iframe');
        if (!iframe) {
            issues.push('YouTube iframe not found');
        }

        // Check if player exists
        if (typeof player === 'undefined' || !player) {
            issues.push('YouTube player not initialized');
        }

        // Check CORS support
        if (!('crossOrigin' in document.createElement('canvas'))) {
            issues.push('CORS not supported in this browser');
        }

        if (issues.length > 0) {
            console.warn('⚠️ Screenshot compatibility issues:', issues);
            return false;
        }

        console.log('✅ Screenshot compatibility check passed');
        return true;
    }

    // Initialize screenshot compatibility check
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(checkScreenshotCompatibility, 2000);
    });
})();
