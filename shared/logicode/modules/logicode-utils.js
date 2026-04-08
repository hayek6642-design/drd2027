export function now() { return Date.now() }
export function hours(n) { return n*60*60*1000 }
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }
export function hashString(s) { let h=0; for(let i=0;i<s.length;i++){h=(h<<5)-h+s.charCodeAt(i); h|=0} return String(h) }
export function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16)}) }
