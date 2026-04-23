import express from 'express';
import { watchdog } from '../services/watchdog/watchdog.js';
import { requireAuth } from '../core/auth/auth-middleware.js';
import { WatchDogGuardian } from '../shared/watch-dog-guardian.js';
import { getIO } from '../shared/io-registry.js';

const router = express.Router();

// ✅ GET state (Public or Internal)
router.get('/state', async (req, res) => {
  try {
    const result = await watchdog.verifySystemIntegrity();

    res.json({
      status: result.status,
      issues: result.issues,
      lastCheck: result.checkedAt,
      ok: result.ok
    });

  } catch (err) {
    console.warn('⚠️ Watchdog state error (UI Safe):', err.message);
    res.status(200).json({
      status: 'error',
      ok: false,
      message: err.message
    });
  }
});

// 🖥️ System health endpoint
router.get('/system-health', async (req, res) => {
  try {
    const result = await watchdog.verifySystemIntegrity();

    res.json({
      success: true,
      systemState: result.status === 'error' ? 'DEAD' : (result.status === 'alert' ? 'ALERT' : 'ALIVE'),
      status: result.status,
      ok: result.ok,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.json({ success: false, systemState: 'DEAD', error: err.message });
  }
});

// 🔧 manual heal (ADMIN ONLY)
router.post('/heal', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden', message: 'Admin access required' });
    }

    const result = await watchdog.verifySystemIntegrity();
    const healResult = await watchdog.autoHeal(result.issues);

    res.json({
      message: 'Auto-heal executed',
      ...healResult
    });

  } catch (err) {
    console.error('❌ Watchdog heal error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// 🦁 QARSAN SOCIAL LEADERBOARD ROUTES
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/watchdog/users
 * Returns all users with their balances (codes/silver/gold) and dog states.
 * Powers the Qarsan leaderboard view.
 */
router.get('/users', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.user?.userId || req.user?.sub;
    const result = await WatchDogGuardian.getAllUsersStatus(currentUserId);
    res.json(result);
  } catch (err) {
    console.error('[QARSAN] /users error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/watchdog/notify/:targetUserId
 * Notify a user (with a dead dog) to buy a new dog and secure their assets.
 * Free action — no cost to caller.
 */
router.post('/notify/:targetUserId', requireAuth, async (req, res) => {
  try {
    const actorId = req.user?.id || req.user?.userId || req.user?.sub;
    const targetId = req.params.targetUserId;

    if (!actorId || !targetId) {
      return res.status(400).json({ success: false, error: 'Missing user IDs' });
    }

    const result = await WatchDogGuardian.notifyUserBuyDog(actorId, targetId);

    // 🔔 Real-time push to target (if socket.io is available)
    if (result.success) {
      const io = getIO();
      if (io) {
        io.emit(`qarsan:notification:${targetId}`, {
          type: 'WARNING',
          message: '⚠️ A user notified you: your guard dog is dead! Buy a new dog to protect your assets.'
        });
      }
    }

    res.json(result);
  } catch (err) {
    console.error('[QARSAN] /notify error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/watchdog/buy-dog-for/:targetUserId
 * Caller pays 1000 codes to give the target user a new live dog.
 * Target's dog_state resets to ACTIVE.
 */
router.post('/buy-dog-for/:targetUserId', requireAuth, async (req, res) => {
  try {
    const actorId = req.user?.id || req.user?.userId || req.user?.sub;
    const targetId = req.params.targetUserId;

    if (!actorId || !targetId) {
      return res.status(400).json({ success: false, error: 'Missing user IDs' });
    }

    const result = await WatchDogGuardian.buyDogForUser(actorId, targetId);

    // 🐕 Real-time push to target and broadcast leaderboard update
    if (result.success) {
      const io = getIO();
      if (io) {
        io.emit(`qarsan:notification:${targetId}`, {
          type: 'DOG_GIFTED',
          message: '🐕 Another user bought you a new guard dog! Your assets are now protected.'
        });
        io.emit(`qarsan:balance-update:${actorId}`, {
          type: 'DEBIT',
          amount: 1000,
          message: '1000 codes spent to buy a dog for another user'
        });
        io.emit('qarsan:leaderboard-update', { actorId, targetId, event: 'dog_gifted' });
      }
    }

    res.json(result);
  } catch (err) {
    console.error('[QARSAN] /buy-dog-for error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/watchdog/steal/:targetUserId
 * Steal ALL assets (codes + silver + gold) from a user whose dog is DEAD.
 * All assets are atomically transferred to the caller's account.
 * Rate-limited: 1 steal per 10 minutes per actor.
 * Only possible when target's dog_state === 'DEAD'.
 */
router.post('/steal/:targetUserId', requireAuth, async (req, res) => {
  try {
    const actorId = req.user?.id || req.user?.userId || req.user?.sub;
    const targetId = req.params.targetUserId;

    if (!actorId || !targetId) {
      return res.status(400).json({ success: false, error: 'Missing user IDs' });
    }

    const result = await WatchDogGuardian.stealFromUser(actorId, targetId);

    // 💀 Real-time push: notify victim + actor + broadcast leaderboard update
    if (result.success) {
      const io = getIO();
      if (io) {
        const stolenSummary = Object.entries(result.stolen || {})
          .filter(([, v]) => v > 0)
          .map(([k, v]) => `${v} ${k}`)
          .join(', ');

        // Tell the victim they were robbed
        io.emit(`qarsan:stolen:${targetId}`, {
          actorId,
          stolenSummary,
          totalValue: result.totalStolenValue,
          message: `💀 You were Qarsan'd! ${stolenSummary} stolen from your account.`
        });

        // Tell the actor their balance increased
        io.emit(`qarsan:balance-update:${actorId}`, {
          type: 'CREDIT',
          gained: result.stolen,
          totalValue: result.totalStolenValue,
          message: `You gained ${stolenSummary} from Qarsan!`
        });

        // Broadcast leaderboard update to all connected clients
        io.emit('qarsan:leaderboard-update', {
          event: 'steal',
          actorId,
          victimId: targetId,
          totalValue: result.totalStolenValue
        });
      }
    }

    res.json(result);
  } catch (err) {
    console.error('[QARSAN] /steal error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// 🔔 QARSAN NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/watchdog/notifications
 * Returns the current user's Qarsan notifications (unread first).
 * Used for the notification bell badge in the Qarsan UI.
 */
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    const result = await WatchDogGuardian.getNotifications(userId);
    res.json(result);
  } catch (err) {
    console.error('[QARSAN] /notifications error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/watchdog/notifications/read-all
 * Marks all of the current user's Qarsan notifications as read.
 */
router.post('/notifications/read-all', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    const result = await WatchDogGuardian.markNotificationsRead(userId);
    res.json(result);
  } catch (err) {
    console.error('[QARSAN] /notifications/read-all error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
