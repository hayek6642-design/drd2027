const TYPES = ['EARN', 'SPEND', 'TRANSFER', 'GAME']
const ASSETS = ['code', 'silver', 'gold']

function isValidType(t) { return TYPES.includes(String(t)) }
function isValidAsset(a) { return ASSETS.includes(String(a)) }

function normalize(tx) {
  const out = {
    id: String(tx.id || ''),
    userId: String(tx.userId || ''),
    type: String(tx.type || ''),
    asset: String(tx.asset || ''),
    amount: Number(tx.amount || 0),
    reason: tx.reason ? String(tx.reason) : undefined,
    meta: tx.meta ? tx.meta : {},
    timestamp: Number(tx.timestamp || Date.now()),
    balanceSnapshot: tx.balanceSnapshot ? tx.balanceSnapshot : undefined
  }
  if (!isValidType(out.type)) throw new Error('INVALID_TX_TYPE')
  if (!isValidAsset(out.asset)) throw new Error('INVALID_TX_ASSET')
  if (!Number.isFinite(out.amount)) throw new Error('INVALID_TX_AMOUNT')
  return out
}

export { TYPES, ASSETS, normalize }
