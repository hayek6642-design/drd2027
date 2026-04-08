export class BalloonEngine {
  constructor({ userId }) {
    this.userId = userId
    this.session = {
      spawned: 0,
      clicked: 0,
      lastInteraction: Date.now()
    }
  }

  registerSpawn() {
    this.session.spawned++
  }

  registerClick() {
    this.session.clicked++
    this.session.lastInteraction = Date.now()
  }

  getEngagementScore() {
    const { spawned, clicked } = this.session
    if (spawned === 0) return 0

    return clicked / spawned
  }

  isActiveUser() {
    return this.getEngagementScore() >= 0.3
  }
}