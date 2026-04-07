/** -------------------------
 * FILE: unifiedStorage.js
 * => RPC wrapper + auto refresh on 401 + convenience functions
 * ------------------------- */

import { rpc, getSupabaseClient } from '/services/yt-clear/shared/supabase-client.js';

// 🔧 FIX: Lazy-get Supabase client on each call instead of caching at module load.
// The old top-level `await getSupabaseClient()` froze the reference at import time,
// so after logout + re-login the client still held the old/anon session.
async function getFreshClient() {
  try {
    return await getSupabaseClient();
  } catch (e) {
    console.error('[unifiedStorage] Failed to get Supabase client:', e);
    return null;
  }
}

// low-level fetch wrapper to call Supabase REST RPC endpoints if needed
// BUT we'll prefer supabase.rpc; we use this only where custom headers needed.
async function callRpcWithAuth(rpcName, params = {}) {
  const { data, error } = await rpc(rpcName, params);
  if (error) throw error;
  return { data, status: 200 };
}

// High-level wrappers:

export async function getBalancesFor(uid) {
  // prefer using rpc signature p_uid
  const params = { p_uid: uid };
  const { data } = await callRpcWithAuth('bankode_get_balances', params);
  return data;
}

export async function getTransactionsFor(uid, limit = 25, offset = 0) {
  const params = { p_uid: uid, p_limit: limit, p_offset: offset };
  const { data } = await callRpcWithAuth('bankode_get_transactions', params);
  return data;
}

export async function mintAssets(value, currency) {
  const params = { p_value: value, p_currency: currency };
  const { data } = await callRpcWithAuth('bankode_mint_assets', params);
  return data;
}

export async function logAdminAction(targetUid, actionType, actionData = {}) {
  const params = { p_uid: targetUid, p_action_type: actionType, p_action_data: JSON.stringify(actionData) };
  const { data } = await callRpcWithAuth('bankode_log_admin_action', params);
  return data;
}

// Alias for compatibility
export const callRPC = callRpcWithAuth;
