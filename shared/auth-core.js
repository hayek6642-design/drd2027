// auth-core.js
// Universal Authentication Core with PostMessage Bridge for Cross-Origin Iframes
// Version: 2.0.0 - Production Ready

;(function(){
  'use strict';
  
  // ============================================
  // SECTION 1: SINGLETON GUARD & RELOAD LOOP GUARD
  // ============================================
  
  if (typeof window !== 'undefined') {
    // 🧪 DIAGNOSTIC: Track all reload calls (from actly.md)
    (function() {
        window.safeReload = function() {
            console.error('🚨 [AuthCore] safeReload() called from:', new Error().stack);
            location.reload();
        };
        window.safeReplace = function(url) {
            console.error('🚨 [AuthCore] safeReplace() called with:', url, 'from:', new Error().stack);
            location.replace(url);
        };
    })();

    // 🧪 DEBUG: Page loaded log
    if (window.DEBUG_MODE) console.log('[DEBUG] Page loaded at:', new Date().toISOString());

    // 🔧 FIX 5: Loop Guard (sessionStorage)
    const now = Date.now();
    const lastReload = parseInt(sessionStorage.getItem('__last_reload__') || '0');
    const reloadCount = parseInt(sessionStorage.getItem('__reload_count__') || '0');

    if (now - lastReload < 2000) { // If reloaded within 2 seconds
      if (reloadCount > 3) {
        console.warn('🛑 [GUARD] Infinite reload loop detected and stopped.');
        return; 
      }
      sessionStorage.setItem('__reload_count__', (reloadCount + 1).toString());
    } else {
      sessionStorage.setItem('__reload_count__', '0');
    }
    sessionStorage.setItem('__last_reload__', now.toString());

    if (window.__AUTH_CORE_LOADED__) { 
      try { console.error('[AuthCore] Duplicate load detected. Skipping initialization.'); } catch(_){}; 
      return; 
    }
    window.__AUTH_CORE_LOADED__ = true;
  }

  // ============================================
  // SECTION 2: UTILITY FUNCTIONS
  // ============================================
  
  function getCookie(name){
    try {
      const m = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]+)'));
      return m ? decodeURIComponent(m[2]) : null;
    } catch(_) { return null }
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // ============================================
  // SECTION 3: AUTHCORE STATE MANAGEMENT
  // ============================================

  const DEBUG_MODE = window.AUTH_DEBUG !== undefined ? window.AUTH_DEBUG : true;
  function authLog(...args) {
    if (DEBUG_MODE) console.log(...args);
  }

  const AuthCore = {
    _authenticated: false,
    _status: 'loading',
    _userId: null,
    _sessionId: null,
    _user: null,
    _state: { authenticated: false, status: 'loading', userId: null, sessionId: null, user: null },
    _lastSyncedState: null,
    _syncInProgress: false,
    _locked: false,
    _lastPayloadUser: null,
    _initPromise: null,
    _authStartTime: null,
    _authInitialized: false,

    _syncAuthState(){
      if (this._syncInProgress) return;
      
      const newState = {
        authenticated: this._authenticated,
        status: this._status,
        userId: this._userId,
        sessionId: this._sessionId,
        user: this._user,
        timestamp: Date.now()
      };

      // Deduplication check
      const stateString = JSON.stringify({ ...newState, timestamp: 0 });
      const lastString = JSON.stringify({ ...this._lastSyncedState, timestamp: 0 });
      if (stateString === lastString) return;

      this._syncInProgress = true;
      this._lastSyncedState = { ...newState };

      window.__AUTH_STATE__ = newState;
      window.__AUTH_READY__ = (this._status === 'authenticated');
      window.authReady = (this._status === 'authenticated');

      if (this._status !== 'loading') {
        authLog('[AuthCore] State synced:', {
          authenticated: this._authenticated,
          status: this._status,
          userId: this._userId
        });
      }
      
      // 🔧 Persistence
      if (this._status === 'authenticated' && this._user) {
        localStorage.setItem('session_token', this._sessionId);
        localStorage.setItem('user_data', JSON.stringify(this._user));
        localStorage.setItem('auth_timestamp', Date.now().toString());
        // [FIX] Also save for cache restoration on next load (was missing, causing re-auth on mobile)
        localStorage.setItem('__cached_user__', JSON.stringify(this._user));
        localStorage.setItem('__cached_session_id__', this._sessionId);
        localStorage.setItem('session_active', '1');
      } else if (this._status === 'unauthenticated') {
        // [EMERGENCY FIX] Only clear session_active if there's no valid session token
        var currentToken = localStorage.getItem('session_token') || 
                          (document.cookie.match(/session_token=([^;]+)/) || [])[1];
        
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('auth_timestamp');
        localStorage.removeItem('__cached_user__');
        localStorage.removeItem('__cached_session_id__');
        
        // ONLY remove session_active if no valid token exists
        if (!currentToken) {
          localStorage.removeItem('session_active');
          // [FIX] Only expire the session cookie if there's no valid token
          try { document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax'; } catch(_){}
        } else {
          console.warn('[AuthCore] ⚠️ Server returned unauthenticated but valid token exists in localStorage');
          console.warn('[AuthCore] Token:', currentToken.substring(0, 8) + '...');
          console.warn('[AuthCore] Keeping token and session_active for next verification attempt');
          localStorage.setItem('session_active', '1');
          // DO NOT expire the cookie - we need it for the next request
        }
      }
      
      // Update Auth interface if exists
      if (window.Auth && window.Auth._updateInternal) {
        // Use a flag to prevent the interface from calling back into AuthCore
        window.__INTERNAL_SYNC__ = true;
        window.Auth._updateInternal(this._state);
        window.__INTERNAL_SYNC__ = false;
      }

      this._syncInProgress = false;
    },

     _setState(nextAuth, nextUser, nextSessionId, fullUser) {
       if (this._authInitialized && nextAuth === this._authenticated && nextUser === this._userId && !fullUser) return; 
       
       if (typeof nextAuth === 'object' && nextAuth !== null) {
         const payload = nextAuth;
       let nextAuthenticated = !!payload.authenticated;
       let nextStatus = payload.status || (nextAuthenticated ? 'authenticated' : 'unauthenticated');
       let nextUserId = payload.userId || null;
       let nextSessId = payload.sessionId || this._sessionId;
       let nextFullUser = payload.user || fullUser || null;
       
       if (this._locked && nextAuthenticated === false) { return; }
       
       // [FIX] Auto-correct removed: stale token must not override server's unauthenticated response.

       // FORCE clear previous user data first when setting authenticated state
       if (nextAuthenticated) {
         localStorage.removeItem('bankode_user_cache');
         localStorage.removeItem('codebank_assets');
         localStorage.removeItem('codebank_assets_user');
       }

       this._authenticated = nextAuthenticated;
       this._status = nextStatus;
       this._userId = nextUserId;
       this._sessionId = nextSessId;
       this._user = nextFullUser;
       this._state = {
         authenticated: this._authenticated,
         status: this._status,
         userId: this._userId,
         sessionId: this._sessionId,
         user: this._user
       };

       this._syncAuthState();

       if (this._status === 'authenticated' && !this._initTriggered) {
           this._initTriggered = true; // Only trigger init once
           window.__resolveAuthReady && window.__resolveAuthReady(true);
           this._authStartTime = Date.now();

           window.dispatchEvent(new CustomEvent('auth:ready', { detail: this._state }));
           window.dispatchEvent(new CustomEvent('auth:changed', { detail: this._state }));

           // [FIX] Auto-redirect from login page removed from _setState.
           // login.html uses its own session_active check; this path fired too early
           // (before server confirmation) and caused redirect loops with stale cached tokens.
       }
       return;
     }
    
    this._authenticated = !!nextAuth;
    this._status = this._authenticated ? 'authenticated' : 'unauthenticated';
    this._userId = nextUser || null;
    this._sessionId = nextSessionId || this._sessionId;
    this._user = fullUser || this._user;
    this._state = { 
      authenticated: this._authenticated, 
      status: this._status,
      userId: this._userId, 
      sessionId: this._sessionId,
      user: this._user
    };
    
    this._syncAuthState();
    
    if (this._status === 'authenticated') {
      window.__resolveAuthReady && window.__resolveAuthReady(true);
    }
  },

    async _fetchMeAndApply(){
      try {
        const headers = { 'Accept': 'application/json' };
        if (this._sessionId) {
          headers['Authorization'] = `Bearer ${this._sessionId}`;
        }

        // [FIX] 8-second timeout prevents indefinite hang when API is unreachable
        const _ctrl = new AbortController();
        const _tid = setTimeout(() => _ctrl.abort(), 8000);
        let r;
        try {
          r = await fetch('/api/auth/me', { 
            credentials: 'include',
            headers: headers,
            signal: _ctrl.signal
          });
        } finally {
          clearTimeout(_tid);
        }
        
        let payload = null;
        if (r && r.ok) { 
          try { payload = await r.json(); } catch(_) { payload = null } 
        }
        
        const u = payload && payload.user || null;
        this._lastPayloadUser = u && u.id || null;
        this._sessionId = (u && u.sessionId) || (payload && payload.sessionId) || this._sessionId;
        
        if (u && u.id) {
          this._setState({ 
            authenticated: true, 
            status: 'authenticated',
            userId: u.id, 
            sessionId: u.sessionId || this._sessionId 
          }, null, null, u);
          // [EMERGENCY FIX] Ensure session_active is always set when authenticated
          localStorage.setItem('session_active', '1');
          this._authInitialized = true; // 🔧 Mark as initialized
          
        } else {
          this._setState({ authenticated: false, status: 'unauthenticated' }, null);
          window.__resolveAuthReady && window.__resolveAuthReady(false);
          this._authInitialized = true; 
        }
        
        if (this._status === 'authenticated') { 
          try { Object.freeze(this._state); } catch(_){}; 
          this._locked = true; 
        }
      } catch(err) {
        // [FIX] Network/timeout error — keep cached session, don't clear auth state.
        // Only clear if server explicitly said unauthenticated (handled above in !u.id branch).
        var _isNetErr = err && (err.name === 'AbortError' || err.name === 'TypeError' || String(err.message || '').toLowerCase().indexOf('fetch') >= 0);
        if (_isNetErr && this._sessionId) {
          console.warn('[AuthCore] Network error during background verify — keeping cached session:', err.name || err.message);
          try {
            window.dispatchEvent(new CustomEvent('auth:ready', {
              detail: {
                authenticated: this._authenticated,
                status: this._status,
                userId: this._userId || null,
                sessionId: this._sessionId || null,
                user: this._user
              }
            }));
          } catch(_) {}
          return;
        }
        this._setState({ authenticated: false, status: 'unauthenticated' }, null);
        window.__resolveAuthReady && window.__resolveAuthReady(false);
      }
      
      this._syncAuthState();
      
      try { 
        window.dispatchEvent(new CustomEvent('auth:ready', { 
          detail: { 
            authenticated: this._authenticated, 
            status: this._status,
            userId: this._userId || null, 
            sessionId: this._sessionId || null,
            user: this._user
          } 
        })); 
      } catch(_){}
    },

    async init(){
      if (this._initPromise) return this._initPromise;
      
      this._initPromise = (async () => {
        try {
          if (window.__AUTH_INIT_DONE__) return;
          window.__AUTH_INIT_DONE__ = true;

          if (window.DEBUG_MODE) console.log('[AuthCore] Initializing auth state...');
          this._status = 'loading';
          this._syncAuthState();

          // IFRAME AUTH INHERITANCE: Check if parent has Auth
          if (window.self !== window.top) {
            try {
              if (window.top && window.top.Auth && typeof window.top.Auth.isAuthenticated === 'function') {
                if (window.DEBUG_MODE) console.log('[AuthCore] Iframe detected parent Auth, inheriting state');
                const parentAuth = window.top.Auth;
                const parentUser = parentAuth.getUser ? parentAuth.getUser() : null;
                const parentStatus = parentAuth.getStatus ? parentAuth.getStatus() : (parentAuth.isAuthenticated() ? 'authenticated' : 'unauthenticated');
                
                this._setState({
                  authenticated: parentAuth.isAuthenticated(), 
                  status: parentStatus,
                  userId: parentUser?.id, 
                  sessionId: parentAuth.getToken ? parentAuth.getToken() : null,
                  user: parentUser
                });
                this._syncAuthState();
                this._authInitialized = true;
                window.__resolveAuthReady && window.__resolveAuthReady(this._authenticated);
                
                return;
              }
            } catch (e) {
              console.warn('[AuthCore] Cross-origin parent access failed, will use postMessage');
            }
          }

          const isCodeBank = (typeof location!=='undefined' && location.pathname && 
            (location.pathname.startsWith('/codebank/') || 
             location.pathname.includes('/services/yt-clear/codebank/')));
             
          const disableFetch = !!(typeof window!=='undefined' && window.__DISABLE_AUTH_FETCH__===true);
          
          this._sessionId = getCookie('session_token');

          // 🔧 FIX 3: Persistence - Restore from cache if available
          const cachedUserStr = localStorage.getItem('__cached_user__');
          const localToken = localStorage.getItem('session_token');
          
          if (!this._sessionId && localToken) {
            if (window.DEBUG_MODE) console.log('[AuthCore] No cookie but found token in localStorage, restoring...');
            this._sessionId = localToken;
            document.cookie = `session_token=${localToken}; path=/; max-age=${7*24*60*60}`;
          }

          if (cachedUserStr && this._sessionId) {
            try {
              const cachedUser = JSON.parse(cachedUserStr);
              const cachedSessionId = localStorage.getItem('__cached_session_id__');
              
              if (cachedUser && (cachedSessionId === this._sessionId || localToken === this._sessionId)) {
                if (window.DEBUG_MODE) console.log('[AuthCore] Restoring auth state from cache');
                this._setState({
                  authenticated: true,
                  status: 'authenticated',
                  userId: cachedUser.id,
                  sessionId: this._sessionId,
                  user: cachedUser
                });
                // [EMERGENCY FIX] Ensure session_active is set when restoring session
                localStorage.setItem('session_active', '1');
                this._authInitialized = true;
                // Still fetch in background to verify
                this._fetchMeAndApply().catch(() => {});
                return;
              }
            } catch(e) {
              localStorage.removeItem('__cached_user__');
              localStorage.removeItem('__cached_session_id__');
              localStorage.removeItem('session_token');
            }
          }
          
          // 🛡️ IFRAME AUTH INHERITANCE: PostMessage listener
          window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'AUTH_SYNC') {
              if (window.DEBUG_MODE) console.log('[AuthCore] Received AUTH_SYNC from parent window');
              const { authenticated, userId, sessionId, user } = event.data;
              if (authenticated && userId && sessionId) {
                this._setState({
                  authenticated: true,
                  status: 'authenticated',
                  userId,
                  sessionId,
                  user
                });
                this._authInitialized = true;
                this._syncAuthState();
              }
            }
          });
          
          if (!this._sessionId) {
            if (window.DEBUG_MODE) console.log('[AuthCore] No session token found, user is guest');
            this._setState({ authenticated: false, status: 'unauthenticated' }, null);
            this._authInitialized = true;
            window.__resolveAuthReady && window.__resolveAuthReady(false);
            this._syncAuthState();
            
            try { 
              window.dispatchEvent(new CustomEvent('auth:ready', { 
                detail: { authenticated: false, status: 'unauthenticated', userId: null, sessionId: null, user: null } 
              })); 
            } catch(_){}
            return;
          }
          
          await this._fetchMeAndApply();
        } catch(e) {
          console.error('[AuthCore] Init error:', e);
          this._setState({ authenticated: false, status: 'unauthenticated' }, null);
          this._authInitialized = true;
          this._syncAuthState();
        }
      })();
      
      return this._initPromise;
    },

    isAuthenticated(){ return this._status === 'authenticated' },
    getStatus(){ return this._status },
    userId(){ return this._userId || null },
    sessionId(){ return this._sessionId || null },
    getUser(){ return this._user || { id: this._userId } },
    getState(){ return { ...this._state } },

    async refresh(){
      try { if(window.DEBUG_MODE) console.log('[AuthCore] refresh() start'); } catch(_){};
      if (this._locked) { 
        try { if(window.DEBUG_MODE) console.log('[AuthCore] refresh() skipped: state locked'); } catch(_){}; 
        return; 
      }
      
      const beforeStatus = this._status;
      await this._fetchMeAndApply();
      
      try { if(window.DEBUG_MODE) console.log('[AuthCore] refresh() done', { from: beforeStatus, to: this._status }); } catch(_){}
      
      if (beforeStatus !== this._status) {
        try { if(window.DEBUG_MODE) console.log('[AuthCore] auth:changed →', { 
          authenticated: this.isAuthenticated(), 
          status: this._status,
          userId: this._userId 
        }); } catch(_){}
        
        try { 
          window.dispatchEvent(new CustomEvent('auth:changed', { 
            detail: { 
              authenticated: this.isAuthenticated(), 
              status: this._status,
              userId: this._userId || null, 
              sessionId: this._sessionId || null,
              user: this._user
            } 
          })); 
        } catch(_){}
        
        // Notify bridge of change
        if (window.AuthBridge) {
          window.AuthBridge.notifyChange();
        }
      }
    },

    async waitForAuth(timeout = 10000){
      if (this._status === 'authenticated') return true;
      if (this._status === 'unauthenticated') return false;
      
      return new Promise((resolve) => {
        const check = () => {
          if (this._status === 'authenticated') {
            resolve(true);
            return true;
          }
          if (this._status === 'unauthenticated') {
            resolve(false);
            return true;
          }
          return false;
        };
        
        if (check()) return;
        
        const interval = setInterval(() => {
          if (check()) clearInterval(interval);
        }, 100);
        
        setTimeout(() => {
          clearInterval(interval);
          resolve(this._status === 'authenticated');
        }, timeout);
      });
    },

     logout(){
       console.log('[Auth] Logging out, clearing all user data...');
       
       // 1. Clear ALL user-related localStorage
       const keysToRemove = [
         'bankode_user_cache',
         'codebank_assets',
         'codebank_assets_user',
         'user',
         'session',
         'auth_state',
         'cached_codes',
         'last_sync'
       ];
       
       keysToRemove.forEach(key => {
         localStorage.removeItem(key);
         sessionStorage.removeItem(key);
       });
       
       // 2. Clear AppState
       if (window.AppState) {
         window.AppState.user = null;
         window.AppState.assets = { codes: [], silver: [], gold: [] };
         window.AppState.authenticated = false;
         window.AppState.lastSync = null;
       }
       
       // 3. Clear cookies
       document.cookie.split(";").forEach(function(c) {
         document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
       });
       
       this._authenticated = false;
       this._status = 'unauthenticated';
       this._userId = null;
       this._user = null;
       this._sessionId = null;
       this._locked = false;
       this._authInitialized = false;
       this._initTriggered = false;
       this._initPromise = null;
       this._lastSyncedState = null;

       // 🔧 FIX: Allow re-initialization after logout
       window.__AUTH_CORE_LOADED__ = false;
       window.__AUTH_INIT_DONE__ = false;

       this._syncAuthState();
       
       // 🔧 FIX: Reset ACCClient singleton so re-login creates a fresh instance
       if (typeof ACCClient !== 'undefined' && ACCClient.reset) {
         try { ACCClient.reset(); } catch(_) {}
       }
       if (window.ACCClient && window.ACCClient.reset) {
         try { window.ACCClient.reset(); } catch(_) {}
       }
       
       // 🔧 FIX: Clear AssetBusV2 state
       if (window.AssetBusV2 && typeof window.AssetBusV2.clearState === 'function') {
         try { window.AssetBusV2.clearState(); } catch(_) {}
       }
       if (window.AssetBus && typeof window.AssetBus.clearState === 'function') {
         try { window.AssetBus.clearState(); } catch(_) {}
       }
       
       // 🔧 FIX: Clear Bankode trusted user globals
       window.CODEBANK_TRUSTED_USER_ID = null;
       window.CODEBANK_TRUSTED_USER_EMAIL = null;
       
       // 🔧 FIX: Clear IndexedDB auth state
       try { this._clearIDB(); } catch(_) {}
       
       // 🔧 FIX: Clear Bankode safe local storage
       try {
         localStorage.removeItem('asset_safe_password');
         localStorage.removeItem('asset_safe_salt');
         localStorage.removeItem('bankode_safe_state');
       } catch(_) {}

       // Notify all iframes
       if (window.AuthBridge) {
         window.AuthBridge.broadcast({
           type: 'AUTH_LOGOUT',
           timestamp: Date.now()
         });
       }
       
       window.dispatchEvent(new CustomEvent('auth:logout'));
       
       // 6. HARD RELOAD to clear all memory state
       window.location.href = '/login.html';
     },

    // 🛡️ IDB HELPER METHODS (Requirement from actly.md)
    async _saveToIDB(data) {
      if (typeof indexedDB === 'undefined') return;
      return new Promise((resolve, reject) => {
        const DB_NAME = 'AuthDB';
        const DB_VERSION = 2; // Incremented to trigger onupgradeneeded
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          const stores = ['users', 'sessions', 'auth_state', 'pending_txs'];
          stores.forEach(storeName => {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName, { keyPath: 'id' });
              if (window.DEBUG_MODE) console.log(`[AuthCore] Created object store: ${storeName}`);
            }
          });
        };

        request.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction('auth_state', 'readwrite');
          const store = tx.objectStore('auth_state');
          store.put({ id: 'current', ...data });
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = (err) => { db.close(); reject(err); };
        };
        request.onerror = (err) => reject(err);
      });
    },

    async _clearIDB() {
      if (typeof indexedDB === 'undefined') return;
      return new Promise((resolve, reject) => {
        const DB_NAME = 'AuthDB';
        const DB_VERSION = 2;
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          const stores = ['users', 'sessions', 'auth_state', 'pending_txs'];
          stores.forEach(storeName => {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName, { keyPath: 'id' });
            }
          });
        };

        request.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction('auth_state', 'readwrite');
          const store = tx.objectStore('auth_state');
          store.clear();
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = (err) => { db.close(); reject(err); };
        };
        request.onerror = (err) => resolve();
      });
    }
  };

  // ============================================
  // SECTION 4: GLOBAL AUTH INTERFACE
  // ============================================

  try { 
    if (window.self === window.top) {
      // Global Auth interface
      window.Auth = {
        isAuthenticated: () => AuthCore.isAuthenticated(),
        getUser: () => AuthCore.getUser(),
        getStatus: () => AuthCore.getState().status, // 🛡️ ADDED: Required for safe-list-actions.js
        getToken: () => AuthCore.sessionId(),
        getState: () => AuthCore.getState(),
        refresh: () => AuthCore.refresh(),
        logout: () => AuthCore.logout(),
        waitForAuth: (t) => AuthCore.waitForAuth(t),
        onChange: (cb) => {
          const handler = (e) => {
            if (typeof cb === 'function') cb(e.detail);
          };
          window.addEventListener('auth:changed', handler);
          window.addEventListener('auth:ready', handler);
          
          // Return unsubscribe
          return () => {
            window.removeEventListener('auth:changed', handler);
            window.removeEventListener('auth:ready', handler);
          };
        },
        // Internal update method
        _updateInternal: (state) => {
          if (!state) return;
          if (window.DEBUG_MODE) console.log('[Auth] Internal update received:', state);
          AuthCore._setState(state);
        }
      };
      
      // Global APP object
      window.__APP__ = {
        auth: window.Auth,
        assets: {
          snapshot: [],
          lastUpdate: Date.now()
        },
        version: '2.0.0'
      };
      
      if (window.DEBUG_MODE) console.log("✅ [AuthCore] Parent window Auth initialized");
    }
  } catch(_) {}

  // ============================================
  // SECTION 5: POSTMESSAGE AUTH BRIDGE
  // ============================================

  const AuthBridge = {
    // Configure these for your deployment
    config: {
      // ALLOWED_ORIGINS: Add all your service domains here
      allowedOrigins: [
        window.location.origin, // Same origin always allowed
        
        // Development origins
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        
        // Add your production origins here:
        // 'https://codebank.yourdomain.com',
        // 'https://e7ki.yourdomain.com',
        // 'https://farragna.yourdomain.com',
        // 'https://samman.yourdomain.com',
        // 'https://pebalaash.yourdomain.com',
        // 'https://eb3at.yourdomain.com',
        // 'https://games.yourdomain.com',
        // 'https://safecode.yourdomain.com',
      ],
      
      // Token expiry for iframe sessions (milliseconds)
      tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
      
      // Enable debug logging
      debug: true
    },
    
    // Connected iframes registry
    connections: new Map(),
    
    init: function() {
      if (window.self !== window.top) return; // Only in parent
      
      window.addEventListener('message', this.handleMessage.bind(this));
      if (window.DEBUG_MODE) console.log('[AuthBridge] PostMessage bridge initialized');
      if (window.DEBUG_MODE) console.log('[AuthBridge] Allowed origins:', this.config.allowedOrigins);
    },
    
    isAllowedOrigin: function(origin) {
      // Exact match
      if (this.config.allowedOrigins.includes(origin)) return true;
      
      // Check for wildcard subdomains (if configured)
      // WARNING: Only use for trusted domains
      try {
        const url = new URL(origin);
        const hostname = url.hostname;
        
        // Example: allow *.yourdomain.com
        // if (hostname.endsWith('.yourdomain.com')) return true;
      } catch(e) {
        return false;
      }
      
      return false;
    },
    
    handleMessage: function(event) {
      // 🛡️ Filter YouTube spam to prevent console flooding
      if (event.origin && event.origin.includes('youtube.com')) return;

      // SECURITY: Strict origin check 
      if (!this.isAllowedOrigin(event.origin)) {
        if (this.config.debug) {
          console.warn('[AuthBridge] REJECTED message from unauthorized origin:', event.origin);
        }
        return;
      }
      
      // Validate data
      if (!event.data || typeof event.data !== 'object') return;
      
      const data = event.data;
      const source = event.source;
      const origin = event.origin;
      
      // Handle auth request types
      switch(data.type) {
        case 'AUTH_REQUEST':
          this.handleAuthRequest(source, origin, data);
          break;
          
        case 'AUTH_REFRESH':
          this.handleAuthRefresh(source, origin, data);
          break;
          
        case 'AUTH_VALIDATE':
          this.handleAuthValidate(source, origin, data);
          break;
          
        case 'AUTH_PING':
          // Simple ping-pong for connectivity check
          source.postMessage({ type: 'AUTH_PONG', timestamp: Date.now() }, origin);
          break;
          
        case 'auth:done':
          // 🔧 FIX 4: Handle iframe reload request via postMessage
          if (window.DEBUG_MODE) console.log('[AuthBridge] auth:done received from iframe, refreshing parent state');
          if (window.Auth && window.Auth.refresh) {
            window.Auth.refresh().then(() => {
              // Optionally notify other iframes or perform a safe top-level reload if absolutely necessary
              // but usually refresh() is enough to sync state.
            });
          }
          break;

        case 'IFRAME_READY':
          // Iframe is ready and listening
          this.handleIframeReady(source, origin, data);
          break;
          
        default:
          // Not an auth message, ignore
          break;
      }
    },
    
    handleAuthRequest: function(source, origin, data) {
      const requestId = data.requestId || generateUUID();
      const iframeId = data.iframeId || 'unknown';
      
      if (this.config.debug) {
        if (window.DEBUG_MODE) console.log('[AuthBridge] Auth request from:', origin, 'iframe:', iframeId);
      }
      
      // Get current auth state
      const authState = {
        type: 'AUTH_RESPONSE',
        requestId: requestId,
        iframeId: iframeId,
        authenticated: AuthCore.isAuthenticated(),
        userId: AuthCore.userId(),
        sessionId: AuthCore.sessionId(),
        user: AuthCore.getUser(),
        timestamp: Date.now(),
        expiresAt: Date.now() + this.config.tokenExpiry
      };
      
      // Register connection
      this.connections.set(requestId, {
        source: source,
        origin: origin,
        iframeId: iframeId,
        connectedAt: Date.now(),
        lastPing: Date.now()
      });
      
      // Send response
      try {
        source.postMessage(authState, origin);
        
        if (this.config.debug) {
          if (window.DEBUG_MODE) console.log('[AuthBridge] Auth sent to:', origin, 'authenticated:', authState.authenticated);
        }
      } catch(e) {
        console.error('[AuthBridge] Failed to send auth:', e);
      }
    },
    
    handleAuthRefresh: function(source, origin, data) {
      const requestId = data.requestId;
      
      // Refresh parent auth first
      AuthCore.refresh().then(() => {
        this.handleAuthRequest(source, origin, { 
          requestId: requestId,
          iframeId: data.iframeId 
        });
      });
    },
    
    handleAuthValidate: function(source, origin, data) {
      // Validate a token/session
      const isValid = AuthCore.isAuthenticated() && 
                      data.sessionId === AuthCore.sessionId();
      
      source.postMessage({
        type: 'AUTH_VALIDATE_RESPONSE',
        requestId: data.requestId,
        valid: isValid,
        timestamp: Date.now()
      }, origin);
    },
    
    handleIframeReady: function(source, origin, data) {
      // Iframe signals it's ready
      if (this.config.debug) {
        if (window.DEBUG_MODE) console.log('[AuthBridge] Iframe ready:', data.iframeId, 'from:', origin);
      }
      
      // Send current auth state immediately
      this.handleAuthRequest(source, origin, {
        requestId: data.requestId || generateUUID(),
        iframeId: data.iframeId
      });
    },
    
    broadcast: function(message) {
      this.connections.forEach((conn, requestId) => {
        try {
          // Check if connection is stale (no ping for 5 minutes)
          if (Date.now() - conn.lastPing > 5 * 60 * 1000) {
            this.connections.delete(requestId);
            return;
          }
          
          conn.source.postMessage(message, conn.origin);
        } catch(e) {
          // Remove dead connections
          this.connections.delete(requestId);
        }
      });
    },
    
    notifyChange: function() {
      this.broadcast({
        type: 'AUTH_CHANGED',
        authenticated: AuthCore.isAuthenticated(),
        userId: AuthCore.userId(),
        sessionId: AuthCore.sessionId(),
        user: AuthCore.getUser(),
        timestamp: Date.now()
      });
    },
    
    // Cleanup stale connections periodically
    startCleanup: function() {
      setInterval(() => {
        const now = Date.now();
        this.connections.forEach((conn, id) => {
          if (now - conn.lastPing > 10 * 60 * 1000) { // 10 minutes
            this.connections.delete(id);
          }
        });
      }, 60000); // Every minute
    }
  };

   // Initialize bridge in parent window
   if (window.self === window.top) {
     AuthBridge.init();
     AuthBridge.startCleanup();
     window.AuthBridge = AuthBridge;
   }

   // 🔧 FIX: Send initialization data to iframes (SafeCode, etc.)
   window.sendInitToIframe = function() {
     console.log('[AuthCore] Sending init data to iframes');
     
     // Send auth state
     const authState = {
       type: 'AUTH_SYNC',
       authenticated: AuthCore.isAuthenticated(),
       userId: AuthCore.userId(),
       sessionId: AuthCore.sessionId(),
       user: AuthCore.getUser()
     };
     
     // Broadcast to all iframes via AuthBridge
     if (window.AuthBridge) {
       window.AuthBridge.broadcast(authState);
     }
     
     // Also send assets if available
     if (window.AppState && window.AppState.assets) {
       const assetsMsg = {
         type: 'parent:assets-init',
         assets: window.AppState.assets,
         user: window.AppState.user
       };
       
       if (window.AuthBridge) {
         window.AuthBridge.broadcast(assetsMsg);
       }
     }
   };

   // ============================================
   // SECTION 6: GLOBAL PROMISE & INIT
   // ============================================

   window.authReadyPromise = new Promise((resolve) => {
     window.__resolveAuthReady = resolve;
   });

   // Initialize AuthCore
   try { 
     AuthCore.init();
   } catch(_){}
 })();