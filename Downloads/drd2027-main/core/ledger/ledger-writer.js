import { query } from '../../api/config/db.js';
import crypto from 'crypto';

export const LedgerWriter = {
    /**
     * Record an event to the immutable ledger.
     * @param {object} event
     * @param {string} event.userId
     * @param {string} event.eventType - One of LEDGER_EVENTS
     * @param {string} event.assetType
     * @param {number} event.amount
     * @param {object} event.metadata - Additional context (reason, lockId, etc.)
     * @param {object} [client] - Optional DB client for transaction context
     */
    async record({ userId, eventType, assetType, amount, metadata = {} }, client = null) {
        const sql = `
            INSERT INTO ledger_events (id, user_id, event_type, asset_type, amount, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        const params = [crypto.randomUUID(), userId, eventType, assetType, amount, JSON.stringify(metadata)];

        if (client) {
            await client.query(sql, params);
        } else {
            await query(sql, params);
        }
    }
};
