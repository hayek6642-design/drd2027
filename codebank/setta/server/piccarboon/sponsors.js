export function applySponsorBonus(challenge, score) {
  if (challenge && challenge.sponsor) return Math.round(score * 1.05)
  return score
}

export default { applySponsorBonus }