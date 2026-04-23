(function(){
  // Asset Dashboard - simplified for SafeCode Library refactor
  // No counter rendering - only listens for balances updates
  let container = null;
  const last = { values: { likes: null, superlikes: null, games: null, transactions: null }, ts: { likes: 0, superlikes: 0, games: 0, transactions: 0 } };

  function ensureContainer(){
    if (container && container.isConnected) return container;
    container = document.getElementById('asset-dashboard');
    if (!container){
      const host = document.body;
      container = document.createElement('div');
      container.id = 'asset-dashboard';
      container.style.cssText = 'display:none;margin-top:8px;padding:6px 8px;border-radius:8px;background:rgba(0,0,0,0.35);color:#fff;font-size:12px;flex-direction:column;gap:4px;';
      host.appendChild(container);
    }
    return container;
  }

  function resetContainer(c){ try { c.innerHTML = ''; } catch(_){} }

  function render(){
    const c = ensureContainer();
    resetContainer(c);
    const rows = [];
    rows.push(`likes: ${last.values.likes ?? ''} \u2014 ts: ${last.ts.likes || ''}`);
    rows.push(`superlikes: ${last.values.superlikes ?? ''} \u2014 ts: ${last.ts.superlikes || ''}`);
    rows.push(`games: ${last.values.games ?? ''} \u2014 ts: ${last.ts.games || ''}`);
    c.innerHTML = rows.map(r => `<div>${r}</div>`).join('');
  }

  function applyUpdate(type, value, ts){
    if (value === null || value === undefined) return;
    if (typeof ts !== 'number') return;
    if (ts <= (last.ts[type] || 0) && value === last.values[type]) return;
    last.values[type] = value;
    last.ts[type] = ts;
    try { console.log('[ASSET DASHBOARD] render', type, value); } catch(_){}
    render();
  }

  window.addEventListener('assets:updated', function(e){
    const d = e && e.detail || {};
    const ts = typeof d.ts==='number' ? d.ts : Date.now();
    const type = String(d.type || 'unknown');
    if (type === 'likes') applyUpdate('likes', typeof d.likes==='number' ? d.likes : null, ts);
    if (type === 'superlikes') applyUpdate('superlikes', typeof d.superlikes==='number' ? d.superlikes : null, ts);
    if (type === 'games') applyUpdate('games', typeof d.games==='number' ? d.games : null, ts);
    if (type === 'transactions') return;
  }, { once: false });

  try {
    if (window.AssetBus && typeof window.AssetBus.getState === 'function') {
      const s = window.AssetBus.getState();
      last.values.likes = typeof s.likes==='number' ? s.likes : last.values.likes;
      last.values.superlikes = typeof s.superlikes==='number' ? s.superlikes : last.values.superlikes;
      last.values.games = typeof s.games==='number' ? s.games : last.values.games;
      last.values.transactions = typeof s.transactions==='number' ? s.transactions : last.values.transactions;
      render();
    }
  } catch(_){}
})();
