/**
 * 🦁 QARSAN ENGINE - Server-Side API Client
 * 
 * CRITICAL SECURITY NOTE:
 * All financial operations MUST go through server endpoints.
 * This client only makes API calls - no local execution.
 * 
 * API Endpoints:
 * - GET /api/qarsan/status - Get Qarsan status
 * - POST /api/qarsan/activate - Activate Qarsan mode
 * - POST /api/qarsan/deactivate - Deactivate Qarsan
 * - POST /api/qarsan/attack - Execute theft (server-side only)
 * - GET /api/qarsan/users - Get virtual users
 */

const QARSAN_API_BASE = '/api/qarsan';

class QarsanEngine {
  static getCurrentUserId() {
    // Get user ID from session storage or global
    return window.__currentUserId || null;
  }

  /**
   * Get Qarsan status for current user
   * @returns {Promise<{success: boolean, qarsanMode: string, walletBalance: number, watchDogState: string, stealScope: string, lastFedAt: string}>}
   */
  static async getQarsanStatus(userId) {
    try {
      const response = await fetch(`${QARSAN_API_BASE}/status`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        return {
          qarsanMode: data.qarsanMode || 'OFF',
          walletBalance: data.walletBalance || 0,
          watchDogState: data.watchDogState || 'SLEEPING',
          stealScope: data.stealScope || 'NONE',
          lastFedAt: data.lastFedAt
        };
      }
      
      console.warn('[QARSAN] Failed to get status:', data.error);
      return {
        qarsanMode: 'OFF',
        walletBalance: 0,
        watchDogState: 'SLEEPING',
        stealScope: 'NONE',
        lastFedAt: null
      };
    } catch (error) {
      console.error('[QARSAN] Error getting status:', error);
      return {
        qarsanMode: 'OFF',
        walletBalance: 0,
        watchDogState: 'SLEEPING',
        stealScope: 'NONE',
        lastFedAt: null
      };
    }
  }

  /**
   * Activate Qarsan with specified mode
   * @param {string} userId - User ID
   * @param {string} mode - Mode: 'OFF', 'RANGED', 'EXPOSURE'
   * @param {number} depositAmount - Amount to deposit for RANGED mode
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  static async activateQarsan(userId, mode, depositAmount = 0) {
    try {
      const response = await fetch(`${QARSAN_API_BASE}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          mode,
          depositAmount
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Emit asset update event
        window.dispatchEvent(new CustomEvent('assets:updated', {
          detail: { type: 'qarsan-update', action: 'activate', mode }
        }));
        
        return {
          success: true,
          message: data.message,
          qarsanMode: data.qarsanMode,
          walletBalance: data.walletBalance
        };
      }
      
      return {
        success: false,
        error: data.error || 'activation_failed',
        message: data.message
      };
    } catch (error) {
      console.error('[QARSAN] Error activating:', error);
      return {
        success: false,
        error: 'network_error',
        message: error.message
      };
    }
  }

  /**
   * Deactivate Qarsan
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  static async deactivateQarsan(userId) {
    try {
      const response = await fetch(`${QARSAN_API_BASE}/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Emit asset update event
        window.dispatchEvent(new CustomEvent('assets:updated', {
          detail: { type: 'qarsan-update', action: 'deactivate' }
        }));
        
        return {
          success: true,
          message: data.message
        };
      }
      
      return {
        success: false,
        error: data.error || 'deactivation_failed',
        message: data.message
      };
    } catch (error) {
      console.error('[QARSAN] Error deactivating:', error);
      return {
        success: false,
        error: 'network_error',
        message: error.message
      };
    }
  }

  /**
   * Execute theft attack on target user
   * CRITICAL: This is server-side only - no local calculation
   * @param {string} targetUserId - Target user ID
   * @param {string} attackerId - Attacker user ID
   * @param {number} amount - Amount to steal
   * @returns {Promise<{success: boolean, amount?: number, scope?: string, error?: string}>}
   */
  static async executeQarsanTheft(targetUserId, attackerId, amount) {
    try {
      const txId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now());
      const response = await fetch(`${QARSAN_API_BASE}/attack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          targetUserId,
          amount,
          txId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Emit asset update event
        window.dispatchEvent(new CustomEvent('assets:updated', {
          detail: { 
            type: 'qarsan-update', 
            action: 'attack',
            targetUserId,
            amount: data.amount,
            scope: data.scope
          }
        }));
        
        return {
          success: true,
          amount: data.amount,
          scope: data.scope,
          message: data.message
        };
      }
      
      return {
        success: false,
        error: data.error || 'attack_failed',
        message: data.message
      };
    } catch (error) {
      console.error('[QARSAN] Attack error:', error);
      return {
        success: false,
        error: 'network_error',
        message: error.message
      };
    }
  }

  /**
   * Get virtual users for attack targets
   * @returns {Promise<Array<{id: string, dogState: string, qarsanMode: string, balance: number, qarsanWallet: number, stealScope: string, canAttack: boolean}>>}
   */
  static async getVirtualUsers() {
    try {
      const response = await fetch(`${QARSAN_API_BASE}/users`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        return data.users || [];
      }
      
      return [];
    } catch (error) {
      console.error('[QARSAN] Error getting users:', error);
      return [];
    }
  }

  /**
   * Get users that can be attacked
   * @param {string} userId - Current user ID
   * @returns {Promise<Array>}
   */
  static async getAttackableUsers(userId) {
    const users = await this.getVirtualUsers();
    return users.filter(u => u.canAttack && u.id !== userId);
  }

  /**
   * Feed Watch-Dog (delegate to server)
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, cost?: number, error?: string}>}
   */
  static async feedWatchDog(userId) {
    try {
      const response = await fetch('/api/watchdog/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Emit asset update event
        window.dispatchEvent(new CustomEvent('assets:updated', {
          detail: { type: 'watchdog-feed', dogState: data.dogState }
        }));
        
        return {
          success: true,
          cost: data.cost,
          dogState: data.dogState
        };
      }
      
      return {
        success: false,
        error: data.error || 'feed_failed',
        message: data.message
      };
    } catch (error) {
      console.error('[WATCHDOG] Feed error:', error);
      return {
        success: false,
        error: 'network_error',
        message: error.message
      };
    }
  }

  /**
   * Get Watch-Dog state
   * @param {string} userId - User ID
   * @returns {Promise<{dogState: string, lastFedAt: string, isFrozen: boolean}>}
   */
  static async getWatchDogState(userId) {
    try {
      const response = await fetch('/api/watchdog/state', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        return {
          dogState: data.dogState || 'SLEEPING',
          lastFedAt: data.lastFedAt,
          isFrozen: data.isFrozen || false,
          canOperate: data.canOperate || false
        };
      }
      
      return {
        dogState: 'SLEEPING',
        lastFedAt: null,
        isFrozen: false,
        canOperate: false
      };
    } catch (error) {
      console.error('[WATCHDOG] Error getting state:', error);
      return {
        dogState: 'SLEEPING',
        lastFedAt: null,
        isFrozen: false,
        canOperate: false
      };
    }
  }

  /**
   * Re-fetch balance from Ledger (NOT from local state)
   * This ensures we always have the latest from server
   * @returns {Promise<number>}
   */
  static async fetchBalanceFromLedger() {
    try {
      const response = await fetch('/api/balances', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        return data.balances?.codes || 0;
      }
      
      return 0;
    } catch (error) {
      console.error('[QARSAN] Error fetching balance:', error);
      return 0;
    }
  }

  /**
   * Setup event listener for asset updates
   * CRITICAL: Re-fetches from Ledger, not from event payload
   */
  static setupAssetUpdateListener(callback) {
    window.addEventListener('assets:updated', async (e) => {
      // CRITICAL: Always re-fetch from server, don't trust event payload
      const latestBalance = await this.fetchBalanceFromLedger();
      const latestStatus = await this.getQarsanStatus(this.getCurrentUserId());
      
      if (callback) {
        callback({
          balance: latestBalance,
          qarsanStatus: latestStatus,
          event: e.detail
        });
      }
    });
  }
}

// Export for module usage
export { QarsanEngine };
export default QarsanEngine;
