/**
 * Movie Hub — Cinema Hub UI component
 * Renders inside the AI-Hub viewer overlay
 */

class MovieHub {
    constructor() {
        this.currentPlatform = null;
        this.searchQuery = '';
        this.activeCategory = 'all';
    }

    /**
     * Render the full Cinema Hub into a given container element
     * @param {HTMLElement} container
     */
    render(container) {
        if (!container) return;
        if (!window.moviePlatforms) {
            container.innerHTML = '<p style="color:#f00;padding:40px;text-align:center;">Movie Platforms service not loaded.</p>';
            return;
        }

        container.innerHTML = `
            <div class="movie-hub">
                <!-- Header -->
                <div class="movie-header">
                    <div class="mh-logo">
                        <span class="mh-icon">🎬</span>
                        <span class="mh-title">Cinema Hub</span>
                    </div>
                    <div class="mh-search-box">
                        <input type="text" id="mh-search" placeholder="Search platforms…" autocomplete="off" />
                        <button id="mh-search-btn">🔍</button>
                    </div>
                </div>

                <!-- Category Tabs -->
                <div class="mh-tabs" id="mh-tabs">
                    <button class="mh-tab active" data-cat="all">🎞️ All</button>
                    <button class="mh-tab" data-cat="arabic">🌙 Arabic</button>
                    <button class="mh-tab" data-cat="international">🌍 International</button>
                    <button class="mh-tab" data-cat="asian">🎋 Asian</button>
                    <button class="mh-tab" data-cat="anime">🍥 Anime</button>
                    <button class="mh-tab" data-cat="live">📺 Live TV</button>
                    <button class="mh-tab" data-cat="free">🆓 Free Only</button>
                </div>

                <!-- Platforms Grid -->
                <div class="mh-grid" id="mh-grid"></div>

                <!-- Embedded Player (shown on platform select) -->
                <div class="mh-player" id="mh-player" style="display:none;">
                    <div class="mh-player-header">
                        <h3 id="mh-player-title">Platform</h3>
                        <div class="mh-player-ctrls">
                            <button id="mh-player-ext" title="Open in browser">↗</button>
                            <button id="mh-player-close" title="Close player">✕</button>
                        </div>
                    </div>
                    <div class="mh-player-body" id="mh-player-body">
                        <div class="mh-loading"><div class="mh-spinner"></div><p>Loading…</p></div>
                    </div>
                </div>
            </div>
        `;

        this._renderGrid();
        this._attachListeners(container);
    }

    /* ── Internal: build the grid of platform cards ── */
    _renderGrid() {
        const grid = document.getElementById('mh-grid');
        if (!grid) return;

        let platforms = window.moviePlatforms.getAllPlatforms();

        // Category filter
        if (this.activeCategory !== 'all') {
            if (this.activeCategory === 'free') {
                platforms = platforms.filter(p => p.type === 'free');
            } else {
                platforms = platforms.filter(p => p.category === this.activeCategory);
            }
        }

        // Search filter
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            platforms = platforms.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                p.type.toLowerCase().includes(q)
            );
        }

        if (platforms.length === 0) {
            grid.innerHTML = '<div class="mh-empty">No platforms found.</div>';
            return;
        }

        const colors = window.moviePlatforms.categoryColors;

        grid.innerHTML = platforms.map(p => {
            const color = colors[p.category] || '#00d4ff';
            return `
                <div class="mh-card" data-id="${p.id}" style="--pc:${color}">
                    <div class="mh-card-icon">${p.icon}</div>
                    <div class="mh-card-info">
                        <h4>${p.name}</h4>
                        <span class="mh-badge mh-badge-type">${p.type}</span>
                        <span class="mh-badge mh-badge-cat">${p.category}</span>
                    </div>
                    <div class="mh-card-play">▶</div>
                </div>
            `;
        }).join('');
    }

    /* ── Internal: attach event listeners ── */
    _attachListeners(root) {
        // Tabs
        root.querySelectorAll('.mh-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                root.querySelectorAll('.mh-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeCategory = tab.dataset.cat;
                this._renderGrid();
            });
        });

        // Search
        const searchInput = document.getElementById('mh-search');
        const searchBtn = document.getElementById('mh-search-btn');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.searchQuery = searchInput.value;
                this._renderGrid();
            });
        }
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.searchQuery = searchInput ? searchInput.value : '';
                this._renderGrid();
            });
        }

        // Card clicks (delegated)
        const grid = document.getElementById('mh-grid');
        if (grid) {
            grid.addEventListener('click', (e) => {
                const card = e.target.closest('.mh-card');
                if (card) this._openPlayer(card.dataset.id);
            });
        }

        // Player controls
        const extBtn = document.getElementById('mh-player-ext');
        const closeBtn = document.getElementById('mh-player-close');
        if (extBtn) extBtn.addEventListener('click', () => this._openExternal());
        if (closeBtn) closeBtn.addEventListener('click', () => this._closePlayer());
    }

    /* ── Internal: open embedded player ── */
    async _openPlayer(platformId) {
        this.currentPlatform = platformId;
        const platform = window.moviePlatforms.getPlatform(platformId);
        if (!platform) return;

        const player = document.getElementById('mh-player');
        const title = document.getElementById('mh-player-title');
        const body = document.getElementById('mh-player-body');

        title.textContent = platform.name;
        player.style.display = 'flex';
        body.innerHTML = '<div class="mh-loading"><div class="mh-spinner"></div><p>Loading ' + platform.name + '…</p></div>';

        try {
            const iframe = await window.moviePlatforms.createIframe(platformId);
            body.innerHTML = '';
            body.appendChild(iframe);
        } catch (err) {
            body.innerHTML = `
                <div class="mh-error">
                    <p>Failed to load ${platform.name}</p>
                    <button onclick="window.movieHub._openExternal()">Open in Browser ↗</button>
                </div>
            `;
        }
    }

    /* ── Internal: open current platform in external browser ── */
    _openExternal() {
        if (this.currentPlatform) {
            window.moviePlatforms.openExternal(this.currentPlatform);
        }
    }

    /* ── Internal: close the embedded player ── */
    _closePlayer() {
        const player = document.getElementById('mh-player');
        const body = document.getElementById('mh-player-body');
        if (body) body.innerHTML = '';
        if (player) player.style.display = 'none';
        this.currentPlatform = null;
    }
}

// Singleton
window.movieHub = new MovieHub();
