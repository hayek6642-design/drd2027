/**
 * 🛡️ WATCH-DOG GUARDIAN - Production Security Layer
 *
 * DESIGN: Enforcer | Gatekeeper | Security Layer
 * - NEVER auto-heal (dangerous)
 * - Detect mismatches → Log critical error → Freeze account
 * - Control system state based on feeding
 *
 * States:
 * - ACTIVE:   Normal operations allowed. Dog is alive & fed.
 * - SLEEPING: 24h+ without feeding. Extra mode disabled.
 * - DEAD:     72h+ without feeding. Exposed to Qarsan theft.
 */

import { query as dbQuery, pool } from '../api/config/db.js';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────

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

      console.error(`[WATCHDOG] 🚨 CRITICAL MISMATCH DETECTED`, {
        userId,
        asset: assetType,
        ledgerBalance: ledger,
        codesCount: codes,
        difference: diff,
        severity: 'CRITICAL',
        timestamp: new Date().toISOString()
      });

      await freezeAccount(userId, `INTEGRITY_MISMATCH: ${assetType} diff=${diff}`);
    }
  }

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

      await client.query(
        `INSERT INTO watchdog_state (user_id, is_frozen, frozen_reason, updated_at)
         VALUES ($1, 1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET
           is_frozen = 1,
           frozen_reason = $2,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, reason]
      );

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
 * Update dog state based on time since last feed.
 *
 * > 24h → SLEEPING (extra mode off, account exposed)
 * > 72h → DEAD (exposed to Qarsan theft)
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
      await updateWatchDogState(userId, { dogState: 'SLEEPING' });
      console.warn(`[WATCHDOG] 🐕 ${userId} is SLEEPING (${hoursSinceLastFeed.toFixed(1)}h since last feed)`);
    } else if (hoursSinceLastFeed <= 24 && (state.dogState === 'SLEEPING' || state.dogState === 'DEAD')) {
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
 * - cost: 10 codes (20 on 2-day neglect)
 * - atomic deduction with proper locking
 * - update lastFedAt
 */
async function feedWatchDog(userId, idempotencyKey = null) {
  let FEED_COST = 10;

  console.log(`[WATCHDOG] Feeding dog for user ${userId}, cost: ${FEED_COST} codes`);

  const currentDogState = await getWatchDogState(userId);

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

    if (hoursSinceFeed < 24) {
      return {
        success: false,
        error: 'ALREADY_FED',
        message: 'The dog is already fed today! Come back in ' + Math.ceil(24 - hoursSinceFeed) + ' hours.',
        nextFeedIn: Math.ceil(24 - hoursSinceFeed),
        dogState: currentDogState.dogState
      };
    }

    if (hoursSinceFeed >= 48) {
      FEED_COST = 20;
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

      if (idempotencyKey) {
        const existingTx = await client.query(
          `SELECT id, created_at FROM ledger
           WHERE user_id = $1 AND reference = 'QARSAN_DOG_FEED'
           AND json_extract(meta, '$.idempotency_key') = $2
           ORDER BY created_at DESC LIMIT 1`,
          [userId, idempotencyKey]
        );

        if (existingTx.rows.length > 0) {
          await client.query('COMMIT');
          return {
            success: true,
            idempotent: true,
            cost: FEED_COST,
            timestamp: existingTx.rows[0].created_at
          };
        }
      }

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

      const balanceRes = await client.query(
        `SELECT COUNT(*)::int as count FROM codes
         WHERE user_id = $1 AND (spent IS FALSE OR spent IS NULL OR spent = 0)`,
        [userId]
      );
      const currentBalance = parseInt(balanceRes.rows[0]?.count || 0, 10);

      if (currentBalance < FEED_COST) {
        await client.query('ROLLBACK');
        return { success: false, error: 'INSUFFICIENT_CODES', required: FEED_COST, available: currentBalance };
      }

      const codesRes = await client.query(
        `SELECT id FROM codes
         WHERE user_id = $1 AND (spent IS FALSE OR spent IS NULL OR spent = 0)
         ORDER BY created_at ASC
         LIMIT $2`,
        [userId, FEED_COST]
      );

      const codeIds = codesRes.rows.map(r => r.id);
      for (const codeId of codeIds) {
        await client.query(
          `UPDATE codes SET spent = 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [codeId]
        );
      }

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

      await client.query(
        `INSERT INTO watchdog_state (user_id, last_fed_at, dog_state, updated_at)
         VALUES ($1, CURRENT_TIMESTAMP, 'ACTIVE', CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET
           last_fed_at = CURRENT_TIMESTAMP,
           dog_state = 'ACTIVE',
           updated_at = CURRENT_TIMESTAMP`,
        [userId]
      );

      await client.query(
        `INSERT INTO audit_log (type, payload) VALUES ($1, $2)`,
        ['WATCHDOG_FED', JSON.stringify({
          userId, cost: FEED_COST, idempotencyKey, txId,
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

  if (state.isFrozen) {
    return {
      allowed: false,
      reason: 'ACCOUNT_FROZEN',
      frozenReason: state.frozenReason
    };
  }

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

// ─────────────────────────────────────────────────────────────────
// 🦁 QARSAN SOCIAL LEADERBOARD FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Get ALL users with their real balances (codes/silver/gold) and dog states.
 * Used by the Qarsan leaderboard.
 * Updates each user's dog state based on time before returning.
 *
 * @param {string} currentUserId - The requesting user (to flag "you" in the list)
 * @returns {Object} { success, users: [...] }
 */
async function getAllUsersStatus(currentUserId = null) {
  try {
    // Fetch all users with their watchdog state
    const result = await dbQuery(`
      SELECT
        u.id,
        COALESCE(u.name, u.username, split_part(u.email, '@', 1)) AS display_name,
        u.email,
        COALESCE(ws.dog_state, 'SLEEPING') AS dog_state,
        ws.last_fed_at,
        COALESCE(ws.is_frozen, 0) AS is_frozen,
        COALESCE((
          SELECT SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END)
          FROM ledger WHERE user_id = u.id AND asset_type = 'codes'
        ), 0)::int AS codes_balance,
        COALESCE((
          SELECT SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END)
          FROM ledger WHERE user_id = u.id AND asset_type = 'silver'
        ), 0)::int AS silver_balance,
        COALESCE((
          SELECT SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END)
          FROM ledger WHERE user_id = u.id AND asset_type = 'gold'
        ), 0)::int AS gold_balance,
        COALESCE((
          SELECT qarsan_wallet FROM qarsan_state WHERE user_id = u.id
        ), 0)::int AS qarsan_wallet
      FROM users u
      LEFT JOIN watchdog_state ws ON ws.user_id = u.id
      ORDER BY codes_balance DESC, silver_balance DESC, gold_balance DESC
    `);

    // Refresh each user's dog state based on time, then build the response
    const users = [];
    for (const row of result.rows) {
      // Refresh dog state by elapsed time
      const timeCheck = await updateDogStateByTime(row.id);
      const dogState = timeCheck.dogState || row.dog_state;

      const codesBalance = Math.max(0, parseInt(row.codes_balance || 0));
      const silverBalance = Math.max(0, parseInt(row.silver_balance || 0));
      const goldBalance = Math.max(0, parseInt(row.gold_balance || 0));
      const qarsanWallet = Math.max(0, parseInt(row.qarsan_wallet || 0));
      const totalAssets = codesBalance + silverBalance + goldBalance + qarsanWallet;

      users.push({
        id: row.id,
        displayName: row.display_name || 'Unknown User',
        isCurrentUser: row.id === currentUserId,
        dogState,                                   // ACTIVE | SLEEPING | DEAD
        lastFedAt: row.last_fed_at,
        isFrozen: !!row.is_frozen,
        isExposed: dogState === 'DEAD',             // 💀 Can be stolen from
        isProtected: dogState === 'ACTIVE',          // 🛡️ Safe from theft
        balances: {
          codes: codesBalance,
          silver: silverBalance,
          gold: goldBalance,
          qarsanWallet
        },
        totalAssets,
        hoursSinceLastFeed: timeCheck.hoursSinceLastFeed || null
      });
    }

    return { success: true, users, fetchedAt: new Date().toISOString() };

  } catch (err) {
    console.error('[WATCHDOG] getAllUsersStatus error:', err);
    return { success: false, error: err.message, users: [] };
  }
}

/**
 * 🔔 Notify a user (with dead dog) to buy a new dog.
 * Free action. Logged in audit_log for in-app notification display.
 *
 * @param {string} actorId - The user sending the notification
 * @param {string} targetId - The user with the dead dog
 */
async function notifyUserBuyDog(actorId, targetId) {
  try {
    if (actorId === targetId) {
      return { success: false, error: 'SELF_ACTION', message: 'Cannot notify yourself.' };
    }

    // Verify target has dead dog
    await updateDogStateByTime(targetId);
    const targetState = await getWatchDogState(targetId);

    if (targetState.dogState !== 'DEAD') {
      return {
        success: false,
        error: 'DOG_NOT_DEAD',
        message: 'This user\'s dog is not dead. They are already protected.'
      };
    }

    // Check for recent duplicate notification (within last hour)
    const recentNotify = await dbQuery(
      `SELECT id FROM audit_log
       WHERE type = 'QARSAN_DOG_NOTIFICATION'
         AND payload->>'to' = $1
         AND payload->>'from' = $2
         AND created_at > NOW() - INTERVAL '1 hour'
       LIMIT 1`,
      [targetId, actorId]
    );

    if (recentNotify.rows.length > 0) {
      return {
        success: false,
        error: 'ALREADY_NOTIFIED',
        message: 'You already notified this user recently. Wait a bit before sending again.'
      };
    }

    await dbQuery(
      `INSERT INTO audit_log (type, payload) VALUES ($1, $2::jsonb)`,
      ['QARSAN_DOG_NOTIFICATION', JSON.stringify({
        from: actorId,
        to: targetId,
        message: '⚠️ Your guard dog has died! Buy a new dog (1000 codes) to protect your assets from being stolen by other users.',
        timestamp: new Date().toISOString()
      })]
    );

    console.log(`[QARSAN] 🔔 Notification sent: ${actorId} → ${targetId}`);
    return { success: true, message: 'Notification sent to the user.' };

  } catch (err) {
    console.error('[WATCHDOG] notifyUserBuyDog error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 🐕 Buy a new dog for another user (Good Samaritan action).
 *
 * Cost: 1000 codes deducted from actor.
 * Effect: Target's dog_state resets to ACTIVE (last_fed_at = now).
 * Requires: Target must have a DEAD dog.
 *
 * @param {string} actorId - The buyer
 * @param {string} targetId - The user receiving the new dog
 */
async function buyDogForUser(actorId, targetId) {
  const DOG_COST = 1000;

  if (actorId === targetId) {
    return {
      success: false,
      error: 'SELF_ACTION',
      message: 'To buy a dog for yourself, use the Pebalaash store.'
    };
  }

  // Verify target has dead dog
  await updateDogStateByTime(targetId);
  const targetState = await getWatchDogState(targetId);

  if (targetState.dogState !== 'DEAD') {
    return {
      success: false,
      error: 'DOG_NOT_DEAD',
      message: 'This user\'s dog is not dead. They are already protected.'
    };
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check actor balance
      const balanceRes = await client.query(
        `SELECT COUNT(*)::int as count FROM codes
         WHERE user_id = $1 AND (spent IS FALSE OR spent IS NULL OR spent = 0)`,
        [actorId]
      );
      const actorBalance = parseInt(balanceRes.rows[0]?.count || 0, 10);

      if (actorBalance < DOG_COST) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'INSUFFICIENT_CODES',
          required: DOG_COST,
          available: actorBalance,
          message: `You need ${DOG_COST} codes but only have ${actorBalance}.`
        };
      }

      // Select and mark actor's codes as spent
      const codesRes = await client.query(
        `SELECT id FROM codes
         WHERE user_id = $1 AND (spent IS FALSE OR spent IS NULL OR spent = 0)
         ORDER BY created_at ASC LIMIT $2`,
        [actorId, DOG_COST]
      );

      for (const row of codesRes.rows) {
        await client.query(
          `UPDATE codes SET spent = 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [row.id]
        );
      }

      // Ledger debit for actor (codes burned)
      const txId = crypto.randomUUID();
      await client.query(
        `INSERT INTO ledger (id, tx_id, user_id, direction, asset_type, amount, reference, meta)
         VALUES ($1, $2, $3, 'debit', 'codes', $4, 'QARSAN_BUY_DOG_FOR_OTHER', $5::jsonb)`,
        [crypto.randomUUID(), txId, actorId, DOG_COST, JSON.stringify({
          operation: 'buy_dog_for_user',
          targetUserId: targetId,
          timestamp: new Date().toISOString()
        })]
      );

      // Revive target's dog → ACTIVE
      await client.query(
        `INSERT INTO watchdog_state (user_id, last_fed_at, dog_state, updated_at)
         VALUES ($1, CURRENT_TIMESTAMP, 'ACTIVE', CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET
           last_fed_at = CURRENT_TIMESTAMP,
           dog_state   = 'ACTIVE',
           updated_at  = CURRENT_TIMESTAMP`,
        [targetId]
      );

      // Audit log
      await client.query(
        `INSERT INTO audit_log (type, payload) VALUES ($1, $2::jsonb)`,
        ['QARSAN_BUY_DOG_FOR_USER', JSON.stringify({
          actorId, targetId, cost: DOG_COST, txId,
          timestamp: new Date().toISOString()
        })]
      );

      await client.query('COMMIT');
      console.log(`[QARSAN] 🐕 ${actorId} bought dog for ${targetId} (cost: ${DOG_COST})`);

      return {
        success: true,
        cost: DOG_COST,
        actorNewBalance: actorBalance - DOG_COST,
        message: `You bought a new dog for this user! ${DOG_COST} codes deducted from your account. Their assets are now protected.`
      };

    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[WATCHDOG] buyDogForUser error:', err);
      return { success: false, error: err.message };
    } finally {
      if (typeof client.release === 'function') client.release();
    }
  } catch (err) {
    console.error('[WATCHDOG] buyDogForUser outer error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 💀 Steal ALL assets from an exposed user (dead dog).
 *
 * Transfers codes, silver, gold AND qarsan wallet from target → actor.
 * Fully atomic. Only works when target's dog_state === 'DEAD'.
 *
 * @param {string} actorId - The thief
 * @param {string} targetId - The victim (must have DEAD dog)
 */
async function stealFromUser(actorId, targetId) {
  if (actorId === targetId) {
    return { success: false, error: 'SELF_ACTION', message: 'You cannot steal from yourself.' };
  }

  // Verify actor's own dog is ACTIVE (protected users can steal too, but let's be explicit)
  await updateDogStateByTime(targetId);
  const targetState = await getWatchDogState(targetId);

  if (targetState.dogState !== 'DEAD') {
    return {
      success: false,
      error: 'TARGET_PROTECTED',
      message: 'This user\'s guard dog is alive. They are fully protected from theft.'
    };
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const assetTypes = ['codes', 'silver', 'gold'];
      const stolen = {};
      let totalStolenValue = 0;

      // ── Transfer each asset type ─────────────────────────────────
      for (const assetType of assetTypes) {
        // Get target's current balance from ledger
        const balRes = await client.query(
          `SELECT COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END), 0)::int AS balance
           FROM ledger WHERE user_id = $1 AND asset_type = $2`,
          [targetId, assetType]
        );
        const balance = Math.max(0, parseInt(balRes.rows[0]?.balance || 0, 10));
        stolen[assetType] = balance;

        if (balance <= 0) continue;

        totalStolenValue += balance;

        // Mark target's physical tokens as spent
        await client.query(
          `UPDATE codes SET spent = 1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1
             AND COALESCE(type, 'codes') = $2
             AND (spent IS FALSE OR spent IS NULL OR spent = 0)`,
          [targetId, assetType]
        );

        // Create new tokens for actor (matching count)
        for (let i = 0; i < balance; i++) {
          await client.query(
            `INSERT INTO codes (id, user_id, type, spent, created_at)
             VALUES ($1, $2, $3, 0, CURRENT_TIMESTAMP)`,
            [crypto.randomUUID(), actorId, assetType]
          );
        }

        const txId = crypto.randomUUID();
        const meta = JSON.stringify({
          operation: 'qarsan_steal',
          actorId,
          targetId,
          assetType,
          timestamp: new Date().toISOString()
        });

        // Debit target's ledger
        await client.query(
          `INSERT INTO ledger (id, tx_id, user_id, direction, asset_type, amount, reference, meta)
           VALUES ($1, $2, $3, 'debit', $4, $5, 'QARSAN_STOLEN', $6::jsonb)`,
          [crypto.randomUUID(), txId, targetId, assetType, balance, meta]
        );

        // Credit actor's ledger
        await client.query(
          `INSERT INTO ledger (id, tx_id, user_id, direction, asset_type, amount, reference, meta)
           VALUES ($1, $2, $3, 'credit', $4, $5, 'QARSAN_STEAL_GAIN', $6::jsonb)`,
          [crypto.randomUUID(), txId, actorId, assetType, balance, meta]
        );
      }

      // ── Also drain qarsan_wallet ─────────────────────────────────
      const qWalletRes = await client.query(
        `SELECT COALESCE(qarsan_wallet, 0)::int AS wallet FROM qarsan_state WHERE user_id = $1`,
        [targetId]
      );
      const qarsanWallet = Math.max(0, parseInt(qWalletRes.rows[0]?.wallet || 0, 10));

      if (qarsanWallet > 0) {
        stolen.qarsan_wallet = qarsanWallet;
        totalStolenValue += qarsanWallet;

        // Zero out target's qarsan wallet
        await client.query(
          `UPDATE qarsan_state SET qarsan_wallet = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
          [targetId]
        );

        // Give to actor's qarsan wallet or codes
        await client.query(
          `INSERT INTO qarsan_state (user_id, qarsan_wallet, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id) DO UPDATE SET
             qarsan_wallet = qarsan_state.qarsan_wallet + $2,
             updated_at = CURRENT_TIMESTAMP`,
          [actorId, qarsanWallet]
        );

        const txId = crypto.randomUUID();
        const meta = JSON.stringify({ operation: 'qarsan_wallet_steal', actorId, targetId });

        await client.query(
          `INSERT INTO ledger (id, tx_id, user_id, direction, asset_type, amount, reference, meta)
           VALUES ($1, $2, $3, 'debit', 'codes', $4, 'QARSAN_WALLET_STOLEN', $5::jsonb)`,
          [crypto.randomUUID(), txId, targetId, qarsanWallet, meta]
        );

        await client.query(
          `INSERT INTO ledger (id, tx_id, user_id, direction, asset_type, amount, reference, meta)
           VALUES ($1, $2, $3, 'credit', 'codes', $4, 'QARSAN_WALLET_STEAL_GAIN', $5::jsonb)`,
          [crypto.randomUUID(), txId, actorId, qarsanWallet, meta]
        );
      }

      if (totalStolenValue === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'NOTHING_TO_STEAL',
          message: 'This user has no assets to steal — their account is empty.'
        };
      }

      // ── Audit log ────────────────────────────────────────────────
      await client.query(
        `INSERT INTO audit_log (type, payload) VALUES ($1, $2::jsonb)`,
        ['QARSAN_STEAL', JSON.stringify({
          actorId, targetId, stolen, totalStolenValue,
          timestamp: new Date().toISOString()
        })]
      );

      await client.query('COMMIT');

      const stolenSummary = Object.entries(stolen)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${v} ${k}`)
        .join(', ');

      console.log(`[QARSAN] 💀 ${actorId} stole from ${targetId}: ${stolenSummary}`);

      return {
        success: true,
        stolen,
        totalStolenValue,
        message: `🎉 You successfully stole ${stolenSummary} from this user! All their assets are now yours.`
      };

    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[WATCHDOG] stealFromUser error:', err);
      return { success: false, error: err.message };
    } finally {
      if (typeof client.release === 'function') client.release();
    }
  } catch (err) {
    console.error('[WATCHDOG] stealFromUser outer error:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────

export const WatchDogGuardian = {
  // Core integrity - DETECTOR only (never auto-heals)
  verifySystemIntegrity,
  getLedgerBalance,
  countActiveCodes,

  // State management
  getWatchDogState,
  updateWatchDogState,
  updateDogStateByTime,

  // Dog actions
  feedWatchDog,
  freezeAccount,
  canUserOperate,

  // 🦁 Qarsan Social Leaderboard
  getAllUsersStatus,
  notifyUserBuyDog,
  buyDogForUser,
  stealFromUser,

  // Admin
  runFullSystemIntegrityCheck
};

export default WatchDogGuardian;
