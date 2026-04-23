/**
 * YouTube API Manager - Handles YouTube IFrame API loading and initialization
 * Freeze-Guard Compatible - Production Safe
 */

class YouTubeAPIManager {
    constructor() {
        this.apiLoaded = false;
        this.apiLoading = false;
        this.playerReady = false;
        this.player = null;
        this.readyCallbacks = [];
        this.errorCallbacks = [];
        this.apiLoadPromise = null;
    }

    /**
     * Load YouTube IFrame API exactly once
     */
    async loadAPI() {
        // Return existing promise if already loading
        if (this.apiLoadPromise) {
            return this.apiLoadPromise;
        }

        // Return resolved promise if already loaded
        if (this.apiLoaded && window.YT && window.YT.Player) {
            return Promise.resolve();
        }

        this.apiLoadPromise = new Promise((resolve, reject) => {
            // Check if API is already loaded
            if (window.YT && window.YT.Player) {
                console.log('[YouTube API] Already loaded');
                this.apiLoaded = true;
                resolve();
                return;
            }

            // Check if script is already in DOM
            const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
            if (existingScript) {
                console.log('[YouTube API] Script already in DOM, waiting for load');
                this.waitForAPILoad(resolve, reject);
                return;
            }

            // Prevent multiple loading attempts
            if (this.apiLoading) {
                console.log('[YouTube API] Load already in progress');
                this.waitForAPILoad(resolve, reject);
                return;
            }

            this.apiLoading = true;
            console.log('[YouTube API] Loading iframe API script...');

            // Create and inject script
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.async = true;
            script.defer = true;
            script.dataset.ytApiManager = 'true';

            script.onload = () => {
                console.log('[YouTube API] Script loaded successfully');
                this.waitForAPILoad(resolve, reject);
            };

            script.onerror = (error) => {
                console.error('[YouTube API] Failed to load script:', error);
                this.apiLoading = false;
                reject(new Error('Failed to load YouTube API script'));
            };

            document.head.appendChild(script);

            // Timeout fallback
            setTimeout(() => {
                if (!this.apiLoaded) {
                    console.error('[YouTube API] Load timeout');
                    this.apiLoading = false;
                    reject(new Error('YouTube API load timeout'));
                }
            }, 10000);
        });

        return this.apiLoadPromise;
    }

    /**
     * Wait for YouTube API to be fully ready
     */
    waitForAPILoad(resolve, reject) {
        const checkAPI = () => {
            if (window.YT && window.YT.Player) {
                console.log('[YouTube API] API ready');
                this.apiLoaded = true;
                this.apiLoading = false;

                // Set up global ready handler
                if (!window.onYouTubeIframeAPIReady) {
                    window.onYouTubeIframeAPIReady = () => {
                        console.log('[YouTube API] onYouTubeIframeAPIReady called');
                        this.playerReady = true;
                        this.executeReadyCallbacks();
                    };
                } else {
                    console.warn('[YouTube API] onYouTubeIframeAPIReady already exists');
                }

                resolve();
            } else {
                // Continue checking
                setTimeout(checkAPI, 100);
            }
        };

        checkAPI();
    }

    /**
     * Create YouTube player with safe configuration - Enhanced to prevent unnecessary recreation
     */
    async createPlayer(containerId, videoId, options = {}) {
        try {   
            // Enhanced Guard: Check if player already exists and is working
            if (this.player && typeof this.player.getPlayerState === 'function') {
                try {   
                    const currentState = this.player.getPlayerState();
                    // If player exists and is in a valid state, just update content instead of recreating
                    if (currentState !== undefined && videoId) {
                        console.log('[YouTube Player] Player exists, updating content instead of recreating');
                        return this.updatePlayerContent(videoId, options);
                    }
                } catch (e) {
                    console.warn('[YouTube Player] Existing player check failed, will recreate:', e);
                    // Continue with recreation if check fails
                }
            }

            // Ensure API is loaded
            await this.loadAPI();

            // Wait for API ready if not already
            if (!this.playerReady) {
                await this.waitForPlayerReady();
            }

            // Get container element safely
            const container = window.DOMUtils ? window.DOMUtils.safeGetElement(containerId, true) : document.getElementById(containerId);
            if (!container) {
                throw new Error(`Player container '${containerId}' not found`);
            }

            // Default player configuration
            const defaultConfig = {
                height: '100%',
                width: '100%',
                playerVars: {
                    controls: 0,
                    disablekb: 1,
                    autoplay: 1,
                    modestbranding: 1,
                    rel: 0,
                    fs: 0,
                    iv_load_policy: 3,
                    loop: 1,
                    playsinline: 1,
                    enablejsapi: 1
                },
                events: {
                    onReady: (event) => this.handlePlayerReady(event),
                    onStateChange: (event) => this.handlePlayerStateChange(event),
                    onError: (event) => this.handlePlayerError(event)
                }
            };

            // Merge with provided options
            const config = { ...defaultConfig, ...options };

            // Set video ID if provided
            if (videoId) {
                if (videoId.startsWith('PL')) {
                    // Playlist
                    config.playerVars.listType = 'playlist';
                    config.playerVars.list = videoId;
                } else {
                    // Single video
                    config.videoId = videoId;
                    config.playerVars.playlist = videoId;
                }
            }

            console.log('[YouTube Player] Creating player with config:', config);

            // Only destroy existing player if it's completely broken
            if (this.player && typeof this.player.destroy === 'function') {
                try {   
                    // Test if player is actually working before destroying
                    this.player.getPlayerState();
                    console.log('[YouTube Player] Keeping existing player, updating content');
                    return this.updatePlayerContent(videoId, options);
                } catch (e) {
                    console.log('[YouTube Player] Existing player is broken, recreating');
                    try {   
                        this.player.destroy();
                    } catch (destroyError) {
                        console.warn('[YouTube Player] Error destroying broken player:', destroyError);
                    }
                }
            }

            // Create player
            this.player = new YT.Player(containerId, config);

            return this.player;

        } catch (error) {
            console.error('[YouTube Player] Creation failed:', error);
            this.executeErrorCallbacks(error);
            throw error;
        }
    }

    /**
     * Update player content without recreating the entire player
     */
    updatePlayerContent(videoId, options = {}) {
        if (!this.player || typeof this.player.loadVideoById !== 'function') {
            console.warn('[YouTube Player] Cannot update content, player not ready');
            return Promise.resolve(this.player);
        }

        return new Promise((resolve, reject) => {
            try {   
                if (videoId && videoId.startsWith('PL')) {
                    // It's a playlist
                    console.log('[YouTube Player] Loading playlist without recreation:', videoId);
                    this.player.loadPlaylist({
                        listType: 'playlist',
                        list: videoId
                    });
                } else {
                    // It's a single video
                    console.log('[YouTube Player] Loading video without recreation:', videoId);
                    this.player.loadVideoById(videoId);
                }
                resolve(this.player);
            } catch (error) {
                console.error('[YouTube Player] Content update failed:', error);
                reject(error);
            }
        });
    }

    /**
     * Wait for player to be ready
     */
    waitForPlayerReady() {
        return new Promise((resolve) => {
            if (this.playerReady) {
                resolve();
                return;
            }

            this.readyCallbacks.push(resolve);
        });
    }

    /**
     * Handle player ready event
     */
    handlePlayerReady(event) {
        console.log('[YouTube Player] Player ready');
        this.player = event.target;

        // Execute ready callbacks
        this.executeReadyCallbacks();
    }

    /**
     * Handle player state change
     */
    handlePlayerStateChange(event) {
        // Override in implementation if needed
        if (window.onPlayerStateChange) {
            window.onPlayerStateChange(event);
        }
    }

    /**
     * Handle player error
     */
    handlePlayerError(event) {
        console.error('[YouTube Player] Error:', event.data);

        // Execute error callbacks
        this.executeErrorCallbacks(event);
    }

    /**
     * Execute ready callbacks
     */
    executeReadyCallbacks() {
        while (this.readyCallbacks.length > 0) {
            const callback = this.readyCallbacks.shift();
            try {   
                callback();
            } catch (error) {
                console.error('[YouTube API] Error in ready callback:', error);
            }
        }
    }

    /**
     * Execute error callbacks
     */
    executeErrorCallbacks(error) {
        while (this.errorCallbacks.length > 0) {
            const callback = this.errorCallbacks.shift();
            try {   
                callback(error);
            } catch (err) {
                console.error('[YouTube API] Error in error callback:', err);
            }
        }
    }

    /**
     * Add ready callback
     */
    onReady(callback) {
        if (typeof callback === 'function') {
            if (this.playerReady) {
                callback();
            } else {
                this.readyCallbacks.push(callback);
            }
        }
    }

    /**
     * Add error callback
     */
    onError(callback) {
        if (typeof callback === 'function') {
            this.errorCallbacks.push(callback);
        }
    }

    /**
     * Get current player instance
     */
    getPlayer() {
        return this.player;
    }

    /**
     * Check if API is loaded
     */
    isAPILoaded() {
        return this.apiLoaded;
    }

    /**
     * Check if player is ready
     */
    isPlayerReady() {
        return this.playerReady;
    }
}

// Create singleton instance
const youtubeAPIManager = new YouTubeAPIManager();

// Export globally
window.YouTubeAPIManager = youtubeAPIManager;

// Export for ES modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = youtubeAPIManager;
}