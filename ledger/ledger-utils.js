function uuidv4() {
  return crypto.randomUUID()
}

function txId() {
  return 'tx_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24)
}

function now() {
  return Date.now()
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj || null))
}

export { uuidv4, txId, now, clone }
