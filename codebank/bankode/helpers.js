// ESM Helper module for AuthCore initialization
/**
 * Wait for AuthCore to be ready
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} - Resolved with AuthCore instance
 */
export async function waitForAuthCore(timeout = 5000) {
  if (window.AuthCore && typeof window.AuthCore.checkAuth === 'function') {
    return window.AuthCore;
  }

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.AuthCore && typeof window.AuthCore.checkAuth === 'function') {
        clearInterval(interval);
        resolve(window.AuthCore);
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error('AuthCore not initialized within timeout'));
      }
    }, 50);
  });
}

/**
 * Wait for DOM to be ready
 * @returns {Promise<void>}
 */
export function waitForDOM() {
  return new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    } else {
      resolve();
    }
  });
}

/**
 * Wait for both AuthCore and DOM to be ready
 * @param {number} timeout - AuthCore timeout in milliseconds
 * @returns {Promise<Object>} - AuthCore instance
 */
export async function waitForAuthCoreAndDOM(timeout = 5000) {
  await waitForAuthCore(timeout);
  await waitForDOM();
  return window.AuthCore;
}

// Auth helper functions - DELEGATE TO AUTHCORE
export async function checkAuth() {
  try {
    const authCore = await waitForAuthCoreAndDOM();
    if (!authCore) {
      console.error('AuthCore not available');
      return null;
    }
    
    const result = await authCore.checkAuth();
    if (!result || !result.user) {
      console.log('No active session found');
      return null;
    }
    
    console.log('Auth session restored:', result.user.id);
    return result.user;
  } catch (error) {
    console.error('Auth check failed:', error);
    return null;
  }
}

export async function login(username, password) {
  try {
    const authCore = await waitForAuthCoreAndDOM();
    if (!authCore) {
      throw new Error('AuthCore not available');
    }
    
    const result = await authCore.login(username, password);
    
    if (!result.success) {
      console.error('Login failed:', result.error);
      return { success: false, error: result.error };
    }
    
    console.log('Login successful:', result.user.id);
    return { success: true, user: result.user, session: result.session };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

export async function signup(username, password, email = null) {
  try {
    const authCore = await waitForAuthCoreAndDOM();
    if (!authCore) {
      throw new Error('AuthCore not available');
    }
    
    const result = await authCore.signup(username, password, email);
    
    if (!result.success) {
      console.error('Signup failed:', result.error);
      return { success: false, error: result.error };
    }
    
    console.log('Signup successful:', result.user.id);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: error.message };
  }
}

export async function logout() {
  try {
    const authCore = await waitForAuthCoreAndDOM();
    if (!authCore) {
      throw new Error('AuthCore not available');
    }
    
    const result = await authCore.logout();
    
    if (!result.success) {
      console.error('Logout failed:', result.error);
      return { success: false, error: result.error };
    }
    
    console.log('Logout successful');
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
}

// Backward compatibility aliases - DEPRECATED
export async function waitForSupabase(timeout = 5000) {
  console.warn('[Helpers] waitForSupabase deprecated, use waitForAuthCore');
  return waitForAuthCore(timeout);
}

export async function waitForSupabaseAndDOM(timeout = 5000) {
  console.warn('[Helpers] waitForSupabaseAndDOM deprecated, use waitForAuthCoreAndDOM');
  return waitForAuthCoreAndDOM(timeout);
}