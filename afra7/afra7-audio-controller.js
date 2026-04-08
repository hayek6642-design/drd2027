// afra7-audio-controller.js
// HTML5 Audio player with playlist management

(function() {
    'use strict';
    
    const Afra7AudioController = {
        audio: null,
        playlist: [],
        currentIndex: 0,
        isPlaying: false,
        
        // Initialize audio element
        init: function() {
            this.audio = new Audio();
            this.audio.preload = 'metadata';
            
            // Event listeners
            this.audio.addEventListener('ended', () => this.playNext());
            this.audio.addEventListener('error', (e) => this.handleError(e));
            this.audio.addEventListener('canplay', () => {
                console.log('[Afra7Audio] Track ready:', this.playlist[this.currentIndex]?.title);
            });
            
            console.log('[Afra7Audio] Controller initialized');
        },
        
        // Load playlist from user preferences
        loadPlaylist: function(songsArray) {
            if (!Array.isArray(songsArray) || songsArray.length === 0) {
                console.warn('[Afra7Audio] Empty playlist');
                return false;
            }
            
            this.playlist = songsArray;
            this.currentIndex = 0;
            console.log('[Afra7Audio] Playlist loaded:', songsArray.length, 'tracks');
            return true;
        },
        
        // Play specific track
        playTrack: function(index) {
            if (!this.audio) this.init();
            if (index < 0 || index >= this.playlist.length) return;
            
            const track = this.playlist[index];
            if (!track || !track.url) {
                console.error('[Afra7Audio] Invalid track:', track);
                return;
            }
            
            this.currentIndex = index;
            this.audio.src = track.url;
            this.audio.play().then(() => {
                this.isPlaying = true;
                window.dispatchEvent(new CustomEvent('afra7:track-started', {
                    detail: { track: track, index: index }
                }));
            }).catch(e => {
                console.error('[Afra7Audio] Play failed:', e);
            });
        },
        
        // Play next track
        playNext: function() {
            if (this.currentIndex < this.playlist.length - 1) {
                this.playTrack(this.currentIndex + 1);
            } else {
                // Loop back to start or stop
                this.playTrack(0);
            }
        },
        
        // Play previous track
        playPrevious: function() {
            if (this.currentIndex > 0) {
                this.playTrack(this.currentIndex - 1);
            }
        },
        
        // Pause current playback
        pause: function() {
            if (this.audio) {
                this.audio.pause();
                this.isPlaying = false;
            }
        },
        
        // Resume playback
        resume: function() {
            if (this.audio && this.audio.paused) {
                this.audio.play();
                this.isPlaying = true;
            }
        },
        
        // Stop and clear
        stop: function() {
            if (this.audio) {
                this.audio.pause();
                this.audio.currentTime = 0;
                this.isPlaying = false;
            }
        },
        
        // Get current track info
        getCurrentTrack: function() {
            return this.playlist[this.currentIndex] || null;
        },
        
        // Set volume (0-1)
        setVolume: function(vol) {
            if (this.audio) {
                this.audio.volume = Math.max(0, Math.min(1, vol));
            }
        },
        
        handleError: function(e) {
            console.error('[Afra7Audio] Playback error:', e);
            // Skip to next track on error
            setTimeout(() => this.playNext(), 1000);
        }
    };
    
    window.Afra7AudioController = Afra7AudioController;
})();