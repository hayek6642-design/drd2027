
import { AssetsKernel } from '../assets/assets-kernel.js';
import { AssetReadonly } from '../assets/asset-readonly.js';
import { assetEvents, ASSET_EVENTS } from '../assets/asset-events.js';

/**
 * Local Assets Bus
 * STRICT ADAPTER ONLY. NO STATE. NO MATH.
 * Facade between services (Games, Chat) and the Kernel.
 */
export const LocalAssetsBus = {
    /**
     * Get Current Balance
     * Read-Only pass-through to Kernel/Readonly
     */
    async getBalance(userId, assetType) {
        return await AssetReadonly.getBalance(userId, assetType);
    },

    /**
     * Request a Lock for Gameplay/Operation
     * @param {string} userId 
     * @param {string} assetType 
     * @param {number} amount 
     * @param {string} reason 
     */
    async lockBalance(userId, assetType, amount, reason) {
        // Strict pass-through
        return await AssetsKernel.lock(userId, assetType, amount, reason);
    },

    /**
     * Settle a Competition (Spend or Release)
     * @param {string} userId 
     * @param {string} assetType 
     * @param {number} amount 
     * @param {string} lockId 
     * @param {boolean} won - If true, release lock (refund). If false, spend (deduct). 
     *                        WAIT! Simple "Win/Loss" is insufficient for betting.
     *                        If Win: Release Lock + Grant Reward.
     *                        If Loss: Spend Lock.
     */
    async settleCompetition(userId, assetType, amount, lockId, outcome, rewardAmount = 0) {
        if (outcome === 'WIN') {
            // 1. Release the original stake (Refund)
            await AssetsKernel.release(userId, assetType, amount, lockId);

            // 2. Grant the Winnings (Mint)
            if (rewardAmount > 0) {
                await AssetsKernel.grant(userId, assetType, rewardAmount, 'competition_win', 'game_service');
            }
        } else if (outcome === 'LOSS') {
            // 1. Spend the stake (Burn/Transfer to House)
            await AssetsKernel.spend(userId, assetType, amount, lockId, { outcome: 'loss' });
        } else if (outcome === 'DRAW') {
            // 1. Release Lock (Refund stake)
            await AssetsKernel.release(userId, assetType, amount, lockId);
        } else {
            throw new Error(`Unknown outcome: ${outcome}`);
        }
    },

    /**
     * Subscribe to verification events (Read-only)
     */
    subscribeToChanges(callback) {
        assetEvents.on(ASSET_EVENTS.BALANCE_UPDATED, callback);
        assetEvents.on(ASSET_EVENTS.LOCKED, callback);
        assetEvents.on(ASSET_EVENTS.RELEASED, callback);
        assetEvents.on(ASSET_EVENTS.SPENT, callback);

        return () => {
            assetEvents.removeListener(ASSET_EVENTS.BALANCE_UPDATED, callback);
            // ... simplify unsubscribe
        };
    }
};
