export async function getWallet(userId, sessionId){
  try{
    const c = (typeof window!=='undefined' && window.supabase) || null;
    if(!c){ const w={ codes_temp:[], codes_expired:[], bars_silver:0, bars_gold:0, balances_negative:0 }; console.log('[WALLET][NEON] loaded for ' + userId + ':' + sessionId); return w }
    const { data, error } = await c.from('wallets').select('*').eq('user_id', userId).eq('session_id', sessionId).limit(1);
    if(error){ return { codes_temp:[], codes_expired:[], bars_silver:0, bars_gold:0, balances_negative:0 } }
    const row = Array.isArray(data) && data[0] ? data[0] : null;
    const w = row ? {
      codes_temp: Array.isArray(row.codes_temp)?row.codes_temp:[],
      codes_expired: Array.isArray(row.codes_expired)?row.codes_expired:[],
      bars_silver: typeof row.silver==='number'?row.silver:0,
      bars_gold: typeof row.gold==='number'?row.gold:0,
      balances_negative: typeof row.balances_negative==='number'?row.balances_negative:0
    } : { codes_temp:[], codes_expired:[], bars_silver:0, bars_gold:0, balances_negative:0 };
    console.log('[WALLET][NEON] loaded for ' + userId + ':' + sessionId);
    return w;
  }catch(_){
    return { codes_temp:[], codes_expired:[], bars_silver:0, bars_gold:0, balances_negative:0 }
  }
}

export async function saveWallet(userId, sessionId, walletState){
  try{
    const online = (typeof navigator!=='undefined' && navigator.onLine===true);
    if(!online){ console.log('[WALLET] offline — changes cached only'); return false }
    const c = (typeof window!=='undefined' && window.supabase) || null;
    if(!c){ return false }
    const codesTempCount = Array.isArray(walletState.codes_temp) ? walletState.codes_temp.reduce((a,e)=>a + (typeof e.count==='number'?e.count:0),0) : 0;
    const payload = {
      user_id: userId,
      session_id: sessionId,
      gold: typeof walletState.bars_gold==='number'?walletState.bars_gold:0,
      silver: typeof walletState.bars_silver==='number'?walletState.bars_silver:0,
      codes_generated: codesTempCount,
      updated_at: new Date().toISOString()
    };
    const { error } = await c.from('wallets').upsert(payload, { onConflict: 'user_id,session_id' });
    if(error){ return false }
    console.log('[WALLET][NEON] persisted update');
    return true;
  }catch(_){ return false }
}
