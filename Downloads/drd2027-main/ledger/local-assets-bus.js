/**
 * local-assets-bus.js (Enhanced)
 * 
 * Acts as both:
 * 1. Event Bus for notifications across Games-Centre, Ledger, Faragna/Samma3ny
 * 2. Stateless Adapter to Assets Kernel for secure balance operations
 * 
 * Usage:
 * import { assetsBus } from './local-assets-bus.js';
 * 
 * // Subscribe to events
 * assetsBus.on('reward', (data) => { ... });
 * 
 * // Perform secure asset operations
 * await assetsBus.lock(userId, 100, { reason: 'game_bet_123' });
 * await assetsBus.settle(lockId, { winnerId: 'user_1', amount: 210 });
 */

import { AssetsKernel } from '../core/assets/assets-kernel.js';
import { AssetReadonly } from '../core/assets/asset-readonly.js';

class LocalAssetsBus {
    constructor() {
        this.listeners = {};
        this.channel = new BroadcastChannel('codebank_assets_bus');

        // Listen for cross-tab events
        this.channel.onmessage = (event) => {
            if (event.data && event.data.type === 'BUS_EVENT') {
                this._dispatchLocal(event.data.eventName, event.data.payload);
            }
        };
    }

    // -------------------
    // Event Bus Methods
    // -------------------
    on(eventName, callback) {
        if (!this.listeners[eventName]) this.listeners[eventName] = [];
        this.listeners[eventName].push(callback);
    }

    off(eventName, callback) {
        if (!this.listeners[eventName]) return;
        this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    }

    emit(eventName, payload) {
        this._dispatchLocal(eventName, payload);
        this.channel.postMessage({
            type: 'BUS_EVENT',
            eventName,
            payload
        });
    }

    _dispatchLocal(eventName, payload) {
        if (!this.listeners[eventName]) return;
        this.listeners[eventName].forEach(cb => {
            try { cb(payload); }
            catch (e) { console.error(`[AssetsBus] Error in listener for ${eventName}:`, e); }
        });
    }

    // -------------------
    // Assets Adapter Methods
    // -------------------

    /**
     * Get user's available balance (read-only)
     */
    async getBalance(userId, asset = 'codes') {
        return await AssetReadonly.getBalance(userId, asset);
    }

    /**
     * Lock a certain amount for a user
     * Returns: { success, lockId, error? }
     */
    async lock(userId, amount, metadata = {}) {
        const asset = metadata.asset || 'codes';
        const reason = metadata.reason || 'lock';
        return await AssetsKernel.lock(userId, asset, amount, reason);
    }

    /**
     * Release previously locked amount
     * Returns: { success, error? }
     */
    async release(lockId, metadata = {}) {
        const userId = metadata.userId || null;
        const asset = metadata.asset || 'codes';
        const amount = metadata.amount;
        if (!userId || typeof amount !== 'number') {
            return { success: false, error: 'missing params' };
        }
        const newBalance = await AssetsKernel.release(userId, asset, amount, lockId);
        return { success: true, newBalance };
    }

    /**
     * Settle a bet or transaction atomically
     * result = { winnerId, amount, asset }
     */
    async settle(lockId, result) {
        const asset = result.asset || 'codes';
        const amount = result.amount || 0;
        if (result.winnerId) {
            await AssetsKernel.release(result.winnerId, asset, amount, lockId);
            return { success: true };
        }
        return { success: false };
    }

    /**
     * Grant/mint balance to a user (system only)
     */
    async grant(userId, amount, metadata = {}) {
        const asset = metadata.asset || 'codes';
        const reason = metadata.reason || 'grant';
        const source = metadata.source || 'assets-bus';
        const newBalance = await AssetsKernel.grant(userId, asset, amount, reason, source);
        return { success: true, newBalance };
    }

    // -------------------
    // Read-only helpers
    // -------------------
    async getLockedBalance(userId, asset = 'codes') {
        return 0;
    }

    async getTotalBalance(userId, asset = 'codes') {
        const available = await AssetReadonly.getBalance(userId, asset);
        return available;
    }
}

// Singleton instance
export const assetsBus = new LocalAssetsBus();
export default assetsBus;
