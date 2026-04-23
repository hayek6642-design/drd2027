# E7ki Messenger - Development & Audit Checklist

**Service**: E7ki (WhatsApp-like messenger in CodeBank)  
**Repository**: https://gitlab.com/dia201244/drd2027  
**Path**: `codebank/e7ki/`  
**Deployed**: https://dr-d-h51l.onrender.com  

---

## PHASE 1: CRITICAL FIXES (MUST COMPLETE)

### 1.1 WebSocket Connection Fix
- [ ] **Issue**: Port 5000 hardcoded in `websocket-context.jsx`
  - **File**: `client/src/lib/websocket-context.jsx` (~line 20)
  - **Current**:
    ```javascript
    const wsUrl = `${protocol}//${host}:5000`;
    ```
  - **Fix**:
    ```javascript
    // Use same host without port (browser will infer)
    const wsUrl = `${protocol}//${host}`;
    ```
  - **Test**: Verify WebSocket connects on Render domain
  - **Status**: ⏳ TO DO

### 1.2 Authentication Flow Verification
- [ ] **Verify Auth Context Gets Token**
  - Console.log the token received in `auth-context.jsx` useEffect
  - Check localStorage has `jwt_token` key
  - **Expected**: Token should be JWT with userId claim
  - **File**: `client/src/lib/auth-context.jsx`
  - **Status**: ⏳ TO DO

- [ ] **Verify Server JWT Validation**
  - Check `server/auth-middleware.cjs` validates token correctly
  - Ensure `process.env.JWT_SECRET` matches client signing key
  - **Expected**: `req.user.id` available in all protected routes
  - **Status**: ⏳ TO DO

### 1.3 CodeBank Integration
- [ ] **Add E7ki to CodeBank Sidebar**
  - **File**: `codebank/indexCB.html`
  - **Action**: Add link to E7ki in service menu
  - **HTML**:
    ```html
    <a href="/codebank/e7ki.html" class="service-link e7ki-link">
      <span class="icon">💬</span>
      <span class="label">E7ki</span>
      <span class="badge unread" id="e7ki-unread-badge" style="display:none">0</span>
    </a>
    ```
  - **Status**: ⏳ TO DO

- [ ] **Create E7ki.html Entry Point**
  - **File**: `codebank/e7ki.html`
  - **Purpose**: Bootstrap React app with proper auth flow
  - **Content**:
    ```html
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>E7ki - Messenger</title>
    </head>
    <body>
      <div id="e7ki-root"></div>
      <script type="module">
        import('./src/main.jsx').catch(e => {
          document.body.innerHTML = `<pre style="color:red">E7ki failed to load: ${e.message}</pre>`;
        });
      </script>
    </body>
    </html>
    ```
  - **Status**: ⏳ TO DO

- [ ] **Inject Auth into E7ki Window**
  - **File**: `server.js` or CodeBank's auth middleware
  - **Action**: When E7ki window loads, send postMessage with auth
  - **Code**:
    ```javascript
    const e7kiFrame = document.getElementById('e7ki-frame');
    e7kiFrame.onload = () => {
      e7kiFrame.contentWindow.postMessage({
        type: 'e7ki:auth',
        auth: {
          userId: currentUser.id,
          username: currentUser.username,
          email: currentUser.email,
          token: jwtToken
        }
      }, '*');
    };
    ```
  - **Status**: ⏳ TO DO

---

## PHASE 2: MISSING CORE FEATURES

### 2.1 User Search API
- [ ] **Create User Search Endpoint**
  - **Endpoint**: `GET /api/e7ki/users?search={query}`
  - **File**: Create new or update `server/routes.js`
  - **Database Query**:
    ```sql
    SELECT id, username, email FROM users 
    WHERE username LIKE ? OR email LIKE ?
    LIMIT 50
    ```
  - **Response**:
    ```json
    {
      "success": true,
      "users": [
        { "id": "uuid", "username": "john_doe", "email": "john@example.com", "avatar": null }
      ]
    }
    ```
  - **Status**: ⏳ TO DO

- [ ] **Update NewChatDialog to Use Search API**
  - **File**: `client/src/components/chat/new-chat-dialog.jsx`
  - **Current**: Fetches all users via `/api/e7ki/users`
  - **Fix**: 
    1. Add search input field
    2. Debounce query (500ms)
    3. Fetch from `/api/e7ki/users?search={query}`
  - **Status**: ⏳ TO DO

### 2.2 Group Chat Support
- [ ] **Update e7ki_conversations Table**
  - **File**: `server/database.cjs`
  - **Add Column**: `is_group BOOLEAN DEFAULT 0`
  - **Migration**:
    ```sql
    ALTER TABLE e7ki_conversations ADD COLUMN is_group BOOLEAN DEFAULT 0;
    ```
  - **Status**: ⏳ TO DO

- [ ] **Create Group Chat Endpoint**
  - **Endpoint**: `POST /api/e7ki/chats`
  - **Body**:
    ```json
    {
      "participantIds": ["user1", "user2", "user3"],
      "title": "Team Meeting",
      "isGroup": true
    }
    ```
  - **Implementation**:
    ```javascript
    app.post('/api/e7ki/chats', requireAuth, (req, res) => {
      const { participantIds, title, isGroup } = req.body;
      const userId = req.user.id;
      
      // Add current user to participants
      const allParticipants = [userId, ...participantIds];
      
      // Create conversation
      const chatId = e7kiDatabase.createConversation(
        allParticipants,
        title || 'Group Chat',
        isGroup || false
      );
      
      return res.json({ success: true, chatId });
    });
    ```
  - **Status**: ⏳ TO DO

- [ ] **Create Group Chat UI**
  - **File**: Create `client/src/components/chat/group-chat-dialog.jsx`
  - **Features**:
    - Multi-select participant picker
    - Group name input
    - Avatar/emoji selector
  - **Status**: ⏳ TO DO

### 2.3 Message Encryption (E2E)
- [ ] **Install TweetNaCl.js**
  ```bash
  npm install tweetnacl tweetnacl-util
  ```
  - **Status**: ⏳ TO DO

- [ ] **Create Encryption Utility**
  - **File**: Create `client/src/lib/crypto.js`
  - **Functions**:
    ```javascript
    export function generateKeyPair() {
      // Use nacl.box.keyPair()
    }
    
    export function encryptMessage(message, publicKey) {
      // Use nacl.box()
    }
    
    export function decryptMessage(ciphertext, privateKey, senderPublicKey) {
      // Use nacl.box.open()
    }
    ```
  - **Status**: ⏳ TO DO

- [ ] **Implement Key Exchange**
  - **Approach**: DH key exchange on chat creation
  - **Flow**:
    1. User A generates keypair
    2. User A sends public key to User B via `/api/e7ki/keys/exchange`
    3. User B generates keypair and stores User A's key
    4. Subsequent messages encrypted with shared key
  - **Status**: ⏳ TO DO

- [ ] **Update Message Encryption in sendMessage**
  - **File**: `client/src/lib/chat-context.jsx`
  - **Before**: Plaintext to server
  - **After**: Encrypt content before sending
  - **Status**: ⏳ TO DO

---

## PHASE 3: UX ENHANCEMENTS

### 3.1 Read Receipts UI
- [ ] **Display Read Status**
  - **File**: Update `client/src/components/chat/message-bubble.jsx`
  - **Add Checkmarks**:
    - ✓ = sent
    - ✓✓ = delivered
    - ✓✓ (blue) = read
  - **Implementation**:
    ```jsx
    <span className={`message-status ${message.status}`}>
      {message.status === 'sent' && '✓'}
      {message.status === 'delivered' && '✓✓'}
      {message.status === 'read' && <span style={{color: '#0084ff'}}>✓✓</span>}
    </span>
    ```
  - **Status**: ⏳ TO DO

### 3.2 Typing Indicators
- [ ] **Display "User is typing..."**
  - **File**: `client/src/components/chat/conversation-view.jsx`
  - **Listen to WebSocket Event**: `user-typing`
  - **Display Logic**:
    ```jsx
    {typingUsers[activeChat.id] && (
      <div className="typing-indicator">
        {typingUsers[activeChat.id]} is typing...
      </div>
    )}
    ```
  - **Status**: ⏳ TO DO

### 3.3 Emoji Reactions
- [ ] **Add Emoji Picker to Message**
  - **Install**: `npm install emoji-picker-react`
  - **File**: Update `client/src/components/chat/message-bubble.jsx`
  - **Show**: On right-click or hover menu
  - **Status**: ⏳ TO DO

- [ ] **Display Reaction Badges**
  - **File**: `client/src/components/chat/message-bubble.jsx`
  - **Show**: Below message content
  - **Count**: `[👍 5] [❤️ 3]` etc.
  - **Status**: ⏳ TO DO

### 3.4 Search Messages
- [ ] **Add Search Bar to Sidebar**
  - **File**: `client/src/components/chat/chat-list.jsx`
  - **Search**: Current chat messages
  - **Endpoint**: `GET /api/e7ki/messages/search?q={query}&chatId={id}`
  - **Status**: ⏳ TO DO

---

## PHASE 4: BACKEND IMPROVEMENTS

### 4.1 Message Deletion
- [ ] **Add Soft Delete**
  - **File**: `server/database.cjs`
  - **Add Column**: `deleted_at DATETIME`
  - **Update**: `e7ki_messages` table
  - **Status**: ⏳ TO DO

- [ ] **Delete Endpoint**
  - **Endpoint**: `DELETE /api/e7ki/messages/{messageId}`
  - **Logic**: Mark `deleted_at = now()` and hide in responses
  - **Status**: ⏳ TO DO

### 4.2 User Profiles
- [ ] **Create Users Table** (if not exists)
  - **Columns**: `id, username, email, avatar_url, bio, status, last_seen`
  - **Status**: ⏳ TO DO

- [ ] **Get User Profile**
  - **Endpoint**: `GET /api/e7ki/users/{userId}`
  - **Response**: User profile with avatar, bio
  - **Status**: ⏳ TO DO

- [ ] **Update User Profile**
  - **Endpoint**: `POST /api/e7ki/users/{userId}/profile`
  - **Fields**: `avatar, bio, status`
  - **Status**: ⏳ TO DO

### 4.3 Rate Limiting
- [ ] **Install express-rate-limit**
  ```bash
  npm install express-rate-limit
  ```
  - **Status**: ⏳ TO DO

- [ ] **Apply Rate Limits**
  - **File**: `server/index.cjs` or `server/routes.js`
  - **Limits**:
    - Message send: 10/min per user
    - File upload: 5/min per user
    - User search: 30/min per user
  - **Status**: ⏳ TO DO

### 4.4 Persistent File Storage
- [ ] **Integrate Cloudinary**
  - **Install**: `npm install cloudinary`
  - **Setup**: Set env vars
    ```
    CLOUDINARY_CLOUD_NAME=...
    CLOUDINARY_API_KEY=...
    CLOUDINARY_API_SECRET=...
    ```
  - **Status**: ⏳ TO DO

- [ ] **Update fileUpload.cjs**
  - **Replace**: Local multer with Cloudinary uploader
  - **Return**: `mediaUrl` from Cloudinary
  - **Status**: ⏳ TO DO

---

## PHASE 5: TESTING & QA

### 5.1 Unit Tests
- [ ] **Test Auth Context**
  - **File**: Create `client/src/lib/auth-context.test.jsx`
  - **Cases**: 
    - Auth from window.Auth
    - Auth from postMessage
    - Auth from localStorage
    - Token refresh
  - **Status**: ⏳ TO DO

- [ ] **Test Chat Context**
  - **File**: Create `client/src/lib/chat-context.test.jsx`
  - **Cases**: 
    - Create chat
    - Send message
    - Mark as read
  - **Status**: ⏳ TO DO

### 5.2 Integration Tests
- [ ] **Test Message Flow**
  - **Steps**:
    1. User A logs in
    2. User B logs in
    3. User A creates chat with User B
    4. User A sends message
    5. Verify User B receives message
    6. User B sends reply
    7. Verify delivery
  - **Tool**: Jest + Supertest for API, Cypress for E2E
  - **Status**: ⏳ TO DO

### 5.3 Performance Tests
- [ ] **Test Large Message Lists**
  - **Load**: 1000+ messages in single chat
  - **Measure**: Time to render, scroll performance
  - **Target**: < 2s initial render, smooth 60fps scroll
  - **Status**: ⏳ TO DO

- [ ] **Test Concurrent Users**
  - **Simulate**: 100+ users sending messages
  - **Measure**: Message latency, server CPU/RAM
  - **Target**: < 500ms latency, < 50% CPU
  - **Status**: ⏳ TO DO

### 5.4 Security Tests
- [ ] **Test CORS**
  - **Verify**: Only CodeBank origin can access
  - **Status**: ⏳ TO DO

- [ ] **Test XSS Prevention**
  - **Send**: Message with `<script>alert('xss')</script>`
  - **Verify**: Script doesn't execute
  - **Status**: ⏳ TO DO

- [ ] **Test SQL Injection**
  - **Send**: Chat title with `'; DROP TABLE users;--`
  - **Verify**: Properly escaped, no injection
  - **Status**: ⏳ TO DO

---

## PHASE 6: DEPLOYMENT & MONITORING

### 6.1 Environment Setup
- [ ] **Create .env File**
  ```
  PORT=3001
  JWT_SECRET=<generate-random-64-char-string>
  DATABASE_URL=sqlite:///data.sqlite
  CLOUDINARY_CLOUD_NAME=...
  CLOUDINARY_API_KEY=...
  CLOUDINARY_API_SECRET=...
  ```
  - **Status**: ⏳ TO DO

- [ ] **Update Render Config**
  - **File**: `render.yaml` or Render dashboard
  - **Build Command**: `npm install`
  - **Start Command**: `node server/index.cjs`
  - **Health Check**: `GET /api/e7ki/health`
  - **Status**: ⏳ TO DO

### 6.2 Logging & Monitoring
- [ ] **Setup Error Logging**
  - **Install**: `npm install winston` (or similar)
  - **Log**: API errors, WebSocket errors, DB errors
  - **File**: All errors to `logs/error.log`
  - **Status**: ⏳ TO DO

- [ ] **Setup Performance Monitoring**
  - **Tool**: New Relic, DataDog, or simple middleware
  - **Track**: API response times, WebSocket lag
  - **Alert**: If > 1s latency
  - **Status**: ⏳ TO DO

### 6.3 Database Backups
- [ ] **Daily Backup Schedule**
  - **Method**: SFTP to cloud storage
  - **Frequency**: Daily at 2 AM
  - **Retention**: 30 days
  - **Status**: ⏳ TO DO

---

## PHASE 7: DOCUMENTATION

### 7.1 API Documentation
- [ ] **Create API Docs**
  - **Format**: OpenAPI/Swagger
  - **File**: `docs/api.md` or Swagger JSON
  - **Content**: All endpoints, request/response examples
  - **Status**: ⏳ TO DO

### 7.2 Developer Guide
- [ ] **Create Setup Guide**
  - **File**: `docs/SETUP.md`
  - **Content**: How to run locally, deploy, test
  - **Status**: ⏳ TO DO

### 7.3 User Guide
- [ ] **Create User Documentation**
  - **File**: `docs/USER_GUIDE.md`
  - **Content**: How to use E7ki, features, keyboard shortcuts
  - **Status**: ⏳ TO DO

---

## IMPLEMENTATION PRIORITY MATRIX

| Task | Impact | Effort | Priority | Phase |
|------|--------|--------|----------|-------|
| Fix WebSocket Port | 🔴 Critical | 🟢 Low | P0 | 1 |
| User Search | 🔴 Critical | 🟡 Medium | P1 | 2 |
| Auth Integration | 🔴 Critical | 🟡 Medium | P1 | 1 |
| Group Chats | 🟡 Important | 🔴 High | P2 | 2 |
| Message Encryption | 🔴 Critical | 🔴 High | P1 | 2 |
| Read Receipts UI | 🟢 Nice-to-Have | 🟢 Low | P3 | 3 |
| Typing Indicators | 🟢 Nice-to-Have | 🟢 Low | P3 | 3 |
| File Storage (Cloudinary) | 🟡 Important | 🟡 Medium | P2 | 4 |
| Rate Limiting | 🟡 Important | 🟢 Low | P2 | 4 |

---

## TESTING CHECKLIST

- [ ] Local development builds without errors
- [ ] Auth flow works with window.Auth
- [ ] WebSocket connects to server
- [ ] Can create 1:1 chat
- [ ] Can send/receive text messages
- [ ] Can upload image/audio files
- [ ] Can see other user typing
- [ ] Can mark messages as read
- [ ] Displays unread badge in sidebar
- [ ] User search returns results
- [ ] Can create group chat
- [ ] Messages persist after reload
- [ ] Works on mobile (iOS Safari, Android Chrome)
- [ ] Handles network disconnection gracefully
- [ ] All API endpoints return expected status codes
- [ ] No console errors or warnings

---

## DEPLOYMENT CHECKLIST

- [ ] All tests passing
- [ ] No security vulnerabilities (npm audit)
- [ ] Environment variables set on Render
- [ ] Database migrations applied
- [ ] CORS properly configured
- [ ] SSL certificate valid
- [ ] File storage configured (Cloudinary)
- [ ] Logging enabled
- [ ] Error monitoring enabled
- [ ] Backup system tested
- [ ] Performance baselines established
- [ ] Documentation up-to-date

---

**Created**: April 2026  
**Status**: 📋 Ready for Development  
**Est. Completion**: 2-3 weeks with full team
