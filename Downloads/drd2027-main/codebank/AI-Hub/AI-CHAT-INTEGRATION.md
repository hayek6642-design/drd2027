# 🧠 CodeMind v2.0 Integration - AI-Chat Module

This guide explains how to integrate CodeMind v2.0 into the AI-Chat module.

---

## 📋 Overview

The **AI-Chat** module is the user-facing interface where users interact with CodeMind v2.0. It handles:

- **Chat UI** - Message display and input
- **Conversation Management** - Session tracking
- **User Authentication** - Permission verification
- **Real-time Updates** - Live system state

---

## 🚀 Quick Integration

### 1. Import CodeMind

```javascript
// ai-chat/api/chatHandler.js
const { CodeMindV2 } = require('../../core/codemind-server-v2.js');

class ChatHandler {
  constructor() {
    this.codemind = new CodeMindV2({
      projectPath: '/agent/home/codebank'
    });
  }

  async handleMessage(message, user, conversationId) {
    return await this.codemind.chat(message, user, conversationId);
  }
}

module.exports = { ChatHandler };
```

### 2. Create Express Route

```javascript
// ai-chat/routes/chat.js
const express = require('express');
const { ChatHandler } = require('../api/chatHandler');

const router = express.Router();
const chatHandler = new ChatHandler();

// POST: Send message
router.post('/message', async (req, res) => {
  const { message, conversationId } = req.body;
  const user = req.user; // From auth middleware

  try {
    const response = await chatHandler.handleMessage(
      message,
      user,
      conversationId
    );

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Conversation history
router.get('/history/:id', (req, res) => {
  const user = req.user;
  const history = chatHandler.codemind.getConversationHistory(
    req.params.id,
    user
  );

  res.json(history);
});

// GET: System status
router.get('/status', (req, res) => {
  const user = req.user;
  const status = chatHandler.codemind.getSystemStatus(user);

  res.json(status);
});

module.exports = router;
```

### 3. Frontend Chat Component

```jsx
// ai-chat/components/ChatInterface.jsx
import React, { useState, useRef } from 'react';

const ChatInterface = ({ user, conversationId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentInfo, setAgentInfo] = useState(null);
  const messagesEndRef = useRef(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Add user message to UI
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    setLoading(true);

    try {
      // Send to backend
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversationId
        })
      });

      const data = await response.json();

      // Add CodeMind response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        agent: data.agent,
        intent: data.intent
      }]);

      // Show agent info
      setAgentInfo({
        agent: data.agent,
        intent: data.intent,
        modules: data.context?.relevantModules,
        processingTime: data.processingTime
      });

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: `Error: ${err.message}`
      }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="chat-container">
      {/* Header with agent info */}
      {agentInfo && (
        <div className="agent-info">
          <span className="agent-badge">{agentInfo.agent}</span>
          <span className="intent-badge">{agentInfo.intent}</span>
          <span className="time">{agentInfo.processingTime}ms</span>
        </div>
      )}

      {/* Messages */}
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message message-${msg.role}`}>
            {msg.role === 'assistant' ? (
              <pre className="response">{msg.content}</pre>
            ) : (
              <p>{msg.content}</p>
            )}
          </div>
        ))}
        {loading && <div className="loading">⏳ CodeMind is thinking...</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="input-area">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask CodeMind about technical issues, architecture, economics, or security..."
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? '⏳ Sending...' : '📤 Send'}
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
```

---

## 🎯 Usage Patterns

### Pattern 1: Simple Chat

```javascript
// User asks a question
const response = await codemind.chat(
  'Explain the safecode module',
  { email: 'dia201244@gmail.com' },
  'conv_123'
);

// Returns comprehensive response with context
```

### Pattern 2: Action Execution

```javascript
// User requests a fix
const response = await codemind.chat(
  'Fix the transaction timeout bug',
  { email: 'dia201244@gmail.com' },
  'conv_456'
);

// If confidence > 90%, auto-executes
// Otherwise, returns pending action for approval
```

### Pattern 3: Pending Approvals

```javascript
// Owner reviews pending actions
const pending = codemind.actionEngine.getPendingActions(ownerUser);

// Owner approves specific action
await codemind.actionEngine.approvePendingAction(
  'pending_123',
  ownerUser
);

// Action executes immediately
```

---

## 🔐 Authentication Integration

### Middleware Setup

```javascript
// ai-chat/middleware/auth.js
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Verify token (implement your auth logic)
    const user = verifyToken(token);
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticate };
```

### Apply to Routes

```javascript
const express = require('express');
const { authenticate } = require('./middleware/auth');
const chatRoutes = require('./routes/chat');

const app = express();

// All chat routes require authentication
app.use('/api/chat', authenticate, chatRoutes);
```

---

## 💬 Chat Features

### Feature 1: Conversation Context

```javascript
// CodeMind maintains full conversation context
const context = {
  id: 'conv_123',
  user: 'dia201244@gmail.com',
  startedAt: '2024-04-15T...',
  messages: [
    { role: 'user', content: 'Debug safecode' },
    { role: 'assistant', content: '...analysis...' },
    { role: 'user', content: 'What about yt-player?' }
  ]
};

// Each response is aware of previous messages
```

### Feature 2: User Profiles

```javascript
// CodeMind learns from users
const profile = {
  email: 'user@example.com',
  totalQuestions: 42,
  preferredIntent: 'technical',
  recentQueries: [...],
  archetype: 'trader'
};

// Uses this to personalize responses
```

### Feature 3: Action Pending Queue

```javascript
// Users can see pending actions
const pending = {
  actionId: 'pending_789',
  type: 'refactorFunction',
  confidence: '78%',
  reason: 'Complex architectural change',
  submittedAt: '2024-04-15T...'
};

// Users can approve/reject with one click
```

---

## 📊 UI Components

### Agent Badge
```jsx
<span className="agent-badge" data-agent="Debugger">
  🔍 Debugger
</span>
```

### Intent Indicator
```jsx
<span className="intent-indicator" data-intent="technical">
  Technical Issue
</span>
```

### Pending Actions Card
```jsx
<div className="pending-action">
  <h4>Pending Approval</h4>
  <p>Fix safecode transaction bug</p>
  <p>Confidence: 85%</p>
  <button>Approve</button>
  <button>Reject</button>
</div>
```

### Processing Info
```jsx
<div className="processing-info">
  <span>⚙️ Analyzing 3 modules</span>
  <span>📊 Economic flows: 2</span>
  <span>⏱️ Processing: 234ms</span>
</div>
```

---

## ⚠️ Error Handling

### User Errors

```javascript
// When user is not authenticated
{
  status: 'unauthorized',
  mode: 'public',
  message: 'Please sign in to access this feature'
}
```

### Security Errors

```javascript
// When non-owner tries dangerous action
{
  status: 'denied',
  reason: 'This feature is reserved for the project owner'
}
```

### System Errors

```javascript
// When CodeMind encounters an error
{
  status: 'error',
  error: 'Module crash analysis failed',
  processingTime: 1234
}
```

---

## 🔄 Real-time Updates

### WebSocket Integration

```javascript
// ai-chat/websocket/setup.js
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  // Join conversation room
  socket.on('join-conversation', (conversationId) => {
    socket.join(`conv_${conversationId}`);
  });

  // Broadcast real-time updates
  const monitor = setInterval(() => {
    const status = codemind.getSystemStatus(adminUser);
    io.emit('system:status', status);
  }, 5000);

  socket.on('disconnect', () => {
    clearInterval(monitor);
  });
});
```

### Frontend Listener

```javascript
// ai-chat/components/SystemStatus.jsx
useEffect(() => {
  const socket = io();

  socket.on('system:status', (status) => {
    setSystemStatus(status);
  });

  return () => socket.disconnect();
}, []);
```

---

## 🎓 Example Conversations

### Example 1: Bug Fix

```
User: "The yt-player crashes when videos exceed 30 minutes"

CodeMind: 
- Agent: Debugger
- Intent: Technical
- Modules: yt-player, watch-dog, assetbus
- Analysis: [detailed bug analysis]
- Confidence: 94% → Auto-fixes
- Result: ✅ Fixed and tested

UI Shows:
✅ Auto-fix executed
📦 Backup: backup_xyz
🧪 Tests: 15 passed
⏱️ Duration: 2.3s
```

### Example 2: Economic Question

```
User: "What if we increase code rewards by 50%?"

CodeMind:
- Agent: Product Manager
- Intent: Economic
- Modules: yt-player, safecode, pebalaash
- Economic Impact: +$40K/month income, -5% engagement
- User Impact: Traders benefit, casual users see inflation
- Recommendation: Tiered increase instead
- Ethical: ✅ No concerns
```

### Example 3: Security Alert

```
User: "We detected unauthorized access from 192.168.x.x"

CodeMind:
🚨 SECURITY ALERT MODE
- Agent: Security Auditor
- Severity: CRITICAL
- Immediate Actions: 5
- Owner Notification: SENT
- Incident ID: SEC-1713097...
- Investigation: Started
```

---

## 📈 Performance Tips

### 1. Lazy Load CodeMind
```javascript
// Only initialize when needed
let codemind = null;

function getCodemind() {
  if (!codemind) {
    codemind = new CodeMindV2();
  }
  return codemind;
}
```

### 2. Cache Conversations
```javascript
const conversationCache = new Map();

async function getCachedConversation(id) {
  if (conversationCache.has(id)) {
    return conversationCache.get(id);
  }

  const conv = await codemind.getConversationHistory(id, user);
  conversationCache.set(id, conv);

  // Clear old cache entries
  if (conversationCache.size > 100) {
    const first = conversationCache.keys().next().value;
    conversationCache.delete(first);
  }

  return conv;
}
```

### 3. Debounce Rapid Messages
```javascript
let messageTimeout;

function debounceMessage(message) {
  clearTimeout(messageTimeout);

  messageTimeout = setTimeout(() => {
    sendMessage(message);
  }, 500); // Wait for user to stop typing
}
```

---

## 🧪 Testing

### Basic Test

```javascript
// ai-chat/tests/codemind.test.js
const { CodeMindV2 } = require('../../core/codemind-server-v2.js');

async function testBasicChat() {
  const codemind = new CodeMindV2();

  const response = await codemind.chat(
    'Test message',
    { email: 'dia201244@gmail.com' },
    'test_conv'
  );

  console.assert(response.status !== 'error', 'Chat failed');
  console.assert(response.mode === 'owner', 'Owner not recognized');
  console.log('✅ Basic chat test passed');
}

testBasicChat();
```

---

## 📝 Configuration

### Environment Variables

```bash
# .env
CODEMIND_MODEL=phi3
CODEMIND_TEMPERATURE=0.7
CODEMIND_MAX_TOKENS=2000
CODEMIND_SANDBOX=true
CODEMIND_AUTO_FIX=true
```

### Load Configuration

```javascript
// ai-chat/config.js
module.exports = {
  codemind: {
    model: process.env.CODEMIND_MODEL || 'phi3',
    temperature: parseFloat(process.env.CODEMIND_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.CODEMIND_MAX_TOKENS || '2000'),
    sandboxEnabled: process.env.CODEMIND_SANDBOX === 'true',
    autoFixEnabled: process.env.CODEMIND_AUTO_FIX === 'true'
  }
};
```

---

## 🚀 Deployment

### Docker Setup

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Build & Run

```bash
docker build -t codemind-chat .
docker run -p 3000:3000 codemind-chat
```

---

**AI-Chat Integration Complete** - Ready for intelligent conversations! 🧠
