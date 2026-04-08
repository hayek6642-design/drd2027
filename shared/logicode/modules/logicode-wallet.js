import { getJSON,setJSON } from './logicode-storage.js'
import { emit } from './logicode-events.js'
import { getWallet as neonGet, saveWallet as neonSave } from '../../neon-wallet-adapter.js'
const KEY='logicode:wallet'
function def(){ return { codes_temp:[], codes_expired:[], bars_silver:0, bars_gold:0, balances_negative:0 } }
export let mode='legacy'
export async function get(){ return await getJSON(KEY)||def() }
export async function set(w){ await setJSON(KEY,w); emit('wallet:updated',w); return w }
export async function addTemp(entry){ const w=await get(); w.codes_temp.push(entry); await set(w); return w }
export async function expireIds(ids){ const w=await get(); const setIds=new Set(ids); const remain=[]; for(const e of w.codes_temp){ if(setIds.has(e.id)) w.codes_expired.push(e); else remain.push(e) } w.codes_temp=remain; await set(w); emit('codes:expired',ids); return w }
export async function addSilver(n){ const w=await get(); w.bars_silver+=n; await set(w); return w }
export async function addGold(n){ const w=await get(); w.bars_gold+=n; await set(w); return w }
export async function adjustCodes(delta){ const w=await get(); if(delta===0) return w; if(delta<0){ let need=Math.abs(delta); for(const e of w.codes_temp){ if(need<=0) break; const take=Math.min(e.count, need); e.count-=take; need-=take } w.codes_temp = w.codes_temp.filter(e=>e.count>0); if(need>0){ w.balances_negative += need } } else { const last=w.codes_temp[w.codes_temp.length-1]; if(last) last.count+=delta; else w.codes_temp.push({ id:'credit', count:delta, meta:{}, ts:Date.now() }) } await set(w); return w }
 
