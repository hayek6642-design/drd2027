// afra7-playlist-manager.js
// Manages song registry and user playlist preferences

(function() {
    'use strict';
    
    const STORAGE_KEY = 'afra7_user_playlist_v1';
    const SONGS_REGISTRY_URL = '/afra7/songs-registry.json'; // Your songs list
    
    const Afra7PlaylistManager = {
        songsRegistry: [],      // All available songs
        userPlaylist: [],       // User's selected songs
        isLoaded: false,
        
        // Initialize and load data
        init: async function() {
            await this.loadSongsRegistry();
            this.loadUserPlaylist();
            this.isLoaded = true;
            console.log('[Afra7Playlist] Manager ready');
        },
        
        // Load songs from registry (Cloudinary URLs)
        loadSongsRegistry: async function() {
            try {
                const response = await fetch(SONGS_REGISTRY_URL);
                if (!response.ok) throw new Error('Failed to load registry');
                
                this.songsRegistry = await response.json();
                console.log('[Afra7Playlist] Registry loaded:', this.songsRegistry.length, 'songs');
            } catch (e) {
                console.error('[Afra7Playlist] Registry load failed:', e);
                // Fallback to empty registry
                this.songsRegistry = [];
            }
        },
        
        // Load user's saved playlist from localStorage
        loadUserPlaylist: function() {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    this.userPlaylist = JSON.parse(saved);
                    console.log('[Afra7Playlist] User playlist loaded:', this.userPlaylist.length, 'songs');
                }
            } catch (e) {
                console.error('[Afra7Playlist] Load failed:', e);
                this.userPlaylist = [];
            }
        },
        
        // Save user playlist to localStorage (JSON format, no audio files)
        saveUserPlaylist: function() {
            try {
                // Only save metadata (titles, URLs, order) - not actual audio files
                const dataToSave = this.userPlaylist.map(song => ({
                    id: song.id,
                    title: song.title,
                    artist: song.artist,
                    url: song.url,        // Cloudinary URL
                    duration: song.duration,
                    order: song.order
                }));
                
                localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
                console.log('[Afra7Playlist] Saved', dataToSave.length, 'songs');
                
                window.dispatchEvent(new CustomEvent('afra7:playlist-saved', {
                    detail: { count: dataToSave.length }
                }));
            } catch (e) {
                console.error('[Afra7Playlist] Save failed:', e);
            }
        },
        
        // Add song to user playlist
        addToPlaylist: function(songId) {
            const song = this.songsRegistry.find(s => s.id === songId);
            if (!song) return false;
            
            // Check if already exists
            if (this.userPlaylist.find(s => s.id === songId)) {
                console.log('[Afra7Playlist] Song already in playlist:', song.title);
                return false;
            }
            
            this.userPlaylist.push({
                ...song,
                order: this.userPlaylist.length
            });
            
            this.saveUserPlaylist();
            return true;
        },
        
        // Remove song from playlist
        removeFromPlaylist: function(songId) {
            const idx = this.userPlaylist.findIndex(s => s.id === songId);
            if (idx === -1) return false;
            
            this.userPlaylist.splice(idx, 1);
            // Reorder remaining
            this.userPlaylist.forEach((s, i) => s.order = i);
            this.saveUserPlaylist();
            return true;
        },
        
        // Reorder playlist (drag-drop)
        reorderPlaylist: function(newOrder) {
            // newOrder is array of song IDs in new order
            const reordered = [];
            newOrder.forEach((id, index) => {
                const song = this.userPlaylist.find(s => s.id === id);
                if (song) {
                    song.order = index;
                    reordered.push(song);
                }
            });
            
            this.userPlaylist = reordered;
            this.saveUserPlaylist();
            
            window.dispatchEvent(new CustomEvent('afra7:playlist-reordered'));
        },
        
        // Get all available songs (for popup selection)
        getAvailableSongs: function() {
            return this.songsRegistry.map(song => ({
                ...song,
                isInPlaylist: this.userPlaylist.some(up => up.id === song.id)
            }));
        },
        
        // Get user's current playlist
        getUserPlaylist: function() {
            return [...this.userPlaylist].sort((a, b) => a.order - b.order);
        },
        
        // Check if user has a playlist
        hasPlaylist: function() {
            return this.userPlaylist.length > 0;
        },
        
        // Clear entire playlist
        clearPlaylist: function() {
            this.userPlaylist = [];
            this.saveUserPlaylist();
        }
    };
    
    window.Afra7PlaylistManager = Afra7PlaylistManager;
})();