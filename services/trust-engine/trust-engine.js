import { analyzeBehavior } from './behavior-analyzer.js';
import { getTrustScore, saveTrustScore } from './trust-score.store.js';

class TrustEngine {
  constructor() {
    this.MIN = 0;
    this.MAX = 1;
  }

  update(userId, event) {
    const behavior = analyzeBehavior(userId, event);
    let score = getTrustScore(userId);

    score += behavior.delta;

    score = this.applyDecay(score);
    score = this.clamp(score);

    saveTrustScore(userId, score);

    return score;
  }

  applyDecay(score) {
    return score * 0.995; // slow decay over time
  }

  clamp(score) {
    return Math.max(this.MIN, Math.min(this.MAX, score));
  }
}

export { TrustEngine };
