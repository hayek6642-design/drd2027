import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const getParentAuth = () => {
      if (window.parent !== window) {
        console.log('[E7ki] Requesting auth from parent...');

        // Check if window.Auth is already injected by auth-proxy.js
        if (window.Auth && window.Auth.isAuthenticated()) {
          console.log('[E7ki] window.Auth already available, using parent auth');
          const userData = {
            id: window.Auth.getUser()?.id,
            username: window.Auth.getUser()?.id,
            token: window.Auth.getToken()
          };
          setUser(userData);
          localStorage.setItem('jwt_token', userData.token);
          localStorage.setItem('auth_mode', 'parent');
          setLoading(false);
          return;
        }

        window.parent.postMessage({ type: 'e7ki:request-auth' }, '*');
      } else {
        // Dev/standalone mode: check for existing token in localStorage
        const token = localStorage.getItem('jwt_token');
        if (token) {
          try {
            const parts = token.split('.');
            const payload = JSON.parse(
              atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
            );
            setUser({
              id: payload.userId || payload.sub,
              username: payload.username || payload.email,
              token: token
            });
            localStorage.setItem('auth_mode', 'standalone');
            setLoading(false);
            return;
          } catch (e) {
            console.error('[E7ki] Local token parse failed', e);
            localStorage.removeItem('jwt_token');
          }
        }
        setLoading(false);
      }
    };

    const handleMessage = (e) => {
      if (
        e.data?.type === 'auth:ready' ||
        e.data?.type === 'e7ki:auth' ||
        (e.data?.authenticated && e.data?.userId)
      ) {
        console.log('[E7ki] Received auth from parent');
        const authData = e.data.auth || e.data;

        // Validate required fields
        if (!authData.token || !(authData.userId || authData.id)) {
          // Fallback to window.Auth if available
          if (window.Auth && window.Auth.isAuthenticated()) {
            const userData = {
              id: window.Auth.getUser()?.id,
              username: window.Auth.getUser()?.id,
              token: window.Auth.getToken()
            };
            setUser(userData);
            localStorage.setItem('jwt_token', userData.token);
            localStorage.setItem('auth_mode', 'parent');
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
        localStorage.setItem('auth_mode', 'parent');
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    getParentAuth();

    // Timeout: Give parent 10 seconds to respond, then allow standalone mode
    const timeout = setTimeout(() => {
      if (loading && !user) {
        if (window.Auth && window.Auth.isAuthenticated()) {
          console.log('[E7ki] Final timeout check: window.Auth found');
          const userData = {
            id: window.Auth.getUser()?.id,
            username: window.Auth.getUser()?.id,
            token: window.Auth.getToken()
          };
          setUser(userData);
          localStorage.setItem('jwt_token', userData.token);
          localStorage.setItem('auth_mode', 'parent');
          setLoading(false);
          return;
        }
        // Allow standalone mode - don't show error
        console.log('[E7ki] No parent auth, allowing standalone mode');
        setLoading(false);
      }
    }, 10000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, [loading, user]);

  // Login function for standalone mode
  const login = async (email, password) => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();

      setUser({
        id: data.userId,
        username: data.email,
        token: data.token
      });

      localStorage.setItem('jwt_token', data.token);
      localStorage.setItem('auth_mode', 'standalone');
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Register function for standalone mode
  const register = async (email, password, displayName) => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      const data = await response.json();

      setUser({
        id: data.userId,
        username: data.email,
        token: data.token
      });

      localStorage.setItem('jwt_token', data.token);
      localStorage.setItem('auth_mode', 'standalone');
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('auth_mode');
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#000',
          color: '#00d4ff',
          fontSize: '18px'
        }}
      >
        Connecting to E7ki...
      </div>
    );
  }

  if (error && !user) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#000',
          color: '#ff6b6b',
          padding: '20px',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</div>
        <h2>Authentication Error</h2>
        <p>{error}</p>
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
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        getAuthHeaders,
        isLoading: loading,
        isAuthenticating,
        error
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
