// afra7-youtube-bridge.js
// Controls YouTube player mute/unmute via postMessage API

(function() {
    'use strict';
    
    const Afra7YouTubeBridge = {
        player: null,
        isMuted: false,
        originalVolume: 100,
        
        // Initialize - called from yt-player.init.js or section switch
        init: function(playerInstance) {
            this.player = playerInstance;
            console.log('[Afra7Bridge] Initialized with player');
        },
        
        // Mute YouTube video (called when user playlist starts)
        muteVideo: function() {
            if (!this.player) {
                console.warn('[Afra7Bridge] No player available');
                return;
            }
            
            try {
                // Method 1: Direct API call if available
                if (typeof this.player.mute === 'function') {
                    this.player.mute();
                    this.isMuted = true;
                    console.log('[Afra7Bridge] YouTube muted via API');
                }
                
                // Method 2: Set volume to 0 as fallback
                if (typeof this.player.getVolume === 'function') {
                    this.originalVolume = this.player.getVolume();
                }
                if (typeof this.player.setVolume === 'function') {
                    this.player.setVolume(0);
                }
                
                // Dispatch event for other components
                window.dispatchEvent(new CustomEvent('afra7:youtube-muted'));
            } catch (e) {
                console.error('[Afra7Bridge] Error muting:', e);
            }
        },
        
        // Unmute YouTube video (called when user playlist stops)
        unmuteVideo: function() {
            if (!this.player) return;
            
            try {
                if (typeof this.player.unMute === 'function') {
                    this.player.unMute();
                    this.isMuted = false;
                }
                
                // Restore original volume
                if (typeof this.player.setVolume === 'function') {
                    this.player.setVolume(this.originalVolume || 100);
                }
                
                window.dispatchEvent(new CustomEvent('afra7:youtube-unmuted'));
                console.log('[Afra7Bridge] YouTube unmuted');
            } catch (e) {
                console.error('[Afra7Bridge] Error unmuting:', e);
            }
        },
        
        // Check if currently muted
        isYouTubeMuted: function() {
            return this.isMuted;
        }
    };
    
    // Expose globally
    window.Afra7YouTubeBridge = Afra7YouTubeBridge;
    
    // Listen for section changes to auto-unmute when leaving Afra7
    window.addEventListener('section:changed', function(e) {
        const section = e.detail?.section;
        if (section !== 'afra7' && Afra7YouTubeBridge.isYouTubeMuted()) {
            Afra7YouTubeBridge.unmuteVideo();
        }
    });
})();