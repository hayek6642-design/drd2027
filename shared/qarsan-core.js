/**
 * 🦁 QARSAN - Game-Theory Financial Layer
 * 
 * DESIGN: Risk Management System
 * - Controlled entirely by Watch-Dog
 * - Modes: OFF / RANGED (with deposit) / EXPOSURE (no deposit)
 * - Theft only possible when dog is SLEEPING
 */

import { query as dbQuery, pool } from '../api/config/db.js';

/**
 * Qarsan Modes
 */
export const QARSAN_MODE = {
  OFF: 'OFF',
  RANGED: 'RANGED',    // With deposit - only Qarsan wallet at risk
  EXPOSURE: 'EXPOSURE' // No deposit - ALL assets at risk
};

/**
 * Steal Scope Levels
 */
export const STEAL_SCOPE = {
  NONE: 'NONE',                    // Protected
  QARSAN_WALLET_ONLY: 'QARSAN_WALLET_ONLY',  // Only Qarsan wallet
  ALL_ASSETS: 'ALL_ASSETS'         // Everything at risk
};

/**
 * Get Qarsan state for a user from database
 */
async function getQarsanState(userId) {
  try {
    const result = await dbQuery(
      `SELECT mode, wallet_balance, created_at, updated_at 
       FROM qarsan_state 
       WHERE user_id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Initialize state for new user
      await dbQuery(
        `INSERT INTO qarsan_state (user_id, mode, wallet_balance) 
         VALUES ($1, 'OFF', 0)`,
        [userId]
      );
      return { 
        mode: QARSAN_MODE.OFF, 
        walletBalance: 0 
      };
    }
    
    const row = result.rows[0];
    return {
      mode: row.mode,
      walletBalance: parseInt(row.wallet_balance || 0, 10)
    };
  } catch (err) {
    console.error('[QARSAN] getQarsanState error:', err);
    return { mode: QARSAN_MODE.OFF, walletBalance: 0 };
  }
}

/**
 * Update Qarsan state
 */
async function updateQarsanState(userId, updates) {
  try {
    const setClauses = [];
    const params = [userId];
    let paramIndex = 2;
    
    if (updates.mode !== undefined) {
      setClauses.push(`mode = $${paramIndex++}`);
      params.push(updates.mode);
    }
    if (updates.walletBalance !== undefined) {
      setClauses.push(`wallet_balance = $${paramIndex++}`);
      params.push(updates.walletBalance);
    }
    
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    
    await dbQuery(
      `UPDATE qarsan_state SET ${setClauses.join(', ')} WHERE user_id = $1`,
      params
    );
    
    return true;
  } catch (err) {
    console.error('[QARSAN] updateQarsanState error:', err);
    return false;
  }
}

/**
 * Get potential steal scope based on dog state and Qarsan mode
 */
async function getStealScope(userId, dogState) {
  const qarsan = await getQarsanState(userId);
  
  // Dog is SLEEPING - System exposed!
  if (dogState === 'SLEEPING') {
    if (qarsan.mode === QARSAN_MODE.EXPOSURE) {
      return STEAL_SCOPE.ALL_ASSETS;
    } else if (qarsan.mode === QARSAN_MODE.RANGED) {
      return STEAL_SCOPE.QARSAN_WALLET_ONLY;
    }
  }
  
  return STEAL_SCOPE.NONE;
}

// Export for use in server
export const QarsanCore = {
  getQarsanState,
  updateQarsanState,
  getStealScope,
  QARSAN_MODE,
  STEAL_SCOPE
};

export default QarsanCore;
