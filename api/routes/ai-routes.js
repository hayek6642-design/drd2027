import express from 'express';

const router = express.Router();

// Apply auth middleware to all AI routes
// For now, we'll make these routes optional - they can work with or without auth
router.use((req, res, next) => {
  // Make auth optional - just add a guest user if no auth
  if (!req.user) {
    req.user = { id: 'guest', username: 'Guest', authenticated: false };
  }
  next();
});

// POST /api/ai/agent - Run AI agent with message
router.post('/agent', async (req, res) => {
  try {
    const { message, context = {} } = req.body;
    const user = req.user;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message required' });
    }
    
    // Get assets from context or default
    const assets = context.assets || { codes: [], silver: [], gold: [] };
    
    const services = [
      { name: 'Pebalaash', description: 'Barter system', status: 'active' },
      { name: 'Games Centre', description: 'Gaming', status: 'active' },
      { name: 'SafeCode', description: 'Asset vault', status: 'active' },
      { name: 'Farragna', description: 'Social likes', status: 'active' }
    ];
    
    // Placeholder response - the actual agent implementation would go here
    const result = {
      success: true,
      response: `AI Agent received: ${message}`,
      user: user.id,
      services: services
    };
    
    res.json(result);
    
  } catch (error) {
    console.error('[AI-Routes] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/ai/execute - Execute AI command
router.post('/execute', async (req, res) => {
  try {
    const { action } = req.body;
    
    if (!action) {
      return res.status(400).json({ success: false, error: 'Action required' });
    }
    
    // Placeholder - validate and execute command
    res.json({
      success: true,
      command: action,
      message: `Action received: ${action.type || 'unknown'}`
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/ai/stats - Get AI service stats
router.get('/stats', async (req, res) => {
  res.json({ 
    success: true, 
    stats: {
      status: 'active',
      timestamp: new Date().toISOString()
    }
  });
});

export default router;