
import { AssetTransactions } from './asset-transactions.js';

export const AssetReadonly = {
    /**
     * Get User Balance (Safe Read)
     * @param {string} userId 
     * @param {string} assetType 
     * @returns {Promise<number>}
     */
    async getBalance(userId, assetType) {
        return await AssetTransactions.getBalance(userId, assetType);
    },

    /**
     * Get All Balances for User (Optimized for Shadow Mode)
     * @param {string} userId
     * @returns {Promise<object>} { codes: 0, silver: 0, gold: 0 }
     */
    async getAllBalances(userId) {
        try {
            const { DbAdapter } = await import('../../sqlite/sqlite-server-adapter.js');
            const res = await DbAdapter.query(
                'SELECT codes_count, silver_count, gold_count FROM users WHERE id = $1::uuid',
                [userId]
            );

            if (res.rows.length === 0) return { codes: 0, silver: 0, gold: 0 };

            const row = res.rows[0];
            return {
                codes: parseInt(row.codes_count || 0),
                silver: parseInt(row.silver_count || 0),
                gold: parseInt(row.gold_count || 0)
            };
        } catch (err) {
            console.error('[AssetReadonly] Error fetching shadow balances:', err.message);
            return { codes: 0, silver: 0, gold: 0 };
        }
    }
};
