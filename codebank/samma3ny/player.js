// Samma3ny Player JavaScript - Modern Redesign
// Cloudinary-only audio player
document.addEventListener('DOMContentLoaded', async function() {
    if (window.__SAMMA3NY_PLAYER_INIT__) return;
    window.__SAMMA3NY_PLAYER_INIT__ = true;
    // Player elements
    const audioPlayer = document.getElementById('audio-player');
    const playBtn = document.getElementById('play-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressBar = document.getElementById('progress-bar');
    const progress = document.getElementById('progress');
    const currentTimeDisplay = document.getElementById('current-time');
    const durationDisplay = document.getElementById('duration');
    const soundBtn = document.getElementById('sound-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const refreshBtn = document.getElementById('refresh-btn');
    const errorMessage = document.getElementById('error-message');
    const cdDisc = document.getElementById('cd-disc');
    const cdCoverImage = document.getElementById('cd-cover-image');
    const progressCircle = document.getElementById('progress-circle');
    const currentTrackTitle = document.getElementById('current-track-title');
    const currentTrackArtist = document.getElementById('current-track-artist');
    const currentTrackDescription = document.getElementById('current-track-description');

    // Additional buttons
    const stopBtn = document.getElementById('stop-btn');
    const downloadBtn = document.getElementById('download-btn');

    let isPlaying = false;
    let currentTrackIndex = 0;

    // Enhanced pagination state for large playlists (up to 2000+ songs)
    let currentPage = 1;
    const songsPerPage = 100; // Increased to 100 songs per page for better performance with large collections
    let totalPages = 1;

    // Track sources - Cloudinary only
    const SOURCES = {
        CLOUDINARY: 'cloudinary'
    };

    // API Base URL configuration
    const API_BASE = window.location.origin;

    // Cloudinary configuration (unsigned upload)
    const CLOUDINARY_CONFIG = {
        CLOUD_NAME: 'dhpyneqgk',
        UPLOAD_PRESET: 'media-player1'
    };

    // Combined playlist from all sources with caching
    let playlist = [];
    let likedTracks = JSON.parse(localStorage.getItem('likedTracks') || '[]');
    let skippedTracks = JSON.parse(localStorage.getItem('skippedTracks') || '[]');
    let _updatingTrackDisplay = false;
    
    // Cache management for API responses
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
    let songCache = {
        data: null,
        timestamp: 0
    };

    // Admin dashboard click counter
    let adminClickCount = 0;
    let adminClickTimer = null;

    // Downloaded tracks storage (now primarily using IndexedDB)
    let dbInstance = null;

    // Storage management constants
    const MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB limit
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file limit
    
    // Set up audio event listeners
    function setupAudioEventListeners() {
        audioPlayer.addEventListener('play', () => {
            isPlaying = true;
            updatePlayButton();
            updatePlaylistPlayButtons();
        });

        audioPlayer.addEventListener('pause', () => {
            isPlaying = false;
            updatePlayButton();
            updatePlaylistPlayButtons();
        });

        audioPlayer.addEventListener('ended', () => {
            isPlaying = false;
            updatePlayButton();
            updatePlaylistPlayButtons();
            const container = document.getElementById('playlist-container');
            const prevScroll = container ? container.scrollTop : 0;
            const pageStart = (currentPage - 1) * songsPerPage;
            const pageEnd = Math.min(pageStart + songsPerPage - 1, playlist.length - 1);

            if (currentTrackIndex < playlist.length - 1) {
                // Move to next track
                const nextIndex = currentTrackIndex + 1;
                const nextPage = Math.floor(nextIndex / songsPerPage) + 1;
                if (nextPage !== currentPage) {
                    goToPage(nextPage, true);
                    setTimeout(() => { if (container) container.scrollTop = prevScroll; }, 200);
                }
                loadTrack(nextIndex, true);
            } else {
                // End of playlist: loop to first page, keep UI stable
                goToPage(1, true);
                setTimeout(() => { if (container) container.scrollTop = 0; }, 200);
                loadTrack(0, false);
                pauseTrack();
            }
        });

        audioPlayer.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            showError('Failed to play audio');
            isPlaying = false;
            updatePlayButton();
            updatePlaylistPlayButtons();
        });
    }
    
    // Initialize audio event listeners
    setupAudioEventListeners();
    
    // Enhanced Cloudinary song loading function - loads from API
    async function loadCloudinaryTracks() {
        console.log("🔄 Enhanced: Loading Cloudinary tracks from API...");

        try {
            const tracks = await fetchCloudinarySongs();
            if (Array.isArray(tracks) && tracks.length > 0) {
                console.log(`✅ Loaded ${tracks.length} tracks from API`);
                return tracks;
            }
            throw new Error('No tracks returned from API');
        } catch (error) {
            console.error("❌ Error loading Cloudinary tracks from API:", error);
            showError('No Cloudinary audio files found. Please upload songs or check Cloudinary configuration.');
            return [];
        }
    }

    // Initialize player
    async function initPlayer() {
        showLoading(true);
        try {
            // Enhanced track loading with comprehensive pagination
            console.log("🔄 ENHANCED: Loading tracks with improved Cloudinary pagination...");
            
            // Use the new enhanced loading function
            const cloudinaryTrackList = await loadCloudinaryTracks();

            // Merge new tracks with existing ones instead of replacing (enhanced logic)
            const existingTrackIds = new Set(playlist.map(track => track.id));
            const newTracks = cloudinaryTrackList.filter(track => !existingTrackIds.has(track.id));
            
            // Add new tracks to playlist
            const totalBefore = playlist.length;
            playlist = [...playlist, ...newTracks];
            const totalAfter = playlist.length;
            const addedTracks = totalAfter - totalBefore;
            
            console.log(`✅ ENHANCED: Added ${addedTracks} new tracks (Total: ${totalAfter})`);
            console.log(`🔄 Enhanced pagination ensures ALL songs are loaded`);

            if (playlist.length === 0) {
                showError('No Cloudinary audio files found. Please upload songs or check Cloudinary configuration.');
            }

            // Load first track and render playlist (only if tracks exist)
            if (playlist.length > 0) {
                loadTrack(0);
            }
            renderPlaylist();

            // Set initial volume and unmute
            audioPlayer.volume = 0.8;
            audioPlayer.muted = false;

            // Setup admin dashboard trigger
            const musicLibraryTitle = document.querySelector('.section-title');
            if (musicLibraryTitle) {
                musicLibraryTitle.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMusicLibraryClick();
                });
                musicLibraryTitle.style.cursor = 'pointer';
                musicLibraryTitle.title = 'Click 7 times for admin access';
            }

            // Show success message
            console.log(`✅ Loaded ${playlist.length} tracks successfully!`);

            // Removed auto-refresh to prevent unwanted track loading
            // Users can manually refresh using the refresh button
            // setInterval(() => {
            //     refreshPlaylist();
            // }, 30000);

        } catch (error) {
            console.error('Error initializing player:', error);
            console.log("Failed to load tracks. Please check your connection and try again.");
        } finally {
            showLoading(false);
            lastRefreshTs = Date.now();
        }
    }

    
    
    // Fetch tracks from Cloudinary API with caching
    async function fetchCloudinarySongs() {
        try {
            // Check cache first
            const now = Date.now();
            if (songCache.data && (now - songCache.timestamp) < CACHE_DURATION) {
                console.log('🎵 Using cached songs data:', songCache.data.length, 'tracks');
                return songCache.data;
            }

            console.log('🔄 Fetching songs from Cloudinary API...');
            let response = await fetch(`${API_BASE}/api/samma3ny/songs`, { credentials: 'include' });
            if (!response.ok) {
                try {
                    const fb = 'http://localhost:3000';
                    if (!API_BASE.includes('localhost:3000')) {
                        response = await fetch(`${fb}/api/samma3ny/songs`, { credentials: 'include' });
                    }
                } catch (_) {}
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const songs = await response.json();
            console.log('Fetched songs from Cloudinary API:', songs.length, 'tracks');

            const mappedSongs = songs.map(song => ({
                id: song.public_id || song.id,
                title: song.display_name || song.title || 'Unknown Title',
                src: song.secure_url || song.url || song.src,
                thumbnail: song.thumbnail || '',
                duration: song.duration ? (typeof song.duration === 'string' ? song.duration : formatTime(Math.round(song.duration))) : '0:00',
                source: SOURCES.CLOUDINARY,
                contentType: song.format ? `audio/${song.format}` : (song.contentType || 'audio/mpeg')
            }));

            // Update cache
            songCache.data = mappedSongs;
            songCache.timestamp = now;

            return mappedSongs;
        } catch (error) {
            console.error('Error fetching Cloudinary songs:', error);
            
            // Return cached data if available, even if expired
            if (songCache.data) {
                console.warn('Using expired cache due to fetch error');
                return songCache.data;
            }
            
            console.log("Failed to load songs. Please check your connection and try again.");
            return []; // Return empty array on error
        }
    }

    // Clear song cache (useful for admin operations)
    function clearSongCache() {
        songCache.data = null;
        songCache.timestamp = 0;
        console.log('🗑️ Song cache cleared');
    }

    
    
    

    // Upload song to unified API
    async function uploadSongToServer(file, folder = 'media-player') {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', folder);

            const authHeaders = buildAuthHeaders();
            let response = await fetch(`${API_BASE}/api/samma3ny/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: authHeaders
            });

            if (response.status === 401) {
                const authed = await ensureAuthenticated();
                if (authed) {
                    response = await fetch(`${API_BASE}/api/samma3ny/upload`, {
                        method: 'POST',
                        body: formData,
                        credentials: 'include',
                        headers: buildAuthHeaders()
                    });
                }
            }

            if (!response.ok) {
                throw new Error(`Failed to upload song: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error uploading song to server:', error);
            return null;
        }
    }

    

    // Enhanced bulk upload function with progress tracking
    async function uploadBulkAudioFiles(files) {
        if (!files || files.length === 0) {
            throw new Error('No files selected for upload');
        }

        console.log(`📤 Starting bulk upload of ${files.length} files...`);

        try {
            const formData = new FormData();

            // Add all files to FormData - ensure proper field name
            for (let i = 0; i < files.length; i++) {
                console.log(`Adding file ${i + 1}: ${files[i].name} (${files[i].size} bytes)`);
                formData.append('files', files[i], files[i].name);
            }
            
            // Add additional metadata
            formData.append('folder', 'samma3ny');
            formData.append('timestamp', Date.now().toString());

            // Show upload progress
            showUploadProgress(true, `Uploading ${files.length} files...`);

            const authHeaders = buildAuthHeaders();
            let response = await fetch(`${API_BASE}/api/samma3ny/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: authHeaders
            });

            if (response.status === 401) {
                const authed = await ensureAuthenticated();
                if (authed) {
                    response = await fetch(`${API_BASE}/api/samma3ny/upload`, {
                        method: 'POST',
                        body: formData,
                        credentials: 'include',
                        headers: buildAuthHeaders()
                    });
                }
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server response error:', response.status, response.statusText, errorText);
                throw new Error(`Upload failed: ${response.status} ${response.statusText}. ${errorText}`);
            }

            const result = await response.json();
            console.log('Upload response:', result);

            // Hide progress
            showUploadProgress(false);

            // Process results
            if (result.successful_uploads > 0) {
                console.log(`✅ Bulk upload completed: ${result.successful_uploads}/${result.total_files} successful`);

                // Show success message
                showSuccess(`Successfully uploaded ${result.successful_uploads} of ${result.total_files} files!`);

                // Clear cache and refresh playlist to show new songs immediately
                setTimeout(() => {
                    clearSongCache(); // Clear cache to ensure fresh data
                    refreshPlaylist();
                    console.log('🎵 Playlist refreshed after upload');
                }, 1000); // Reduced delay for faster refresh

                return result;
            } else {
                throw new Error('All uploads failed');
            }

        } catch (error) {
            console.error('❌ Bulk upload error:', error);
            showUploadProgress(false);
            showError(`Bulk upload failed: ${error.message}`);
            throw error;
        }
    }

    // Upload progress indicator
    function showUploadProgress(show, message = '') {
        let progressDiv = document.getElementById('upload-progress');
        if (!progressDiv) {
            progressDiv = document.createElement('div');
            progressDiv.id = 'upload-progress';
            progressDiv.className = 'upload-progress-overlay';
            progressDiv.innerHTML = `
                <div class="upload-progress-content">
                    <div class="upload-spinner"></div>
                    <p id="upload-message">${message}</p>
                </div>
            `;
            document.body.appendChild(progressDiv);
        }

        if (show) {
            progressDiv.style.display = 'flex';
            document.getElementById('upload-message').textContent = message;
        } else {
            progressDiv.style.display = 'none';
        }
    }

    // Upload audio to unified API (single file - kept for compatibility)
    async function uploadAudioToCloudinary(file, folder = 'media-player') {
        try {
            const result = await uploadSongToServer(file, folder);
            if (!result || !result.success) {
                throw new Error(result?.error || 'Upload failed');
            }

            const newTrack = {
                id: result.public_id,
                title: file.name.replace(/\.[^/.]+$/, ""),
                url: result.url,
                src: result.url,
                thumbnail: '',
                duration: result.duration ? Math.round(result.duration) : 0,
                source: SOURCES.CLOUDINARY,
                contentType: `audio/${result.format}`
            };

            // Show success message
            console.log(`✅ Successfully uploaded: ${newTrack.title}`);
            return newTrack;
        } catch (error) {
            console.error('Error uploading to unified API:', error);
            console.log(`Failed to upload: ${error.message}`);
            return null;
        }
    }

    // Save song metadata to server after upload
    async function saveSongToServer(track) {
        try {
            const response = await fetch(`${API_BASE}/api/samma3ny/songs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(track),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Failed to save song metadata: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Song metadata saved to server');
            return result;
        } catch (error) {
            console.error('Error saving song metadata to server:', error);
            // Don't throw error - upload was successful, metadata save failure shouldn't fail the whole process
            return null;
        }
    }

    // --- Initialize IndexedDB ---
    function initDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open("Samma3nyDB", 1);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains("tracks")) {
            db.createObjectStore("tracks", { keyPath: "id" });
          }
        };

        request.onsuccess = (event) => {
          dbInstance = event.target.result;
          resolve(dbInstance);
        };

        request.onerror = (event) => {
          console.error("❌ IndexedDB initialization error:", event);
          reject(event);
        };
      });
    }

    // --- Save song file (Blob) into IndexedDB ---
    async function saveSongFile(track, blob) {
      if (!dbInstance) await initDB();

      return new Promise((resolve, reject) => {
        const tx = dbInstance.transaction("tracks", "readwrite");
        const store = tx.objectStore("tracks");
        store.put({
          id: track.id,
          title: track.title,
          blob,
          size: blob.size,
          timestamp: Date.now(),
        });
        tx.oncomplete = () => {
          console.log(`✅ "${track.title}" saved in IndexedDB`);
          resolve();
        };
        tx.onerror = (e) => {
          console.error("❌ Error saving song:", e);
          reject(e);
        };
      });
    }

    // --- Download song and save it locally ---
    async function downloadSong(track, triggerBtn) {
        try {
            if (triggerBtn) {
                triggerBtn.classList.add('downloading');
                triggerBtn.disabled = true;
            }
            console.log("🔄 Downloading song...");

        const response = await fetch(track.src);
        const blob = await response.blob();

        // Save file in IndexedDB
        await saveSongFile(track, blob);

        // Store metadata in localStorage for quick access (blob is in IndexedDB)
        const metaData = JSON.parse(localStorage.getItem("downloadedTracks") || "{}");
        metaData[track.id] = {
          id: track.id,
          title: track.title,
          size: blob.size,
          downloadedAt: new Date().toISOString(),
        };
        localStorage.setItem("downloadedTracks", JSON.stringify(metaData));

        // Register download in localStorage (removed Firebase dependency)
        registerDownload(track);

        console.log(`✅ Downloaded: ${track.title} (${formatFileSize(blob.size)})`);
        // Update UI to show download status
        updateDownloadStatus();
        if (triggerBtn) {
            triggerBtn.classList.remove('downloading');
            triggerBtn.classList.add('download-success');
            triggerBtn.disabled = false;
        }

        showStorageInfo();
      } catch (error) {
        console.error("⚠️ Error downloading song:", error);
        console.log("⚠️ Failed to download song. Please check your internet or storage.");
        if (triggerBtn) {
            triggerBtn.classList.remove('downloading');
            triggerBtn.disabled = false;
        }
      }
    }

    // Toggle like track (now only for admin statistics)
    function toggleLikeTrack(track, triggerBtn) {
        // Track like for admin statistics only - no user-facing favorites
        const likedStats = JSON.parse(localStorage.getItem('likedStats') || '[]');
        const existingIndex = likedStats.findIndex(stat => stat.trackId === track.id);

        if (existingIndex === -1) {
            likedStats.push({
                trackId: track.id,
                title: track.title,
                likedAt: new Date().toISOString(),
                userAgent: navigator.userAgent
            });
            console.log(`📊 Like recorded for admin stats: ${track.title}`);
            if (triggerBtn) triggerBtn.classList.add('active');
        } else {
            // Remove from stats if unliked
            likedStats.splice(existingIndex, 1);
            console.log(`📊 Like removed from admin stats: ${track.title}`);
            if (triggerBtn) triggerBtn.classList.remove('active');
        }

        localStorage.setItem('likedStats', JSON.stringify(likedStats));
        if (triggerBtn) triggerBtn.blur();
    }

    // Skip song - flags track to be hidden from playlist
    function skipSong(track, triggerBtn) {
        const index = skippedTracks.indexOf(track.id);
        
        if (index === -1) {
            // Add to skipped
            skippedTracks.push(track.id);
            console.log(`⏭️  Track flagged as skipped: ${track.title}`);
            if (triggerBtn) {
                triggerBtn.classList.add('skipped');
                triggerBtn.title = 'Unskip';
            }
        } else {
            // Remove from skipped
            skippedTracks.splice(index, 1);
            console.log(`✅ Track unskipped: ${track.title}`);
            if (triggerBtn) {
                triggerBtn.classList.remove('skipped');
                triggerBtn.title = 'Skip this song';
            }
        }
        
        localStorage.setItem('skippedTracks', JSON.stringify(skippedTracks));
        if (triggerBtn) triggerBtn.blur();
        
        // Refresh playlist to hide/show the track
        refreshPlaylistView();
    }

    // Refresh playlist view to reflect skip changes
    function refreshPlaylistView() {
        renderPlaylist();
    }

    // --- Show storage usage info ---
    function showStorageInfo() {
      let totalSize = 0;
      const metaData = JSON.parse(localStorage.getItem("downloadedTracks") || "{}");
      Object.values(metaData).forEach((t) => (totalSize += t.size));
      const infoContainer = document.getElementById("storage-info");
      if (infoContainer)
        infoContainer.innerText = `Storage used: ${formatFileSize(totalSize)}`;
    }

    // --- Retrieve all saved songs from IndexedDB ---
    async function getAllSongs() {
      if (!dbInstance) await initDB();

      return new Promise((resolve, reject) => {
        const tx = dbInstance.transaction("tracks", "readonly");
        const store = tx.objectStore("tracks");
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = reject;
      });
    }

    // --- Play downloaded song (offline playback) ---
    async function playOfflineSong(trackId) {
      const songs = await getAllSongs();
      const song = songs.find((t) => t.id === trackId);
      if (!song) {
        console.log("⚠️ Song not found in offline storage!");
        return;
      }

      // Create blob URL for playback
      const blobUrl = URL.createObjectURL(song.blob);
      
      // Clean up any previous blob URLs to prevent memory leaks
      if (audioPlayer.src && audioPlayer.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioPlayer.src);
      }
      
      audioPlayer.src = blobUrl;
      audioPlayer.load();
      currentTrackIndex = playlist.findIndex(t => t.id === trackId);
      updateActiveTrack();
      console.log(`🎵 Playing offline: ${song.title}`);
    }

    // --- Auto-clean storage if exceeded ---
    async function cleanOldTracks(maxSongs = 100) {
      const songs = await getAllSongs();
      if (songs.length > maxSongs) {
        const sorted = songs.sort((a, b) => b.timestamp - a.timestamp);
        const removeList = sorted.slice(maxSongs);
        const tx = dbInstance.transaction("tracks", "readwrite");
        const store = tx.objectStore("tracks");
        removeList.forEach((song) => store.delete(song.id));
        console.log(`🧹 Cleaned old songs: ${removeList.length} removed`);
      }
    }
      
      // Register download in localStorage (removed Firebase dependency)
      function registerDownload(track) {
        const downloads = JSON.parse(localStorage.getItem('downloads') || '[]');
        downloads.push({
          trackId: track.id,
          title: track.title,
          downloadedAt: new Date().toISOString(),
        });
        localStorage.setItem('downloads', JSON.stringify(downloads));
      }
      

    

    // Update download status in playlist
    async function updateDownloadStatus() {
        const playlistItems = document.querySelectorAll('.playlist-item');
        for (let index = 0; index < playlistItems.length; index++) {
            const item = playlistItems[index];
            const track = playlist[index];
            if (track) {
                const isDownloaded = await isTrackDownloaded(track.id);
                const downloadBtn = item.querySelector('.action-btn:not(.like):not(.remove-favorite)');

                if (isDownloaded) {
                    // Add download indicator
                    let downloadIndicator = item.querySelector('.download-indicator');
                    if (!downloadIndicator) {
                        downloadIndicator = document.createElement('div');
                        downloadIndicator.className = 'download-indicator';
                        downloadIndicator.innerHTML = '🎤'; // Change to mic symbol
                        downloadIndicator.title = 'Downloaded for offline playback';
                        const trackElement = item.querySelector('.track-details') || item;
                        if (trackElement) {
                            trackElement.appendChild(downloadIndicator);
                        }
                    }

                    // Update download button to success state
                    if (downloadBtn) {
                        downloadBtn.classList.add('download-success');
                        downloadBtn.title = 'Downloaded for offline playback';
                    }
                } else {
                    // Remove download indicator if track is no longer downloaded
                    const downloadIndicator = item.querySelector('.download-indicator');
                    if (downloadIndicator) {
                        downloadIndicator.remove();
                    }

                    // Reset download button
                    if (downloadBtn) {
                        downloadBtn.classList.remove('download-success');
                        downloadBtn.title = 'Download';
                    }
                }
            }
        }
    }

    // Check if track is downloaded (using IndexedDB)
    async function isTrackDownloaded(trackId) {
        try {
            const songs = await getAllSongs();
            return songs.some(song => song.id === trackId);
        } catch (error) {
            console.error('Error checking if track is downloaded:', error);
            return false;
        }
    }

    // Check storage quota and manage space
    function checkStorageQuota() {
        try {
            // Estimate current storage usage
            const currentStorage = JSON.stringify(localStorage).length;
            const availableStorage = MAX_STORAGE_SIZE - currentStorage;

            return {
                used: currentStorage,
                available: availableStorage,
                total: MAX_STORAGE_SIZE,
                usagePercent: (currentStorage / MAX_STORAGE_SIZE) * 100
            };
        } catch (error) {
            console.warn('Error checking storage quota:', error);
            return { used: 0, available: MAX_STORAGE_SIZE, total: MAX_STORAGE_SIZE, usagePercent: 0 };
        }
    }

    // Clean up old downloads to free space
    async function cleanupOldDownloads(requiredSpace) {
        try {
            const tracks = await getAllSongs();
            if (tracks.length === 0) return 0;

            // Sort by timestamp (oldest first)
            tracks.sort((a, b) => a.timestamp - b.timestamp);

            let freedSpace = 0;
            const tracksToRemove = [];

            for (const track of tracks) {
                if (freedSpace >= requiredSpace) break;

                tracksToRemove.push(track.id);
                freedSpace += track.size || 0;
            }

            // Remove old tracks from IndexedDB
            if (tracksToRemove.length > 0 && dbInstance) {
                const tx = dbInstance.transaction("tracks", "readwrite");
                const store = tx.objectStore("tracks");
                tracksToRemove.forEach(trackId => store.delete(trackId));
console.log(`🗑️ Cleaned up ${tracksToRemove.length} old downloads to free space`);
            }

            return freedSpace;
        } catch (error) {
            console.error('Error cleaning up old downloads:', error);
            return 0;
        }
    }

    // Validate file size before download
    async function validateFileSize(fileSize) {
        if (fileSize > MAX_FILE_SIZE) {
            console.log(`File too large (${formatFileSize(fileSize)}). Maximum allowed: ${formatFileSize(MAX_FILE_SIZE)}`);
            return false;
        }

        const storageInfo = checkStorageQuota();
        if (fileSize > storageInfo.available) {
            // Try to free up space
            const freedSpace = await cleanupOldDownloads(fileSize - storageInfo.available + 1024 * 1024); // Add 1MB buffer

            if (fileSize > storageInfo.available + freedSpace) {
                console.log(`Not enough storage space. Please delete some downloaded tracks first.`);
                return false;
            }
        }

        return true;
    }

    // Get storage usage information
    async function getStorageInfo() {
        try {
            const tracks = await getAllSongs();
            const totalSize = tracks.reduce((sum, track) => sum + (track.size || 0), 0);
            const trackCount = tracks.length;

            return {
                trackCount: trackCount,
                totalSize: totalSize,
                storageInfo: checkStorageQuota()
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return {
                trackCount: 0,
                totalSize: 0,
                storageInfo: checkStorageQuota()
            };
        }
    }

    // Load downloaded tracks into playlist
    async function loadDownloadedTracks() {
        try {
            const downloadedTrackList = await getAllSongs();
            if (downloadedTrackList.length > 0) {
                // Add downloaded tracks to the beginning of the playlist
                const downloadedPlaylistItems = downloadedTrackList.map(track => ({
                    id: track.id,
                    title: track.title + ' (Offline)',
                    src: '', // Will be set dynamically using blob URL
                    thumbnail: '',
                    duration: track.duration || '0:00',
                    source: 'downloaded',
                    contentType: 'audio/mpeg',
                    isDownloaded: true,
                    blob: track.blob // Store blob reference for playback
                }));

                playlist = [...downloadedPlaylistItems, ...playlist];
                renderPlaylist();
                console.log(`✅ Loaded ${downloadedTrackList.length} downloaded tracks for offline playback`);
            }
        } catch (error) {
            console.error('Error loading downloaded tracks:', error);
        }
    }

    // Handle playlist item click with offline support
    function handlePlaylistClick(index) {
        const track = playlist[index];
        if (track.isDownloaded) {
            // Play downloaded track using blob
            const blobUrl = URL.createObjectURL(track.blob);

            // Clean up any previous blob URLs to prevent memory leaks
            if (audioPlayer.src && audioPlayer.src.startsWith('blob:')) {
                URL.revokeObjectURL(audioPlayer.src);
            }

            audioPlayer.src = blobUrl;
            audioPlayer.load();
            currentTrackIndex = index;
            updateActiveTrack();
            if (isPlaying) {
                audioPlayer.play();
            }
        } else {
            // Clean up blob URL when switching to online tracks
            if (audioPlayer.src && audioPlayer.src.startsWith('blob:')) {
                URL.revokeObjectURL(audioPlayer.src);
            }

            // Play online track
            loadTrack(index);
            if (isPlaying) {
                audioPlayer.play();
            }
        }
    }

    // Thumbnails are no longer clickable - removed handleThumbnailClick function
    
    // Update current track display without loading audio
    function updateCurrentTrackDisplay(track) {
        if (_updatingTrackDisplay) return;
        _updatingTrackDisplay = true;
        try {
            currentTrackTitle.textContent = (track && track.title) ? track.title : 'Track';
            currentTrackArtist.textContent = 'Dr.D';
            currentTrackDescription.textContent = track && track.description ? track.description : '';
            
            // Hide CD cover image (show only in playlist thumbnails, not rotating vinyl)
            cdCoverImage.style.display = 'none';
            cdDisc.classList.add('playing');
        } catch (_) {}
        _updatingTrackDisplay = false;
    }

    // Enhanced loadTrack function - only updates UI without loading audio
    function loadTrack(index, shouldPlay = false) {
        if (index >= 0 && index < playlist.length) {
            const track = playlist[index];

            // Update UI immediately without audio loading delay
            currentTrackTitle.textContent = track.title || 'Track';
            currentTrackArtist.textContent = 'Dr.D';
            currentTrackDescription.textContent = track.description || '';

            // Hide CD cover (show only in playlist thumbnails, not rotating vinyl)
            cdCoverImage.style.display = 'none';

            currentTrackIndex = index;

            // Update active track in playlist
            updateActiveTrack();

            // Extract colors for dynamic background
            extractColorsFromTrack(track);

            // Trigger spark animation on track change
            triggerSparkAnimation(index);

            cdDisc.classList.add('playing');

            // Only load audio if we're going to play immediately
            if (shouldPlay) {
                loadAudioAndPlay(track);
            }
        }
    }

    // Separate function to load audio only when needed
    function loadAudioAndPlay(track) {
        // Clean up any previous blob URLs to prevent memory leaks
        if (audioPlayer.src && audioPlayer.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioPlayer.src);
        }

        // Set the audio source
        audioPlayer.src = track.src;
        audioPlayer.load();

        // Play the track after metadata is loaded
        audioPlayer.addEventListener('loadedmetadata', function onLoad() {
            audioPlayer.removeEventListener('loadedmetadata', onLoad);
            audioPlayer.play().catch(error => {
                console.error('Error playing track:', error);
            });
        }, { once: true });
    }

    // Extract colors from track for dynamic background
    function extractColorsFromTrack(track) {
        if (track.thumbnail && track.thumbnail !== '' && typeof ColorThief !== 'undefined') {
            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';

                // FIXED: Add timeout to prevent performance issues
                const colorThiefTimeout = setTimeout(() => {
                    console.warn('Color extraction timeout for track:', track.title);
                    // Don't reset colors on timeout - keep existing colors
                }, 2000); // 2 second timeout

                img.onload = function() {
                    clearTimeout(colorThiefTimeout);

                    try {
                        const colorThief = new ColorThief();
                        const dominantColor = colorThief.getColor(img);
                        const palette = colorThief.getPalette(img, 3);

                        // Convert RGB to hex
                        const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
                            const hex = x.toString(16);
                            return hex.length === 1 ? '0' + hex : hex;
                        }).join('');

                        const primaryColor = rgbToHex(...dominantColor);
                        const secondaryColor = palette.length > 1 ? rgbToHex(...palette[1]) : primaryColor;

                        // Create gradient colors by adjusting brightness
                        const adjustBrightness = (hex, percent) => {
                            const num = parseInt(hex.replace('#', ''), 16);
                            const amt = Math.round(2.55 * percent);
                            const R = (num >> 16) + amt;
                            const G = (num >> 8 & 0x00FF) + amt;
                            const B = (num & 0x0000FF) + amt;
                            return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                                (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                                (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
                        };

                        const bgStart = adjustBrightness(primaryColor, -60);
                        const bgEnd = adjustBrightness(secondaryColor, -70);

                        // Update CSS variables for dynamic theming only when successful
                        document.documentElement.style.setProperty('--dynamic-bg-start', bgStart);
                        document.documentElement.style.setProperty('--dynamic-bg-end', bgEnd);
                        document.documentElement.style.setProperty('--primary-color', primaryColor);
                        document.documentElement.style.setProperty('--secondary-color', secondaryColor);

                        console.log('✅ Color extraction successful for:', track.title);
                    } catch (processingError) {
                        console.warn('Color processing failed for track:', track.title, processingError);
                        // Don't reset colors on processing failure - keep existing colors
                    }
                };

                img.onerror = function() {
                    clearTimeout(colorThiefTimeout);
                    console.warn('Image failed to load for color extraction:', track.thumbnail);
                    // Don't reset colors on image load failure - keep existing colors
                };

                img.src = track.thumbnail;
            } catch (error) {
                console.warn('Color extraction setup failed for track:', track.title, error);
                // Don't reset colors on setup failure - keep existing colors
            }
        } else {
            // No thumbnail available - don't change existing colors
            console.log('No thumbnail available for color extraction:', track.title);
        }
    }

    // Reset to default color scheme
    function resetToDefaultColors() {
        document.documentElement.style.setProperty('--dynamic-bg-start', '#0B0C10');
        document.documentElement.style.setProperty('--dynamic-bg-end', '#1C1E22');
        document.documentElement.style.setProperty('--primary-color', '#B043FF');
        document.documentElement.style.setProperty('--secondary-color', '#FF77E9');
    }

    // Trigger spark animation on track change
    function triggerSparkAnimation(trackIndex) {
        // Find the playlist item for this track
        const playlistItems = document.querySelectorAll('.playlist-item');
        let animationTriggered = false;

        playlistItems.forEach((item, index) => {
            // Calculate the actual track index in the full playlist
            const pageStart = (currentPage - 1) * songsPerPage;
            const actualIndex = pageStart + index;

            if (actualIndex === trackIndex) {
                const thumbnail = item.querySelector('.track-thumbnail');
                if (thumbnail) {
                    // Add spark animation class
                    thumbnail.classList.add('spark-animation');

                    // Remove the class after animation completes
                    setTimeout(() => {
                        thumbnail.classList.remove('spark-animation');
                    }, 1000); // Animation duration
                    animationTriggered = true;
                }
            }
        });

        // If the track is not visible on current page, still trigger animation
        // by finding the track in the playlist and creating a temporary visual indicator
        if (!animationTriggered && trackIndex >= 0 && trackIndex < playlist.length) {
            console.log(`Track ${trackIndex} not visible on current page, triggering global spark animation`);

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
    }
    
    // Add modern pagination controls to container
    function addPaginationControls(container) {
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'modern-pagination-controls';

        // Calculate page info
        const startItem = (currentPage - 1) * songsPerPage + 1;
        const endItem = Math.min(currentPage * songsPerPage, playlist.length);

        paginationDiv.innerHTML = `
            <div class="pagination-stats">
                <div class="stats-info">
                    <span class="stats-numbers">${startItem}-${endItem}</span>
                    <span class="stats-label">of ${playlist.length} songs</span>
                </div>
                <div class="page-counter">
                    <span class="current-page">${currentPage}</span>
                    <span class="total-pages">/ ${totalPages}</span>
                </div>
            </div>
            <div class="pagination-navigation">
                <button class="nav-btn prev-btn ${currentPage === 1 ? 'disabled' : ''}"
                        id="prev-page-btn" ${currentPage === 1 ? 'disabled' : ''}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 18l-6-6 6-6"/>
                    </svg>
                </button>

                <div class="page-indicators">
                    ${generateModernPageIndicators()}
                </div>

                <button class="nav-btn next-btn ${currentPage === totalPages ? 'disabled' : ''}"
                        id="next-page-btn" ${currentPage === totalPages ? 'disabled' : ''}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18l6-6-6-6"/>
                    </svg>
                </button>
            </div>
        `;

        container.appendChild(paginationDiv);

        // Add event listeners
        document.getElementById('prev-page-btn')?.addEventListener('click', () => goToPage(currentPage - 1));
        document.getElementById('next-page-btn')?.addEventListener('click', () => goToPage(currentPage + 1));

        // Add event listeners for page indicators
        paginationDiv.querySelectorAll('.page-dot').forEach((dot, index) => {
            dot.addEventListener('click', () => {
                const actualPage = index + 1;
                goToPage(actualPage);
            });
        });
    }
    
    // Generate modern page indicator dots
    function generateModernPageIndicators() {
        let indicators = '';
        const maxVisibleDots = 7; // Show max 7 dots

        if (totalPages <= maxVisibleDots) {
            // Show all pages as dots if total is small
            for (let i = 1; i <= totalPages; i++) {
                indicators += `
                    <div class="page-dot ${i === currentPage ? 'active' : ''}"
                         data-page="${i}"
                         title="Page ${i}"></div>
                `;
            }
        } else {
            // Show smart pagination with dots
            const start = Math.max(1, currentPage - 2);
            const end = Math.min(totalPages, currentPage + 2);

            // First dot
            indicators += `
                <div class="page-dot ${1 === currentPage ? 'active' : ''}"
                     data-page="1"
                     title="Page 1"></div>
            `;

            // Spacing dots after first
            if (start > 2) {
                indicators += '<div class="page-spacer"></div>';
            }

            // Middle dots
            for (let i = start; i <= end; i++) {
                if (i === 1 || i === totalPages) continue; // Skip first and last (already added)
                indicators += `
                    <div class="page-dot ${i === currentPage ? 'active' : ''}"
                         data-page="${i}"
                         title="Page ${i}"></div>
                `;
            }

            // Spacing dots before last
            if (end < totalPages - 1) {
                indicators += '<div class="page-spacer"></div>';
            }

            // Last dot
            if (totalPages > 1) {
                indicators += `
                    <div class="page-dot ${totalPages === currentPage ? 'active' : ''}"
                         data-page="${totalPages}"
                         title="Page ${totalPages}"></div>
                `;
            }
        }

        return indicators;
    }
    
    // Navigate to specific page
    function goToPage(page, shouldRender = true) {
        if (page < 1 || page > totalPages || page === currentPage) return;

        // Update current page
        currentPage = page;

        // Play sound effect for page navigation
        playSoundEffect('click');

        // Only re-render if requested (to avoid interrupting playback)
        if (shouldRender) {
            // Add smooth transition
            const container = document.getElementById('playlist-container');
            if (container) {
                container.classList.add('fade-out');
            }

            // Re-render after animation
            setTimeout(() => {
                renderAllSongsSection();
            }, 150);
        } else {
            // Just update pagination controls without re-rendering
            updatePaginationControls();
        }
    }

    // Update pagination controls without re-rendering playlist
    function updatePaginationControls() {
        const existingControls = document.querySelector('.modern-pagination-controls');
        if (existingControls) {
            // Update the stats and navigation
            const statsNumbers = existingControls.querySelector('.stats-numbers');
            const currentPageSpan = existingControls.querySelector('.current-page');
            const totalPagesSpan = existingControls.querySelector('.total-pages');

            if (statsNumbers && currentPageSpan && totalPagesSpan) {
                const startItem = (currentPage - 1) * songsPerPage + 1;
                const endItem = Math.min(currentPage * songsPerPage, playlist.length);

                statsNumbers.textContent = `${startItem}-${endItem}`;
                currentPageSpan.textContent = currentPage;
                totalPagesSpan.textContent = `/ ${totalPages}`;
            }

            // Update active dot
            const dots = existingControls.querySelectorAll('.page-dot');
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index + 1 === currentPage);
            });

            // Update nav button states
            const prevBtn = existingControls.querySelector('.prev-btn');
            const nextBtn = existingControls.querySelector('.next-btn');

            if (prevBtn) prevBtn.classList.toggle('disabled', currentPage === 1);
            if (nextBtn) nextBtn.classList.toggle('disabled', currentPage === totalPages);
        }
    }

    // Render playlist (only main playlist now)
    function renderPlaylist() {
        // Keep current page when playlist changes (don't reset to first page)
        // Only reset if current page is invalid
        if (currentPage > totalPages) {
            currentPage = 1;
        }
        renderAllSongsSection();
        // Removed renderLikedSongsSection() and updateFavoritesCounter()
    }

    // Render "All Songs" section with pagination
    function renderAllSongsSection() {
        const allSongsContainer = document.getElementById('playlist-container');
        if (!allSongsContainer) return;

        // Show all tracks (skipped ones will be styled differently)
        const visiblePlaylist = playlist;

        // Calculate total pages
        totalPages = Math.ceil(visiblePlaylist.length / songsPerPage);
        
        // Ensure current page is valid
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        // Add fade-out class for animation
        allSongsContainer.classList.add('fade-out');

        setTimeout(() => {
            allSongsContainer.innerHTML = '';

            if (visiblePlaylist.length === 0) {
                const emptyMessage = document.createElement('div');
                emptyMessage.textContent = 'No tracks available';
                emptyMessage.classList.add('empty-playlist');
                allSongsContainer.appendChild(emptyMessage);
                allSongsContainer.classList.remove('fade-out');
                allSongsContainer.classList.add('fade-in');
                return;
            }

            // Get songs for current page
            const startIndex = (currentPage - 1) * songsPerPage;
            const endIndex = Math.min(startIndex + songsPerPage, visiblePlaylist.length);
            const pageSongs = visiblePlaylist.slice(startIndex, endIndex);

            // Render songs for current page one by one smoothly
            let pageIndex = 0;
            const addSongItem = () => {
                if (pageIndex < pageSongs.length) {
                    const track = pageSongs[pageIndex];
                    // Find actual index in the full (unfiltered) playlist
                    const actualIndex = playlist.findIndex(t => t.id === track.id);
                    const item = createPlaylistItem(track, actualIndex, false);

                    // Start with opacity 0 for fade-in effect
                    item.style.opacity = '0';
                    item.style.transform = 'translateY(10px)';
                    item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

                    allSongsContainer.appendChild(item);

                    // Trigger fade-in animation
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'translateY(0)';
                    }, 10);

                    pageIndex++;
                    // Add next item after a short delay
                    setTimeout(addSongItem, 30);
                } else {
                    // All songs added, now add pagination controls
                    if (totalPages > 1) {
                        addPaginationControls(allSongsContainer);
                    }
                }
            };

            if (pageSongs.length > 0) {
                addSongItem();
            } else {
                // No songs, still add pagination if needed
                if (totalPages > 1) {
                    addPaginationControls(allSongsContainer);
                }
            }


        // Remove fade-out and add fade-in
        allSongsContainer.classList.remove('fade-out');
        allSongsContainer.classList.add('fade-in');
        updateTrackVisualIndicators();
        triggerSparkAnimation(currentTrackIndex);
        }, 150);
    }

    // Removed renderLikedSongsSection function - favorites are no longer used

    // Enhanced playlist item click handler
    function createPlaylistItem(track, mainIndex, isLikedSection) {
        const item = document.createElement('div');
        item.classList.add('playlist-item');
        item.setAttribute('data-track-id', track.id);

        if (mainIndex === currentTrackIndex) {
            item.classList.add('active');
        }

        // Add 'skipped-track' class if track is in skipped list
        if (skippedTracks.includes(track.id)) {
            item.classList.add('skipped-track');
        }

        // Track thumbnail
        const thumbnail = document.createElement('img');
        thumbnail.alt = track.title;
        thumbnail.classList.add('track-thumbnail');

        // Set thumbnail source with robust fallback handling
        const defaultThumbnail = '/codebank/samma3ny/dr.dc.png';
        const fallbackSvg = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><rect fill="#1a1a2e" width="60" height="60"/><text x="50%" y="50%" fill="#00d4ff" text-anchor="middle" dy=".3em" font-family="Arial" font-size="10">Dr.D</text></svg>');
        
        // Force check if image actually loads
        const img = new Image();
        img.onload = () => { thumbnail.src = defaultThumbnail; };
        img.onerror = () => { thumbnail.src = fallbackSvg; };
        img.src = defaultThumbnail;

        // Track details
        const details = document.createElement('div');
        details.classList.add('track-details');

        const title = document.createElement('div');
        title.classList.add('track-name');
        title.textContent = track.title || 'Unknown Track';

        const meta = document.createElement('div');
        meta.classList.add('track-meta');
        const d = track.duration && track.duration !== '0:00' ? track.duration : '';
        meta.textContent = `${d}${d ? ' • ' : ''}${track.source === 'cloudinary' ? 'Dr.D|CopyRights-Master' : 'Local'}`;

        details.appendChild(title);
        details.appendChild(meta);

        // Track actions
        const actions = document.createElement('div');
        actions.classList.add('track-actions');

        const playBtn = document.createElement('button');
        playBtn.classList.add('action-btn');

        // Set appropriate play/pause icon
        if (mainIndex === currentTrackIndex && isPlaying) {
            playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z"/>
            </svg>`;
            playBtn.title = 'Pause';
        } else {
            playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>`;
            playBtn.title = 'Play';
        }

        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleTrackPlayback(mainIndex);
        });

        const likeBtn = document.createElement('button');
        likeBtn.classList.add('action-btn', 'like');
        likeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>`;
        likeBtn.title = 'Like (for admin statistics)';
        likeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLikeTrack(track, likeBtn);
        });

        // Skip button - flags track to be skipped in playlist
        const skipBtn = document.createElement('button');
        skipBtn.classList.add('action-btn', 'skip-btn');
        const isSkipped = skippedTracks.includes(track.id);
        skipBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
        </svg>`;
        skipBtn.title = isSkipped ? 'Unskip' : 'Skip this song';
        skipBtn.classList.toggle('skipped', isSkipped);
        skipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            skipSong(track, skipBtn);
        });

        const downloadBtn = document.createElement('button');
        downloadBtn.classList.add('action-btn', 'download');
        downloadBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>`;
        downloadBtn.title = 'Download';
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadSong(track, downloadBtn);
        });

        const shareBtn = document.createElement('button');
        shareBtn.classList.add('action-btn', 'share-btn');
        shareBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
        </svg>`;
        shareBtn.title = 'Share to E7ki!';
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            shareSong(track);
        });

        actions.appendChild(playBtn);
        actions.appendChild(likeBtn);
        actions.appendChild(skipBtn);
        actions.appendChild(shareBtn);
        actions.appendChild(downloadBtn);

        // Prevent default clicks on non-button areas
        thumbnail.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
        details.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });

        item.appendChild(thumbnail);
        item.appendChild(details);
        item.appendChild(actions);

        // Disable default item clicks; only action buttons are interactive
        item.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });

        return item;
    }

    // Enhanced playback handler
    function handleTrackPlayback(index) {
        if (index === currentTrackIndex) {
            // Same track - toggle play/pause
            if (isPlaying) {
                pauseTrack();
            } else {
                // If this is the current track but audio isn't loaded, load it first
                if (!audioPlayer.src || audioPlayer.src === '') {
                    loadAudioAndPlay(playlist[index]);
                } else {
                    playTrack();
                }
            }
        } else {
            // Different track - load and play
            loadTrack(index, true); // true = play immediately
        }
    }

    // Removed updateFavoritesCounter function - favorites are no longer used

    // Removed addStarAnimation function - favorites are no longer used

    // Removed removeFavorite function - favorites are no longer used

    // Removed isTrackLiked function - favorites are no longer used

    

    // Format time (seconds to MM:SS)
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }
    
    // --- Format file size nicely ---
    function formatFileSize(bytes) {
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
      if (bytes < 1024 * 1024 * 1024)
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }
    
    // Update progress bar
    function updateProgress() {
        if (audioPlayer.duration) {
            const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progress.style.width = `${progressPercent}%`;
            currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
            durationDisplay.textContent = formatTime(audioPlayer.duration);

            // Update circular progress ring (circumference = 2 * π * r = 2 * π * 155 = 974)
            const circleProgress = 974 - (progressPercent / 100) * 974;
            if (progressCircle) {
                progressCircle.style.strokeDashoffset = circleProgress;
                // Enhanced visual feedback for progress ring
                if (progressPercent > 0) {
                    progressCircle.style.filter = 'drop-shadow(0 0 15px rgba(176, 67, 255, 0.6))';
                    progressCircle.style.stroke = 'url(#gradient)';
                } else {
                    progressCircle.style.filter = 'drop-shadow(0 0 8px rgba(176, 67, 255, 0.3))';
                }
                // Add smooth transition for visual changes
                progressCircle.style.transition = 'stroke-dashoffset 0.1s ease, filter 0.3s ease';
            }


        }
    }
    
    // Update active track in playlist without changing pagination
    function updateActiveTrack() {
        // Calculate which page the current track is on
        const trackPage = Math.floor(currentTrackIndex / songsPerPage) + 1;

        // Only update pagination if we're not already on the correct page
        if (currentPage !== trackPage) {
            goToPage(trackPage, false); // false = don't trigger re-render
        }

        // Update visual indicators for the current track
        updateTrackVisualIndicators();
    }

    // Update track visual indicators without changing pages
    function updateTrackVisualIndicators() {
        const playlistItems = document.querySelectorAll('.playlist-item');
        const pageStart = (currentPage - 1) * songsPerPage;
        playlistItems.forEach((item, index) => {
            const actualIndex = pageStart + index;
            if (actualIndex === currentTrackIndex) {
                item.classList.add('active');
                // Update play button icon for active track
                const playBtn = item.querySelector('.action-btn');
                if (playBtn) {
                    playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>`;
                    playBtn.title = isPlaying ? 'Pause' : 'Play';
                }

                // Only auto-scroll if the track is not currently visible
                const itemRect = item.getBoundingClientRect();
                const containerRect = item.parentElement.getBoundingClientRect();

                if (itemRect.top < containerRect.top || itemRect.bottom > containerRect.bottom) {
                    item.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest'
                    });
                }
            } else {
                item.classList.remove('active');
                // Reset play button icon for inactive tracks
                const playBtn = item.querySelector('.action-btn');
                if (playBtn) {
                    playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>`;
                    playBtn.title = 'Play';
                }
            }
        });
    }
    
    // Show loading indicator
    function showLoading(show) {
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'block' : 'none';
        }
    }
    
    // Show error message
    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }
    }
    // Hide error message
    function hideError() {
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    }
    
    // Enhanced refresh playlist with improved loading - Cloudinary only
    async function refreshPlaylist() {
        showLoading(true);
        try {
            // Save current playback state
            const wasPlaying = isPlaying;
            const currentTime = audioPlayer.currentTime;
            const currentTrack = playlist[currentTrackIndex];

            console.log("🔄 Refreshing Cloudinary tracks...");
            const cloudinaryTrackList = await loadCloudinaryTracks();

            // Merge new tracks with existing ones instead of replacing
            const existingTrackIds = new Set(playlist.map(track => track.id));
            const newTracks = cloudinaryTrackList.filter(track => !existingTrackIds.has(track.id));
            playlist = [...playlist, ...newTracks];

            if (playlist.length === 0) {
                console.log("⚠️ No tracks found in Cloudinary. Adding demo tracks for testing.");
                // Add demo tracks as fallback (only if no demo tracks exist)
                const hasDemoTracks = playlist.some(track => track.id.startsWith('demo-'));
                if (!hasDemoTracks) {
                    playlist = [
                        {
                            id: 'demo-1',
                            title: 'Demo Song 1',
                            src: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
                            thumbnail: '',
                            duration: '0:05',
                            source: SOURCES.CLOUDINARY,
                            contentType: 'audio/wav'
                        },
                        {
                            id: 'demo-2',
                            title: 'Demo Song 2',
                            src: 'https://www.soundjay.com/misc/sounds/bell-ringing-04.wav',
                            thumbnail: '',
                            duration: '0:03',
                            source: SOURCES.CLOUDINARY,
                            contentType: 'audio/wav'
                        }
                    ];
                }
            }

            // Set initial track index without loading audio
            currentTrackIndex = 0;
            if (playlist.length > 0) {
                updateCurrentTrackDisplay(playlist[0]);
                updateActiveTrack();
            }
            renderPlaylist();

            // Try to restore previous track
            if (currentTrack) {
                const newIndex = playlist.findIndex(track =>
                    track.id === currentTrack.id && track.source === currentTrack.source
                );

                if (newIndex !== -1) {
                    loadTrack(newIndex);
                    audioPlayer.currentTime = currentTime;

                    if (wasPlaying) {
                        audioPlayer.play();
                    }
                } else {
                    // If track not found, load first track
                    loadTrack(0);
                }
            } else {
                loadTrack(0);
            }

            hideError();
        } catch (error) {
            console.error('Error refreshing playlist:', error);
            console.log("Failed to refresh tracks. Please check your connection and try again.");
        } finally {
            showLoading(false);
        }
    }
    
    let lastRefreshTs = 0;
    const MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
    // Handle network connectivity issues
    function handleNetworkChange() {
        if (navigator.onLine) {
            hideError();
            const now = Date.now();
            const shouldRefresh = (now - lastRefreshTs) > MIN_REFRESH_INTERVAL_MS && !isPlaying;
            if (shouldRefresh) {
                refreshPlaylist();
            }
        } else {
            console.log("Network connection lost. Playback may be interrupted.");
        }
    }
    
    // Enhanced play track function
    async function playTrack() {
        if (playlist.length === 0) {
            console.log("No tracks available to play.");
            return;
        }

        // If no track is loaded but we have a current track, load it
        if (!audioPlayer.src || audioPlayer.src === '') {
            const track = playlist[currentTrackIndex];
            if (track) {
                loadAudioAndPlay(track);
                return;
            }
        }

        audioPlayer.play().catch(error => {
            console.error('Error playing track:', error);
            console.log("Failed to play track. Please try another track.");
        });
        isPlaying = true;
        updatePlayButton();
        cdDisc.classList.add('playing');

        // Add pulsing animation to play button
        const mainPlayBtn = document.querySelector('.main-play-btn');
        if (mainPlayBtn) {
            mainPlayBtn.classList.add('playing');
        }

        playSoundEffect('play');
    }

    // Pause track function
    function pauseTrack() {
        audioPlayer.pause();
        isPlaying = false;
        updatePlayButton();

        // Remove pulsing animation from play button
        const mainPlayBtn = document.querySelector('.main-play-btn');
        if (mainPlayBtn) {
            mainPlayBtn.classList.remove('playing');
        }

        playSoundEffect('pause');
    }

    // Update play button state
    function updatePlayButton() {
        if (playBtn && pauseBtn) {
            if (isPlaying) {
                playBtn.style.display = 'none';
                pauseBtn.style.display = 'block';
            } else {
                playBtn.style.display = 'block';
                pauseBtn.style.display = 'none';
            }
        }

        // Update playlist item buttons
        updatePlaylistPlayButtons();
    }

    // Update all playlist play buttons
    function updatePlaylistPlayButtons() {
        const playlistItems = document.querySelectorAll('.playlist-item');
        playlistItems.forEach((item, index) => {
            const playBtn = item.querySelector('.action-btn');
            if (playBtn) {
                if (index === currentTrackIndex && isPlaying) {
                    playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 4h4v16H6zM14 4h4v16h-4z"/>
                    </svg>`;
                    playBtn.title = 'Pause';
                } else {
                    playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>`;
                    playBtn.title = 'Play';
                }
            }
        });
    }

    // Sound effects settings
    let soundEffectsEnabled = localStorage.getItem('soundEffectsEnabled') !== 'false';

    // Play sound effect
    function playSoundEffect(type) {
        if (!soundEffectsEnabled) return;

        // Create enhanced sound effects using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            const filterNode = audioContext.createBiquadFilter();

            oscillator.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Configure filter for warmer sound
            filterNode.type = 'lowpass';
            filterNode.frequency.setValueAtTime(2000, audioContext.currentTime);

            if (type === 'play') {
                // Vinyl start sound
                oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.15);
                gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
            } else if (type === 'pause') {
                // Vinyl stop sound
                oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
            } else if (type === 'click') {
                // UI click sound
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.03, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
            }

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            // Silently fail if Web Audio API is not supported
            console.warn('Web Audio API not supported:', error);
        }
    }

    // Toggle sound effects
    function toggleSoundEffects() {
        soundEffectsEnabled = !soundEffectsEnabled;
        localStorage.setItem('soundEffectsEnabled', soundEffectsEnabled);
        console.log(`Sound effects ${soundEffectsEnabled ? 'enabled' : 'disabled'}`);
        setTimeout(() => hideError(), 2000);

        // Play test sound
        if (soundEffectsEnabled) {
            playSoundEffect('click');
        }
    }

    // Admin dashboard functionality
    function handleMusicLibraryClick() {
        adminClickCount++;

        // Reset timer if it exists
        if (adminClickTimer) {
            clearTimeout(adminClickTimer);
        }

        // Reset counter after 3 seconds of no clicks
        adminClickTimer = setTimeout(() => {
            adminClickCount = 0;
        }, 3000);

        // Check if we've reached 7 clicks
        if (adminClickCount >= 7) {
            openPasswordModal();
            adminClickCount = 0; // Reset counter
            clearTimeout(adminClickTimer);
        }
    }

    // Open password modal first
    function openPasswordModal() {
        // Create password modal
        const passwordModal = document.createElement('div');
        passwordModal.className = 'password-modal-overlay';
        passwordModal.innerHTML = `
            <div class="password-modal">
                <h3>Enter Admin Password</h3>
                <input type="password" id="admin-password-input" placeholder="Admin password" />
                <div class="password-modal-buttons">
                    <button id="admin-submit-btn">Submit</button>
                    <button id="admin-reset-btn">Reset Password</button>
                </div>
                <div id="password-error" class="error-message" style="display: none;"></div>
            </div>
        `;

        // Add styles for password modal
        const passwordStyles = document.createElement('style');
        passwordStyles.textContent = `
            .password-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(12px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 3000;
                animation: fadeIn 0.3s ease;
            }

            .password-modal {
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border-radius: 20px;
                padding: 30px;
                max-width: 400px;
                width: 90%;
                border: 1px solid rgba(176, 67, 255, 0.3);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                text-align: center;
            }

            .password-modal h3 {
                color: #B043FF;
                margin-bottom: 20px;
                font-size: 20px;
            }

            .password-modal input {
                width: 100%;
                padding: 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.1);
                color: white;
                font-size: 16px;
                margin-bottom: 20px;
            }

            .password-modal input::placeholder {
                color: rgba(255, 255, 255, 0.6);
            }

            .password-modal input:focus {
                outline: none;
                border-color: #B043FF;
                box-shadow: 0 0 0 2px rgba(176, 67, 255, 0.3);
            }

            .password-modal-buttons {
                display: flex;
                gap: 10px;
                justify-content: center;
            }

            .password-modal-buttons button {
                background: linear-gradient(135deg, #B043FF, #FF77E9);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            }

            .password-modal-buttons button:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(176, 67, 255, 0.4);
            }

            .error-message {
                color: #ff6b6b;
                margin-top: 15px;
                font-size: 14px;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
        `;

        document.head.appendChild(passwordStyles);
        document.body.appendChild(passwordModal);

        const passwordInput = document.getElementById('admin-password-input');
        const submitBtn = document.getElementById('admin-submit-btn');
        const resetBtn = document.getElementById('admin-reset-btn');
        const errorDiv = document.getElementById('password-error');

        submitBtn.addEventListener('click', () => {
            const password = passwordInput.value;
            const storedPassword = localStorage.getItem('admin_pass') || 'doitasap2025';

            if (password === storedPassword) {
                passwordModal.remove();
                passwordStyles.remove();
                openAdminDashboard();
            } else {
                errorDiv.textContent = 'Incorrect password. Try again.';
                errorDiv.style.display = 'block';
            }
        });

        resetBtn.addEventListener('click', () => {
            const newPassword = prompt('Enter new admin password:');
            if (newPassword && newPassword.length >= 6) {
                localStorage.setItem('admin_pass', newPassword);
                alert('Password reset successfully!');
                passwordModal.remove();
                passwordStyles.remove();
            } else if (newPassword) {
                alert('Password must be at least 6 characters long.');
            }
        });

        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitBtn.click();
            }
        });

        // Close on backdrop click
        passwordModal.addEventListener('click', (e) => {
            if (e.target === passwordModal) {
                passwordModal.remove();
                passwordStyles.remove();
            }
        });
    }

    // Open admin dashboard
    function openAdminDashboard() {
        // Create admin dashboard modal
        const adminModal = document.createElement('div');
        adminModal.className = 'admin-modal-overlay';
        adminModal.innerHTML = `
            <div class="admin-modal">
                <div class="admin-modal-header">
                    <h2>Samma3ny Admin Dashboard</h2>
                    <button class="close-button">×</button>
                </div>
                <div class="admin-modal-tabs">
                    <button class="admin-tab active" data-tab="upload">Bulk Upload</button>
                    <button class="admin-tab" data-tab="manage">Manage Songs</button>
                </div>
                <div class="admin-modal-content">
                    <div id="upload-tab" class="admin-tab-content active">
                        <div class="upload-section">
                            <h3>Bulk Upload Audio Files</h3>
                            <div class="upload-info">
                                <p>Upload multiple audio files at once. Files will be automatically processed with metadata extraction.</p>
                                <ul>
                                    <li>Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC</li>
                                    <li>Maximum file size: 200MB per file</li>
                                    <li>Maximum files: 2000 at once</li>
                                    <li>Automatic metadata extraction from filenames</li>
                                    <li>Cloud storage with local fallback</li>
                                </ul>
                            </div>
                            <div class="dropzone">
                                <input type="file" id="file-input" multiple accept="audio/*" style="display: none;">
                                <div class="dropzone-content">
                                    <p>Drag & drop audio files here, or click to select files</p>
                                    <button id="select-files-btn" class="upload-btn">Select Files</button>
                                </div>
                            </div>
                            <div id="file-list" class="file-list"></div>
                            <div class="upload-actions">
                                <button id="upload-btn" class="upload-btn primary" style="display: none;">Upload All Files</button>
                                <button id="clear-files-btn" class="upload-btn secondary" style="display: none;">Clear All</button>
                            </div>
                        </div>
                    </div>
                    <div id="manage-tab" class="admin-tab-content">
                        <div class="manage-section">
                            <h3>Manage Songs</h3>
                            <div class="manage-controls">
                                <button id="toggle-rearrange" title="Enable rearrange" aria-label="Enable rearrange">↕ Rearrange</button>
                                <button id="save-order" title="Save order" aria-label="Save order" disabled>💾 Save Order</button>
                                <button id="rename-selected" title="Rename selected" aria-label="Rename selected" disabled>✏️ Rename Selected</button>
                                <button id="select-all" title="Select all" aria-label="Select all">✅ Select All</button>
                                <button id="clear-selection" title="Clear selection" aria-label="Clear selection">❌ Clear</button>
                            </div>
                            <div id="song-list" class="song-list" role="list" aria-label="Song list"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add styles for admin modal
        const adminStyles = document.createElement('style');
        adminStyles.textContent = `
            .admin-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(12px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
                animation: modalFadeIn 0.3s ease;
            }

            .admin-modal {
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border-radius: 20px;
                max-width: 800px;
                width: 90%;
                max-height: 80vh;
                overflow: hidden;
                border: 1px solid rgba(176, 67, 255, 0.3);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                animation: modalSlideIn 0.3s ease;
            }

            .admin-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 30px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .admin-modal-header h2 {
                color: #B043FF;
                margin: 0;
                font-size: 24px;
            }

            .close-button {
                background: none;
                border: none;
                color: #fff;
                font-size: 30px;
                cursor: pointer;
                padding: 0;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }

            .close-button:hover {
                background: rgba(255, 255, 255, 0.1);
                transform: rotate(90deg);
            }

            .admin-modal-tabs {
                display: flex;
                padding: 0 30px;
                background: rgba(0, 0, 0, 0.2);
            }

            .admin-tab {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.7);
                padding: 15px 20px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
                border-bottom: 2px solid transparent;
            }

            .admin-tab.active {
                color: #B043FF;
                border-bottom-color: #B043FF;
            }

            .admin-tab:hover {
                color: #FF77E9;
            }

            .admin-modal-content {
                padding: 30px;
                max-height: calc(80vh - 120px);
                overflow-y: auto;
            }

            .admin-tab-content {
                display: none;
            }

            .admin-tab-content.active {
                display: block;
            }

            .dropzone {
                border: 2px dashed rgba(176, 67, 255, 0.3);
                border-radius: 10px;
                padding: 40px;
                text-align: center;
                transition: all 0.3s ease;
                margin-bottom: 20px;
            }

            .dropzone:hover {
                border-color: #B043FF;
                background: rgba(176, 67, 255, 0.1);
            }

            .dropzone-content p {
                color: #ccc;
                margin-bottom: 20px;
                font-size: 16px;
            }

            .upload-btn {
                background: linear-gradient(135deg, #B043FF, #FF77E9);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            }

            .upload-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(176, 67, 255, 0.4);
            }

            .file-list {
                margin-top: 20px;
            }

            .file-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                margin-bottom: 10px;
            }

            .file-item span {
                color: #fff;
            }

            .file-item button {
                background: #ff4757;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
            }

            .song-list {
                max-height: 400px;
                overflow-y: auto;
            }

            .manage-controls {
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
            }
            .manage-controls button {
                background: rgba(255, 255, 255, 0.08);
                color: #fff;
                border: 1px solid rgba(255,255,255,0.15);
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s ease;
            }
            .manage-controls button[disabled] {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .song-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                margin-bottom: 10px;
                gap: 10px;
            }
            .song-item.dragging {
                outline: 2px dashed #B043FF;
                background: rgba(176, 67, 255, 0.08);
            }
            .drag-handle {
                cursor: grab;
                user-select: none;
                padding: 6px 8px;
                border-radius: 6px;
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.12);
                display: none;
            }
            .drag-handle:active { cursor: grabbing; }
            .song-checkbox { accent-color: #B043FF; }
            .rearrange-active .drag-handle { display: inline-flex; }
            .rearrange-active .song-item { cursor: move; }

            .song-info h4 {
                margin: 0 0 5px 0;
                color: #fff;
            }

            .song-info p {
                margin: 0;
                color: #ccc;
                font-size: 14px;
            }

            .song-actions {
                display: flex;
                gap: 10px;
            }

            .song-actions button {
                background: linear-gradient(135deg, #B043FF, #FF77E9);
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.3s ease;
            }

            .song-actions button:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 10px rgba(176, 67, 255, 0.3);
            }

            .song-actions button.playing {
                background: linear-gradient(135deg, #FF4757, #FF6B7A);
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0% { box-shadow: 0 4px 10px rgba(255, 71, 87, 0.3); }
                50% { box-shadow: 0 4px 20px rgba(255, 71, 87, 0.6); }
                100% { box-shadow: 0 4px 10px rgba(255, 71, 87, 0.3); }
            }

            /* CD Player Rotation Animation */
            .cd-disc {
                transition: transform 0.3s ease;
            }
            
            .cd-disc.playing {
                animation: cd-rotate 3s linear infinite;
            }

            @keyframes cd-rotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            }

            .song-actions button.delete {
                background: linear-gradient(135deg, #ff4757, #ff3838);
            }

            @keyframes modalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes modalSlideIn {
                from { transform: scale(0.9) translateY(-20px); opacity: 0; }
                to { transform: scale(1) translateY(0); opacity: 1; }
            }
        `;

        document.head.appendChild(adminStyles);
        document.body.appendChild(adminModal);

        // Initialize admin functionality
        initAdminModal(adminModal, adminStyles);

        // Play admin sound effect
        playSoundEffect('click');

        console.log('🔧 Admin Dashboard opened');
    }

    // Initialize admin modal functionality
    function initAdminModal(modal, styles) {
        const closeBtn = modal.querySelector('.close-button');
        const tabs = modal.querySelectorAll('.admin-tab');
        const tabContents = modal.querySelectorAll('.admin-tab-content');
        const fileInput = document.getElementById('file-input');
        const selectFilesBtn = document.getElementById('select-files-btn');
        const uploadBtn = document.getElementById('upload-btn');
        const clearFilesBtn = document.getElementById('clear-files-btn');
        const fileList = document.getElementById('file-list');
        const songList = document.getElementById('song-list');
        const toggleRearrangeBtn = document.getElementById('toggle-rearrange');
        const saveOrderBtn = document.getElementById('save-order');
        const renameSelectedBtn = document.getElementById('rename-selected');
        const selectAllBtn = document.getElementById('select-all');
        const clearSelectionBtn = document.getElementById('clear-selection');

        let manageSongs = [];
        let rearrangeMode = false;
        let selectedIds = new Set();

        let selectedFiles = [];

        // Close modal
        closeBtn.addEventListener('click', () => {
            modal.remove();
            styles.remove();
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                styles.remove();
            }
        });

        // Tab switching
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                const tabName = tab.dataset.tab;
                document.getElementById(tabName + '-tab').classList.add('active');

                if (tabName === 'manage') {
                    loadSongList();
                }
            });
        });

        // File selection
        selectFilesBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });

        // Drag and drop
        const dropzone = modal.querySelector('.dropzone');
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = '#B043FF';
            dropzone.style.background = 'rgba(176, 67, 255, 0.1)';
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.style.borderColor = 'rgba(176, 67, 255, 0.3)';
            dropzone.style.background = 'transparent';
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'rgba(176, 67, 255, 0.3)';
            dropzone.style.background = 'transparent';
            handleFiles(e.dataTransfer.files);
        });

        // Bulk upload files
        uploadBtn.addEventListener('click', async () => {
            if (selectedFiles.length === 0) return;

            try {
                uploadBtn.disabled = true;
                uploadBtn.textContent = 'Uploading...';

                const result = await uploadBulkAudioFiles(selectedFiles);

                // Clear file list on success
                selectedFiles = [];
                renderFileList();
                uploadBtn.style.display = 'none';
                clearFilesBtn.style.display = 'none';

                // Show detailed results
                if (result.errors && result.errors.length > 0) {
                    console.warn('Upload errors:', result.errors);
                    showError(`Upload completed with ${result.errors.length} error(s). Check console for details.`);
                }

            } catch (error) {
                console.error('Bulk upload failed:', error);
                showError('Bulk upload failed. Please try again.');
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload All Files';
            }
        });

        // Clear files button
        clearFilesBtn.addEventListener('click', () => {
            selectedFiles = [];
            renderFileList();
            uploadBtn.style.display = 'none';
            clearFilesBtn.style.display = 'none';
            console.log('🗑️ File list cleared');
        });

        function handleFiles(files) {
            for (const file of files) {
                if (file.type.startsWith('audio/')) {
                    selectedFiles.push(file);
                }
            }
            renderFileList();
            if (selectedFiles.length > 0) {
                uploadBtn.style.display = 'block';
            }
        }

        function renderFileList() {
            fileList.innerHTML = '';
            selectedFiles.forEach((file, index) => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.innerHTML = `
                    <span>${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button onclick="removeFile(${index})">Remove</button>
                `;
                fileList.appendChild(item);
            });
        }

        window.removeFile = (index) => {
            selectedFiles.splice(index, 1);
            renderFileList();
            if (selectedFiles.length === 0) {
                uploadBtn.style.display = 'none';
            }
        };

        async function loadSongList() {
            try {
                const response = await fetch(`${API_BASE}/api/samma3ny/songs`, { credentials: 'include' });
                const songs = await response.json();
                manageSongs = songs;
                renderManageList();
            } catch (error) {
                console.error('Failed to load songs:', error);
                songList.innerHTML = '<p>Failed to load songs</p>';
            }
        }

        function renderManageList() {
            songList.innerHTML = '';
            manageSongs.forEach((song, idx) => {
                    const songId = song.public_id || song.id;
                    const isCurrentSong = currentTrackIndex >= 0 && playlist[currentTrackIndex] && playlist[currentTrackIndex].id === songId;
                    const buttonText = (isCurrentSong && isPlaying) ? 'Pause' : 'Play';
                const item = document.createElement('div');
                item.className = 'song-item' + (rearrangeMode ? ' rearrange-active' : '');
                item.setAttribute('role','listitem');
                item.setAttribute('tabindex','0');
                item.dataset.id = songId;
                item.dataset.index = String(idx);
                const name = song.name || song.display_name || song.title || 'Unknown Title';
                const actions = `
                    <div class="song-actions">
                        <button onclick="playSong('${songId}')" ${isCurrentSong ? 'class="playing"' : ''} title="Play/Pause" aria-label="Play or pause">${buttonText}</button>
                        <button class="delete" onclick="deleteSong('${songId}')" title="Delete" aria-label="Delete">Delete</button>
                    </div>
                `;
                const handle = `<div class="drag-handle" draggable="true" aria-label="Drag to reorder">↕</div>`;
                const checkbox = `<input type="checkbox" class="song-checkbox" data-id="${songId}" ${selectedIds.has(songId) ? 'checked' : ''} aria-label="Select song">`;
                const renameBtn = `<button class="rename-btn" data-id="${songId}" title="Rename" aria-label="Rename">✏️</button>`;
                const info = `<div class="song-info"><h4>${name}</h4><p>${song.artist || 'Dr.D'}</p></div>`;
                item.innerHTML = `${checkbox}${rearrangeMode ? handle : ''}${info}${renameBtn}${actions}`;
                attachItemEvents(item);
                songList.appendChild(item);
            });
            renameSelectedBtn.disabled = selectedIds.size === 0;
        }

        function attachItemEvents(item) {
            const id = item.dataset.id;
            const renameBtn = item.querySelector('.rename-btn');
            if (renameBtn) {
                renameBtn.addEventListener('click', () => startRename(id));
            }
            const cb = item.querySelector('.song-checkbox');
            if (cb) {
                cb.addEventListener('change', () => {
                    if (cb.checked) selectedIds.add(id); else selectedIds.delete(id);
                    renameSelectedBtn.disabled = selectedIds.size === 0;
                });
            }
            if (rearrangeMode) {
                const handle = item.querySelector('.drag-handle');
                if (handle) {
                    handle.addEventListener('dragstart', e => {
                        item.classList.add('dragging');
                        e.dataTransfer.setData('text/plain', item.dataset.index);
                    });
                    handle.addEventListener('dragend', () => item.classList.remove('dragging'));
                    item.addEventListener('dragover', e => {
                        e.preventDefault();
                    });
                    item.addEventListener('drop', e => {
                        e.preventDefault();
                        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                        const toIdx = parseInt(item.dataset.index);
                        if (isNaN(fromIdx) || isNaN(toIdx) || fromIdx === toIdx) return;
                        const moved = manageSongs.splice(fromIdx, 1)[0];
                        manageSongs.splice(toIdx, 0, moved);
                        saveOrderBtn.disabled = false;
                        renderManageList();
                    });
                }
                item.addEventListener('keydown', e => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const idx = parseInt(item.dataset.index);
                        const dir = e.key === 'ArrowUp' ? -1 : 1;
                        const ni = idx + dir;
                        if (ni < 0 || ni >= manageSongs.length) return;
                        const moved = manageSongs.splice(idx, 1)[0];
                        manageSongs.splice(ni, 0, moved);
                        saveOrderBtn.disabled = false;
                        renderManageList();
                        const nextItem = songList.querySelector(`.song-item[data-index="${ni}"]`);
                        nextItem && nextItem.focus();
                    }
                });
            }
        }

        function startRename(id) {
            const item = songList.querySelector(`.song-item[data-id="${id}"]`);
            if (!item) return;
            const info = item.querySelector('.song-info');
            const current = info.querySelector('h4').textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = current;
            input.maxLength = 200;
            input.setAttribute('aria-label','Edit name');
            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save';
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            info.innerHTML = '';
            info.appendChild(input);
            info.appendChild(saveBtn);
            info.appendChild(cancelBtn);
            input.focus();
            saveBtn.addEventListener('click', async () => {
                const name = (input.value || '').trim();
                if (!name) return;
                saveBtn.disabled = true;
                try {
                    await fetch(`${API_BASE}/api/samma3ny/rename`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ id, name })
                    });
                    const song = manageSongs.find(s => (s.public_id || s.id) === id);
                    if (song) song.name = name;
                    renderManageList();
                } catch (_) {
                    saveBtn.disabled = false;
                }
            });
            cancelBtn.addEventListener('click', () => {
                renderManageList();
            });
        }

        toggleRearrangeBtn.addEventListener('click', () => {
            rearrangeMode = !rearrangeMode;
            toggleRearrangeBtn.textContent = rearrangeMode ? '↕ Rearranging' : '↕ Rearrange';
            renderManageList();
        });

        saveOrderBtn.addEventListener('click', async () => {
            const positions = manageSongs.map((s, i) => ({ id: s.public_id || s.id, position: i }));
            saveOrderBtn.disabled = true;
            saveOrderBtn.textContent = 'Saving...';
            try {
                await fetch(`${API_BASE}/api/samma3ny/order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ positions })
                });
            } catch (_) {}
            saveOrderBtn.textContent = '💾 Save Order';
        });

        renameSelectedBtn.addEventListener('click', async () => {
            const name = window.prompt('Enter name for selected songs');
            if (!name) return;
            const ids = Array.from(selectedIds);
            renameSelectedBtn.disabled = true;
            try {
                await fetch(`${API_BASE}/api/samma3ny/rename-bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ ids, name })
                });
                for (const id of ids) {
                    const song = manageSongs.find(s => (s.public_id || s.id) === id);
                    if (song) song.name = name;
                }
                renderManageList();
            } catch (_) {
                renameSelectedBtn.disabled = false;
            }
        });

        selectAllBtn.addEventListener('click', () => {
            selectedIds = new Set(manageSongs.map(s => s.public_id || s.id));
            renderManageList();
        });
        clearSelectionBtn.addEventListener('click', () => {
            selectedIds.clear();
            renderManageList();
        });
        }

        window.playSong = (songId) => {
            const songIndex = playlist.findIndex(s => s.id === songId);
            if (songIndex !== -1) {
                // If same song is clicked
                if (currentTrackIndex === songIndex && isPlaying) {
                    // Pause the current song
                    pauseTrack();
                } else if (currentTrackIndex === songIndex && !isPlaying) {
                    // Resume the current song
                    playTrack();
                } else {
                    // Load and play a different song
                    loadTrack(songIndex);
                    playTrack();
                }
            }
        };

        window.deleteSong = async (songId) => {
            if (confirm('Are you sure you want to delete this song?')) {
                try {
                    // Note: Delete functionality would need to be implemented in the server
                    // For now, just show a message
                    console.log('Delete functionality needs server implementation');
                } catch (error) {
                    console.error('Failed to delete song:', error);
                    console.log('Failed to delete song');
                }
            }
        };
    // Event listeners
    playBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        playTrack();
    });
    pauseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        pauseTrack();
    });

    // Enhanced previous/next navigation
    prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentTrackIndex > 0) {
            loadTrack(currentTrackIndex - 1, isPlaying); // Maintain play state
        }
    });

    nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentTrackIndex < playlist.length - 1) {
            loadTrack(currentTrackIndex + 1, isPlaying); // Maintain play state
        }
    });


    
    if (stopBtn) {
        stopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            isPlaying = false;
            updatePlayButton();
            cdDisc.classList.remove('playing');
        });
    }
    
    // Sound button event listener for mute/unmute
    if (soundBtn) {
        soundBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            audioPlayer.muted = !audioPlayer.muted;
            
            // Update button appearance based on mute state
            if (audioPlayer.muted) {
                soundBtn.classList.add('muted');
                soundBtn.innerHTML = '🔇';
                soundBtn.title = 'Unmute';
            } else {
                soundBtn.classList.remove('muted');
                soundBtn.innerHTML = '🔊';
                soundBtn.title = 'Mute';
            }
        });
    }
    
    progressBar.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!audioPlayer.duration) return;

        const progressWidth = progressBar.clientWidth;
        const clickPosition = e.offsetX;
        const seekTime = (clickPosition / progressWidth) * audioPlayer.duration;
        audioPlayer.currentTime = seekTime;
    });
    
    // Add refresh button event listener
    if (refreshBtn) {
        refreshBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            refreshPlaylist();
        });
    }

    // Add download button event listener
    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const currentTrack = playlist[currentTrackIndex];
            if (currentTrack) {
                downloadSong(currentTrack);
            } else {
                console.log("No track selected for download.");
            }
        });
    }

    // Add storage info button event listener
    const storageInfoBtn = document.getElementById('storage-info-btn');
    if (storageInfoBtn) {
        storageInfoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showStorageInfo();
        });
    }
    


    


    
    // Network connectivity listeners
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    
    audioPlayer.addEventListener('timeupdate', updateProgress);
    
    // Optimized audio metadata loading with debouncing to prevent excessive re-renders
    let metadataUpdateTimeout;
    audioPlayer.addEventListener('loadedmetadata', () => {
        // Debounce metadata updates to prevent excessive re-renders
        clearTimeout(metadataUpdateTimeout);
        metadataUpdateTimeout = setTimeout(() => {
            if (playlist[currentTrackIndex]) {
                const oldDuration = playlist[currentTrackIndex].duration;
                playlist[currentTrackIndex].duration = formatTime(audioPlayer.duration);
                
                // Only re-render if duration actually changed
                if (oldDuration !== playlist[currentTrackIndex].duration) {
                    updateTrackVisualIndicators(); // More efficient than full re-render
                }
            }
        }, 500); // 500ms debounce
    });
    
    audioPlayer.addEventListener('error', (e) => {
        console.error('Audio player error:', e);
        console.log(`Error playing track: ${playlist[currentTrackIndex]?.title || 'Unknown'}`);
    });
    
    // Enhanced auto-play next track
    // Duplicate ended handler removed; handled above in setup
    
    // Function to send height to parent window
    function sendHeightToParent() {
        const height = document.documentElement.scrollHeight;
        window.parent.postMessage({
            type: 'resize',
            height: height,
            iframeId: 'samma3ny-dashboard'
        }, window.location.origin);
    }

    // Send height on load and resize
    window.addEventListener('load', sendHeightToParent);
    window.addEventListener('resize', sendHeightToParent);

    // Listen for messages from admin interface
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'requestHeight') {
            sendHeightToParent();
        }
        
        // Handle playlist updates from admin interface
        if (event.data && event.data.type === 'playlist-update' && event.data.action === 'refresh') {
            console.log('🔄 Refreshing playlist due to admin upload...');
            setTimeout(() => {
                refreshPlaylist();
            }, 1000); // Give a brief delay for server to process
        }
    });

    // Initialize player
    await initPlayer();

    // Initialize IndexedDB and show storage info
    await initDB();
    showStorageInfo();

    // Removed favorites counter initialization

    // Initialize navigation arrows
    initNavigationArrows();

    

    // Send initial height after player initializes
    setTimeout(sendHeightToParent, 500);

    // Clear all downloaded tracks
    async function clearAllDownloads() {
        if (confirm('Are you sure you want to delete all downloaded tracks? This cannot be undone.')) {
            try {
                if (dbInstance) {
                    const tx = dbInstance.transaction("tracks", "readwrite");
                    const store = tx.objectStore("tracks");
                    store.clear();
                }
                // Also clear any remaining localStorage metadata
                localStorage.removeItem('downloadedTracks');
                renderPlaylist();
                console.log('All downloaded tracks cleared');
            } catch (error) {
                console.error('Error clearing downloads:', error);
                console.log('Failed to clear downloaded tracks');
            }
        }
    }

    // Expose download functions globally for external access
    window.downloadSong = downloadSong;
    window.playOfflineSong = playOfflineSong;
    window.getAllSongs = getAllSongs;
    window.showStorageInfo = showStorageInfo;
    window.clearAllDownloads = clearAllDownloads;
    window.clearSongCache = clearSongCache;

    // Initialize navigation arrows
    function initNavigationArrows() {
        const leftArrow = document.querySelector('.nav-arrow-left');
        const rightArrow = document.querySelector('.nav-arrow-right');

        if (leftArrow) {
            leftArrow.addEventListener('click', () => {
                // Navigate to codebank page
                window.location.href = window.location.origin + '/codebank/indexCB.html';
            });
        }

        if (rightArrow) {
            rightArrow.addEventListener('click', () => {
                // Navigate to home/yt-new page
                window.location.href = window.location.origin + '/codebank/yt-coder/yt-new.html';
            });
        }
    }

    // ===== SHARE FUNCTIONALITY =====

    // Main share function
    async function shareSong(track) {
        try {
            showShareLoading(track);
            
            // Generate share token
            const shareData = await generateShareToken(track);
            
            // Show share confirmation dialog
            showShareDialog(track, shareData);
            
            // Track analytics
            trackShareEvent(track.id, 'share_initiated');
            
        } catch (error) {
            console.error('Error sharing song:', error);
            showError('Failed to share song. Please try again.');
        }
    }

    // Generate share token via backend API
    async function generateShareToken(track) {
        try {
            const response = await fetch(`${API_BASE}/api/share/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    songId: track.id,
                    title: track.title,
                    artist: track.artist || 'Dr.D and the Master',
                    duration: track.duration,
                    thumbnail: track.thumbnail,
                    audioUrl: track.src,
                    source: 'samma3ny'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error generating share token:', error);
            // Fallback to local token generation
            return generateLocalShareToken(track);
        }
    }

    // Fallback local token generation
    function generateLocalShareToken(track) {
        const token = btoa(JSON.stringify({
            songId: track.id,
            title: track.title,
            artist: track.artist || 'Dr.D and the Master',
            duration: track.duration,
            thumbnail: track.thumbnail,
            timestamp: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        }));
        
        return {
            token,
            shortUrl: `https://e7ki.app/s/${token}`,
            expiresAt: Date.now() + (24 * 60 * 60 * 1000)
        };
    }

    // Show share loading state
    function showShareLoading(track) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'share-loading';
        loadingDiv.className = 'share-loading-overlay';
        loadingDiv.innerHTML = `
            <div class="share-loading-content">
                <div class="spinner"></div>
                <p>Preparing share for "${track.title}"...</p>
            </div>
        `;
        document.body.appendChild(loadingDiv);
    }

    // Hide share loading
    function hideShareLoading() {
        const loading = document.getElementById('share-loading');
        if (loading) {
            loading.remove();
        }
    }

    // Show share dialog
    function showShareDialog(track, shareData) {
        hideShareLoading();
        
        const dialog = document.createElement('div');
        dialog.className = 'share-dialog-overlay';
        dialog.innerHTML = `
            <div class="share-dialog">
                <div class="share-dialog-header">
                    <h3>Share Song</h3>
                    <button class="share-close-btn">×</button>
                </div>
                <div class="share-dialog-content">
                    <div class="share-preview">
                        <img src="${track.thumbnail || './dr.dc.png'}" alt="${track.title}" class="share-thumbnail">
                        <div class="share-info">
                            <h4>${track.title}</h4>
                            <p>${track.artist || 'Dr.D'} • ${track.duration}</p>
                        </div>
                    </div>
                    <div class="share-message">
                        <label for="share-message-input">Custom message (optional):</label>
                        <textarea id="share-message-input" placeholder="Add a personal message..."></textarea>
                    </div>
                    <div class="share-url-container">
                        <label>Share URL:</label>
                        <div class="share-url-input">
                            <input type="text" id="share-url" value="${shareData.shortUrl}" readonly>
                            <button id="copy-url-btn" class="copy-btn">Copy</button>
                        </div>
                    </div>
                    <div class="share-platforms">
                        <h4>Share to:</h4>
                        <div class="platform-buttons">
                            <button class="platform-btn e7ky-btn" data-platform="e7ky">
                                <span class="platform-icon">💬</span>
                                <span class="platform-name">E7ki! Chat</span>
                            </button>
                            <button class="platform-btn web-btn" data-platform="web">
                                <span class="platform-icon">🌐</span>
                                <span class="platform-name">Web App</span>
                            </button>
                            <button class="platform-btn mobile-btn" data-platform="mobile">
                                <span class="platform-icon">📱</span>
                                <span class="platform-name">Mobile App</span>
                            </button>
                        </div>
                    </div>
                    <div class="share-actions">
                        <button id="cancel-share-btn" class="cancel-btn">Cancel</button>
                        <button id="confirm-share-btn" class="confirm-btn">Share Now</button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        const shareStyles = document.createElement('style');
        shareStyles.textContent = `
            .share-loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(12px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 3000;
            }

            .share-loading-content {
                text-align: center;
                color: white;
            }

            .share-loading-content .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(176, 67, 255, 0.3);
                border-top: 3px solid #B043FF;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .share-dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(12px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 3000;
                animation: fadeIn 0.3s ease;
            }

            .share-dialog {
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border-radius: 20px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow: hidden;
                border: 1px solid rgba(176, 67, 255, 0.3);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                animation: slideIn 0.3s ease;
            }

            .share-dialog-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 25px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .share-dialog-header h3 {
                color: #B043FF;
                margin: 0;
                font-size: 20px;
            }

            .share-close-btn {
                background: none;
                border: none;
                color: #fff;
                font-size: 28px;
                cursor: pointer;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }

            .share-close-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                transform: rotate(90deg);
            }

            .share-dialog-content {
                padding: 25px;
                max-height: calc(90vh - 80px);
                overflow-y: auto;
            }

            .share-preview {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 20px;
                padding: 15px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
            }

            .share-thumbnail {
                width: 60px;
                height: 60px;
                border-radius: 8px;
                object-fit: cover;
            }

            .share-info h4 {
                color: #fff;
                margin: 0 0 5px 0;
                font-size: 16px;
            }

            .share-info p {
                color: #ccc;
                margin: 0;
                font-size: 14px;
            }

            .share-message {
                margin-bottom: 20px;
            }

            .share-message label {
                display: block;
                color: #fff;
                margin-bottom: 8px;
                font-size: 14px;
            }

            .share-message textarea {
                width: 100%;
                padding: 10px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
                font-size: 14px;
                resize: vertical;
                min-height: 60px;
            }

            .share-url-container {
                margin-bottom: 20px;
            }

            .share-url-container label {
                display: block;
                color: #fff;
                margin-bottom: 8px;
                font-size: 14px;
            }

            .share-url-input {
                display: flex;
                gap: 10px;
            }

            .share-url-input input {
                flex: 1;
                padding: 10px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
                font-size: 14px;
            }

            .copy-btn {
                background: linear-gradient(135deg, #B043FF, #FF77E9);
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
            }

            .copy-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(176, 67, 255, 0.4);
            }

            .share-platforms {
                margin-bottom: 25px;
            }

            .share-platforms h4 {
                color: #fff;
                margin: 0 0 15px 0;
                font-size: 16px;
            }

            .platform-buttons {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            .platform-btn {
                flex: 1;
                min-width: 120px;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 15px;
                border: 2px solid rgba(176, 67, 255, 0.3);
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.05);
                color: #fff;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
            }

            .platform-btn:hover {
                border-color: #B043FF;
                background: rgba(176, 67, 255, 0.1);
                transform: translateY(-2px);
            }

            .platform-btn.selected {
                border-color: #B043FF;
                background: rgba(176, 67, 255, 0.2);
            }

            .platform-icon {
                font-size: 24px;
                margin-bottom: 8px;
            }

            .platform-name {
                font-size: 14px;
                font-weight: 600;
            }

            .share-actions {
                display: flex;
                gap: 15px;
                justify-content: flex-end;
            }

            .cancel-btn {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 12px 24px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            }

            .cancel-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .confirm-btn {
                background: linear-gradient(135deg, #B043FF, #FF77E9);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            }

            .confirm-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(176, 67, 255, 0.4);
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideIn {
                from { transform: scale(0.9) translateY(-20px); opacity: 0; }
                to { transform: scale(1) translateY(0); opacity: 1; }
            }
        `;

        document.head.appendChild(shareStyles);
        document.body.appendChild(dialog);

        // Add upload progress styles if not already present
        if (!document.getElementById('upload-progress-styles')) {
            const uploadStyles = document.createElement('style');
            uploadStyles.id = 'upload-progress-styles';
            uploadStyles.textContent = `
                .upload-progress-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(8px);
                    display: none;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                    animation: fadeIn 0.3s ease;
                }

                .upload-progress-content {
                    text-align: center;
                    color: white;
                    background: linear-gradient(135deg, #1a1a2e, #16213e);
                    padding: 30px;
                    border-radius: 20px;
                    border: 1px solid rgba(176, 67, 255, 0.3);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                }

                .upload-spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(176, 67, 255, 0.3);
                    border-top: 4px solid #B043FF;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `;
            document.head.appendChild(uploadStyles);
        }

        // Initialize dialog functionality
        initShareDialog(dialog, shareStyles, track, shareData);
    }

    // Initialize share dialog functionality
    function initShareDialog(dialog, styles, track, shareData) {
        const closeBtn = dialog.querySelector('.share-close-btn');
        const cancelBtn = dialog.querySelector('#cancel-share-btn');
        const confirmBtn = dialog.querySelector('#confirm-share-btn');
        const copyBtn = dialog.querySelector('#copy-url-btn');
        const urlInput = dialog.querySelector('#share-url');
        const messageInput = dialog.querySelector('#share-message-input');
        const platformBtns = dialog.querySelectorAll('.platform-btn');

        let selectedPlatform = 'e7ky';

        // Platform selection
        platformBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                platformBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedPlatform = btn.dataset.platform;
            });
        });

        // Set default selection
        platformBtns[0].classList.add('selected');

        // Copy URL functionality
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(urlInput.value);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                }, 2000);
                
                trackShareEvent(track.id, 'url_copied');
            } catch (error) {
                console.error('Failed to copy URL:', error);
                // Fallback for older browsers
                urlInput.select();
                document.execCommand('copy');
            }
        });

        // Close dialog
        function closeDialog() {
            dialog.remove();
            styles.remove();
        }

        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);

        // Close on backdrop click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });

        // Confirm share
        confirmBtn.addEventListener('click', async () => {
            try {
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Sharing...';

                const customMessage = messageInput.value.trim();
                
                await performShare(track, shareData, selectedPlatform, customMessage);
                
                trackShareEvent(track.id, 'share_completed', { platform: selectedPlatform });
                
                closeDialog();
                showSuccess('Song shared successfully!');
                
            } catch (error) {
                console.error('Error performing share:', error);
                showError('Failed to share song. Please try again.');
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Share Now';
            }
        });
    }

    // Perform the actual share action
    async function performShare(track, shareData, platform, customMessage) {
        const shareUrl = shareData.shortUrl;
        const shareMessage = `${customMessage ? customMessage + '\\n\\n' : ''}🎵 Check out this amazing song on Samma3ny!\\n\\n${track.title} by ${track.artist || 'Dr.D'}\\n${track.duration}\\n\\nListen now: ${shareUrl}`;

        switch (platform) {
            case 'e7ky':
                // Redirect to E7ki! chat with pre-filled message
                const e7kyUrl = `https://e7ki.app/chat?share=${encodeURIComponent(shareData.token)}&message=${encodeURIComponent(shareMessage)}`;
                window.open(e7kyUrl, '_blank');
                break;
                
            case 'web':
                // Open web app with shared song
                const webUrl = `${window.location.origin}/codebank/samma3ny/?shared=${shareData.token}`;
                await navigator.clipboard.writeText(webUrl);
                showSuccess('Web app link copied to clipboard!');
                break;
                
            case 'mobile':
                // Try to open mobile app, fallback to web
                const mobileUrl = `e7ky://share?song=${shareData.token}`;
                const link = document.createElement('a');
                link.href = mobileUrl;
                link.click();
                
                // Fallback: if mobile app not installed, redirect to Play Store
                setTimeout(() => {
                    window.open('https://play.google.com/store/apps/details?id=com.e7ki.app', '_blank');
                }, 1000);
                break;
        }
    }

    // Track share analytics
    function trackShareEvent(songId, action, data = {}) {
        try {
            // Store in localStorage for offline tracking
            const analytics = JSON.parse(localStorage.getItem('shareAnalytics') || '[]');
            analytics.push({
                songId,
                action,
                platform: data.platform || 'unknown',
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                ...data
            });
            
            // FIXED: Properly keep only last 100 events
            if (analytics.length > 100) {
                // Remove oldest events first
                const eventsToRemove = analytics.length - 100;
                analytics.splice(0, eventsToRemove);
            }
            
            localStorage.setItem('shareAnalytics', JSON.stringify(analytics));
            
            // Send to backend if online
            if (navigator.onLine) {
                fetch(`${API_BASE}/api/share/analytics`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ songId, action, data })
                }).catch(console.warn);
            }
        } catch (error) {
            console.error('Error tracking share event:', error);
        }
    }

    // Show success message to user
    function showSuccess(message) {
        // Show as console log for now
        console.log(message);
        
        // Also show in UI if possible
        const errorDiv = document.getElementById('error-message');
        if (errorDiv && message.toLowerCase().includes('success')) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.style.background = 'rgba(76, 175, 80, 0.2)';
            errorDiv.style.border = '1px solid rgba(76, 175, 80, 0.5)';
            errorDiv.style.color = '#4CAF50';
            
            // Hide after 3 seconds
            setTimeout(() => {
                errorDiv.style.display = 'none';
                errorDiv.style.background = '';
                errorDiv.style.border = '';
                errorDiv.style.color = '';
            }, 3000);
        }
    }

    
    
    
    // Display song list in the playlist
    function displaySongList(songs) {
        const songList = document.getElementById('playlist-container') || document.querySelector('.playlist');
        if (!songList) {
            console.warn('Playlist container not found');
            return;
        }
        
        songList.innerHTML = '';
        songs.forEach(song => {
            const songId = song.public_id || song.id;
            const isCurrentSong = currentTrackIndex >= 0 && playlist[currentTrackIndex] && playlist[currentTrackIndex].id === songId;
            const buttonText = (isCurrentSong && isPlaying) ? 'Pause' : 'Play';
            
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.dataset.trackId = songId;
            item.innerHTML = `
                <div class="song-info">
                    <h4>${song.display_name || song.title || 'Unknown Title'}</h4>
                    <p>${song.artist || 'Dr.D'}</p>
                </div>
                <div class="song-actions">
                    <button onclick="playSong('${songId}')" ${isCurrentSong ? 'class="playing"' : ''}>${buttonText}</button>
                    <button class="delete" onclick="deleteSong('${songId}')">Delete</button>
                </div>
            `;
            songList.appendChild(item);
        });
    }
    
    

    // Share button click analytics
    document.addEventListener('click', (e) => {
        if (e.target.closest('.share-btn')) {
            const trackId = e.target.closest('.playlist-item').dataset.trackId;
            trackShareEvent(trackId, 'share_button_clicked');
        }
    });
});
    // Build Authorization header from stored tokens (if available)
    function buildAuthHeaders() {
        const headers = {};
        try { console.log('[Samma3ny] Using cookie-based session (no Authorization header)'); } catch(_){}
        return headers;
    }
    // Ensure auth by checking session; if missing, prompt for login and set cookies
    async function ensureAuthenticated() {
        try {
            const sessionRes = await fetch(`${API_BASE}/api/auth/session`, { credentials: 'include' });
            if (sessionRes.ok) return true;
        } catch (_) {}
        try {
            const email = window.prompt('Sign in required to upload. Enter email:');
            const password = email ? window.prompt('Enter password:') : null;
            if (!email || !password) {
                showError('Authentication required. Upload canceled.');
                return false;
            }
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });
            if (res.ok) {
                showSuccess('Login successful. Retrying upload...');
                return true;
            }
            const txt = await res.text();
            showError(`Login failed: ${txt}`);
            return false;
        } catch (e) {
            showError(`Login error: ${e.message}`);
            return false;
        }
    }
