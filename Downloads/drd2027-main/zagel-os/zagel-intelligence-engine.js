/**
 * ZAGEL Intelligence Engine v2.0.0
 * Real-time tracking: gold prices, USD rates, news headlines
 * Proactive data intelligence with caching and periodic refresh
 */

(function () {
  'use strict';
  if (window.__ZAGEL_INTELLIGENCE__) return;

  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

  class ZagelIntelligenceEngine {
    constructor() {
      this._cache = {};
      this._watchers = {};
      this._refreshTimer = null;
      this._sources = {
        gold: { url: 'https://api.metalpriceapi.com/v1/latest?api_key=DEMO&base=XAU&currencies=USD', parser: 'gold' },
        usd_egp: { url: 'https://open.er-api.com/v6/latest/USD', parser: 'usd' },
        news: { url: 'https://newsdata.io/api/1/news?apikey=DEMO&language=ar&category=top', parser: 'news' }
      };

      console.log('🧠 [Zagel-Intelligence] Engine initialized');
    }

    async fetchData(source) {
      const config = this._sources[source];
      if (!config) {
        console.warn(`🧠 [Zagel-Intelligence] Unknown source: ${source}`);
        return null;
      }

      // Check cache
      const cached = this._cache[source];
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return cached.data;
      }

      try {
        const response = await fetch(config.url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const raw = await response.json();
        const parsed = this._parse(config.parser, raw);

        this._cache[source] = { data: parsed, ts: Date.now() };

        // Notify watchers
        if (this._watchers[source]) {
          this._watchers[source].forEach(cb => {
            try { cb(parsed); } catch (e) { console.error(`🧠 [Intelligence] Watcher error:`, e); }
          });
        }

        // Emit to Zagel bus
        if (window.ZagelBus) {
          window.ZagelBus.emit('intelligence:update', { source, data: parsed });
        }

        return parsed;
      } catch (err) {
        console.error(`🧠 [Zagel-Intelligence] Fetch failed for ${source}:`, err.message);
        return cached ? cached.data : null;
      }
    }

    _parse(parser, raw) {
      switch (parser) {
        case 'gold':
          return {
            type: 'gold',
            pricePerOunce: raw?.rates?.USD ? (1 / raw.rates.USD) : null,
            pricePerGram: raw?.rates?.USD ? (1 / raw.rates.USD / 31.1035) : null,
            currency: 'USD',
            updatedAt: raw?.timestamp || Date.now()
          };

        case 'usd':
          return {
            type: 'usd_egp',
            rate: raw?.rates?.EGP || null,
            base: 'USD',
            target: 'EGP',
            updatedAt: raw?.time_last_update_unix ? raw.time_last_update_unix * 1000 : Date.now()
          };

        case 'news':
          const articles = (raw?.results || []).slice(0, 10).map(a => ({
            title: a.title,
            description: a.description,
            link: a.link,
            source: a.source_id,
            publishedAt: a.pubDate,
            category: a.category?.[0]
          }));
          return { type: 'news', articles, count: articles.length };

        default:
          return raw;
      }
    }

    watch(source, callback) {
      if (!this._watchers[source]) this._watchers[source] = [];
      this._watchers[source].push(callback);

      // Immediately fetch if no cache
      if (!this._cache[source]) {
        this.fetchData(source).catch(() => {});
      }

      return () => {
        this._watchers[source] = this._watchers[source].filter(cb => cb !== callback);
      };
    }

    addSource(name, config) {
      this._sources[name] = config;
    }

    async getGold() { return this.fetchData('gold'); }
    async getUSD() { return this.fetchData('usd_egp'); }
    async getNews() { return this.fetchData('news'); }

    async getSummary() {
      const [gold, usd, news] = await Promise.allSettled([
        this.getGold(),
        this.getUSD(),
        this.getNews()
      ]);
      return {
        gold: gold.status === 'fulfilled' ? gold.value : null,
        usd: usd.status === 'fulfilled' ? usd.value : null,
        news: news.status === 'fulfilled' ? news.value : null,
        timestamp: Date.now()
      };
    }

    startAutoRefresh(interval = REFRESH_INTERVAL) {
      this.stopAutoRefresh();
      this._refreshTimer = setInterval(() => {
        Object.keys(this._sources).forEach(source => {
          if (this._watchers[source] && this._watchers[source].length > 0) {
            this.fetchData(source).catch(() => {});
          }
        });
      }, interval);
    }

    stopAutoRefresh() {
      if (this._refreshTimer) {
        clearInterval(this._refreshTimer);
        this._refreshTimer = null;
      }
    }

    formatForArabic(data) {
      if (!data) return 'لا توجد بيانات';
      switch (data.type) {
        case 'gold':
          return `💰 سعر الذهب: ${data.pricePerGram?.toFixed(2) || '—'} دولار/جرام`;
        case 'usd_egp':
          return `💵 سعر الدولار: ${data.rate?.toFixed(2) || '—'} جنيه مصري`;
        case 'news':
          return `📰 آخر الأخبار: ${data.articles?.[0]?.title || 'لا توجد أخبار'}`;
        default:
          return JSON.stringify(data);
      }
    }

    destroy() {
      this.stopAutoRefresh();
      this._cache = {};
      this._watchers = {};
      delete window.__ZAGEL_INTELLIGENCE__;
    }
  }

  window.__ZAGEL_INTELLIGENCE__ = new ZagelIntelligenceEngine();
  window.ZagelIntelligence = window.__ZAGEL_INTELLIGENCE__;
})();
