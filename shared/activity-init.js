/**
 * ACTIVITY INITIALIZATION
 * 
 * Initializes the complete user activity tracking system:
 * 1. Waits for UserActivityTracker to be ready
 * 2. Restores all persisted activities
 * 3. Sets up auto-sync every 30 seconds
 * 4. Initializes activity hooks
 */

(function () {
  'use strict';

  function initActivitySystem() {
    console.log('[ActivityInit] Starting initialization...');

    // Step 1: Wait for UserActivityTracker to be ready
    if (!window.UserActivityTracker) {
      console.warn('[ActivityInit] UserActivityTracker not available yet, retrying...');
      setTimeout(initActivitySystem, 500);
      return;
    }

    // Step 2: Initialize tracker
    window.UserActivityTracker.ready.then(function () {
      console.log('[ActivityInit] UserActivityTracker ready, restoring activities...');

      // Step 3: Restore all persisted state
      window.UserActivityTracker.restoreAll(function (results) {
        console.log('[ActivityInit] Restored all persisted activities');
        
        // Emit ready event
        window.dispatchEvent(new CustomEvent('activity:system:ready', {
          detail: { restored: results }
        }));
      });

      // Step 4: Setup auto-sync
      setupAutoSync();

      // Step 5: Initialize hooks
      if (window.ActivityHooks) {
        window.ActivityHooks.init({
          autoSync: true,
          syncEndpoint: '/api/activity/sync'
        });
      }

    }).catch(function (err) {
      console.error('[ActivityInit] Failed to initialize:', err);
    });
  }

  function setupAutoSync() {
    // Auto-sync every 30 seconds
    var syncInterval = setInterval(function () {
      if (window.UserActivityTracker && window.UserActivityTracker.syncWithServer) {
        window.UserActivityTracker.syncWithServer('/api/activity/sync').then(function (result) {
          console.log('[ActivityInit] Auto-sync completed: ' + result.synced + ' items');
        }).catch(function (err) {
          console.warn('[ActivityInit] Auto-sync failed:', err.message);
        });
      }
    }, 30000);

    // Also sync on page unload
    window.addEventListener('beforeunload', function () {
      if (window.UserActivityTracker && window.UserActivityTracker.syncWithServer) {
        // Use sendBeacon for reliability
        const syncQueue = [];
        window.UserActivityTracker.syncWithServer('/api/activity/sync').catch(function (err) {
          console.warn('[ActivityInit] Final sync failed:', err);
        });
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initActivitySystem);
  } else {
    // Already loaded
    setTimeout(initActivitySystem, 100);
  }
})();
