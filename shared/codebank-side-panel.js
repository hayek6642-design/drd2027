// CodeBank Side Panel - Embedded CodeBank UI Component
// Provides a slide-out panel that contains the CodeBank interface

class CodeBankSidePanel {
    constructor() {
        this.panel = null;
        this.isOpen = false;
        this.isInitialized = false;
        this.closeRequested = false;
        this.currentTab = 'overview';
        this.init();
    }

    async init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }

        // Wait for AuthBridge to be ready
        if (window.AuthBridge) {
            await new Promise(resolve => window.AuthBridge.onAuthReady(resolve));
        }

        this.createPanel();
        this.setupEventListeners();
        this.isInitialized = true;

        console.log('✅ CodeBank Side Panel initialized');

        try {
            const persisted = sessionStorage.getItem('codebank_panel_open');
            if (persisted === '1') {
                this.open();
            }
        } catch (_) {}
    }

    createPanel() {
        // Create overlay container
        this.panel = document.createElement('div');
        this.panel.id = 'codebank-overlay';
        this.panel.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            backdrop-filter: blur(20px);
            box-shadow: 0 0 0 rgba(0, 0, 0, 0);
            z-index: 9999;
            transition: opacity 0.25s ease;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            opacity: 0;
            pointer-events: none;
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
            <div id="panel-state-indicator" style="
                margin-right: 12px;
                padding: 6px 10px;
                border-radius: 999px;
                font-size: 12px;
                font-weight: 600;
                color: #10B981;
                background: rgba(16, 185, 129, 0.15);
                border: 1px solid rgba(16, 185, 129, 0.35);
            ">OPEN</div>
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

        // Create main content wrapper (overlay body above bottom gap)
        const body = document.createElement('div');
        body.id = 'codebank-overlay-body';
        body.style.cssText = `
            flex: 1;
            height: calc(100vh - 100px);
            overflow: hidden;
            display: flex;
            flex-direction: column;
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
                <i class="fas fa-music"></i> Nostaglia
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
        `;

        // Create content area
        const content = document.createElement('div');
        content.id = 'codebank-content';
        content.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        `;

        // Create persistent bottom gap
        const bottomGap = document.createElement('div');
        bottomGap.id = 'codebank-bottom-gap';
        bottomGap.style.cssText = `
            height: 100px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.35);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
        `;

        bottomGap.innerHTML = `
            <div id="cb-news-ticker" style="
                flex: 1;
                color: rgba(255,255,255,0.9);
                font-size: 12px;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                margin-right: 12px;
            ">System: CodeBank overlay active. Some controls are intentionally blocked.</div>
            <div style="display:flex; align-items:center; gap:14px;">
                <div id="three-way-toggle" style="
                    width: 90px;
                    height: 24px;
                    background: rgba(255,255,255,0.08);
                    border-radius: 12px;
                    position: relative;
                    border: 1px solid rgba(255,255,255,0.12);
                ">
                    <div class="toggle-track" style="
                        position:absolute; left:0; top:0; right:0; bottom:0;
                    "></div>
                    <div class="toggle-handle" style="
                        position:absolute; top:2px; left:35px;
                        width:20px; height:20px; border-radius:50%;
                        background: linear-gradient(135deg, #FF6B35, #8B5CF6);
                        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                        transition: left 0.3s cubic-bezier(.4,2,.6,1);
                    "></div>
                </div>
                <button id="extra-mode-status" title="Extra Mode can only be controlled from the main channel" style="
                    background: rgba(255,255,255,0.08);
                    color: rgba(255,255,255,0.7);
                    border: 1px solid rgba(255,255,255,0.12);
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 12px;
                    cursor: not-allowed;
                " disabled>Extra Mode (read-only)</button>
            </div>
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

        // Assemble overlay
        body.appendChild(tabNav);
        body.appendChild(content);
        this.panel.appendChild(header);
        this.panel.appendChild(body);
        this.panel.appendChild(bottomGap);
        document.body.appendChild(this.panel);

        // Setup tab switching
        this.setupTabNavigation();
    }

    setupEventListeners() {
        // Close button
        const closeBtn = this.panel.querySelector('#close-panel-btn');
        closeBtn.addEventListener('click', () => { this.closeRequested = true; this.close(); });

        // Extra Mode status reflect (read-only)
        const extraStatusBtn = this.panel.querySelector('#extra-mode-status');
        if (extraStatusBtn) {
            extraStatusBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const ticker = this.panel.querySelector('#cb-news-ticker');
                if (ticker) {
                    ticker.textContent = 'Extra Mode can only be controlled from the main channel.';
                }
            });
        }

        // Sticky mode: do not close on outside click
        window.__CODEBANK_STICKY__ = true;
        document.addEventListener('click', (e) => {
            if (window.__CODEBANK_STICKY__ === false) {
                if (this.isOpen && !this.panel.contains(e.target) && !e.target.closest('#codebank-toggle-btn')) {
                    this.close();
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (window.__CODEBANK_STICKY__ === false && e.key === 'Escape' && this.isOpen) {
                this.closeRequested = true;
                this.close();
            }
        });

        const observer = new MutationObserver(() => {
            if (this.isOpen && !this.closeRequested) {
                this.panel.style.opacity = '1';
                this.panel.style.pointerEvents = 'auto';
            }
        });
        observer.observe(this.panel, { attributes: true, attributeFilter: ['style', 'class'] });
        this._observer = observer;
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
            default:
                content.innerHTML = '<div style="text-align: center; padding: 40px;">Tab not found</div>';
        }
    }

    async loadOverviewTab() {
        // Get user data from AuthBridge
        const user = window.AuthBridge?.getCurrentUser();
        const jwt = window.AuthBridge?.getJWT();

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

    async handleReset() {
        const confirmed = confirm(`⚠️ Attention!

You are about to reset your account.
All your assets, history, rewards, and data will be permanently deleted.
This action cannot be undone.

Are you sure you want to continue?`);

        if (!confirmed) return;

        try {
            const response = await fetch('/api/auth/reset-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
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
            console.warn('🚫 [SidePanel] Reload after reset BLOCKED to prevent reload loop');
            // window.location.reload(); // DISABLED — use manual refresh instead

        } catch (error) {
            console.error('Reset failed:', error);
            alert('Reset failed. Please try again.');
        }
    }

    open() {
        if (this.panel && !this.isOpen) {
            this.panel.style.opacity = '1';
            this.panel.style.pointerEvents = 'auto';
            this.isOpen = true;
            try { sessionStorage.setItem('codebank_panel_open', '1') } catch (_) {}

            const indicator = this.panel.querySelector('#panel-state-indicator');
            if (indicator) {
                indicator.textContent = 'OPEN';
                indicator.style.color = '#10B981';
                indicator.style.background = 'rgba(16, 185, 129, 0.15)';
                indicator.style.border = '1px solid rgba(16, 185, 129, 0.35)';
            }

            // Reflect bottom gap state for Extra Mode
            const extraStatusBtn = this.panel.querySelector('#extra-mode-status');
            if (extraStatusBtn) {
                const active = !!(window.extraModeActive || (window.ExtraMode && window.ExtraMode.isActive && window.ExtraMode.isActive()));
                extraStatusBtn.textContent = active ? 'EXTRA ACTIVE (read-only)' : 'Extra Mode (main channel only)';
            }

            // Load current tab content
            this.switchTab(this.currentTab);

            // Dispatch event
            window.dispatchEvent(new CustomEvent('codebank:opened'));
        }
    }

    close() {
        if (this.panel && this.isOpen) {
            if (!this.closeRequested) {
                return;
            }
            this.panel.style.opacity = '0';
            this.panel.style.pointerEvents = 'none';
            this.isOpen = false;
            this.closeRequested = false;
            try { sessionStorage.setItem('codebank_panel_open', '0') } catch (_) {}

            const indicator = this.panel.querySelector('#panel-state-indicator');
            if (indicator) {
                indicator.textContent = 'CLOSED';
                indicator.style.color = '#EF4444';
                indicator.style.background = 'rgba(239, 68, 68, 0.15)';
                indicator.style.border = '1px solid rgba(239, 68, 68, 0.35)';
            }

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

// Create singleton instance
const codeBankSidePanel = new CodeBankSidePanel();

// Export for module use
export { codeBankSidePanel as default };

// Also expose globally for non-module access
window.CodeBankSidePanel = codeBankSidePanel;
