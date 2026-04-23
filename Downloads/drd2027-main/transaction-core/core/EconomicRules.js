export function canUserDebit(usersManager, userId, amount){ const u=usersManager.getUser(userId); if(!u) return false; return (u.balance - Math.abs(Number(amount)||0)) >= 0 }
export function bankodeCanGoNegative(){ return true }
export function ensureAtomic(ops){ for(let i=0;i<ops.length;i++){ try{ ops[i].do() }catch(e){ for(let j=i-1;j>=0;j--){ try{ ops[j].undo() }catch(_){} } throw e } } return true }
export async function ensureAtomicAsync(ops, runner){ if(!runner){ return ensureAtomic(ops) } let i=0; try{ await runner(async (client)=>{ for(i=0;i<ops.length;i++){ await Promise.resolve(ops[i].do(client)) } }) }catch(e){ for(let j=i-1;j>=0;j--){ try{ await Promise.resolve(ops[j].undo()) }catch(_){} } throw e } return true }
