/**
 * Collusion Detection Engine
 * 
 * Standalone anti-manipulation system.
 * 
 * MANDATORY RULES:
 * - Detects repeated opponents
 * - Detects alternating win patterns (win-trading)
 * - Detects IP/proximity conflicts
 * - Auto-disables rewards upon detection
 * - Logs zero-value records to Ledger
 * - PERSISTENT STATE (localStorage)
 */

import { ledgerKernel } from '../../../../ledger/local-transaction-ledger.js';

const CONFIG = {
    maxRepeatedOpponents: 3, // Max 3 matches vs same opponent in window for valued modes
    alternatingWinThreshold: 4, // Max 4 alternating outcome reversals
    dailyValuedMatchLimit: 20, // Max valued matches per day
    historyRetention: 100, // Keep last 100 matches
    suspicionExpiry: 86400000 // 24 hours
};

class CollusionEngine {
    constructor() {
        this.storageKey = 'collusion_engine_state';
        this.state = this.loadState();
    }

    // --- Persistence ---

    loadState() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.warn('[CollusionEngine] Failed to load state', e);
        }
        return {
            matchHistory: {}, // userId -> []
            suspiciousUsers: {}, // userId -> { reason, timestamp }
            dailyCounts: {} // userId_date -> count
        };
    }

    saveState() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (e) {
            console.warn('[CollusionEngine] Failed to save state', e);
        }
    }

    // --- Core API ---

    /**
     * Check if a match is allowed between two users
     * @returns { allowed: boolean, reason?: string, forceMsMode?: boolean }
     */
    checkMatchup(userId, opponentId, userIP, opponentIP) {
        // 1. Check if users are flagged
        if (this.isFlagged(userId)) return { allowed: true, forceMsMode: true, reason: 'User flagged' };
        if (this.isFlagged(opponentId)) return { allowed: true, forceMsMode: true, reason: 'Opponent flagged' };

        // 2. IP Proximity Check
        if (!this.checkIPProximity(userIP, opponentIP)) {
            this.flagSuspicious(userId, `IP Proximity with ${opponentId}`);
            return { allowed: true, forceMsMode: true, reason: 'IP Proximity detected' };
        }

        // 3. Repeated Opponent Check
        if (this.checkRepeatedOpponents(userId, opponentId)) {
            this.flagSuspicious(userId, `Excessive matches vs ${opponentId}`);
            return { allowed: true, forceMsMode: true, reason: 'Repeated opponent limit' };
        }

        return { allowed: true };
    }

    /**
     * Record match result and analyze for patterns
     */
    async recordMatch(userId, opponentId, result, mode, competitionId) {
        // Update history
        this.addToHistory(userId, { opponentId, result, mode, timestamp: Date.now(), competitionId });

        // Track daily limits for valued modes
        if (mode !== 'practice') {
            const key = `${userId}_${new Date().toISOString().split('T')[0]}`;
            this.state.dailyCounts[key] = (this.state.dailyCounts[key] || 0) + 1;

            if (this.state.dailyCounts[key] > CONFIG.dailyValuedMatchLimit) {
                this.flagSuspicious(userId, 'Daily limit exceeded');
            }
        }

        this.saveState();

        // Run deeper analysis
        await this.analyzePatterns(userId, opponentId);
    }

    /**
     * Check reward eligibility
     */
    isRewardEligible(userId) {
        if (this.isFlagged(userId)) return false;

        // Check daily limit
        const key = `${userId}_${new Date().toISOString().split('T')[0]}`;
        if ((this.state.dailyCounts[key] || 0) >= CONFIG.dailyValuedMatchLimit) return false;

        return true;
    }

    // --- Analysis ---

    async analyzePatterns(userId, opponentId) {
        const history = this.state.matchHistory[userId] || [];

        // Win Trading (Alternating Wins)
        const vsOpponent = history.filter(m => m.opponentId === opponentId && m.mode !== 'practice');
        if (vsOpponent.length >= CONFIG.alternatingWinThreshold) {
            const lastN = vsOpponent.slice(-CONFIG.alternatingWinThreshold);
            const results = lastN.map(m => m.result); // e.g. ['win', 'loss', 'win', 'loss']

            let isAlternating = true;
            for (let i = 1; i < results.length; i++) {
                if (results[i] === results[i - 1]) isAlternating = false; // Must flip every time
            }

            if (isAlternating) {
                this.flagSuspicious(userId, `Win trading detected with ${opponentId}`);
            }
        }
    }

    checkRepeatedOpponents(userId, opponentId) {
        const history = this.state.matchHistory[userId] || [];
        const recent = history.filter(m =>
            m.opponentId === opponentId &&
            m.mode !== 'practice' &&
            Date.now() - m.timestamp < 3600000 // 1 hour window
        );
        return recent.length >= CONFIG.maxRepeatedOpponents;
    }

    checkIPProximity(ip1, ip2) {
        if (!ip1 || !ip2) return true;
        if (ip1 === ip2) return false;
        // Simple subnet check /24
        const sub1 = ip1.split('.').slice(0, 3).join('.');
        const sub2 = ip2.split('.').slice(0, 3).join('.');
        return sub1 !== sub2;
    }

    // --- Actions ---

    addToHistory(userId, entry) {
        if (!this.state.matchHistory[userId]) this.state.matchHistory[userId] = [];
        this.state.matchHistory[userId].push(entry);
        if (this.state.matchHistory[userId].length > CONFIG.historyRetention) {
            this.state.matchHistory[userId].shift();
        }
    }

    async flagSuspicious(userId, reason) {
        if (this.isFlagged(userId)) return; // Already flagged

        console.warn(`[CollusionEngine] FLAGGING USER ${userId}: ${reason}`);

        this.state.suspiciousUsers[userId] = {
            reason,
            timestamp: Date.now()
        };
        this.saveState();

        // Log to Ledger (Amount 0)
        try {
            await ledgerKernel.appendTransaction({
                userId: userId,
                type: 'COLLUSION_DETECTED',
                asset: 'system',
                amount: 0,
                reason: reason,
                meta: {
                    source: 'CollusionEngine',
                    timestamp: Date.now()
                }
            });
        } catch (e) {
            console.error('[CollusionEngine] Failed to log to ledger', e);
        }

        window.dispatchEvent(new CustomEvent('user-flagged', {
            detail: { userId, reason }
        }));
    }

    isFlagged(userId) {
        const record = this.state.suspiciousUsers[userId];
        if (!record) return false;

        // Expiry check
        if (Date.now() - record.timestamp > CONFIG.suspicionExpiry) {
            delete this.state.suspiciousUsers[userId];
            this.saveState();
            return false;
        }
        return true;
    }
}

export const collusionEngine = new CollusionEngine();
