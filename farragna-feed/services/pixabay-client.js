/**
 * ==============================
 * 🎬 PIXABAY VIDEO CLIENT
 * ==============================
 * Fetches videos from Pixabay API
 * Rate limit: 100 req/min
 * Must cache URLs for 24 hours
 */

const axios = require('axios');
const config = require('../config/api-keys');
const URLCache = require('../cache/url-cache');

class PixabayClient {
  constructor() {
    this.config = config.pixabay;
    this.client = axios.create({
      baseURL: this.config.baseUrl
    });
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.minStartTime = Date.now();
    this.urlCache = new URLCache('pixabay');
  }

  /**
   * Search videos on Pixabay
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Promise<Array>} Video metadata
   */
  async searchVideos(query, options = {}) {
    // Rate limiting: 100 req/min
    await this._checkRateLimit();

    try {
      const params = {
        key: this.config.apiKey,
        q: query || 'nature',
        per_page: options.per_page || 15,
        page: options.page || 1,
        video_type: options.video_type || 'all',
        order: options.order || 'popular'
      };

      const response = await this.client.get('', { params });
      
      // Extract metadata only
      const videos = response.data.hits.map(video => {
        const videoData = {
          id: `pixabay_${video.id}`,
          title: query,
          source: 'pixabay',
          videos: video.videos,
          thumbnail: video.previewURL || video.thumbnailURL,
          duration: video.duration || 0,
          width: video.imageWidth,
          height: video.imageHeight,
          attributes: {
            photographer: video.user || 'Pixabay',
            user_id: video.user_id,
            user_profile: `https://pixabay.com/users/${video.user_id}/`,
            pixabay_url: video.pageURL
          }
        };

        this._cacheVideoUrls(videoData);
        return videoData;
      });

      this.requestCount++;
      return videos;
    } catch (error) {
      console.error('Pixabay API error:', error.message);
      throw error;
    }
  }

  /**
   * Cache video URLs with 24h TTL
   */
  _cacheVideoUrls(videoData) {
    if (videoData.videos) {
      Object.keys(videoData.videos).forEach(quality => {
        const url = videoData.videos[quality];
        if (url) {
          this.urlCache.set(
            `${videoData.id}_${quality}`,
            url,
            this.config.cacheTTL
          );
        }
      });
    }
  }

  /**
   * Get cached video URL or refresh
   */
  async getVideoUrl(videoId, quality = 'medium') {
    const cacheKey = `${videoId}_${quality}`;
    const cached = this.urlCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    console.warn(`Cache miss for ${videoId}, URL may have expired. Consider re-fetching metadata.`);
    return null;
  }

  /**
   * Rate limiting check (100 req/min)
   */
  async _checkRateLimit() {
    const now = Date.now();
    
    // Reset minute counter if needed
    if (now - this.minStartTime > 60000) {
      this.minStartTime = now;
      this.requestCount = 0;
    }

    // Check if we've hit the limit
    if (this.requestCount >= this.config.rateLimit.requestsPerMin) {
      const waitTime = 60000 - (now - this.minStartTime);
      throw new Error(`Pixabay rate limit exceeded. Wait ${waitTime}ms before next request.`);
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
   * Get popular/trending videos
   */
  async getTrending(options = {}) {
    return this.searchVideos('', {
      per_page: options.per_page || 20,
      order: 'popular',
      ...options
    });
  }
}

module.exports = PixabayClient;
