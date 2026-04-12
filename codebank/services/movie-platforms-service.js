/**
 * movie-platforms-service.js
 * Multi-platform streaming service manager
 * Handles domain rotation, mirroring, and free API access for streaming platforms
 */

window.moviePlatforms = {
  
  /* Platform configurations with free mirrors and APIs */
  platforms: {
    'netflix': {
      name: 'Netflix',
      url: 'https://www.netflix.com',
      mirrors: [
        'https://netflix.com',
        'https://www.netflix.com'
      ],
      canEmbed: false,
      freeApi: null,
      note: 'Subscription required - opens in new tab'
    },
    
    'alostoora': {
      name: 'Alostoora (العسطورة)',
      url: 'https://alostoora.tv',
      mirrors: [
        'https://alostoora.tv',
        'https://alostoora.online',
        'https://alostoora.app'
      ],
      canEmbed: true,
      freeApi: 'https://api.alostoora.tv/content',
      note: 'Free Arabic movies & series'
    },
    
    'mediaon': {
      name: 'MediaOn',
      url: 'https://mediaon.tv',
      mirrors: [
        'https://mediaon.tv',
        'https://www.mediaon.tv',
        'https://mediaon.online'
      ],
      canEmbed: true,
      freeApi: 'https://api.mediaon.tv/live',
      note: 'Free Arabic live TV'
    },
    
    'shahid': {
      name: 'Shahid',
      url: 'https://shahid.mbc.net',
      mirrors: [
        'https://shahid.mbc.net',
        'https://www.shahid.mbc.net'
      ],
      canEmbed: false,
      freeApi: 'https://api.shahid.mbc.net/shows',
      note: 'MBC Arabic content'
    },
    
    'tubi': {
      name: 'Tubi',
      url: 'https://tubitv.com',
      mirrors: [
        'https://tubitv.com',
        'https://tubi.tv'
      ],
      canEmbed: true,
      freeApi: 'https://api.tubi.io/v1/discover',
      note: 'Free movies with ads'
    },
    
    'plutotv': {
      name: 'Pluto TV',
      url: 'https://pluto.tv',
      mirrors: [
        'https://pluto.tv',
        'https://www.pluto.tv'
      ],
      canEmbed: true,
      freeApi: 'https://api.pluto.tv/v2/channels',
      note: 'Free live TV channels'
    },
    
    'crackle': {
      name: 'Crackle',
      url: 'https://www.crackle.com',
      mirrors: [
        'https://crackle.com',
        'https://www.crackle.com'
      ],
      canEmbed: true,
      freeApi: null,
      note: 'Free Sony movies'
    },
    
    'popcornflix': {
      name: 'Popcornflix',
      url: 'https://www.popcornflix.com',
      mirrors: [
        'https://popcornflix.com',
        'https://www.popcornflix.com'
      ],
      canEmbed: true,
      freeApi: null,
      note: 'Free indie movies'
    },
    
    'vudu': {
      name: 'Vudu',
      url: 'https://www.vudu.com',
      mirrors: [
        'https://vudu.com',
        'https://www.vudu.com'
      ],
      canEmbed: true,
      freeApi: null,
      note: 'Free + rental movies'
    },
    
    'plex': {
      name: 'Plex',
      url: 'https://app.plex.tv',
      mirrors: [
        'https://plex.tv',
        'https://app.plex.tv'
      ],
      canEmbed: true,
      freeApi: null,
      note: 'Free movies & your library'
    },
    
    'imdbtv': {
      name: 'IMDb TV',
      url: 'https://www.imdb.com/tv',
      mirrors: [
        'https://imdb.com/tv',
        'https://www.imdb.com/tv'
      ],
      canEmbed: false,
      freeApi: 'https://api.imdb.com/free',
      note: 'Free Amazon movies'
    },
    
    'crunchyroll': {
      name: 'Crunchyroll',
      url: 'https://www.crunchyroll.com',
      mirrors: [
        'https://crunchyroll.com',
        'https://www.crunchyroll.com'
      ],
      canEmbed: false,
      freeApi: null,
      note: 'Anime streaming'
    },
    
    'funimation': {
      name: 'Funimation',
      url: 'https://www.funimation.com',
      mirrors: [
        'https://funimation.com',
        'https://www.funimation.com'
      ],
      canEmbed: false,
      freeApi: null,
      note: 'Dubbed anime'
    }
  },
  
  /**
   * Get working URL for a platform
   */
  async getWorkingUrl(platformId) {
    const platform = this.platforms[platformId];
    if (!platform) return null;
    
    // Check cache first
    const cached = localStorage.getItem(`movie_${platformId}_url`);
    if (cached) {
      const isAlive = await this.checkMirror(cached);
      if (isAlive) return cached;
    }
    
    // Try each mirror
    for (const mirror of platform.mirrors) {
      const isWorking = await this.checkMirror(mirror);
      if (isWorking) {
        localStorage.setItem(`movie_${platformId}_url`, mirror);
        return mirror;
      }
    }
    
    return platform.url; // Fallback to primary
  },
  
  /**
   * Check if a URL is accessible
   */
  async checkMirror(url) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      return true;
    } catch (e) {
      return false;
    }
  },
  
  /**
   * Get featured content from a platform (via free API if available)
   */
  async getContent(platformId) {
    const platform = this.platforms[platformId];
    if (!platform || !platform.freeApi) return [];
    
    try {
      const response = await fetch(platform.freeApi, {
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn(`[MoviePlatforms] Could not fetch content from ${platformId}:`, e);
    }
    return [];
  },
  
  /**
   * Get all available platforms
   */
  getAllPlatforms() {
    return Object.entries(this.platforms).map(([id, config]) => ({
      id,
      ...config
    }));
  },
  
  /**
   * Get free platforms only
   */
  getFreePlatforms() {
    return Object.entries(this.platforms)
      .filter(([_, config]) => config.note && config.note.toLowerCase().includes('free'))
      .map(([id, config]) => ({
        id,
        ...config
      }));
  },
  
  /**
   * Search across all platforms
   */
  async search(query) {
    const results = [];
    
    for (const [platformId, platform] of Object.entries(this.platforms)) {
      if (platform.freeApi) {
        try {
          const content = await this.getContent(platformId);
          const filtered = content.filter(item => 
            (item.title?.toLowerCase().includes(query.toLowerCase())) ||
            (item.name?.toLowerCase().includes(query.toLowerCase()))
          );
          results.push({
            platform: platform.name,
            platformId,
            items: filtered
          });
        } catch (e) {
          // Silently skip platforms without working API
        }
      }
    }
    
    return results;
  },
  
  /**
   * Get recommended content (trending/popular)
   */
  async getTrending() {
    const freePlatforms = this.getFreePlatforms();
    const trending = {};
    
    for (const platform of freePlatforms) {
      try {
        const content = await this.getContent(platform.id);
        trending[platform.id] = {
          platform: platform.name,
          items: content.slice(0, 5) // Top 5
        };
      } catch (e) {
        // Skip on error
      }
    }
    
    return trending;
  },
  
  /**
   * Check which platforms support embedding
   */
  getEmbeddablePlatforms() {
    return Object.entries(this.platforms)
      .filter(([_, config]) => config.canEmbed)
      .map(([id, config]) => ({
        id,
        ...config
      }));
  }
};

// Pre-initialize on load
window.addEventListener('load', async () => {
  console.log('[MoviePlatforms] Initialized with', 
    Object.keys(window.moviePlatforms.platforms).length, 'platforms');
});
