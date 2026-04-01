const listeners = new Map()
export function on(type, fn) { const arr = listeners.get(type) || []; arr.push(fn); listeners.set(type, arr) }
export function off(type, fn) { const arr = listeners.get(type) || []; listeners.set(type, arr.filter(f=>f!==fn)) }
export function emit(type, payload) { const arr = listeners.get(type) || []; for (const fn of arr) { try { fn(payload) } catch(_){} } }