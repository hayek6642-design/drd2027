/**
 * ⚠️⚠️⚠️ TEMPORARY DEV ONLY – MUST BE REMOVED BEFORE PRODUCTION ⚠️⚠️⚠️
 * 
 * Assets Bus API Extensions for Games Centre
 * 
 * This is a TEMPORARY mock implementation for development and testing.
 * This file MUST be completely removed and replaced with the real
 * local-assets-bus.js before production deployment.
 * 
 * DO NOT:
 * - Add any features to this file
 * - Add any business logic
 * - Add any caching mechanisms
 * - Treat this as a permanent abstraction layer
 * 
 * This file exists ONLY to:
 * 1. Document the required API contract
 * 2. Provide a mock for local testing
 * 
 * PRODUCTION REQUIREMENT:
 * All imports of './assets-bus-adapter.js' must be changed to:
 * '../../../../ledger/local-assets-bus.js'
 */

/**
 * Required Assets Bus API for Games Centre:
 * 
 * 1. lockBalance(userId, asset, amount, metadata)
 *    - Locks specified amount of asset for user
 *    - Returns: { success: boolean, lockId: string, error?: string }
 *    - Must prevent user from spending locked funds
 * 
 * 2. unlockBalance(lockId)
 *    - Releases a previously locked balance
 *    - Returns: { success: boolean, error?: string }
 * 
 * 3. settleBet(options)
 *    - Handles bet settlement atomically
 *    - options: {
 *        betId: string,
 *        lockReferences: Array<{userId, lockId, amount}>,
 *        winnerId: string,
 *        winAmount: number,
 *        asset: string
 *      }
 *    - Returns: { success: boolean, settlementId: string, error?: string }
 *    - Must be atomic (all or nothing)
 * 
 * 4. getBalance(userId, asset)
 *    - Gets current available balance (excluding locked)
 *    - Returns: number
 * 
 * 5. getLockedBalance(userId, asset)
 *    - Gets total locked balance
 *    - Returns: number
 * 
 * 6. getTotalBalance(userId, asset)
 *    - Gets total balance (available + locked)
 *    - Returns: number
 */

/**
 * Mock Implementation (for development/testing)
 * REMOVE THIS when local-assets-bus.js has proper implementation
 */
class MockAssetsBus {
    constructor() {
        this.balances = new Map(); // userId -> {asset -> amount}
        this.locks = new Map(); // lockId -> {userId, asset, amount, metadata}
        this.lockCounter = 0;
    }

    async getBalance(userId, asset = 'code') {
        if (!this.balances.has(userId)) {
            this.balances.set(userId, { code: 10000, bars: 100 }); // Default for testing
        }

        const userBalances = this.balances.get(userId);
        const total = userBalances[asset] || 0;

        // Subtract locked amounts
        const locked = this.getLockedBalance(userId, asset);

        return total - locked;
    }

    async getTotalBalance(userId, asset = 'code') {
        if (!this.balances.has(userId)) {
            this.balances.set(userId, { code: 10000, bars: 100 });
        }

        const userBalances = this.balances.get(userId);
        return userBalances[asset] || 0;
    }

    getLockedBalance(userId, asset = 'code') {
        let locked = 0;

        for (const lock of this.locks.values()) {
            if (lock.userId === userId && lock.asset === asset) {
                locked += lock.amount;
            }
        }

        return locked;
    }

    async lockBalance(userId, asset, amount, metadata = {}) {
        const available = await this.getBalance(userId, asset);

        if (available < amount) {
            return {
                success: false,
                error: `Insufficient balance: have ${available}, need ${amount}`
            };
        }

        // Idempotency check
        if (metadata && metadata.reason) {
            for (const [id, lock] of this.locks) {
                if (lock.userId === userId && lock.metadata?.reason === metadata.reason) {
                    console.log('[MockAssetsBus] Idempotent lock detected:', id);
                    return { success: true, lockId: id }; // Return existing lock
                }
            }
        }

        const lockId = `lock_${++this.lockCounter}_${Date.now()}`;

        this.locks.set(lockId, {
            userId,
            asset,
            amount,
            metadata,
            createdAt: Date.now()
        });

        return { success: true, lockId };
    }

    async unlockBalance(lockId) {
        if (!this.locks.has(lockId)) {
            return { success: false, error: 'Lock not found' };
        }

        this.locks.delete(lockId);
        return { success: true };
    }

    async settleBet(options) {
        const { betId, lockReferences, winnerId, winAmount, asset } = options;

        try {
            // Verify all locks exist
            for (const lock of lockReferences) {
                if (!this.locks.has(lock.lockId)) {
                    throw new Error(`Lock not found: ${lock.lockId}`);
                }
            }

            // Remove all locks (funds were already deducted when locked)
            for (const lock of lockReferences) {
                const lockData = this.locks.get(lock.lockId);

                // Actually deduct the locked amount from total balance
                const userBalances = this.balances.get(lockData.userId);
                userBalances[asset] -= lockData.amount;

                this.locks.delete(lock.lockId);
            }

            // Credit winner
            if (!this.balances.has(winnerId)) {
                this.balances.set(winnerId, { code: 0, bars: 0 });
            }

            const winnerBalances = this.balances.get(winnerId);
            winnerBalances[asset] = (winnerBalances[asset] || 0) + winAmount;

            const settlementId = `settlement_${Date.now()}_${betId}`;

            return { success: true, settlementId };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Event emitter compatibility
    emit(event, data) {
        window.dispatchEvent(new CustomEvent(`assets-bus-${event}`, {
            detail: data
        }));
    }

    on(event, callback) {
        window.addEventListener(`assets-bus-${event}`, (e) => {
            callback(e.detail);
        });
    }
}

// Export mock for now
// TODO: Replace with actual assetsBus import when implemented
export const assetsBus = new MockAssetsBus();

/**
 * Integration Instructions:
 * 
 * When local-assets-bus.js is ready, replace the export above with:
 * 
 * import { assetsBus } from '../../../../ledger/local-assets-bus.js';
 * export { assetsBus };
 * 
 * And ensure local-assets-bus.js implements all methods listed at the top of this file.
 */
