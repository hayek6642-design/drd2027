export class BalloonValidator {
  constructor() {
    this.validBalloons = new Map()
  }

  generateBalloonToken(balloonId) {
    const token = `${balloonId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.validBalloons.set(balloonId, {
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5000 // 5 seconds expiry
    })
    return token
  }

  verifyBalloonToken(balloonId, token) {
    const balloonData = this.validBalloons.get(balloonId)
    
    if (!balloonData) {
      return false
    }

    const { token: validToken, expiresAt } = balloonData

    // Check if token is valid and not expired
    if (token === validToken && Date.now() < expiresAt) {
      // Remove valid token after use to prevent reuse
      this.validBalloons.delete(balloonId)
      return true
    }

    // Clean up expired tokens
    if (Date.now() >= expiresAt) {
      this.validBalloons.delete(balloonId)
    }

    return false
  }

  getBalloonValue(balloonId) {
    // In a real implementation, this would fetch from a database
    // For now, we'll return random values based on type
    const rand = Math.random()
    if (rand < 0.7) return 5
    if (rand < 0.9) return 0
    return 25
  }
}