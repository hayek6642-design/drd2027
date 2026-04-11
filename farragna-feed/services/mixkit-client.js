/**
 * ==============================
 * 🎬 MIXKIT VIDEO CLIENT
 * ==============================
 * Fetches videos from Mixkit (no API key needed)
 * Simple REST API, no auth required
 */

const axios = require('axios');
const config = require('../config/api-keys');

class MixkitClient {
  constructor() {
    this.config = config.mixkit;
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'User-Agent': this.config.userAgent
      }
    });
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.minStartTime = Date.now();
  }

  /**
   * Search videos on Mixkit
   * @param {object} options - Search options
   * @returns {Promise<Array>} Video metadata
   */
  async searchVideos(options = {}) {
    await this._checkRateLimit();

    try {
      const params = {
        per_page: options.per_page || 15,
        page: options.page || 1
      };

      const response = await this.client.get('', { params });
      
      const videos = (response.data.data || []).map(video => ({
        id: `mixkit_${video.id}`,
        title: video.title || 'Mixkit Video',
        source: 'mixkit',
        url: video.filepath,
        thumbnail: video.thumbnail_url || video.screenshot,
        duration: video.duration || 0,
        width: video.width || 1920,
        height: video.height || 1080,
        attributes: {
          description: video.description || '',
          tags: video.tags || [],
          mixkit_url: `https://mixkit.co/free-stock-video/${video.slug || video.id}/`,
          license: 'Free for use'
        }
      }));

      this.requestCount++;
      return videos;
    } catch (error) {
      console.error('Mixkit API error:', error.message);
      throw error;
    }
  }

  /**
   * Get videos by category
   */
  async getByCategory(category, options = {}) {
    return this.searchVideos({
      ...options,
      per_page: options.per_page || 20
    });
  }

  /**
   * Get trending videos
   */
  async getTrending(options = {}) {
    return this.searchVideos({
      page: 1,
      per_page: options.per_page || 20,
      ...options
    });
  }

  /**
   * Rate limiting check (60 req/min)
   */
  async _checkRateLimit() {
    const now = Date.now();
    
    if (now - this.minStartTime > 60000) {
      this.minStartTime = now;
      this.requestCount = 0;
    }

    if (this.requestCount >= this.config.rateLimit.requestsPerMin) {
      const waitTime = 60000 - (now - this.minStartTime);
      throw new Error(`Mixkit rate limit exceeded. Wait ${waitTime}ms before next request.`);
    }

    const minInterval = 1000 / (this.config.rateLimit.requestsPerMin / 60);
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, minInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * No authentication needed for Mixkit
   */
  getAuthStatus() {
    return {
      authenticated: true,
      status: 'No auth required (public API)'
    };
  }
}

module.exports = MixkitClient;
