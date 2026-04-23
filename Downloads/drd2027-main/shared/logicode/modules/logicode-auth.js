import { emit } from './logicode-events.js'
import { lsSet, lsGet, lsSetJSON, lsJSON } from './logicode-storage.js'
let client
let state={ user:null, token:null }
export async function init(){ const t=lsJSON('logicode:auth'); if(t){ state=t; emit('auth:ready',state) } }
export function setClient(c){ client=c }
export function isGuest(){ return !state.user }
export async function signup(fullName,email,password){ if(!client) throw new Error('no supabase'); const { data, error } = await client.rpc('bankode_register_user',{ p_full_name:fullName, p_email:email, p_password:password }); if(error) throw error; return data }
export async function login(email,password){ if(!client) throw new Error('no supabase'); const { data, error } = await client.rpc('bankode_login_user',{ p_email:email, p_password:password }); if(error) throw error; state.user=data?.user||{ email }; state.token=data?.token||null; lsSetJSON('logicode:auth',state); emit('auth:login',state); return data }
export async function logout(){ state={ user:null, token:null }; lsSetJSON('logicode:auth',state); emit('auth:logout',true); return true }
export function getUser(){ return state.user }
