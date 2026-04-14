/**
 * ZAGEL OS Bootstrap v2.1.0
 * Load order manager — ensures all modules load in correct sequence
 * Include this LAST in your HTML after all zagel-*.js scripts
 */

(function () {
  'use strict';

  console.log('🚀 [Zagel-Bootstrap] Starting boot sequence...');

  // Verify all modules are loaded
  const moduleCheck = {
    'ZagelStore (Storage)': !!window.ZagelStore,
    'ZagelBus (EventBus)': !!window.ZagelBus,
    // Mode System
    'ZagelModeManager': !!window.ZagelModeManager,
    'ZagelDeveloperGate': !!window.ZagelDeveloperGate,
    'ZagelLearningEngine': !!window.ZagelLearningEngine,
    // Core Engines
    'ZagelIntelligence': !!window.ZagelIntelligence,
    'ZagelPriority': !!window.ZagelPriority,
    'ZagelBrain': !!window.ZagelBrain,
    'ZagelEmotion': !!window.ZagelEmotion,
    'ZagelPersonality': !!window.ZagelPersonality,
    'ZagelMemory': !!window.ZagelMemory,
    'ZagelEvolution': !!window.ZagelEvolution,
    'ZagelFlow': !!window.ZagelFlow,
    // Interaction
    'ZagelConversation': !!window.ZagelConversation,
    'ZagelVoice': !!window.ZagelVoice,
    'ZagelAutomation': !!window.ZagelAutomation,
    'ZagelNotification': !!window.ZagelNotification,
    'ZagelTrigger': !!window.ZagelTrigger,
    // Core
    'Zagel (Core)': !!window.Zagel
  };

  const loaded = Object.entries(moduleCheck).filter(([, v]) => v).length;
  const total = Object.keys(moduleCheck).length;

  console.log(`🚀 [Bootstrap] Modules loaded: ${loaded}/${total}`);

  Object.entries(moduleCheck).forEach(([name, ok]) => {
    if (!ok) console.warn(`⚠️ [Bootstrap] Missing: ${name}`);
  });

  // Auto-boot if core is available
  if (window.Zagel) {
    window.Zagel.boot().then(() => {
      console.log('🚀 [Bootstrap] ZAGEL OS is LIVE! 🦅');

      // Auto-save every 5 minutes
      setInterval(() => {
        window.Zagel.saveAll().catch(() => {});
      }, 5 * 60 * 1000);

      // Save before page unload
      window.addEventListener('beforeunload', () => {
        window.Zagel.saveAll().catch(() => {});
      });

    }).catch(err => {
      console.error('🚀 [Bootstrap] Boot failed:', err);
    });
  } else {
    console.error('🚀 [Bootstrap] Zagel Core not found! Make sure zagel-core.js is loaded.');
  }
})();
