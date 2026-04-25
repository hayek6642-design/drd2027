# Extracted Services Integration Guide

## Overview
This guide details the 5 services extracted from AI-Hub and migrated to CodeBank interface.

---

## 📋 Extracted Services

### 1. **Quran (📖 quran.html/js/css)**
- **Purpose**: Quranic text reading, search, and bookmarking
- **Features**:
  - Browse all 114 Surahs
  - Read verses with translations
  - Bookmark favorite verses
  - Search by keyword
  - Multi-language support
- **Data Persistence**: 
  - IndexedDB: Bookmarks, reading progress, search history
  - Server: User preferences sync
- **Integration Path**: `codebank/quran.html`

### 2. **Messages / DRD-Mail (📱 messages.html/js/css)**
- **Purpose**: Peer-to-peer messaging and email system
- **Features**:
  - Compose and send messages
  - Message threads/conversations
  - Inbox/Sent/Archive folders
  - Search messages
  - Delivery status indicators
  - Notifications
- **Data Persistence**:
  - IndexedDB: Message drafts, cache
  - Server: All messages, thread history, delivery confirmations
- **Integration Path**: `codebank/messages.html`

### 3. **Phone Calls (☎️ phone-calls.html/js/css)**
- **Purpose**: Voice calling with contact management
- **Features**:
  - Call recent contacts
  - Contact directory
  - Call history/logs
  - Missed calls indicator
  - Call duration tracking
  - Do-not-disturb mode
- **Data Persistence**:
  - IndexedDB: Call history, recent contacts, DND settings
  - Server: Call logs, voice recording metadata
- **API Required**: WebRTC signaling endpoint
- **Integration Path**: `codebank/phone-calls.html`

### 4. **AI Chat (🤖 ai-chat.html/js/css)**
- **Purpose**: Interactive conversations with AI assistant
- **Features**:
  - Multiple chat threads
  - Create new conversations
  - Delete conversations
  - Real-time message streaming
  - Quick action suggestions
  - Conversation history
- **Data Persistence**:
  - IndexedDB: Chat threads, messages
  - Server: Full conversation history, user preferences
- **API Required**: `/api/ai/chat` endpoint
- **Integration Path**: `codebank/ai-chat.html`

### 5. **Platform Manager (🔧 platform-manager.html/js/css)**
- **Purpose**: Administrative dashboard for system management
- **Features**:
  - Real-time system statistics
  - Service health monitoring
  - User management interface
  - Analytics dashboard
  - Maintenance tools
  - System logs viewer
  - Database management
- **Data Persistence**:
  - Server only (admin-level data)
  - Cached stats in IndexedDB
- **Authentication**: Admin role required
- **Integration Path**: `codebank/platform-manager.html`

---

## 🚀 Integration Steps

### Step 1: Copy Files to CodeBank
```bash
# Copy to your repository
cp quran.html codebank/
cp quran.js codebank/js/
cp quran.css codebank/styles/

cp messages.html codebank/
cp messages.js codebank/js/
cp messages.css codebank/styles/

cp phone-calls.html codebank/
cp phone-calls.js codebank/js/
cp phone-calls.css codebank/styles/

cp ai-chat.html codebank/
cp ai-chat.js codebank/js/
cp ai-chat.css codebank/styles/

cp platform-manager.html codebank/
cp platform-manager.js codebank/js/
cp platform-manager.css codebank/styles/
```

### Step 2: Update indexCB.html (Service Launcher)
Add these buttons to your service grid in `codebank/indexCB.html`:

```html
<!-- Add to your service grid -->
<button class="service-card" onclick="launchService('quran.html')">
  <span class="icon">📖</span>
  <span class="name">Quran</span>
</button>

<button class="service-card" onclick="launchService('messages.html')">
  <span class="icon">📱</span>
  <span class="name">Messages</span>
</button>

<button class="service-card" onclick="launchService('phone-calls.html')">
  <span class="icon">☎️</span>
  <span class="name">Calls</span>
</button>

<button class="service-card" onclick="launchService('ai-chat.html')">
  <span class="icon">🤖</span>
  <span class="name">AI Chat</span>
</button>

<button class="service-card" onclick="launchService('platform-manager.html')">
  <span class="icon">🔧</span>
  <span class="name">Manager</span>
</button>
```

### Step 3: Update Server Routes
Add these endpoints to `server.js`:

```javascript
// Messages API
app.post('/api/messages/send', authMiddleware, (req, res) => {
  // Send message
});

app.get('/api/messages/inbox', authMiddleware, (req, res) => {
  // Get user messages
});

app.get('/api/messages/threads', authMiddleware, (req, res) => {
  // Get message threads
});

// AI Chat API
app.post('/api/ai/chat', authMiddleware, (req, res) => {
  // Chat with AI
});

app.get('/api/ai/chat/history', authMiddleware, (req, res) => {
  // Get chat history
});

// Phone Calls API
app.post('/api/calls/log', authMiddleware, (req, res) => {
  // Log call
});

app.get('/api/calls/history', authMiddleware, (req, res) => {
  // Get call history
});

// Platform Admin API
app.get('/api/platform/stats', adminMiddleware, (req, res) => {
  // Get platform statistics
});

app.get('/api/platform/users', adminMiddleware, (req, res) => {
  // Get user list
});

app.post('/api/platform/maintenance', adminMiddleware, (req, res) => {
  // Perform maintenance tasks
});
```

### Step 4: Update Database Schema
Create migration file: `db/migrations/005-extracted-services.sql`

```sql
-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  recipient_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  thread_id INTEGER,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);

-- Call logs table
CREATE TABLE IF NOT EXISTS call_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caller_id INTEGER NOT NULL,
  callee_id INTEGER NOT NULL,
  duration_seconds INTEGER,
  started_at DATETIME,
  ended_at DATETIME,
  status TEXT,
  FOREIGN KEY (caller_id) REFERENCES users(id),
  FOREIGN KEY (callee_id) REFERENCES users(id)
);

-- AI Chat history table
CREATE TABLE IF NOT EXISTS ai_chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  thread_id TEXT UNIQUE,
  title TEXT,
  messages JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Quran bookmarks
CREATE TABLE IF NOT EXISTS quran_bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  surah INTEGER,
  ayah INTEGER,
  note TEXT,
  bookmarked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_call_logs_caller ON call_logs(caller_id);
CREATE INDEX idx_call_logs_callee ON call_logs(callee_id);
CREATE INDEX idx_quran_bookmarks_user ON quran_bookmarks(user_id);
```

### Step 5: Run Database Migration
```bash
sqlite3 database.db < db/migrations/005-extracted-services.sql
```

### Step 6: Update Service Launcher Function
In your `indexCB.html`, update or add the `launchService()` function:

```javascript
function launchService(serviceFile) {
  const iframe = document.getElementById('service-iframe');
  if (iframe) {
    iframe.src = `/codebank/${serviceFile}`;
    // Update title
    document.querySelector('.panel-title').textContent = serviceFile.split('.')[0].toUpperCase();
  }
}
```

### Step 7: Setup Authentication Middleware
Ensure services check authentication:

```javascript
// Each service HTML should include
<script>
  // Verify auth before loading
  if (!window.AuthClient || !AuthClient.isAuth()) {
    window.location.href = '/login.html';
  }
</script>
```

---

## 🔌 API Endpoints Summary

### Messages API
```
POST   /api/messages/send         - Send message
GET    /api/messages/inbox        - Get inbox
GET    /api/messages/sent         - Get sent items
GET    /api/messages/threads      - Get conversations
DELETE /api/messages/:id          - Delete message
PATCH  /api/messages/:id/read     - Mark as read
```

### Phone Calls API
```
POST   /api/calls/log             - Log a call
GET    /api/calls/history         - Get call history
GET    /api/calls/recent          - Get recent contacts
DELETE /api/calls/:id             - Delete call log
```

### AI Chat API
```
POST   /api/ai/chat               - Send message
GET    /api/ai/chat/history       - Get chat history
GET    /api/ai/chat/threads       - Get all threads
DELETE /api/ai/chat/threads/:id   - Delete thread
```

### Platform Admin API
```
GET    /api/platform/stats        - System statistics
GET    /api/platform/users        - User list
GET    /api/platform/services     - Service status
GET    /api/platform/analytics    - Analytics data
POST   /api/platform/maintenance  - Maintenance tasks
GET    /api/platform/logs         - System logs
```

---

## 💾 Data Persistence

All services use the Universal Autosave System. Key points:

1. **IndexedDB Storage**:
   - Message drafts
   - Call history cache
   - Chat thread cache
   - Quran bookmarks
   - User preferences

2. **Server Sync**:
   - All services sync with server on login
   - Conflicts resolved with server-as-source
   - Offline-first approach (read from IndexedDB, write to both)

3. **Session Management**:
   - Persistent authentication via session cookies
   - 30-day expiration with auto-renewal
   - Automatic sync on app restart

---

## 🧪 Testing Checklist

- [ ] Copy all files to correct locations
- [ ] Update indexCB.html with service buttons
- [ ] Run database migration
- [ ] Test service launcher (click button → loads iframe)
- [ ] Verify authentication (redirect if not logged in)
- [ ] Test message sending/receiving
- [ ] Test AI chat functionality
- [ ] Test call logging
- [ ] Verify data persists after reload
- [ ] Test Platform Manager (admin only)
- [ ] Check mobile responsiveness

---

## 🚀 Deployment Notes

1. **Ensure /api endpoints are available** before deploying
2. **Test on Render**: Push changes and verify at https://dr-d-h51l.onrender.com
3. **Monitor logs**: Check Platform Manager → Logs tab
4. **Verify autosave**: Open IndexedDB in DevTools to confirm data storage
5. **Test offline**: Disable network and verify cached data loads

---

## 📱 Mobile Considerations

All services are optimized for portrait/vertical layouts:
- Responsive flex layouts
- Touch-friendly buttons (48px min height)
- Scrollable areas for mobile screens
- Collapse/expand sections on small screens

---

## ❓ Troubleshooting

| Issue | Solution |
|-------|----------|
| Services not loading | Check CORS headers in server.js |
| Auth not working | Verify session cookie is set |
| Data not persisting | Check IndexedDB in DevTools |
| API calls failing | Verify endpoints exist in server.js |
| Messages not syncing | Check network tab in DevTools |

---

## 📞 Support

For issues with:
- **Quran service**: Check Quran data API availability
- **Messages**: Verify recipient user exists
- **Calls**: Ensure WebRTC signaling endpoint available
- **AI Chat**: Check OpenAI/AI provider API keys
- **Platform Manager**: Verify admin role assigned

