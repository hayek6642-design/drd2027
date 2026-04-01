/**
 * Samma3ny Player Fixes - Robust Version
 * This file contains fixes for the reported issues with proper integration
 */

// Wait for the player to fully initialize before applying fixes
document.addEventListener('DOMContentLoaded', function() {
    // Wait for player initialization to complete
    const checkPlayerReady = setInterval(() => {
        try {
            // Check if player is ready by testing for key variables
            if (typeof audioPlayer !== 'undefined' &&
                typeof playlist !== 'undefined' &&
                typeof currentTrackIndex !== 'undefined' &&
                typeof isPlaying !== 'undefined') {

                clearInterval(checkPlayerReady);
                applyFixes();
            }
        } catch (e) {
            // Player not ready yet, continue waiting
        }
    }, 500);
});

function applyFixes() {
    console.log('🔧 Applying Samma3ny player fixes...');

    // Fix 1: CD Player Spin - Ensure immediate visual feedback
    fixCDPlayerSpin();

    // Fix 2: Spark Animation for Navigation
    fixSparkAnimationNavigation();

    // Fix 3: Like and Download Button Functionality
    fixLikeAndDownloadButtons();

    // Enhanced Spark Animation
    enhanceSparkAnimation();

    console.log('✅ All fixes applied successfully!');
}

function fixCDPlayerSpin() {
    try {
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const cdDisc = document.getElementById('cd-disc');

        if (!playBtn || !pauseBtn || !cdDisc) {
            console.warn('CD Player elements not found');
            return;
        }

        // Store original event listeners
        const originalPlayClick = playBtn.onclick;
        const originalPauseClick = pauseBtn.onclick;

        // Enhanced play button - immediate visual feedback
        playBtn.onclick = function(e) {
            // Call original functionality first
            if (originalPlayClick) {
                originalPlayClick.call(this, e);
            }

            // Immediately add playing class for instant visual feedback
            cdDisc.classList.add('playing');

            // Ensure audio plays if not already playing
            setTimeout(() => {
                if (audioPlayer && audioPlayer.paused) {
                    audioPlayer.play().catch(error => {
                        console.error('Error playing track:', error);
                        cdDisc.classList.remove('playing');
                    });
                }
            }, 50);
        };

        // Enhanced pause button - immediate visual feedback
        pauseBtn.onclick = function(e) {
            // Call original functionality first
            if (originalPauseClick) {
                originalPauseClick.call(this, e);
            }

            // Immediately remove playing class
            cdDisc.classList.remove('playing');
        };

        console.log('✅ CD Player spin fix applied');
    } catch (error) {
        console.error('Error applying CD spin fix:', error);
    }
}

function fixSparkAnimationNavigation() {
    try {
        const nextBtn = document.getElementById('next-btn');
        const prevBtn = document.getElementById('prev-btn');

        if (!nextBtn || !prevBtn) {
            console.warn('Navigation buttons not found');
            return;
        }

        // Store original event listeners
        const originalNextClick = nextBtn.onclick;
        const originalPrevClick = prevBtn.onclick;

        // Enhanced next button with spark animation
        nextBtn.onclick = function(e) {
            // Trigger spark animation on current active track
            triggerSparkOnActiveTrack();

            // Call original functionality
            if (originalNextClick) {
                originalNextClick.call(this, e);
            } else {
                // Fallback to default next track logic
                if (currentTrackIndex < playlist.length - 1) {
                    if (typeof loadTrack === 'function') {
                        loadTrack(currentTrackIndex + 1, isPlaying);
                    }
                }
            }
        };

        // Enhanced previous button with spark animation
        prevBtn.onclick = function(e) {
            // Trigger spark animation on current active track
            triggerSparkOnActiveTrack();

            // Call original functionality
            if (originalPrevClick) {
                originalPrevClick.call(this, e);
            } else {
                // Fallback to default previous track logic
                if (currentTrackIndex > 0) {
                    if (typeof loadTrack === 'function') {
                        loadTrack(currentTrackIndex - 1, isPlaying);
                    }
                }
            }
        };

        console.log('✅ Spark animation navigation fix applied');
    } catch (error) {
        console.error('Error applying spark animation fix:', error);
    }
}

function triggerSparkOnActiveTrack() {
    try {
        const activeItem = document.querySelector('.playlist-item.active');
        if (activeItem) {
            const thumbnail = activeItem.querySelector('.track-thumbnail');
            if (thumbnail) {
                // Add enhanced spark animation
                thumbnail.classList.add('enhanced-spark-animation');

                // Remove after animation completes
                setTimeout(() => {
                    thumbnail.classList.remove('enhanced-spark-animation');
                }, 1200);
                return true; // Animation was triggered on visible track
            }
        }

        // If active track is not visible on current page, trigger global animation
        if (typeof currentTrackIndex !== 'undefined' && currentTrackIndex >= 0) {
            console.log(`Active track not visible on current page, triggering global spark animation`);

            // Create a temporary spark indicator that appears globally
            const tempSpark = document.createElement('div');
            tempSpark.className = 'global-spark-indicator';
            tempSpark.textContent = '🎵';
            tempSpark.style.position = 'fixed';
            tempSpark.style.top = '50%';
            tempSpark.style.left = '50%';
            tempSpark.style.transform = 'translate(-50%, -50%)';
            tempSpark.style.fontSize = '48px';
            tempSpark.style.color = '#FFD700';
            tempSpark.style.zIndex = '9999';
            tempSpark.style.animation = 'globalSpark 1.2s ease-out forwards';
            tempSpark.style.pointerEvents = 'none';

            document.body.appendChild(tempSpark);

            // Add CSS for global spark animation if not present
            if (!document.getElementById('global-spark-styles')) {
                const style = document.createElement('style');
                style.id = 'global-spark-styles';
                style.textContent = `
                    @keyframes globalSpark {
                        0% {
                            transform: translate(-50%, -50%) scale(1) rotate(0deg);
                            opacity: 1;
                            text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
                        }
                        50% {
                            transform: translate(-50%, -50%) scale(2) rotate(180deg);
                            opacity: 0.7;
                            text-shadow: 0 0 25px rgba(255, 215, 0, 0.6);
                        }
                        100% {
                            transform: translate(-50%, -50%) scale(3) rotate(360deg);
                            opacity: 0;
                            text-shadow: 0 0 40px rgba(255, 215, 0, 0.3);
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            // Remove the temporary spark after animation
            setTimeout(() => {
                tempSpark.remove();
            }, 1200);
        }

        return false; // No visible animation was triggered
    } catch (error) {
        console.error('Error triggering spark animation:', error);
        return false;
    }
}

function fixLikeAndDownloadButtons() {
    try {
        // Fix like buttons - use event delegation for dynamically loaded content
        document.addEventListener('click', function(e) {
            // Handle like button clicks
            if (e.target.closest && e.target.closest('.action-btn.like')) {
                const likeBtn = e.target.closest('.action-btn.like');
                e.preventDefault();
                e.stopPropagation();

                // Get the track associated with this button
                const playlistItem = likeBtn.closest('.playlist-item');
                if (playlistItem) {
                    const trackId = playlistItem.dataset.trackId;
                    if (trackId && Array.isArray(playlist)) {
                        const track = playlist.find(t => t.id === trackId);
                        if (track && typeof toggleLikeTrack === 'function') {
                            // Toggle like status
                            toggleLikeTrack(track);

                            // Visual feedback
                            likeBtn.classList.toggle('active');
                            likeBtn.style.color = '#B043FF';

                            setTimeout(() => {
                                likeBtn.style.color = '';
                            }, 500);

                            console.log(`Liked track: ${track.title}`);
                        }
                    }
                }
            }

            // Handle download button clicks
            if (e.target.closest && e.target.closest('.action-btn:not(.like):not(.remove-favorite):not(.share-btn)')) {
                const downloadBtn = e.target.closest('.action-btn:not(.like):not(.remove-favorite):not(.share-btn)');
                e.preventDefault();
                e.stopPropagation();

                // Get the track associated with this button
                const playlistItem = downloadBtn.closest('.playlist-item');
                if (playlistItem) {
                    const trackId = playlistItem.dataset.trackId;
                    if (trackId && Array.isArray(playlist)) {
                        const track = playlist.find(t => t.id === trackId);
                        if (track && typeof downloadSong === 'function') {
                            // Trigger download
                            downloadSong(track);

                            // Visual feedback - show success state
                            downloadBtn.classList.add('download-success');
                            downloadBtn.innerHTML = '✓';
                            downloadBtn.title = 'Downloaded for offline playback';

                            console.log(`Downloading track: ${track.title}`);

                            // Revert after 3 seconds
                            setTimeout(() => {
                                downloadBtn.classList.remove('download-success');
                                downloadBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                                </svg>`;
                                downloadBtn.title = 'Download';
                            }, 3000);
                        }
                    }
                }
            }
        });

        console.log('✅ Like and download button fixes applied');
    } catch (error) {
        console.error('Error applying button fixes:', error);
    }
}

function enhanceSparkAnimation() {
    try {
        // Add enhanced spark animation CSS if not present
        if (!document.getElementById('enhanced-spark-styles')) {
            const style = document.createElement('style');
            style.id = 'enhanced-spark-styles';
            style.textContent = `
                @keyframes enhancedSpark {
                    0% {
                        transform: scale(1) rotate(0deg);
                        opacity: 1;
                        box-shadow: 0 0 10px 2px rgba(255, 215, 0, 0.8);
                    }
                    25% {
                        transform: scale(1.2) rotate(45deg);
                        opacity: 0.9;
                        box-shadow: 0 0 15px 4px rgba(255, 215, 0, 0.9);
                    }
                    50% {
                        transform: scale(1.5) rotate(90deg);
                        opacity: 0.7;
                        box-shadow: 0 0 20px 6px rgba(255, 215, 0, 0.7);
                    }
                    75% {
                        transform: scale(1.8) rotate(135deg);
                        opacity: 0.4;
                        box-shadow: 0 0 25px 8px rgba(255, 215, 0, 0.5);
                    }
                    100% {
                        transform: scale(2) rotate(180deg);
                        opacity: 0;
                        box-shadow: 0 0 30px 10px rgba(255, 215, 0, 0.3);
                    }
                }

                .enhanced-spark-animation {
                    animation: enhancedSpark 1.2s ease-out forwards;
                    transform-origin: center;
                    z-index: 10;
                    position: relative;
                }

                /* Ensure spark animation works on thumbnails */
                .track-thumbnail {
                    transition: all 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }

        console.log('✅ Enhanced spark animation applied');
    } catch (error) {
        console.error('Error applying enhanced spark animation:', error);
    }
}

// Fallback: If player takes too long to initialize, apply basic fixes
setTimeout(() => {
    if (typeof audioPlayer === 'undefined') {
        console.warn('Player initialization taking longer than expected, applying basic fixes...');

        // Apply basic CD spin fix if possible
        const cdDisc = document.getElementById('cd-disc');
        if (cdDisc) {
            // Add basic playing class toggle for visual feedback
            const playBtn = document.getElementById('play-btn');
            const pauseBtn = document.getElementById('pause-btn');

            if (playBtn) {
                playBtn.addEventListener('click', () => {
                    cdDisc.classList.add('playing');
                });
            }

            if (pauseBtn) {
                pauseBtn.addEventListener('click', () => {
                    cdDisc.classList.remove('playing');
                });
            }
        }
    }
}, 10000); // 10 second timeout