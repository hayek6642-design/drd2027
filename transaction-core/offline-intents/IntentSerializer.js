function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export function serializeIntent(type, payload) {
  return {
    intentId: uuid(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    status: "queued"
  }
}
