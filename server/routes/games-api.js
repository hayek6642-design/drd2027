/**
 * Games Centre API Routes
 * Handles game rewards, statistics, and gamble tracking
 */

import { Router } from 'express';

const router = Router();

/**
 * POST /api/games/play
 * Record a game play attempt
 */
router.post('/play', async (req, res) => {
    try {
        const { gameType, result, reward, duration } = req.body;
        const email = req.user?.email;

        if (!email) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!gameType || result === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Record game play
        const query = `
            INSERT INTO game_plays (email, game_type, result, reward, duration, played_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `;

        await req.db.query(query, [
            email,
            gameType,
            result,
            reward || 0,
            duration || 0
        ]);

        res.json({
            success: true,
            message: 'Game play recorded',
            reward: reward || 0
        });
    } catch (error) {
        console.error('Game play error:', error);
        res.status(500).json({ error: 'Failed to record game play', details: error.message });
    }
});

/**
 * POST /api/games/reward
 * Award reward (silver/gold) for game completion
 */
router.post('/reward', async (req, res) => {
    try {
        const { gameType, assetType, amount, reason } = req.body;
        const email = req.user?.email;

        if (!email) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!assetType || !amount) {
            return res.status(400).json({ error: 'Missing asset details' });
        }

        // Create asset reward record
        const query = `
            INSERT INTO asset_rewards (email, asset_type, amount, source, reason, rewarded_at)
            VALUES ($1, $2, $3, 'game', $4, CURRENT_TIMESTAMP)
        `;

        await req.db.query(query, [
            email,
            assetType,
            amount,
            reason || `${gameType} game reward`
        ]);

        res.json({
            success: true,
            message: `${amount} ${assetType} awarded`,
            amount
        });
    } catch (error) {
        console.error('Reward error:', error);
        res.status(500).json({ error: 'Failed to award reward', details: error.message });
    }
});

/**
 * GET /api/games/stats
 * Get user's game statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const email = req.user?.email;

        if (!email) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Get game statistics
        const query = `
            SELECT 
                game_type,
                COUNT(*) as plays,
                SUM(CASE WHEN result = true THEN 1 ELSE 0 END) as wins,
                AVG(CASE WHEN result = true THEN 1 ELSE 0 END) * 100 as win_rate,
                SUM(reward) as total_rewards,
                AVG(duration) as avg_duration
            FROM game_plays
            WHERE email = $1
            GROUP BY game_type
        `;

        const result = await req.db.query(query, [email]);

        res.json({
            stats: result.rows,
            totalPlays: result.rows.reduce((sum, row) => sum + parseInt(row.plays), 0),
            totalWins: result.rows.reduce((sum, row) => sum + parseInt(row.wins || 0), 0)
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
    }
});

/**
 * GET /api/games/history
 * Get user's recent game plays
 */
router.get('/history', async (req, res) => {
    try {
        const email = req.user?.email;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);

        if (!email) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const query = `
            SELECT game_type, result, reward, duration, played_at
            FROM game_plays
            WHERE email = $1
            ORDER BY played_at DESC
            LIMIT $2
        `;

        const result = await req.db.query(query, [email, limit]);

        res.json({
            history: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Failed to fetch history', details: error.message });
    }
});

/**
 * POST /api/games/bet
 * Process a game bet (for gambling system)
 */
router.post('/bet', async (req, res) => {
    try {
        const { gameType, betAmount, odds, prediction } = req.body;
        const email = req.user?.email;

        if (!email) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!betAmount || !gameType) {
            return res.status(400).json({ error: 'Missing bet details' });
        }

        // Record bet
        const query = `
            INSERT INTO game_bets (email, game_type, bet_amount, odds, prediction, status, created_at)
            VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP)
            RETURNING id
        `;

        const result = await req.db.query(query, [
            email,
            gameType,
            betAmount,
            odds || 1,
            prediction
        ]);

        const betId = result.rows[0].id;

        res.json({
            success: true,
            betId,
            message: 'Bet placed successfully',
            betAmount
        });
    } catch (error) {
        console.error('Bet error:', error);
        res.status(500).json({ error: 'Failed to place bet', details: error.message });
    }
});

/**
 * PUT /api/games/bet/:id
 * Update bet result (win/loss)
 */
router.put('/bet/:id', async (req, res) => {
    try {
        const { result, payout } = req.body;
        const betId = req.params.id;
        const email = req.user?.email;

        if (!email) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Update bet
        const query = `
            UPDATE game_bets
            SET status = $1, payout = $2, resolved_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND email = $4
            RETURNING *
        `;

        const updateResult = await req.db.query(query, [
            result ? 'won' : 'lost',
            payout || 0,
            betId,
            email
        ]);

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bet not found' });
        }

        res.json({
            success: true,
            message: `Bet ${result ? 'won' : 'lost'}`,
            bet: updateResult.rows[0]
        });
    } catch (error) {
        console.error('Bet update error:', error);
        res.status(500).json({ error: 'Failed to update bet', details: error.message });
    }
});

/**
 * GET /api/games/leaderboard
 * Get global game leaderboard
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const query = `
            SELECT 
                email,
                game_type,
                COUNT(*) as plays,
                SUM(CASE WHEN result = true THEN 1 ELSE 0 END) as wins,
                SUM(reward) as total_rewards
            FROM game_plays
            WHERE played_at > NOW() - INTERVAL '7 days'
            GROUP BY email, game_type
            ORDER BY total_rewards DESC
            LIMIT 20
        `;

        const result = await req.db.query(query);

        res.json({
            leaderboard: result.rows,
            period: '7 days'
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard', details: error.message });
    }
});

export default router;