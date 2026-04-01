import { query } from '../../api/config/db.js';
import { AssetTransactions } from './asset-transactions.js';
import { LedgerWriter } from '../ledger/ledger-writer.js';
import { LEDGER_EVENTS } from '../ledger/ledger-schema.js';
import { assetEvents, ASSET_EVENTS } from './asset-events.js';
import { AssetLocker } from './asset-locker.js';
import { pool } from '../../api/config/db.js';

export const AssetsKernel = {
    /**
     * Grant assets (Minting/Rewards).
     * @param {string} userId 
     * @param {string} assetType 
     * @param {number} amount 
     * @param {string} reason 
     * @param {string} source 
     * @returns {Promise<number>} New Balance
     */
    async grant(userId, assetType, amount, reason, source = 'system') {
        if (amount <= 0) throw new Error('Grant amount must be positive');

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Update Balance
            const newBalance = await AssetTransactions.updateBalance(userId, assetType, amount, client);

            // 2. Write Ledger
            await LedgerWriter.record({
                userId,
                eventType: LEDGER_EVENTS.GRANT,
                assetType,
                amount,
                metadata: { reason, source }
            }, client);

            await client.query('COMMIT');

            // 3. Emit Event
            assetEvents.emit(ASSET_EVENTS.BALANCE_UPDATED, { userId, assetType, newBalance, delta: amount, reason });

            return newBalance;
        } catch (err) {
            try { await client.query('ROLLBACK') } catch (_) {}
            throw err;
        } finally {
            if (typeof client.release === 'function') client.release();
        }
    },

    /**
     * Lock assets for future spend.
     * Decreases available balance immediately.
     * @param {string} userId 
     * @param {string} assetType 
     * @param {number} amount 
     * @param {string} reason 
     * @returns {Promise<{lockId: string, newBalance: number}>}
     */
    async lock(userId, assetType, amount, reason) {
        if (amount <= 0) throw new Error('Lock amount must be positive');

        const client = await pool.connect();
        const lockId = AssetLocker.generateLockId();

        try {
            await client.query('BEGIN');

            // 1. Deduct Balance (Will throw if insufficient)
            const newBalance = await AssetTransactions.updateBalance(userId, assetType, -amount, client);

            // 2. Write Ledger
            await LedgerWriter.record({
                userId,
                eventType: LEDGER_EVENTS.LOCK,
                assetType,
                amount,
                metadata: { reason, lockId }
            }, client);

            await client.query('COMMIT');

            assetEvents.emit(ASSET_EVENTS.LOCKED, { userId, assetType, amount, lockId });
            return { lockId, newBalance };

        } catch (err) {
            try { await client.query('ROLLBACK') } catch (_) {}
            if (err.message === 'Insufficient funds') {
                assetEvents.emit(ASSET_EVENTS.INSUFFICIENT_FUNDS, { userId, assetType, amount });
            }
            throw err;
        } finally {
            if (typeof client.release === 'function') client.release();
        }
    },

    /**
     * Release locked assets (Refund/Unlock).
     * Increases available balance.
     * @param {string} userId 
     * @param {string} assetType 
     * @param {number} amount 
     * @param {string} lockId 
     * @returns {Promise<number>} New Balance
     */
    async release(userId, assetType, amount, lockId) {
        if (amount <= 0) throw new Error('Release amount must be positive');
        // NOTE: In a real system, we should verify the lockId exists and matches the amount.
        // For this core version, we rely on the strict balance accounting and ensuring calls are trusted.

        const pool = await DbAdapter.connect();
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Refund Balance
            const newBalance = await AssetTransactions.updateBalance(userId, assetType, amount, client);

            // 2. Write Ledger
            await LedgerWriter.record({
                userId,
                eventType: LEDGER_EVENTS.RELEASE,
                assetType,
                amount,
                metadata: { lockId }
            }, client);

            await client.query('COMMIT');

            assetEvents.emit(ASSET_EVENTS.RELEASED, { userId, assetType, amount, lockId });
            return newBalance;

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },

    /**
     * Spend locked assets (Finalize transaction).
     * Does NOT change balance (already deducted during LOCK).
     * Just records the SPEND event in Ledger.
     * @param {string} userId 
     * @param {string} assetType 
     * @param {number} amount 
     * @param {string} lockId 
     * @param {object} metadata - Extra details (game match id, etc.)
     */
    async spend(userId, assetType, amount, lockId, metadata = {}) {
        if (amount <= 0) throw new Error('Spend amount must be positive');

        const pool = await DbAdapter.connect();
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Write Ledger
            await LedgerWriter.record({
                userId,
                eventType: LEDGER_EVENTS.SPEND,
                assetType,
                amount,
                metadata: { ...metadata, lockId }
            }, client);

            await client.query('COMMIT');

            assetEvents.emit(ASSET_EVENTS.SPENT, { userId, assetType, amount, lockId });
            return true;

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },

    /**
     * Direct Spend (Immediate deduction without lock).
     * Useful for simple purchases.
     */
    async directSpend(userId, assetType, amount, reason) {
        if (amount <= 0) throw new Error('Spend amount must be positive');

        const pool = await DbAdapter.connect();
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Deduct Balance
            const newBalance = await AssetTransactions.updateBalance(userId, assetType, -amount, client);

            // 2. Write Ledger
            await LedgerWriter.record({
                userId,
                eventType: LEDGER_EVENTS.SPEND,
                assetType,
                amount,
                metadata: { reason, method: 'direct' }
            }, client);

            await client.query('COMMIT');

            assetEvents.emit(ASSET_EVENTS.BALANCE_UPDATED, { userId, assetType, newBalance, delta: -amount, reason });
            return newBalance;

        } catch (err) {
            await client.query('ROLLBACK');
            if (err.message === 'Insufficient funds') {
                assetEvents.emit(ASSET_EVENTS.INSUFFICIENT_FUNDS, { userId, assetType, amount });
            }
            throw err;
        } finally {
            client.release();
        }
    }
};
