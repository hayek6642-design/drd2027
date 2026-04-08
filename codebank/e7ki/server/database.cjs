const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '../../../data.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables with proper indexes
db.exec(`
  -- Conversations table
  CREATE TABLE IF NOT EXISTS e7ki_conversations (
    id TEXT PRIMARY KEY,
    participant_ids TEXT NOT NULL, -- JSON array
    title TEXT DEFAULT 'Untitled Chat',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_conversations_updated ON e7ki_conversations(updated_at DESC);
  
  -- Messages table - aligned with client expectations
  CREATE TABLE IF NOT EXISTS e7ki_messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,  -- Changed from conversation_id to match client
    sender_id TEXT NOT NULL,
    sender_username TEXT,   -- Added for client display
    content TEXT,
    type TEXT DEFAULT 'text', -- Changed from content_type to match client
    media_url TEXT,
    status TEXT DEFAULT 'sent', -- sent, delivered, read
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES e7ki_conversations(id)
  );
  
  CREATE INDEX IF NOT EXISTS idx_messages_chat ON e7ki_messages(chat_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_messages_sender ON e7ki_messages(sender_id);
  
  -- Reactions table
  CREATE TABLE IF NOT EXISTS e7ki_reactions (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    reaction TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES e7ki_messages(id) ON DELETE CASCADE,
    UNIQUE(message_id, user_id, reaction)
  );
  
  -- Media files table with NO TTL (permanent storage)
  CREATE TABLE IF NOT EXISTS e7ki_media (
    id TEXT PRIMARY KEY,
    message_id TEXT,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES e7ki_messages(id) ON DELETE SET NULL
  );
`);

// Prepared statements for performance
const statements = {
  createConversation: db.prepare(`
    INSERT INTO e7ki_conversations (id, participant_ids, title, updated_at)
    VALUES (?, ?, ?, datetime('now'))
  `),
  
  getConversations: db.prepare(`
    SELECT * FROM e7ki_conversations 
    WHERE participant_ids LIKE ?
    ORDER BY updated_at DESC
  `),
  
  updateConversationTime: db.prepare(`
    UPDATE e7ki_conversations 
    SET updated_at = datetime('now')
    WHERE id = ?
  `),
  
  saveMessage: db.prepare(`
    INSERT INTO e7ki_messages (id, chat_id, sender_id, sender_username, content, type, media_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  
  getMessages: db.prepare(`
    SELECT * FROM e7ki_messages 
    WHERE chat_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `),
  
  updateMessageStatus: db.prepare(`
    UPDATE e7ki_messages SET status = ? WHERE id = ?
  `),
  
  addReaction: db.prepare(`
    INSERT OR REPLACE INTO e7ki_reactions (id, message_id, user_id, reaction)
    VALUES (?, ?, ?, ?)
  `),
  
  getReactions: db.prepare(`
    SELECT * FROM e7ki_reactions WHERE message_id = ?
  `)
};

module.exports = {
  createConversation: (participantIds, title) => {
    const id = uuidv4();
    statements.createConversation.run(id, JSON.stringify(participantIds), title || 'Untitled Chat');
    return { id, participant_ids: JSON.stringify(participantIds), title: title || 'Untitled Chat' };
  },
  
  getConversations: (userId) => {
    const rows = db.prepare(`
      SELECT * FROM e7ki_conversations 
      WHERE participant_ids LIKE ?
      ORDER BY updated_at DESC
    `).all(`%${userId}%`);
    return rows.map(r => ({
      ...r,
      participant_ids: JSON.parse(r.participant_ids)
    }));
  },
  
  saveMessage: (data) => {
    const id = uuidv4();
    statements.saveMessage.run(
      id,
      data.chatId,
      data.senderId,
      data.senderUsername,
      data.content,
      data.type || 'text',
      data.mediaUrl,
      data.status || 'sent'
    );
    statements.updateConversationTime.run(data.chatId);
    return { id, ...data };
  },
  
  getMessages: (chatId, limit = 50, offset = 0) => {
    const messages = db.prepare(`
      SELECT * FROM e7ki_messages 
      WHERE chat_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(chatId, limit, offset);
    return messages.reverse();
  },
  
  updateMessageStatus: (messageId, status) => {
    return statements.updateMessageStatus.run(status, messageId);
  },
  
  addReaction: (messageId, userId, reaction) => {
    const id = uuidv4();
    statements.addReaction.run(id, messageId, userId, reaction);
    return { id, message_id: messageId, user_id: userId, reaction };
  },
  
  getReactions: (messageId) => {
    return statements.getReactions.all(messageId);
  }
};
