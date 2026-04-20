/**
 * AppConfig - Global configuration loader
 * Loads client-side config from /api/config/client
 */
window.AppConfig = {
  data: null,
  loaded: false,

  async load() {
    if (this.loaded) return this.data;
    try {
      const res = await fetch('/api/config/client');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      this.data = await res.json();
      this.loaded = true;
      console.log('[Config] Loaded:', {
        google: this.data.google?.clientId ? 'SET ✓' : 'MISSING ✗',
        cloudinary: this.data.cloudinary?.cloudName ? 'SET ✓' : 'MISSING ✗'
      });
      return this.data;
    } catch (e) {
      console.error('[Config] Load FAILED:', e.message);
      return null;
    }
  }
};

// Auto-load on page ready
document.addEventListener('DOMContentLoaded', () => {
  window.AppConfig.load();
});
