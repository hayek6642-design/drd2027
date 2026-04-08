// FILE: shared/logicode/logic-deduction.js
// -----------------------------
import * as Storage5 from './logic-storage.js';
import * as Core4 from './logic-core.js';
import * as Sync2 from './logic-sync.js';

const serviceSessions = {};

export function startServiceSession(serviceId) {
  if (!Core4.isAuthenticated()) return;
  const uid = localStorage.getItem(Core4.CONFIG.LOCAL_UID_KEY);
  if (!serviceSessions[serviceId]) serviceSessions[serviceId] = { startTs: Core4.nowTs(), accMs: 0, timer: null, uid };
  if (!serviceSessions[serviceId].timer) {
    serviceSessions[serviceId].timer = setInterval(async ()=>{
      const s = serviceSessions[serviceId];
      const elapsedMs = Core4.nowTs() - s.startTs + s.accMs;
      if (elapsedMs >= 60*60*1000) {
        await deductCodeForService(s.uid, serviceId, 1);
        s.startTs = Core4.nowTs(); s.accMs = 0;
      }
    }, 10*1000);
  }
}

export function stopServiceSession(serviceId) {
  const s = serviceSessions[serviceId];
  if (!s) return; if (s.timer) clearInterval(s.timer); s.accMs += (Core4.nowTs() - s.startTs); s.startTs = null; s.timer = null;
}

async function deductCodeForService(userId, serviceId, amount=1) {
  // consume temp codes first
  const temp = (await Storage5.idbGetAll(Storage5.STORAGE_CONFIG?.TEMP_STORE || 'temp_codes')).filter(e=>e.expiresAt>Core4.nowTs()).sort((a,b)=>a.ts-b.ts);
  let remaining = amount;
  for (const e of temp) {
    if (remaining<=0) break;
    if (e.amount <= remaining) { remaining -= e.amount; await Storage5.idbDelete(Storage5.STORAGE_CONFIG?.TEMP_STORE || 'temp_codes', e.id); }
    else { e.amount = e.amount - remaining; remaining = 0; await Storage5.idbPut(Storage5.STORAGE_CONFIG?.TEMP_STORE || 'temp_codes', e); }
  }
  // if still remaining, use bars
  if (remaining>0) {
    const barsAll = await Storage5.idbGetAll(Storage5.STORAGE_CONFIG?.BARS_STORE || 'bars');
    let totalCodesInBars = barsAll.reduce((s,b)=>s + (b.silver||0)*Core4.CONFIG.CODES_PER_SILVER + (b.gold||0)*Core4.CONFIG.CODES_PER_GOLD, 0);
    if (totalCodesInBars < remaining) {
      // allow negative balance representation in localStorage
      const debt = remaining - totalCodesInBars;
      await clearAllBarsAndSetNegativeDebt(debt);
      remaining = 0;
    } else {
      let codesLeft = totalCodesInBars - remaining;
      for (const b of barsAll) await Storage5.idbDelete(Storage5.STORAGE_CONFIG?.BARS_STORE || 'bars', b.id);
      const newGold = Math.floor(codesLeft / Core4.CONFIG.CODES_PER_GOLD);
      let rem = codesLeft - newGold*Core4.CONFIG.CODES_PER_GOLD;
      const newSilver = Math.floor(rem / Core4.CONFIG.CODES_PER_SILVER);
      rem = rem - newSilver*Core4.CONFIG.CODES_PER_SILVER;
      const newBarsObj = { id: Core4.uuidv4(), createdAt: Core4.nowTs(), gold:newGold, silver:newSilver, leftoverCodes:rem };
      await Storage5.idbPut(Storage5.STORAGE_CONFIG?.BARS_STORE || 'bars', newBarsObj);
      await Sync2.queueSync({ type:'bars', payload:newBarsObj });
      remaining = 0;
    }
  }
  // log deduction via RPC to admin ledger
  try {
    const rpcName = 'bankode_record_service_fee';
    const { data, error } = await (await import('../../shared/supabase.js')).supabase.rpc(rpcName, {
      p_admin_uid: localStorage.getItem(Core4.CONFIG.ADMIN_UID_KEY) || null,
      p_user_uid: userId,
      p_amount: amount,
      p_service_id: serviceId
    });
    if (error) console.warn('Service fee RPC warning:', error);
  } catch (err) { console.error('Service fee RPC failed:', err); }
  return true;
}

async function clearAllBarsAndSetNegativeDebt(debtAmount) {
  const barsAll = await Storage5.idbGetAll(Storage5.STORAGE_CONFIG?.BARS_STORE || 'bars');
  for (const b of barsAll) await Storage5.idbDelete(Storage5.STORAGE_CONFIG?.BARS_STORE || 'bars', b.id);
  // store debt in localStorage
  const debtKey = 'logicode_debt';
  const existing = Core4.getLocal(debtKey) || 0;
  Core4.setLocal(debtKey, existing + debtAmount);
}
