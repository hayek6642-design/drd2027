/**
 * Feed API
 * Fetches video feed from Pexels, Pixabay, and Mixkit
 */

class FeedAPI {
  constructor() {
    this.cacheKey = 'farragna_video_cache';
    this.cacheDuration = 1000 * 60 * 60; // 1 hour
    this.baseUrl = '/api/feed';
    console.log('[FeedAPI] Initialized');
  }
  
  /**
   * Get cached videos or fetch from API
   */
  async getVideos(limit = 10, offset = 0) {
    try {
      // Try to get from cache first
      const cached = this.getFromCache();
      if (cached && cached.length > 0) {
        console.log(`[FeedAPI] Returning ${cached.length} cached videos`);
        return cached.slice(offset, offset + limit);
      }
      
      // Fetch from server API
      const response = await fetch(`${this.baseUrl}?limit=${limit}&offset=${offset}`);
      
      if (!response.ok) {
        throw new Error(`Feed API error: ${response.status}`);
      }
      
      const data = await response.json();
      const videos = data.videos || [];
      
      // Cache the results
      this.saveToCache(videos);
      
      console.log(`[FeedAPI] Fetched ${videos.length} videos from API`);
      return videos;
    } catch (error) {
      console.error('[FeedAPI] Error fetching videos:', error);
      // Return sample videos on error
      return this.getSampleVideos();
    }
  }
  
  /**
   * Get a single video by ID
   */
  async getVideo(id) {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      if (!response.ok) {
        throw new Error(`Video not found: ${id}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[FeedAPI] Error fetching video:', error);
      return null;
    }
  }
  
  /**
   * Search for videos
   */
  async search(query, limit = 10) {
    try {
      const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[FeedAPI] Error searching videos:', error);
      return [];
    }
  }
  
  /**
   * Save videos to cache
   */
  saveToCache(videos) {
    try {
      const cacheData = {
        videos: videos,
        timestamp: Date.now()
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      console.log(`[FeedAPI] Cached ${videos.length} videos`);
    } catch (error) {
      console.warn('[FeedAPI] Cache save error:', error);
    }
  }
  
  /**
   * Get videos from cache if still valid
   */
  getFromCache() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      const age = Date.now() - data.timestamp;
      
      if (age < this.cacheDuration) {
        return data.videos || [];
      }
      
      // Cache expired
      localStorage.removeItem(this.cacheKey);
      return null;
    } catch (error) {
      console.warn('[FeedAPI] Cache read error:', error);
      return null;
    }
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    try {
      localStorage.removeItem(this.cacheKey);
      console.log('[FeedAPI] Cache cleared');
    } catch (error) {
      console.warn('[FeedAPI] Cache clear error:', error);
    }
  }
  
  /**
   * Get sample videos for demo/testing
   */
  getSampleVideos() {
    return [
      {
        id: 'sample_1',
        title: 'Beautiful Sunset',
        source: 'Sample',
        url: 'https://media.w3.org/2016/12/sample.mp4',
        thumbnail: 'https://via.placeholder.com/1080x1920?text=Sample+Video+1',
        duration: 30
      },
      {
        id: 'sample_2',
        title: 'Ocean Waves',
        source: 'Sample',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4',
        thumbnail: 'https://via.placeholder.com/1080x1920?text=Sample+Video+2',
        duration: 45
      },
      {
        id: 'sample_3',
        title: 'Mountain Peak',
        source: 'Sample',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ElephantsDream.mp4',
        thumbnail: 'https://via.placeholder.com/1080x1920?text=Sample+Video+3',
        duration: 50
      }
    ];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FeedAPI;
}
