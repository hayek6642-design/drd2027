// Global app configuration loader
window.AppConfig = {
  data: null,
  loaded: false,
  
  async load() {
    if (this.loaded) return this.data;
    
    try {
      console.log('[AppConfig] Loading configuration from server...');
      const res = await fetch('/api/config/client');
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      this.data = await res.json();
      this.loaded = true;
      
      console.log('[AppConfig] ✅ Configuration loaded:', {
        google: this.data.google?.clientId ? '✓ SET' : '✗ MISSING',
        cloudinary: this.data.cloudinary?.cloudName ? '✓ SET' : '✗ MISSING',
        database: this.data.database ? '✓ SET' : '✗ MISSING'
      });
      
      return this.data;
    } catch (e) {
      console.error('[AppConfig] ✗ FAILED to load:', e.message);
      this.loaded = false;
      return null;
    }
  },

  get(key, defaultValue = null) {
    if (!this.loaded) {
      console.warn('[AppConfig] Config not loaded yet, returning default');
      return defaultValue;
    }
    return this.data?.[key] || defaultValue;
  }
};

// AUTO-LOAD on script load (don't wait for DOMContentLoaded)
console.log('[AppConfig] Auto-loading configuration...');
window.AppConfig.load().then(config => {
  if (!config) {
    console.error('[AppConfig] ⚠️  Configuration failed to load - services may not work properly');
  }
});
