// server/routes/ai-routes.js
// AI Platform Manager — Express routes
// Mount in server.js: import aiRouter from './server/routes/ai-routes.js'; app.use('/api/ai', aiRouter);

import { Router }                    from 'express';
import { requireAuth }               from '../api/middleware/auth.js';
import { processMessage, clearHistory } from '../ai-agent/agent-core.js';
import { getQuotaStats }             from '../services/ai-service.js';

const router = new Router();

// ── POST /api/ai/agent — main chat endpoint ──────────────────────
router.post('/agent', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ ok: false, error: 'message is required' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ ok: false, error: 'message too long (max 2000 chars)' });
    }

    const result = await processMessage(req.user.id, message.trim());
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[AI Routes] /agent:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ── POST /api/ai/execute — execute an action (navigation) ────────
router.post('/execute', requireAuth, (req, res) => {
  const { action } = req.body;
  if (!action?.url) return res.status(400).json({ ok: false, error: 'action.url required' });
  return res.json({ ok: true, redirect: action.url });
});

// ── DELETE /api/ai/history — clear conversation ──────────────────
router.delete('/history', requireAuth, (req, res) => {
  clearHistory(req.user.id);
  return res.json({ ok: true, message: 'Conversation history cleared' });
});

// ── GET /api/ai/stats — quota stats ─────────────────────────────
router.get('/stats', requireAuth, (_req, res) => {
  return res.json({ ok: true, quota: getQuotaStats() });
});

export default router;
