let __db
function __open(){ return new Promise((res,rej)=>{ const r=indexedDB.open('sqlite_sync_queue',1); r.onupgradeneeded=(e)=>{ const d=e.target.result; if(!d.objectStoreNames.contains('pending_assets')) d.createObjectStore('pending_assets',{ keyPath:'id', autoIncrement:true }) }; r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error) }) }
async function __getDb(){ if(__db) return __db; __db = await __open(); return __db }
function __telemetry(event,payload){ try{ fetch('/api/telemetry',{ method:'POST', headers:{ 'Content-Type':'application/json' }, keepalive:true, body: JSON.stringify({ event, payload, ts: Date.now(), ua: navigator.userAgent }) }) }catch(_){} }
export async function queueSQLiteAsset(entry){ const db=await __getDb(); return new Promise((res,rej)=>{ const tx=db.transaction('pending_assets','readwrite'); tx.objectStore('pending_assets').add({ ...entry, retries: 0, createdAt: Date.now() }); tx.oncomplete=()=>res(true); tx.onerror=()=>rej(tx.error) }) }
export async function listPendingAssets(){ const db=await __getDb(); return new Promise((res,rej)=>{ const tx=db.transaction('pending_assets','readonly'); const req=tx.objectStore('pending_assets').getAll(); req.onsuccess=()=>res(req.result||[]); req.onerror=()=>rej(req.error) }) }
export async function deleteFromQueue(id){ const db=await __getDb(); return new Promise((res,rej)=>{ const tx=db.transaction('pending_assets','readwrite'); tx.objectStore('pending_assets').delete(id); tx.oncomplete=()=>res(true); tx.onerror=()=>rej(tx.error) }) }
export async function updateQueueEntry(entry){ const db=await __getDb(); return new Promise((res,rej)=>{ const tx=db.transaction('pending_assets','readwrite'); tx.objectStore('pending_assets').put(entry); tx.oncomplete=()=>res(true); tx.onerror=()=>rej(tx.error) }) }
export async function getLastQueuedAsset(userId){ const all=await listPendingAssets(); const filtered = userId ? all.filter(a=>a.userId===userId) : all; if (!filtered.length) return null; filtered.sort((a,b)=> (a.createdAt||0)-(b.createdAt||0)); return filtered[filtered.length-1] }
export async function replaySQLiteQueue(userId){
  const items=await listPendingAssets();
  for (const it of items){
    if (userId && it.userId && it.userId!==userId) continue;
    __telemetry('QUEUE_REPLAY_ATTEMPT',{ id: it.id, userId: it.userId, retries: it.retries||0 });
    if ((it.retries||0) >= 5){
      __telemetry('QUEUE_REPLAY_DROPPED',{ id: it.id, userId: it.userId, retries: it.retries||0 });
      continue
    }
    try {
      const fn = (window.writeCodeToSQLite || window.sqliteSaveAssets || window.writeCodeToNeon || (async()=>{ throw new Error('no_sync_fn') }));
      await fn({ userId: it.userId, code: it.payload && it.payload.code, codes: it.payload && it.payload.codes, rewards: it.payload && it.payload.rewards, source: it.source || 'queue' });
      await deleteFromQueue(it.id);
      __telemetry('QUEUE_REPLAY_SUCCESS',{ id: it.id, userId: it.userId })
    } catch(_){
      const next = { ...it, retries: (it.retries||0)+1 };
      try{ await updateQueueEntry(next) }catch(__){}
      __telemetry('QUEUE_REPLAY_FAIL',{ id: it.id, userId: it.userId, retries: next.retries })
    }
  }
  return true
}
try { window.queueSQLiteAsset = queueSQLiteAsset; window.getLastQueuedAsset = getLastQueuedAsset; window.replaySQLiteQueue = replaySQLiteQueue; window.__QUEUE_REPLAY_ENABLED = true } catch(_){ }
