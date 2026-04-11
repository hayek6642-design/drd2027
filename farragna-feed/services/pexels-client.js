/**
 * ==============================
 * 🎥 PEXELS VIDEO CLIENT
 * ==============================
 * Fetches videos from Pexels API
 * Rate limit: 200 req/hour
 */

const axios = require('axios');
const config = require('../config/api-keys');

class PexelsClient {
  constructor() {
    this.config = config.pexels;
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Authorization': this.config.apiKey
      }
    });
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.hourStartTime = Date.now();
  }

  /**
   * Search videos on Pexels
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Promise<Array>} Video metadata
   */
  async searchVideos(query, options = {}) {
    // Rate limiting: 200 req/hour
    await this._checkRateLimit();

    try {
      const params = {
        query: query || 'nature',
        per_page: options.per_page || 15,
        page: options.page || 1,
        orientation: options.orientation || 'landscape'
      };

      const response = await this.client.get('', { params });
      
      // Extract metadata only (no video blobs)
      const videos = response.data.videos.map(video => ({
        id: `pexels_${video.id}`,
        title: query,
        source: 'pexels',
        url: video.video_files[0].link,
        thumbnail: video.image,
        duration: video.duration,
        width: video.width,
        height: video.height,
        attributes: {
          photographer: video.user?.name || 'Pexels',
          user_url: video.user?.url || '',
          pexels_url: video.url
        }
      }));

      this.requestCount++;
      return videos;
    } catch (error) {
      console.error('Pexels API error:', error.message);
      throw error;
    }
  }

  /**
   * Rate limiting check
   */
  async _checkRateLimit() {
    const now = Date.now();
    
    // Reset hour counter if needed
    if (now - this.hourStartTime > 3600000) {
      this.hourStartTime = now;
      this.requestCount = 0;
    }

    // Check if we've hit the limit
    if (this.requestCount >= this.config.rateLimit.requestsPerHour) {
      const waitTime = 3600000 - (now - this.hourStartTime);
      throw new Error(`Pexels rate limit exceeded. Wait ${waitTime}ms before next request.`);
    }

    // Simple throttling
    const minInterval = 1000 / (this.config.rateLimit.requestsPerHour / 3600);
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, minInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Get trending videos
   */
  async getTrending(options = {}) {
    const trendingQueries = [
      'nature', 'city', 'travel', 'music', 'dance',
      'technology', 'business', 'food', 'sports', 'lifestyle'
    ];
    
    const randomQuery = trendingQueries[
      Math.floor(Math.random() * trendingQueries.length)
    ];
    
    return this.searchVideos(randomQuery, {
      per_page: options.per_page || 20,
      ...options
    });
  }
}

module.exports = PexelsClient;
