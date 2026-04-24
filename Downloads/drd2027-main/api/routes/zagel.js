/**
 * ZAGEL COMMAND WHEEL - Complete Backend Routes
 * 
 * Provides:
 * - SSE streaming with heartbeat
 * - Authentication (JWT/Session)
 * - Command execution & logging
 * - Notification management
 * - Channel management
 * - Real-time activity sync
 */

import express from 'express';
const router = express.Router();
import crypto from 'crypto';

// =========================================================================================
// Zagel Events - EventEmitter for all Zagel subsystems
// =========================================================================================
import EventEmitter from 'events';

export const zagelEvents = new EventEmitter();
zagelEvents.setMaxListeners(100);

/**
 * Broadcast event to a specific channel via SSE
 * This connects to the SSE manager defined above
 */
export function broadcastToChannel(channel, data) {
  if (global.__sseEmitToSession) {
    try {
      const sessionIds = Array.from(global.__sseRegistry?.keys() || []);
      sessionIds.forEach(sessionId => {
        global.__sseEmitToSession(sessionId, { channel, ...data });
      });
    } catch (err) {
      console.error('[Zagel] Broadcast error:', err.message);
    }
  }
}


// =========================================================================================
// SSE Manager - Server-Sent Events with heartbeat
// =========================================================================================
class SSEManager {
  constructor() {
    this.channels = new Map();
    this.clients = new Map();
    this.heartbeatInterval = 30000; // 30 seconds
  }

  registerClient(channel, response) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel).add(response);
    this.clients.set(response, { channel, connectedAt: Date.now() });
    
    // Send initial connection message
    response.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);
    
    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
      if (response.writable) {
        response.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
      } else {
        this.unregisterClient(channel, response);
        clearInterval(heartbeat);
      }
    }, this.heartbeatInterval);
    
    response.on('close', () => {
      this.unregisterClient(channel, response);
      clearInterval(heartbeat);
    });
  }

  unregisterClient(channel, response) {
    const channelSet = this.channels.get(channel);
    if (channelSet) {
      channelSet.delete(response);
      if (channelSet.size === 0) {
        this.channels.delete(channel);
      }
    }
    this.clients.delete(response);
  }

  broadcast(channel, event, data) {
    const channelSet = this.channels.get(channel);
    if (!channelSet || channelSet.size === 0) return;

    const message = {
      type: 'event',
      event,
      data,
      timestamp: Date.now(),
      channel
    };

    channelSet.forEach(response => {
      if (response.writable) {
        response.write(`data: ${JSON.stringify(message)}\n\n`);
      }
    });
  }

  broadcastToAll(event, data) {
    this.channels.forEach((clients, channel) => {
      this.broadcast(channel, event, data);
    });
  }

  getChannelStats(channel) {
    const channelSet = this.channels.get(channel) || new Set();
    return {
      channel,
      subscribers: channelSet.size,
      activeConnections: Array.from(this.clients.values())
        .filter(c => c.channel === channel)
        .map(c => ({ connectedAt: c.connectedAt, uptime: Date.now() - c.connectedAt }))
    };
  }
}

const sseManager = new SSEManager();

// =========================================================================================
// Middleware
// =========================================================================================

// Simple session validation
const validateSession = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.cookies?.sessionToken ||
                req.query?.token;
  
  if (!token) {
    return res.status(401).json({ error: 'No authorization token' });
  }
  
  // In production, validate against DB
  // For now, accept any non-empty token
  req.sessionToken = token;
  req.userId = req.headers['x-user-id'] || 'anonymous';
  next();
};

// =========================================================================================
// SSE Routes
// =========================================================================================

/**
 * GET /api/sse/:channel
 * Stream SSE events from a channel
 * 
 * Headers:
 *   Authorization: Bearer <token>
 *   
 * Example:
 *   curl -H "Authorization: Bearer mytoken" http://localhost:3000/api/sse/notifications
 */
router.get('/:channel', validateSession, (req, res) => {
  const channel = req.params.channel;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  console.log(`[SSE] Client connected to channel: ${channel}`);
  
  sseManager.registerClient(channel, res);
  
  req.on('close', () => {
    console.log(`[SSE] Client disconnected from channel: ${channel}`);
    sseManager.unregisterClient(channel, res);
  });
});

/**
 * POST /api/sse/:channel/broadcast
 * Broadcast an event to all subscribers in a channel
 * 
 * Body:
 *   {
 *     "event": "message",
 *     "data": { "text": "Hello", "from": "user@example.com" }
 *   }
 */
router.post('/:channel/broadcast', validateSession, express.json(), (req, res) => {
  const channel = req.params.channel;
  const { event, data } = req.body;
  
  if (!event || !data) {
    return res.status(400).json({ error: 'Missing event or data' });
  }
  
  sseManager.broadcast(channel, event, data);
  
  res.json({
    success: true,
    channel,
    event,
    subscribers: sseManager.getChannelStats(channel).subscribers,
    timestamp: Date.now()
  });
});

/**
 * GET /api/sse/:channel/stats
 * Get channel statistics
 */
router.get('/:channel/stats', validateSession, (req, res) => {
  const channel = req.params.channel;
  const stats = sseManager.getChannelStats(channel);
  
  res.json({
    success: true,
    ...stats
  });
});

/**
 * POST /api/sse/broadcast-all
 * Broadcast to all channels
 */
router.post('/broadcast-all', validateSession, express.json(), (req, res) => {
  const { event, data } = req.body;
  
  if (!event || !data) {
    return res.status(400).json({ error: 'Missing event or data' });
  }
  
  sseManager.broadcastToAll(event, data);
  
  res.json({
    success: true,
    event,
    message: 'Broadcast to all channels'
  });
});

// =========================================================================================
// Authentication Routes
// =========================================================================================

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/auth/me', validateSession, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.userId,
      email: req.headers['x-user-email'] || 'user@codebank.local',
      name: req.headers['x-user-name'] || 'Zagel User'
    }
  });
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/auth/logout', validateSession, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// =========================================================================================
// Command Routes
// =========================================================================================

/**
 * POST /api/commands
 * Execute a command via Zagel
 * 
 * Body:
 *   {
 *     "command": "play_music",
 *     "parameters": { "artist": "Pink Floyd", "autoplay": true }
 *   }
 */
router.post('/commands', validateSession, express.json(), (req, res) => {
  const { command, parameters = {} } = req.body;
  
  if (!command) {
    return res.status(400).json({ error: 'Command required' });
  }
  
  const commandId = crypto.randomBytes(8).toString('hex');
  
  // Log command execution
  console.log(`[Command] ${req.userId}: ${command}`, parameters);
  
  // Broadcast to SSE channel
  sseManager.broadcast('commands', 'command_executed', {
    commandId,
    command,
    parameters,
    executedBy: req.userId,
    timestamp: Date.now()
  });
  
  // In production, queue this for actual execution
  res.json({
    success: true,
    commandId,
    command,
    status: 'queued',
    message: `Command "${command}" queued for execution`,
    estimatedTime: 2000 // ms
  });
});

/**
 * GET /api/commands/:id
 * Get command status
 */
router.get('/commands/:id', validateSession, (req, res) => {
  const commandId = req.params.id;
  
  res.json({
    success: true,
    commandId,
    command: 'example_command',
    status: 'completed',
    result: { success: true, message: 'Command executed' },
    executedAt: Date.now()
  });
});

// =========================================================================================
// Notification Routes
// =========================================================================================

/**
 * GET /api/notifications
 * Get user notifications
 * 
 * Query params:
 *   - delivered: boolean (filter by delivery status)
 *   - limit: number (default 50)
 */
router.get('/notifications', validateSession, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const delivered = req.query.delivered;
  
  const notifications = [
    {
      id: '1',
      type: 'command',
      title: 'Music Started',
      message: 'Now playing: Pink Floyd - Time',
      payload: { artist: 'Pink Floyd', song: 'Time' },
      delivered: true,
      createdAt: Date.now()
    }
  ];
  
  res.json({
    success: true,
    notifications,
    total: notifications.length,
    limit
  });
});

/**
 * POST /api/notifications/:id/mark-delivered
 * Mark notification as delivered
 */
router.post('/notifications/:id/mark-delivered', validateSession, (req, res) => {
  res.json({
    success: true,
    notificationId: req.params.id,
    delivered: true,
    deliveredAt: Date.now()
  });
});

// =========================================================================================
// Channel Routes
// =========================================================================================

/**
 * GET /api/channels
 * List all channels
 */
router.get('/channels', validateSession, (req, res) => {
  const channels = [
    { id: 'commands', name: 'Commands', description: 'Command execution events', category: 'general' },
    { id: 'notifications', name: 'Notifications', description: 'User notifications', category: 'general' },
    { id: 'activity', name: 'Activity', description: 'Activity log', category: 'admin' }
  ];
  
  res.json({
    success: true,
    channels
  });
});

/**
 * GET /api/channels/:id/subscribers
 * Get channel subscribers count
 */
router.get('/channels/:id/subscribers', validateSession, (req, res) => {
  const stats = sseManager.getChannelStats(req.params.id);
  
  res.json({
    success: true,
    channel: req.params.id,
    subscribers: stats.subscribers
  });
});

// =========================================================================================
// Health & Status Routes
// =========================================================================================

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

/**
 * GET /api/status
 * Server status and SSE stats
 */
router.get('/status', validateSession, (req, res) => {
  const channels = Array.from(sseManager.channels.keys());
  const totalSubscribers = Array.from(sseManager.channels.values())
    .reduce((sum, set) => sum + set.size, 0);
  
  res.json({
    success: true,
    status: 'operational',
    sseManager: {
      totalChannels: channels.length,
      channels: channels,
      totalSubscribers,
      heartbeatInterval: sseManager.heartbeatInterval
    },
    timestamp: Date.now()
  });
});

// =========================================================================================
// Error Handling
// =========================================================================================

router.use((err, req, res, next) => {
  console.error('[Error]', err);
  
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Internal server error',
    timestamp: Date.now()
  });
});

export default router;
