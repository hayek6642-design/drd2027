/**
 * Yacine Live Service — Domain rotator for reliability
 * Part of AI-Hub / CodeBank
 * 
 * Usage:
 *   <script src="services/yacine-service.js"></script>
 *   const url = await window.yacineService.getWorkingUrl();
 */

class YacineLiveService {
    constructor() {
        this.domains = [
            'https://yacinelive.tv',
            'https://yacinelive.net',
            'https://yacinelive.com',
            'https://yacine-app.tv',
            'https://yacinelive.io',
            'https://yacine.tv',
            'https://yacine.live',
        ];

        this.currentDomain = null;
        this.lastCheck = 0;
        this.checkInterval = 5 * 60 * 1000; // re-check every 5 min
    }

    /* ──────────────────────────────────────────────
       Public API
       ────────────────────────────────────────────── */

    /** Return the first working Yacine domain (cached) */
    async getWorkingUrl() {
        // Use cached domain if still fresh
        const cached = localStorage.getItem('yacine_working_domain');
        const ts     = parseInt(localStorage.getItem('yacine_domain_ts') || '0', 10);

        if (cached && Date.now() - ts < this.checkInterval) {
            return cached;
        }

        // Try cached domain first
        if (cached) {
            const ok = await this.checkDomain(cached);
            if (ok) { this._cache(cached); return cached; }
        }

        // Probe each domain
        for (const domain of this.domains) {
            const ok = await this.checkDomain(domain);
            if (ok) { this._cache(domain); return domain; }
        }

        // None working — return first as fallback
        return this.domains[0];
    }

    /** Build an embeddable URL with optional params */
    async getEmbedUrl(extraParams = {}) {
        const base = await this.getWorkingUrl();
        const params = new URLSearchParams({
            embed: 'true',
            autoplay: '0',
            mute: '1',
            ...extraParams,
        });
        return `${base}?${params.toString()}`;
    }

    /** Create an <iframe> that auto-falls-back on error */
    async createIframe(opts = {}) {
        const url = await this.getEmbedUrl();

        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.allowFullscreen = true;
        iframe.style.cssText = `
            width: 100%; height: 100%; border: none;
            background: #000; border-radius: ${opts.radius || '12px'};
        `;
        iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation';
        iframe.allow   = 'fullscreen; autoplay; encrypted-media';

        // Error → fallback card
        iframe.onerror = () => { iframe.srcdoc = this.getFallbackHtml(); };

        // Timeout fallback (10 s)
        const timer = setTimeout(() => {
            try {
                if (!iframe.contentWindow || !iframe.contentDocument?.body?.children.length) {
                    iframe.srcdoc = this.getFallbackHtml();
                }
            } catch (_) {
                /* cross-origin — iframe loaded something, assume ok */
            }
        }, 10000);

        iframe.addEventListener('load', () => clearTimeout(timer), { once: true });
        return iframe;
    }

    /** All known domains (for display) */
    getAllDomains() { return [...this.domains]; }

    /* ──────────────────────────────────────────────
       Internal
       ────────────────────────────────────────────── */

    async checkDomain(url) {
        try {
            const ctrl = new AbortController();
            const tid  = setTimeout(() => ctrl.abort(), 5000);
            await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal });
            clearTimeout(tid);
            return true;
        } catch (_) {
            return false;
        }
    }

    _cache(domain) {
        this.currentDomain = domain;
        localStorage.setItem('yacine_working_domain', domain);
        localStorage.setItem('yacine_domain_ts', String(Date.now()));
    }

    getFallbackHtml() {
        return `
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;
     min-height:100vh;background:linear-gradient(135deg,#1a1a2e,#16213e);
     color:#fff;font-family:-apple-system,sans-serif;padding:40px;text-align:center}
.icon{font-size:64px;margin-bottom:20px}
h2{color:#00d4ff;margin-bottom:15px}
p{color:#888;margin-bottom:30px;max-width:400px;line-height:1.6}
.btn{padding:15px 30px;background:linear-gradient(135deg,#00d4ff,#0099cc);
     color:#000;text-decoration:none;border-radius:10px;font-weight:bold;display:inline-block}
.links{margin-top:30px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.links span{color:#666;font-size:12px}
.links a{color:#00d4ff;font-size:12px}
</style></head><body>
<div class="icon">⚽</div>
<h2>Yacine Live</h2>
<p>Unable to load Yacine Live directly. Try opening in an external browser.</p>
<a class="btn" href="https://yacinelive.tv" target="_blank">Open Yacine Live ↗</a>
<div class="links">
  <span>Mirrors:</span>
  ${this.domains.map(d => `<a href="${d}" target="_blank">${new URL(d).hostname}</a>`).join(' · ')}
</div>
</body></html>`;
    }
}

// Export as singleton
window.yacineService = new YacineLiveService();
