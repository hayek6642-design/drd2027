/**
 * Zagel Brain API - Server-side
 * Simple REST endpoints for Zagel brain functionality
 */

import express from 'express';

const router = express.Router();

// In-memory storage (in production, use database)
const zagelConversations = new Map();
const zagelMemories = new Map();

// Initialize with Gemini key
let geminiKey = null;
let isInitialized = false;

/**
 * POST /api/zagel/initialize
 * Initialize Zagel with Gemini API key
 */
router.post('/initialize', async (req, res) => {
  const { apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ ok: false, error: 'API_KEY_REQUIRED' });
  }
  
  geminiKey = apiKey;
  isInitialized = true;
  
  console.log('[ZAGEL] Initialized with Gemini API');
  
  res.json({ ok: true, message: 'Zagel brain initialized' });
});

/**
 * POST /api/zagel/chat
 * Send message to Zagel brain
 */
router.post('/chat', async (req, res) => {
  const { message, userId = 'anonymous', context = {} } = req.body;
  
  if (!message) {
    return res.status(400).json({ ok: false, error: 'MESSAGE_REQUIRED' });
  }
  
  if (!isInitialized || !geminiKey) {
    return res.status(503).json({ ok: false, error: 'ZAGEL_NOT_INITIALIZED' });
  }
  
  try {
    // Get conversation history
    const history = zagelConversations.get(userId) || [];
    
    // Build prompt with context
    const prompt = `You are Zagel, a wise and playful AI assistant represented as a 3D dove. 
Use dove metaphors and bird-themed analogies.
Keep responses 2-3 sentences.
Be warm, empathetic, and slightly mysterious.

Context: ${JSON.stringify(context)}
History: ${history.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}

User: ${message}
Zagel:`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
            topP: 0.95,
            topK: 40
          }
        })
      }
    );
    
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '🐦 *tilts head* Interesting...';
    
    // Save to conversation history
    history.push({ role: 'user', content: message });
    history.push({ role: 'zagel', content: reply });
    
    // Keep last 10 messages
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
    
    zagelConversations.set(userId, history);
    
    res.json({
      ok: true,
      response: reply,
      conversationId: userId
    });
    
  } catch (error) {
    console.error('[ZAGEL] Chat error:', error);
    res.status(500).json({ ok: false, error: 'CHAT_FAILED' });
  }
});

/**
 * GET /api/zagel/history/:userId
 * Get conversation history
 */
router.get('/history/:userId', (req, res) => {
  const { userId } = req.params;
  
  const history = zagelConversations.get(userId) || [];
  
  res.json({ ok: true, history });
});

/**
 * DELETE /api/zagel/history/:userId
 * Clear conversation history
 */
router.delete('/history/:userId', (req, res) => {
  const { userId } = req.params;
  
  zagelConversations.delete(userId);
  
  res.json({ ok: true, message: 'History cleared' });
});

/**
 * POST /api/zagel/memory
 * Save to long-term memory
 */
router.post('/memory', (req, res) => {
  const { userId, key, value, importance = 0.5 } = req.body;
  
  if (!userId || !key) {
    return res.status(400).json({ ok: false, error: 'USER_ID_AND_KEY_REQUIRED' });
  }
  
  const userMemories = zagelMemories.get(userId) || new Map();
  userMemories.set(key, { value, importance, timestamp: Date.now() });
  zagelMemories.set(userId, userMemories);
  
  res.json({ ok: true });
});

/**
 * GET /api/zagel/memory/:userId
 * Get user memories
 */
router.get('/memory/:userId', (req, res) => {
  const { userId } = req.params;
  
  const userMemories = zagelMemories.get(userId) || new Map();
  
  // Return as array sorted by importance
  const memories = Array.from(userMemories.entries())
    .map(([key, data]) => ({ key, ...data }))
    .sort((a, b) => b.importance - a.importance);
  
  res.json({ ok: true, memories });
});

/**
 * GET /api/zagel/status
 * Get Zagel status
 */
router.get('/status', (req, res) => {
  res.json({
    ok: true,
    initialized: isInitialized,
    conversations: zagelConversations.size,
    memories: zagelMemories.size
  });
});

export default router;