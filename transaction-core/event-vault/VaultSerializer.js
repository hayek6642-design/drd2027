import crypto from "crypto"

export function serializeEvent(event) {
  const payload = {
    ...event,
    timestamp: new Date().toISOString(),
  }
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
  return JSON.stringify({ ...payload, txHash: hash })
}
