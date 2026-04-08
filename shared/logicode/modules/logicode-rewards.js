import { uuid, now } from './logicode-utils.js'
import { addTemp, get as getWallet, addSilver, addGold } from './logicode-wallet.js'
import { emit } from './logicode-events.js'
export async function addCodes(count, meta){ const entry={ id:uuid(), count, meta:meta||{}, ts:now() }; await addTemp(entry); emit('rewards:generated',entry); return entry }
export async function getTempCodes(){ const w=await getWallet(); return w.codes_temp }
export async function updateLocalTempSummary(){ const w=await getWallet(); const s=w.codes_temp.reduce((a,b)=>a+b.count,0); return { total:s } }
export async function compressTempCodesToBars(){ const w=await getWallet(); const total=w.codes_temp.reduce((a,b)=>a+b.count,0); const silver=Math.floor(total/100); const gold=Math.floor(total/10000); if(silver>0) await addSilver(silver); if(gold>0) await addGold(gold); emit('rewards:compressed',{ silver, gold }); return { silver, gold } }