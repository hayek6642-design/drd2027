import { userContext } from '../context/user-context.js'
import assetSync from '../codebank/js/asset-sync.js'
import { txId, now, clone } from './ledger-utils.js'
import { normalize } from './ledger-schema.js'

let ledger = null

async function loadLedger() {
  if (ledger) return ledger
  try {
    const us = typeof window !== 'undefined' ? window.unifiedStorage : null
    if (us && us.ledgerDB && typeof us.ledgerDB.get === 'function') {
      const v = await us.ledgerDB.get()
      ledger = Array.isArray(v) ? v : []
      return ledger
    }
  } catch (_) {}
  try {
    const s = localStorage.getItem('__LTL__')
    ledger = s ? JSON.parse(s) : []
  } catch (_) { ledger = [] }
  return ledger
}

async function persistLedger() {
  const list = Array.isArray(ledger) ? ledger : []
  try {
    const us = typeof window !== 'undefined' ? window.unifiedStorage : null
    if (us && us.ledgerDB && typeof us.ledgerDB.set === 'function') {
      await us.ledgerDB.set(list)
      return
    }
  } catch (_) {}
  try { localStorage.setItem('__LTL__', JSON.stringify(list)) } catch (_) {}
}

function applyDelta(bal, tx) {
  const out = { codes: bal.codes || 0, silverBars: bal.silverBars || 0, goldBars: bal.goldBars || 0 }
  const amt = Number(tx.amount || 0)
  const sign = (tx.type === 'SPEND') ? -1
    : (tx.type === 'TRANSFER' && tx.meta && tx.meta.targetUserId && String(tx.meta.targetUserId) !== String(tx.userId)) ? -1
    : (tx.type === 'GAME' && tx.meta && tx.meta.loss === true) ? -1
    : 1
  const delta = sign * amt
  switch (tx.asset) {
    case 'code': out.codes += delta; break
    case 'silver': out.silverBars += delta; break
    case 'gold': out.goldBars += delta; break
  }
  out.codes = Math.max(0, out.codes)
  out.silverBars = Math.max(0, out.silverBars)
  out.goldBars = Math.max(0, out.goldBars)
  return out
}

function sumForUser(list, userId) {
  const start = { codes: 0, silverBars: 0, goldBars: 0 }
  return list.reduce((acc, raw) => {
    if (String(raw.userId) !== String(userId)) return acc
    const tx = normalize(raw)
    return applyDelta(acc, tx)
  }, start)
}

export const ledgerKernel = {
  async appendTransaction(tx) {
    const list = await loadLedger()
    const userId = String(tx.userId || (userContext && userContext.userId) || '')
    const base = {
      id: txId(),
      userId,
      type: tx.type,
      asset: tx.asset,
      amount: Number(tx.amount || 0),
      reason: tx.reason,
      meta: clone(tx.meta || {}),
      timestamp: now()
    }
    const prev = sumForUser(list, userId)
    const nextSnap = applyDelta(prev, base)
    const finalTx = normalize({ ...base, balanceSnapshot: nextSnap })
    list.push(finalTx)
    ledger = list
    await persistLedger()
    try { console.log('[LTL] Tx appended:', finalTx) } catch (_) {}
    try { assetSync.applyBalance(nextSnap) } catch (_) {}
    return finalTx
  },

  async getTransactionsByUser(userId) {
    const list = await loadLedger()
    return list.filter(t => String(t.userId) === String(userId))
  },

  async calculateBalance(userId) {
    const list = await loadLedger()
    return sumForUser(list, userId)
  },

  async replay(userId) {
    const bal = await this.calculateBalance(userId)
    try { assetSync.applyBalance(bal) } catch (_) {}
    return bal
  }
}

export default ledgerKernel
if (typeof window !== 'undefined') { try { window.ledgerKernel = ledgerKernel } catch (_) {} }
