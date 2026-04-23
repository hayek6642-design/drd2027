import { hours, now } from './logicode-utils.js'
import { get as getWallet, expireIds } from './logicode-wallet.js'
let timer
export function start(){ try{ if(window.Auth&&typeof window.Auth.isAuthenticated==='function'&&window.Auth.isAuthenticated()) return }catch(_){ } if(timer) return; timer=setInterval(check, 60*1000) }
export function stop(){ if(timer){ clearInterval(timer); timer=null } }
export async function check(){ try{ if(window.Auth&&typeof window.Auth.isAuthenticated==='function'&&window.Auth.isAuthenticated()) return }catch(_){ } const w=await getWallet(); const cutoff=now()-hours(24); const ids=w.codes_temp.filter(e=>e.ts<cutoff).map(e=>e.id); if(ids.length) await expireIds(ids) }
export async function purgeExpiredTempCodes(){ await check() }
