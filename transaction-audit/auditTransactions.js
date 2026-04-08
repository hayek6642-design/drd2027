import { users, transactions } from './dbMock.js'

export function auditTransactions() {
  const report = transactions.map(tx => {
    let source = 'Unknown';
    let destination = 'Unknown';
    if (tx.type === 'transfer') {
      source = (users.find(u => u.id === tx.from) || {}).name || 'Unknown'
      destination = (users.find(u => u.id === tx.to) || {}).name || 'Unknown'
    } else if (tx.type === 'like') {
      source = (users.find(u => u.id === tx.from) || {}).name || 'Unknown'
      destination = (users.find(u => u.id === tx.to) || {}).name || 'Unknown'
    } else if (tx.type === 'gameAssetPurchase') {
      source = (users.find(u => u.id === tx.userId) || {}).name || 'Unknown'
      destination = 'GameAsset: ' + tx.assetId
    }
    return {
      id: tx.id,
      type: tx.type,
      source,
      destination,
      amount: tx.amount,
      status: tx.status,
      timestamp: new Date(tx.timestamp * 1000).toISOString()
    }
  })
  return report
}

export default auditTransactions
