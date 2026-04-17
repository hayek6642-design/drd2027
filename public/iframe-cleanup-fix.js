/**
 * IFRAME CLEANUP & PERFORMANCE MONITOR FIX
 * Prevents memory leaks from hidden iframes and stops alert spam
 */

(function() {
    let lastIframeAlertTime = 0;
    const ALERT_DEBOUNCE_MS = 5000; // Only show alert once per 5 seconds
    
    // Monkey-patch the performance monitor if it exists
    if (window.PerformanceMonitor) {
        const originalCheck = window.PerformanceMonitor.check;
        window.PerformanceMonitor.check = function() {
            if (originalCheck) {
                originalCheck.call(this);
            }
            checkAndCleanupIframes();
        };
    }

    /**
     * Check for excessive iframes and clean them up
     */
    function checkAndCleanupIframes() {
        const allIframes = document.querySelectorAll('iframe');
        const hiddenIframes = Array.from(allIframes).filter(frame => {
            const style = window.getComputedStyle(frame);
            return style.display === 'none' || style.visibility === 'hidden' || frame.offsetParent === null;
        });

        if (hiddenIframes.length > 1) {
            const now = Date.now();
            if (now - lastIframeAlertTime > ALERT_DEBOUNCE_MS) {
                console.warn(`[PERF ALERT] ${hiddenIframes.length} hidden iframes detected. Cleaning up...`);
                lastIframeAlertTime = now;
                
                // Cleanup excess hidden iframes (keep max 1 for reuse)
                hiddenIframes.slice(1).forEach((frame, idx) => {
                    try {
                        frame.src = 'about:blank'; // Unload content
                        frame.remove(); // Remove from DOM
                        console.log(`[PERF] Removed iframe ${idx + 1}`);
                    } catch(e) {
                        console.error('[PERF] Failed to remove iframe:', e);
                    }
                });
            }
        }
    }

    /**
     * Patch common iframe creators to destroy properly on close
     */
    function patchServiceLauncher() {
        // If you have a global service launcher, patch it here
        if (window.ServiceLauncher) {
            const originalClose = window.ServiceLauncher.close || window.ServiceLauncher.closeService;
            if (originalClose) {
                window.ServiceLauncher.close = function(...args) {
                    const frame = document.getElementById('serviceFrame');
                    if (frame) {
                        try {
                            frame.src = 'about:blank'; // Unload
                            frame.remove(); // Destroy
                            console.log('[ServiceLauncher] Properly destroyed iframe');
                        } catch(e) {
                            console.error('[ServiceLauncher] Iframe cleanup failed:', e);
                        }
                    }
                    return originalClose.apply(this, args);
                };
            }
        }
    }

    // Run cleanup on document ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            checkAndCleanupIframes();
            patchServiceLauncher();
        });
    } else {
        checkAndCleanupIframes();
        patchServiceLauncher();
    }

    // Periodic cleanup every 30 seconds
    setInterval(checkAndCleanupIframes, 30000);

    console.log('[IframeCleanup] Monitoring and cleanup enabled');
})();
