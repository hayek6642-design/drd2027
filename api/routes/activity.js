/**
 * ACTIVITY SYNC API - Simplified
 * 
 * Accepts and logs user activity syncs:
 * - User actions (like, comment, share, download)
 * - Watch time progress
 * - Generated codes
 * - Acknowledges sync requests
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// In-memory activity log for this session
const activityLog = {
  syncCount: 0,
  lastSync: null,
  users: {}
};

/**
 * SYNC BATCH - Accept all user activities and acknowledge
 * POST /api/activity/sync
 */
router.post('/sync', requireAuth, (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { actions = [], watchTimes = [], codes = [] } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const totalItems = actions.length + watchTimes.length + codes.length;

    // Log sync
    activityLog.syncCount++;
    activityLog.lastSync = Date.now();
    if (!activityLog.users[userId]) {
      activityLog.users[userId] = { syncs: 0, items: 0 };
    }
    activityLog.users[userId].syncs++;
    activityLog.users[userId].items += totalItems;

    // Generate sync IDs
    const syncedIds = [];
    
    actions.forEach((action) => {
      syncedIds.push(action.id);
    });

    watchTimes.forEach((watch) => {
      syncedIds.push(watch.contentId);
    });

    codes.forEach((code) => {
      syncedIds.push(code.id);
    });

    console.log(`[Activity API] User ${userId} synced ${totalItems} items (${actions.length} actions, ${watchTimes.length} watches, ${codes.length} codes)`);

    return res.json({
      success: true,
      synced: totalItems,
      syncedIds: syncedIds,
      message: `Synced ${totalItems} activity items`
    });
  } catch (err) {
    console.error('[Activity API] Sync error:', err);
    return res.status(500).json({ error: 'Sync failed', message: err.message });
  }
});

/**
 * GET STATS - Get activity summary
 * GET /api/activity/stats
 */
router.get('/stats', requireAuth, (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userStats = activityLog.users[userId] || { syncs: 0, items: 0 };

    return res.json({
      userId: userId,
      totalSyncs: userStats.syncs,
      totalItems: userStats.items,
      globalSyncCount: activityLog.syncCount,
      lastSync: activityLog.lastSync
    });
  } catch (err) {
    console.error('[Activity API] Stats error:', err);
    return res.status(500).json({ error: 'Stats retrieval failed' });
  }
});

/**
 * HEALTH CHECK
 * GET /api/activity/health
 */
router.get('/health', (req, res) => {
  return res.json({
    status: 'ok',
    syncCount: activityLog.syncCount,
    lastSync: activityLog.lastSync,
    userCount: Object.keys(activityLog.users).length
  });
});

export default router;
// Deployment trigger - 1776719921
