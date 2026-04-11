// ============================================
// PARENT WINDOW - IFRAME COMMUNICATION SETUP
// ============================================

console.log('[Parent] Setting up iframe asset communication...');

// Listen for messages FROM child iframes
window.addEventListener('message', (event) => {
    try {
        // Always log for debugging purposes
        if (event.data?.type) {
            console.log('[Parent] Message from iframe:', {
                type: event.data.type,
                origin: event.origin,
                hasAssets: !!event.data.assets
            });
        }

        // Handle iframe requests for assets
        if (event.data?.type === 'iframe:assets:request') {
            console.log('[Parent] Iframe requesting assets...');
            
            // Get current assets from AssetsManager
            if (window.AssetsManager && typeof window.AssetsManager.snapshot === 'function') {
                const assets = window.AssetsManager.snapshot();
                
                // Send back to iframe
                event.source.postMessage({
                    type: 'parent:assets:response',
                    assets: assets,
                    timestamp: Date.now()
                }, '*');
                
                console.log('[Parent] Sent assets to iframe:', assets);
            } else {
                console.warn('[Parent] AssetsManager not ready');
            }
            return;
        }

        // Handle asset sync confirmations
        if (event.data?.type === 'assets:sync' || event.data?.type === 'assets:response') {
            console.log('[Parent] Asset sync message from iframe:', event.data);
            return;
        }

    } catch (err) {
        console.error('[Parent] Message handler error:', err);
    }
});

console.log('[Parent] ✅ Iframe communication handler registered');
