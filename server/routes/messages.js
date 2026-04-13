/**
 * Messages Routes — Server API for E7ki chat
 *
 * Mount in Express:
 *   const messageRoutes = require('./routes/messages');
 *   app.use('/api/messages', messageRoutes);
 */

const express = require('express');
const router = express.Router();
const { verifyAuth } = require('../middleware/auth');

router.use(verifyAuth);

// ── GET conversations for user ────────────────────────────
router.get('/conversations', async (req, res) => {
  const userId = req.userId;

  try {
    const result = await req.app.locals.db.execute({
      sql: `SELECT * FROM conversations
            WHERE id IN (
              SELECT conversation_id FROM conversation_participants WHERE user_id = ?
            )
            ORDER BY updated_at DESC`,
      args: [userId]
    });

    res.json(result.rows);
  } catch (err) {
    console.error('[Messages] GET /conversations failed:', err.message);
    res.status(500).json({ error: 'Failed to load conversations' });
  }
});

// ── GET messages for a conversation ───────────────────────
router.get('/conversations/:convId/messages', async (req, res) => {
  const { convId } = req.params;
  const userId = req.userId;
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const before = req.query.before ? parseInt(req.query.before) : Date.now();

  try {
    // Verify user is participant
    const check = await req.app.locals.db.execute({
      sql: `SELECT 1 FROM conversation_participants
            WHERE conversation_id = ? AND user_id = ?`,
      args: [convId, userId]
    });

    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    const result = await req.app.locals.db.execute({
      sql: `SELECT * FROM messages
            WHERE conversation_id = ? AND timestamp < ?
            ORDER BY timestamp DESC
            LIMIT ?`,
      args: [convId, before, limit]
    });

    // Return in chronological order
    res.json(result.rows.reverse());
  } catch (err) {
    console.error('[Messages] GET messages failed:', err.message);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// ── POST send a message ───────────────────────────────────
router.post('/send', async (req, res) => {
  const userId = req.userId;
  const { conversationId, text } = req.body;

  if (!conversationId || !text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing conversationId or text' });
  }

  if (text.length > 5000) {
    return res.status(400).json({ error: 'Message too long (max 5000 chars)' });
  }

  try {
    // Verify participant
    const check = await req.app.locals.db.execute({
      sql: `SELECT 1 FROM conversation_participants
            WHERE conversation_id = ? AND user_id = ?`,
      args: [conversationId, userId]
    });

    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    // Check code balance (1 code per message)
    const balanceResult = await req.app.locals.db.execute({
      sql: `SELECT COALESCE(SUM(value), 0) as balance
            FROM codes WHERE user_id = ? AND status = 'active'`,
      args: [userId]
    });

    const balance = balanceResult.rows[0]?.balance || 0;
    if (balance < 1) {
      return res.status(402).json({ error: 'Insufficient codes', balance: balance });
    }

    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    const now = Date.now();

    // Insert message
    await req.app.locals.db.execute({
      sql: `INSERT INTO messages (id, conversation_id, sender_id, text, timestamp)
            VALUES (?, ?, ?, ?, ?)`,
      args: [msgId, conversationId, userId, text.trim(), now]
    });

    // Update conversation last message
    await req.app.locals.db.execute({
      sql: `UPDATE conversations SET last_message = ?, updated_at = ? WHERE id = ?`,
      args: [text.substring(0, 100), now, conversationId]
    });

    // Deduct 1 code (mark oldest active code as spent)
    await req.app.locals.db.execute({
      sql: `UPDATE codes SET status = 'spent'
            WHERE id = (
              SELECT id FROM codes
              WHERE user_id = ? AND status = 'active'
              ORDER BY timestamp ASC LIMIT 1
            )`,
      args: [userId]
    });

    res.json({
      success: true,
      message: { id: msgId, conversationId, senderId: userId, text: text.trim(), timestamp: now },
      codeDeducted: 1,
      remainingBalance: balance - 1
    });
  } catch (err) {
    console.error('[Messages] POST /send failed:', err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ── POST create conversation ──────────────────────────────
router.post('/conversations', async (req, res) => {
  const userId = req.userId;
  const { name, participantIds } = req.body;

  if (!name || typeof name !== 'string' || name.length > 100) {
    return res.status(400).json({ error: 'Invalid conversation name' });
  }

  if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
    return res.status(400).json({ error: 'At least one participant required' });
  }

  try {
    const convId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const now = Date.now();

    await req.app.locals.db.execute({
      sql: `INSERT INTO conversations (id, name, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [convId, name.trim(), userId, now, now]
    });

    // Add creator + participants
    var allParticipants = [userId].concat(participantIds.filter(function (p) { return p !== userId; }));

    for (var i = 0; i < allParticipants.length; i++) {
      await req.app.locals.db.execute({
        sql: `INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
              VALUES (?, ?, ?)`,
        args: [convId, allParticipants[i], now]
      });
    }

    res.json({
      success: true,
      conversation: { id: convId, name: name.trim(), participants: allParticipants, createdAt: now }
    });
  } catch (err) {
    console.error('[Messages] POST /conversations failed:', err.message);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

module.exports = router;
