/**
 * ==============================
 * 🎬 FARRAGNA FEED API
 * ==============================
 * Multi-source video feed orchestrator
 * Fallback chain: Pexels → Pixabay → Mixkit
 * Zero-storage architecture
 */

const PexelsClient = require('./pexels-client');
const PixabayClient = require('./pixabay-client');
const MixkitClient = require('./mixkit-client');

class FarragniFeedAPI {
  constructor() {
    this.pexels = new PexelsClient();
    this.pixabay = new PixabayClient();
    this.mixkit = new MixkitClient();
    
    this.stats = {
      totalRequests: 0,
      pexelsRequests: 0,
      pixabayRequests: 0,
      mixkitRequests: 0,
      errors: 0
    };
  }

  /**
   * Get feed with fallback chain
   * Pexels → Pixabay → Mixkit
   */
  async getFeed(options = {}) {
    const query = options.query || '';
    const count = options.count || 20;
    const videos = [];

    try {
      if (videos.length < count) {
        try {
          const pexelsVideos = await this.pexels.searchVideos(query, {
            per_page: count - videos.length
          });
          videos.push(...pexelsVideos);
          this.stats.pexelsRequests++;
          console.log(`✓ Pexels: ${pexelsVideos.length} videos`);
        } catch (error) {
          console.warn(`⚠ Pexels failed: ${error.message}`);
        }
      }

      if (videos.length < count) {
        try {
          const pixabayVideos = await this.pixabay.searchVideos(query, {
            per_page: count - videos.length
          });
          videos.push(...pixabayVideos);
          this.stats.pixabayRequests++;
          console.log(`✓ Pixabay: ${pixabayVideos.length} videos`);
        } catch (error) {
          console.warn(`⚠ Pixabay failed: ${error.message}`);
        }
      }

      if (videos.length < count) {
        try {
          const mixkitVideos = await this.mixkit.searchVideos({
            per_page: count - videos.length
          });
          videos.push(...mixkitVideos);
          this.stats.mixkitRequests++;
          console.log(`✓ Mixkit: ${mixkitVideos.length} videos`);
        } catch (error) {
          console.warn(`⚠ Mixkit failed: ${error.message}`);
        }
      }

      this.stats.totalRequests++;
      return this._shuffleArray(videos).slice(0, count);
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Get trending feed
   */
  async getTrending(options = {}) {
    const count = options.count || 30;
    const videos = [];

    try {
      const [pexelsVids, pixabayVids, mixkitVids] = await Promise.allSettled([
        this.pexels.getTrending({ per_page: 10 }),
        this.pixabay.getTrending({ per_page: 10 }),
        this.mixkit.getTrending({ per_page: 10 })
      ]);

      if (pexelsVids.status === 'fulfilled') {
        videos.push(...pexelsVids.value);
      }
      if (pixabayVids.status === 'fulfilled') {
        videos.push(...pixabayVids.value);
      }
      if (mixkitVids.status === 'fulfilled') {
        videos.push(...mixkitVids.value);
      }

      return this._shuffleArray(videos).slice(0, count);
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Lazy-load next videos (prefetch)
   */
  async prefetchNext(currentIndex = 0, prefetchCount = 2) {
    return {
      prefetchCount,
      status: 'queued'
    };
  }

  /**
   * Add attribution overlay info
   */
  getAttribution(video) {
    const source = video.source.toUpperCase();
    const attr = video.attributes || {};
    
    return {
      text: `Powered by ${source}`,
      position: 'bottom-left',
      opacity: 0.7,
      details: {
        source,
        photographer: attr.photographer || 'Unknown',
        license: attr.license || 'Free License'
      }
    };
  }

  /**
   * Check API health
   */
  async health() {
    const health = {
      pexels: 'checking',
      pixabay: 'checking',
      mixkit: 'checking'
    };

    try {
      await Promise.allSettled([
        this.pexels.searchVideos('test', { per_page: 1 }),
        this.pixabay.searchVideos('test', { per_page: 1 }),
        this.mixkit.searchVideos({ per_page: 1 })
      ]).then(results => {
        health.pexels = results[0].status === 'fulfilled' ? '✓ OK' : '✗ Down';
        health.pixabay = results[1].status === 'fulfilled' ? '✓ OK' : '✗ Down';
        health.mixkit = results[2].status === 'fulfilled' ? '✓ OK' : '✗ Down';
      });
    } catch (error) {
      console.error('Health check error:', error);
    }

    return health;
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.stats,
      cacheSizeBytes: 0,
      storageModel: 'zero-storage (streaming only)'
    };
  }

  /**
   * Utility: Shuffle array
   */
  _shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

module.exports = FarragniFeedAPI;
