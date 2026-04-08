export function computeDifficulty(recentScores = []) {
  if (recentScores.length < 5) return "easy";

  const avg =
    recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

  if (avg > 85) return "hard";
  if (avg > 65) return "medium";
  return "easy";
}