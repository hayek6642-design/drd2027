/**
 * Movie Platforms Service — Domain management & smart fallbacks
 * Part of AI-Hub Cinema integration
 */

class MoviePlatformsService {
    constructor() {
        this.platforms = {
            netflix: {
                name: 'Netflix',
                icon: '🎬',
                domains: ['https://www.netflix.com', 'https://netflix.com'],
                type: 'paid',
                requiresLogin: true,
                category: 'international'
            },
            alostoora: {
                name: 'Alostoora',
                icon: '📺',
                domains: [
                    'https://alostoora.tv',
                    'https://alostoora.net',
                    'https://alostoora.com',
                    'https://alostoora.live',
                    'https://alostoora.org'
                ],
                type: 'freemium',
                category: 'arabic',
                fallbackHtml: true
            },
            mediaon: {
                name: 'MediaOn',
                icon: '📡',
                domains: [
                    'https://mediaon.tv',
                    'https://mediaon.net',
                    'https://mediaon.live',
                    'https://mediaon.org'
                ],
                type: 'freemium',
                category: 'arabic',
                fallbackHtml: true
            },
            shahid: {
                name: 'Shahid',
                icon: '🎭',
                domains: [
                    'https://shahid.mbc.net',
                    'https://shahid.net',
                    'https://mbc.net'
                ],
                type: 'freemium',
                category: 'arabic',
                requiresLogin: false
            },
            wetv: {
                name: 'WeTV',
                icon: '🎪',
                domains: ['https://wetv.vip', 'https://wetv.vip/en'],
                type: 'freemium',
                category: 'asian'
            },
            iqiyi: {
                name: 'iQIYI',
                icon: '🎋',
                domains: ['https://iq.com', 'https://www.iqiyi.com'],
                type: 'freemium',
                category: 'asian'
            },
            tubi: {
                name: 'Tubi',
                icon: '🍿',
                domains: ['https://tubitv.com', 'https://www.tubitv.com'],
                type: 'free',
                category: 'international'
            },
            plutotv: {
                name: 'Pluto TV',
                icon: '🪐',
                domains: ['https://pluto.tv', 'https://www.pluto.tv'],
                type: 'free',
                category: 'live'
            },
            crackle: {
                name: 'Crackle',
                icon: '💥',
                domains: ['https://www.crackle.com', 'https://crackle.com'],
                type: 'free',
                category: 'international'
            },
            popcornflix: {
                name: 'Popcornflix',
                icon: '🍿',
                domains: ['https://www.popcornflix.com', 'https://popcornflix.com'],
                type: 'free',
                category: 'international'
            },
            vudu: {
                name: 'Vudu',
                icon: '💿',
                domains: ['https://www.vudu.com', 'https://vudu.com'],
                type: 'freemium',
                category: 'international'
            },
            plex: {
                name: 'Plex',
                icon: '📼',
                domains: ['https://app.plex.tv', 'https://plex.tv'],
                type: 'freemium',
                category: 'international'
            },
            imdbtv: {
                name: 'IMDb TV',
                icon: '⭐',
                domains: ['https://www.amazon.com/gp/video/offers', 'https://www.imdb.com/tv'],
                type: 'free',
                category: 'international'
            },
            peacock: {
                name: 'Peacock',
                icon: '🦚',
                domains: ['https://www.peacocktv.com', 'https://peacocktv.com'],
                type: 'freemium',
                category: 'international'
            },
            crunchyroll: {
                name: 'Crunchyroll',
                icon: '🍥',
                domains: ['https://www.crunchyroll.com', 'https://crunchyroll.com'],
                type: 'freemium',
                category: 'anime'
            },
            funimation: {
                name: 'Funimation',
                icon: '⛩️',
                domains: ['https://www.funimation.com', 'https://funimation.com'],
                type: 'freemium',
                category: 'anime'
            },
            xumo: {
                name: 'Xumo',
                icon: '📺',
                domains: ['https://www.xumo.tv', 'https://xumo.tv'],
                type: 'free',
                category: 'live'
            },
            rokuchannel: {
                name: 'Roku Channel',
                icon: '🔴',
                domains: ['https://therokuchannel.roku.com'],
                type: 'free',
                category: 'international'
            }
        };

        this.categoryColors = {
            arabic: '#00d4ff',
            international: '#e50914',
            asian: '#ff6b6b',
            anime: '#ff8c00',
            live: '#34a853',
            free: '#4285f4'
        };

        this.CACHE_TTL = 5 * 60 * 1000; // 5 min
    }

    /** Get platform config by ID */
    getPlatform(id) {
        return this.platforms[id] || null;
    }

    /** Return all platforms as array with id injected */
    getAllPlatforms() {
        return Object.entries(this.platforms).map(([id, p]) => ({ id, ...p }));
    }

    /** Filter platforms by category */
    getByCategory(category) {
        return this.getAllPlatforms().filter(p => p.category === category);
    }

    /** Get a working URL for a platform, using cache + probing */
    async getWorkingUrl(platformId) {
        const platform = this.platforms[platformId];
        if (!platform) return null;

        // Check cache
        const cacheKey = 'movie_url_' + platformId;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const { url, ts } = JSON.parse(cached);
                if (Date.now() - ts < this.CACHE_TTL) {
                    return url;
                }
            } catch (_) { /* stale */ }
        }

        // Probe each domain
        for (const domain of platform.domains) {
            if (await this._probe(domain)) {
                localStorage.setItem(cacheKey, JSON.stringify({ url: domain, ts: Date.now() }));
                return domain;
            }
        }

        // Fallback to primary domain
        return platform.domains[0];
    }

    /** HEAD probe with 5s timeout (no-cors so opaque OK) */
    async _probe(url) {
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 5000);
            await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal });
            clearTimeout(timer);
            return true;
        } catch (_) {
            return false;
        }
    }

    /** Build an iframe element for a platform */
    async createIframe(platformId) {
        const platform = this.platforms[platformId];
        if (!platform) return null;

        const url = await this.getWorkingUrl(platformId);

        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.allowFullscreen = true;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox';
        iframe.style.cssText = 'width:100%;height:100%;border:none;background:#000;';

        iframe.onerror = () => this._showFallback(platform, url, iframe);

        // Timeout fallback
        const timer = setTimeout(() => {
            try {
                if (!iframe.contentWindow || iframe.contentWindow.length === 0) {
                    this._showFallback(platform, url, iframe);
                }
            } catch (_) { /* cross-origin = it loaded */ }
        }, 15000);

        iframe.addEventListener('load', () => clearTimeout(timer), { once: true });

        return iframe;
    }

    /** Render fallback srcdoc inside an iframe */
    _showFallback(platform, url, iframe) {
        const color = this.categoryColors[platform.category] || '#00d4ff';
        const altLinks = platform.domains.length > 1
            ? platform.domains.map(d => `<a href="${d}" target="_blank" style="padding:8px 16px;background:rgba(255,255,255,.1);color:${color};text-decoration:none;border-radius:20px;font-size:12px;">${new URL(d).hostname}</a>`).join('')
            : '';

        iframe.srcdoc = `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;
background:linear-gradient(135deg,#0a0a0f,#1a1a2e);color:#fff;font-family:system-ui,sans-serif;
text-align:center;padding:40px}
.icon{font-size:80px;margin-bottom:20px}
h1{color:${color};margin-bottom:15px;font-size:28px}
p{color:#888;margin-bottom:30px;max-width:400px;line-height:1.6}
.badge{display:inline-block;padding:4px 12px;background:${color}22;color:${color};border-radius:20px;font-size:12px;margin-bottom:20px;text-transform:uppercase}
.btn{padding:15px 40px;background:linear-gradient(135deg,${color},${color}aa);color:#000;text-decoration:none;border-radius:10px;font-weight:bold;font-size:18px;display:inline-block}
.btn:hover{transform:scale(1.05)}
.alts{margin-top:30px}
.alts h3{color:#666;font-size:14px;margin-bottom:15px}
.alt-links{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
</style></head><body>
<div class="icon">${platform.icon}</div>
<span class="badge">${platform.type}</span>
<h1>${platform.name}</h1>
<p>Unable to load ${platform.name} directly. This may be due to regional restrictions or iframe blocking.</p>
<a href="${url}" target="_blank" class="btn">Open ${platform.name} ↗</a>
${altLinks ? `<div class="alts"><h3>Try alternative links:</h3><div class="alt-links">${altLinks}</div></div>` : ''}
</body></html>`;
    }

    /** Open URL in system browser / Capacitor AppLauncher */
    async openExternal(platformId) {
        const url = await this.getWorkingUrl(platformId);
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AppLauncher) {
            window.Capacitor.Plugins.AppLauncher.openUrl({ url });
        } else {
            window.open(url, '_blank', 'noopener');
        }
    }
}

// Singleton
window.moviePlatforms = new MoviePlatformsService();
