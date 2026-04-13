/**
 * LOGIN-HELPER.js - Include in login.html
 * 
 * Provides the setAuthSession() function to call after successful login.
 * This sets up AUTH_GLOBAL, localStorage, cookie, then redirects.
 * 
 * USAGE in login.html after verifying credentials:
 *   setAuthSession({
 *     userId: user.id,
 *     email: user.email
 *   }, jwtToken);
 */

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Call this after successful authentication.
 * @param {Object} userData - { userId, email, permissions? }
 * @param {string} jwt - JWT token from server
 * @param {string} [redirectTo] - Where to go after login (default: /indexCB.html)
 */
function setAuthSession(userData, jwt, redirectTo) {
  var session = {
    userId: userData.userId,
    email: userData.email,
    sessionId: generateUUID(),
    authenticated: true,
    timestamp: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    permissions: userData.permissions || ['read', 'write']
  };

  // 1. localStorage (for persistence across reloads)
  localStorage.setItem('codebank_session', JSON.stringify(session));

  // 2. Cookie (for server API calls)
  if (jwt) {
    document.cookie = 'cb_token=' + encodeURIComponent(jwt) +
      '; path=/; max-age=86400; SameSite=Strict';
  }

  // 3. Global (for current page, will be picked up by auth-global.js)
  window.AUTH_GLOBAL = session;

  // 4. Redirect
  window.location.href = redirectTo || '/indexCB.html';
}
