/**
 * app-core.js - Main entry point for CodeBank Modularized JS
 */
import { initLauncher, updateStats } from './app-launcher.js';
import { initTabManager, activateTab } from './tab-manager.js';
import { initChat } from './e7ky-chat.js';
import { initPrayerSystem } from './prayer-system.js';
import { check1000HoursGate } from './gate-system.js';
import { setupSafeSelect } from './safe-code-manager.js';

// 1️⃣ Enforce SINGLETON for app-core
if (window.__APP_CORE__) {
    console.log('[AppCore] Already initialized, skipping');
} else {
    window.__APP_CORE__ = true;

    // Global exports for legacy/inline compatibility
    window.activateTab = activateTab;
    window.updateStats = updateStats;
    window.__setupSafeSelect = setupSafeSelect;

    document.addEventListener('DOMContentLoaded', async () => {
        // Initialize all modules
        initLauncher();
        initTabManager();
        initChat();
        initPrayerSystem();
        await check1000HoursGate();
        setupSafeSelect();

        // Initial tab activation
        activateTab('overview');

        console.log('💎 CodeBank Core initialized');
    });
}

// Handle bridge events
window.addEventListener('bridge:snapshot-applied', (e) => {
    const d = e.detail || {};
    const count = d.count;
    const latest = d.latestCode || d.latest;
    
    // Update legacy UI elements
    const codesCountEl = document.getElementById('codes-count');
    if (codesCountEl && typeof count === 'number') codesCountEl.textContent = String(count);
    
    const assetCodesEl = document.getElementById('asset-codes');
    if (assetCodesEl && typeof count === 'number') assetCodesEl.textContent = String(count);
    
    const latestEl = document.getElementById('latest-code');
    if (latestEl && latest) latestEl.textContent = latest;

    // Update new launcher stats
    updateStats({ codes: count });
});
