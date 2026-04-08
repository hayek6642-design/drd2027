/**
 * wrapper.mjs
 * ✅ Comprehensive Supabase v2 client and Bankode authentication wrapper
 */

import { getSupabaseClient, rpc, auth } from '/services/yt-clear/shared/supabase-client.js'

await getSupabaseClient()

// -----------------------------
// JWT-based RPC functions
// -----------------------------

export async function signupUser(fullName, email, password) {
  const { data, error } = await rpc('bankode_register_user', {
    p_full_name: fullName,
    p_email: email,
    p_password: password
  });
  if (error) throw error;
  return data;
}

export async function loginUser(email, password) {
  const { data, error } = await rpc('bankode_login_user', {
    p_email: email,
    p_password: password
  });
  if (error) throw error;
  return data;
}

export async function logoutUser() {
  const a = await auth();
  const { error } = await a.signOut();
  if (error) throw error;
  return { success: true };
}

export async function getCurrentUser() {
  const a = await auth();
  const { data: { user }, error } = await a.getUser();
  if (error) throw error;
  return user;
}

export async function resetPassword(email) {
  const a = await auth();
  const { error } = await a.resetPasswordForEmail(email);
  if (error) throw error;
  return { success: true };
}

// -----------------------------
// Session helpers
// -----------------------------

export async function getSession() {
  const a = await auth();
  const { data: { session }, error } = await a.getSession();
  if (error) throw error;
  return session;
}

// -----------------------------
// Bankode RPC wrappers
// -----------------------------

export async function getBalances(userId) {
  const { data, error } = await rpc('bankode_get_balances', { p_uid: userId });
  if (error) throw error;
  return data;
}

export async function getTransactions(userId, limit = 50, offset = 0) {
  const { data, error } = await rpc('bankode_get_transactions', {
    p_uid: userId,
    p_limit: limit,
    p_offset: offset
  });
  if (error) throw error;
  return data;
}

export async function refreshUserJWT(refreshToken) {
  const { data, error } = await rpc('bankode_refresh_user_jwt', { p_refresh: refreshToken });
  if (error) throw error;
  return data;
}

// -----------------------------
// Real-time subscriptions
// -----------------------------

export async function subscribeToTransactions(userId, callback) {
  const supabase = await getSupabaseClient();
  return supabase
    .channel('transactions')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'transactions',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe();
}

// -----------------------------
// Utility helpers
// -----------------------------

export async function isAuthenticated() {
  const session = await getSession();
  return session?.user ?? null;
}

export function onAuthStateChange(callback) {
  return (async()=>{ const a = await auth(); return a.onAuthStateChange(callback) })();
}

// -----------------------------
// Usage Example (async)
// -----------------------------
/*
(async () => {
  try {
    const signup = await signupUser('Ali Ahmed', 'ali@example.com', 'SecurePass123');
    console.log('Signup:', signup);

    const login = await loginUser('ali@example.com', 'SecurePass123');
    console.log('Login:', login);

    const session = await getSession();
    console.log('Current Session:', session);
  } catch (err) {
    console.error(err);
  }
})();
*/
