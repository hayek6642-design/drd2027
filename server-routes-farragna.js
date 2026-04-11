/**
 * ==============================
 * 🚀 FARRAGNA SERVER INTEGRATION
 * Complete Feed API Setup for server.js
 * ==============================
 */

// Import Farragna Feed Services
import FeedAPI from './farragna-feed/api/feed-api.js';
import PexelsClient from './farragna-feed/services/pexels-client.js';
import PixabayClient from './farragna-feed/services/pixabay-client.js';
import MixkitClient from './farragna-feed/services/mixkit-client.js';
import URLCache from './farragna-feed/cache/url-cache.js';
import * as apiKeys from './farragna-feed/config/api-keys.js';

/**
 * ==============================
 * SETUP FARRAGNA FEED ROUTES
 * ==============================
 * 
 * Call this function in your main server.js:
 * 
 * import { setupFarragniFeedRoutes } from './server-with-farragna-feed.js';
 * setupFarragniFeedRoutes(app, express);
 */

export function setupFarragniFeedRoutes(app, express) {
  const router = express.Router();
  
  // Initialize services
  let feedAPI = null;
  let urlCache = null;

  /**
   * Initialize Farragna Feed System
   */
  async function initializeFarragna() {
    try {
      console.log('[FARRAGNA] Initializing Zero-Storage Video Feed System...');
      
      // Initialize URL cache
      urlCache = new URLCache();
      console.log('[FARRAGNA] ✓ URL cache initialized');

      // Initialize API clients
      const pexelsClient = new PexelsClient(apiKeys.PEXELS_API_KEY);
      const pixabayClient = new PixabayClient(apiKeys.PIXABAY_API_KEY);
      const mixkitClient = new MixkitClient();

      // Initialize Feed API with all clients
      feedAPI = new FeedAPI({
        pexelsClient,
        pixabayClient,
        mixkitClient,
        urlCache,
        apiKeys
      });

      console.log('[FARRAGNA] ✓ Feed API initialized with all video sources');
      
      // Check health
      const health = await feedAPI.checkHealth();
      console.log('[FARRAGNA] ✓ Health check:', health);

      return true;
    } catch (error) {
      console.error('[FARRAGNA] ✗ Initialization failed:', error.message);
      return false;
    }
  }

  /**
   * GET /api/videos/feed
   * Main video feed endpoint with pagination and search
   */
  router.get('/api/videos/feed', async (req, res) => {
    try {
      if (!feedAPI) {
        return res.status(503).json({ error: 'Farragna Feed not initialized' });
      }

      const { page = 1, limit = 20, search = '', sortBy = 'trending' } = req.query;

      const feed = await feedAPI.getFeed({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        sortBy
      });

      res.json({
        success: true,
        data: feed,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: feed.length,
          hasMore: feed.length === parseInt(limit)
        }
      });
    } catch (error) {
      console.error('[FARRAGNA] Feed error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/videos/trending
   * Get trending videos
   */
  router.get('/api/videos/trending', async (req, res) => {
    try {
      if (!feedAPI) {
        return res.status(503).json({ error: 'Farragna Feed not initialized' });
      }

      const { limit = 10 } = req.query;
      
      const trending = await feedAPI.getTrending({
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: trending
      });
    } catch (error) {
      console.error('[FARRAGNA] Trending error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/videos/search/:query
   * Search for videos across all sources
   */
  router.get('/api/videos/search/:query', async (req, res) => {
    try {
      if (!feedAPI) {
        return res.status(503).json({ error: 'Farragna Feed not initialized' });
      }

      const { query } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const results = await feedAPI.search(query, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        query,
        data: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: results.length
        }
      });
    } catch (error) {
      console.error('[FARRAGNA] Search error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/videos/health
   * Check health of all video API sources
   */
  router.get('/api/videos/health', async (req, res) => {
    try {
      if (!feedAPI) {
        return res.status(503).json({ 
          status: 'not_initialized',
          message: 'Farragna Feed not initialized'
        });
      }

      const health = await feedAPI.checkHealth();

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        sources: health
      });
    } catch (error) {
      console.error('[FARRAGNA] Health check error:', error);
      res.status(500).json({ 
        status: 'error',
        error: error.message 
      });
    }
  });

  /**
   * GET /api/stats
   * Get feed statistics and API usage
   */
  router.get('/api/stats', async (req, res) => {
    try {
      if (!feedAPI) {
        return res.status(503).json({ error: 'Farragna Feed not initialized' });
      }

      const stats = feedAPI.getStats();

      res.json({
        success: true,
        stats: {
          totalVideosIndexed: stats.totalVideos,
          cacheSize: stats.cacheSize,
          apiCalls: stats.apiCalls,
          lastUpdated: stats.lastUpdated,
          sources: {
            pexels: stats.pexelsCalls,
            pixabay: stats.pixabayCalls,
            mixkit: stats.mixkitCalls
          }
        }
      });
    } catch (error) {
      console.error('[FARRAGNA] Stats error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/videos/prefetch
   * Prefetch next videos for optimized loading
   */
  router.post('/api/videos/prefetch', async (req, res) => {
    try {
      if (!feedAPI) {
        return res.status(503).json({ error: 'Farragna Feed not initialized' });
      }

      const { currentPage = 1, limit = 20 } = req.body;

      await feedAPI.prefetchNext({
        currentPage: parseInt(currentPage),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        message: 'Next videos prefetched'
      });
    } catch (error) {
      console.error('[FARRAGNA] Prefetch error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/videos/:videoId
   * Get single video details with streaming URL
   */
  router.get('/api/videos/:videoId', async (req, res) => {
    try {
      if (!feedAPI) {
        return res.status(503).json({ error: 'Farragna Feed not initialized' });
      }

      const { videoId } = req.params;

      const video = await feedAPI.getVideoById(videoId);

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      res.json({
        success: true,
        data: video
      });
    } catch (error) {
      console.error('[FARRAGNA] Get video error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/videos/:videoId/stream
   * Direct stream endpoint for video playback
   */
  router.get('/api/videos/:videoId/stream', async (req, res) => {
    try {
      if (!feedAPI) {
        return res.status(503).json({ error: 'Farragna Feed not initialized' });
      }

      const { videoId } = req.params;

      const streamUrl = await feedAPI.getStreamUrl(videoId);

      if (!streamUrl) {
        return res.status(404).json({ error: 'Stream URL not found' });
      }

      // Redirect to the actual streaming URL
      res.redirect(302, streamUrl);
    } catch (error) {
      console.error('[FARRAGNA] Stream error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/videos/:videoId/interact
   * Track user interaction (views, likes, shares)
   */
  router.post('/api/videos/:videoId/interact', async (req, res) => {
    try {
      if (!feedAPI) {
        return res.status(503).json({ error: 'Farragna Feed not initialized' });
      }

      const { videoId } = req.params;
      const { action = 'view', userId } = req.body; // action: view, like, share, comment

      await feedAPI.recordInteraction({
        videoId,
        action,
        userId,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: `${action} recorded`
      });
    } catch (error) {
      console.error('[FARRAGNA] Interaction error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mount router
  app.use(router);

  // Initialize on startup
  initializeFarragna().catch(err => {
    console.error('[FARRAGNA] Failed to initialize:', err);
    process.exit(1);
  });

  console.log('[FARRAGNA] ✓ All routes registered');
  return router;
}

export default setupFarragniFeedRoutes;
