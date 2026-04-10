/**
 * Auto-mode API
 * Manages auto-mode sessions and silver generation for continuous play
 * 
 * Endpoints:
 * POST /api/auto-mode/start - Start auto-mode session (called on activate)
 * POST /api/auto-mode/stop - Stop auto-mode session (called on deactivate)
 * GET /api/auto-mode/check - Check if 2 hours elapsed, award silver if yes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../db');
const crypto = require('crypto');

const AUTO_MODE_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
const SILVER_AWARD_AMOUNT = 1;

/**
 * POST /api/auto-mode/start
 * Start an auto-mode session for the user
 */
router.post('/start', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Check if session already active
        const existing = await db.get(
            'SELECT id FROM auto_mode_sessions WHERE user_id = ? AND is_active = 1',
            [userId]
        );
        
        if (existing) {
            return res.json({ 
                success: true, 
                message: 'Auto-mode already active',
                sessionId: existing.id 
            });
        }
        
        // Create new session
        const sessionId = crypto.randomUUID();
        const now = new Date().toISOString();
        
        await db.run(
            `INSERT INTO auto_mode_sessions 
             (id, user_id, started_at, is_active, created_at) 
             VALUES (?, ?, ?, 1, ?)`,
            [sessionId, userId, now, now]
        );
        
        console.log(`[AutoMode] Session started for user ${userId}`);
        
        res.json({ 
            success: true, 
            message: 'Auto-mode activated',
            sessionId,
            nextSilverIn: AUTO_MODE_INTERVAL_MS
        });
    } catch (err) {
        console.error('[AutoMode] Start error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/auto-mode/stop
 * Stop the auto-mode session for the user
 */
router.post('/stop', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await db.run(
            'UPDATE auto_mode_sessions SET is_active = 0 WHERE user_id = ?',
            [userId]
        );
        
        console.log(`[AutoMode] Session stopped for user ${userId}`);
        
        res.json({ 
            success: true, 
            message: 'Auto-mode deactivated'
        });
    } catch (err) {
        console.error('[AutoMode] Stop error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/auto-mode/check
 * Check if 2 hours have elapsed since last award, grant silver if yes
 */
router.get('/check', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get active auto-mode session
        const session = await db.get(
            'SELECT * FROM auto_mode_sessions WHERE user_id = ? AND is_active = 1',
            [userId]
        );
        
        if (!session) {
            return res.json({ 
                success: true, 
                isActive: false,
                message: 'No active auto-mode session'
            });
        }
        
        const now = new Date();
        const lastAwardTime = session.last_silver_awarded_at 
            ? new Date(session.last_silver_awarded_at) 
            : new Date(session.started_at);
        
        const elapsedMs = now - lastAwardTime;
        const shouldAward = elapsedMs >= AUTO_MODE_INTERVAL_MS;
        
        if (shouldAward) {
            // Award silver
            const awardedAt = now.toISOString();
            
            await db.run(
                `UPDATE auto_mode_sessions 
                 SET last_silver_awarded_at = ?, silver_awards_count = silver_awards_count + 1
                 WHERE id = ?`,
                [awardedAt, session.id]
            );
            
            // Add silver to user assets
            const assets = await db.get(
                'SELECT id, silver FROM assets WHERE user_id = ?',
                [userId]
            );
            
            if (!assets) {
                return res.status(404).json({ success: false, error: 'Assets not found' });
            }
            
            const newSilver = (assets.silver || 0) + SILVER_AWARD_AMOUNT;
            await db.run(
                'UPDATE assets SET silver = ? WHERE user_id = ?',
                [newSilver, userId]
            );
            
            console.log(`[AutoMode] ✅ Awarded ${SILVER_AWARD_AMOUNT} silver to user ${userId} (Total: ${session.silver_awards_count + 1})`);
            
            // Log transaction
            await db.run(
                `INSERT INTO transactions (user_id, type, action, amount, service, metadata, created_at)
                 VALUES (?, 'silver', 'earn', ?, 'samma3ny', ?, ?)`,
                [userId, SILVER_AWARD_AMOUNT, JSON.stringify({ source: 'auto_mode', sessionId: session.id }), awardedAt]
            );
            
            return res.json({
                success: true,
                isActive: true,
                silverAwarded: SILVER_AWARD_AMOUNT,
                totalAwards: session.silver_awards_count + 1,
                newAssets: {
                    silver: newSilver
                },
                nextSilverIn: AUTO_MODE_INTERVAL_MS
            });
        }
        
        // Not yet time for silver
        const remainingMs = AUTO_MODE_INTERVAL_MS - elapsedMs;
        
        res.json({
            success: true,
            isActive: true,
            silverAwarded: 0,
            totalAwards: session.silver_awards_count,
            elapsedMs: Math.round(elapsedMs / 1000 / 60), // minutes
            nextSilverIn: Math.round(remainingMs),
            nextSilverInMinutes: Math.round(remainingMs / 1000 / 60)
        });
    } catch (err) {
        console.error('[AutoMode] Check error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * Admin job endpoint: Check all active sessions and award silver
 * Called periodically by backend cron job
 */
router.post('/admin/process-awards', async (req, res) => {
    try {
        // Simple auth: check if it's an internal call (you'd use a proper admin token in production)
        const adminToken = req.headers['x-admin-token'];
        if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        
        // Get all active sessions
        const sessions = await db.all(
            'SELECT * FROM auto_mode_sessions WHERE is_active = 1'
        );
        
        let awarded = 0;
        const now = new Date();
        
        for (const session of sessions) {
            const lastAwardTime = session.last_silver_awarded_at 
                ? new Date(session.last_silver_awarded_at) 
                : new Date(session.started_at);
            
            const elapsedMs = now - lastAwardTime;
            
            if (elapsedMs >= AUTO_MODE_INTERVAL_MS) {
                // Award silver
                const awardedAt = now.toISOString();
                
                await db.run(
                    `UPDATE auto_mode_sessions 
                     SET last_silver_awarded_at = ?, silver_awards_count = silver_awards_count + 1
                     WHERE id = ?`,
                    [awardedAt, session.id]
                );
                
                // Add silver to user assets
                const assets = await db.get(
                    'SELECT silver FROM assets WHERE user_id = ?',
                    [session.user_id]
                );
                
                if (assets) {
                    const newSilver = (assets.silver || 0) + SILVER_AWARD_AMOUNT;
                    await db.run(
                        'UPDATE assets SET silver = ? WHERE user_id = ?',
                        [newSilver, session.user_id]
                    );
                    
                    // Log transaction
                    await db.run(
                        `INSERT INTO transactions (user_id, type, action, amount, service, metadata, created_at)
                         VALUES (?, 'silver', 'earn', ?, 'samma3ny', ?, ?)`,
                        [session.user_id, SILVER_AWARD_AMOUNT, JSON.stringify({ source: 'auto_mode_job', sessionId: session.id }), awardedAt]
                    );
                    
                    awarded++;
                    console.log(`[AutoMode Job] ✅ Awarded silver to user ${session.user_id}`);
                }
            }
        }
        
        res.json({
            success: true,
            processed: sessions.length,
            awarded,
            timestamp: now.toISOString()
        });
    } catch (err) {
        console.error('[AutoMode Job] Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
