/**
 * E7ki Messenger API Module
 * Provides REST endpoints for chat management, user profiles, and message history
 */

import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/e7ki/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    service: 'E7ki Messenger',
    timestamp: new Date().toISOString(),
    socketPath: '/ws',
    version: '2.0.0'
  });
});

/**
 * GET /api/e7ki/config
 * Get WebSocket configuration for frontend
 */
router.get('/config', (req, res) => {
  const socketUrl = process.env.NODE_ENV === 'production'
    ? `${req.protocol}://${req.get('host')}`
    : `http://localhost:${process.env.PORT || 3001}`;

  res.json({
    socketUrl,
    socketPath: '/ws',
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    maxRetries: 5
  });
});

/**
 * POST /api/e7ki/rooms
 * Create a new chat room
 */
router.post('/rooms', requireAuth, async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ 
        success: false, 
        error: 'Room name must be at least 3 characters' 
      });
    }

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Insert room into database
    await query(
      `INSERT INTO e7ki_rooms (id, name, description, creator_id, is_private, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [roomId, name.trim(), description || '', userId, isPrivate ? 1 : 0, new Date().toISOString()]
    );

    // Add creator as room member
    await query(
      `INSERT INTO e7ki_room_members (room_id, user_id, joined_at)
       VALUES (?, ?, ?)`,
      [roomId, userId, new Date().toISOString()]
    );

    res.status(201).json({
      success: true,
      room: {
        id: roomId,
        name,
        description,
        isPrivate,
        creatorId: userId,
        createdAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[E7ki] Create room error:', err);
    res.status(500).json({ success: false, error: 'Failed to create room' });
  }
});

/**
 * GET /api/e7ki/rooms
 * List all rooms user has access to
 */
router.get('/rooms', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const rooms = await query(
      `SELECT r.* FROM e7ki_rooms r
       LEFT JOIN e7ki_room_members m ON r.id = m.room_id
       WHERE r.is_private = 0 OR m.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      rooms: rooms || [],
      count: (rooms || []).length
    });
  } catch (err) {
    console.error('[E7ki] List rooms error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch rooms' });
  }
});

/**
 * GET /api/e7ki/rooms/:roomId
 * Get room details
 */
router.get('/rooms/:roomId', requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await query(
      `SELECT r.* FROM e7ki_rooms r
       LEFT JOIN e7ki_room_members m ON r.id = m.room_id
       WHERE r.id = ? AND (r.is_private = 0 OR m.user_id = ?)
       LIMIT 1`,
      [roomId, userId]
    );

    if (!room || !room[0]) {
      return res.status(404).json({ success: false, error: 'Room not found or access denied' });
    }

    const members = await query(
      `SELECT user_id, joined_at FROM e7ki_room_members WHERE room_id = ?`,
      [roomId]
    );

    res.json({
      success: true,
      room: room[0],
      members: members || [],
      memberCount: (members || []).length
    });
  } catch (err) {
    console.error('[E7ki] Get room error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch room' });
  }
});

/**
 * POST /api/e7ki/rooms/:roomId/join
 * Join a chat room
 */
router.post('/rooms/:roomId/join', requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Check if room exists
    const room = await query(`SELECT * FROM e7ki_rooms WHERE id = ?`, [roomId]);
    if (!room || !room[0]) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    // Check if already a member
    const existing = await query(
      `SELECT * FROM e7ki_room_members WHERE room_id = ? AND user_id = ?`,
      [roomId, userId]
    );

    if (existing && existing[0]) {
      return res.status(200).json({ success: true, message: 'Already a member' });
    }

    // Add to room
    await query(
      `INSERT INTO e7ki_room_members (room_id, user_id, joined_at)
       VALUES (?, ?, ?)`,
      [roomId, userId, new Date().toISOString()]
    );

    res.json({ success: true, message: 'Joined room' });
  } catch (err) {
    console.error('[E7ki] Join room error:', err);
    res.status(500).json({ success: false, error: 'Failed to join room' });
  }
});

/**
 * GET /api/e7ki/rooms/:roomId/messages
 * Get message history for a room
 */
router.get('/rooms/:roomId/messages', requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;

    // Verify user has access to room
    const member = await query(
      `SELECT * FROM e7ki_room_members WHERE room_id = ? AND user_id = ?`,
      [roomId, userId]
    );

    if (!member || !member[0]) {
      const room = await query(`SELECT * FROM e7ki_rooms WHERE id = ? AND is_private = 0`, [roomId]);
      if (!room || !room[0]) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const messages = await query(
      `SELECT * FROM e7ki_messages
       WHERE room_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [roomId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      messages: (messages || []).reverse(),
      count: (messages || []).length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('[E7ki] Get messages error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

/**
 * POST /api/e7ki/rooms/:roomId/messages
 * Send a message to a room
 */
router.post('/rooms/:roomId/messages', requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message cannot be empty' });
    }

    // Verify user is member of room
    const member = await query(
      `SELECT * FROM e7ki_room_members WHERE room_id = ? AND user_id = ?`,
      [roomId, userId]
    );

    if (!member || !member[0]) {
      return res.status(403).json({ success: false, error: 'Not a member of this room' });
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await query(
      `INSERT INTO e7ki_messages (id, room_id, user_id, content, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [messageId, roomId, userId, content.trim(), new Date().toISOString()]
    );

    res.status(201).json({
      success: true,
      message: {
        id: messageId,
        roomId,
        userId,
        content: content.trim(),
        createdAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[E7ki] Send message error:', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

/**
 * DELETE /api/e7ki/messages/:messageId
 * Delete a message (only by sender)
 */
router.delete('/messages/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await query(`SELECT * FROM e7ki_messages WHERE id = ?`, [messageId]);

    if (!message || !message[0]) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    if (message[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Cannot delete another user\'s message' });
    }

    await query(`DELETE FROM e7ki_messages WHERE id = ?`, [messageId]);

    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    console.error('[E7ki] Delete message error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

/**
 * GET /api/e7ki/users/:userId
 * Get user profile (for display in chat)
 */
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // This is a simplified user fetch - adapt to your user table structure
    const user = await query(
      `SELECT id, username, avatar_url FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (!user || !user[0]) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user[0].id,
        username: user[0].username,
        avatarUrl: user[0].avatar_url
      }
    });
  } catch (err) {
    console.error('[E7ki] Get user error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

export default router;
