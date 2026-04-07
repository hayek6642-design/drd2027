/**
 * Yacine Live Hub — Football matches in AI-Hub
 * Part of AI-Hub / CodeBank
 *
 * Depends on: services/yacine-service.js (window.yacineService)
 *
 * Usage:
 *   <link rel="stylesheet" href="css/yacine-hub.css">
 *   <script src="services/yacine-service.js"></script>
 *   <script src="components/yacine-hub.js"></script>
 *   → window.yacineHub.render(containerElement)
 */

class YacineHub {
    constructor() {
        this.matches       = [];
        this.currentStream = null;
        this.activeFilter  = 'all';
    }

    /* ══════════════════════════════════════════════
       RENDER — inject the full Yacine UI
       ══════════════════════════════════════════════ */

    render(target) {
        const container = target || document.getElementById('yacine-container') || this._createContainer();

        container.innerHTML = `
        <div class="yacine-hub">
            <!-- Header -->
            <div class="yacine-header">
                <div class="yacine-header__logo">
                    <span class="yacine-header__icon">⚽</span>
                    <span class="yacine-header__title">Yacine Live</span>
                </div>
                <div class="yacine-header__live">
                    <span class="yacine-pulse"></span>
                    <span>LIVE</span>
                </div>
            </div>

            <!-- Match filters -->
            <div class="yacine-filters" id="yacineFilters">
                <button class="yacine-filter active" data-filter="all">All Matches</button>
                <button class="yacine-filter" data-filter="live">🔴 Live Now</button>
                <button class="yacine-filter" data-filter="upcoming">⏰ Upcoming</button>
                <button class="yacine-filter" data-filter="finished">✓ Finished</button>
            </div>

            <!-- Main content: list + player -->
            <div class="yacine-content">
                <div class="yacine-match-list" id="yacineMatchList">
                    ${this._renderMatches()}
                </div>
                <div class="yacine-player" id="yacinePlayer">
                    <div class="yacine-empty">
                        <span class="yacine-empty__icon">📺</span>
                        <p>Select a match to watch</p>
                    </div>
                </div>
            </div>

            <!-- Quick links -->
            <div class="yacine-quick">
                <button class="yacine-quick__btn" onclick="yacineHub.openDirect()">
                    Open Yacine Live App ↗
                </button>
                <div class="yacine-quick__mirrors" id="yacineMirrors"></div>
            </div>
        </div>`;

        this._attachListeners(container);
        this._renderMirrors();
    }

    /* ══════════════════════════════════════════════
       MATCH LIST
       ══════════════════════════════════════════════ */

    _getSampleMatches() {
        return [
            { id: 1, league: 'Premier League',    home: 'Man City',    away: 'Arsenal',   time: 'LIVE',     status: 'live',     score: '2-1' },
            { id: 2, league: 'La Liga',           home: 'Real Madrid', away: 'Barcelona',  time: '20:00',    status: 'upcoming', score: '-' },
            { id: 3, league: 'Champions League',  home: 'Bayern',      away: 'PSG',        time: 'LIVE',     status: 'live',     score: '1-1' },
            { id: 4, league: 'Serie A',           home: 'Juventus',    away: 'AC Milan',   time: 'Finished', status: 'finished', score: '2-0' },
            { id: 5, league: 'Ligue 1',           home: 'PSG',         away: 'Marseille',  time: '21:00',    status: 'upcoming', score: '-' },
            { id: 6, league: 'Bundesliga',        home: 'Dortmund',    away: 'Leipzig',    time: 'LIVE',     status: 'live',     score: '3-2' },
        ];
    }

    _renderMatches() {
        const matches = this._getSampleMatches();
        this.matches = matches;
        return matches.map(m => `
            <div class="yacine-match yacine-match--${m.status}" data-id="${m.id}" data-status="${m.status}">
                <div class="yacine-match__league">${m.league}</div>
                <div class="yacine-match__teams">
                    <span class="yacine-match__team">${m.home}</span>
                    <span class="yacine-match__score">${m.score}</span>
                    <span class="yacine-match__team">${m.away}</span>
                </div>
                <div class="yacine-match__footer">
                    <span class="yacine-match__time yacine-match__time--${m.status}">${m.time}</span>
                    <button class="yacine-match__watch" onclick="yacineHub.watchMatch(${m.id})">▶ Watch</button>
                </div>
            </div>
        `).join('');
    }

    /* ══════════════════════════════════════════════
       PLAYER
       ══════════════════════════════════════════════ */

    async watchMatch(matchId) {
        const player = document.getElementById('yacinePlayer');
        if (!player) return;

        // Loading state
        player.innerHTML = `
            <div class="yacine-loading">
                <div class="yacine-spinner"></div>
                <p>Loading stream…</p>
            </div>`;

        try {
            const svc = window.yacineService;
            if (!svc) throw new Error('YacineLiveService not loaded');

            const url = await svc.getEmbedUrl({ channel: matchId });

            player.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.src = `${url}#match-${matchId}`;
            iframe.allowFullscreen = true;
            iframe.style.cssText = 'width:100%;height:100%;border:none;border-radius:12px;';
            iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation';
            iframe.allow   = 'fullscreen; autoplay; encrypted-media';

            // Fallback on error
            iframe.onerror = () => {
                player.innerHTML = `
                    <div class="yacine-error">
                        <p>Unable to load stream</p>
                        <button class="yacine-quick__btn" onclick="yacineHub.openDirect()">Open in Yacine App ↗</button>
                    </div>`;
            };

            player.appendChild(iframe);
            this.currentStream = { matchId, iframe };

        } catch (err) {
            console.error('[YacineHub]', err);
            player.innerHTML = `
                <div class="yacine-error">
                    <p>Unable to load stream</p>
                    <button class="yacine-quick__btn" onclick="yacineHub.openDirect()">Open in Yacine App ↗</button>
                </div>`;
        }
    }

    /* ══════════════════════════════════════════════
       FILTER
       ══════════════════════════════════════════════ */

    filterMatches(filter) {
        this.activeFilter = filter;
        document.querySelectorAll('.yacine-match').forEach(card => {
            card.style.display = (filter === 'all' || card.dataset.status === filter) ? '' : 'none';
        });
    }

    /* ══════════════════════════════════════════════
       EXTERNAL OPEN
       ══════════════════════════════════════════════ */

    openDirect() {
        const url = 'https://yacinelive.tv';
        // Capacitor native app launcher
        if (window.Capacitor?.Plugins?.AppLauncher) {
            window.Capacitor.Plugins.AppLauncher.openUrl({ url });
        } else {
            window.open(url, '_blank', 'noopener');
        }
    }

    /* ══════════════════════════════════════════════
       INTERNAL HELPERS
       ══════════════════════════════════════════════ */

    _createContainer() {
        const div = document.createElement('div');
        div.id = 'yacine-container';
        document.body.appendChild(div);
        return div;
    }

    _attachListeners(root) {
        root.querySelectorAll('.yacine-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                root.querySelectorAll('.yacine-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterMatches(btn.dataset.filter);
            });
        });
    }

    _renderMirrors() {
        const el = document.getElementById('yacineMirrors');
        if (!el || !window.yacineService) return;
        const domains = window.yacineService.getAllDomains();
        el.innerHTML = `
            <span style="color:#666;font-size:11px;">Mirrors:</span>
            ${domains.map(d => `<a href="${d}" target="_blank" rel="noopener" style="color:#00d4ff;font-size:11px;">${new URL(d).hostname}</a>`).join(' · ')}
        `;
    }
}

// ── Export ──
window.yacineHub = new YacineHub();
