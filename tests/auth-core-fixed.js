;(function(){
  if (typeof window !== 'undefined') {
    if (window.__AUTH_CORE_LOADED__) { try { console.error('[AuthCore] Duplicate load detected. Skipping initialization.'); } catch(_){}; return; }
    window.__AUTH_CORE_LOADED__ = true;
  }
  function getCookie(name){
    try {
      const m = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]+)'));
      return m ? decodeURIComponent(m[2]) : null;
    } catch(_) { return null }
  }

  if (window.__authCoreLoaded) return;
  window.__authCoreLoaded = true;

  // 🛡️ Global Auth Ready Promise
  window.authReadyPromise = new Promise((resolve) => {
    window.__resolveAuthReady = resolve;
  });

  const AuthCore = {
    _authenticated: false,
    _userId: null,
    _sessionId: null,
    _state: { authenticated: false, userId: null, sessionId: null },
    _locked: false,
    _lastPayloadUser: null,

    // FIX: Sync __AUTH_STATE__ with internal state
    _syncAuthState(){
      window.__AUTH_STATE__ = {
        authenticated: this._authenticated,
        userId: this._userId,
        sessionId: this._sessionId
      };
      // Also update the legacy flag
      window.__AUTH_READY__ = this._authenticated;
      window.authReady = this._authenticated;
    },

    _setState(nextAuth, nextUser){
      // Support object payload
      if (nextAuth && typeof nextAuth === 'object') {
        const nextAuthenticated = !!nextAuth.authenticated;
        const nextUserId = nextAuth.userId || null;
        const nextSessionId = nextAuth.sessionId || this._sessionId;
        this._authenticated = nextAuthenticated;
        this._userId = nextUserId;
        this._sessionId = nextSessionId;
        this._state = { authenticated: this._authenticated, userId: this._userId, sessionId: this._sessionId };
        
        // FIX: Sync to global __AUTH_STATE__
        this._syncAuthState();
        
        if (this._authenticated) {
          window.__resolveAuthReady(true);
        }
        return;
      }
      if (this._locked && nextAuth === false) { return; }
      if (this._locked) { return; }
      if (this._lastPayloadUser && nextAuth === false) { return; }
      this._authenticated = !!nextAuth;
      this._userId = nextUser || null;
      this._state = { authenticated: this._authenticated, userId: this._userId, sessionId: this._sessionId };
      
      // FIX: Sync to global __AUTH_STATE__
      this._syncAuthState();
      
      if (this._authenticated) {
        window.__resolveAuthReady(true);
      }
    },

    async _fetchMeAndApply(){
      try {
        const r = await fetch('/api/auth/me', { credentials: 'include' });
        let payload = null;
        if (r && r.ok) { try { payload = await r.json(); } catch(_) { payload = null } }
        const u = payload && payload.user || null;
        this._lastPayloadUser = u && u.id || null;
        this._sessionId = (u && u.sessionId) || (payload && payload.sessionId) || this._sessionId;
        if (u && u.id) {
          this._setState({ authenticated: true, userId: u.id, sessionId: u.sessionId || this._sessionId });
        } else {
          this._setState(false, null);
          // 🛡️ Resolve promise as false to unblock fetch queue if auth fails
          window.__resolveAuthReady(false);
        }
        if (this._authenticated) { try { Object.freeze(this._state); } catch(_){}; this._locked = true; }
      } catch(_) {
        this._setState(false, null);
        window.__resolveAuthReady(false);
      }
      // FIX: Always sync state after fetch
      this._syncAuthState();
      try { window.dispatchEvent(new CustomEvent('auth:ready', { detail: { authenticated: this._authenticated, userId: this._userId || null, sessionId: this._sessionId || null } })) } catch(_){}
      try { 
        window.authReady = this._authenticated; 
        window.__AUTH_READY__ = this._authenticated;
      } catch(_){}
    },

    async init(){
      try {
        // 🛡️ Singleton guard for init
        if (window.__AUTH_INIT_DONE__) return;
        window.__AUTH_INIT_DONE__ = true;

        // 🛡️ PARENT MESSAGE HANDLER: Respond to auth requests from iframes
        if (window.self === window.top) {
          window.addEventListener('message', (e) => {
            if (e.data?.type === 'REQ_AUTH') {
              console.log('[AuthCore] Responding to REQ_AUTH from iframe');
              e.source.postMessage({
                type: 'AUTH_STATE',
                payload: {
                  authenticated: this._authenticated,
                  userId: this._userId,
                  sessionId: this._sessionId,
                  user: { id: this._userId }
                }
              }, e.origin);
            }
          });
        }

        // 🛡️ IFRAME AUTH INHERITANCE: If inside iframe and parent has Auth, skip local init
        if (window.self !== window.top) {
          // Listen for cross-origin messages as fallback
          window.addEventListener('message', (e) => {
            if (e.data?.type === 'AUTH_STATE') {
              console.log('[AuthCore] Received AUTH_STATE from parent via message');
              const { authenticated, userId, sessionId } = e.data.payload;
              this._setState({ authenticated, userId, sessionId });
              this._syncAuthState();
              window.__resolveAuthReady(this._authenticated);
              try { window.dispatchEvent(new CustomEvent('auth:ready', { detail: { authenticated, userId, sessionId } })) } catch(_){}
            }
          });
          
          // Request auth from parent immediately
          try {
            window.parent.postMessage({ type: 'REQ_AUTH' }, '*');
          } catch (e) {}

          try {
            if (window.top && window.top.Auth && typeof window.top.Auth.isAuthenticated === 'function') {
              console.log('[AuthCore] Iframe detected parent Auth, inheriting state');
              const parentAuth = window.top.Auth;
              this._setState(parentAuth.isAuthenticated(), parentAuth.getUser()?.id);
              this._syncAuthState();
              window.__resolveAuthReady(this._authenticated);
              try { window.dispatchEvent(new CustomEvent('auth:ready', { detail: { authenticated: this._authenticated, userId: this._userId || null, sessionId: this._sessionId || null } })) } catch(_){}
              
              // Listen for changes from parent
              parentAuth.onChange((state) => {
                this._setState(state.authenticated, state.userId);
                this._syncAuthState();
              });
              return;
            }
          } catch (e) {
            console.warn('[AuthCore] Failed to access parent Auth directly (likely cross-origin). Falling back to postMessage.');
          }
        }

        const isCodeBank = (typeof location!=='undefined' && location.pathname && location.pathname.startsWith('/codebank/')) || (document && document.baseURI && document.baseURI.indexOf('/services/yt-clear/codebank/')!==-1);
        const disableFetch = !!(typeof window!=='undefined' && window.__DISABLE_AUTH_FETCH__===true);
        this._sessionId = getCookie('session_token');
        if ((isCodeBank || disableFetch) && !this._sessionId) {
          this._setState(false, null);
          window.__resolveAuthReady(false);
          // FIX: Sync state even when skipping fetch
          this._syncAuthState();
          try { window.dispatchEvent(new CustomEvent('auth:ready', { detail: { authenticated: this._authenticated, userId: this._userId || null, sessionId: this._sessionId || null } })) } catch(_){}
          return;
        }
        if (!this._sessionId) {
          this._setState(false, null);
          window.__resolveAuthReady(false);
          // FIX: Sync state even when no session
          this._syncAuthState();
          try { window.dispatchEvent(new CustomEvent('auth:ready', { detail: { authenticated: this._authenticated, userId: this._userId || null, sessionId: this._sessionId || null } })) } catch(_){}
          return;
        }
        await this._fetchMeAndApply();
      } catch(_) {
        this._setState(false, null);
        // FIX: Sync state even on error
        this._syncAuthState();
      }
    },

    isAuthenticated(){ return !!this._authenticated },
    userId(){ return this._userId || null },
    sessionId(){ return this._sessionId || null },

    async refresh(){
      try { console.log('[AuthCore] refresh() start'); } catch(_){}
      if (this._locked) { try { console.log('[AuthCore] refresh() skipped: state locked'); } catch(_){}; return; }
      const before = this._authenticated;
      await this._fetchMeAndApply();
      try { console.log('[AuthCore] refresh() done', { from: !!before, to: !!this._authenticated }); } catch(_){}
      if (before !== this._authenticated) {
        try { console.log('[AuthCore] auth:changed →', { authenticated: !!this._authenticated, userId: this._userId }); } catch(_){}
        try { window.dispatchEvent(new CustomEvent('auth:changed', { detail: { authenticated: this._authenticated, userId: this._userId || null, sessionId: this._sessionId || null } })) } catch(_){}
      }
    },

    // FIX: Add waitForAuth helper for async code
    async waitForAuth(timeout = 10000){
      if (this._authenticated) return true;
      return new Promise((resolve) => {
        const check = () => {
          if (this._authenticated) {
            resolve(true);
            return;
          }
          // Also check __AUTH_STATE__
          if (window.__AUTH_STATE__?.authenticated) {
            resolve(true);
            return;
          }
        };
        check();
        const interval = setInterval(check, 100);
        setTimeout(() => {
          clearInterval(interval);
          resolve(false);
        }, timeout);
      });
    }
  };

  try { 
    if (window.self === window.top) {
      window.Auth = {
        isAuthenticated: () => AuthCore.isAuthenticated(),
        getUser: () => ({ id: AuthCore.userId() }),
        getToken: () => AuthCore.sessionId(),
        onChange: (cb) => {
          window.addEventListener('auth:changed', (e) => cb(e.detail));
        }
      };
      console.log("✅ Global Auth exposed (Parent)");
    } else {
      window.Auth = AuthCore;
    }
  } catch(_) {
    window.Auth = AuthCore;
  }
  try { AuthCore.init() } catch(_){}
})();
