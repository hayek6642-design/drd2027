import { sign as signRefresh } from './signRefresh.js'
import { verify as verifyRefresh } from './verifyRefresh.js'
export function rotate(oldToken, privatePem, publicPem){ const v=verifyRefresh(oldToken, publicPem); if(!v) return null; const next={ ...v, iat: Math.floor(Date.now()/1000), jti: String(Date.now())+Math.random().toString(16).slice(2) }; return signRefresh(next, privatePem) }