/**
 * 🛡️ WATCH-DOG GUARDIAN - Production Security Layer
 * 
 * DESIGN: Enforcer | Gatekeeper | Security Layer
 * - NEVER auto-heal (dangerous)
 * - Detect mismatches → Log critical error → Freeze account
 * - Control system state based on feeding
 * 
 * States:
 * - ACTIVE: Normal operations allowed
 * - SLEEPING: Account exposed, disable extra mode
 */

import { query as dbQuery, pool } from '../api/config/db.js';
import crypto from 'crypto';

/**
 * Get ledger balance for a user
 */
async function getLedgerBalance(userId, assetType = 'codes') {
  try {
    const result = await dbQuery(
      `SELECT COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END), 0)::int as balance
       FROM ledger 
       WHERE user_id = $1 AND asset_type = $2`,
      [userId, assetType]
    );
    return parseInt(result.rows[0]?.balance || 0, 10);
  } catch (err) {
    console.error('[WATCHDOG] getLedgerBalance error:', err);
    return 0;
  }
}

/**
 * Get active (unspent) codes count for a user
 */
async function countActiveCodes(userId, assetType = 'codes') {
  try {
    const result = await dbQuery(
      `SELECT COUNT(*)::int as count
       FROM codes 
       WHERE user_id = $1 
         AND COALESCE(type, 'codes') = $2
         AND (spent IS FALSE OR spent IS NULL OR spent = 0)`,
      [userId, assetType]
    );
    return parseInt(result.rows[0]?.count || 0, 10);
  } catch (err) {
    console.error('[WATCHDOG] countActiveCodes error:', err);
    return 0;
  }
}

/**
 * Get user's Watch-Dog state from database
 */
async function getWatchDogState(userId) {
  try {
    const result = await dbQuery(
      `SELECT last_fed_at, dog_state, is_frozen, frozen_reason 
       FROM watchdog_state 
       WHERE user_id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Initialize state for new user
      await dbQuery(
        `INSERT INTO watchdog_state (user_id, last_fed_at, dog_state, is_frozen) 
         VALUES ($1, datetime('now', '-25 hours'), 'SLEEPING', 0)`,
        [userId]
      );
      return { 
        lastFedAt: null, 
        dogState: 'SLEEPING', 
        isFrozen: false, 
        frozenReason: null 
      };
    }
    
    const row = result.rows[0];
    return {
      lastFedAt: row.last_fed_at,
      dogState: row.dog_state,
      isFrozen: !!row.is_frozen,
      frozenReason: row.frozen_reason
    };
  } catch (err) {
    console.error('[WATCHDOG] getWatchDogState error:', err);
    return { lastFedAt: null, dogState: 'SLEEPING', isFrozen: false, frozenReason: null };
  }
}

/**
 * Update Watch-Dog state
 */
async function updateWatchDogState(userId, updates) {
  try {
    const setClauses = [];
    const params = [userId];
    let paramIndex = 2;
    
    if (updates.lastFedAt !== undefined) {
      setClauses.push(`last_fed_at = $${paramIndex++}`);
      params.push(updates.lastFedAt);
    }
    if (updates.dogState !== undefined) {
      setClauses.push(`dog_state = $${paramIndex++}`);
      params.push(updates.dogState);
    }
    if (updates.isFrozen !== undefined) {
      setClauses.push(`is_frozen = $${paramIndex++}`);
      params.push(updates.isFrozen ? 1 : 0);
    }
    if (updates.frozenReason !== undefined) {
      setClauses.push(`frozen_reason = $${paramIndex++}`);
      params.push(updates.frozenReason);
    }
    
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    
    await dbQuery(
      `UPDATE watchdog_state SET ${setClauses.join(', ')} WHERE user_id = $1`,
      params
    );
    
    return true;
  } catch (err) {
    console.error('[WATCHDOG] updateWatchDogState error:', err);
    return false;
  }
}

/**
 * 🛡️ VERIFY SYSTEM INTEGRITY
 * 
 * CRITICAL: This is a DETECTOR only - NEVER auto-heals
 * 
 * On mismatch detected:
 * 1. Log CRITICAL error
 * 2. Freeze account
 * 3. Alert administrators
 */
async function verifySystemIntegrity(userId) {
  const results = { codes: {}, silver: {}, gold: {} };
  const assetTypes = ['codes', 'silver', 'gold'];
  let hasMismatch = false;
  
  for (const assetType of assetTypes) {
    const ledger = await getLedgerBalance(userId, assetType);
    const codes = await countActiveCodes(userId, assetType);
    
    results[assetType] = { ledger, codes, match: ledger === codes };
    
    if (ledger !== codes) {
      hasMismatch = true;
      const diff = codes - ledger;
      
      // 🚨 CRITICAL: Log the mismatch - NEVER auto-heal
      console.error(`[WATCHDOG] 🚨 CRITICAL MISMATCH DETECTED`, {
        userId,
        asset: assetType,
        ledgerBalance: ledger,
        codesCount: codes,
        difference: diff,
        severity: 'CRITICAL',
        timestamp: new Date().toISOString()
      });
      
      // Freeze account due to integrity failure
      await freezeAccount(userId, `INTEGRITY_MISMATCH: ${assetType} diff=${diff}`);
    }
  }
  
  // Update dog state based on time since last feed
  await updateDogStateByTime(userId);
  
  return { results, hasMismatch };
}

/**
 * Freeze account due to critical error
 */
async function freezeAccount(userId, reason) {
  console.error(`[WATCHDOG] 🔒 FREEZING ACCOUNT ${userId} reason: ${reason}`);
  
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update watchdog state
      await client.query(
        `INSERT INTO watchdog_state (user_id, is_frozen, frozen_reason, updated_at)
         VALUES ($1, 1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET 
           is_frozen = 1, 
           frozen_reason = $2,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, reason]
      );
      
      // Log to audit
      await client.query(
        `INSERT INTO audit_log (type, payload) VALUES ($1, $2)`,
        ['ACCOUNT_FROZEN', JSON.stringify({ userId, reason, timestamp: new Date().toISOString() })]
      );
      
      await client.query('COMMIT');
      console.error(`[WATCHDOG] 🔒 Account ${userId} FROZEN`);
    } catch (err) {
      try { await client.query('ROLLBACK') } catch (_) {}
      console.error('[WATCHDOG] freezeAccount error:', err);
    } finally {
      if (typeof client.release === 'function') client.release();
    }
  } catch (err) {
    console.error('[WATCHDOG] freezeAccount outer error:', err);
  }
}

/**
 * Update dog state based on time since last feed
 * 
 * IF (now - lastFedAt > 24h):
 *   dog = SLEEPING
 *   disable extra mode
 *   mark account as "exposed"
 * 
 * IF (now - lastFedAt > 72h):
 *   dog = DEAD
 */
async function updateDogStateByTime(userId) {
  try {
    const state = await getWatchDogState(userId);
    
    if (!state.lastFedAt) {
      await updateWatchDogState(userId, { dogState: 'SLEEPING' });
      return { dogState: 'SLEEPING', reason: 'Never fed' };
    }
    
    const lastFed = new Date(state.lastFedAt);
    const now = new Date();
    const hoursSinceLastFeed = (now - lastFed) / (1000 * 60 * 60);
    
    let newState = state.dogState;
    let reason = null;
    
    if (hoursSinceLastFeed > 72) {
      newState = 'DEAD';
      reason = `Expired: ${hoursSinceLastFeed.toFixed(1)}h since last feed (DEAD)`;
      await updateWatchDogState(userId, { dogState: 'DEAD' });
      console.warn(`[WATCHDOG] 💀 ${userId} is DEAD (${hoursSinceLastFeed.toFixed(1)}h)`);
    } else if (hoursSinceLastFeed > 24) {
      newState = 'SLEEPING';
      reason = `Expired: ${hoursSinceLastFeed.toFixed(1)}h since last feed`;
      
      // Update state
      await updateWatchDogState(userId, { dogState: 'SLEEPING' });
      
      console.warn(`[WATCHDOG] 🐕 ${userId} is SLEEPING (${hoursSinceLastFeed.toFixed(1)}h since last feed)`);
    } else if (hoursSinceLastFeed <= 24 && (state.dogState === 'SLEEPING' || state.dogState === 'DEAD')) {
      // Auto-wake if fed recently
      newState = 'ACTIVE';
      await updateWatchDogState(userId, { dogState: 'ACTIVE' });
      console.log(`[WATCHDOG] 🐕 ${userId} is now ACTIVE`);
    }
    
    return { 
      dogState: newState, 
      hoursSinceLastFeed: hoursSinceLastFeed.toFixed(1),
      reason 
    };
    
  } catch (err) {
    console.error('[WATCHDOG] updateDogStateByTime error:', err);
    return { dogState: 'SLEEPING', error: err.message };
  }
}

/**
 * 🛡️ ENHANCED Feed the Watch-Dog (client action)
 * 
 * POST /api/watchdog/feed
 * - cost: 10 codes
 * - atomic deduction with proper locking
 * - update lastFedAt
 * - idempotency support
 * - enhanced integrity verification
 */
async function feedWatchDog(userId, idempotencyKey = null) {
  let FEED_COST = 10;
  
  console.log(`[WATCHDOG] Feeding dog for user ${userId}, cost: ${FEED_COST} codes`);

  // Check last fed time FIRST (before any transaction)
  const currentDogState = await getWatchDogState(userId);

  // 1. Check if dog is DEAD (>= 72h) - cannot feed, must buy
  if (currentDogState.lastFedAt) {
    const lastFed = new Date(currentDogState.lastFedAt);
    const hoursSinceFeed = (new Date() - lastFed) / (1000 * 60 * 60);

    if (hoursSinceFeed >= 72) {
      return {
        success: false,
        error: 'DOG_DEAD',
        message: 'Your dog has died after 3 days without feeding. Buy a new dog to continue.',
        dogState: 'DEAD'
      };
    }

    // 2. Check if already fed today (< 24h)
    if (hoursSinceFeed < 24) {
      return {
        success: false,
        error: 'ALREADY_FED',
        message: 'The dog is already fed today! Come back in ' + Math.ceil(24 - hoursSinceFeed) + ' hours.',
        nextFeedIn: Math.ceil(24 - hoursSinceFeed),
        dogState: currentDogState.dogState
      };
    }

    // 3. If 2+ days without feeding → double cost penalty
    if (hoursSinceFeed >= 48) {
      FEED_COST = 20; // Double penalty for 2-day neglect
      console.warn(`[WATCHDOG] 2-day neglect penalty: charging ${FEED_COST} codes for user ${userId}`);
    }
  } else if (currentDogState.dogState === 'DEAD') {
    return {
      success: false,
      error: 'DOG_DEAD',
      message: 'Your dog has died. Buy a new dog from Pebalaash (1000 codes) to continue.',
      dogState: 'DEAD'
    };
  }
  
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 🔄 Check idempotency if key provided
      if (idempotencyKey) {
        const existingTx = await client.query(
          `SELECT id, created_at FROM ledger 
           WHERE user_id = $1 AND reference = 'QARSAN_DOG_FEED' 
             AND json_extract(meta, '$.idempotency_key') = $2
           ORDER BY created_at DESC LIMIT 1`,
          [userId, idempotencyKey]
        );
        
        if (existingTx.rows.length > 0) {
          console.log(`[WATCHDOG] Idempotent feed detected for user ${userId}, key: ${idempotencyKey}`);
          await client.query('COMMIT');
          return { 
            success: true, 
            idempotent: true,
            cost: FEED_COST,
            timestamp: existingTx.rows[0].created_at
          };
        }
      }
      
      // 🔍 Enhanced integrity check before feeding
      const integrityCheck = await verifySystemIntegrity(userId);
      if (integrityCheck.hasMismatch) {
        console.error(`[WATCHDOG] 🚨 INTEGRITY FAILURE - Blocking feed for user ${userId}`);
        await client.query('ROLLBACK');
        return { 
          success: false, 
          error: 'INTEGRITY_MISMATCH',
          message: 'System integrity check failed - feed blocked',
          mismatches: integrityCheck.results
        };
      }
      
      // 🔍 Verify Watch-Dog state is not sleeping
      const dogState = await getWatchDogState(userId);
      // Allow feeding even if sleeping or dead to wake it up
      
      // 🔍 Verify balance
      const balanceRes = await client.query(
        `SELECT COUNT(*)::int as count
         FROM codes 
         WHERE user_id = $1 
           AND (spent IS FALSE OR spent IS NULL OR spent = 0)`,
        [userId]
      );
      const currentBalance = parseInt(balanceRes.rows[0]?.count || 0, 10);
      
      if (currentBalance < FEED_COST) {
        await client.query('ROLLBACK');
        return { success: false, error: 'INSUFFICIENT_CODES', required: FEED_COST, available: currentBalance };
      }
      
      // 🔒 Select specific codes to spend
      const codesRes = await client.query(
        `SELECT id FROM codes 
         WHERE user_id = $1 AND (spent IS FALSE OR spent IS NULL OR spent = 0)
         ORDER BY created_at ASC 
         LIMIT $2`,
        [userId, FEED_COST]
      );
      
      const codeIds = codesRes.rows.map(r => r.id);
      const placeholders = codeIds.map(() => '?').join(',');
      
      // 💰 Mark codes as spent
      await client.query(
        `UPDATE codes SET spent = 1, updated_at = CURRENT_TIMESTAMP 
         WHERE id IN (${placeholders})`,
        codeIds
      );
      
      // 📖 Create ledger entry with idempotency tracking
      const txId = crypto.randomUUID();
      const meta = {
        operation: 'watchdog_feed',
        codes_spent: FEED_COST,
        penalty: FEED_COST > 10 ? '2day_neglect_double_penalty' : 'normal',
        ...(idempotencyKey && { idempotency_key: idempotencyKey })
      };
      
      await client.query(
        `INSERT INTO ledger (id, tx_id, user_id, direction, asset_type, amount, reference, meta)
         VALUES ($1, $2, $3, 'debit', 'codes', $4, 'QARSAN_DOG_FEED', $5)`,
        [crypto.randomUUID(), txId, userId, FEED_COST, JSON.stringify(meta)]
      );
      
      // 🐕 Update watchdog state
      await client.query(
        `INSERT INTO watchdog_state (user_id, last_fed_at, dog_state, updated_at)
         VALUES ($1, CURRENT_TIMESTAMP, 'ACTIVE', CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET 
           last_fed_at = CURRENT_TIMESTAMP,
           dog_state = 'ACTIVE',
           updated_at = CURRENT_TIMESTAMP`,
        [userId]
      );
      
      // 📝 Log the feeding action
      await client.query(
        `INSERT INTO audit_log (type, payload) VALUES ($1, $2)`,
        ['WATCHDOG_FED', JSON.stringify({ 
          userId, 
          cost: FEED_COST,
          idempotencyKey,
          txId,
          timestamp: new Date().toISOString() 
        })]
      );
      
      await client.query('COMMIT');
      console.log(`[WATCHDOG] ✅ Dog fed for user ${userId}, cost: ${FEED_COST} codes`);
      
      return { 
        success: true, 
        cost: FEED_COST, 
        newBalance: currentBalance - FEED_COST,
        dogState: 'ACTIVE',
        txId,
        idempotent: false
      };
    } catch (err) {
      try { await client.query('ROLLBACK') } catch (_) {}
      console.error('[WATCHDOG] feedWatchDog error:', err);
      return { success: false, error: err.message };
    } finally {
      if (typeof client.release === 'function') client.release();
    }
  } catch (err) {
    console.error('[WATCHDOG] feedWatchDog outer error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Check if user can perform operations
 */
async function canUserOperate(userId) {
  const state = await getWatchDogState(userId);
  
  // Check if frozen
  if (state.isFrozen) {
    return { 
      allowed: false, 
      reason: 'ACCOUNT_FROZEN', 
      frozenReason: state.frozenReason 
    };
  }
  
  // Check if dog is sleeping (expired)
  if (state.dogState === 'SLEEPING') {
    return { 
      allowed: false, 
      reason: 'WATCHDOG_SLEEPING',
      lastFedAt: state.lastFedAt
    };
  }
  
  return { allowed: true, reason: null };
}

/**
 * Get full system integrity report (admin only)
 */
async function runFullSystemIntegrityCheck() {
  console.log('[WATCHDOG] Starting full system integrity check...');
  
  try {
    const result = await dbQuery('SELECT id FROM users');
    const users = result.rows.map(r => r.id);
    
    console.log(`[WATCHDOG] Checking ${users.length} users...`);
    
    let totalMismatches = 0;
    let frozenAccounts = [];
    
    for (const userId of users) {
      const results = await verifySystemIntegrity(userId);
      if (results.hasMismatch) {
        totalMismatches++;
        frozenAccounts.push(userId);
      }
    }
    
    console.log(`[WATCHDOG] Full system check complete. Mismatches found: ${totalMismatches}`);
    return { 
      usersChecked: users.length, 
      mismatches: totalMismatches,
      frozenAccounts 
    };
  } catch (err) {
    console.error('[WATCHDOG] Full system check failed:', err);
    return { error: err.message };
  }
}

// Export for use in server
export const WatchDogGuardian = {
  // Core integrity - DETECTOR only (never auto-heals)
  verifySystemIntegrity,
  getLedgerBalance,
  countActiveCodes,
  
  // State management
  getWatchDogState,
  updateWatchDogState,
  updateDogStateByTime,
  
  // Actions
  feedWatchDog,
  freezeAccount,
  canUserOperate,
  
  // Admin
  runFullSystemIntegrityCheck
};

export default WatchDogGuardian;
