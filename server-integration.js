/**
 * ==============================
 * 🚀 FARRAGNA SERVER INTEGRATION
 * ==============================
 * Express.js routes for video feed API
 * Drop-in integration with existing Farragna backend
 */

const express = require('express');
const FarragniFeedAPI = require('./farragna-feed/api/feed-api');

const feedAPI = new FarragniFeedAPI();

/**
 * Setup Farragna Feed Routes
 * @param {express.Router} app - Express app or router
 */
function setupFarragniFeedRoutes(app) {
  
  /**
   * GET /api/videos/feed
   * Get video feed with optional search query
   */
  app.get('/api/videos/feed', async (req, res) => {
    try {
      const count = Math.min(parseInt(req.query.count) || 20, 100);
      const query = req.query.query || '';
      
      console.log(`📹 Feed request: ${count} videos, query="${query}"`);
      
      const videos = await feedAPI.getFeed({ count, query });
      
      const videosWithAttribution = videos.map(video => ({
        ...video,
        attribution: feedAPI.getAttribution(video)
      }));
      
      res.json({
        success: true,
        count: videosWithAttribution.length,
        videos: videosWithAttribution
      });
    } catch (error) {
      console.error('Feed error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/videos/trending
   * Get trending videos from all sources
   */
  app.get('/api/videos/trending', async (req, res) => {
    try {
      const count = Math.min(parseInt(req.query.count) || 30, 100);
      console.log(`🔥 Trending request: ${count} videos`);
      
      const videos = await feedAPI.getTrending({ count });
      
      const videosWithAttribution = videos.map(video => ({
        ...video,
        attribution: feedAPI.getAttribution(video)
      }));
      
      res.json({
        success: true,
        count: videosWithAttribution.length,
        videos: videosWithAttribution
      });
    } catch (error) {
      console.error('Trending error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/videos/health
   * Check health status of all video APIs
   */
  app.get('/api/videos/health', async (req, res) => {
    try {
      console.log('🏥 Health check request');
      const health = await feedAPI.health();
      
      const allHealthy = Object.values(health).every(status => 
        status.includes('OK')
      );
      
      res.json({
        success: true,
        status: allHealthy ? 'healthy' : 'degraded',
        apis: health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Health check error:', error.message);
      res.status(500).json({ success: false, status: 'error', error: error.message });
    }
  });

  /**
   * GET /api/videos/stats
   * Get feed statistics and metrics
   */
  app.get('/api/videos/stats', (req, res) => {
    try {
      const stats = feedAPI.getStats();
      res.json({ success: true, stats, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Stats error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/videos/prefetch
   * Prefetch next videos to warm cache
   */
  app.post('/api/videos/prefetch', async (req, res) => {
    try {
      const currentIndex = req.body.currentIndex || 0;
      const count = req.body.count || 2;
      console.log(`⚡ Prefetch request: from index ${currentIndex}, count ${count}`);
      
      const result = await feedAPI.prefetchNext(currentIndex, count);
      res.json({ success: true, prefetch: result });
    } catch (error) {
      console.error('Prefetch error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/videos/search/:query
   * Search videos by query
   */
  app.get('/api/videos/search/:query', async (req, res) => {
    try {
      const query = req.params.query;
      const count = Math.min(parseInt(req.query.count) || 20, 100);
      console.log(`🔍 Search request: "${query}", count=${count}`);
      
      const videos = await feedAPI.getFeed({ query, count });
      
      const videosWithAttribution = videos.map(video => ({
        ...video,
        attribution: feedAPI.getAttribution(video)
      }));
      
      res.json({
        success: true,
        query,
        count: videosWithAttribution.length,
        videos: videosWithAttribution
      });
    } catch (error) {
      console.error('Search error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  console.log('✅ Farragna Feed routes initialized');
}

module.exports = setupFarragniFeedRoutes;
