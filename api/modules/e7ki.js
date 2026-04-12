import { Router } from 'express'
import { query, pool } from '../config/db.js'
import jwt from 'jsonwebtoken'
import { requireAuth, softAuth } from '../middleware/auth.js'
import { grantReward } from './rewards.js'

const JWT_SECRET = process.env.JWT_SECRET || 'secret-demo'

// ─────────────────────────────────────────
// SCHEMA MIGRATION: E7ki Messenger Tables
// ─────────────────────────────────────────
async function runE7kiSchemaSetup() {
  const migrations = [
    // Conversations table
    `CREATE TABLE IF NOT EXISTS e7ki_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT,
      type TEXT DEFAULT 'direct',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    
    // Conversation participants
    `CREATE TABLE IF NOT EXISTS e7ki_participants (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(conversation_id, user_id),
      FOREIGN KEY(conversation_id) REFERENCES e7ki_conversations(id)
    )`,
    
    // Messages table
    `CREATE TABLE IF NOT EXISTS e7ki_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      is_edited BOOLEAN DEFAULT 0,
      is_deleted BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(conversation_id) REFERENCES e7ki_conversations(id)
    )`,
    
    // Message reactions
    `CREATE TABLE IF NOT EXISTS e7ki_reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      emoji TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(message_id, user_id, emoji),
      FOREIGN KEY(message_id) REFERENCES e7ki_messages(id)
    )`,
    
    // Typing indicators (temporary)
    `CREATE TABLE IF NOT EXISTS e7ki_typing (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      expires_at TEXT,
      UNIQUE(conversation_id, user_id)
    )`,
    
    // Add indices for performance
    `CREATE INDEX IF NOT EXISTS idx_e7ki_conversations_user_id ON e7ki_conversations(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_e7ki_participants_user_id ON e7ki_participants(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_e7ki_messages_conversation_id ON e7ki_messages(conversation_id)`,
    `CREATE INDEX IF NOT EXISTS idx_e7ki_messages_created_at ON e7ki_messages(created_at)`
  ]
  
  for (const migration of migrations) {
    try {
      await query(migration)
    } catch (err) {
      console.log('[E7ki Schema] Migration skipped (already exists or error):', err.message.slice(0, 50))
    }
  }
}

// Run schema setup on module load
await runE7kiSchemaSetup()

const router = Router()

// ─────────────────────────────────────────
// CONVERSATIONS ENDPOINTS
// ─────────────────────────────────────────

// Get all conversations for current user
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    
    const conversations = await query(
      `SELECT c.*, COUNT(DISTINCT m.id) as message_count,
              MAX(m.created_at) as last_message_at
       FROM e7ki_conversations c
       LEFT JOIN e7ki_participants p ON c.id = p.conversation_id
       LEFT JOIN e7ki_messages m ON c.id = m.conversation_id
       WHERE p.user_id = ? AND m.is_deleted = 0
       GROUP BY c.id
       ORDER BY c.updated_at DESC`,
      [userId]
    )
    
    res.json({
      success: true,
      conversations: conversations || []
    })
  } catch (err) {
    console.error('[E7ki] Get conversations error:', err)
    res.status(500).json({ error: 'Failed to load conversations' })
  }
})

// Create new conversation
router.post('/conversations', requireAuth, async (req, res) => {
  try {
    const { name, type = 'direct', participant_ids = [] } = req.body
    const userId = req.user.id
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create conversation
    await query(
      `INSERT INTO e7ki_conversations (id, user_id, name, type) VALUES (?, ?, ?, ?)`,
      [conversationId, userId, name, type]
    )
    
    // Add creator as participant
    const participantId = `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await query(
      `INSERT INTO e7ki_participants (id, conversation_id, user_id) VALUES (?, ?, ?)`,
      [participantId, conversationId, userId]
    )
    
    // Add other participants
    for (const pid of participant_ids) {
      const partId = `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await query(
        `INSERT INTO e7ki_participants (id, conversation_id, user_id) VALUES (?, ?, ?)`,
        [partId, conversationId, pid]
      )
    }
    
    // Grant reward for creating conversation
    await grantReward(userId, 'e7ki_conversation_created', 10, `Created conversation: ${name}`)
    
    res.json({
      success: true,
      conversation: { id: conversationId, name, type, participants: [userId, ...participant_ids] }
    })
  } catch (err) {
    console.error('[E7ki] Create conversation error:', err)
    res.status(500).json({ error: 'Failed to create conversation' })
  }
})

// Get single conversation with messages
router.get('/conversations/:conversationId', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params
    const userId = req.user.id
    
    // Check if user is participant
    const participant = await query(
      `SELECT * FROM e7ki_participants WHERE conversation_id = ? AND user_id = ?`,
      [conversationId, userId]
    )
    
    if (!participant || participant.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation' })
    }
    
    // Get conversation
    const conv = await query(
      `SELECT * FROM e7ki_conversations WHERE id = ?`,
      [conversationId]
    )
    
    // Get messages
    const messages = await query(
      `SELECT m.*, u.username, u.avatar 
       FROM e7ki_messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ? AND m.is_deleted = 0
       ORDER BY m.created_at ASC
       LIMIT 100`,
      [conversationId]
    )
    
    // Get participants
    const participants = await query(
      `SELECT p.user_id, u.username, u.avatar 
       FROM e7ki_participants p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.conversation_id = ?`,
      [conversationId]
    )
    
    res.json({
      success: true,
      conversation: conv[0],
      messages: messages || [],
      participants: participants || []
    })
  } catch (err) {
    console.error('[E7ki] Get conversation error:', err)
    res.status(500).json({ error: 'Failed to load conversation' })
  }
})

// ─────────────────────────────────────────
// MESSAGES ENDPOINTS
// ─────────────────────────────────────────

// Send message
router.post('/messages', requireAuth, async (req, res) => {
  try {
    const { conversation_id, content, message_type = 'text' } = req.body
    const userId = req.user.id
    
    if (!conversation_id || !content) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    // Check if user is participant
    const participant = await query(
      `SELECT * FROM e7ki_participants WHERE conversation_id = ? AND user_id = ?`,
      [conversation_id, userId]
    )
    
    if (!participant || participant.length === 0) {
      return res.status(403).json({ error: 'Not a participant' })
    }
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    await query(
      `INSERT INTO e7ki_messages (id, conversation_id, sender_id, content, message_type) 
       VALUES (?, ?, ?, ?, ?)`,
      [messageId, conversation_id, userId, content, message_type]
    )
    
    // Update conversation timestamp
    await query(
      `UPDATE e7ki_conversations SET updated_at = datetime('now') WHERE id = ?`,
      [conversation_id]
    )
    
    // Grant reward for sending message
    await grantReward(userId, 'e7ki_message_sent', 5, 'Sent message in E7ki')
    
    res.json({
      success: true,
      message: { id: messageId, conversation_id, sender_id: userId, content, message_type, created_at: new Date().toISOString() }
    })
  } catch (err) {
    console.error('[E7ki] Send message error:', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// Edit message
router.put('/messages/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params
    const { content } = req.body
    const userId = req.user.id
    
    // Check if user is the sender
    const message = await query(
      `SELECT * FROM e7ki_messages WHERE id = ?`,
      [messageId]
    )
    
    if (!message || message.length === 0) {
      return res.status(404).json({ error: 'Message not found' })
    }
    
    if (message[0].sender_id !== userId) {
      return res.status(403).json({ error: 'Can only edit your own messages' })
    }
    
    await query(
      `UPDATE e7ki_messages SET content = ?, is_edited = 1, updated_at = datetime('now') WHERE id = ?`,
      [content, messageId]
    )
    
    res.json({ success: true })
  } catch (err) {
    console.error('[E7ki] Edit message error:', err)
    res.status(500).json({ error: 'Failed to edit message' })
  }
})

// Delete message
router.delete('/messages/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params
    const userId = req.user.id
    
    // Check if user is the sender
    const message = await query(
      `SELECT * FROM e7ki_messages WHERE id = ?`,
      [messageId]
    )
    
    if (!message || message.length === 0) {
      return res.status(404).json({ error: 'Message not found' })
    }
    
    if (message[0].sender_id !== userId) {
      return res.status(403).json({ error: 'Can only delete your own messages' })
    }
    
    await query(
      `UPDATE e7ki_messages SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?`,
      [messageId]
    )
    
    res.json({ success: true })
  } catch (err) {
    console.error('[E7ki] Delete message error:', err)
    res.status(500).json({ error: 'Failed to delete message' })
  }
})

// ─────────────────────────────────────────
// REACTIONS ENDPOINTS
// ─────────────────────────────────────────

// Add reaction
router.post('/messages/:messageId/reactions', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params
    const { emoji } = req.body
    const userId = req.user.id
    
    const reactionId = `react_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    await query(
      `INSERT OR REPLACE INTO e7ki_reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)`,
      [reactionId, messageId, userId, emoji]
    )
    
    res.json({ success: true, reaction: { id: reactionId, emoji, user_id: userId } })
  } catch (err) {
    console.error('[E7ki] Add reaction error:', err)
    res.status(500).json({ error: 'Failed to add reaction' })
  }
})

// Remove reaction
router.delete('/messages/:messageId/reactions/:emoji', requireAuth, async (req, res) => {
  try {
    const { messageId, emoji } = req.params
    const userId = req.user.id
    
    await query(
      `DELETE FROM e7ki_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?`,
      [messageId, userId, emoji]
    )
    
    res.json({ success: true })
  } catch (err) {
    console.error('[E7ki] Remove reaction error:', err)
    res.status(500).json({ error: 'Failed to remove reaction' })
  }
})

export default router
