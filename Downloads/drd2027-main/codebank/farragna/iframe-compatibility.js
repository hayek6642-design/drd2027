// Bankode Iframe Compatibility Layer for Farragna
// Ensures Farragna works properly inside the Bankode iframe environment

class FarragnaIframeBridge {
  constructor() {
    this.isInIframe = window.self !== window.top;
    this.parentBridge = null;
    this.localFeed = [];
    this.guestMode = true;
  }

  async initialize() {
    console.log('[Farragna] Initializing iframe compatibility...');
    
    if (this.isInIframe) {
      console.log('[Farragna] Detected iframe environment, setting up bridge...');
      await this.setupParentBridge();
    } else {
      console.log('[Farragna] Running in standalone mode');
    }
    
    // Ensure guest mode is enabled
    this.enableGuestMode();
    
    console.log('[Farragna] Iframe compatibility initialized');
  }

  async setupParentBridge() {
    return new Promise((resolve) => {
      // Listen for messages from parent
      window.addEventListener('message', (event) => {
        // Check if message is from expected origin (relaxed for Bankode)
        if (event.data && event.data.type === 'BANKODE_BRIDGE_READY') {
          this.parentBridge = event.source;
          console.log('[Farragna] Parent bridge connected');
          resolve();
        }
        
        if (event.data && event.data.type === 'BANKODE_FEED_DATA') {
          this.handleFeedData(event.data.payload);
        }
      });

      // Request bridge connection
      if (window.top) {
        try {
          window.top.postMessage({
            type: 'FARRAGNA_BRIDGE_REQUEST',
            payload: { timestamp: Date.now() }
          }, '*');
        } catch (error) {
          console.warn('[Farragna] Could not connect to parent bridge:', error);
        }
      }

      // Fallback after 2 seconds
      setTimeout(() => {
        if (!this.parentBridge) {
          console.log('[Farragna] No parent bridge available, using local storage');
          resolve();
        }
      }, 2000);
    });
  }

  enableGuestMode() {
    // Override any authentication checks to use guest mode
    this.guestMode = true;
    
    // Mock authentication API responses
    this.mockAuthAPI();
    
    console.log('[Farragna] Guest mode enabled');
  }

  mockAuthAPI() {
    // Intercept fetch requests to auth endpoints and return guest responses
    const originalFetch = window.fetch;
    
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      
      // Mock auth user endpoint
      if (url.includes('/api/auth/user')) {
        return new Response(JSON.stringify(null), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Mock logout endpoint
      if (url.includes('/api/logout')) {
        return new Response(JSON.stringify({ message: 'Logged out successfully' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Pass through other requests
      return originalFetch(input, init);
    };
  }

  handleFeedData(data) {
    console.log('[Farragna] Received feed data from parent:', data);
    this.localFeed = data.videos || [];
    
    // Trigger feed refresh if needed
    if (window.refreshFeed) {
      window.refreshFeed();
    }
  }

  async getFeed() {
    if (this.parentBridge) {
      // Request feed from parent
      this.parentBridge.postMessage({
        type: 'FARRAGNA_GET_FEED',
        payload: { timestamp: Date.now() }
      }, '*');
      
      // Return cached feed while waiting
      return this.localFeed;
    }
    
    // Use local storage as fallback
    return this.getLocalFeed();
  }

  async getLocalFeed() {
    try {
      // Use localStorage instead of IndexedDB
      const feedData = localStorage.getItem('farragna_feed');
      if (feedData) {
        return JSON.parse(feedData);
      }
    } catch (error) {
      console.warn('[Farragna] Could not read local feed:', error);
    }
    
    return [];
  }

  async setLocalFeed(feed) {
    try {
      localStorage.setItem('farragna_feed', JSON.stringify(feed));
    } catch (error) {
      console.warn('[Farragna] Could not save local feed:', error);
    }
  }

  async addVideoToFeed(video) {
    if (this.parentBridge) {
      this.parentBridge.postMessage({
        type: 'FARRAGNA_ADD_VIDEO',
        payload: video
      }, '*');
    } else {
      // Add to local storage
      const currentFeed = await this.getLocalFeed();
      currentFeed.unshift(video);
      await this.setLocalFeed(currentFeed);
      
      // Trigger refresh
      if (window.refreshFeed) {
        window.refreshFeed();
      }
    }
  }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FarragnaIframeBridge;
} else {
  window.FarragnaIframeBridge = FarragnaIframeBridge;
}