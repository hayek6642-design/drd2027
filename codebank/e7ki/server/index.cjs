const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const { authenticateToken, authenticateSocket } = require('./auth-middleware.cjs');
const db = require('./database.cjs');
const { registerFileRoutes } = require('./fileUpload.cjs');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", credentials: true },
  path: '/ws'
});

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`${new Date().toLocaleTimeString()} [express] ${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// WebSocket auth
io.use(authenticateSocket);

// Apply auth to ALL API routes
app.use('/api/e7ki', authenticateToken);

// REST API Endpoints
app.get('/api/e7ki/users', async (req, res) => {
  try {
    const db = new (require('better-sqlite3'))(path.join(__dirname, '../../../data.sqlite'));
    const users = db.prepare('SELECT id, username, email FROM users WHERE id != ?').all(req.user.id);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/e7ki/chats', async (req, res) => {
  try {
    const chats = await db.getConversations(req.user.id);
    // Sort in memory to be double sure
    chats.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/e7ki/chats', async (req, res) => {
  try {
    const { participantIds, title } = req.body;
    const chat = await db.createConversation([req.user.id, ...participantIds], title);
    res.status(201).json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/e7ki/chats/:chatId/messages', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const messages = await db.getMessages(req.params.chatId, limit, offset);
    
    // Sort chronologically for client
    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/e7ki/messages', async (req, res) => {
  try {
    const message = await db.saveMessage({
      ...req.body,
      senderId: req.user.id,
      senderUsername: req.user.username
    });
    
    // Broadcast via WebSocket
    io.to(req.body.chatId).emit('new-message', message);
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/e7ki/messages/:id/read', async (req, res) => {
  try {
    await db.updateMessageStatus(req.params.id, 'read');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register file routes (upload/download)
registerFileRoutes(app);

// WebSocket handlers
io.on('connection', (socket) => {
  console.log(`[E7ki] User connected: ${socket.username} (${socket.userId})`);
  
  socket.on('join-chat', (chatId) => {
    socket.join(chatId);
    console.log(`[E7ki] User ${socket.username} joined chat ${chatId}`);
    socket.to(chatId).emit('user-presence', { userId: socket.userId, status: 'online' });
  });
  
  socket.on('typing', ({ chatId, isTyping }) => {
    socket.to(chatId).emit('user-typing', { 
      userId: socket.userId, 
      username: socket.username,
      isTyping 
    });
  });
  
  socket.on('disconnect', () => {
    console.log(`[E7ki] User disconnected: ${socket.username}`);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: "ok", service: "e7ki" });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const PORT = process.env.E7KI_PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`E7ki server running on port ${PORT}`);
});
