/**
 * Settings Management Module
 * Handles settings panel and user preferences
 */

export class SettingsManager {
    constructor() {
        this.initialized = false;
        this.settings = new Map();
    }

    async initialize() {
        if (this.initialized) return;

        try {
            console.log('⚙️ Initializing settings system...');

            // Load saved settings
            this.loadSettings();

            // Initialize settings UI
            this.initializeSettingsUI();

            // Initialize profile management
            this.initializeProfileManagement();

            // Initialize data management
            this.initializeDataManagement();

            this.initialized = true;
            console.log('✅ Settings initialized successfully');

        } catch (error) {
            console.error('❌ Settings initialization failed:', error);
            throw error;
        }
    }

    loadSettings() {
        // Load settings from localStorage
        const defaultSettings = {
            theme: 'dark',
            language: 'en',
            fontSize: 'medium',
            extraModeOnPlay: false,
            toastsEnabled: true
        };

        Object.keys(defaultSettings).forEach(key => {
            const saved = localStorage.getItem(`setting_${key}`);
            this.settings.set(key, saved !== null ? JSON.parse(saved) : defaultSettings[key]);
        });
    }

    saveSetting(key, value) {
        this.settings.set(key, value);
        localStorage.setItem(`setting_${key}`, JSON.stringify(value));

        // Dispatch setting change event
        window.dispatchEvent(new CustomEvent('setting:changed', {
            detail: { key, value }
        }));
    }

    initializeSettingsUI() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.checked = this.settings.get('theme') === 'dark';
            themeToggle.addEventListener('change', () => {
                const isDark = themeToggle.checked;
                this.saveSetting('theme', isDark ? 'dark' : 'light');
                this.applyTheme(isDark ? 'dark' : 'light');
            });
        }

        // Font size selector
        const fontSizeSelect = document.getElementById('font-size-select');
        if (fontSizeSelect) {
            fontSizeSelect.value = this.settings.get('fontSize');
            fontSizeSelect.addEventListener('change', () => {
                this.saveSetting('fontSize', fontSizeSelect.value);
                this.applyFontSize(fontSizeSelect.value);
            });
        }

        // Language selector
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.value = this.settings.get('language');
            languageSelect.addEventListener('change', () => {
                this.saveSetting('language', languageSelect.value);
                // Note: Full language implementation would require additional work
            });
        }

        // Extra mode toggle
        const extraModeToggle = document.getElementById('extra-mode-on-play');
        if (extraModeToggle) {
            extraModeToggle.checked = this.settings.get('extraModeOnPlay');
            extraModeToggle.addEventListener('change', () => {
                this.saveSetting('extraModeOnPlay', extraModeToggle.checked);
            });
        }

        // Toasts toggle
        const toastsToggle = document.getElementById('toasts-enabled');
        if (toastsToggle) {
            toastsToggle.checked = this.settings.get('toastsEnabled');
            toastsToggle.addEventListener('change', () => {
                this.saveSetting('toastsEnabled', toastsToggle.checked);
            });
        }
    }

    applyTheme(theme) {
        document.body.classList.toggle('light-theme', theme === 'light');
        document.body.classList.toggle('dark-theme', theme === 'dark');
    }

    applyFontSize(size) {
        document.body.classList.remove('font-small', 'font-medium', 'font-large');
        document.body.classList.add(`font-${size}`);
    }

    initializeProfileManagement() {
        const signinBtn = document.getElementById('signin-btn');
        const signoutBtn = document.getElementById('signout-btn');

        if (signinBtn) {
            signinBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleSignIn();
            });
        }

        if (signoutBtn) {
            signoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleSignOut();
            });
        }

        // Listen for auth state changes
        window.addEventListener('auth:verified', () => {
            this.updateProfileUI();
        });

        window.addEventListener('auth:signedOut', () => {
            this.updateProfileUI();
        });

        // Initial UI update
        this.updateProfileUI();
    }

    async handleSignIn() {
        // Disable Google Sign-In paths completely; rely on internal Auth only
        try {
            const btn = document.getElementById('signin-btn');
            if (btn) { btn.style.display = 'none'; btn.disabled = true; }
            window.dispatchEvent(new CustomEvent('auth:changed', { detail: { status: 'authenticated' } }));
        } catch (_) {}
    }

    async handleSignOut() {
        try {
            signoutBtn.disabled = true;
            signoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing out...';

            // Use available auth system
            if (window.auth && typeof window.auth.signOut === 'function') {
                await window.auth.signOut();
            } else {
                // Manual sign out
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userData');
                localStorage.removeItem('lastLoginTime');
                window.dispatchEvent(new CustomEvent('auth:signedOut'));
            }

            window.showToast('Signed out successfully', 'success');
        } catch (error) {
            console.error('Sign-out failed:', error);
            window.showToast('Sign-out failed', 'error');
        } finally {
            // Reset button state
            setTimeout(() => {
                signoutBtn.disabled = false;
                signoutBtn.innerHTML = 'Sign out';
            }, 2000);
        }
    }

    updateProfileUI() {
        const userData = JSON.parse(localStorage.getItem('userData') || 'null');
        const signedInSection = document.getElementById('signed-in');
        const notSignedInSection = document.getElementById('not-signed-in');
        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        const profileAvatar = document.getElementById('profile-avatar');

        if (userData && userData.email) {
            // Show signed in UI
            if (signedInSection) signedInSection.classList.remove('hidden');
            if (notSignedInSection) notSignedInSection.classList.add('hidden');

            // Update profile info
            if (profileName) profileName.textContent = userData.displayName || userData.email.split('@')[0];
            if (profileEmail) profileEmail.textContent = userData.email;
            if (profileAvatar) {
                if (userData.photoURL) {
                    profileAvatar.src = userData.photoURL;
                    profileAvatar.classList.remove('hidden');
                } else {
                    profileAvatar.classList.add('hidden');
                }
            }
        } else {
            // Show signed out UI
            if (signedInSection) signedInSection.classList.add('hidden');
            if (notSignedInSection) notSignedInSection.classList.remove('hidden');

            // Clear profile info
            if (profileName) profileName.textContent = '';
            if (profileEmail) profileEmail.textContent = '';
            if (profileAvatar) {
                profileAvatar.src = '';
                profileAvatar.classList.add('hidden');
            }
        }
    }

    initializeDataManagement() {
        // Clear storage button
        const clearBtn = document.getElementById('clear-storage');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
                    localStorage.clear();
                    window.showToast('Local data cleared', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                }
            });
        }

        // Export data button
        const exportBtn = document.getElementById('export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }
    }

    exportData() {
        try {
            const data = {
                settings: Object.fromEntries(this.settings),
                assets: {
                    codes: localStorage.getItem('asset-codes'),
                    silver: localStorage.getItem('asset-silver'),
                    gold: localStorage.getItem('asset-gold')
                },
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `codebank-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            window.showToast('Data exported successfully', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            window.showToast('Export failed', 'error');
        }
    }

    getSetting(key) {
        return this.settings.get(key);
    }

    setSetting(key, value) {
        this.saveSetting(key, value);
    }
}
