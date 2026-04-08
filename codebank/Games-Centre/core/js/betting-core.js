/**
 * Competition Reward System - Islamic Compliant
 * 
 * ISLAMIC COMPLIANCE RULES (MANDATORY):
 * ✅ Service-based fees (NOT gambling stakes)
 * ✅ System reward pool (NOT zero-sum)
 * ✅ Rewards ≠ Collected fees
 * ✅ No player-to-player asset transfer
 * ✅ Collusion detection and prevention
 * ✅ Unlimited zero-value play allowed
 * 
 * ARCHITECTURE RULES (MANDATORY):
 * ✅ Assets Bus = Source of truth for balances
 * ✅ Ledger = Immutable event log (witness only)
 * ✅ Neon DB = Persistence layer
 * 
 * ❌ Ledger does NOT modify balances
 * ❌ Game logic does NOT touch balances
 * ❌ UI does NOT modify balances
 */

import { ledgerKernel } from '../../../../ledger/local-transaction-ledger.js';
import { assetsBus } from './assets-bus-adapter.js';
import { csa, COMPETITION_STATUS } from './competition-state.js';
import { collusionEngine } from './collusion-engine.js';

// Competition states
const COMPETITION_STATUS = {
    PENDING: 'pending',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    DISPUTED: 'disputed'
};

// Competition modes - Islamic Compliant
const COMPETITION_MODES = {
    // Zero-value mode (unlimited free play)
    PRACTICE: {
        id: 'practice',
        name: 'Practice Mode',
        serviceFee: 0,
        systemReward: 0,
        features: ['solo_play'],
        unlimited: true
    },

    // Mode A - Solo / No Social Interaction
    MODE_A: {
        id: 'mode_a',
        name: 'Solo Competition',
        serviceFee: 100,      // Service fee (codes)
        systemReward: 210,    // System pool reward (codes)
        features: ['solo_play', 'minimal_services'],
        serviceLevel: 'minimal',
        description: 'Solo play with minimal services'
    },

    // Mode B - Text Chat Enabled
    MODE_B: {
        id: 'mode_b',
        name: 'Social Competition',
        serviceFee: 500,      // Service fee (codes)
        systemReward: 1050,   // System pool reward (codes)
        features: ['multiplayer', 'text_chat', 'sync_services'],
        serviceLevel: 'medium',
        description: 'Multiplayer with text chat'
    },

    // Mode C - Full Services (Text + Audio + Video)
    MODE_C: {
        id: 'mode_c',
        name: 'Premium Competition',
        serviceFee: 1000,     // Service fee (codes)
        systemReward: 2100,   // System pool reward (codes)
        features: ['multiplayer', 'text_chat', 'audio_chat', 'video_chat', 'webrtc', 'moderation'],
        serviceLevel: 'high',
        description: 'Full-featured competition with audio/video'
    }
};

// Legacy game modes for backward compatibility
const GAME_MODES = {
    PRACTICE: 'practice',
    SOLO_VS_AI: 'solo_ai',
    PVP: 'pvp',
    TOURNAMENT: 'tournament'
};

/**
 * Competition Escrow System - Islamic Compliant
 * 
 * Handles service fee collection and system reward distribution.
 * ❗ This is NOT a betting escrow - fees are SERVICE payments.
 * ❗ Rewards come from SYSTEM POOL, not other players' fees.
 */
class CompetitionEscrow {
    constructor(betId, participants, amount, asset = 'code') {
        this.betId = betId;
        this.participants = participants;
        this.totalAmount = amount;
        this.asset = asset;
        this.locked = false;
        this.createdAt = Date.now();
        this.lockReferences = []; // Asset Bus lock IDs
    }

    /**
     * Collect service fees via Assets Bus (NOT Ledger!)
     * 
     * ❗ CRITICAL: These are SERVICE FEES, not gambling stakes.
     * The fee is for platform services (chat, sync, moderation, etc.)
     */
    async lockFunds() {
        if (this.locked) {
            throw new Error('Funds already locked');
        }

        const lockResults = [];

        for (const participant of this.participants) {
            try {
                // ✅ CORRECT: Ask Assets Bus to lock balance
                const lockResult = await assetsBus.lockBalance(
                    participant.userId,
                    this.asset,
                    participant.amount,
                    {
                        reason: 'bet_escrow',
                        betId: this.betId,
                        timestamp: Date.now()
                    }
                );

                if (!lockResult.success) {
                    throw new Error(lockResult.error || 'Failed to lock balance');
                }

                // Store lock reference from Assets Bus
                this.lockReferences.push({
                    userId: participant.userId,
                    lockId: lockResult.lockId,
                    amount: participant.amount
                });

                // ✅ CORRECT: Ledger only RECORDS the service fee (doesn't modify balance)
                await ledgerKernel.appendTransaction({
                    userId: participant.userId,
                    type: 'COMPETITION_SERVICE_FEE',
                    asset: this.asset,
                    amount: 0, // ❗ Zero because Ledger doesn't modify balance
                    reason: `Service fee for competition ${this.betId}`,
                    meta: {
                        competitionId: this.betId,
                        serviceFee: true,
                        locked: true,
                        lockId: lockResult.lockId, // Reference to Assets Bus lock
                        actualAmount: participant.amount, // For audit trail
                        compliance: 'islamic_compliant'
                    }
                });

                lockResults.push({
                    userId: participant.userId,
                    success: true
                });
            } catch (error) {
                // Rollback any successful locks
                await this.rollbackLocks(lockResults.filter(r => r.success));
                throw new Error(`Failed to lock funds for ${participant.userId}: ${error.message}`);
            }
        }

        this.locked = true;
        return { success: true, lockReferences: this.lockReferences };
    }

    /**
     * Rollback locks via Assets Bus
     */
    async rollbackLocks(successfulLocks) {
        for (const lock of this.lockReferences) {
            try {
                // ✅ CORRECT: Ask Assets Bus to unlock
                await assetsBus.unlockBalance(lock.lockId);

                // ✅ Ledger records the rollback
                await ledgerKernel.appendTransaction({
                    userId: lock.userId,
                    type: 'BET_ROLLBACK',
                    asset: this.asset,
                    amount: 0, // Zero - Ledger doesn't modify
                    reason: `Rollback escrow lock for ${this.betId}`,
                    meta: {
                        betId: this.betId,
                        lockId: lock.lockId,
                        rollback: true
                    }
                });
            } catch (error) {
                console.error(`Failed to rollback lock for ${lock.userId}:`, error);
            }
        }
        this.lockReferences = [];
    }

    /**
     * Settle competition and distribute system rewards
     * 
     * ❗ CRITICAL ISLAMIC COMPLIANCE:
     * - Service fees go to Assets Bus (platform owner)
     * - Winner receives from SYSTEM REWARD POOL (NOT other players' fees)
     * - This is NOT a zero-sum game
     */
    async settleBet(winnerId, winAmount) {
        if (!this.locked) {
            throw new Error('Cannot settle unlocked escrow');
        }

        try {
            // ✅ CORRECT: Assets Bus settles the competition
            // Service fees are collected, system reward is distributed
            const settlementResult = await assetsBus.settleBet({
                betId: this.betId,
                lockReferences: this.lockReferences,
                winnerId,
                winAmount,
                asset: this.asset,
                isSystemReward: true // Flag that reward comes from system pool
            });

            if (!settlementResult.success) {
                throw new Error(settlementResult.error || 'Settlement failed');
            }

            // ✅ Ledger records the system reward (doesn't modify balance)
            await ledgerKernel.appendTransaction({
                userId: winnerId,
                type: 'COMPETITION_SYSTEM_REWARD',
                asset: this.asset,
                amount: 0, // Zero - Ledger is witness only
                reason: `System reward for competition ${this.betId}`,
                meta: {
                    competitionId: this.betId,
                    systemReward: true,
                    actualRewardAmount: winAmount, // For audit
                    settlementId: settlementResult.settlementId,
                    compliance: 'islamic_compliant',
                    source: 'system_reward_pool'
                }
            });

            // Record service fee payment for non-winners
            // ❗ These are NOT losses - they are SERVICE FEES PAID
            for (const participant of this.participants) {
                if (participant.userId !== winnerId) {
                    await ledgerKernel.appendTransaction({
                        userId: participant.userId,
                        type: 'COMPETITION_SERVICE_FEE_COMPLETED',
                        asset: this.asset,
                        amount: 0, // Zero - Ledger is witness only
                        reason: `Service fee paid for competition ${this.betId}`,
                        meta: {
                            competitionId: this.betId,
                            serviceFee: true,
                            paidAmount: participant.amount,
                            settlementId: settlementResult.settlementId,
                            compliance: 'islamic_compliant'
                        }
                    });
                }
            }

            this.locked = false;
            this.lockReferences = [];

            return { success: true, settlementId: settlementResult.settlementId };
        } catch (error) {
            console.error('[BetEscrow] Settlement failed:', error);
            throw error;
        }
    }

    /**
     * Refund all participants via Assets Bus
     */
    async refund() {
        if (!this.locked) {
            throw new Error('Cannot refund unlocked escrow');
        }

        try {
            // ✅ CORRECT: Assets Bus handles refunds
            for (const lock of this.lockReferences) {
                await assetsBus.unlockBalance(lock.lockId);

                // ✅ Ledger records refund
                await ledgerKernel.appendTransaction({
                    userId: lock.userId,
                    type: 'BET_REFUND',
                    asset: this.asset,
                    amount: 0, // Zero - Ledger doesn't modify
                    reason: `Bet refund for ${this.betId}`,
                    meta: {
                        betId: this.betId,
                        refund: true,
                        refundedAmount: lock.amount,
                        lockId: lock.lockId
                    }
                });
            }

            this.locked = false;
            this.lockReferences = [];
            return { success: true };
        } catch (error) {
            console.error('[BetEscrow] Refund failed:', error);
            throw error;
        }
    }

    getStatus() {
        return {
            betId: this.betId,
            locked: this.locked,
            participants: this.participants,
            totalAmount: this.totalAmount,
            asset: this.asset,
            createdAt: this.createdAt,
            lockReferences: this.lockReferences
        };
    }
}

/**
 * Main Competition Core Manager - Islamic Compliant
 * 
 * Manages competitions with service-based fees and system pool rewards.
 */
class CompetitionCore {
    constructor() {
        this.escrows = new Map();

        // Legacy support maps (mapped from CSA where possible)
        this.activeCompetitions = new Map();
        this.competitionHistory = [];

        this.maxServiceFee = 10000;
        this.minServiceFee = 0;

        // Initialize CSA Recovery
        this.initRecovery();

        // Listen for user flagged events to cancel/restrict
        window.addEventListener('user-flagged', (e) => this.handleUserFlagged(e.detail));
    }

    async initRecovery() {
        console.log('[CompetitionCore] Recovering state from CSA...');
        try {
            const active = await csa.getActiveCompetitions();
            for (const comp of active) {
                console.log(`[CompetitionCore] Restored competition ${comp.competitionId} in status ${comp.status}`);
                this.activeCompetitions.set(comp.competitionId, comp);

                // Re-hydrate Escrow for active competitions
                // Only if locks were potentially taken (status >= LOCKING)
                if (['LOCKING', 'LOCKED', 'RUNNING', 'SETTLING'].includes(comp.status)) {
                    const participants = comp.players.map(p => ({
                        userId: p.userId,
                        amount: p.serviceFee
                    }));

                    const asset = comp.asset || 'code';
                    // Re-calculate totalFees from state
                    const totalFees = participants.reduce((sum, p) => sum + p.amount, 0);

                    const escrow = new CompetitionEscrow(comp.competitionId, participants, totalFees, asset);

                    // Restore lock references
                    escrow.lockReferences = comp.players
                        .filter(p => p.lockId)
                        .map(p => ({
                            userId: p.userId,
                            lockId: p.lockId,
                            amount: p.serviceFee
                        }));

                    if (escrow.lockReferences.length > 0) {
                        escrow.locked = true;
                    }

                    this.escrows.set(comp.competitionId, escrow);
                    console.log(`[CompetitionCore] Hydrated escrow for ${comp.competitionId}`);
                }
            }
        } catch (e) {
            console.error('[CompetitionCore] Recovery failed', e);
        }
    }

    handleUserFlagged({ userId, reason }) {
        console.warn(`[CompetitionCore] User flagged: ${userId}.`);
    }

    /**
     * Get competition mode configuration
     */
    getCompetitionMode(modeId) {
        const modes = Object.values(COMPETITION_MODES);
        return modes.find(m => m.id === modeId) || COMPETITION_MODES.PRACTICE;
    }

    /**
     * Validate competition mode and get fee/reward amounts
     */
    validateCompetitionMode(modeId, customFee = null) {
        const mode = this.getCompetitionMode(modeId);

        // If custom fee provided, validate it
        const serviceFee = customFee !== null ? customFee : mode.serviceFee;
        const systemReward = customFee !== null ? customFee * 2.1 : mode.systemReward;

        if (serviceFee < this.minServiceFee) {
            throw new Error(`Minimum service fee is ${this.minServiceFee}`);
        }

        if (serviceFee > this.maxServiceFee) {
            throw new Error(`Maximum service fee is ${this.maxServiceFee}`);
        }

        return { mode, serviceFee, systemReward };
    }

    /**
     * Create a new competition (using Assets Bus)
     * 
     * ❗ ISLAMIC COMPLIANCE:
     * - Collects SERVICE FEES (not gambling stakes)
     * - Winner receives from SYSTEM POOL (not other players' fees)
     */
    async createBet(config) {
        const {
            players,
            gameId,
            gameMode = GAME_MODES.PVP,
            competitionMode = 'practice',
            asset = 'code',
            metadata = {}
        } = config;

        if (!players || players.length < 1) throw new Error('At least one player required');

        // 1. COLLUSION CHECK
        if (players.length === 2 && competitionMode !== 'practice') {
            const check = collusionEngine.checkMatchup(
                players[0].userId,
                players[1].userId,
                metadata.hostIP,
                metadata.opponentIP
            );
            if (!check.allowed) {
                return { success: false, error: `Matchup restricted: ${check.reason}` };
            }
        }

        // 2. MODE CONFIG & FEES
        const modeConfig = this.getCompetitionMode(competitionMode);
        let serviceFee = competitionMode === 'practice' ? 0 : modeConfig.serviceFee;
        let systemReward = competitionMode === 'practice' ? 0 : modeConfig.systemReward;

        // Custom amounts override
        if (players[0]?.amount !== undefined && competitionMode !== 'practice') {
            const validation = this.validateCompetitionMode(competitionMode, players[0].amount);
            serviceFee = validation.serviceFee;
            systemReward = validation.systemReward;
        }

        const updatedPlayers = players.map(p => ({ ...p, amount: serviceFee }));
        const totalFees = updatedPlayers.reduce((sum, p) => sum + p.amount, 0);

        // 3. BALANCE & ELIGIBILITY CHECK
        for (const player of updatedPlayers) {
            // Balance Check
            const balance = await assetsBus.getBalance(player.userId, asset);
            if (balance < player.amount) throw new Error(`Insufficient ${asset} balance for ${player.userId}`);

            // Collusion Engine Eligibility
            if (competitionMode !== 'practice' && !collusionEngine.isRewardEligible(player.userId)) {
                throw new Error(`User ${player.userId} is not eligible for rewards.`);
            }
        }

        // 4. CSA: CREATE STATE (Created)
        // We use a robust ID generation
        const competitionId = this.generateBetId(updatedPlayers, gameId);

        // Idempotency check handled by db constraint usually, but we assume unique ID per request
        try {
            await csa.create({
                competitionId,
                gameId,
                mode: competitionMode,
                asset, // Persist asset type
                players: updatedPlayers.map(p => ({
                    userId: p.userId,
                    serviceFee: p.amount,
                    joinedAt: Date.now()
                })),
                reward: { source: 'SYSTEM_POOL', amount: systemReward }
            });
        } catch (e) {
            return { success: false, error: 'CSA Creation Failed: ' + e.message };
        }

        // 5. CSA: LOCKING
        await csa.transition(competitionId, COMPETITION_STATUS.LOCKING);

        const escrow = new CompetitionEscrow(competitionId, updatedPlayers, totalFees, asset);
        this.escrows.set(competitionId, escrow);

        if (serviceFee > 0) {
            const lockResult = await escrow.lockFunds();
            if (!lockResult.success) {
                await csa.transition(competitionId, COMPETITION_STATUS.CANCELLED, { reason: lockResult.error });
                return { success: false, error: lockResult.error };
            }
            // Update lock references in CSA
            for (const ref of lockResult.lockReferences) {
                await csa.updatePlayerLock(competitionId, ref.userId, ref.lockId);
            }
        }

        // 6. CSA: LOCKED -> RUNNING
        await csa.transition(competitionId, COMPETITION_STATUS.LOCKED);
        await csa.transition(competitionId, COMPETITION_STATUS.RUNNING);

        // Sync local cache
        const finalState = await csa.get(competitionId);
        this.activeCompetitions.set(competitionId, finalState);

        // Ledger Log
        await ledgerKernel.appendTransaction({
            userId: 'SYSTEM',
            type: 'COMPETITION_CREATED',
            asset,
            amount: 0,
            reason: `Competition created: ${competitionId}`,
            meta: { competitionId, mode: competitionMode, players: updatedPlayers.map(p => p.userId) }
        });

        window.dispatchEvent(new CustomEvent('competition-created', {
            detail: { competitionId, competition: finalState }
        }));

        return { success: true, betId: competitionId, bet: finalState };
    }

    /**
     * Process competition result (via Assets Bus)
     * 
     * ❗ ISLAMIC COMPLIANCE:
     * - Winner receives SYSTEM REWARD (not other players' fees)
     * - Practice mode: no fees, no rewards
     */
    async processBetResult(betId, result) {
        // 1. CSA: Validate State
        let competition = await csa.get(betId);
        if (!competition) {
            // Fallback for tests/legacy logic if not found in DB
            competition = this.activeCompetitions.get(betId);
            if (!competition) return { success: false, error: 'Competition not found' };
        }

        if (competition.status === COMPETITION_STATUS.SETTLED) {
            return { success: true, result: competition.result, idempotent: true };
        }

        // 2. CSA: Transition to SETTLING
        await csa.transition(betId, COMPETITION_STATUS.SETTLING);

        const escrow = this.escrows.get(betId);
        if (!escrow) {
            // If we really lost escrow in memory, we might need a way to restore it from CSA data?
            // For now, fail safe.
            await csa.transition(betId, COMPETITION_STATUS.DISPUTED, { error: 'Escrow object missing' });
            return { success: false, error: 'Escrow object missing in memory' };
        }

        const { winnerId, isDraw } = result;

        // 3. COLLUSION ENGINE: Record Match
        const players = competition.players || [];
        if (players.length === 2) {
            const m = competition.mode || 'unknown'; // Ensure mode is present
            await collusionEngine.recordMatch(
                players[0].userId, players[1].userId,
                isDraw ? 'draw' : (winnerId === players[0].userId ? 'win' : 'loss'),
                m, betId
            );
            await collusionEngine.recordMatch(
                players[1].userId, players[0].userId,
                isDraw ? 'draw' : (winnerId === players[1].userId ? 'win' : 'loss'),
                m, betId
            );
        }

        try {
            if (isDraw) {
                await escrow.refund();
                await csa.transition(betId, COMPETITION_STATUS.SETTLED, { result: { draw: true } });
            } else {
                if (competition.mode === 'practice') {
                    await csa.transition(betId, COMPETITION_STATUS.SETTLED, { result });
                } else {
                    await escrow.settleBet(winnerId, competition.reward.amount);
                    await csa.transition(betId, COMPETITION_STATUS.SETTLED, {
                        result: { winnerId, payout: competition.reward.amount }
                    });
                }
                this.updatePlayerStats(betId, result);
            }

            // Ledger Log
            await ledgerKernel.appendTransaction({
                userId: 'SYSTEM',
                type: 'BET_COMPLETED',
                asset: 'code',
                amount: 0,
                reason: `Competition completed: ${betId}`,
                meta: { betId, result }
            });

            this.competitionHistory.push(competition);
            this.activeCompetitions.delete(betId);
            this.escrows.delete(betId);

            window.dispatchEvent(new CustomEvent('competition-completed', { detail: { betId, result } }));
            return { success: true, result };

        } catch (error) {
            console.error('Failed to process competition result:', error);
            await csa.transition(betId, COMPETITION_STATUS.DISPUTED, { error: error.message });
            return { success: false, error: error.message };
        }
    }

    async cancelCompetition(betId, reason = 'Cancelled by user') {
        const competition = this.activeCompetitions.get(betId);
        if (!competition) {
            throw new Error('Competition not found');
        }

        const escrow = this.escrows.get(betId);

        try {
            await escrow.refund();
            competition.status = COMPETITION_STATUS.CANCELLED;
            competition.cancelledAt = Date.now();
            competition.cancelReason = reason;

            this.competitionHistory.push(competition);
            this.activeCompetitions.delete(betId);
            this.escrows.delete(betId);

            return { success: true };
        } catch (error) {
            console.error('Failed to cancel competition:', error);
            return { success: false, error: error.message };
        }
    }

    getActiveCompetitions(userId) {
        const userCompetitions = [];
        for (const competition of this.activeCompetitions.values()) {
            if (competition.players.some(p => p.userId === userId)) {
                userCompetitions.push(competition);
            }
        }
        return userCompetitions;
    }

    getCompetitionHistory(userId, limit = 50) {
        return this.competitionHistory
            .filter(c => c.players.some(p => p.userId === userId))
            .slice(-limit)
            .reverse();
    }

    getUserCompetitionStats(userId) {
        const userCompetitions = this.competitionHistory.filter(c =>
            c.players.some(p => p.userId === userId)
        );

        const wins = userCompetitions.filter(c =>
            c.result && c.result.winnerId === userId
        ).length;

        const draws = userCompetitions.filter(c =>
            c.result && c.result.draw
        ).length;

        // Note: Loss count includes competitions where service fee was paid but no reward won
        const lossCount = userCompetitions.length - wins - draws;

        const totalServiceFees = userCompetitions.reduce((sum, c) => {
            const player = c.players.find(p => p.userId === userId);
            return sum + (player ? (player.amount || player.serviceFee || 0) : 0);
        }, 0);

        const totalRewards = userCompetitions
            .filter(c => c.result && c.result.winnerId === userId)
            .reduce((sum, c) => sum + (c.result.payout || 0), 0);

        return {
            totalCompetitions: userCompetitions.length,
            wins,
            losses: lossCount,
            draws,
            winRate: userCompetitions.length > 0 ? (wins / userCompetitions.length * 100).toFixed(1) : 0,
            totalServiceFeesPaid: totalServiceFees, // Replaces "totalWagered"
            totalRewardsWon: totalRewards,          // Replaces "totalWon"
            netValue: totalRewards - totalServiceFees
        };
    }

    updatePlayerStats(betId, result) {
        window.dispatchEvent(new CustomEvent('player-stats-update', {
            detail: { betId, result }
        }));
    }

    generateBetId(players, gameId) {
        const timestamp = Date.now();
        const playerIds = players.map(p => p.userId).sort().join('-');
        const random = Math.random().toString(36).substr(2, 9);
        return `bet_${gameId}_${playerIds}_${timestamp}_${random}`;
    }

    async validateUserCanCompete(userId, amount, asset = 'code') {
        try {
            const balance = await assetsBus.getBalance(userId, asset);
            if (balance < amount) {
                return { valid: false, reason: `Insufficient ${asset}` };
            }

            if (amount < this.minServiceFee) return { valid: false, reason: 'Service fee too low' };
            if (amount > this.maxServiceFee) return { valid: false, reason: 'Service fee too high' };

            // Collusion Engine Check
            if (amount > 0 && !collusionEngine.isRewardEligible(userId)) {
                return { valid: false, reason: 'User ineligible for rewards (flagged).' };
            }

            return { valid: true };
        } catch (error) {
            return { valid: false, reason: error.message };
        }
    }


}

// BACKWARD COMPATIBILITY PROXY
// Maps old betting API to new competition API
class BettingCoreProxy {
    constructor(core) {
        this.core = core;
    }

    // Map properties
    get activeBets() { return this.core.activeCompetitions; }
    get betHistory() { return this.core.competitionHistory; }

    // Map methods
    createBet(config) { return this.core.createBet(config); }
    processBetResult(id, result) { return this.core.processBetResult(id, result); }
    cancelBet(id, reason) { return this.core.cancelCompetition(id, reason); }
    getActiveBets(userId) { return this.core.getActiveCompetitions(userId); }
    getBetHistory(userId, limit) { return this.core.getCompetitionHistory(userId, limit); }
    getUserBetStats(userId) { return this.core.getUserCompetitionStats(userId); }
    validateUserCanBet(userId, amount, asset) { return this.core.validateUserCanCompete(userId, amount, asset); }
}

// Export singleton
export const competitionCore = new CompetitionCore();
export const bettingCore = new BettingCoreProxy(competitionCore); // For backward compatibility
export { COMPETITION_STATUS, COMPETITION_MODES, GAME_MODES, CompetitionEscrow };
