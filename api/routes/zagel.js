import express from 'express';
import { requireAuth, softAuth } from '../middleware/auth.js';
import { EventEmitter } from 'events';

const router = express.Router();
const zagelEvents = new EventEmitter();
zagelEvents.setMaxListeners(100);

// Store active SSE clients
const sseClients = {
  e7ki: new Set(),
  farragna: new Set(),
  pebalaash: new Set(),
  assets: new Set(),
  notifications: new Set()
};

// ============================================
// SSE ENDPOINTS - Real-time event streaming
// ============================================

/**
 * GET /api/sse/:channel
 * Subscribe to server-sent events for a specific channel
 * Channels: e7ki, farragna, pebalaash, assets, notifications
 */
router.get('/sse/:channel', softAuth, (req, res) => {
  const { channel } = req.params;
  const userId = req.user?.id || 'anonymous';

  if (!sseClients[channel]) {
    return res.status(404).json({ error: 'Invalid channel' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    channel,
    userId,
    timestamp: Date.now()
  })}\n\n`);

  // Add client to the set
  const clientId = `${userId}-${Date.now()}`;
  const client = { res, userId, clientId, channel };
  sseClients[channel].add(client);

  console.log(`[SSE] Client ${clientId} connected to ${channel} (Total: ${sseClients[channel].size})`);

  // Handle client disconnect
  req.on('close', () => {
    sseClients[channel].delete(client);
    console.log(`[SSE] Client ${clientId} disconnected from ${channel} (Total: ${sseClients[channel].size})`);
  });

  res.on('error', () => {
    sseClients[channel].delete(client);
  });
});

// Broadcast helper
function broadcastToChannel(channel, data) {
  if (!sseClients[channel]) return;
  
  const message = `data: ${JSON.stringify(data)}\n\n`;
  let activeCount = 0;

  sseClients[channel].forEach(client => {
    try {
      client.res.write(message);
      activeCount++;
    } catch (err) {
      sseClients[channel].delete(client);
    }
  });

  if (activeCount > 0) {
    console.log(`[SSE] Broadcasted to ${activeCount} clients on ${channel}`);
  }
}

// ============================================
// E7KI ENDPOINTS - Messaging
// ============================================

/**
 * GET /api/e7ki/messages
 * Get all messages for the user
 */
router.get('/e7ki/messages', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { limit = 50, offset = 0, unreadOnly = false } = req.query;

  // Mock data - replace with actual DB queries
  const messages = [
    {
      id: 'msg-1',
      userId,
      senderId: 'user-456',
      senderName: 'Ahmed',
      content: 'Hey! How are you doing?',
      timestamp: Date.now() - 3600000,
      read: false,
      attachment: null
    },
    {
      id: 'msg-2',
      userId,
      senderId: 'user-789',
      senderName: 'Fatima',
      content: 'Did you see the new features?',
      timestamp: Date.now() - 7200000,
      read: true,
      attachment: null
    }
  ];

  const filtered = unreadOnly ? messages.filter(m => !m.read) : messages;
  const paginated = filtered.slice(offset, offset + parseInt(limit));

  res.json({
    success: true,
    data: paginated,
    total: filtered.length,
    unreadCount: messages.filter(m => !m.read).length
  });
});

/**
 * POST /api/e7ki/send
 * Send a message
 */
router.post('/e7ki/send', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { recipientId, content, attachment } = req.body;

  if (!recipientId || !content) {
    return res.status(400).json({ error: 'recipientId and content required' });
  }

  const message = {
    id: `msg-${Date.now()}`,
    userId,
    recipientId,
    content,
    timestamp: Date.now(),
    read: false,
    attachment: attachment || null
  };

  // Broadcast to e7ki channel
  broadcastToChannel('e7ki', {
    type: 'e7ki:message',
    data: message,
    timestamp: Date.now()
  });

  // Emit event for AssetBus listeners
  zagelEvents.emit('e7ki:message', message);

  res.json({ success: true, data: message });
});

/**
 * PUT /api/e7ki/messages/:id/read
 * Mark message as read
 */
router.put('/e7ki/messages/:id/read', requireAuth, (req, res) => {
  const { id } = req.params;
  
  broadcastToChannel('e7ki', {
    type: 'e7ki:read',
    messageId: id,
    timestamp: Date.now()
  });

  res.json({ success: true, messageId: id });
});

// ============================================
// MAIL ENDPOINTS
// ============================================

/**
 * GET /api/mail/check
 * Check for new emails
 */
router.get('/mail/check', requireAuth, (req, res) => {
  const userId = req.user.id;

  // Mock data - replace with actual mail service integration
  const emails = [
    {
      id: 'email-1',
      from: 'noreply@bankode.com',
      subject: 'Welcome to BanKode!',
      preview: 'Your account has been created...',
      timestamp: Date.now() - 86400000,
      read: false
    },
    {
      id: 'email-2',
      from: 'support@codebank.io',
      subject: 'Password reset request',
      preview: 'We received a password reset request...',
      timestamp: Date.now() - 172800000,
      read: true
    }
  ];

  const unreadCount = emails.filter(e => !e.read).length;

  res.json({
    success: true,
    unreadCount,
    latestEmails: emails.slice(0, 5),
    total: emails.length
  });
});

/**
 * GET /api/mail/list
 * Get email list
 */
router.get('/mail/list', requireAuth, (req, res) => {
  const { limit = 20, offset = 0 } = req.query;

  const emails = [
    {
      id: 'email-1',
      from: 'noreply@bankode.com',
      subject: 'Welcome to BanKode!',
      preview: 'Your account has been created...',
      timestamp: Date.now() - 86400000,
      read: false
    }
  ];

  res.json({
    success: true,
    data: emails.slice(offset, offset + parseInt(limit)),
    total: emails.length
  });
});

/**
 * PUT /api/mail/:id/read
 * Mark email as read
 */
router.put('/mail/:id/read', requireAuth, (req, res) => {
  const { id } = req.params;

  broadcastToChannel('notifications', {
    type: 'mail:read',
    emailId: id,
    timestamp: Date.now()
  });

  res.json({ success: true, emailId: id });
});

// ============================================
// FARRAGNA ENDPOINTS - Social/Dating
// ============================================

/**
 * GET /api/farragna/activity
 * Get farragna activity (likes, matches, messages)
 */
router.get('/farragna/activity', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { limit = 20, type = 'all' } = req.query;

  // Mock data
  const activity = [
    {
      id: 'like-1',
      type: 'like',
      userId: 'user-111',
      userName: 'Layla',
      userImage: 'https://i.pravatar.cc/150?img=1',
      timestamp: Date.now() - 3600000,
      status: 'unread'
    },
    {
      id: 'match-1',
      type: 'match',
      userId: 'user-222',
      userName: 'Noor',
      userImage: 'https://i.pravatar.cc/150?img=2',
      timestamp: Date.now() - 7200000,
      status: 'new'
    },
    {
      id: 'superlike-1',
      type: 'superlike',
      userId: 'user-333',
      userName: 'Sara',
      userImage: 'https://i.pravatar.cc/150?img=3',
      timestamp: Date.now() - 86400000,
      status: 'read'
    }
  ];

  let filtered = type === 'all' ? activity : activity.filter(a => a.type === type);
  const paginated = filtered.slice(0, parseInt(limit));

  res.json({
    success: true,
    data: paginated,
    unreadCount: activity.filter(a => a.status === 'unread').length,
    total: filtered.length
  });
});

/**
 * POST /api/farragna/like/:targetUserId
 * Send a like
 */
router.post('/farragna/like/:targetUserId', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { targetUserId } = req.params;

  const likeEvent = {
    id: `like-${Date.now()}`,
    type: 'like',
    userId,
    targetUserId,
    timestamp: Date.now()
  };

  broadcastToChannel('farragna', {
    type: 'farragna:like',
    data: likeEvent,
    timestamp: Date.now()
  });

  zagelEvents.emit('farragna:like', likeEvent);

  res.json({ success: true, data: likeEvent });
});

/**
 * POST /api/farragna/match/:userId
 * Handle match
 */
router.post('/farragna/match/:userId', requireAuth, (req, res) => {
  const currentUserId = req.user.id;
  const { userId } = req.params;

  const matchEvent = {
    id: `match-${Date.now()}`,
    type: 'match',
    user1: currentUserId,
    user2: userId,
    timestamp: Date.now()
  };

  broadcastToChannel('farragna', {
    type: 'farragna:match',
    data: matchEvent,
    timestamp: Date.now()
  });

  zagelEvents.emit('farragna:match', matchEvent);

  res.json({ success: true, data: matchEvent });
});

// ============================================
// PEBALAASH ENDPOINTS - Bartering
// ============================================

/**
 * GET /api/pebalaash/offers
 * Get active barter offers
 */
router.get('/pebalaash/offers', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { limit = 20, status = 'all' } = req.query;

  // Mock data
  const offers = [
    {
      id: 'offer-1',
      userId: 'user-444',
      userName: 'Ali',
      offering: 'iPhone 12',
      seeking: 'PlayStation 5',
      timestamp: Date.now() - 3600000,
      status: 'active'
    },
    {
      id: 'offer-2',
      userId: 'user-555',
      userName: 'Mira',
      offering: 'Laptop Dell XPS',
      seeking: 'MacBook Pro',
      timestamp: Date.now() - 7200000,
      status: 'matched'
    }
  ];

  let filtered = status === 'all' ? offers : offers.filter(o => o.status === status);
  const paginated = filtered.slice(0, parseInt(limit));

  res.json({
    success: true,
    data: paginated,
    total: filtered.length
  });
});

/**
 * POST /api/pebalaash/offer
 * Create a new barter offer
 */
router.post('/pebalaash/offer', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { offering, seeking, description } = req.body;

  if (!offering || !seeking) {
    return res.status(400).json({ error: 'offering and seeking required' });
  }

  const offer = {
    id: `offer-${Date.now()}`,
    userId,
    offering,
    seeking,
    description: description || '',
    timestamp: Date.now(),
    status: 'active'
  };

  broadcastToChannel('pebalaash', {
    type: 'pebalaash:offer',
    data: offer,
    timestamp: Date.now()
  });

  zagelEvents.emit('pebalaash:offer', offer);

  res.json({ success: true, data: offer });
});

/**
 * POST /api/pebalaash/offer/:offerId/match
 * Match with an offer
 */
router.post('/pebalaash/offer/:offerId/match', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { offerId } = req.params;
  const { myOfferingId } = req.body;

  const match = {
    id: `match-${Date.now()}`,
    offerId,
    userId,
    myOfferingId,
    timestamp: Date.now()
  };

  broadcastToChannel('pebalaash', {
    type: 'pebalaash:match',
    data: match,
    timestamp: Date.now()
  });

  res.json({ success: true, data: match });
});

// ============================================
// SAFECODE ENDPOINTS - Asset Management
// ============================================

/**
 * GET /api/assets/snapshot
 * Get current asset snapshot
 */
router.get('/assets/snapshot', requireAuth, (req, res) => {
  const userId = req.user.id;

  // Mock data - integrate with actual asset system
  const snapshot = {
    userId,
    timestamp: Date.now(),
    assets: [
      {
        id: 'asset-1',
        name: 'Silver Code SILVER-1234-5678',
        type: 'silver',
        value: 100,
        expiresAt: Date.now() + 86400000 * 30,
        status: 'active'
      },
      {
        id: 'asset-2',
        name: 'Gold Code GOLD-9876-5432',
        type: 'gold',
        value: 500,
        expiresAt: Date.now() + 86400000 * 90,
        status: 'active'
      }
    ],
    totalValue: 600,
    assetCount: 2
  };

  res.json({ success: true, data: snapshot });
});

/**
 * POST /api/assets/code-generate
 * Generate a new asset code
 */
router.post('/assets/code-generate', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { type = 'silver', value = 100 } = req.body;

  // Generate code
  const code = generateCode(type);

  const asset = {
    id: `asset-${Date.now()}`,
    userId,
    code,
    type,
    value,
    generatedAt: Date.now(),
    expiresAt: Date.now() + 86400000 * (type === 'gold' ? 90 : 30),
    status: 'active'
  };

  broadcastToChannel('assets', {
    type: 'bankode:code-generated',
    data: asset,
    timestamp: Date.now()
  });

  zagelEvents.emit('bankode:code-generated', asset);

  res.json({ success: true, data: asset });
});

/**
 * PUT /api/assets/apply/:code
 * Apply/redeem an asset code
 */
router.put('/assets/apply/:code', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { code } = req.params;

  // Verify code format and validity
  if (!isValidCode(code)) {
    return res.status(400).json({ error: 'Invalid code format' });
  }

  const result = {
    success: true,
    code,
    userId,
    appliedAt: Date.now()
  };

  broadcastToChannel('assets', {
    type: 'assets:applied',
    data: result,
    timestamp: Date.now()
  });

  res.json(result);
});

// ============================================
// BATTALOODA ENDPOINTS - Studio/Recording
// ============================================

/**
 * POST /api/battalooda/recording/start
 * Start a recording session
 */
router.post('/battalooda/recording/start', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { title, description } = req.body;

  const session = {
    id: `session-${Date.now()}`,
    userId,
    title: title || 'Untitled Recording',
    description: description || '',
    startedAt: Date.now(),
    status: 'recording'
  };

  broadcastToChannel('notifications', {
    type: 'battalooda:recording',
    data: session,
    timestamp: Date.now()
  });

  zagelEvents.emit('battalooda:recording', session);

  res.json({ success: true, data: session });
});

/**
 * POST /api/battalooda/recording/stop/:sessionId
 * Stop recording
 */
router.post('/battalooda/recording/stop/:sessionId', requireAuth, (req, res) => {
  const { sessionId } = req.params;

  const stopEvent = {
    sessionId,
    stoppedAt: Date.now(),
    status: 'stopped'
  };

  broadcastToChannel('notifications', {
    type: 'battalooda:stopped',
    data: stopEvent,
    timestamp: Date.now()
  });

  res.json({ success: true, data: stopEvent });
});

// ============================================
// SMS & PHONE ENDPOINTS
// ============================================

/**
 * GET /api/sms/messages
 * Get SMS messages
 */
router.get('/sms/messages', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { limit = 20, unreadOnly = false } = req.query;

  const messages = [
    {
      id: 'sms-1',
      from: '+971501234567',
      content: 'Hello! This is a test SMS message.',
      timestamp: Date.now() - 3600000,
      read: false
    }
  ];

  const filtered = unreadOnly ? messages.filter(m => !m.read) : messages;

  res.json({
    success: true,
    data: filtered.slice(0, parseInt(limit)),
    unreadCount: messages.filter(m => !m.read).length
  });
});

/**
 * POST /api/sms/send
 * Send an SMS
 */
router.post('/sms/send', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message required' });
  }

  const sms = {
    id: `sms-${Date.now()}`,
    userId,
    phone,
    message,
    timestamp: Date.now(),
    status: 'sent'
  };

  broadcastToChannel('notifications', {
    type: 'sms:sent',
    data: sms,
    timestamp: Date.now()
  });

  res.json({ success: true, data: sms });
});

// ============================================
// SYSTEM ENDPOINTS
// ============================================

/**
 * GET /api/zagel/status
 * Get Zagel system status
 */
router.get('/status', (req, res) => {
  const status = {
    online: true,
    channels: {
      e7ki: sseClients.e7ki.size,
      farragna: sseClients.farragna.size,
      pebalaash: sseClients.pebalaash.size,
      assets: sseClients.assets.size,
      notifications: sseClients.notifications.size
    },
    totalClients: Object.values(sseClients).reduce((sum, set) => sum + set.size, 0),
    uptime: process.uptime(),
    timestamp: Date.now()
  };

  res.json(status);
});

/**
 * POST /api/zagel/broadcast
 * Admin endpoint to broadcast a custom event (for testing)
 */
router.post('/broadcast', requireAuth, (req, res) => {
  const { channel, type, data } = req.body;

  if (!channel || !type) {
    return res.status(400).json({ error: 'channel and type required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  broadcastToChannel(channel, {
    type,
    data,
    timestamp: Date.now()
  });

  res.json({ success: true, message: `Broadcasted to ${channel}` });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateCode(type) {
  const prefix = type === 'gold' ? 'GOLD' : 'SILVER';
  const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${part1}-${part2}`;
}

function isValidCode(code) {
  return /^(SILVER|GOLD)-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
}

// Export for event emission
export { zagelEvents, broadcastToChannel };

export default router;
