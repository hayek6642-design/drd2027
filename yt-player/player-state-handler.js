/**
 * Player State Handler - Handles YouTube player state changes
 * Freeze-Guard Compatible - Production Safe
 */

class PlayerStateHandler {
    constructor() {
        this.player = null;
        this.currentInterval = 10 * 60 * 60 * 1000; // 10 hours
        this.codeGenerationActive = false;
    }

    /**
     * Initialize player state handler
     */
    initialize(player) {
        this.player = player;
    }

    /**
     * Handle player state change
     */
    onStateChange(event) {
        if (!this.player) return;

        const state = event.data;

        if (state === YT.PlayerState.PLAYING) {
            this.handlePlaying();
        } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.BUFFERING) {
            this.handlePaused();
        } else if (state === YT.PlayerState.ENDED) {
            this.handleEnded();
        }
    }

    /**
     * Handle playing state
     */
    handlePlaying() {
        // Start watch time counter
        if (window.WatchTimeManager) {
            window.WatchTimeManager.start();
        }

        // Start code generation if not in Extra Mode
        if (!this.isExtraModeActive()) {
            this.startCodeGeneration();
        }
    }

    /**
     * Handle paused state
     */
    handlePaused() {
        // Pause watch time counter
        if (window.WatchTimeManager) {
            window.WatchTimeManager.pause();
        }

        // Stop code generation
        this.stopCodeGeneration();
    }

    /**
     * Handle ended state
     */
    handleEnded() {
        // Stop watch time counter
        if (window.WatchTimeManager) {
            window.WatchTimeManager.stop();
        }

        // Handle playlist looping
        this.handlePlaylistLoop();
    }

    /**
     * Start code generation interval
     */
    startCodeGeneration() {
        if (this.codeGenerationActive) return;

        this.codeGenerationActive = true;

        // Code generation logic will be handled by the main app
        // This is just a flag to indicate code generation should be active
    }

    /**
     * Stop code generation interval
     */
    stopCodeGeneration() {
        this.codeGenerationActive = false;
    }

    /**
     * Check if Extra Mode is active
     */
    isExtraModeActive() {
        return window.ExtraMode && window.ExtraMode.isActive && window.ExtraMode.isActive();
    }

    /**
     * Handle playlist looping
     */
    handlePlaylistLoop() {
        if (!this.player) return;

        const currentSection = window.SectionManager?.getCurrentSection() || 'home';

        if (currentSection === 'home') {
            // Home is a playlist - loop it
            try {
                const savedData = this.getSavedPlaybackData('home');
                this.player.loadPlaylist({
                    listType: 'playlist',
                    list: 'PLD60YBjiIjQPryp_T2IdNm9fukceO8AtN',
                    index: savedData.index || 0,
                    startSeconds: savedData.time || 0
                });
            } catch (error) {
                console.warn('[Player State Handler] Error looping playlist:', error);
            }
        } else if (currentSection === 'afra7') {
            // Afra7 is a single video - restart from beginning
            try {
                this.player.loadVideoById({
                    videoId: 'fUehe82E5yU',
                    startSeconds: 0
                });
            } catch (error) {
                console.warn('[Player State Handler] Error restarting video:', error);
            }
        }
    }

    /**
     * Get saved playback data
     */
    getSavedPlaybackData(sectionId) {
        try {
            const local = localStorage.getItem(`video_${sectionId}`);
            if (local) {
                return JSON.parse(local);
            }
        } catch (error) {
            console.warn('[Player State Handler] Error loading saved data:', error);
        }
        return { time: 0, index: 0 };
    }
}

// Create singleton instance
const playerStateHandler = new PlayerStateHandler();

// Export globally
window.PlayerStateHandler = playerStateHandler;

// Export for ES modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = playerStateHandler;
}
































