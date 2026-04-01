// FILE: shared/logicode/logic-core.js
// -----------------------------
import * as Storage from './logic-storage.js';

export const CONFIG = {
  CODES_PER_SILVER: 100,
  CODES_PER_GOLD: 10000,
  CODE_EXPIRE_MS: 24 * 60 * 60 * 1000 // 24h
};

export function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

export function nowTs() { return Date.now(); }

export function setLocal(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(_){} }
export function getLocal(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch(_){ return null } }
export function removeLocal(key) { try { localStorage.removeItem(key); } catch(_){} }

export function isAuthenticated() {
  try { return !!(window.Auth && typeof window.Auth.isAuthenticated==='function' ? window.Auth.isAuthenticated() : false) } catch(_){ return false }
}
