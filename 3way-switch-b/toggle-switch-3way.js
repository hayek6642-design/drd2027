// toggle-switch-3way.js
// Strict module, ONLY for #three-way-toggle, with physics, popup, haptics, and sound.
import { showSectionPopup } from '../js/section-switch-popup.js';

// Auto-initialize when DOM is ready (fallback)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initThreeWayToggle();
    });
} else {
    // DOM already loaded
    setTimeout(() => {
        initThreeWayToggle();
    }, 100);
}

// --- UTILS ---
const TICK_PATH = '/assets/ui/tick.mp3';
let tickAudio; 
function playTickSound() {
    try {
        if (!tickAudio) { 
            tickAudio = new Audio(TICK_PATH); 
            tickAudio.volume = 0.25;
            tickAudio.onerror = () => {
                console.warn('[3-way-toggle] Tick sound file not found, continuing without sound');
            };
        }
        tickAudio.currentTime = 0;
        tickAudio.play().catch(e => {
            // Silently ignore audio play errors (autoplay restrictions, missing file, etc.)
            console.debug('[3-way-toggle] Could not play tick sound:', e.message);
        });
    } catch (e) {
        // Silently ignore audio errors
        console.debug('[3-way-toggle] Audio error:', e.message);
    }
}
function doHaptic() { if ('vibrate' in navigator) try { navigator.vibrate(35); } catch(e){} }

// --- HTML ELEMENTS ---
let root, handle, track;
export function initThreeWayToggle() {
    root = document.getElementById('three-way-toggle');
    if (!root) {
        console.warn('[3-way-toggle] Element #three-way-toggle not found!');
        return;
    }
    track = root.querySelector('.toggle-track');
    handle = root.querySelector('.toggle-handle');
    if (!track || !handle) {
        console.error('[3-way-toggle] Track or handle not found!', { track, handle });
        return;
    }
    if (window.DEBUG_MODE) console.log('[3-way-toggle] Initialized successfully!', { root, track, handle });
    window.__SWITCHES_READY__ = true;
    let current = 1; // 0=Afra7(left), 1=Home(center), 2=Nour(right)
    root.dataset.state = 'home';

    // Cycle function - same behavior as extra button
    async function cycleSection() {
        if (window.DEBUG_MODE) console.log('[3-way-toggle] Cycling from position:', current, ['Afra7', 'Home', 'Nour'][current]);
        const nextIdx = current === 1 ? 0 : (current === 0 ? 2 : 1);
        await switchToSection(nextIdx);
    }

    // Switch to specific section
    async function switchToSection(idx) {
        if (window.DEBUG_MODE) console.log('[3-way-toggle] switchToSection called with idx:', idx, 'current:', current);
        // Always allow switching (for cycling behavior)
        if (window.DEBUG_MODE) console.log('[3-way-toggle] Switching to section:', idx, ['Afra7', 'Home', 'Nour'][idx]);
        
        // Save current section time before switching (only for Home and Nour)
        if (current === 1 && window.saveCurrentSectionTime) {
            // Currently on Home, save it
            await window.saveCurrentSectionTime('home');
        } else if (current === 2 && window.saveCurrentSectionTime) {
            // Currently on Nour, save it
            await window.saveCurrentSectionTime('nour');
        }
        // Don't save Afra7 time (always starts from beginning)
        root.dataset.state = idx === 0 ? 'afra7' : (idx === 1 ? 'home' : 'nour');
        
        // Add glow effect
        handle.classList.add('glow');
        setTimeout(() => handle.classList.remove('glow'), 310);
        
        // Feedback
        doHaptic();
        playTickSound();
        
        // Update current BEFORE calling callback
        current = idx;
        
        // Call section callback
        await sectionCallback(idx);
    }

    // Click handler on knob - cycle through sections (like extra button)
    handle.addEventListener('click', function(e) {
        if (window.SystemProtection && window.SystemProtection.isProtectionActive()) return;
        if (window.__EXTRA_MODE_LOCKED__ === true) return;
        e.stopPropagation();
        e.preventDefault();
        if (window.DEBUG_MODE) console.log('[3-way-toggle] Handle clicked, current position:', current);
        cycleSection().catch(err => console.error('[3-way-toggle] Error in cycleSection:', err));
    }, true); // Use capture phase

    // Click handler on track/container - choose section by click position
    root.addEventListener('click', function(e) {
        if (window.SystemProtection && window.SystemProtection.isProtectionActive()) return;
        if (window.__EXTRA_MODE_LOCKED__ === true) return;
        if (!(e.target === root || e.target === track)) return;
        e.stopPropagation();
        e.preventDefault();
        const rect = track.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const idx = x < 1/3 ? 0 : (x < 2/3 ? 1 : 2);
        switchToSection(idx).catch(err => console.error('[3-way-toggle] Error switchToSection:', err));
    }, true);
    
    // Initialize: Load Home section on page load (since handle starts in center)
    function initializeHomeSection() {
        if (window.showHomeSection && window.player) {
            if (window.DEBUG_MODE) console.log('[3-way-toggle] Initializing with Home section');
            window.showHomeSection().catch(err => console.error('[3-way-toggle] Error initializing Home:', err));
            return true;
        }
        return false;
    }
    
    // Try immediately if player is ready (only after auth)
    var __authed = false; try { __authed = (window.Auth && typeof window.Auth.isAuthenticated==='function' && window.Auth.isAuthenticated()) || (window.AuthCore && typeof window.AuthCore.isAuthenticated==='function' && window.AuthCore.isAuthenticated()); } catch(_){ __authed = false }
    if (__authed && initializeHomeSection()) {
        if (window.DEBUG_MODE) console.log('[3-way-toggle] Home section initialized immediately');
    } else {
        if (__authed) {
            if (window.DEBUG_MODE) console.log('[3-way-toggle] Waiting for player to be ready...');
            const checkInterval = setInterval(() => {
                if (initializeHomeSection()) {
                    if (window.DEBUG_MODE) console.log('[3-way-toggle] Home section initialized after wait');
                    clearInterval(checkInterval);
                }
            }, 500);
            if (window.onPlayerReady) {
                const originalOnPlayerReady = window.onPlayerReady;
                window.onPlayerReady = function(event) {
                    originalOnPlayerReady(event);
                    setTimeout(() => {
                        if (initializeHomeSection()) {
                            clearInterval(checkInterval);
                        }
                    }, 500);
                };
            }
            setTimeout(() => {
                clearInterval(checkInterval);
                if (!window.player) {
                    console.warn('[3-way-toggle] Player not ready after 15 seconds, Home section may not load');
                }
            }, 15000);
        }
    }

    // Hover effects (like extra button)
    handle.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.1)';
    });
    handle.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
    });

    // Sync UI on section change (no logic duplication)
    window.addEventListener('section:changed', (e) => {
        const s = (e && e.detail && e.detail.section) ? e.detail.section : (window.currentSection||'home');
        if (s === 'afra7') current = 0;
        else if (s === 'home') current = 1;
        else current = 2;
        root.dataset.state = s;
    });

    // Section callback function
    async function sectionCallback(idx) {
        if (window.DEBUG_MODE) console.log('[3-way-toggle] Section callback for index:', idx);
        if (idx === 0) {
            showSectionPopup('Afra7');
            if (window.showAfra7Section) {
                try {
                    await window.showAfra7Section();
                } catch (e) {
                    console.error('[3-way-toggle] Error in showAfra7Section:', e);
                }
            } else {
                console.warn('[3-way-toggle] showAfra7Section function not found');
            }
        } else if (idx === 1) {
            showSectionPopup('Home');
            if (window.showHomeSection) {
                try {
                    await window.showHomeSection();
                } catch (e) {
                    console.error('[3-way-toggle] Error in showHomeSection:', e);
                }
            } else {
                console.warn('[3-way-toggle] showHomeSection function not found');
            }
        } else if (idx === 2) {
            showSectionPopup('Nour');
            if (window.showNourSection) {
                try {
                    await window.showNourSection();
                } catch (e) {
                    console.error('[3-way-toggle] Error in showNourSection:', e);
                }
            } else {
                console.warn('[3-way-toggle] showNourSection function not found');
            }
        }
    }
}
