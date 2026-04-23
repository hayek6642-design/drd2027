let db
const DB_NAME='logicode-db'
const STORE='kv'
export async function init(){ await open() }
async function open(){ if(db) return db; db=await new Promise((res,rej)=>{ const r=indexedDB.open(DB_NAME,1); r.onupgradeneeded=()=>{ const d=r.result; if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE) }; r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error) }); return db }
export async function idbGet(key){ const d=await open(); return new Promise((res,rej)=>{ const tx=d.transaction(STORE,'readonly'); const st=tx.objectStore(STORE); const req=st.get(key); req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error) }) }
export async function idbPut(key,val){ const d=await open(); return new Promise((res,rej)=>{ const tx=d.transaction(STORE,'readwrite'); const st=tx.objectStore(STORE); const req=st.put(val,key); req.onsuccess=()=>res(true); req.onerror=()=>rej(req.error) }) }
export async function idbDel(key){ const d=await open(); return new Promise((res,rej)=>{ const tx=d.transaction(STORE,'readwrite'); const st=tx.objectStore(STORE); const req=st.delete(key); req.onsuccess=()=>res(true); req.onerror=()=>rej(req.error) }) }
export function lsGet(k){ try{ return localStorage.getItem(k) }catch(_){ return null } }
export function lsSet(k,v){ try{ localStorage.setItem(k,v) }catch(_){ } }
export function lsJSON(k){ const v=lsGet(k); if(!v) return null; try{ return JSON.parse(v) }catch(_){ return null } }
export function lsSetJSON(k,obj){ lsSet(k, JSON.stringify(obj)) }
export async function getJSON(key){ const v=await idbGet(key); if(!v) return null; try{ return JSON.parse(v) }catch(_){ return null } }
export async function setJSON(key,obj){ return idbPut(key, JSON.stringify(obj)) }
