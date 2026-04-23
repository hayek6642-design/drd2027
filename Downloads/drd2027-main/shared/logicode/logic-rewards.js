// FILE: shared/logicode/logic-rewards.js
// -----------------------------
import * as Core from './logic-core.js';
import * as Storage2 from './logic-storage.js';

export async function addCodes(amount = 0, meta = {}) {
  if (!Core.isAuthenticated()) return { saved: false, reason: 'guest_mode' };
  const id = Core.uuidv4();
  const ts = Core.nowTs();
  const expiresAt = ts + Core.CONFIG.CODE_EXPIRE_MS;
  const entry = { id, amount: Number(amount), ts, expiresAt, meta };
  await Storage2.idbPut(Storage2.STORAGE_CONFIG?.TEMP_STORE || 'temp_codes', entry);
  await updateLocalTempSummary();
  return { saved: true, id };
}

export async function getTempCodes() {
  const all = await Storage2.idbGetAll(Storage2.STORAGE_CONFIG?.TEMP_STORE || 'temp_codes');
  const valid = all.filter(e => e.expiresAt > Core.nowTs());
  return valid;
}

export async function updateLocalTempSummary() {
  const valid = await getTempCodes();
  const total = valid.reduce((s, e) => s + Number(e.amount), 0);
  Core.setLocal('logicode_temp_total', { total, count: valid.length, ts: Core.nowTs() });
  return { total, count: valid.length };
}