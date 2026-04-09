const express = require('express');
const router = express.Router();
const { runAgent } = require('../ai-agent/agent-core');
const { validateCommand } = require('../ai-agent/tools/navigator');
const aiService = require('../services/ai-service');

// Helper functions - get from localStorage in browser context
function getUserFromRequest(req) {
  // Try to get user from session/token
  const userData = req.headers['x-user-data'];
  if (userData) {
    try {
      return JSON.parse(Buffer.from(userData, 'base64').toString());
    } catch(e) {}
  }
  
  // Default guest user
  return { 
    id: req.ip || 'guest', 
    username: 'Guest',
    authenticated: false 
  };
}

// Get assets from localStorage (sent in request body)
function getAssetsFromContext(context) {
  if (context && context.assets) {
    return context.assets;
  }
  return { codes: [], silver: [], gold: [] };
}

// Get services list
function getAvailableServices() {
  return [
    { name: 'Pebalaash', description: 'Barter system', status: 'active' },
    { name: 'Games Centre', description: 'Gaming', status: 'active' },
    { name: 'SafeCode', description: 'Asset vault', status: 'active' },
    { name: 'Farragna', description: 'Social likes', status: 'active' },
    { name: 'Samma3ny', description: 'Social hub', status: 'active' }
  ];
}

/**
 * POST /api/ai/agent
 * Main chat endpoint - processes user messages
 */
router.post('/agent', async (req, res) => {
  try {
    const { message, context = {} } = req.body;
    const user = getUserFromRequest(req);
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    // Fetch user assets from context
    const assets = getAssetsFromContext(context);
    const services = getAvailableServices();
    
    // Run the agent
    const result = await runAgent(message, user, assets, services);
    
    res.json(result);
    
  } catch (error) {
    console.error('[AI-Routes] Agent error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      reply: 'عذراً، حدث خطأ. يرجى المحاولة لاحقاً.\nSorry, an error occurred. Please try again later.'
    });
  }
});

/**
 * POST /api/ai/execute
 * Execute navigation/action commands
 */
router.post('/execute', async (req, res) => {
  try {
    const { action, assets } = req.body;
    const user = getUserFromRequest(req);
    
    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required'
      });
    }
    
    // Validate command
    const validation = validateCommand(
      action, 
      { authenticated: !!user.authenticated },
      assets || {}
    );
    
    if (!validation.valid) {
      return res.status(403).json({
        success: false,
        error: validation.error,
        errorAr: validation.errorAr,
        redirect: validation.redirect,
        command: validation.command
      });
    }
    
    res.json({
      success: true,
      command: validation.command,
      message: `Executing ${validation.command.service}`,
      messageAr: `تنفيذ ${validation.command.service}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[AI-Routes] Execute error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai/stats
 * Get AI service statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = aiService.getStats();
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai/quota
 * Check remaining quota for user
 */
router.get('/quota', async (req, res) => {
  const stats = aiService.getStats();
  res.json({
    success: true,
    quota: {
      used: stats.quotaUsed,
      total: stats.quotaTotal,
      remaining: stats.quotaRemaining,
      resetInMinutes: stats.resetIn
    }
  });
});

module.exports = router;