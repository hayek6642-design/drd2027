// FILE: shared/logicode/logic-expiry.js
// -----------------------------
import * as Storage3 from './logic-storage.js';
import * as Core2 from './logic-core.js';

export async function purgeExpiredTempCodes() {
  const all = await Storage3.idbGetAll(Storage3.STORAGE_CONFIG?.TEMP_STORE || 'temp_codes');
  const now = Core2.nowTs();
  for (const e of all) {
    if (e.expiresAt <= now) await Storage3.idbDelete(Storage3.STORAGE_CONFIG?.TEMP_STORE || 'temp_codes', e.id);
  }
  await Core2.setLocal('logicode_temp_total', { total:0, count:0, ts: now });
}
