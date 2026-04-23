# E7ki Service - Complete Architecture & Development Guide

**Repository**: https://gitlab.com/dia201244/drd2027  
**Codebase Path**: `codebank/e7ki`  
**Platform**: CodeBank IndexedDB (indexCB.html)  
**Service Type**: WhatsApp-like Messenger Application  
**Stack**: Node.js + React + WebSocket + SQLite

---

## 1. SERVICE ARCHITECTURE OVERVIEW

E7ki is a real-time, end-to-end encrypted messaging service embedded within the CodeBank platform. It mimics WhatsApp's core functionality but is fully integrated with the DR.D ecosystem.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser / Client                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  E7ki React App (client/src/)                           ││
│  │  ├─ Pages: Chat, Login                                  ││
│  │  ├─ Components: ConversationView, MessageBubble, etc    ││
│  │  ├─ Contexts: AuthContext, ChatContext, WebSocketCtx   ││
│  │  └─ Lib: auth-context, chat-context, websocket-context ││
│  └─────────────────────────────────────────────────────────┘│
│                           ↓ WebSocket (ws/wss)              │
│                           ↓ HTTP (REST API)                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Server-Side (Node.js)                       │
│  ┌──────────────────────────────────────────────────────────┤
│  │ Main Server (codebank/e7ki/server/index.cjs)            │
│  │ ├─ Express + Socket.IO                                   │
│  │ ├─ Authentication Middleware (auth-middleware.cjs)      │
│  │ ├─ WebSocket Handler (routes.js)                        │
│  │ └─ Database Layer (database.cjs - SQLite/better-sqlite3)│
│  └──────────────────────────────────────────────────────────┘
│
│  ┌──────────────────────────────────────────────────────────┤
│  │ Data Layer                                               │
│  │ ├─ e7ki_conversations (chat rooms/threads)              │
│  │ ├─ e7ki_messages (message content, metadata)            │
│  │ ├─ e7ki_reactions (emoji reactions on messages)         │
│  │ └─ e7ki_media (media files: images, audio, video)       │
│  └──────────────────────────────────────────────────────────┘
│
│  ┌──────────────────────────────────────────────────────────┤
│  │ File Storage                                             │
│  │ └─ /uploads/e7ki/{userId}/ (multer-managed)             │
│  └──────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│             CodeBank Parent Platform                         │
│  ├─ indexCB.html (sidebar, window integration)              │
│  ├─ auth-proxy.js (window.Auth global injection)           │
│  └─ Global window.Auth object (shared auth state)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. CLIENT-SIDE IMPLEMENTATION

### 2.1 Authentication Flow

**File**: `client/src/lib/auth-context.jsx`

1. **Post-Message Protocol**: E7ki requests auth from parent CodeBank via `window.parent.postMessage({ type: 'e7ki:request-auth' })`

2. **window.Auth Injection**: CodeBank injects `window.Auth` object with:
   - `isAuthenticated()` → boolean
   - `getUser()` → { id, username, email }
   - `getToken()` → JWT token (Bearer)

3. **Fallback Mechanism**:
   - Check `window.Auth` first (immediate if already injected by auth-proxy.js)
   - Fall back to postMessage if not available
   - Fall back to localStorage for dev mode
   - 10-second timeout before showing error

4. **Token Storage**:
   ```javascript
   localStorage.setItem('jwt_token', userData.token);
   // Token format: JWT with userId/sub claim
   ```

### 2.2 React Contexts & State Management

**Key Files**:
- `client/src/lib/auth-context.jsx` - User authentication & JWT
- `client/src/lib/websocket-context.jsx` - WebSocket connection & real-time events
- `client/src/lib/chat-context.jsx` - Chat list, messages, and message operations
- `client/src/lib/indexeddb.js` - Local IndexedDB persistence

**Chat Context Features**:
- `chats` - Array of conversation objects
- `activeChat` - Currently selected conversation
- `messages` - Messages in active chat
- `setTyping()` - Send typing indicator
- `sendMessage(chatId, content, type)` - Post message
- `createNewChat(participant)` - Start 1:1 conversation
- `markAsRead(messageId)` - Mark as read

### 2.3 WebSocket Context

**File**: `client/src/lib/websocket-context.jsx`

**Connection**:
```javascript
const wsUrl = `${protocol}//${host}:5000`; // Note: hardcoded port 5000!
const socket = io(wsUrl, {
  path: '/ws',
  auth: { token: user.token },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10
});
```

⚠️ **ISSUE**: Port 5000 is hardcoded. On Render with custom domain, this should use the same host without specifying port.

**Event Types**:
- `new-message` - Incoming message
- `user-presence` - User online/offline status
- `user-typing` - Typing indicator
- `message-read` - Read receipt

### 2.4 Key UI Components

| Component | File | Purpose |
|-----------|------|---------|
| **ConversationView** | `components/chat/conversation-view.jsx` | Main chat window |
| **MessageBubble** | `components/chat/message-bubble.jsx` | Individual message display |
| **MessageInput** | `components/chat/message-input.jsx` | Text input + send |
| **ChatList** | `components/chat/chat-list.jsx` | Conversation list sidebar |
| **NewChatDialog** | `components/chat/new-chat-dialog.jsx` | Create new chat modal |
| **VoiceRecorder** | `components/chat/voice-recorder.jsx` | Audio recording widget |

---

## 3. SERVER-SIDE IMPLEMENTATION

### 3.1 Server Initialization

**File**: `server/index.cjs`

```javascript
// Server runs on process.env.PORT (default 3001)
const PORT = process.env.PORT || 3001;

// Express + Socket.IO setup
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", credentials: true },
  path: '/ws'
});
```

**Database Configuration**:
```javascript
// Uses better-sqlite3
const dbPath = path.join(__dirname, '../../../data.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');  // Write-Ahead Logging for concurrency
db.pragma('foreign_keys = ON');    // Enforce referential integrity
```

### 3.2 Authentication Middleware

**File**: `server/auth-middleware.cjs`

```javascript
// JWT verification
const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-demo');
// Sets req.user = { userId, email, ...decoded }
```

### 3.3 Database Schema

**File**: `server/database.cjs`

#### Table: `e7ki_conversations`
```sql
CREATE TABLE e7ki_conversations (
  id TEXT PRIMARY KEY,
  participant_ids TEXT NOT NULL,      -- JSON array of user IDs
  title TEXT DEFAULT 'Untitled Chat',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_conversations_updated ON e7ki_conversations(updated_at DESC);
```

#### Table: `e7ki_messages`
```sql
CREATE TABLE e7ki_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,              -- Foreign key to conversations
  sender_id TEXT NOT NULL,
  sender_username TEXT,               -- Display name
  content TEXT,
  type TEXT DEFAULT 'text',           -- 'text', 'image', 'voice', 'video'
  media_url TEXT,                     -- URL to uploaded file
  status TEXT DEFAULT 'sent',         -- 'sent', 'delivered', 'read'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES e7ki_conversations(id)
);
CREATE INDEX idx_messages_chat ON e7ki_messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_sender ON e7ki_messages(sender_id);
```

#### Table: `e7ki_reactions`
```sql
CREATE TABLE e7ki_reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reaction TEXT NOT NULL,             -- Emoji like '👍', '❤️'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES e7ki_messages(id) ON DELETE CASCADE,
  UNIQUE(message_id, user_id, reaction)
);
```

#### Table: `e7ki_media`
```sql
CREATE TABLE e7ki_media (
  id TEXT PRIMARY KEY,
  message_id TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT,                     -- MIME type
  file_size INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES e7ki_messages(id) ON DELETE SET NULL
);
```

### 3.4 WebSocket Routes

**File**: `server/routes.js`

**Event Handlers**:

| Event | Payload | Purpose |
|-------|---------|---------|
| `init` | `{ userId, token }` | Client registration |
| `message` | `{ senderId, chatId, content, type }` | Send message |
| `typing` | `{ userId, chatId, isTyping }` | Typing indicator |
| `read` | `{ messageId, userId }` | Mark as read |
| `reaction` | `{ messageId, userId, emoji }` | React to message |
| `presence` | `{ userId, status }` | Online/offline |
| `delete` | `{ messageId }` | Delete message |

**Message Flow**:
1. Client sends event via socket.emit()
2. Server validates user in participants
3. Server broadcasts to all connected clients (except sender)
4. Persists to database (except typing/presence)

### 3.5 HTTP API Endpoints

**Base**: `/api/e7ki/`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Service health check |
| GET | `/chats` | List conversations for user |
| GET | `/messages?chat_id=X` | Get messages in conversation |
| POST | `/messages` | Send message (HTTP fallback) |
| POST | `/upload` | Upload media file (multipart) |
| POST | `/typing` | Typing indicator (HTTP) |
| GET | `/users` | List users for new chat dialog |

### 3.6 File Upload Handling

**File**: `server/fileUpload.cjs`

```javascript
const uploadsDir = path.join(process.cwd(), 'uploads', 'e7ki');
// Structure: /uploads/e7ki/{userId}/{filename}

const upload = multer({
  storage: diskStorage({
    destination: (req, file, cb) => {
      const userDir = path.join(uploadsDir, req.user?.id || 'anonymous');
      fs.mkdirSync(userDir, { recursive: true });
      cb(null, userDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 },  // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/webm', 'audio/ogg', 'image/jpeg', 'image/png', 'video/mp4'];
    cb(null, allowed.includes(file.mimetype));
  }
});
```

---

## 4. INTEGRATION WITH CODEBANK PLATFORM

### 4.1 CodeBank Sidebar Integration

**File**: `codebank/indexCB.html`

E7ki should be added to the CodeBank service sidebar. The sidebar entry would look like:

```html
<a href="/codebank/e7ki.html" class="service-link" data-service="e7ki">
  <icon class="message-icon">💬</icon>
  <span>E7ki Messenger</span>
  <badge class="unread-count" id="e7ki-unread">0</badge>
</a>
```

### 4.2 Authentication Proxy

**File**: CodeBank's `auth-proxy.js`

The main platform should inject `window.Auth` into E7ki's iframe/window:

```javascript
// In CodeBank's authentication system
window.Auth = {
  isAuthenticated: () => !!currentUser && !!currentToken,
  getUser: () => ({
    id: currentUser.id,
    username: currentUser.username,
    email: currentUser.email
  }),
  getToken: () => currentToken,
  logout: () => { /* handle logout */ }
};

// Post message to E7ki window
e7kiWindow.postMessage({
  type: 'e7ki:auth',
  auth: {
    userId: currentUser.id,
    username: currentUser.username,
    email: currentUser.email,
    token: jwtToken
  }
}, '*');
```

### 4.3 Iframe/Embed Approach

E7ki can be embedded in CodeBank via iframe:

```html
<!-- In CodeBank's main app -->
<iframe 
  id="e7ki-frame"
  src="/codebank/e7ki.html"
  allow="microphone; camera"
  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
></iframe>
```

**Cross-window communication**:
- E7ki requests auth via postMessage
- CodeBank responds with auth event
- E7ki stores in context and localStorage as fallback
- On page refresh, retrieves from localStorage or re-requests

---

## 5. MISSING/TODO COMPONENTS

### 5.1 Critical Missing Features

| Feature | Status | Impact | Priority |
|---------|--------|--------|----------|
| **User Search API** | ❌ Missing | Can't find users to start chat | 🔴 HIGH |
| **Group Chat Support** | ❌ Not Implemented | Only 1:1 conversations | 🔴 HIGH |
| **Message Encryption** | ❌ Missing | No E2E encryption | 🔴 HIGH |
| **Read Receipts** | ✅ API ready | Display in UI needed | 🟡 MEDIUM |
| **Typing Indicators** | ✅ API ready | Display in UI needed | 🟡 MEDIUM |
| **Message Reactions** | ✅ API ready | UI component missing | 🟡 MEDIUM |
| **Message Search** | ❌ Missing | Can't find old messages | 🟡 MEDIUM |
| **Profile Management** | ❌ Missing | No user profile view | 🟡 MEDIUM |
| **Settings/Preferences** | ❌ Missing | No dark mode, notifications, etc | 🟢 LOW |

### 5.2 Implementation Checklist

#### **Backend (Server)**

- [ ] **User Search Endpoint**
  ```javascript
  GET /api/e7ki/users/search?q={query}
  // Returns: { id, username, email, avatar }
  ```

- [ ] **Group Chat Creation**
  ```javascript
  POST /api/e7ki/chats
  // Body: { participantIds: [...], title: "Group Name" }
  // Returns: { id, participant_ids, title }
  ```

- [ ] **Message Encryption Layer**
  - Implement TweetNaCl.js or libsodium.js
  - Encrypt message.content before storage
  - Share keys via key exchange

- [ ] **Message Search**
  ```javascript
  GET /api/e7ki/messages/search?q={query}&chatId={id}
  // FTS (Full-Text Search) on e7ki_messages.content
  ```

- [ ] **User Profiles**
  ```javascript
  GET /api/e7ki/users/{userId}
  POST /api/e7ki/users/{userId}/profile (update)
  // Fields: avatar, bio, status, lastSeen
  ```

- [ ] **Message Deletion**
  ```javascript
  DELETE /api/e7ki/messages/{messageId}
  // Soft delete: mark deleted_at, hide in client
  ```

#### **Frontend (React)**

- [ ] **User Search Component**
  - Debounced input field
  - Display avatars + usernames
  - Click to create/open chat

- [ ] **Group Chat Dialog**
  - Multi-select participants
  - Name input
  - Create button

- [ ] **Message Encryption UI**
  - Lock icon for encrypted messages
  - Key exchange dialog

- [ ] **Read Receipts UI**
  - Single checkmark: sent
  - Double checkmark: delivered
  - Blue double checkmark: read

- [ ] **Typing Indicator UI**
  - "User is typing..." text
  - Animated dots

- [ ] **Emoji Reactions**
  - Right-click/long-press on message
  - Emoji picker
  - Reaction count badges

- [ ] **Settings Page**
  - Notification preferences
  - Theme toggle
  - Privacy settings

#### **Testing**

- [ ] **Unit Tests**
  - Auth context
  - Chat context
  - API endpoints

- [ ] **Integration Tests**
  - End-to-end message flow
  - User search → chat creation → message send
  - WebSocket reconnection

- [ ] **Performance Tests**
  - Load 1000+ messages
  - Handle 100+ simultaneous users
  - Large file uploads (50MB)

---

## 6. DEPLOYMENT & CONFIGURATION

### 6.1 Environment Variables

```bash
# Server
PORT=3001                           # Express server port
JWT_SECRET=your-secret-key          # JWT signing key
DATABASE_URL=sqlite:///data.sqlite  # Database path
FIREBASE_ENABLED=false              # (Not needed for E7ki)

# Client (Build time)
VITE_API_BASE=/api/e7ki            # API base URL
VITE_WS_PORT=5000                  # WebSocket port (⚠️ ISSUE!)
```

### 6.2 Render Deployment

**Render Service Configuration**:

```yaml
services:
  - name: e7ki-server
    runtime: node
    buildCommand: npm install
    startCommand: node server/index.cjs
    envVars:
      - PORT=3001
      - JWT_SECRET=$JWT_SECRET
    healthCheckPath: /api/e7ki/health
```

**Known Issues**:
1. ⚠️ Port 5000 hardcoded in WebSocket context - should be dynamically resolved
2. ⚠️ CORS must allow CodeBank origin
3. ⚠️ File uploads to `/uploads/e7ki/` may not persist on Render (use S3/Cloudinary)

### 6.3 File Storage for Production

**Current**: Multer to local filesystem (ephemeral on Render)

**Recommended**: Cloudinary or AWS S3

```javascript
// Use cloudinary package
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload via Cloudinary
const result = await cloudinary.uploader.upload(fileStream, {
  folder: `e7ki/${userId}`,
  resource_type: 'auto'
});
const mediaUrl = result.secure_url;
```

---

## 7. SECURITY CONSIDERATIONS

### 7.1 Authentication & Authorization

✅ **Implemented**:
- JWT-based auth
- Session token validation
- User isolation (can't access others' chats)

⚠️ **To Review**:
- Token expiration (should be short-lived)
- Refresh token mechanism
- Password reset flow

### 7.2 Data Privacy

❌ **Missing**:
- Message encryption (currently plain text in DB)
- User data encryption at rest
- GDPR compliance (data deletion)

### 7.3 Input Validation

⚠️ **Current State**:
- Minimal validation on message content
- No XSS protection (messages rendered as text for now)
- Need sanitization for HTML content

### 7.4 Rate Limiting

❌ **Missing**:
- Prevent spam messages
- Limit file uploads per user
- Prevent brute force on user search

**Recommendation**: Use `express-rate-limit`

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100                     // 100 requests per window
});

app.use('/api/e7ki/', limiter);
```

---

## 8. KNOWN ISSUES & BUGS

### Issue #1: WebSocket Port Hardcoded to 5000
**File**: `client/src/lib/websocket-context.jsx` (line ~20)  
**Problem**: Port 5000 is hardcoded; breaks on custom domains  
**Fix**:
```javascript
// Replace:
const wsUrl = `${protocol}//${host}:5000`;
// With:
const wsUrl = `${protocol}//${host}`;
```

### Issue #2: Missing User Search Endpoint
**File**: `server/routes.js`  
**Problem**: `GET /api/e7ki/users` returns hardcoded data  
**Fix**: Query `users` table and return matching records

### Issue #3: No Group Chat Support
**Status**: Partially ready (DB supports `is_group` flag)  
**Fix**: Implement group chat creation and UI

### Issue #4: File Uploads Not Persistent on Render
**File**: `server/fileUpload.cjs`  
**Problem**: Multer stores in `/uploads/e7ki/` (ephemeral)  
**Fix**: Use Cloudinary or similar CDN

### Issue #5: No Message Encryption
**Status**: Critical security gap  
**Fix**: Implement TweetNaCl.js-based E2E encryption

---

## 9. QUICK START GUIDE

### Development

```bash
# Clone repo
git clone https://gitlab.com/dia201244/drd2027.git
cd drd2027/codebank/e7ki

# Install dependencies
npm install

# Run server
npm run dev

# Run client (Vite dev server)
npm run dev:client

# Access at http://localhost:5173 (client)
# Server runs on http://localhost:3001
```

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Deployment

```bash
# Build client
npm run build:client

# Push to Render
git push origin main  # Render auto-deploys
```

---

## 10. REFERENCES & ADDITIONAL RESOURCES

- **WebSocket Protocol**: https://socket.io/docs/
- **Better-SQLite3**: https://github.com/WiseLibs/better-sqlite3
- **React Context API**: https://react.dev/reference/react/useContext
- **JWT**: https://jwt.io/
- **TweetNaCl.js**: https://tweetnacl.js.org/

---

**Last Updated**: April 2026  
**E7ki Service Status**: ⚠️ Beta (Feature-incomplete, needs security review)
