import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get auth from parent CodeBank window
    const getParentAuth = () => {
      if (window.parent !== window) {
        console.log('[E7ki] Requesting auth from parent...');
        
        // Immediate check if window.Auth is already injected by auth-proxy.js
        if (window.Auth && window.Auth.isAuthenticated()) {
           console.log('[E7ki] window.Auth already available, skipping message request');
           const userData = {
              id: window.Auth.getUser()?.id,
              username: window.Auth.getUser()?.id,
              token: window.Auth.getToken()
           };
           setUser(userData);
           localStorage.setItem('jwt_token', userData.token);
           setLoading(false);
           return;
        }
        
        window.parent.postMessage({ type: 'e7ki:request-auth' }, '*');
      } else {
        // Dev mode: check for existing token in localStorage
        const token = localStorage.getItem('jwt_token');
        if (token) {
          try {
            const parts = token.split('.');
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            setUser({
              id: payload.userId || payload.sub,
              username: payload.username || payload.email,
              token: token
            });
            setLoading(false);
            return;
          } catch (e) {
            console.error('[E7ki] Local token parse failed', e);
          }
        }
        setLoading(false);
      }
    };

    const handleMessage = (e) => {
      if (e.data?.type === 'auth:ready' || e.data?.type === 'e7ki:auth' || (e.data?.authenticated && e.data?.userId)) {
        console.log('[E7ki] Received auth from parent');
        const authData = e.data.auth || e.data;
        
        // Validate required fields
        if (!authData.token || !(authData.userId || authData.id)) {
          // Check for window.Auth as fallback
          if (window.Auth && window.Auth.isAuthenticated()) {
             const userData = {
                id: window.Auth.getUser()?.id,
                username: window.Auth.getUser()?.id,
                token: window.Auth.getToken()
             };
             setUser(userData);
             localStorage.setItem('jwt_token', userData.token);
             setLoading(false);
             return;
          }
          setError('Invalid authentication data from parent');
          setLoading(false);
          return;
        }
        
        const userData = {
          id: authData.userId || authData.id,
          username: authData.username || authData.name,
          token: authData.token
        };
        
        setUser(userData);
        localStorage.setItem('jwt_token', authData.token);
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    getParentAuth();

    // Timeout fallback
    const timeout = setTimeout(() => {
      if (loading && !user) {
        // One last check for window.Auth before giving up
        if (window.Auth && window.Auth.isAuthenticated()) {
           console.log('[E7ki] Final timeout check: window.Auth found');
           const userData = {
              id: window.Auth.getUser()?.id,
              username: window.Auth.getUser()?.id,
              token: window.Auth.getToken()
           };
           setUser(userData);
           localStorage.setItem('jwt_token', userData.token);
           setLoading(false);
           return;
        }
        setError('Authentication timeout - parent did not respond');
        setLoading(false);
      }
    }, 10000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, [loading, user]);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('jwt_token');
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'e7ki:logout' }, '*');
    }
  };

  const getAuthHeaders = () => {
    const token = user?.token || localStorage.getItem('jwt_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0f0f0f',
        color: '#00d4ff',
        fontFamily: 'system-ui'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid rgba(0, 212, 255, 0.1)', 
            borderTopColor: '#00d4ff', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div>Connecting to E7ki...</div>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0f0f0f',
        color: '#ff6b6b',
        fontFamily: 'system-ui',
        gap: '20px',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div style={{ fontSize: '40px' }}>⚠️</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Authentication Error</div>
        <div style={{ color: '#888' }}>{error}</div>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            background: '#00d4ff',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            marginTop: '10px'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, logout, isAuthenticated: !!user, getAuthHeaders }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
