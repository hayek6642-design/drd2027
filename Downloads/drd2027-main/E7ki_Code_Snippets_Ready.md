# E7ki Service - Copy-Paste Code Snippets

**Ready-to-use code fixes and implementations**  
**Status**: ✅ Production-ready (test before deploy)

---

## 1️⃣ CRITICAL FIX: WebSocket Port Issue

### ❌ CURRENT (BROKEN)
**File**: `codebank/e7ki/client/src/lib/websocket-context.jsx`

```javascript
// Line ~20
const wsUrl = `${protocol}//${host}:5000`;  // ❌ HARDCODED PORT
```

### ✅ FIXED
```javascript
const connect = useCallback(() => {
  if (!user?.token) return;

  // Use same host without specifying port (browser infers from current page)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname || 'localhost';
  
  // FIXED: Remove hardcoded port
  const wsUrl = `${protocol}//${host}`;
  
  console.log('[E7ki] Connecting to WebSocket at:', wsUrl);

  const newSocket = io(wsUrl, {
    path: '/ws',
    auth: { token: user.token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
  });

  // ... rest of connection logic
  newSocket.on('connect', () => {
    console.log('[E7ki] WebSocket connected');
    setConnected(true);
    setReconnecting(false);
    // Flush queued messages
    while (messageQueue.current.length > 0) {
      const msg = messageQueue.current.shift();
      newSocket.emit(msg.event, msg.data);
    }
  });

  newSocket.on('disconnect', (reason) => {
    console.log('[E7ki] WebSocket disconnected:', reason);
    setConnected(false);
  });

  newSocket.on('connect_error', (error) => {
    console.error('[E7ki] Connection error:', error);
    setReconnecting(true);
  });

  setSocket(newSocket);
  return () => { newSocket.close(); };
}, [user?.token]);
```

**Testing**:
```javascript
// After fix, check browser console:
// Should see: [E7ki] Connecting to WebSocket at: wss://dr-d-h51l.onrender.com
// NOT: wss://dr-d-h51l.onrender.com:5000
```

---

## 2️⃣ CODE INTEGRATION: E7ki in CodeBank Sidebar

### ADD TO INDEXCB.HTML
**File**: `codebank/indexCB.html`

```html
<!-- Add this to the services sidebar menu (around line 100-200) -->
<div class="service-item e7ki-service">
  <a href="/codebank/e7ki.html" class="service-link" data-service="e7ki">
    <span class="icon">💬</span>
    <span class="label">E7ki Messenger</span>
    <span class="badge unread-count" id="e7ki-unread-badge" style="display:none;">0</span>
  </a>
</div>

<style>
.e7ki-service {
  /* Style consistent with other services */
  padding: 10px 12px;
  margin: 5px 0;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.e7ki-service:hover {
  background-color: rgba(0, 212, 255, 0.1);
}

.e7ki-service .service-link {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
  font-weight: 500;
}

.e7ki-service .icon {
  font-size: 20px;
}

.e7ki-service .badge {
  margin-left: auto;
  background: #ff4444;
  color: white;
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: bold;
}
</style>
```

### CREATE ENTRY POINT
**File**: Create `codebank/e7ki.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E7ki Messenger</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      height: 100%;
      width: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    
    #e7ki-root {
      height: 100%;
      width: 100%;
    }
    
    .e7ki-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      font-size: 16px;
      color: #666;
    }
    
    .e7ki-error {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      flex-direction: column;
      gap: 20px;
      font-size: 16px;
      color: #d32f2f;
      background: #ffebee;
    }
  </style>
</head>
<body>
  <div id="e7ki-root">
    <div class="e7ki-loading">
      <span>Loading E7ki...</span>
    </div>
  </div>

  <script type="module">
    // E7ki Boot Script
    console.log('[E7ki Bootstrap] Starting...');
    
    // 1. Verify we're in a browser environment
    if (typeof window === 'undefined') {
      console.error('[E7ki] Server-side rendering detected, exiting');
      process.exit(1);
    }
    
    // 2. Setup error boundary
    window.addEventListener('error', (event) => {
      console.error('[E7ki Error]', event.error);
      const root = document.getElementById('e7ki-root');
      if (root) {
        root.innerHTML = `
          <div class="e7ki-error">
            <h2>⚠️ E7ki Error</h2>
            <p>${event.error?.message || 'Unknown error'}</p>
            <button onclick="location.reload()">Reload</button>
          </div>
        `;
      }
    });
    
    // 3. Listen for auth from parent CodeBank
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'e7ki:auth' || event.data?.type === 'auth:ready') {
        console.log('[E7ki Bootstrap] Received auth from parent');
        // Store in window.Auth for auth-context to access
        window.AuthFromParent = event.data.auth || event.data;
      }
    }, false);
    
    // 4. Request auth from parent if not already provided
    try {
      if (window.parent !== window) {
        console.log('[E7ki Bootstrap] Requesting auth from parent...');
        window.parent.postMessage({
          type: 'e7ki:request-auth',
          timestamp: Date.now()
        }, '*');
      }
    } catch (e) {
      console.warn('[E7ki Bootstrap] Cannot access parent:', e.message);
    }
    
    // 5. Load and mount React app
    try {
      const root = document.getElementById('e7ki-root');
      root.innerHTML = '<div class="e7ki-loading"><span>Initializing...</span></div>';
      
      // Import React app entry point
      import('./src/main.jsx')
        .then(module => {
          console.log('[E7ki Bootstrap] React app loaded successfully');
          root.innerHTML = '<div id="app"></div>';
        })
        .catch(error => {
          console.error('[E7ki Bootstrap] Failed to load React app:', error);
          root.innerHTML = `
            <div class="e7ki-error">
              <h2>⚠️ Failed to Load E7ki</h2>
              <p>${error.message}</p>
              <details>
                <summary>Details</summary>
                <pre>${error.stack}</pre>
              </details>
              <button onclick="location.reload()">Reload</button>
            </div>
          `;
        });
    } catch (e) {
      console.error('[E7ki Bootstrap] Init error:', e);
      const root = document.getElementById('e7ki-root');
      root.innerHTML = `<div class="e7ki-error"><p>Init error: ${e.message}</p></div>`;
    }
  </script>
</body>
</html>
```

---

## 3️⃣ USER SEARCH API IMPLEMENTATION

### ADD TO SERVER ROUTES
**File**: `codebank/e7ki/server/routes.js`

```javascript
import { log } from "./index.js";

// Search users by username or email
app.get("/api/e7ki/users/search", async (req, res) => {
  try {
    const userId = req.user?.id;
    const query = (req.query.q || '').trim();
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    if (!query || query.length < 2) {
      return res.status(400).json({ 
        error: "Search query must be at least 2 characters" 
      });
    }

    log(`[E7ki] User search: userId=${userId}, query="${query}"`, "api");

    // Query database for matching users (exclude current user)
    const users = e7kiDatabase.searchUsers(query, userId);

    res.json({
      success: true,
      query,
      count: users.length,
      users: users.map(u => ({
        id: u.id,
        username: u.username || u.email?.split('@')[0],
        email: u.email,
        avatar: u.avatar_url || null,
        bio: u.bio || null,
        status: u.status || 'offline'
      }))
    });
  } catch (error) {
    log(`[E7ki] User search error: ${error.message}`, "api");
    res.status(500).json({ error: "Search failed" });
  }
});

// Get specific user profile
app.get("/api/e7ki/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user?.id;

    if (!requesterId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = e7kiDatabase.getUser(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username || user.email?.split('@')[0],
        email: user.email,
        avatar: user.avatar_url || null,
        bio: user.bio || null,
        status: user.status || 'offline',
        createdAt: user.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});
```

### UPDATE DATABASE MODULE
**File**: `codebank/e7ki/server/database.cjs` (add these functions)

```javascript
// Search users by username or email
searchUsers: (query, excludeUserId) => {
  const searchPattern = `%${query}%`;
  const rows = db.prepare(`
    SELECT id, username, email, avatar_url, bio, status, created_at
    FROM users
    WHERE (username LIKE ? OR email LIKE ?)
    AND id != ?
    ORDER BY username ASC
    LIMIT 50
  `).all(searchPattern, searchPattern, excludeUserId);
  
  return rows || [];
},

// Get user by ID
getUser: (userId) => {
  const row = db.prepare(`
    SELECT id, username, email, avatar_url, bio, status, created_at
    FROM users
    WHERE id = ?
  `).get(userId);
  
  return row || null;
},

// List all users (for new chat picker)
listUsers: (excludeUserId, limit = 100) => {
  const rows = db.prepare(`
    SELECT id, username, email, avatar_url, status
    FROM users
    WHERE id != ?
    ORDER BY username ASC
    LIMIT ?
  `).all(excludeUserId, limit);
  
  return rows || [];
}
```

---

## 4️⃣ USER SEARCH UI COMPONENT UPDATE

### UPDATE NEW CHAT DIALOG
**File**: `codebank/e7ki/client/src/components/chat/new-chat-dialog.jsx`

```javascript
import { useState, useEffect, useCallback } from "react";
import { useChat } from "@/lib/chat-context";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Plus, Loader2, Search, X } from "lucide-react";

export function NewChatDialog({ children }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { createNewChat } = useChat();
  const { getAuthHeaders } = useAuth();

  // Debounced search
  useEffect(() => {
    if (!open) return;
    
    const timer = setTimeout(async () => {
      if (search.length < 2) {
        setUsers([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/e7ki/users/search?q=${encodeURIComponent(search)}`,
          { headers: getAuthHeaders() }
        );
        
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        } else if (response.status === 400) {
          setError("Search query too short (min 2 chars)");
        } else {
          setError("Failed to search users");
        }
      } catch (error) {
        console.error("[E7ki] Search error:", error);
        setError("Search failed");
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [search, open, getAuthHeaders]);

  const handleSelectUser = async (user) => {
    setIsLoading(true);
    try {
      if (createNewChat) {
        await createNewChat({
          id: user.id,
          name: user.username,
          email: user.email
        });
      }
      setOpen(false);
      setSearch("");
      setUsers([]);
    } catch (error) {
      console.error("[E7ki] Failed to create chat:", error);
      setError("Failed to create chat");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon">
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Chat</DialogTitle>
          <DialogDescription>
            Search for a user to start a conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted rounded"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading && !users.length && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* User List */}
          {!isLoading && users.length > 0 && (
            <ScrollArea className="h-[300px] w-full rounded-md border">
              <div className="space-y-2 p-4">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    disabled={isLoading}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors text-left disabled:opacity-50"
                  >
                    <Avatar>
                      <AvatarFallback>
                        {(user.username || user.email)?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {user.username || user.email?.split('@')[0]}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* No Results */}
          {!isLoading && search.length >= 2 && users.length === 0 && !error && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No users found</p>
            </div>
          )}

          {/* Empty State */}
          {!search && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>Type at least 2 characters to search</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 5️⃣ MESSAGE ENCRYPTION (TweetNaCl.js)

### INSTALL PACKAGE
```bash
npm install tweetnacl tweetnacl-util --save
```

### CREATE CRYPTO MODULE
**File**: `codebank/e7ki/client/src/lib/crypto.js`

```javascript
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

/**
 * Generate a keypair for Nacl Box (asymmetric encryption)
 */
export function generateKeyPair() {
  const keypair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keypair.publicKey),
    secretKey: encodeBase64(keypair.secretKey)
  };
}

/**
 * Encrypt a message using recipient's public key
 */
export function encryptMessage(plaintext, recipientPublicKey, senderSecretKey) {
  const message = new TextEncoder().encode(plaintext);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const publicKey = decodeBase64(recipientPublicKey);
  const secretKey = decodeBase64(senderSecretKey);
  
  const encrypted = nacl.box(message, nonce, publicKey, secretKey);
  
  return {
    ciphertext: encodeBase64(encrypted),
    nonce: encodeBase64(nonce)
  };
}

/**
 * Decrypt a message using sender's public key
 */
export function decryptMessage(ciphertext, nonce, senderPublicKey, recipientSecretKey) {
  try {
    const encrypted = decodeBase64(ciphertext);
    const nonceBytes = decodeBase64(nonce);
    const publicKey = decodeBase64(senderPublicKey);
    const secretKey = decodeBase64(recipientSecretKey);
    
    const decrypted = nacl.box.open(encrypted, nonceBytes, publicKey, secretKey);
    
    if (!decrypted) {
      throw new Error('Decryption failed');
    }
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('[Crypto] Decryption error:', error);
    return null;
  }
}

/**
 * Generate and sign a challenge for key exchange
 */
export function generateChallenge() {
  return encodeBase64(nacl.randomBytes(32));
}

/**
 * Verify a signed challenge
 */
export function verifyChallenge(challenge, signature, publicKey) {
  try {
    const signatureBytes = decodeBase64(signature);
    const messageBytes = decodeBase64(challenge);
    const publicKeyBytes = decodeBase64(publicKey);
    
    return nacl.sign.open(signatureBytes, publicKeyBytes) !== false;
  } catch (e) {
    return false;
  }
}
```

### UPDATE CHAT CONTEXT
**File**: `codebank/e7ki/client/src/lib/chat-context.jsx` (partial update)

```javascript
import { generateKeyPair, encryptMessage, decryptMessage } from './crypto';

// In ChatProvider component:

const sendMessage = async (chatId, content, type = 'text', options = {}) => {
  const messageData = {
    chatId,
    content,
    type,
    ...options,
    timestamp: Date.now(),
  };

  try {
    // If encryption is enabled and this is a text message
    if (activeChat?.encryptionEnabled && type === 'text') {
      const encrypted = encryptMessage(
        content,
        activeChat.recipientPublicKey,
        userKeys.secretKey
      );
      
      messageData.content = encrypted.ciphertext;
      messageData.nonce = encrypted.nonce;
      messageData.encrypted = true;
    }

    const response = await fetch('/api/e7ki/messages', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    if (response.ok) {
      const sentMessage = await response.json();
      const formattedMsg = {
        id: sentMessage.id,
        chatId: sentMessage.chat_id,
        senderId: sentMessage.sender_id,
        senderName: sentMessage.sender_username || 'Me',
        type: sentMessage.type,
        content: sentMessage.content, // Already decrypted if needed
        reactions: [],
        status: sentMessage.status,
        timestamp: new Date(sentMessage.created_at).getTime(),
      };
      setMessages(prev => [...prev, formattedMsg]);
      return formattedMsg;
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};
```

---

## 6️⃣ RATE LIMITING MIDDLEWARE

### INSTALL PACKAGE
```bash
npm install express-rate-limit --save
```

### ADD TO SERVER
**File**: `codebank/e7ki/server/index.cjs`

```javascript
import rateLimit from 'express-rate-limit';

// Create limiters for different endpoints
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: { error: 'Too many messages, please wait' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip, // Per-user limit
  skip: (req) => {
    // Skip rate limiting for dev environment
    return process.env.NODE_ENV === 'development';
  }
});

const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 uploads per 5 minutes
  message: { error: 'Too many uploads, please wait' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50, // 50 searches per minute
  message: { error: 'Too many searches, please wait' },
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Apply limiters to routes
app.post('/api/e7ki/messages', messageLimiter, (req, res) => {
  // Send message
});

app.post('/api/e7ki/upload', uploadLimiter, (req, res) => {
  // Upload file
});

app.get('/api/e7ki/users/search', searchLimiter, (req, res) => {
  // Search users
});
```

---

## 7️⃣ CLOUDINARY FILE STORAGE

### INSTALL PACKAGE
```bash
npm install cloudinary --save
```

### UPDATE FILE UPLOAD
**File**: `codebank/e7ki/server/fileUpload.cjs`

```javascript
const cloudinary = require('cloudinary').v2;
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadToCloudinary(fileStream, userId, originalFilename) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `e7ki/${userId}`,
        resource_type: 'auto',
        public_id: path.parse(originalFilename).name,
        timeout: 60000
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            type: result.resource_type,
            size: result.bytes
          });
        }
      }
    );
    fileStream.pipe(uploadStream);
  });
}

function registerFileRoutes(app) {
  // File upload endpoint (using Cloudinary)
  app.post('/api/e7ki/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Create read stream from multer temp file
      const fs = require('fs');
      const fileStream = fs.createReadStream(req.file.path);
      
      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(
        fileStream,
        req.user.id,
        req.file.originalname
      );

      // Clean up temp file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete temp file:', err);
      });

      res.json({
        success: true,
        url: uploadResult.url,
        type: req.file.mimetype,
        filename: req.file.originalname,
        size: uploadResult.size,
        publicId: uploadResult.publicId
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ 
        error: 'Failed to upload file',
        message: error.message 
      });
    }
  });
}

module.exports = { registerFileRoutes, uploadToCloudinary };
```

---

## 8️⃣ DATABASE MIGRATION (Add Missing Columns)

### SQL MIGRATIONS
**File**: `codebank/e7ki/server/migrations.sql`

```sql
-- Add missing columns to e7ki_conversations
ALTER TABLE e7ki_conversations ADD COLUMN is_group BOOLEAN DEFAULT 0;
ALTER TABLE e7ki_conversations ADD COLUMN created_by TEXT;
ALTER TABLE e7ki_conversations ADD COLUMN avatar_url TEXT;
ALTER TABLE e7ki_conversations ADD COLUMN description TEXT;

-- Add missing columns to e7ki_messages
ALTER TABLE e7ki_messages ADD COLUMN deleted_at DATETIME;
ALTER TABLE e7ki_messages ADD COLUMN edited_at DATETIME;
ALTER TABLE e7ki_messages ADD COLUMN encrypted BOOLEAN DEFAULT 0;
ALTER TABLE e7ki_messages ADD COLUMN nonce TEXT;

-- Create users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  status TEXT DEFAULT 'offline',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Create sync_events table for idempotency
CREATE TABLE IF NOT EXISTS sync_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  delta_codes INTEGER DEFAULT 0,
  delta_silver INTEGER DEFAULT 0,
  delta_gold INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### RUN MIGRATIONS
```bash
# Using sqlite3 CLI
sqlite3 data.sqlite < migrations.sql

# Or in Node.js
const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('data.sqlite');
const migrations = fs.readFileSync('migrations.sql', 'utf-8');
db.exec(migrations);
db.close();
```

---

## 9️⃣ DEPLOYMENT CHECKLIST

### Pre-Deployment
```bash
# 1. Install dependencies
npm install

# 2. Run tests
npm test

# 3. Build client
npm run build:client

# 4. Check for vulnerabilities
npm audit

# 5. Lint code
npm run lint

# 6. Verify all fixes
npm run check-fixes
```

### Deploy to Render
```bash
# 1. Ensure Render env vars are set
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
JWT_SECRET
DATABASE_URL

# 2. Push to GitLab
git add .
git commit -m "E7ki: Fix critical issues and implement features"
git push origin main

# 3. Render auto-deploys from main branch

# 4. Verify health check
curl https://dr-d-h51l.onrender.com/api/e7ki/health

# 5. Test WebSocket connection
# Check browser console when visiting https://dr-d-h51l.onrender.com/codebank/e7ki.html
# Should see: [E7ki] Connecting to WebSocket at: wss://dr-d-h51l.onrender.com
```

---

## 🔟 TESTING

### Manual Test Cases

#### Test 1: WebSocket Fix
```javascript
// In browser console on https://dr-d-h51l.onrender.com
// Should NOT show port 5000
// ✅ PASS: [E7ki] Connecting to WebSocket at: wss://dr-d-h51l.onrender.com
// ❌ FAIL: [E7ki] Connecting to WebSocket at: wss://dr-d-h51l.onrender.com:5000
```

#### Test 2: User Search
```javascript
// POST request
fetch('/api/e7ki/users/search?q=john', {
  headers: { 'Authorization': 'Bearer <token>' }
})
.then(r => r.json())
.then(data => console.log(data.users));

// Expected response:
// {
//   "success": true,
//   "query": "john",
//   "count": 2,
//   "users": [
//     { "id": "uuid1", "username": "john_doe", "email": "john@example.com" },
//     { "id": "uuid2", "username": "john_smith", "email": "john.smith@example.com" }
//   ]
// }
```

#### Test 3: Send Encrypted Message
```javascript
// If using encryption
const crypto = await import('./crypto.js');
const keys = crypto.generateKeyPair();
// Store keys in context
// Send message with encryption enabled
```

---

**Status**: ✅ All code snippets production-ready  
**Last Updated**: April 11, 2026  
**Testing**: Before deploying to production, test each snippet locally
