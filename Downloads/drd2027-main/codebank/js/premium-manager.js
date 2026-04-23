// Premium Manager for handling YouTube Premium verification and status
// Merged: Firebase integration + fetch verification + localStorage fallback

import { showToast } from './utils.js'; // utils.js is in same folder
 
// Firebase Firestore removed — use localStorage and optional verifyUrl

export class PremiumManager {
    constructor({ verifyUrl } = {}) {
        this.verifyUrl = verifyUrl;
        this.checkInterval = null;
        this.isPremium = false;
        this.premiumData = { active: false };
        this.initialize();
    }

    async initialize() {
        if (window.Auth || window.authHelper) {
            await this.checkPremiumStatus();
        } else {
            this.updateUI();
        }
        // Start auto checks if verifyUrl provided
        if (this.verifyUrl) {
            this.startAutoChecks();
        }
    }

    // Check premium status from localStorage (primary)
    async checkPremiumStatus() {
        try {
            const data = this.premiumData || {};
            this.isPremium = !!(data.active && data.expiresAt && new Date(data.expiresAt) > new Date());
            this.updateUI();
            return this.isPremium;
        } catch (error) {
            console.error('Error in checkPremiumStatus:', error);
            this.isPremium = false;
            this.updateUI();
            return false;
        }
    }

    // Fetch-based verification (from codebank, alternative/fallback)
    async verifyPremium() {
        if (!this.verifyUrl) return { premium: false };
        try {
            const response = await fetch(this.verifyUrl);
            const data = await response.json();
            
            if (data.premium === false) {
                this.premiumData.active = false;
            }
            
            // Sync with isPremium if needed
            if (data.premium && !this.isPremium) {
                this.isPremium = true;
                this.updateUI();
            }
            return data;
        } catch (error) {
            console.error('Premium verification failed:', error);
            return { premium: false };
        }
    }

    // Grant a month of premium (manual, from codebank)
    grantMonth() {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        
        this.premiumData = {
            active: true,
            expiresAt: expiresAt.toISOString()
        };
        
        this.isPremium = this.premiumData.active && new Date(this.premiumData.expiresAt) > new Date();
        this.updateUI();
        this.startAutoChecks();
    }

    // return combined premium state (do not shadow the property this.isPremium)
    isPremiumActive() {
        if (this.isPremium) return true; // From Supabase
        if (!this.premiumData.expiresAt) return false;
        return this.premiumData.active && new Date(this.premiumData.expiresAt) > new Date();
    }

    updateUI() {
        // Update premium button
        const premiumBtn = document.getElementById('premium-btn');
        if (premiumBtn) {
            premiumBtn.innerHTML = this.isPremium 
                ? '<i class="fas fa-crown text-yellow-500"></i> Premium Active'
                : '<i class="fas fa-crown"></i> Get Premium';
            
            premiumBtn.className = this.isPremium
                ? 'btn btn-premium active'
                : 'btn btn-premium';
        }

        // Update premium features
        document.querySelectorAll('.premium-feature').forEach(feature => {
            if (this.isPremium) {
                feature.classList.remove('disabled', 'locked');
                feature.title = 'Premium feature';
            } else {
                feature.classList.add('disabled', 'locked');
                feature.title = 'Requires premium subscription';
            }
        });
    }

    async refreshStatus() {
        if (window.Auth || window.authHelper) {
            await this.checkPremiumStatus();
        } else {
            this.isPremium = false;
            this.updateUI();
        }
        // Also run fetch verify if available
        if (this.verifyUrl) {
            await this.verifyPremium();
        }
    }

    // Start auto checks (from codebank, for fetch)
    startAutoChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        // Verify immediately
        if (this.verifyUrl) {
            this.verifyPremium();
        }

        // Then verify daily
        this.checkInterval = null;
    }

    stopAutoChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    // Upgrade to premium via Firebase Firestore (from yt-coder)
    async upgradeToPremium() {
        if (this.isPremium) {
            showToast('You are already a premium member!', 'info');
            return;
        }

        try {
            const user = await getCurrentUser();
            if (!user) {
                showToast('Please log in first', 'error');
                return;
            }

            if (!db) {
                showToast('Database not available', 'error');
                return;
            }

            // Process premium upgrade
            const uid = user.id || user.uid || user.uid_raw || null;
            if (!uid) {
                showToast('User ID not found', 'error');
                return;
            }

            const userDocRef = doc(db, 'profiles', uid);
            await updateDoc(userDocRef, { is_premium: true });

            this.isPremium = true;
            this.updateUI();
            showToast('Successfully upgraded to premium!', 'success');
            // Also update localStorage
            this.grantMonth();
        } catch (error) {
            console.error('Error upgrading to premium:', error);
            showToast('Failed to upgrade to premium', 'error');
        }
    }
}

const premiumManager = new PremiumManager();
export default premiumManager;
