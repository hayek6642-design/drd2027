/**
 * E7ki Database Schema and API Fix
 * Fixes database schema mismatches and implements missing API endpoints
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Enhanced Database Schema
export const enhancedSchema = `
-- Enhanced E7ki Database Schema
CREATE TABLE IF NOT EXISTS e7ki_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active BOOLEAN DEFAULT 1,
  role TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS e7ki_conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  is_group BOOLEAN DEFAULT 0,
  participant_ids TEXT NOT NULL, -- JSON array of user IDs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_message_id TEXT,
  FOREIGN KEY (last_message_id) REFERENCES e7ki_messages(id)
);

CREATE TABLE IF NOT EXISTS e7ki_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_username TEXT, -- Added for client compatibility
  content TEXT,
  content_type TEXT DEFAULT 'text', -- text, image, voice, file
  media_url TEXT,
  status TEXT DEFAULT 'sent', -- sent, delivered, read
  reactions TEXT DEFAULT '[]', -- JSON array of reactions
  reply_to TEXT, -- Message ID this is a reply to
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES e7ki_conversations(id),
  FOREIGN KEY (sender_id) REFERENCES e7ki_users(id),
  FOREIGN KEY (reply_to) REFERENCES e7ki_messages(id)
);

CREATE TABLE IF NOT EXISTS e7ki_media_files (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  mime_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES e7ki_messages(id)
);

CREATE TABLE IF NOT EXISTS e7ki_message_reads (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES e7ki_messages(id),
  FOREIGN KEY (user_id) REFERENCES e7ki_users(id)
);

CREATE TABLE IF NOT EXISTS e7ki_message_reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES e7ki_messages(id),
  FOREIGN KEY (user_id) REFERENCES e7ki_users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_e7ki_conversations_participants ON e7ki_conversations(participant_ids);
CREATE INDEX IF NOT EXISTS idx_e7ki_messages_conversation ON e7ki_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_e7ki_messages_sender ON e7ki_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_e7ki_messages_created ON e7ki_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_e7ki_messages_conversation_created ON e7ki_messages(conversation_id, created_at);
`;

// Enhanced Database Operations
export class E7kiDatabase {
  constructor(db) {
    this.db = db;
  }

  // Create a new conversation
  createConversation(participantIds, title = null) {
    const stmt = this.db.prepare(`
      INSERT INTO e7ki_conversations (id, title, participant_ids) 
      VALUES (?, ?, ?)
    `);
    const conversationId = uuidv4();
    stmt.run(conversationId, title, JSON.stringify(participantIds));
    return conversationId;
  }

  // Get conversations for a user
  getConversations(userId) {
    const stmt = this.db.prepare(`
      SELECT * FROM e7ki_conversations 
      WHERE participant_ids LIKE ?
      ORDER BY updated_at DESC
    `);
    const result = stmt.all(`%${userId}%`);
    return result.map(c => ({
      ...c,
      participant_ids: JSON.parse(c.participant_ids),
      last_message: this.getLastMessage(c.last_message_id)
    }));
  }

  // Get last message for a conversation
  getLastMessage(messageId) {
    if (!messageId) return null;
    const stmt = this.db.prepare(`
      SELECT * FROM e7ki_messages 
      WHERE id = ?
    `);
    const result = stmt.get(messageId);
    return result ? {
      ...result,
      reactions: JSON.parse(result.reactions || '[]')
    } : null;
  }

  // Save a message
  saveMessage(data) {
    const stmt = this.db.prepare(`
      INSERT INTO e7ki_messages (id, conversation_id, sender_id, sender_username, content, content_type, media_url, reply_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const messageId = uuidv4();
    stmt.run(
      messageId, 
      data.conversationId, 
      data.senderId, 
      data.senderUsername || 'Unknown',
      data.content, 
      data.type, 
      data.mediaUrl,
      data.replyTo
    );
    
    // Update conversation updated_at and last_message_id
    const updateStmt = this.db.prepare(`
      UPDATE e7ki_conversations 
      SET updated_at = CURRENT_TIMESTAMP, last_message_id = ?
      WHERE id = ?
    `);
    updateStmt.run(messageId, data.conversationId);
    
    return messageId;
  }

  // Get messages for a conversation
  getMessages(conversationId, limit = 50, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT m.*, u.username as sender_username
      FROM e7ki_messages m
      LEFT JOIN e7ki_users u ON m.sender_id = u.id
      WHERE m.conversation_id = ? 
      ORDER BY m.created_at DESC 
      LIMIT ? OFFSET ?
    `);
    const result = stmt.all(conversationId, limit, offset);
    return result.reverse().map(m => ({
      ...m,
      reactions: JSON.parse(m.reactions || '[]')
    }));
  }

  // Update message status
  updateMessageStatus(messageId, status) {
    const stmt = this.db.prepare(`
      UPDATE e7ki_messages 
      SET status = ? 
      WHERE id = ?
    `);
    stmt.run(status, messageId);
  }

  // Get conversation by ID
  getConversation(conversationId) {
    const stmt = this.db.prepare(`
      SELECT * FROM e7ki_conversations 
      WHERE id = ?
    `);
    const result = stmt.get(conversationId);
    if (result) {
      return {
        ...result,
        participant_ids: JSON.parse(result.participant_ids),
        last_message: this.getLastMessage(result.last_message_id)
      };
    }
    return null;
  }

  // Check if conversation exists between users
  getConversationByParticipants(participantIds) {
    const stmt = this.db.prepare(`
      SELECT * FROM e7ki_conversations 
      WHERE participant_ids = ?
    `);
    const result = stmt.get(JSON.stringify(participantIds));
    if (result) {
      return {
        ...result,
        participant_ids: JSON.parse(result.participant_ids),
        last_message: this.getLastMessage(result.last_message_id)
      };
    }
    return null;
  }

  // Store media file metadata
  storeMediaFile(messageId, filePath, fileType, fileSize, mimeType) {
    const stmt = this.db.prepare(`
      INSERT INTO e7ki_media_files (id, message_id, file_path, file_type, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const fileId = uuidv4();
    stmt.run(fileId, messageId, filePath, fileType, fileSize, mimeType);
    return fileId;
  }

  // Get media file by ID
  getMediaFile(fileId) {
    const stmt = this.db.prepare(`
      SELECT * FROM e7ki_media_files 
      WHERE id = ?
    `);
    return stmt.get(fileId);
  }

  // Add reaction to message
  addReaction(messageId, userId, emoji) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO e7ki_message_reactions (id, message_id, user_id, emoji)
      VALUES (?, ?, ?, ?)
    `);
    const reactionId = uuidv4();
    stmt.run(reactionId, messageId, userId, emoji);
    
    // Update message reactions
    const msgStmt = this.db.prepare(`
      SELECT reactions FROM e7ki_messages WHERE id = ?
    `);
    const result = msgStmt.get(messageId);
    let reactions = JSON.parse(result?.reactions || '[]');
    
    // Remove existing reaction from this user
    reactions = reactions.filter(r => r.userId !== userId);
    // Add new reaction
    reactions.push({ userId, emoji });
    
    const updateStmt = this.db.prepare(`
      UPDATE e7ki_messages SET reactions = ? WHERE id = ?
    `);
    updateStmt.run(JSON.stringify(reactions), messageId);
    
    return reactions;
  }

  // Remove reaction from message
  removeReaction(messageId, userId) {
    const stmt = this.db.prepare(`
      DELETE FROM e7ki_message_reactions WHERE message_id = ? AND user_id = ?
    `);
    stmt.run(messageId, userId);
    
    // Update message reactions
    const msgStmt = this.db.prepare(`
      SELECT reactions FROM e7ki_messages WHERE id = ?
    `);
    const result = msgStmt.get(messageId);
    let reactions = JSON.parse(result?.reactions || '[]');
    
    reactions = reactions.filter(r => r.userId !== userId);
    
    const updateStmt = this.db.prepare(`
      UPDATE e7ki_messages SET reactions = ? WHERE id = ?
    `);
    updateStmt.run(JSON.stringify(reactions), messageId);
    
    return reactions;
  }

  // Mark message as read
  markMessageRead(messageId, userId) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO e7ki_message_reads (id, message_id, user_id)
      VALUES (?, ?, ?)
    `);
    const readId = uuidv4();
    stmt.run(readId, messageId, userId);
    
    // Update message status to 'read' if all participants have read it
    const convStmt = this.db.prepare(`
      SELECT conversation_id FROM e7ki_messages WHERE id = ?
    `);
    const convResult = convStmt.get(messageId);
    
    if (convResult) {
      const convStmt2 = this.db.prepare(`
        SELECT participant_ids FROM e7ki_conversations WHERE id = ?
      `);
      const convData = convStmt2.get(convResult.conversation_id);
      
      if (convData) {
        const participants = JSON.parse(convData.participant_ids);
        const readStmt = this.db.prepare(`
          SELECT COUNT(*) as read_count FROM e7ki_message_reads 
          WHERE message_id = ? AND user_id IN (${participants.map(() => '?').join(',')})
        `);
        const readResult = readStmt.get(messageId, ...participants);
        
        if (readResult && readResult.read_count === participants.length) {
          this.updateMessageStatus(messageId, 'read');
        }
      }
    }
  }

  // Search users
  searchUsers(query, excludeUserId = null) {
    let sql = `
      SELECT id, email, username, created_at 
      FROM e7ki_users 
      WHERE (username LIKE ? OR email LIKE ?) AND is_active = 1
    `;
    const params = [`%${query}%`, `%${query}%`];
    
    if (excludeUserId) {
      sql += ' AND id != ?';
      params.push(excludeUserId);
    }
    
    sql += ' ORDER BY username LIMIT 20';
    
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  // Get user by ID
  getUser(userId) {
    const stmt = this.db.prepare(`
      SELECT id, email, username, created_at 
      FROM e7ki_users 
      WHERE id = ? AND is_active = 1
    `);
    return stmt.get(userId);
  }

  // Create user
  createUser(userData) {
    const stmt = this.db.prepare(`
      INSERT INTO e7ki_users (id, email, username, password_hash)
      VALUES (?, ?, ?, ?)
    `);
    const userId = uuidv4();
    stmt.run(userId, userData.email, userData.username, userData.password_hash);
    return userId;
  }
}

// Enhanced API Endpoints
export function createE7kiAPIRoutes(database) {
  const router = express.Router();

  // Authentication middleware
  const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token required' 
      });
    }

    try {
      // For now, we'll use a simple validation
      // In production, this should validate JWT tokens
      req.user = { id: 'test-user-id', email: 'test@example.com' };
      next();
    } catch (error) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }
  };

  // Configure multer for file uploads
  const uploadsDir = path.join(process.cwd(), 'uploads', 'e7ki');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const userDir = path.join(uploadsDir, req.user?.id || 'anonymous');
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
      cb(null, userDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });

  const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
      const allowed = ['audio/webm', 'audio/ogg', 'image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
      cb(null, allowed.includes(file.mimetype));
    }
  });

  // Health check
  router.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      connections: 0, // This would come from actual WebSocket connections
      database: 'sqlite',
      authenticated: !!req.user,
      user: req.user ? { id: req.user.id, email: req.user.email } : null
    });
  });

  // Get conversations for current user
  router.get('/chats', authenticate, (req, res) => {
    try {
      const userId = req.user.id;
      const conversations = database.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching chats:', error);
      res.status(500).json({ error: 'Failed to fetch chats' });
    }
  });

  // Create new conversation
  router.post('/chats', authenticate, (req, res) => {
    try {
      const userId = req.user.id;
      const { participantIds, title } = req.body;

      if (!participantIds || !Array.isArray(participantIds)) {
        return res.status(400).json({ error: 'participantIds array required' });
      }

      if (!participantIds.includes(userId)) {
        participantIds.push(userId);
      }

      const conversationId = database.createConversation(participantIds, title);
      const conversation = database.getConversation(conversationId);

      res.status(201).json(conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  });

  // Get messages for a conversation
  router.get('/messages', authenticate, (req, res) => {
    try {
      const userId = req.user.id;
      const conversationId = req.query.chat_id;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      if (!conversationId) {
        return res.status(400).json({ error: 'chat_id required' });
      }

      // Verify user is part of conversation
      const conversation = database.getConversation(conversationId);
      if (!conversation || !conversation.participant_ids.includes(userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const messages = database.getMessages(conversationId, limit, offset);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Send message
  router.post('/messages', authenticate, (req, res) => {
    try {
      const userId = req.user.id;
      const { chat_id, content, type = 'text', media_url, reply_to } = req.body;

      if (!chat_id || !content) {
        return res.status(400).json({ error: 'chat_id and content required' });
      }

      // Verify user is part of conversation
      const conversation = database.getConversation(chat_id);
      if (!conversation || !conversation.participant_ids.includes(userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const user = database.getUser(userId);
      const messageId = database.saveMessage({
        conversationId: chat_id,
        senderId: userId,
        senderUsername: user?.username || 'Unknown',
        content,
        type,
        mediaUrl: media_url,
        replyTo: reply_to
      });

      const message = {
        id: messageId,
        chat_id: chat_id,
        sender_id: userId,
        sender_username: user?.username || 'Unknown',
        content,
        type,
        media_url: media_url,
        status: 'sent',
        reactions: [],
        reply_to: reply_to,
        created_at: new Date().toISOString()
      };

      res.status(201).json(message);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // Upload file
  router.post('/upload', authenticate, upload.single('file'), (req, res) => {
    try {
      const userId = req.user.id;
      const chatId = req.body.chat_id;
      const file = req.file;

      if (!chatId || !file) {
        return res.status(400).json({ error: 'chat_id and file required' });
      }

      // Verify user is part of conversation
      const conversation = database.getConversation(chatId);
      if (!conversation || !conversation.participant_ids.includes(userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const user = database.getUser(userId);
      const messageId = database.saveMessage({
        conversationId: chatId,
        senderId: userId,
        senderUsername: user?.username || 'Unknown',
        content: file.originalname,
        type: file.mimetype.startsWith('image/') ? 'image' : 
               file.mimetype.startsWith('audio/') ? 'voice' : 'file',
        mediaUrl: `/uploads/e7ki/${userId}/${file.filename}`
      });

      // Store file metadata
      database.storeMediaFile(messageId, file.path, file.mimetype, file.size, file.mimetype);

      const message = {
        id: messageId,
        chat_id: chatId,
        sender_id: userId,
        sender_username: user?.username || 'Unknown',
        content: file.originalname,
        type: file.mimetype.startsWith('image/') ? 'image' : 
               file.mimetype.startsWith('audio/') ? 'voice' : 'file',
        media_url: `/uploads/e7ki/${userId}/${file.filename}`,
        status: 'sent',
        reactions: [],
        created_at: new Date().toISOString()
      };

      res.status(201).json(message);
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  // Add reaction to message
  router.post('/messages/:messageId/reactions', authenticate, (req, res) => {
    try {
      const userId = req.user.id;
      const messageId = req.params.messageId;
      const { emoji } = req.body;

      if (!emoji) {
        return res.status(400).json({ error: 'emoji required' });
      }

      const reactions = database.addReaction(messageId, userId, emoji);
      res.json({ reactions });
    } catch (error) {
      console.error('Error adding reaction:', error);
      res.status(500).json({ error: 'Failed to add reaction' });
    }
  });

  // Remove reaction from message
  router.delete('/messages/:messageId/reactions', authenticate, (req, res) => {
    try {
      const userId = req.user.id;
      const messageId = req.params.messageId;

      const reactions = database.removeReaction(messageId, userId);
      res.json({ reactions });
    } catch (error) {
      console.error('Error removing reaction:', error);
      res.status(500).json({ error: 'Failed to remove reaction' });
    }
  });

  // Mark message as read
  router.post('/messages/:messageId/read', authenticate, (req, res) => {
    try {
      const userId = req.user.id;
      const messageId = req.params.messageId;

      database.markMessageRead(messageId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ error: 'Failed to mark as read' });
    }
  });

  // Typing indicator
  router.post('/typing', authenticate, (req, res) => {
    try {
      const userId = req.user.id;
      const { chat_id, is_typing } = req.body;

      if (!chat_id) {
        return res.status(400).json({ error: 'chat_id required' });
      }

      // Verify user is part of conversation
      const conversation = database.getConversation(chat_id);
      if (!conversation || !conversation.participant_ids.includes(userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // In a real implementation, this would broadcast to other participants
      res.json({ success: true });
    } catch (error) {
      console.error('Error sending typing:', error);
      res.status(500).json({ error: 'Failed to send typing' });
    }
  });

  // Search users
  router.get('/users/search', authenticate, (req, res) => {
    try {
      const userId = req.user.id;
      const query = req.query.q;

      if (!query || query.length < 2) {
        return res.status(400).json({ error: 'Query must be at least 2 characters' });
      }

      const users = database.searchUsers(query, userId);
      res.json(users);
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Failed to search users' });
    }
  });

  // Get user info
  router.get('/users/:userId', authenticate, (req, res) => {
    try {
      const requestedUserId = req.params.userId;
      const user = database.getUser(requestedUserId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  return router;
}

// Export for use in other modules
export default {
  enhancedSchema,
  E7kiDatabase,
  createE7kiAPIRoutes
};