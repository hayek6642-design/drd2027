/**
 * ============================================================================
 * COTTERY API ROUTES
 * ============================================================================
 * 
 * Express route handlers for the Cottery lottery system
 * 
 * Mount with: app.use('/api/cottery', cotteryRoutes)
 * 
 * Requires:
 * - express
 * - authenticated middleware (ensures req.user is set)
 * - database module
 * - cottery-core module
 * - ACC API (code balance system)
 * - SafeCode API (transaction ledger)
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const cotteryCore = require('./cottery-core');
const db = require('./database');

// Middleware: Require authentication
router.use((req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
});

// ============================================================================
// 1. BUY ENTRIES
// ============================================================================

/**
 * POST /api/cottery/buy-entries
 * Purchase lottery entries
 * 
 * Body: {
 *   quantity: number (1-1000)
 * }
 * 
 * Returns: {
 *   success: boolean,
 *   message: string,
 *   entryId?: number,
 *   newBalance?: number,
 *   roundId?: number
 * }
 */
router.post('/buy-entries', async (req, res) => {
  try {
    const { quantity } = req.body;
    const userId = req.user.id;

    // Validation
    if (!quantity || quantity < 1 || quantity > 1000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quantity must be between 1 and 1000' 
      });
    }

    // Call core logic
    const result = await cotteryCore.buyEntries(
      userId,
      quantity,
      req.app.locals.accAPI,     // Your ACC API handler
      req.app.locals.safeCodeAPI   // Your SafeCode API handler
    );

    // Get current round info
    const roundId = await cotteryCore.getOrCreateTodayRound();

    res.json({ ...result, roundId });

  } catch (error) {
    console.error('Buy entries error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// 2. GET CURRENT ROUND INFO
// ============================================================================

/**
 * GET /api/cottery/round/current
 * Get current round information and user's participation
 * 
 * Returns: {
 *   roundId: number,
 *   roundDate: string (YYYY-MM-DD),
 *   status: 'pending' | 'completed' | 'cancelled',
 *   totalEntries: number,
 *   prizePool: number,
 *   userEntries: number,
 *   userWeight: number,
 *   userEffectiveEntries: number,
 *   timeToNextDraw: number (seconds),
 *   participatingUsers: number
 * }
 */
router.get('/round/current', async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Get round
    const round = await db.prepare(
      'SELECT * FROM cottery_rounds WHERE round_date = ?'
    ).get(today);

    if (!round) {
      return res.status(404).json({ success: false, message: 'No active round' });
    }

    // Get user's entries and weight
    const userEntry = await db.prepare(
      'SELECT quantity, weight FROM cottery_entries WHERE round_id = ? AND user_id = ?'
    ).get(round.id, userId);

    const userWeight = await cotteryCore.calculateUserWeight(userId);
    const cooldown = await cotteryCore.checkCooldown(userId);

    // Get participating user count
    const participantCount = await db.prepare(
      'SELECT COUNT(DISTINCT user_id) as count FROM cottery_entries WHERE round_id = ?'
    ).get(round.id);

    // Calculate time to draw (23:00 UTC)
    const now = new Date();
    const drawTime = new Date(now);
    drawTime.setUTCHours(23, 0, 0, 0);
    if (now > drawTime) {
      drawTime.setUTCDate(drawTime.getUTCDate() + 1);
    }
    const timeToNextDraw = Math.floor((drawTime - now) / 1000);

    res.json({
      roundId: round.id,
      roundDate: round.round_date,
      status: round.status,
      totalEntries: round.total_entries,
      prizePool: round.prize_pool || (round.total_entries + 1000),
      userEntries: userEntry?.quantity || 0,
      userWeight: Math.round(userWeight * 100) / 100,
      userEffectiveEntries: (userEntry?.quantity || 0) * userWeight,
      userInCooldown: cooldown.inCooldown,
      cooldownUntil: cooldown.cooldownUntil,
      timeToNextDraw,
      participatingUsers: participantCount.count || 0
    });

  } catch (error) {
    console.error('Get round error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// 3. GET USER STATS
// ============================================================================

/**
 * GET /api/cottery/user-stats
 * Get user's lottery statistics and ledger status
 * 
 * Returns: {
 *   totalEntriesBought: number,
 *   totalCodesSpent: number,
 *   totalWins: number,
 *   totalPrizeCodes: number,
 *   winRate: number,
 *   winCount30d: number,
 *   lossStreak: number,
 *   currentWeight: number,
 *   pityLevel: number,
 *   cooldownUntil: string | null,
 *   nextPityLevel: number,
 *   losseUntilPity: number
 * }
 */
router.get('/user-stats', async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await db.prepare(
      'SELECT * FROM cottery_user_stats WHERE user_id = ?'
    ).get(userId);

    const ledger = await db.prepare(
      'SELECT * FROM cottery_ledger WHERE user_id = ?'
    ).get(userId);

    // Default values
    const defaultStats = {
      totalEntriesBought: 0,
      totalCodesSpent: 0,
      totalWins: 0,
      totalPrizeCodes: 0,
      winRate: 0
    };

    const defaultLedger = {
      win_count_30d: 0,
      loss_streak: 0,
      current_weight: 1.0,
      pity_level: 0,
      cooldown_until: null
    };

    const mergedStats = { ...defaultStats, ...stats };
    const mergedLedger = { ...defaultLedger, ...ledger };

    // Calculate next pity level
    let nextPityLevel = mergedLedger.pity_level;
    let lossesUntilPity = 0;
    if (mergedLedger.pity_level === 0 && mergedLedger.loss_streak < 10) {
      lossesUntilPity = 10 - mergedLedger.loss_streak;
    } else if (mergedLedger.pity_level === 1 && mergedLedger.loss_streak < 20) {
      nextPityLevel = 2;
      lossesUntilPity = 20 - mergedLedger.loss_streak;
    } else if (mergedLedger.pity_level === 2 && mergedLedger.loss_streak < 30) {
      nextPityLevel = 3;
      lossesUntilPity = 30 - mergedLedger.loss_streak;
    }

    res.json({
      totalEntriesBought: mergedStats.totalEntriesBought,
      totalCodesSpent: mergedStats.totalCodesSpent,
      totalWins: mergedStats.totalWins,
      totalPrizeCodes: mergedStats.totalPrizeCodes,
      winRate: Math.round(mergedStats.winRate * 10000) / 10000,
      winCount30d: mergedLedger.win_count_30d,
      lossStreak: mergedLedger.loss_streak,
      currentWeight: Math.round(mergedLedger.current_weight * 100) / 100,
      pityLevel: mergedLedger.pity_level,
      pityMultiplier: [1.0, 1.5, 2.0, 3.5][mergedLedger.pity_level] || 1.0,
      cooldownUntil: mergedLedger.cooldown_until,
      nextPityLevel,
      lossesUntilPity
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// 4. GET WINNER BOARD
// ============================================================================

/**
 * GET /api/cottery/winners?days=30
 * Get recent winners
 * 
 * Query: days (default 30)
 * 
 * Returns: [{
 *   roundId: number,
 *   roundDate: string,
 *   winnerId: string,
 *   prize: number,
 *   probability: number,
 *   claimedAt: string | null
 * }]
 */
router.get('/winners', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const daysAgo = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000);

    const winners = await db.prepare(`
      SELECT 
        cr.id as roundId,
        cr.round_date,
        cw.user_id as winnerId,
        cw.prize_amount as prize,
        cw.probability,
        cw.claimed_at,
        cw.status
      FROM cottery_winners cw
      JOIN cottery_rounds cr ON cw.round_id = cr.id
      WHERE cw.created_at > ?
      ORDER BY cw.created_at DESC
      LIMIT 100
    `).all(daysAgo);

    res.json(winners.map(w => ({
      roundId: w.roundId,
      roundDate: w.round_date,
      winnerId: w.winnerId,
      prize: w.prize,
      probability: Math.round(w.probability * 10000) / 10000,
      claimedAt: w.claimed_at,
      status: w.status
    })));

  } catch (error) {
    console.error('Get winners error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// 5. GET FAIRNESS DASHBOARD
// ============================================================================

/**
 * GET /api/cottery/fairness
 * Get fairness metrics and transparency data
 * 
 * Returns: {
 *   totalRoundsCompleted: number,
 *   avgEntriesPerRound: number,
 *   avgPrizePool: number,
 *   pityActivationsUsed: number,
 *   avgUserWeight: number,
 *   fairnessScore: number (0-100),
 *   systemHealth: 'excellent' | 'good' | 'fair' | 'poor'
 * }
 */
router.get('/fairness', async (req, res) => {
  try {
    // Get fairness dashboard view
    const fairness = await db.prepare(
      'SELECT * FROM cottery_fairness_dashboard'
    ).get();

    // Count pity activations
    const pityStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_activations,
        SUM(CASE WHEN was_used IS NOT NULL THEN 1 ELSE 0 END) as used_activations
      FROM cottery_pity_history
    `).get();

    // Calculate fairness score (0-100)
    const avgWeight = fairness?.avg_user_weight || 1.0;
    const weightScore = Math.min(avgWeight * 100, 100); // Higher weight = better
    const fairnessScore = Math.round(
      (weightScore * 0.4) +  // 40% based on weight (fairness to winners)
      (Math.min(pityStats.used_activations / 10, 1.0) * 100 * 0.3) +  // 30% pity usage
      (Math.min(fairness?.total_rounds_completed / 30, 1.0) * 100 * 0.3)  // 30% maturity
    );

    // Determine system health
    let systemHealth = 'good';
    if (fairnessScore >= 90) systemHealth = 'excellent';
    else if (fairnessScore < 70) systemHealth = 'fair';
    else if (fairnessScore < 50) systemHealth = 'poor';

    res.json({
      totalRoundsCompleted: fairness?.total_rounds_completed || 0,
      avgEntriesPerRound: Math.round(fairness?.avg_entries_per_round || 0),
      avgPrizePool: Math.round(fairness?.avg_prize_pool || 1000),
      pityActivationsTotal: pityStats.total_activations || 0,
      pityActivationsUsed: pityStats.used_activations || 0,
      avgUserWeight: Math.round(avgWeight * 100) / 100,
      fairnessScore: Math.round(fairnessScore),
      systemHealth: systemHealth
    });

  } catch (error) {
    console.error('Get fairness error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// 6. ADMIN: EXECUTE DRAW
// ============================================================================

/**
 * POST /api/cottery/admin/execute-draw
 * Execute the lottery draw for a round (Admin Only)
 * 
 * Body: {
 *   roundDate?: string (YYYY-MM-DD, defaults to today),
 *   seedOverride?: string (optional, for testing only)
 * }
 * 
 * Returns: {
 *   success: boolean,
 *   winner?: string,
 *   prize?: number,
 *   probability?: number,
 *   proof?: string,
 *   error?: string
 * }
 */
router.post('/admin/execute-draw', async (req, res) => {
  try {
    // Check admin permission
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const { roundDate, seedOverride } = req.body;
    const targetDate = roundDate || new Date().toISOString().split('T')[0];

    // Get round
    const round = await db.prepare(
      'SELECT id FROM cottery_rounds WHERE round_date = ?'
    ).get(targetDate);

    if (!round) {
      return res.status(404).json({ success: false, message: 'Round not found' });
    }

    // Execute draw
    const result = await cotteryCore.executeDraw(
      round.id,
      req.user.id,
      req.app.locals.accAPI,
      req.app.locals.safeCodeAPI,
      seedOverride
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    console.error('Execute draw error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// 7. ADMIN: GET AUDIT LOG
// ============================================================================

/**
 * GET /api/cottery/admin/audit-log?limit=50
 * Get draw audit log (Admin Only)
 * 
 * Returns: [{
 *   id: number,
 *   roundId: number,
 *   roundDate: string,
 *   executedBy: string,
 *   drawSeed: string,
 *   winnerId: string,
 *   prizeAmount: number,
 *   totalEntries: number,
 *   status: 'success' | 'failed' | 'cancelled',
 *   errorMessage: string | null,
 *   createdAt: string
 * }]
 */
router.get('/admin/audit-log', async (req, res) => {
  try {
    // Check admin permission
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 500);

    const logs = await db.prepare(`
      SELECT 
        cal.id,
        cal.round_id as roundId,
        cr.round_date,
        cal.executed_by,
        cal.draw_seed,
        cal.winner_id,
        cal.prize_amount,
        cal.total_entries,
        cal.status,
        cal.error_message,
        cal.created_at
      FROM cottery_audit_log cal
      LEFT JOIN cottery_rounds cr ON cal.round_id = cr.id
      ORDER BY cal.created_at DESC
      LIMIT ?
    `).all(limit);

    res.json(logs);

  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// 8. HEALTH CHECK
// ============================================================================

/**
 * GET /api/cottery/health
 * Check Cottery system health
 */
router.get('/health', async (req, res) => {
  try {
    const tables = [
      'cottery_rounds',
      'cottery_entries',
      'cottery_winners',
      'cottery_ledger',
      'cottery_user_stats',
      'cottery_audit_log'
    ];

    let allTablesExist = true;
    for (const table of tables) {
      const result = await db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
      ).get(table);
      if (!result) allTablesExist = false;
    }

    res.json({
      status: allTablesExist ? 'healthy' : 'schema_missing',
      allTablesExist,
      tables: tables.length
    });

  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ============================================================================
// SERVER-SENT EVENTS (Real-time updates)
// ============================================================================

/**
 * GET /api/cottery/stream
 * Server-Sent Events stream for real-time updates
 */
router.get('/stream', (req, res) => {
  const userId = req.user.id;

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial data
  const sendUpdate = async () => {
    try {
      const roundId = await cotteryCore.getOrCreateTodayRound();
      const round = await db.prepare(
        'SELECT * FROM cottery_rounds WHERE id = ?'
      ).get(roundId);

      const userEntry = await db.prepare(
        'SELECT quantity FROM cottery_entries WHERE round_id = ? AND user_id = ?'
      ).get(roundId, userId);

      res.write(`data: ${JSON.stringify({
        type: 'round_update',
        totalEntries: round.total_entries,
        prizePool: round.total_entries + 1000,
        yourEntries: userEntry?.quantity || 0,
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    }
  };

  // Initial update
  sendUpdate();

  // Update every 5 seconds
  const interval = setInterval(sendUpdate, 5000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = router;
