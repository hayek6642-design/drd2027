import express from 'express';
import { watchdog } from '../services/watchdog/watchdog.js';
import { requireAuth } from '../core/auth/auth-middleware.js';

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

// 🦴 Compatibility Endpoint for UI
router.get('/status', async (req, res) => {
  try {
    const result = await watchdog.verifySystemIntegrity();
    
    // Return format expected by safe-list-actions.js
    res.json({
      success: true,
      dogState: result.status === 'error' ? 'DEAD' : (result.status === 'alert' ? 'ALERT' : 'ALIVE'),
      status: result.status,
      ok: result.ok,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.json({ success: false, dogState: 'DEAD', error: err.message });
  }
});

// 🔧 manual heal (ADMIN ONLY)
router.post('/heal', requireAuth, async (req, res) => {
  try {
    // 🛡️ Admin Check
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

export default router;
