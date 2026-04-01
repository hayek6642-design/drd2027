import { createVerify } from 'node:crypto'
function split(t){ const [h,p,s]=t.split('.'); return { h,p,s } }
function b64d(s){ s=s.replace(/-/g,'+').replace(/_/g,'/'); const pad=s.length%4; if(pad) s+= '='.repeat(4-pad); return Buffer.from(s,'base64') }
export function verify(token, publicPem){ const { h,p,s }=split(token); const msg=`${h}.${p}`; const ok=createVerify('SHA512').update(msg).verify(publicPem, b64d(s)); if(!ok) return null; try{ return JSON.parse(Buffer.from(p,'base64').toString('utf8')) }catch(_){ return null } }