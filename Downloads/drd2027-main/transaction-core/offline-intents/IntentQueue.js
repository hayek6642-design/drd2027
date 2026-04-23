export class IntentQueue {
  constructor(storage) {
    this.storage = storage
    this.key = "offline_intents"
  }

  load() {
    try { return JSON.parse(this.storage.getItem(this.key) || "[]") } catch(_) { return [] }
  }

  save(intents) {
    this.storage.setItem(this.key, JSON.stringify(intents))
  }

  enqueue(intent) {
    const intents = this.load()
    intents.push(intent)
    this.save(intents)
  }

  list() {
    return this.load()
  }

  markDone(intentId) {
    const intents = this.load().map(i => i.intentId === intentId ? { ...i, status: "done" } : i)
    this.save(intents)
  }

  markFailed(intentId, error) {
    const intents = this.load().map(i => i.intentId === intentId ? { ...i, status: "failed", error } : i)
    this.save(intents)
  }

  clear(intentId) {
    const intents = this.load().filter(i => i.intentId !== intentId)
    this.save(intents)
  }
}
