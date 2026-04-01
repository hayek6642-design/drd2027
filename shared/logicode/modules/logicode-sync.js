import { get as getWallet, set as setWallet } from './logicode-wallet.js'
import { emit } from './logicode-events.js'
import { lsJSON } from './logicode-storage.js'
let client
let pending=false
export function setClient(c){ client=c }
export function start(){ try{ if(window.Auth&&typeof window.Auth.isAuthenticated==='function'&&window.Auth.isAuthenticated()) return }catch(_){ } }
export function queue(){ try{ if(window.Auth&&typeof window.Auth.isAuthenticated==='function'&&window.Auth.isAuthenticated()) return }catch(_){ } pending=true; setTimeout(syncPending,500) }
export async function syncPending(){ if(!pending) return; pending=false; try{ if(window.Auth&&typeof window.Auth.isAuthenticated==='function'&&window.Auth.isAuthenticated()) return false }catch(_){}
  const w=await getWallet(); try{ if(client){ const { data, error } = await client.rpc('bankode_sync_wallet',{ payload:w }); if(error) throw error; if(data&&data.wallet){ await setWallet(data.wallet) } } }catch(_){ } emit('sync:complete',true); return true }
export function subscribeToBalanceChanges(fn){ emit('wallet:subscribe',fn) }
