// ═══════════════════════════════════════════════════════════════════════════════
// AUTH GLOBAL - GUEST MODE FIX
// Replaces hard redirects with silent guest session creation
// ═══════════════════════════════════════════════════════════════════════════════

if (window.__AUTH_GLOBAL_INITIALIZED) {
    console.log('[auth-global] Already initialized, skipping');
} else {
    window.__AUTH_GLOBAL_INITIALIZED = true;
    console.log('[auth-global] Initializing with guest mode support...');

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTANTS
    // ─────────────────────────────────────────────────────────────────────────────
    const LOGIN_URL = '/login.html';
    const GUEST_SESSION_KEY = 'guest_session';
    const SESSION_TOKEN_KEY = 'session_token';
    const SESSION_ACTIVE_KEY = 'session_active';
    const GUEST_SESSION_DURATION = 365 * 24 * 60 * 60 * 1000; // 1 year

    // ─────────────────────────────────────────────────────────────────────────────
    // GUEST MODE SETUP
    // ─────────────────────────────────────────────────────────────────────────────
    
    function createGuestSession() {
        const guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const guestSession = {
            userId: guestId,
            authenticated: false,
            guest: true,
            createdAt: Date.now(),
            expiresAt: Date.now() + GUEST_SESSION_DURATION,
            token: 'guest_' + Math.random().toString(36).substr(2, 40)
        };

        localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guestSession));
        window.CURRENT_SESSION = guestSession;
        
        console.log('[auth-global] ✅ Guest session created:', guestId);
        return guestSession;
    }

    function getOrCreateGuestSession() {
        const stored = localStorage.getItem(GUEST_SESSION_KEY);
        
        if (stored) {
            try {
                const session = JSON.parse(stored);
                if (session.expiresAt > Date.now()) {
                    window.CURRENT_SESSION = session;
                    console.log('[auth-global] Using existing guest session:', session.userId);
                    return session;
                }
            } catch (e) {
                console.warn('[auth-global] Corrupted guest session, creating new one');
            }
        }

        return createGuestSession();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // AUTH STATUS CHECK (replaces hard redirects)
    // ─────────────────────────────────────────────────────────────────────────────

    async function ensureAuthSession() {
        const token = localStorage.getItem(SESSION_TOKEN_KEY);
        const sessionActive = localStorage.getItem(SESSION_ACTIVE_KEY);

        if (token && sessionActive === 'true') {
            console.log('[auth-global] User has valid session token, checking with server...');
            
            try {
                // Verify with server but don't block on error
                const response = await fetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => null);

                if (response && response.ok) {
                    const data = await response.json();
                    window.CURRENT_SESSION = {
                        userId: data.userId,
                        authenticated: true,
                        guest: false,
                        token: token
                    };
                    console.log('[auth-global] ✅ Server session verified:', data.userId);
                    return;
                }
            } catch (e) {
                console.warn('[auth-global] Server verification failed, falling back to guest mode');
            }
        }

        // No valid session found or server check failed → GUEST MODE
        console.log('[auth-global] No valid session, creating guest mode');
        getOrCreateGuestSession();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // LOGOUT (no hard redirect)
    // ─────────────────────────────────────────────────────────────────────────────

    function handleLogout() {
        console.log('[auth-global] Logging out, creating guest session...');
        
        localStorage.removeItem(SESSION_TOKEN_KEY);
        localStorage.removeItem(SESSION_ACTIVE_KEY);
        localStorage.removeItem(GUEST_SESSION_KEY);
        
        createGuestSession();
        
        // Optionally redirect to home, but don't force it
        if (window.location.pathname === '/yt-new-clear.html' || window.location.pathname === '/') {
            console.log('[auth-global] Already at home, staying in guest mode');
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXPOSE GLOBAL API
    // ─────────────────────────────────────────────────────────────────────────────

    window.AuthGlobal = {
        ensureAuthSession,
        getOrCreateGuestSession,
        createGuestSession,
        handleLogout,
        isGuest: () => window.CURRENT_SESSION && window.CURRENT_SESSION.guest,
        isAuthenticated: () => window.CURRENT_SESSION && window.CURRENT_SESSION.authenticated,
        getSession: () => window.CURRENT_SESSION
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // AUTO-INIT ON PAGE LOAD
    // ─────────────────────────────────────────────────────────────────────────────

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureAuthSession);
    } else {
        // DOM already loaded
        ensureAuthSession();
    }

    console.log('[auth-global] ✅ Loaded successfully - guest mode enabled');
}
