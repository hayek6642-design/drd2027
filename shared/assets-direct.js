/**
 * Direct Asset Access - Unified Interface
 * Services read/write assets directly without bridges
 */

(function() {
    'use strict';

    /**
     * Get assets snapshot
     * @returns {object} { codes: [], silver: [], gold: [] }
     */
    window.getAssets = function() {
        // Priority 1: AppState (if available)
        if (window.AppState?.assets) {
            return window.AppState.getAssets();
        }

        // Priority 2: localStorage fallback
        try {
            const raw = localStorage.getItem('codebank_assets');
            if (raw) return JSON.parse(raw);
        } catch (e) {}

        return { codes: [], silver: [], gold: [] };
    };

    /**
     * Get asset count by type
     * @param {string} type - 'codes', 'silver', or 'gold'
     * @returns {number}
     */
    window.getAssetCount = function(type) {
        const assets = window.getAssets();
        return (assets[type] || []).length;
    };

    /**
     * Add assets
     * @param {string} type - Asset type
     * @param {object|array} items - Item(s) to add
     */
    window.addAssets = function(type, items) {
        const itemsArray = Array.isArray(items) ? items : [items];
        
        // Update AppState if available
        if (window.AppState?.updateAssets) {
            window.AppState.updateAssets(type, {
                action: 'add',
                items: itemsArray
            });
        }

        // Also dispatch event for other listeners
        if (window.dispatch) {
            window.dispatch('assets:add', { type, items: itemsArray });
        }
    };

    /**
     * Remove assets
     * @param {string} type - Asset type
     * @param {string|array} ids - ID(s) to remove
     */
    window.removeAssets = function(type, ids) {
        const idsArray = Array.isArray(ids) ? ids : [ids];
        
        if (window.AppState?.updateAssets) {
            window.AppState.updateAssets(type, {
                action: 'remove',
                ids: idsArray
            });
        }

        if (window.dispatch) {
            window.dispatch('assets:remove', { type, ids: idsArray });
        }
    };

    /**
     * Get specific asset by ID
     * @param {string} type - Asset type
     * @param {string} id - Asset ID
     * @returns {object|null}
     */
    window.getAssetById = function(type, id) {
        const assets = window.getAssets();
        return (assets[type] || []).find(a => a.id === id) || null;
    };

    /**
     * Subscribe to asset changes
     * @param {function} callback - Called with { codes: [], silver: [], gold: [] }
     * @returns {function} Unsubscribe function
     */
    window.onAssetsChanged = function(callback) {
        if (window.AppState?.on) {
            return window.AppState.on('assets:updated', callback);
        }
        if (window.on) {
            return window.on('assets:updated', callback);
        }
        
        // Fallback to localStorage polling (not ideal but works)
        let lastHash = '';
        const interval = setInterval(() => {
            try {
                const raw = localStorage.getItem('codebank_assets');
                const hash = raw ? JSON.stringify(JSON.parse(raw)) : '';
                if (hash !== lastHash && raw) {
                    lastHash = hash;
                    callback(JSON.parse(raw));
                }
            } catch (e) {}
        }, 1000);

        return function() { clearInterval(interval); };
    };

    // Quick access aliases
    window.getCodes = () => window.getAssets().codes;
    window.getSilver = () => window.getAssets().silver;
    window.getGold = () => window.getAssets().gold;
    window.getCodesCount = () => window.getAssetCount('codes');
    window.getSilverCount = () => window.getAssetCount('silver');
    window.getGoldCount = () => window.getAssetCount('gold');

    console.log('[AssetsDirect] Initialized');
})();