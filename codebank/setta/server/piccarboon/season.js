export function getCurrentSeason() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}`;
}

export function assignTier(rank, total) {
  if (rank / total <= 0.01) return "gold";
  if (rank / total <= 0.1) return "silver";
  return "bronze";
}