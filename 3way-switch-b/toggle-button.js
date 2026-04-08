// [FROZEN] Deprecated legacy toggle — no longer used in Web-V1.
// DO NOT MODIFY. DO NOT DELETE.
// New toggle logic implemented in toggle-switch-3way.js
// toggle-button.js
// Modular toggle button logic for yt-new.html

document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggle-button');
    let currentVideoIndex = 0;
    const videoIds = [
        'PLD60YBjiIjQPryp_T2IdNm9fukceO8AtN', // Home (Playlist ID)
        'SJUH0qthtCA', // Nour (Single Video ID)
        'fUehe82E5yU', 'Mw-lmUzkiY0', // Afra7 (Single Video ID)
    ];
    const videoNames = ['Home', 'Nour', 'Afra7'];

    // Simple click-only functionality for video switching
    toggleButton.addEventListener('click', (e) => {
        // Normal press: switch between sections
        const currentTime = window.player && window.player.getCurrentTime ? window.player.getCurrentTime() : 0;
        const nextVideoIndex = (currentVideoIndex + 1) % videoIds.length;
        // Save playback time and index for the current video/playlist
        if (window.player) {
            localStorage.setItem(videoIds[currentVideoIndex], JSON.stringify({
                time: currentTime,
                index: window.player.getPlaylistIndex ? window.player.getPlaylistIndex() : 0
            }));
        }
        currentVideoIndex = nextVideoIndex;
        // Load the new video/playlist; always start from the saved time or 0 if none saved
        let startSeconds = 0;
        let startIndex = 0;
        if (currentVideoIndex !== 2) {
            const savedData = JSON.parse(localStorage.getItem(videoIds[currentVideoIndex])) || {};
            startSeconds = savedData.time || 0;
            startIndex = savedData.index || 0;
        }
        // Load the playlist for Home, or the single video for Nour and Afra7
        if (window.player) {
            if (currentVideoIndex === 1 || currentVideoIndex === 2) { // Nour or Afra7 (Single Video)
                window.player.loadVideoById({
                    videoId: videoIds[currentVideoIndex],
                    startSeconds: startSeconds
                });
            } else { // Home (Playlist)
                window.player.loadPlaylist({
                    listType: 'playlist',
                    list: videoIds[currentVideoIndex],
                    index: startIndex,
                    startSeconds: startSeconds
                });
            }
        }
        // Update button text to show the next video's name
        toggleButton.textContent = videoNames[currentVideoIndex];
    });
});
