/**
 * Parent Navigation Handler
 * Listens for service iframe navigation messages
 * Handles back (→ CodeBank) and home (→ Dr.D App) actions
 */

(function() {
    'use strict';
    
    // Listen for navigation messages from service iframes
    window.addEventListener('message', function(event) {
        if (!event.data || event.data.type !== 'service:navigate') return;
        
        const action = event.data.action;
        const source = event.data.source;
        
        console.log('[ParentNav] Navigation action:', action, 'from', source);
        
        // BACK button → Close service, show CodeBank grid
        if (action === 'back') {
            handleBackNavigation();
        }
        
        // HOME button → Navigate to Dr.D App
        if (action === 'home') {
            handleHomeNavigation();
        }
    }, false);
    
    /**
     * Handle back navigation
     * Closes the service iframe and returns to CodeBank grid
     */
    function handleBackNavigation() {
        // Try to find and close service stage container
        let stage = document.getElementById('service-stage') || 
                   document.getElementById('service-container') ||
                   document.querySelector('[data-service-stage]');
        
        if (stage) {
            console.log('[ParentNav] Closing service stage...');
            
            // Fade out animation
            stage.style.transition = 'opacity 0.3s ease';
            stage.style.opacity = '0';
            
            setTimeout(() => {
                stage.innerHTML = '';
                stage.style.display = 'none';
                stage.style.opacity = '1';
            }, 300);
        }
        
        // Show CodeBank grid
        let grid = document.getElementById('app-grid') || 
                  document.getElementById('codebank-container') ||
                  document.getElementById('codebank-grid') ||
                  document.querySelector('[data-codebank-grid]');
        
        if (grid) {
            console.log('[ParentNav] Showing CodeBank grid...');
            grid.style.display = 'grid';
            grid.style.opacity = '1';
            grid.style.animation = 'fadeIn 0.3s ease';
        }
        
        // Notify any listening components
        document.dispatchEvent(new CustomEvent('service:closed', {
            detail: { reason: 'user_back_button' }
        }));
    }
    
    /**
     * Handle home navigation
     * Navigate to Dr.D App (yt-new-clear.html)
     */
    function handleHomeNavigation() {
        console.log('[ParentNav] Navigating to home (Dr.D App)...');
        
        // Add smooth transition
        document.body.style.transition = 'opacity 0.3s ease';
        document.body.style.opacity = '0';
        
        setTimeout(() => {
            window.location.href = '/yt-new-clear.html';
        }, 300);
    }
    
    console.log('[ParentNav] Handler initialized');
    
})();