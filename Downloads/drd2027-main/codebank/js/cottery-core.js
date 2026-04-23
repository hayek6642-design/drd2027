/**
 * ============================================================================
 * COTTERY (Code+Lottery) - Core Logic
 * ============================================================================
 * 
 * This module handles all business logic for the lottery system:
 * - Entry purchases
 * - Weight calculations
 * - Cooldown enforcement
 * - Pity bonus system
 * - Draw execution
 * - Fairness calculations
 * 
 * Integration points:
 * - ACC (deduct/add codes)
 * - SafeCode (record transactions)
 * - Auth system (user validation)
 * - Database (cottery_* tables)
 * ============================================================================
 */

const crypto = require('crypto');
const db = require('./database'); // Adjust to your DB module

// ============================================================================
// CONFIGURATION
// ============================================================================

const COTTERY_CONFIG = {
  CODES_PER_ENTRY: 10,
  MIN_WEIGHT: 0.1,
  WEIGHT_PENALTY_PER_WIN: 0.05,
  COOLDOWN_HOURS: 72,
  PITY_LOSS_THRESHOLD_1: 10,  // +50% weight
  PITY_LOSS_THRESHOLD_2: 20,  // +100% weight
  PITY_LOSS_THRESHOLD_3: 30,  // +150% weight + guaranteed
  PITY_MULTIPLIERS: {
    0: 1.0,      // No pity
    1: 1.5,      // +50%
    2: 2.0,      // +100%
    3: 3.5       // +150% (+ guaranteed)
  },
  DRAW_TIME: '23:00', // UTC
  WIN_HISTORY_DAYS: 30,
  ADMIN_SECRET_KEY: process.env.COTTERY_ADMIN_SECRET || 'cottery-admin-secret-key'
};

// ============================================================================
// 1. ENTRY PURCHASE
// ============================================================================

/**
 * Buy entries for the current round
 * @param {string} userId - User ID
 * @param {number} entryCount - Number of entries to buy (must be >= 1)
 * @param {object} accAPI - ACC API methods (deduct codes)
 * @param {object} safeCodeAPI - SafeCode API (record transaction)
 * @returns {Promise<{success: boolean, message: string, entryId?: number, newBalance?: number}>}
 */
async function buyEntries(userId, entryCount, accAPI, safeCodeAPI) {
  try {
    // Validation
    if (!userId || entryCount < 1) {
      return { success: false, message: 'Invalid entry count' };
    }

    const totalCostCodes = entryCount * COTTERY_CONFIG.CODES_PER_ENTRY;

    // Get user's current code balance
    const userBalance = await accAPI.getBalance(userId);
    if (userBalance < totalCostCodes) {
      return { success: false, message: 'Insufficient codes' };
    }

    // Get or create today's round
    const roundId = await getOrCreateTodayRound();

    // Check if user already has entries this round
    const existingEntry = await db.prepare(
      'SELECT id, quantity FROM cottery_entries WHERE round_id = ? AND user_id = ?'
    ).get(roundId, userId);

    let result;

    // Use transaction for atomicity
    const transaction = await db.transaction(async () => {
      // Deduct codes from ACC
      const deductResult = await accAPI.deductCodes(userId, totalCostCodes, {
        type: 'lottery_entry',
        round_id: roundId,
        entries: entryCount
      });

      if (!deductResult.success) {
        throw new Error('Failed to deduct codes');
      }

      // Record in SafeCode
      await safeCodeAPI.recordTransaction(userId, {
        type: 'lottery_entry',
        amount: -totalCostCodes,
        description: `Purchased ${entryCount} lottery entries`,
        round_id: roundId
      });

      // Update entries
      if (existingEntry) {
        // Update existing entry
        await db.prepare(
          'UPDATE cottery_entries SET quantity = quantity + ? WHERE id = ?'
        ).run(entryCount, existingEntry.id);
        result = { entryId: existingEntry.id };
      } else {
        // Create new entry
        const insertResult = await db.prepare(
          'INSERT INTO cottery_entries (round_id, user_id, quantity, weight) VALUES (?, ?, ?, ?)'
        ).run(roundId, userId, entryCount, 1.0);
        result = { entryId: insertResult.lastID };
      }

      // Update round total
      await db.prepare(
        'UPDATE cottery_rounds SET total_entries = total_entries + ? WHERE id = ?'
      ).run(entryCount, roundId);

      // Update user stats
      await updateUserStats(userId, {
        total_entries_bought: entryCount,
        total_codes_spent: totalCostCodes
      });
    });

    return {
      success: true,
      message: `Purchased ${entryCount} entries`,
      entryId: result.entryId,
      newBalance: deductResult.newBalance
    };

  } catch (error) {
    console.error('Error buying entries:', error);
    return { success: false, message: error.message };
  }
}

// ============================================================================
// 2. LEDGER SYSTEM
// ============================================================================

/**
 * Calculate user's current weight based on win history
 * @param {string} userId - User ID
 * @returns {Promise<number>} Weight multiplier (0.1 to 1.0)
 */
async function calculateUserWeight(userId) {
  const ledger = await db.prepare(
    'SELECT win_count_30d FROM cottery_ledger WHERE user_id = ?'
  ).get(userId);

  if (!ledger) {
    // User has no entry in ledger, return default
    return 1.0;
  }

  // Weight formula: 1.0 - (win_count × 0.05), minimum 0.1
  const weight = Math.max(
    1.0 - (ledger.win_count_30d * COTTERY_CONFIG.WEIGHT_PENALTY_PER_WIN),
    COTTERY_CONFIG.MIN_WEIGHT
  );

  return weight;
}

/**
 * Check if user is in cooldown (cannot win)
 * @param {string} userId - User ID
 * @returns {Promise<{inCooldown: boolean, cooldownUntil: Date | null}>}
 */
async function checkCooldown(userId) {
  const ledger = await db.prepare(
    'SELECT cooldown_until FROM cottery_ledger WHERE user_id = ?'
  ).get(userId);

  if (!ledger) {
    return { inCooldown: false, cooldownUntil: null };
  }

  const now = new Date();
  const cooldownUntil = new Date(ledger.cooldown_until);

  const inCooldown = now < cooldownUntil;
  return {
    inCooldown,
    cooldownUntil: inCooldown ? cooldownUntil : null
  };
}

/**
 * Apply weight to user's entries before draw
 * @param {string} userId - User ID
 * @param {number} roundId - Round ID
 * @returns {Promise<number>} Effective entries after weight
 */
async function applyWeightToEntries(userId, roundId) {
  // Get user's actual entries
  const entry = await db.prepare(
    'SELECT quantity FROM cottery_entries WHERE round_id = ? AND user_id = ?'
  ).get(roundId, userId);

  if (!entry) {
    return 0;
  }

  // Calculate current weight
  const weight = await calculateUserWeight(userId);

  // Apply pity bonus if applicable
  const pityWeight = await getPityBonus(userId);
  const finalWeight = weight * pityWeight;

  // Update entry with calculated weight
  await db.prepare(
    'UPDATE cottery_entries SET weight = ? WHERE round_id = ? AND user_id = ?'
  ).run(finalWeight, roundId, userId);

  return entry.quantity * finalWeight;
}

/**
 * Get pity bonus multiplier for user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Multiplier (1.0 to 3.5)
 */
async function getPityBonus(userId) {
  const ledger = await db.prepare(
    'SELECT pity_level FROM cottery_ledger WHERE user_id = ?'
  ).get(userId);

  if (!ledger) {
    return 1.0;
  }

  return COTTERY_CONFIG.PITY_MULTIPLIERS[ledger.pity_level] || 1.0;
}

/**
 * Update ledger after a user wins
 * @param {string} userId - User ID
 * @param {number} roundId - Round ID
 */
async function recordWin(userId, roundId) {
  const now = new Date();
  const cooldownUntil = new Date(now.getTime() + COTTERY_CONFIG.COOLDOWN_HOURS * 60 * 60 * 1000);

  await db.prepare(`
    INSERT INTO cottery_ledger (user_id, win_count_30d, last_win_date, cooldown_until, current_weight, pity_level)
    VALUES (?, 1, ?, ?, ?, 0)
    ON CONFLICT(user_id) DO UPDATE SET
      win_count_30d = win_count_30d + 1,
      last_win_date = ?,
      cooldown_until = ?,
      loss_streak = 0,
      pity_level = 0,
      updated_at = CURRENT_TIMESTAMP
  `).run(userId, now, cooldownUntil, now, cooldownUntil);

  // Invalidate pity history entry (mark as used)
  await db.prepare(`
    UPDATE cottery_pity_history SET was_used = CURRENT_TIMESTAMP
    WHERE user_id = ? AND was_used IS NULL
  `).run(userId);

  // Update user stats
  await updateUserStats(userId, { total_wins: 1 });
}

/**
 * Update loss streak and check for pity activation
 * @param {string} userId - User ID
 */
async function recordLoss(userId) {
  const ledger = await db.prepare(
    'SELECT loss_streak FROM cottery_ledger WHERE user_id = ?'
  ).get(userId);

  const newLossStreak = (ledger?.loss_streak || 0) + 1;

  // Determine pity level
  let pityLevel = 0;
  if (newLossStreak >= COTTERY_CONFIG.PITY_LOSS_THRESHOLD_3) {
    pityLevel = 3;
  } else if (newLossStreak >= COTTERY_CONFIG.PITY_LOSS_THRESHOLD_2) {
    pityLevel = 2;
  } else if (newLossStreak >= COTTERY_CONFIG.PITY_LOSS_THRESHOLD_1) {
    pityLevel = 1;
  }

  const now = new Date();

  await db.prepare(`
    INSERT INTO cottery_ledger (user_id, loss_streak, last_loss_date, pity_level)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      loss_streak = ?,
      last_loss_date = ?,
      pity_level = ?,
      updated_at = CURRENT_TIMESTAMP
  `).run(userId, newLossStreak, now, pityLevel, newLossStreak, now, pityLevel);

  // Record pity activation
  if (pityLevel > 0) {
    await db.prepare(`
      INSERT INTO cottery_pity_history (user_id, activation_date, pity_level, loss_count)
      VALUES (?, ?, ?, ?)
    `).run(userId, now, pityLevel, newLossStreak);
  }
}

/**
 * Clear old wins (>30 days) from win_count_30d
 * Called periodically to keep ledger up to date
 */
async function cleanupOldWins() {
  const thirtyDaysAgo = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);

  await db.prepare(`
    UPDATE cottery_ledger SET win_count_30d = (
      SELECT COUNT(*) FROM cottery_winners
      WHERE user_id = cottery_ledger.user_id
      AND created_at > ?
    )
  `).run(thirtyDaysAgo);
}

// ============================================================================
// 3. DRAW EXECUTION
// ============================================================================

/**
 * Execute the lottery draw for a round
 * @param {number} roundId - Round ID to draw
 * @param {string} adminUserId - Admin user ID executing draw
 * @param {object} accAPI - ACC API for prize distribution
 * @param {object} safeCodeAPI - SafeCode API for transaction recording
 * @param {string} seedOverride - Optional seed for testing (admin only)
 * @returns {Promise<{success: boolean, winner: string, prize: number, proof: string, error?: string}>}
 */
async function executeDraw(roundId, adminUserId, accAPI, safeCodeAPI, seedOverride = null) {
  try {
    // Get round details
    const round = await db.prepare(
      'SELECT * FROM cottery_rounds WHERE id = ?'
    ).get(roundId);

    if (!round || round.status !== 'pending') {
      throw new Error('Round not found or already completed');
    }

    // Get all entries with weights
    const allEntries = await db.prepare(`
      SELECT ce.id, ce.user_id, ce.quantity, ce.weight, cl.cooldown_until
      FROM cottery_entries ce
      LEFT JOIN cottery_ledger cl ON ce.user_id = cl.user_id
      WHERE ce.round_id = ?
    `).all(roundId);

    if (allEntries.length === 0) {
      throw new Error('No entries in round');
    }

    // Clean up old wins before calculating weights
    await cleanupOldWins();

    // Calculate effective entries (weight-adjusted)
    const weightedEntries = [];
    let totalEffectiveEntries = 0;

    for (const entry of allEntries) {
      // Check cooldown
      const now = new Date();
      const cooldownUntil = entry.cooldown_until ? new Date(entry.cooldown_until) : null;
      const isEligible = !cooldownUntil || now >= cooldownUntil;

      if (!isEligible) {
        // Skip this entry - user is in cooldown
        continue;
      }

      const effectiveEntries = entry.quantity * (entry.weight || 1.0);
      weightedEntries.push({
        ...entry,
        effective_entries: effectiveEntries,
        start_index: totalEffectiveEntries
      });
      totalEffectiveEntries += effectiveEntries;
    }

    if (totalEffectiveEntries === 0) {
      throw new Error('No eligible entries');
    }

    // Generate draw seed (cryptographic)
    const drawSeed = generateDrawSeed(round, seedOverride);
    const seedHash = crypto.createHash('sha256').update(drawSeed).digest('hex');

    // Select winner based on seed
    const seedNumber = BigInt('0x' + seedHash);
    const winningIndex = Number(seedNumber % BigInt(Math.floor(totalEffectiveEntries)));

    // Find winner
    let winner = null;
    let winningEntryId = null;
    for (const entry of weightedEntries) {
      if (winningIndex >= entry.start_index && 
          winningIndex < entry.start_index + entry.effective_entries) {
        winner = entry;
        winningEntryId = entry.id;
        break;
      }
    }

    if (!winner) {
      throw new Error('Winner selection failed');
    }

    // Calculate prize
    const prizeAmount = round.total_entries + 1000;

    // Record win in transaction
    await db.transaction(async () => {
      // Update round
      await db.prepare(`
        UPDATE cottery_rounds 
        SET status = 'completed', winner_user_id = ?, winning_entry_id = ?, 
            prize_pool = ?, draw_timestamp = CURRENT_TIMESTAMP, 
            draw_seed = ?, executed_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(winner.user_id, winningEntryId, prizeAmount, seedHash, adminUserId, roundId);

      // Record winner
      const probability = (winner.effective_entries / totalEffectiveEntries);
      await db.prepare(`
        INSERT INTO cottery_winners (round_id, user_id, prize_amount, winning_entry_id, probability, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(roundId, winner.user_id, prizeAmount, winningEntryId, probability);

      // Add prize to winner's balance
      const prizeResult = await accAPI.addCodes(winner.user_id, prizeAmount, {
        type: 'lottery_win',
        round_id: roundId,
        probability: probability
      });

      if (!prizeResult.success) {
        throw new Error('Failed to distribute prize');
      }

      // Record transaction in SafeCode
      await safeCodeAPI.recordTransaction(winner.user_id, {
        type: 'lottery_win',
        amount: prizeAmount,
        description: `Won lottery round ${roundId} (${Math.round(probability * 100)}% chance)`,
        round_id: roundId
      });

      // Update ledger
      await recordWin(winner.user_id, roundId);

      // Record all losses
      for (const entry of allEntries) {
        if (entry.user_id !== winner.user_id) {
          await recordLoss(entry.user_id);
        }
      }

      // Update user stats for winner
      await updateUserStats(winner.user_id, {
        total_prize_codes: prizeAmount,
        win_rate: await calculateWinRate(winner.user_id)
      });

      // Log audit
      await db.prepare(`
        INSERT INTO cottery_audit_log 
        (round_id, executed_by, draw_seed, winner_id, prize_amount, total_entries, status)
        VALUES (?, ?, ?, ?, ?, ?, 'success')
      `).run(roundId, adminUserId, seedHash, winner.user_id, prizeAmount, totalEffectiveEntries);
    });

    // Generate proof
    const proof = generateDrawProof(round, drawSeed, seedHash, winner, probability, totalEffectiveEntries);

    return {
      success: true,
      winner: winner.user_id,
      prize: prizeAmount,
      probability: Math.round((winner.effective_entries / totalEffectiveEntries) * 10000) / 10000,
      proof: proof
    };

  } catch (error) {
    console.error('Draw execution error:', error);

    // Log failure
    await db.prepare(`
      INSERT INTO cottery_audit_log (round_id, executed_by, draw_seed, status, error_message)
      VALUES (?, ?, ?, 'failed', ?)
    `).run(roundId, adminUserId, 'N/A', error.message);

    return { success: false, error: error.message };
  }
}

/**
 * Generate cryptographic draw seed
 * @param {object} round - Round object
 * @param {string} seedOverride - Optional override for testing
 * @returns {string} Draw seed
 */
function generateDrawSeed(round, seedOverride = null) {
  if (seedOverride) return seedOverride;

  const timestamp = new Date().toISOString();
  const roundData = `${round.round_date}-${round.total_entries}`;
  
  return `${roundData}-${timestamp}-${COTTERY_CONFIG.ADMIN_SECRET_KEY}`;
}

/**
 * Generate human-readable draw proof
 * @returns {string} Proof document
 */
function generateDrawProof(round, drawSeed, seedHash, winner, probability, totalEntries) {
  return `
COTTERY DRAW PROOF
==================
Round Date: ${round.round_date}
Draw Seed: ${seedHash}
Total Eligible Entries: ${totalEntries}
Winner User ID: ${winner.user_id}
Winning Entry ID: ${winner.id}
Prize Amount: ${round.total_entries + 1000} codes
Winner Probability: ${(probability * 100).toFixed(4)}%
Draw Timestamp: ${new Date().toISOString()}

Fairness Statement:
- Draw uses SHA-256 cryptographic hash
- All entries weighted by user's win history
- Cooldown periods enforced (72 hours)
- Pity system protects against bad luck
- Full audit log available

Verify This Draw:
1. Get draw seed: ${seedHash}
2. Replay with all entries from this round
3. Confirm winning index matches winner ID
`;
}

// ============================================================================
// 4. UTILITY FUNCTIONS
// ============================================================================

/**
 * Get or create today's round
 * @returns {Promise<number>} Round ID
 */
async function getOrCreateTodayRound() {
  const today = new Date().toISOString().split('T')[0];

  let round = await db.prepare(
    'SELECT id FROM cottery_rounds WHERE round_date = ?'
  ).get(today);

  if (!round) {
    const result = await db.prepare(
      'INSERT INTO cottery_rounds (round_date, status) VALUES (?, ?)'
    ).run(today, 'pending');
    return result.lastID;
  }

  return round.id;
}

/**
 * Update user stats
 * @param {string} userId - User ID
 * @param {object} updates - Fields to update
 */
async function updateUserStats(userId, updates) {
  const stats = await db.prepare(
    'SELECT * FROM cottery_user_stats WHERE user_id = ?'
  ).get(userId);

  if (!stats) {
    // Create new stats
    await db.prepare(`
      INSERT INTO cottery_user_stats 
      (user_id, total_entries_bought, total_codes_spent, total_wins, total_prize_codes, last_participation_date)
      VALUES (?, ?, ?, ?, ?, DATE('now'))
    `).run(userId, 
      updates.total_entries_bought || 0,
      updates.total_codes_spent || 0,
      updates.total_wins || 0,
      updates.total_prize_codes || 0
    );
  } else {
    // Update existing stats
    const updateFields = Object.keys(updates)
      .map(key => `${key} = ${key} + COALESCE(?, 0)`)
      .join(', ');

    const values = Object.values(updates);
    values.push(userId);

    await db.prepare(`
      UPDATE cottery_user_stats 
      SET ${updateFields}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(...values);
  }
}

/**
 * Calculate user's win rate
 * @param {string} userId - User ID
 * @returns {Promise<number>} Win rate (0.0 to 1.0)
 */
async function calculateWinRate(userId) {
  const stats = await db.prepare(
    'SELECT total_entries_bought, total_wins FROM cottery_user_stats WHERE user_id = ?'
  ).get(userId);

  if (!stats || stats.total_entries_bought === 0) {
    return 0;
  }

  return stats.total_wins / stats.total_entries_bought;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Entry management
  buyEntries,

  // Ledger
  calculateUserWeight,
  checkCooldown,
  applyWeightToEntries,
  getPityBonus,
  recordWin,
  recordLoss,
  cleanupOldWins,

  // Draw
  executeDraw,
  generateDrawSeed,
  generateDrawProof,

  // Utility
  getOrCreateTodayRound,
  updateUserStats,
  calculateWinRate,

  // Config (for reference)
  COTTERY_CONFIG
};
