// afra7-popup-ui.js
// Playlist selection and management popup UI

(function() {
    'use strict';
    
    const Afra7PopupUI = {
        popup: null,
        isOpen: false,
        currentTab: 'registry', // 'registry' or 'playlist'
        
        // Initialize popup structure
        init: function() {
            this.createPopupHTML();
            this.attachEventListeners();
            console.log('[Afra7Popup] UI initialized');
        },
        
        createPopupHTML: function() {
            const html = `
                <div id="afra7-playlist-popup" class="afra7-popup-overlay" style="display:none;">
                    <div class="afra7-popup-container">
                        <div class="afra7-popup-header">
                            <h3>🎵 إنشاء قائمة التشغيل الخاصة بك</h3>
                            <button class="afra7-close-btn">&times;</button>
                        </div>
                        
                        <div class="afra7-tabs">
                            <button class="afra7-tab active" data-tab="registry">📚 مكتبة الأغاني</button>
                            <button class="afra7-tab" data-tab="playlist">⭐ قائمتي المفضلة</button>
                        </div>
                        
                        <div class="afra7-tab-content" id="registry-tab">
                            <div class="afra7-search">
                                <input type="text" id="song-search" placeholder="ابحث عن أغنية...">
                            </div>
                            <div class="afra7-songs-list" id="songs-registry-list">
                                <!-- Populated dynamically -->
                            </div>
                        </div>
                        
                        <div class="afra7-tab-content" id="playlist-tab" style="display:none;">
                            <div class="afra7-playlist-info">
                                <span id="playlist-count">0 أغاني</span>
                                <button id="clear-playlist" class="afra7-btn-small">🗑️ مسح الكل</button>
                            </div>
                            <div class="afra7-songs-list" id="user-playlist-list" style="min-height: 200px;">
                                <!-- User's playlist with drag-drop -->
                            </div>
                            <div class="afra7-reorder-hint">↕️ اسحب الأغاني لإعادة ترتيبها</div>
                        </div>
                        
                        <div class="afra7-popup-footer">
                            <button id="activate-playlist" class="afra7-btn-primary" style="display:none;">
                                ▶️ تشغيل قائمتي
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Insert into document
            const div = document.createElement('div');
            div.innerHTML = html;
            document.body.appendChild(div.firstElementChild);
            this.popup = document.getElementById('afra7-playlist-popup');
        },
        
        attachEventListeners: function() {
            // Close button
            this.popup.querySelector('.afra7-close-btn').addEventListener('click', () => this.close());
            
            // Tab switching
            this.popup.querySelectorAll('.afra7-tab').forEach(tab => {
                tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
            });
            
            // Search
            const searchInput = this.popup.querySelector('#song-search');
            searchInput.addEventListener('input', (e) => this.filterSongs(e.target.value));
            
            // Clear playlist
            this.popup.querySelector('#clear-playlist').addEventListener('click', () => {
                if (confirm('هل أنت متأكد من مسح قائمة التشغيل؟')) {
                    window.Afra7PlaylistManager.clearPlaylist();
                    this.renderPlaylist();
                }
            });
            
            // Activate playlist (PLAY button)
            this.popup.querySelector('#activate-playlist').addEventListener('click', () => {
                this.activateUserPlaylist();
            });
            
            // Close on backdrop click
            this.popup.addEventListener('click', (e) => {
                if (e.target === this.popup) this.close();
            });
        },
        
        // Open popup
        open: function() {
            if (!window.Afra7PlaylistManager.isLoaded) {
                window.Afra7PlaylistManager.init().then(() => this.render());
            } else {
                this.render();
            }
            
            this.popup.style.display = 'flex';
            this.isOpen = true;
            document.body.style.overflow = 'hidden';
        },
        
        // Close popup
        close: function() {
            this.popup.style.display = 'none';
            this.isOpen = false;
            document.body.style.overflow = '';
        },
        
        // Switch tabs
        switchTab: function(tabName) {
            this.currentTab = tabName;
            
            // Update buttons
            this.popup.querySelectorAll('.afra7-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.tab === tabName);
            });
            
            // Show/hide content
            document.getElementById('registry-tab').style.display = 
                tabName === 'registry' ? 'block' : 'none';
            document.getElementById('playlist-tab').style.display = 
                tabName === 'playlist' ? 'block' : 'none';
            
            if (tabName === 'playlist') {
                this.renderPlaylist();
            }
        },
        
        // Render songs registry
        render: function() {
            const container = document.getElementById('songs-registry-list');
            const songs = window.Afra7PlaylistManager.getAvailableSongs();
            
            container.innerHTML = songs.map(song => `
                <div class="afra7-song-item ${song.isInPlaylist ? 'in-playlist' : ''}" data-id="${song.id}">
                    <div class="afra7-song-info">
                        <span class="afra7-song-title">${song.title}</span>
                        <span class="afra7-song-artist">${song.artist}</span>
                    </div>
                    <button class="afra7-add-btn" data-id="${song.id}">
                        ${song.isInPlaylist ? '✓' : '+'}
                    </button>
                </div>
            `).join('');
            
            // Attach add buttons
            container.querySelectorAll('.afra7-add-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const added = window.Afra7PlaylistManager.addToPlaylist(id);
                    if (added) {
                        e.target.textContent = '✓';
                        e.target.closest('.afra7-song-item').classList.add('in-playlist');
                    }
                });
            });
        },
        
        // Render user's playlist with drag-drop
        renderPlaylist: function() {
            const container = document.getElementById('user-playlist-list');
            const playlist = window.Afra7PlaylistManager.getUserPlaylist();
            
            document.getElementById('playlist-count').textContent = 
                `${playlist.length} أغاني`;
            
            // Show/hide play button
            document.getElementById('activate-playlist').style.display = 
                playlist.length > 0 ? 'block' : 'none';
            
            if (playlist.length === 0) {
                container.innerHTML = '<div class="afra7-empty">لا توجد أغاني في قائمتك</div>';
                return;
            }
            
            container.innerHTML = playlist.map((song, index) => `
                <div class="afra7-song-item draggable" draggable="true" data-id="${song.id}" data-index="${index}">
                    <span class="afra7-drag-handle">⋮⋮</span>
                    <div class="afra7-song-info">
                        <span class="afra7-song-title">${index + 1}. ${song.title}</span>
                        <span class="afra7-song-artist">${song.artist}</span>
                    </div>
                    <button class="afra7-remove-btn" data-id="${song.id}">🗑️</button>
                </div>
            `).join('');
            
            // Attach remove buttons
            container.querySelectorAll('.afra7-remove-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    window.Afra7PlaylistManager.removeFromPlaylist(id);
                    this.renderPlaylist();
                });
            });
            
            // Setup drag-drop
            this.setupDragDrop(container);
        },
        
        setupDragDrop: function(container) {
            let draggedItem = null;
            
            container.querySelectorAll('.draggable').forEach(item => {
                item.addEventListener('dragstart', (e) => {
                    draggedItem = item;
                    item.style.opacity = '0.5';
                });
                
                item.addEventListener('dragend', (e) => {
                    item.style.opacity = '1';
                    draggedItem = null;
                    
                    // Save new order
                    const newOrder = Array.from(container.querySelectorAll('.draggable'))
                        .map(el => el.dataset.id);
                    window.Afra7PlaylistManager.reorderPlaylist(newOrder);
                });
                
                item.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (!draggedItem || draggedItem === item) return;
                    
                    const rect = item.getBoundingClientRect();
                    const mid = rect.top + rect.height / 2;
                    if (e.clientY < mid) {
                        item.before(draggedItem);
                    } else {
                        item.after(draggedItem);
                    }
                });
            });
        },
        
        filterSongs: function(query) {
            const items = document.querySelectorAll('#songs-registry-list .afra7-song-item');
            const lowerQuery = query.toLowerCase();
            
            items.forEach(item => {
                const title = item.querySelector('.afra7-song-title').textContent.toLowerCase();
                const artist = item.querySelector('.afra7-song-artist').textContent.toLowerCase();
                item.style.display = (title.includes(lowerQuery) || artist.includes(lowerQuery)) 
                    ? 'flex' : 'none';
            });
        },
        
        // ACTIVATE USER PLAYLIST - This is the key function
        activateUserPlaylist: function() {
            const playlist = window.Afra7PlaylistManager.getUserPlaylist();
            if (playlist.length === 0) return;
            
            // 1. Mute YouTube video (keep video playing, mute audio)
            if (window.Afra7YouTubeBridge) {
                window.Afra7YouTubeBridge.muteVideo();
            }
            
            // 2. Load and play user playlist
            if (window.Afra7AudioController) {
                window.Afra7AudioController.loadPlaylist(playlist);
                window.Afra7AudioController.playTrack(0);
            }
            
            // 3. Close popup
            this.close();
            
            // 4. Show floating player UI
            this.showFloatingPlayer();
            
            console.log('[Afra7Popup] User playlist activated:', playlist.length, 'tracks');
        },
        
        showFloatingPlayer: function() {
            // Create or update floating player showing current track
            let player = document.getElementById('afra7-floating-player');
            if (!player) {
                player = document.createElement('div');
                player.id = 'afra7-floating-player';
                player.className = 'afra7-floating-player';
                player.innerHTML = `
                    <div class="afra7-now-playing">
                        <span class="afra7-track-title">جاري التشغيل...</span>
                        <div class="afra7-controls">
                            <button id="afra7-prev">⏮️</button>
                            <button id="afra7-play-pause">⏸️</button>
                            <button id="afra7-next">⏭️</button>
                            <button id="afra7-stop">⏹️</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(player);
                
                // Controls
                player.querySelector('#afra7-prev').addEventListener('click', () => {
                    window.Afra7AudioController.playPrevious();
                });
                player.querySelector('#afra7-play-pause').addEventListener('click', () => {
                    const ctrl = window.Afra7AudioController;
                    if (ctrl.isPlaying) ctrl.pause();
                    else ctrl.resume();
                });
                player.querySelector('#afra7-next').addEventListener('click', () => {
                    window.Afra7AudioController.playNext();
                });
                player.querySelector('#afra7-stop').addEventListener('click', () => {
                    this.deactivateUserPlaylist();
                });
            }
            
            // Update track info
            const updateTrackInfo = () => {
                const track = window.Afra7AudioController.getCurrentTrack();
                if (track) {
                    player.querySelector('.afra7-track-title').textContent = 
                        `🎵 ${track.title} - ${track.artist}`;
                }
            };
            
            window.addEventListener('afra7:track-started', updateTrackInfo);
            updateTrackInfo();
            
            player.style.display = 'block';
        },
        
        deactivateUserPlaylist: function() {
            // Stop audio
            if (window.Afra7AudioController) {
                window.Afra7AudioController.stop();
            }
            
            // Unmute YouTube
            if (window.Afra7YouTubeBridge) {
                window.Afra7YouTubeBridge.unmuteVideo();
            }
            
            // Hide floating player
            const player = document.getElementById('afra7-floating-player');
            if (player) player.style.display = 'none';
            
            console.log('[Afra7Popup] User playlist deactivated');
        }
    };
    
    window.Afra7PopupUI = Afra7PopupUI;
})();