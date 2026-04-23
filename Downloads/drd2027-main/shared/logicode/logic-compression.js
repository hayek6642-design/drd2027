// FILE: shared/logicode/logic-compression.js
// -----------------------------
import * as Storage4 from './logic-storage.js';
import * as Core3 from './logic-core.js';
import * as Rewards from './logic-rewards.js';
import * as Sync from './logic-sync.js';

export async function compressTempCodesToBars() {
  const temp = await Rewards.getTempCodes();
  const totalCodes = temp.reduce((s,e)=>s+Number(e.amount),0);
  if (totalCodes < Core3.CONFIG.CODES_PER_SILVER) return { success:false, reason:'not_enough_codes', totalCodes };
  const gold = Math.floor(totalCodes / Core3.CONFIG.CODES_PER_GOLD);
  let remaining = totalCodes - gold * Core3.CONFIG.CODES_PER_GOLD;
  const silver = Math.floor(remaining / Core3.CONFIG.CODES_PER_SILVER);
  remaining = remaining - silver * Core3.CONFIG.CODES_PER_SILVER;
  const barsObj = { id: Core3.uuidv4(), createdAt: Core3.nowTs(), gold, silver, leftoverCodes: remaining };
  await Storage4.idbPut(Storage4.STORAGE_CONFIG?.BARS_STORE || 'bars', barsObj);
  // consume temp entries
  let toConsume = gold * Core3.CONFIG.CODES_PER_GOLD + silver * Core3.CONFIG.CODES_PER_SILVER;
  const sorted = temp.sort((a,b)=>a.ts - b.ts);
  for (const e of sorted) {
    if (toConsume <= 0) break;
    if (e.amount <= toConsume) { toConsume -= e.amount; await Storage4.idbDelete(Storage4.STORAGE_CONFIG?.TEMP_STORE || 'temp_codes', e.id); }
    else { e.amount = e.amount - toConsume; toConsume = 0; await Storage4.idbPut(Storage4.STORAGE_CONFIG?.TEMP_STORE || 'temp_codes', e); }
  }
  await Rewards.updateLocalTempSummary();
  await Sync.queueSync({ type:'bars', payload:barsObj });
  const barsAll = await Storage4.idbGetAll(Storage4.STORAGE_CONFIG?.BARS_STORE || 'bars');
  const totalBars = barsAll.reduce((s,b)=>s + Number(b.gold||0)*(Core3.CONFIG.CODES_PER_GOLD/Core3.CONFIG.CODES_PER_SILVER) + Number(b.silver||0),0);
  Core3.setLocal('logicode_bars_summary', { count: barsAll.length, totalBars, ts: Core3.nowTs() });
  return { success:true, bars:barsObj };
}