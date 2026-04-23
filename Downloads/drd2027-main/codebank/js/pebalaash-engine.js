function calculateTier(engagementScore) {
  if (engagementScore >= 0.9) return 5
  if (engagementScore >= 0.7) return 4
  if (engagementScore >= 0.5) return 3
  if (engagementScore >= 0.3) return 2
  return 1
}

export function resolvePebalaashFeed({ engagementScore, currentTier }) {

  // ❗ Most important rule: No interaction → No update
  if (engagementScore < 0.3) {
    return {
      tier: currentTier,
      freeze: true
    }
  }

  // ✔ With interaction → Upgrade
  const newTier = calculateTier(engagementScore)

  return {
    tier: Math.max(currentTier, newTier),
    freeze: false
  }
}