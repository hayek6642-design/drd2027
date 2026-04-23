// afra7-long-press.js
// Handles long press on code display bar to open playlist popup

(function() {
    'use strict';
    
    // Only activate when in Afra7 section
    let isInAfra7 = false;
    
    window.addEventListener('section:changed', function(e) {
        isInAfra7 = e.detail?.section === 'afra7';
    });
    
    // Initialize after DOM ready
    function initLongPress() {
        const codeDisplay = document.getElementById('code-display');
        if (!codeDisplay) {
            console.warn('[Afra7LongPress] Code display not found');
            return;
        }
        
        let pressTimer = null;
        const LONG_PRESS_DURATION = 800; // ms
        
        function startPress(e) {
            if (!isInAfra7) return; // Only in Afra7 section
            
            // Visual feedback
            codeDisplay.classList.add('long-press');
            
            pressTimer = setTimeout(() => {
                // Long press triggered!
                console.log('[Afra7LongPress] Opening playlist popup');
                
                // Open the popup
                if (window.Afra7PopupUI) {
                    window.Afra7PopupUI.open();
                }
                
                // Haptic feedback if available
                if ('vibrate' in navigator) {
                    navigator.vibrate(50);
                }
                
                codeDisplay.classList.remove('long-press');
            }, LONG_PRESS_DURATION);
        }
        
        function cancelPress(e) {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
            codeDisplay.classList.remove('long-press');
        }
        
        // Mouse events
        codeDisplay.addEventListener('mousedown', startPress);
        codeDisplay.addEventListener('mouseup', cancelPress);
        codeDisplay.addEventListener('mouseleave', cancelPress);
        
        // Touch events
        codeDisplay.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent default touch behavior
            startPress(e);
        }, { passive: false });
        
        codeDisplay.addEventListener('touchend', cancelPress);
        codeDisplay.addEventListener('touchcancel', cancelPress);
        
        console.log('[Afra7LongPress] Initialized on #code-display');
    }
    
    // Wait for DOM and other scripts
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLongPress);
    } else {
        // Delay to ensure other scripts loaded
        setTimeout(initLongPress, 1000);
    }
})();