// Freemium Video Seed System for Farragna
// Implements automatic video seeding using Pexels API

const PEXELS_API_KEY = 'YOUR_PEXELS_API_KEY'; // Replace with actual API key
const FARRAGNA_API_BASE = '/api/videos';

class VideoSeeder {
  constructor() {
    this.seedVideos = [];
    this.isSeeding = false;
  }

  async loadSeedVideos() {
    console.log('[Farragna] Seed videos: Starting import...');
    
    if (this.isSeeding) {
      console.log('[Farragna] Seed videos: Already seeding, skipping...');
      return;
    }

    this.isSeeding = true;

    try {
      // Try Pexels API first
      const pexelsVideos = await this.fetchPexelsVideos();
      if (pexelsVideos.length > 0) {
        console.log(`[Farragna] Seed videos: Loaded ${pexelsVideos.length} videos from Pexels`);
        await this.importVideos(pexelsVideos, 'pexels');
        this.isSeeding = false;
        return;
      }

      // Fallback to Pixabay API
      const pixabayVideos = await this.fetchPixabayVideos();
      if (pixabayVideos.length > 0) {
        console.log(`[Farragna] Seed videos: Loaded ${pixabayVideos.length} videos from Pixabay`);
        await this.importVideos(pixabayVideos, 'pixabay');
        this.isSeeding = false;
        return;
      }

      // Fallback to sample public MP4 feeds
      const sampleVideos = await this.fetchSampleVideos();
      if (sampleVideos.length > 0) {
        console.log(`[Farragna] Seed videos: Loaded ${sampleVideos.length} sample videos`);
        await this.importVideos(sampleVideos, 'sample');
        this.isSeeding = false;
        return;
      }

      console.log('[Farragna] Seed videos: No videos available from any source');
      
    } catch (error) {
      console.error('[Farragna] Seed videos error:', error);
    } finally {
      this.isSeeding = false;
    }
  }

  async fetchPexelsVideos() {
    try {
      const response = await fetch('https://api.pexels.com/videos/popular?per_page=20', {
        headers: {
          'Authorization': PEXELS_API_KEY
        }
      });

      if (!response.ok) {
        console.warn('[Farragna] Pexels API request failed:', response.status);
        return [];
      }

      const data = await response.json();
      return data.videos.map(v => ({
        id: "seed_pexels_" + v.id,
        url: v.video_files[0].link,
        caption: v.user.name || 'Pexels Video',
        source: "pexels",
        category: "entertainment"
      }));
    } catch (error) {
      console.error('[Farragna] Pexels API error:', error);
      return [];
    }
  }

  async fetchPixabayVideos() {
    try {
      const response = await fetch('https://pixabay.com/api/videos/?key=YOUR_PIXABAY_API_KEY&q=popular&per_page=20');
      
      if (!response.ok) {
        console.warn('[Farragna] Pixabay API request failed:', response.status);
        return [];
      }

      const data = await response.json();
      return data.hits.map(v => ({
        id: "seed_pixabay_" + v.id,
        url: v.videos.medium.url,
        caption: v.user || 'Pixabay Video',
        source: "pixabay",
        category: "entertainment"
      }));
    } catch (error) {
      console.error('[Farragna] Pixabay API error:', error);
      return [];
    }
  }

  async fetchSampleVideos() {
    // Sample public MP4 feeds
    const sampleUrls = [
      'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4'
    ];

    return sampleUrls.map((url, index) => ({
      id: "seed_sample_" + index,
      url: url,
      caption: `Sample Video ${index + 1}`,
      source: "sample",
      category: "entertainment"
    }));
  }

  async importVideos(videos, source) {
    try {
      const response = await fetch(`${FARRAGNA_API_BASE}/import-samples`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          urls: videos.map(v => v.url),
          category: 'entertainment'
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log(`[Farragna] Seed videos: Successfully imported ${result.count} videos from ${source}`);
        return true;
      } else {
        console.error('[Farragna] Seed videos: Import failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[Farragna] Seed videos: Import error:', error);
      return false;
    }
  }

  async checkAndSeed() {
    try {
      // Check if feed is empty
      const feedResponse = await fetch('/api/farragna/feed');
      const feedData = await feedResponse.json().catch(() => ({ videos: [] }));
      const feedVideos = feedData.videos || [];

      const trendingResponse = await fetch('/api/farragna/trending');
      const trendingData = await trendingResponse.json().catch(() => ({ videos: [] }));
      const trendingVideos = trendingData.videos || [];

      const hasVideos = feedVideos.length > 0 || trendingVideos.length > 0;

      if (!hasVideos) {
        console.log('[Farragna] Feed is empty, starting seed video import...');
        await this.loadSeedVideos();
      } else {
        console.log('[Farragna] Feed has videos, skipping seed import');
      }
    } catch (error) {
      console.error('[Farragna] Seed check error:', error);
    }
  }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoSeeder;
} else {
  window.VideoSeeder = VideoSeeder;
}