export class ReplayEngine {
  constructor(policyEngine, intentQueue) {
    this.policyEngine = policyEngine
    this.intentQueue = intentQueue
  }

  async replayAll() {
    const intents = this.intentQueue.load()
    for (const intent of intents) {
      try {
        await this.policyEngine.run(intent.type, intent.payload)
        this.intentQueue.clear(intent.intentId)
      } catch (e) {
        try { this.intentQueue.markFailed(intent.intentId, e.message) } catch(_){}
        console.error("Intent failed:", intent.intentId, e.message)
      }
    }
  }
}
