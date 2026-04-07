/**
 * jwt-auth.js
 * Admin session token manager (localStorage-backed)
 */

const TOKEN_KEY = 'bankode_admin_token';

export function getAdminToken() {
  if (window.__ADMIN_JWT__) return window.__ADMIN_JWT__;
  try { return localStorage.getItem(TOKEN_KEY) || null; } catch { return null; }
}

export function setAdminToken(token) {
  window.__ADMIN_JWT__ = token;
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}

export function logoutUser() {
  window.__ADMIN_JWT__ = null;
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

/** Read a cookie by name (for CSRF) */
export function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}
