// UV: SAFE-UI-UNIFY-2026-02-15
/* ===================================================
    SafeCode Implementation - Unified Wrapper
    Handles visibility logic based on AssetsState
    =================================================== */

(function() {
  'use strict';

  // ========================
  // SafeCode Object
  // ========================
  window.SafeCode = {
    // Show empty state when no assets are present
    showEmptyState: function() {
      const container = document.getElementById('safe-code-container');
      const listContainer = document.getElementById('safe-list');
      const emptyMessage = document.getElementById('safe-empty-message');

      if (container) {
        container.classList.add('empty-state');
      }

      if (listContainer) {
        listContainer.style.display = 'none';
      }

      if (!emptyMessage) {
        // Create empty message if it doesn't exist
        const newEmptyMessage = document.createElement('div');
        newEmptyMessage.id = 'safe-empty-message';
        newEmptyMessage.className = 'safe-empty-state';
        newEmptyMessage.textContent = 'No assets available. Generate codes or activate Extra Mode to get started.';
        newEmptyMessage.style.cssText = `
          text-align: center;
          padding: 40px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
        `;
        
        const container = document.getElementById('safe-code-container');
        if (container) {
          container.appendChild(newEmptyMessage);
        }
      } else {
        emptyMessage.style.display = 'block';
      }

      console.log('[SafeCode] Showing empty state');
    },

    // Show all assets when there are assets present
    showAll: function() {
      const container = document.getElementById('safe-code-container');
      const listContainer = document.getElementById('safe-list');
      const emptyMessage = document.getElementById('safe-empty-message');

      if (container) {
        container.classList.remove('empty-state');
      }

      if (listContainer) {
        listContainer.style.display = 'block';
      }

      if (emptyMessage) {
        emptyMessage.style.display = 'none';
      }

      console.log('[SafeCode] Showing all assets');
    },

    // Render the SafeCode component based on AssetsState
    render: function(assetsState) {
      // Always use AssetBus.snapshot() for consistency
      const snapshot = window.AssetBus && typeof window.AssetBus.snapshot === 'function' ? window.AssetBus.snapshot() : null;
      
      if (!snapshot) return;

      // Determine if there are any assets (using unified structure: codes, silver, gold)
      const hasAssets = (snapshot.codes?.length > 0) || 
                     (snapshot.silver?.length > 0) || 
                     (snapshot.gold?.length > 0) || 
                     (snapshot.qarsan?.length > 0);

      // 🛡️ ANTI-FLICKER: If the UI is already showing assets, don't clear it 
      // with an empty snapshot unless it's authoritative or synced.
      const listContainer = document.getElementById('safe-list');
      const uiItems = listContainer ? listContainer.querySelectorAll('.asset-item:not(.empty-state)').length : 0;
      
      const isAuthoritative = snapshot.authoritative === true || snapshot.status === 'success' || snapshot.synced === true;

      if (hasAssets) {
        this.showAll();
        // Render the assets using SafeAssetList
        const currentTab = window.ACTIVE_ASSET_TAB || 'codes';
        if (window.SafeAssetList && typeof window.SafeAssetList.render === 'function') {
          window.SafeAssetList.render(currentTab);
        }
      } else if (uiItems > 0 && !isAuthoritative) {
        console.warn('[SafeCode] Snapshot empty but UI has items. Ignoring to prevent flicker.');
        // Request a background sync if possible
        if (window.AssetBus && typeof window.AssetBus.sync === 'function') {
          window.AssetBus.sync();
        }
      } else {
        this.showEmptyState();
      }
    }
  };

  // ========================
  // Event Listeners
  // ========================
  // Listen for both events for maximum compatibility
  function handleAssetUpdate(assetsState) {
    window.SafeCode.render(assetsState);
  }

  // Listen for both events to ensure compatibility with all versions
  window.addEventListener('assets:updated', function(e) {
    handleAssetUpdate(e.detail);
  });
  window.addEventListener('assets:changed', function(e) {
    handleAssetUpdate(e.detail);
  });

  // Also listen for section:changed to re-render when switching tabs
  window.addEventListener('section:changed', function(e) {
    if (e.detail && e.detail.section === 'assets') {
      window.SafeCode.render();
    }
  });

  console.log('[SafeCode] Loaded and ready');
})();
