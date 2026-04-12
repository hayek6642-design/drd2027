/**
 * yacine-service.js
 * Domain rotator for Yacine Live sports streaming
 * Handles mirror rotation, load balancing, and iframe compatibility
 */

window.yacineService = {
  
  /* Domain mirrors for Yacine Live */
  mirrors: [
    'https://yacinelive.tv',
    'https://yacinelive.app',
    'https://yacine.vercel.app',
    'https://yacine-stream.netlify.app',
    'https://yacine-live.web.app',
    'https://yacinelive.online',
  ],
  
  currentMirrorIndex: 0,
  lastWorkingUrl: localStorage.getItem('yacine_working_url'),
  
  /**
   * Get a working mirror URL for Yacine Live
   * Rotates through mirrors and returns the first working one
   */
  async getWorkingUrl() {
    // Start with last known working URL
    if (this.lastWorkingUrl) {
      const isAlive = await this.checkMirror(this.lastWorkingUrl);
      if (isAlive) return this.lastWorkingUrl;
    }
    
    // Try each mirror
    for (let i = 0; i < this.mirrors.length; i++) {
      const url = this.mirrors[i];
      const isWorking = await this.checkMirror(url);
      if (isWorking) {
        localStorage.setItem('yacine_working_url', url);
        this.lastWorkingUrl = url;
        return url;
      }
    }
    
    // Fallback to primary if all fail
    console.warn('[YacineService] All mirrors down, using primary');
    return this.mirrors[0];
  },
  
  /**
   * Check if a mirror URL is accessible
   */
  async checkMirror(url) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      // In no-cors mode, we can't check status, but if fetch succeeds it's likely up
      return true;
    } catch (e) {
      return false;
    }
  },
  
  /**
   * Get stream info for a match (via free public API if available)
   */
  async getMatches() {
    try {
      // Try to fetch live matches from a free API endpoint
      const response = await fetch(this.lastWorkingUrl + '/api/matches', {
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('[YacineService] Could not fetch matches:', e);
    }
    return [];
  },
  
  /**
   * Get stream URL for a specific match
   */
  async getStreamUrl(matchId) {
    try {
      const response = await fetch(`${this.lastWorkingUrl}/api/stream/${matchId}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('[YacineService] Could not fetch stream:', e);
    }
    return null;
  },
  
  /**
   * Format match info for display
   */
  formatMatch(match) {
    return {
      id: match.id,
      title: `${match.team1 || 'Team A'} vs ${match.team2 || 'Team B'}`,
      league: match.league || 'Sports',
      time: match.time || 'Live',
      status: match.status || 'upcoming',
      icon: '⚽'
    };
  },
  
  /**
   * Cache last working state
   */
  cacheWorkingState(url) {
    localStorage.setItem('yacine_working_url', url);
    localStorage.setItem('yacine_last_check', new Date().toISOString());
  }
};

// Pre-check working URL on load
window.addEventListener('load', async () => {
  if (!window.yacineService.lastWorkingUrl) {
    const working = await window.yacineService.getWorkingUrl();
    console.log('[YacineService] Initialized with:', working);
  }
});
