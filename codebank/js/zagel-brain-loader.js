/**
 * Zagel Brain v3 - Script Loader
 * Loads all 6 modules sequentially
 */
(function() {
  'use strict';
  
  const modules = [
    '/codebank/js/zagel-brain/recognition.js',
    '/codebank/js/zagel-brain/memory.js',
    '/codebank/js/zagel-brain/personality.js',
    '/codebank/js/zagel-brain/promptBuilder.js',
    '/codebank/js/zagel-brain/responseEngine.js',
    '/codebank/js/zagel-brain/zagel-integration.js'
  ];
  
  let loaded = 0;
  
  function loadModule(index) {
    if (index >= modules.length) {
      console.log('🧠🕊️ [ZagelBrain-Loader] All 6 modules loaded successfully');
      return;
    }
    
    const script = document.createElement('script');
    script.src = modules[index];
    script.onload = () => {
      console.log(`🧠 [ZagelBrain-Loader] Loaded: ${modules[index]}`);
      loaded++;
      loadModule(index + 1);
    };
    script.onerror = () => {
      console.error(`❌ [ZagelBrain-Loader] Failed to load: ${modules[index]}`);
      loadModule(index + 1);
    };
    document.head.appendChild(script);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadModule(0));
  } else {
    loadModule(0);
  }
})();
