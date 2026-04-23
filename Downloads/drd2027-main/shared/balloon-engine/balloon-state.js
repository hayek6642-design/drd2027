export class BalloonState {
  constructor(userId) {
    this.userId = userId
    this.sessions = []
    this.currentSession = this.createNewSession()
  }

  createNewSession() {
    const session = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      endTime: null,
      balloonsSpawned: 0,
      balloonsClicked: 0,
      engagementScore: 0
    }
    this.sessions.push(session)
    return session
  }

  endCurrentSession() {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now()
      this.currentSession.engagementScore = this.calculateEngagementScore(this.currentSession)
    }
  }

  startNewSession() {
    this.endCurrentSession()
    this.currentSession = this.createNewSession()
  }

  registerBalloonSpawn() {
    this.currentSession.balloonsSpawned++
  }

  registerBalloonClick() {
    this.currentSession.balloonsClicked++
    this.currentSession.engagementScore = this.calculateEngagementScore(this.currentSession)
  }

  calculateEngagementScore(session) {
    if (session.balloonsSpawned === 0) return 0
    return session.balloonsClicked / session.balloonsSpawned
  }

  getCurrentEngagementScore() {
    return this.currentSession.engagementScore
  }

  isActiveUser() {
    return this.getCurrentEngagementScore() >= 0.3
  }

  getSessionHistory() {
    return this.sessions
  }

  getTotalEngagementScore() {
    const totalSpawned = this.sessions.reduce((sum, session) => sum + session.balloonsSpawned, 0)
    const totalClicked = this.sessions.reduce((sum, session) => sum + session.balloonsClicked, 0)
    
    if (totalSpawned === 0) return 0
    return totalClicked / totalSpawned
  }
}