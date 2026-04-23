// FILE: shared/logicode/logic-sync.js
// -----------------------------
import * as Storage6 from './logic-storage.js';
import * as Core5 from './logic-core.js';

// IMPORTANT: adjust import path to your supabase wrapper
import { supabase } from '../../shared/supabase.js';

export async function queueSync(item) {
  const id = Core5.uuidv4();
  const obj = { id, item, createdAt: Core5.nowTs(), tries:0 };
  await Storage6.idbPut(Storage6.STORAGE_CONFIG?.SYNC_STORE || 'sync_queue', obj);
  try { await syncPending(); } catch(e){}
  return obj;
}

export async function syncPending() {
  if (!Core5.isAuthenticated()) return { synced:false, reason:'not_auth' };
  const uid = localStorage.getItem(Core5.CONFIG.LOCAL_UID_KEY);
  const queue = await Storage6.idbGetAll(Storage6.STORAGE_CONFIG?.SYNC_STORE || 'sync_queue');
  for (const q of queue) {
    try {
      if (!q.item || !q.item.type) { await Storage6.idbDelete(Storage6.STORAGE_CONFIG?.SYNC_STORE || 'sync_queue', q.id); continue; }
      if (q.item.type === 'bars') {
        const bars = q.item.payload;
        // Use direct table insert to reduce RPC confusion: insert row in bankode_wallets or bankode_balances
        // Example: upsert into bankode_wallets (profile_id) or call your RPC
        const { data, error } = await supabase.from('bankode_wallets').upsert([
          { profile_id: uid, codes:0, silver: bars.silver || 0, gold: bars.gold || 0 }
        ], { onConflict: ['profile_id'] });
        if (error) throw error;
        await Storage6.idbDelete(Storage6.STORAGE_CONFIG?.SYNC_STORE || 'sync_queue', q.id);
      } else {
        await Storage6.idbDelete(Storage6.STORAGE_CONFIG?.SYNC_STORE || 'sync_queue', q.id);
      }
    } catch (err) {
      q.tries = (q.tries || 0) + 1; await Storage6.idbPut(Storage6.STORAGE_CONFIG?.SYNC_STORE || 'sync_queue', q);
      if (q.tries > 5) await Storage6.idbDelete(Storage6.STORAGE_CONFIG?.SYNC_STORE || 'sync_queue', q.id);
    }
  }
  return { synced:true };
}

export function subscribeToBalanceChanges(userId, callback) {
  const channel = supabase
    .channel(`logicode-balances-${userId}`)
    .on('postgres_changes', { event:'*', schema:'public', table:'bankode_balances', filter:`user_id=eq.${userId}` }, payload => callback && callback(payload))
    .subscribe();
  return channel;
}