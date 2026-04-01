export function resolveTier(pbs) {
  if (pbs >= 90) return 'ELITE';
  if (pbs >= 80) return 'PRO';
  if (pbs >= 70) return 'ADVANCED';
  return 'OPEN';
}