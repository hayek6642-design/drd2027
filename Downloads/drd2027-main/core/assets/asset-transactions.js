import { query } from '../../api/config/db.js';

export const AssetTransactions = {
    /**
     * Get current balance for a user and asset type.
     * @param {string} userId 
     * @param {string} assetType 
     * @param {object} [client] - Optional DB client for transaction
     * @returns {Promise<number>}
     */
    async getBalance(userId, assetType, client = null) {
        const sql = `
            SELECT balance FROM asset_balances 
            WHERE user_id = $1 AND asset_type = $2
        `;

        let res;
        if (client) {
            res = await client.query(sql, [userId, assetType]);
        } else {
            res = await query(sql, [userId, assetType]);
        }

        if (res.rows.length === 0) return 0;
        return Number(res.rows[0].balance);
    },

    /**
     * Atomically update balance.
     * @param {string} userId 
     * @param {string} assetType 
     * @param {number} delta - Positive to add, Negative to subtract
     * @param {object} client - REQUIRED: Must be called within a transaction!
     * @returns {Promise<number>} New balance
     */
    async updateBalance(userId, assetType, delta, client) {
        if (!client) throw new Error('AssetTransactions.updateBalance requires a DB client (transaction)');

        // Upsert logic: If row doesn't exist, assume 0 and add delta.
        // The CHECK constraint (balance >= 0) in DB will prevent negative results.
        const sql = `
            INSERT INTO asset_balances (user_id, asset_type, balance, last_updated)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, asset_type)
            DO UPDATE SET 
                balance = asset_balances.balance + $4,
                last_updated = CURRENT_TIMESTAMP
            RETURNING balance;
        `;

        // If inserting new, base is 0 + delta. If updating, it's existing + delta.
        // Note: For the INSERT case, we pass 'delta' as the initial balance.
        // Wait, if delta is negative (spend) and row doesn't exist (0), this tries to insert negative balance -> DB Error. Correct.
        try {
            const res = await client.query(sql, [userId, assetType, delta, delta]);
            return Number(res.rows[0].balance);
        } catch (err) {
            if (err.message && err.message.includes('CHECK constraint failed: balance >= 0')) {
                throw new Error('Insufficient funds');
            }
            throw err;
        }
    }
};
