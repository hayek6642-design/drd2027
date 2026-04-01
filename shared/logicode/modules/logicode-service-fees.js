import { now, hours } from './logicode-utils.js'
import { adjustCodes } from './logicode-wallet.js'
import { emit } from './logicode-events.js'
let sessions=new Map()
let client
export function setClient(c){ client=c }
export function start(){ }
export function begin(service){ if(sessions.has(service)) return; const obj={ started:now(), timer:setInterval(()=>tick(service), hours(1)) }; sessions.set(service,obj) }
export function end(service){ const s=sessions.get(service); if(!s) return; clearInterval(s.timer); sessions.delete(service) }
async function tick(service){ await adjustCodes(-1); emit('fees:deducted',{ service, amount:1 }); try{ if(client){ await client.rpc('bankode_record_service_fee',{ service, amount:1 }) } }catch(_){ } }