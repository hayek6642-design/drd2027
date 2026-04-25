/**
 * Service Navigation Component
 * Auto-injects navigation bar into service iframes
 * Back (↩) → CodeBank | Home (🏠) → Dr.D App
 */

(function() {
    'use strict';
    
    // Only initialize once
    if (window.__SERVICE_NAV_READY__) return;
    window.__SERVICE_NAV_READY__ = true;
    
    const NAV_CONFIG = {
        buttons: [
            { id: 'nav-back', icon: '↩', title: 'Back to CodeBank', action: 'back' },
            { id: 'nav-home', icon: '🏠', title: 'Home (Dr.D App)', action: 'home' }
        ],
        hideDelay: 3000,
        zIndex: 999999,
        position: { bottom: '24px', right: '24px' }
    };
    
    // Inject navigation into current document
    function injectNavigation() {
        // Don't inject if already present
        if (document.getElementById('service-nav-bar')) return;
        
        const navBar = document.createElement('div');
        navBar.id = 'service-nav-bar';
        navBar.setAttribute('aria-label', 'Service Navigation');
        
        // Build button HTML
        const buttonsHTML = NAV_CONFIG.buttons
            .map(btn => `<button id="${btn.id}" class="nav-btn" title="${btn.title}" data-action="${btn.action}">${btn.icon}</button>`)
            .join('');
        
        navBar.innerHTML = buttonsHTML;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #service-nav-bar {
                position: fixed;
                bottom: ${NAV_CONFIG.position.bottom};
                right: ${NAV_CONFIG.position.right};
                display: flex;
                gap: 12px;
                z-index: ${NAV_CONFIG.zIndex};
                transition: opacity 0.4s ease, transform 0.4s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            
            #service-nav-bar.hidden {
                opacity: 0;
                transform: translateY(20px);
                pointer-events: none;
            }
            
            .nav-btn {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                border: 1px solid rgba(0, 212, 255, 0.2);
                background: rgba(0, 212, 255, 0.08);
                backdrop-filter: blur(12px);
                color: #00d4ff;
                font-size: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
                padding: 0;
                outline: none;
            }
            
            .nav-btn:hover {
                background: rgba(0, 212, 255, 0.2);
                transform: scale(1.12);
                box-shadow: 0 6px 30px rgba(0, 212, 255, 0.3);
            }
            
            .nav-btn:active {
                transform: scale(0.95);
            }
            
            @media (max-width: 768px) {
                #service-nav-bar {
                    bottom: 16px;
                    right: 16px;
                    gap: 10px;
                }
                .nav-btn {
                    width: 44px;
                    height: 44px;
                    font-size: 18px;
                }
            }
            
            @media (prefers-reduced-motion: reduce) {
                #service-nav-bar,
                .nav-btn {
                    transition: none;
                }
            }
        `;
        
        // Insert into document
        if (document.head) {
            document.head.appendChild(style);
        }
        
        // Add to body with fallback to document.documentElement
        const container = document.body || document.documentElement;
        if (container) {
            container.appendChild(navBar);
        }
        
        // Setup auto-hide behavior
        setupAutoHide(navBar);
        
        // Setup button click handlers
        setupButtonHandlers(navBar);
        
        console.log('[ServiceNav] Navigation bar injected');
    }
    
    function setupAutoHide(navBar) {
        let hideTimer;
        
        function showNav() {
            navBar.classList.remove('hidden');
            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => {
                navBar.classList.add('hidden');
            }, NAV_CONFIG.hideDelay);
        }
        
        // Show on interaction
        document.addEventListener('mousemove', showNav, { passive: true });
        document.addEventListener('touchstart', showNav, { passive: true });
        document.addEventListener('keydown', showNav, { passive: true });
        
        // Initial show
        showNav();
    }
    
    function setupButtonHandlers(navBar) {
        navBar.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const action = this.dataset.action;
                console.log('[ServiceNav] Button clicked:', action);
                
                // Send message to parent window
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({
                        type: 'service:navigate',
                        action: action,
                        timestamp: Date.now(),
                        source: window.location.href
                    }, '*');
                }
            });
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectNavigation);
    } else {
        injectNavigation();
    }
    
    // Fallback: inject after a short delay
    setTimeout(function() {
        if (!document.getElementById('service-nav-bar')) {
            injectNavigation();
        }
    }, 500);
    
})();
