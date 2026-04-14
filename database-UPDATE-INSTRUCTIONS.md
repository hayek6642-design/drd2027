# Database Update Instructions

## File: `codebank/e7ki/server/database.cjs` or `database.js`

### Step 1: Add Users Table to Schema

Find the section where tables are created (usually in the constructor or init method). Add this table definition:

```javascript
// Add this to your CREATE TABLE IF NOT EXISTS statements:

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### Step 2: Add These Methods to Your Database Class

Add these methods to your `e7kiDatabase` class:

```javascript
/**
 * Create a new user
 * @param {Object} userData - { email, password_hash, display_name }
 * @returns {number} userId
 */
createUser(userData) {
  try {
    const result = this.db.prepare(`
      INSERT INTO users (email, password_hash, display_name, created_at)
      VALUES (?, ?, ?, ?)
    `).run(
      userData.email,
      userData.password_hash,
      userData.display_name || userData.email.split('@')[0],
      new Date().toISOString()
    );

    return result.lastID;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Get user by email
 * @param {string} email
 * @returns {Object|null} user object or null
 */
getUserByEmail(email) {
  try {
    return this.db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).get(email);
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
}

/**
 * Get user by ID
 * @param {number} id
 * @returns {Object|null} user object (without password) or null
 */
getUserById(id) {
  try {
    return this.db.prepare(`
      SELECT id, email, display_name, created_at, updated_at FROM users WHERE id = ?
    `).get(id);
  } catch (error) {
    console.error('Error fetching user by id:', error);
    return null;
  }
}

/**
 * Update user display name
 * @param {number} userId
 * @param {string} displayName
 * @returns {boolean} success
 */
updateUserDisplayName(userId, displayName) {
  try {
    this.db.prepare(`
      UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?
    `).run(displayName, new Date().toISOString(), userId);
    return true;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
}

/**
 * Get all users (for admin purposes)
 * @returns {Array} array of users
 */
getAllUsers() {
  try {
    return this.db.prepare(`
      SELECT id, email, display_name, created_at FROM users
    `).all();
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}
```

## Complete Example

Here's how your database initialization might look:

```javascript
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class E7kiDatabase {
  constructor() {
    const dbPath = path.join(__dirname, 'e7ki.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initializeTables();
  }

  initializeTables() {
    // Create tables
    this.db.exec(`
      -- Users table for authentication
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

      -- Conversations table
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        FOREIGN KEY(created_by) REFERENCES users(id)
      );

      -- Conversation participants
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at TEXT NOT NULL,
        UNIQUE(conversation_id, user_id),
        FOREIGN KEY(conversation_id) REFERENCES conversations(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      -- Messages table
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        media_url TEXT,
        status TEXT DEFAULT 'sent',
        created_at TEXT NOT NULL,
        FOREIGN KEY(conversation_id) REFERENCES conversations(id),
        FOREIGN KEY(sender_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

      -- Media files
      CREATE TABLE IF NOT EXISTS media_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        mime_type TEXT,
        file_size INTEGER,
        uploaded_at TEXT,
        FOREIGN KEY(message_id) REFERENCES messages(id)
      );
    `);
  }

  // ==================== USER METHODS ====================

  createUser(userData) {
    try {
      const result = this.db.prepare(`
        INSERT INTO users (email, password_hash, display_name, created_at)
        VALUES (?, ?, ?, ?)
      `).run(
        userData.email,
        userData.password_hash,
        userData.display_name || userData.email.split('@')[0],
        new Date().toISOString()
      );

      return result.lastID;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  getUserByEmail(email) {
    try {
      return this.db.prepare(`
        SELECT * FROM users WHERE email = ?
      `).get(email);
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }

  getUserById(id) {
    try {
      return this.db.prepare(`
        SELECT id, email, display_name, created_at, updated_at FROM users WHERE id = ?
      `).get(id);
    } catch (error) {
      console.error('Error fetching user by id:', error);
      return null;
    }
  }

  updateUserDisplayName(userId, displayName) {
    try {
      this.db.prepare(`
        UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?
      `).run(displayName, new Date().toISOString(), userId);
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  }

  getAllUsers() {
    try {
      return this.db.prepare(`
        SELECT id, email, display_name, created_at FROM users
      `).all();
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  }

  // ==================== CONVERSATION METHODS ====================
  // ... (keep your existing conversation methods)

  // ==================== MESSAGE METHODS ====================
  // ... (keep your existing message methods)

  // ==================== MEDIA METHODS ====================
  // ... (keep your existing media methods)
}

export const e7kiDatabase = new E7kiDatabase();
```

## Verification

After adding the tables and methods, verify with:

```javascript
// Test user creation
const userId = e7kiDatabase.createUser({
  email: 'test@example.com',
  password_hash: 'hashed_password_here',
  display_name: 'Test User'
});

// Test user retrieval
const user = e7kiDatabase.getUserByEmail('test@example.com');
console.log('Created user:', user);
```
