import { callRPC } from './unifiedStorage.js';

export const getAllUsers = async () => await callRPC('bankode_get_all_users');

export const getUserBalances = async (userId) => {
  // 🛡️ SYNC FIX: Prefer AssetBus state if available for real-time sync
  if (window.AssetBus && typeof window.AssetBus.getState === 'function') {
    const state = window.AssetBus.getState();
    if (state && (state.codes_count !== undefined || state.codes?.length !== undefined)) {
      console.log('[Dashboard] Syncing with AssetBus state');
      return {
        codes: state.codes_count !== undefined ? state.codes_count : (state.codes?.length || 0),
        silver: state.silver_count !== undefined ? state.silver_count : (state.silver?.length || 0),
        gold: state.gold_count !== undefined ? state.gold_count : (state.gold?.length || 0)
      };
    }
  }

  // 🛡️ Also check AppState.assets from assets-direct.js
  if (window.AppState && window.AppState.assets) {
    const assets = window.AppState.assets;
    console.log('[Dashboard] Syncing with AppState.assets:', assets);
    return {
      codes: Array.isArray(assets.codes) ? assets.codes.length : (assets.codes_count || 0),
      silver: Array.isArray(assets.silver) ? assets.silver.length : (assets.silver_count || 0),
      gold: Array.isArray(assets.gold) ? assets.gold.length : (assets.gold_count || 0)
    };
  }

  const data = await callRPC('bankode_get_balances', { p_user_id: userId });
  const norm = (obj) => {
    const out = { codes: 0, silver: 0, gold: 0 };
    if (!obj) return out;
    if (typeof obj.codes === 'number') out.codes = obj.codes;
    if (typeof obj.silver === 'number') out.silver = obj.silver;
    if (typeof obj.gold === 'number') out.gold = obj.gold;
    if (Array.isArray(obj) && obj.length) {
      for (const k of ['codes', 'silver', 'gold']) {
        if (typeof obj[0][k] === 'number') out[k] = obj[0][k];
      }
    }
    return out;
  };
  return norm(data);
};

export const getUserTransactions = async (userId, limit = 50, offset = 0) => {
  const data = await callRPC('bankode_get_transactions', { p_user_id: userId, p_limit: limit, p_offset: offset });
  return Array.isArray(data) ? data : (data?.data || []);
};

export const mintAssets = async (value, currency) => {
  if (typeof value !== 'number' || value <= 0) throw new Error('Invalid value');
  const cur = String(currency || '').toLowerCase();
  if (!['codes', 'silver', 'gold'].includes(cur)) throw new Error('Invalid currency');
  return await callRPC('bankode_mint_assets', { p_value: value, p_currency: cur });
};

export const logAdminAction = async (targetUserId, actionType, actionData) => {
  if (!targetUserId) throw new Error('Missing targetUserId');
  if (!actionType) throw new Error('Missing actionType');
  const payload = typeof actionData === 'string' ? actionData : JSON.stringify(actionData || {});
  return await callRPC('bankode_log_admin_action', { p_target_user_id: targetUserId, p_action_type: actionType, p_action_data: payload });
};

// New: Send assets to user by email (admin function)
export const sendAssetsByEmail = async (email, assetType, amount) => {
  const res = await fetch('/api/admin/send-by-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAdminToken()}`,
      'x-csrf-token': getCookie('XSRF-TOKEN')
    },
    body: JSON.stringify({ email, assetType, amount }),
    credentials: 'include'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Failed to send assets');
  return data;
};

function getAdminToken() {
  return localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
}

function getCookie(name) {
  const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return v ? v[2] : null;
}

export const getAdminOverview = async () => {
  const [usersCount, txCount, minted] = await Promise.all([
    callRPC('bankode_admin_users_count'),
    callRPC('bankode_admin_transactions_count'),
    callRPC('bankode_admin_minted_summary')
  ]);
  return { usersCount, txCount, minted };
};