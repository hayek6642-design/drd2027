// ===============================
// 🧠 ZAGEL MEMORY ROUTES - Backend API
// ===============================

const express = require('express');
const router = express.Router();

// In-memory store (use DB in production)
const memoryStore = new Map();

// Get user memory
router.get('/memory/:userId', (req, res) => {
  const { userId } = req.params;
  const memory = memoryStore.get(userId) || [];
  
  res.json({
    success: true,
    userId,
    interactions: memory.length,
    recent: memory.slice(-5),
    lastUpdated: new Date()
  });
});

// Update user memory
router.post('/memory/:userId', (req, res) => {
  const { userId } = req.params;
  const { text, emotion, action } = req.body;
  
  if (!memoryStore.has(userId)) {
    memoryStore.set(userId, []);
  }
  
  const memory = memoryStore.get(userId);
  memory.push({
    text,
    emotion,
    action,
    timestamp: Date.now()
  });
  
  // Keep last 50 interactions
  if (memory.length > 50) {
    memory.shift();
  }
  
  res.json({
    success: true,
    userId,
    stored: memory.length
  });
});

// Get personality profile
router.get('/personality/:userId', (req, res) => {
  const { userId } = req.params;
  const memory = memoryStore.get(userId) || [];
  
  const profile = {
    userId,
    interactions: memory.length,
    friendliness: memory.length > 5 ? 0.7 : 0.5,
    humor: memory.some(m => m.text.includes('😄')) ? 0.6 : 0.3,
    proactivity: memory.length > 10 ? 0.8 : 0.4
  };
  
  res.json(profile);
});

// Clear memory (admin only)
router.delete('/memory/:userId', (req, res) => {
  const { userId } = req.params;
  memoryStore.delete(userId);
  
  res.json({
    success: true,
    message: 'Memory cleared',
    userId
  });
});

module.exports = router;
