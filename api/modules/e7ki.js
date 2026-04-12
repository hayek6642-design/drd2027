import { Router } from 'express'
import { query, pool } from '../config/db.js'
import jwt from 'jsonwebtoken'
import { requireAuth, softAuth } from '../middleware/auth.js'
import { grantReward } from './rewards.js'

const JWT_SECRET = process.env.JWT_SECRET || 'secret-demo'

// ─────────────────────────────────────────
// SCHEMA MIGRATION: E7ki Messenger Tables + ZAGEL
// ─────────────────────────────────────────
async function runE7kiSchemaSetup() {
  // First: Create all tables (in order)
  const tableMigrations = [
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

    // ═══════════════════════════════════════════════════════
    // ZAGEL: 3D AVATAR BIRD MESSENGER TABLES
    // ═══════════════════════════════════════════════════════
    
    // ZAGEL messages table (separate from e7ki)
    `CREATE TABLE IF NOT EXISTS zagel_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT,
      message_type TEXT DEFAULT 'text',
      avatar_id TEXT,
      is_delivered BOOLEAN DEFAULT 0,
      delivered_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(conversation_id) REFERENCES e7ki_conversations(id)
    )`,
    
    // Voice messages (ZAGEL can deliver audio)
    `CREATE TABLE IF NOT EXISTS zagel_voice_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      audio_url TEXT NOT NULL,
      duration INTEGER,
      transcription TEXT,
      is_delivered BOOLEAN DEFAULT 0,
      delivered_at TEXT,
      delivery_method TEXT DEFAULT 'vocal',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(conversation_id) REFERENCES e7ki_conversations(id)
    )`,

    // ZAGEL avatar delivery log (tracks message transfers)
    `CREATE TABLE IF NOT EXISTS zagel_deliveries (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      voice_message_id TEXT,
      sender_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      delivery_type TEXT DEFAULT 'message_transfer',
      delivery_method TEXT DEFAULT 'avatar_bird',
      animation_style TEXT DEFAULT 'fly',
      start_time TEXT,
      end_time TEXT,
      is_vocal_delivery BOOLEAN DEFAULT 0,
      vocal_played BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(message_id) REFERENCES e7ki_messages(id),
      FOREIGN KEY(voice_message_id) REFERENCES zagel_voice_messages(id)
    )`,

    // ZAGEL avatar states and customization
    `CREATE TABLE IF NOT EXISTS zagel_avatars (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      avatar_model TEXT DEFAULT 'bird_phoenix',
      avatar_color TEXT DEFAULT '#FF6B35',
      animation_style TEXT DEFAULT 'smooth_flight',
      voice_enabled BOOLEAN DEFAULT 1,
      voice_type TEXT DEFAULT 'default',
      notification_sound TEXT DEFAULT 'chime',
      is_active BOOLEAN DEFAULT 1,
      last_seen TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`
  ]

  // Run table migrations first
  for (const migration of tableMigrations) {
    try {
      await query(migration)
    } catch (err) {
      console.log('[E7ki/ZAGEL Table] Skipped:', err.message.slice(0, 40))
    }
  }

  // Then: Add missing columns to existing tables (fix for tables created before migration)
  const columnMigrations = [
    { table: 'e7ki_conversations', col: 'user_id', type: 'TEXT NOT NULL' },
    { table: 'e7ki_messages', col: 'conversation_id', type: 'TEXT' },
    { table: 'zagel_messages', col: 'conversation_id', type: 'TEXT' }
  ]
  
  for (const { table, col, type } of columnMigrations) {
    try {
      await query(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`)
      console.log(`[E7ki] Added ${col} to ${table}`)
    } catch (err) {
      // Ignore if column exists or table missing
    }
  }

  // Finally: Create indices (only after tables exist)
  const indexMigrations = [
    `CREATE INDEX IF NOT EXISTS idx_e7ki_conversations_user_id ON e7ki_conversations(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_e7ki_participants_user_id ON e7ki_participants(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_e7ki_messages_conversation_id ON e7ki_messages(conversation_id)`,
    `CREATE INDEX IF NOT EXISTS idx_e7ki_messages_created_at ON e7ki_messages(created_at)`,
    
    // ZAGEL indices
    `CREATE INDEX IF NOT EXISTS idx_zagel_messages_conversation ON zagel_messages(conversation_id)`,
    `CREATE INDEX IF NOT EXISTS idx_zagel_voice_conversation ON zagel_voice_messages(conversation_id)`,
    `CREATE INDEX IF NOT EXISTS idx_zagel_voice_sender ON zagel_voice_messages(sender_id)`,
    `CREATE INDEX IF NOT EXISTS idx_zagel_deliveries_recipient ON zagel_deliveries(recipient_id)`,
    `CREATE INDEX IF NOT EXISTS idx_zagel_deliveries_created ON zagel_deliveries(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_zagel_avatars_user ON zagel_avatars(user_id)`
  ]
  
  for (const migration of indexMigrations) {
    try {
      await query(migration)
    } catch (err) {
      // Ignore index errors
    }
  }
  
  console.log('[E7ki/ZAGEL Schema] Setup complete')
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
    
    // Get participants with ZAGEL avatar info
    const participants = await query(
      `SELECT p.user_id, u.username, u.avatar, z.avatar_model, z.voice_enabled
       FROM e7ki_participants p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN zagel_avatars z ON p.user_id = z.user_id
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
    
    // ZAGEL: Log message delivery through avatar
    if (message_type === 'text' || message_type === 'transfer') {
      // Get recipient for this conversation
      const recipients = await query(
        `SELECT DISTINCT user_id FROM e7ki_participants WHERE conversation_id = ? AND user_id != ?`,
        [conversation_id, userId]
      )
      
      for (const rec of recipients) {
        const deliveryId = `zagel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        await query(
          `INSERT INTO zagel_deliveries (id, message_id, sender_id, recipient_id, delivery_type, delivery_method)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [deliveryId, messageId, userId, rec.user_id, 'message_transfer', 'avatar_bird']
        )
      }
    }
    
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

// ═══════════════════════════════════════════════════════
// ZAGEL: 3D AVATAR BIRD MESSENGER ENDPOINTS
// ═══════════════════════════════════════════════════════

// Initialize ZAGEL avatar for user
router.post('/zagel/avatar/init', requireAuth, async (req, res) => {
  try {
    const { avatar_model = 'bird_phoenix', avatar_color = '#FF6B35', voice_type = 'default' } = req.body
    const userId = req.user.id
    
    const avatarId = `zagel_${userId}`
    
    // Create or update ZAGEL avatar
    await query(
      `INSERT OR REPLACE INTO zagel_avatars (id, user_id, avatar_model, avatar_color, voice_type, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [avatarId, userId, avatar_model, avatar_color, voice_type]
    )
    
    // Grant reward for initializing ZAGEL
    await grantReward(userId, 'zagel_avatar_activated', 25, 'Activated ZAGEL 3D avatar messenger bird')
    
    res.json({
      success: true,
      avatar: {
        id: avatarId,
        user_id: userId,
        avatar_model,
        avatar_color,
        voice_type,
        is_active: true
      }
    })
  } catch (err) {
    console.error('[ZAGEL] Avatar init error:', err)
    res.status(500).json({ error: 'Failed to initialize ZAGEL avatar' })
  }
})

// Get ZAGEL avatar info
router.get('/zagel/avatar', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    
    const avatar = await query(
      `SELECT * FROM zagel_avatars WHERE user_id = ?`,
      [userId]
    )
    
    if (!avatar || avatar.length === 0) {
      return res.json({ success: true, avatar: null, message: 'ZAGEL avatar not initialized' })
    }
    
    res.json({ success: true, avatar: avatar[0] })
  } catch (err) {
    console.error('[ZAGEL] Get avatar error:', err)
    res.status(500).json({ error: 'Failed to get ZAGEL avatar' })
  }
})

// Send voice message via ZAGEL (vocal delivery)
router.post('/zagel/voice-message', requireAuth, async (req, res) => {
  try {
    const { conversation_id, audio_url, duration, transcription } = req.body
    const userId = req.user.id
    
    if (!conversation_id || !audio_url) {
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
    
    const voiceMessageId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create voice message
    await query(
      `INSERT INTO zagel_voice_messages (id, conversation_id, sender_id, audio_url, duration, transcription, delivery_method)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [voiceMessageId, conversation_id, userId, audio_url, duration, transcription, 'vocal']
    )
    
    // Log ZAGEL delivery for each recipient
    const recipients = await query(
      `SELECT DISTINCT user_id FROM e7ki_participants WHERE conversation_id = ? AND user_id != ?`,
      [conversation_id, userId]
    )
    
    for (const rec of recipients) {
      const deliveryId = `zagel_vocal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await query(
        `INSERT INTO zagel_deliveries (id, voice_message_id, sender_id, recipient_id, delivery_method, is_vocal_delivery)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [deliveryId, voiceMessageId, userId, rec.user_id, 'vocal_delivery']
      )
    }
    
    // Grant reward for sending voice message
    await grantReward(userId, 'zagel_voice_sent', 10, 'Sent vocal message via ZAGEL avatar')
    
    res.json({
      success: true,
      voice_message: {
        id: voiceMessageId,
        conversation_id,
        sender_id: userId,
        audio_url,
        duration,
        created_at: new Date().toISOString(),
        delivery_method: 'vocal'
      }
    })
  } catch (err) {
    console.error('[ZAGEL] Voice message error:', err)
    res.status(500).json({ error: 'Failed to send voice message' })
  }
})

// Get ZAGEL delivery history (message transfers)
router.get('/zagel/deliveries/:conversationId', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params
    const userId = req.user.id
    
    // Check if user is participant
    const participant = await query(
      `SELECT * FROM e7ki_participants WHERE conversation_id = ? AND user_id = ?`,
      [conversationId, userId]
    )
    
    if (!participant || participant.length === 0) {
      return res.status(403).json({ error: 'Not a participant' })
    }
    
    // Get all message transfers (ZAGEL deliveries)
    const deliveries = await query(
      `SELECT z.*, u.username, u.avatar 
       FROM zagel_deliveries z
       LEFT JOIN users u ON z.sender_id = u.id
       WHERE z.delivery_method IN ('avatar_bird', 'vocal_delivery')
       AND (z.sender_id = ? OR z.recipient_id = ?)
       ORDER BY z.created_at DESC
       LIMIT 50`,
      [userId, userId]
    )
    
    res.json({
      success: true,
      deliveries: deliveries || []
    })
  } catch (err) {
    console.error('[ZAGEL] Get deliveries error:', err)
    res.status(500).json({ error: 'Failed to get ZAGEL deliveries' })
  }
})

// Mark ZAGEL vocal message as played
router.post('/zagel/voice-message/:voiceMessageId/played', requireAuth, async (req, res) => {
  try {
    const { voiceMessageId } = req.params
    const userId = req.user.id
    
    // Find the delivery for this user
    const delivery = await query(
      `SELECT * FROM zagel_deliveries WHERE voice_message_id = ? AND recipient_id = ?`,
      [voiceMessageId, userId]
    )
    
    if (!delivery || delivery.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' })
    }
    
    // Mark as played
    await query(
      `UPDATE zagel_deliveries SET vocal_played = 1 WHERE id = ?`,
      [delivery[0].id]
    )
    
    res.json({ success: true })
  } catch (err) {
    console.error('[ZAGEL] Mark played error:', err)
    res.status(500).json({ error: 'Failed to mark message as played' })
  }
})

// Update ZAGEL avatar appearance
router.put('/zagel/avatar', requireAuth, async (req, res) => {
  try {
    const { avatar_model, avatar_color, animation_style, voice_enabled } = req.body
    const userId = req.user.id
    
    const updates = []
    const values = []
    
    if (avatar_model) {
      updates.push('avatar_model = ?')
      values.push(avatar_model)
    }
    if (avatar_color) {
      updates.push('avatar_color = ?')
      values.push(avatar_color)
    }
    if (animation_style) {
      updates.push('animation_style = ?')
      values.push(animation_style)
    }
    if (voice_enabled !== undefined) {
      updates.push('voice_enabled = ?')
      values.push(voice_enabled ? 1 : 0)
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }
    
    updates.push('updated_at = datetime("now")')
    values.push(userId)
    
    await query(
      `UPDATE zagel_avatars SET ${updates.join(', ')} WHERE user_id = ?`,
      values
    )
    
    res.json({ success: true, message: 'ZAGEL avatar updated' })
  } catch (err) {
    console.error('[ZAGEL] Update avatar error:', err)
    res.status(500).json({ error: 'Failed to update ZAGEL avatar' })
  }
})

export default router
