// CodeBank Side Panel IIFE
// Extracted from inline script in yt-new.html

(function() {
    'use strict';
    
    // CodeBank side panel functionality
    function initCodeBankPanel() {
        const panel = document.getElementById('codebank-panel');
        const toggleBtn = document.getElementById('codebank-toggle');
        const closeBtn = document.getElementById('codebank-close');
        const codeDisplay = document.getElementById('code-display');
        const overlay = document.getElementById('code-popup-overlay');
        const content = document.getElementById('code-popup-content');
        window.__CODEBANK_CLOSE_REQUESTED__ = false;
        
        if (!panel || !toggleBtn || !closeBtn) {
            // Panel elements not present on this page — skip silently
            return;
        }
        
        toggleBtn.addEventListener('click', () => {
            const willOpen = !panel.classList.contains('active');
            panel.classList.toggle('active');
            window.__CODEBANK_OPEN__ = !!willOpen;
        });
        
        closeBtn.addEventListener('click', () => {
            window.__CODEBANK_CLOSE_REQUESTED__ = true;
            panel.classList.remove('active');
            window.__CODEBANK_OPEN__ = false;
            setTimeout(() => { window.__CODEBANK_CLOSE_REQUESTED__ = false; }, 300);
        });
        
        // Sticky mode: do not close on outside click
        window.__CODEBANK_STICKY__ = true;
        document.addEventListener('click', (e) => {
            if (window.__CODEBANK_STICKY__ === false) {
                if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
                    panel.classList.remove('active');
                }
            }
        });

        const observer = new MutationObserver(() => {
            const isActive = panel.classList.contains('active');
            if (!isActive && window.__CODEBANK_OPEN__ && !window.__CODEBANK_CLOSE_REQUESTED__) {
                panel.classList.add('active');
            }
        });
        observer.observe(panel, { attributes: true, attributeFilter: ['class', 'style'] });
        
        // No long-press behavior on code-display
    }
    window.initCodeBankPanel = initCodeBankPanel;
    
    // Global function to show CodeBank panel (for long press on code display)
    window.showCodeBankPanel = function() {
        try { window.AUTH_ALREADY_HANDLED = true; } catch(_) {}
        const overlay = document.getElementById('code-popup-overlay');
        const iframe = document.getElementById('code-popup-iframe');
        if (overlay && iframe) {
            overlay.classList.add('open');
            overlay.style.display = 'flex';
            // Use correct path — do NOT overwrite src if already loaded to avoid reload loop
            if (!iframe.__cbLoaded) {
                iframe.src = '/codebank/indexCB.html';
                iframe.__cbLoaded = true;
            }
            window.dispatchEvent(new Event('codebank:opened'));
        }
    }

    // Global alternative dashboard opener
    window.showAlternativeDashboard = function() {
        try { window.AUTH_ALREADY_HANDLED = true; } catch(_) {}
        const overlay = document.getElementById('code-popup-overlay');
        const iframe = document.getElementById('code-popup-iframe');
        if (overlay && iframe) {
            overlay.classList.add('open');
            overlay.style.display = 'flex';
            // Use correct path — do NOT overwrite src if already loaded to avoid reload loop
            if (!iframe.__cbLoaded) {
                iframe.src = '/codebank/indexCB.html';
                iframe.__cbLoaded = true;
            }
            window.dispatchEvent(new Event('codebank:opened'));
        }
    }
    
    // Initialize when DOM is ready
    function initAfterAuth(){ try { if (window.Auth && typeof window.Auth.isAuthenticated==='function' && window.Auth.isAuthenticated()) { window.initCodeBankPanel(); } } catch(_){} }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            try { if (window.Auth && typeof window.Auth.isAuthenticated==='function' && window.Auth.isAuthenticated()) { window.initCodeBankPanel(); } } catch(_){}
        });
    } else {
        initAfterAuth();
    }
    try { window.addEventListener('auth:ready', function(e){ try { var ok=!!(e&&e.detail&&e.detail.authenticated); if(ok){ window.initCodeBankPanel(); } } catch(_){} }); } catch(_){}
})();
