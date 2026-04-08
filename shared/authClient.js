let listeners = new Set();
let _session = null;

async function post(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
    credentials: 'include'
  });
  if (!r.ok) throw new Error('auth');
  return r.json();
}

export async function register(email, password, fullName) {
  const res = await post('/api/auth/register', { email, password, fullName });
  await emit();
  return res;
}

async function emit() {
  try {
    _session = await getSession();
  } catch (_) {
    _session = null;
  }
  listeners.forEach(fn => {
    try { fn(_session); } catch (_) {}
  });
}

export async function login(email, password) {
  const res = await post('/api/auth/login', { email, password });
  await emit();
  return res;
}

export async function logout() {
  const res = await post('/api/auth/logout');
  await emit();
  return res;
}

export async function refresh() {
  const res = await post('/api/auth/refresh');
  await emit();
  return res;
}

export async function getSession() {
  const r = await fetch('/api/auth/session', { credentials: 'include' });
  if (!r.ok) return null;
  return r.json();
}

export const signIn = login;
export const signOut = logout;

export function onAuthStateChange(callback) {
  listeners.add(callback);
  Promise.resolve().then(emit);
  return () => listeners.delete(callback);
}
