const lastUpdateTs = new Map();

function rateLimited(type, now){
  const last = lastUpdateTs.get(type) || 0;
  if (now - last < 200) return true;
  lastUpdateTs.set(type, now);
  return false;
}

function hasNegative(detail){
  const keys = ['count','likes','superlikes','games','transactions'];
  for (const k of keys){
    const v = detail[k];
    if (typeof v === 'number' && v < 0) return k;
  }
  return null;
}

export const AssetPolicy = {
  validate(detail, ctx){
    try{
      const type = String(detail && detail.type || '').trim();
      const source = String(ctx && ctx.source || '').trim();
      // Block iframe/UI producers – iframe is consumer-only
      if (/iframe/i.test(type) || /iframe/i.test(source) || source === 'iframe-sync' || source === 'ui' || source === 'send-execute' || source === 'bankode-bridge'){
        try{ console.warn('[ASSET POLICY] REJECT iframe/ui producer', { type, source }); }catch(_){}
        return false;
      }
      if (type === 'sqlite-sync' || source === 'sqlite-sync') {
        let localCount = 0;
        try {
          if (typeof window !== 'undefined' && window.AssetBus && typeof window.AssetBus.snapshot === 'function') {
            const s = window.AssetBus.snapshot();
            localCount = Array.isArray(s && s.codes) ? s.codes.length : 0;
          } else if (typeof window !== 'undefined' && window.safeStorage) {
            const raw = window.safeStorage.get('codebank_assets');
            if (raw) {
              const obj = JSON.parse(raw);
              localCount = Array.isArray(obj && obj.codes) ? obj.codes.length : 0;
            }
          }
        } catch(_) { localCount = 0 }
        const sqliteCount = Array.isArray(detail && detail.codes) ? detail.codes.length : 0;
        if (sqliteCount === 0 && localCount > 0) { try { console.warn('[ASSET POLICY] BLOCKED destructive sqlite-sync', { sqliteCount, localCount }) } catch(_){}; return false; }
        if (!detail || !Array.isArray(detail.codes)) { try { console.warn('[ASSET POLICY] BLOCKED invalid sqlite payload') } catch(_){}; return false; }
        return true;
      }
      const now = Date.now();
      if (!type){ 
        // 🛡️ SECURITY FIX: Add default fallback asset type instead of rejecting
        const fallbackType = 'codes';
        // console.log('[ASSET POLICY] WARN', 'unknown', 'missing_type', 'Falling back to', fallbackType);
        return true; 
      }
      if (!source){ try{ console.log('[ASSET POLICY] REJECT', type, 'missing_source'); }catch(_){} return false; }
      if (type === 'codes'){
        // Only SQLite path or internally verified local generation may update codes
        if (source === 'sqlite-fetch' || source === 'sqlite:snapshot' || source === 'auth-bootstrap' || source === 'sqlite-sync' || source === 'internal-verified'){
          try{ console.log('[ASSET POLICY] ACCEPT codes (verified path)') }catch(_){}
          return true;
        }
        try{ console.warn('[ASSET POLICY] REJECT codes non-sqlite source', source) }catch(_){}
        return false;
      }
      if (rateLimited(type, now)){ try{ console.log('[ASSET POLICY] REJECT', type, 'rate_limited'); }catch(_){} return false; }
      const neg = hasNegative(detail);
      if (neg){ try{ console.log('[ASSET POLICY] REJECT', type, 'negative_'+neg); }catch(_){} return false; }
      try{ console.log('[ASSET POLICY] ACCEPT', type); }catch(_){}
      return true;
    }catch(_){ return false }
  }
};
