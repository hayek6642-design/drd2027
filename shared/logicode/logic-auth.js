// FILE: shared/logicode/logic-auth.js
// -----------------------------
import * as Core6 from './logic-core.js';
import { supabase } from '../../shared/supabase.js';

export async function signupUser(fullName, email, password) {
  // call existing RPC or use direct insert + password hashing RPC on server
  const { data, error } = await supabase.rpc('bankode_register_user', { p_full_name: fullName, p_email: email, p_password: password });
  if (error) throw error; return data;
}

export async function loginUser(email, password) {
  const { data, error } = await supabase.rpc('bankode_login_user', { p_email: email, p_password: password });
  if (error) throw error;
  // data expected to include uid, jwt, refresh
  if (data && data.uid && data.jwt) {
    Core6.setLocal(Core6.CONFIG.LOCAL_UID_KEY, data.uid);
    Core6.setLocal(Core6.CONFIG.LOCAL_JWT_KEY, data.jwt);
    Core6.setLocal(Core6.CONFIG.LOCAL_REFRESH_KEY, data.refresh || null);
  }
  return data;
}

export async function logoutUser() {
  Core6.removeLocal(Core6.CONFIG.LOCAL_UID_KEY);
  Core6.removeLocal(Core6.CONFIG.LOCAL_JWT_KEY);
  Core6.removeLocal(Core6.CONFIG.LOCAL_REFRESH_KEY);
  return { success:true };
}