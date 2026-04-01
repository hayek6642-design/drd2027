export function calculateReward({ pbs, tier, sponsored }) {
  let base = 0;

  if (pbs >= 90) base = 5000;
  else if (pbs >= 80) base = 1000;
  else if (pbs >= 70) base = 200;
  else if (pbs >= 60) base = 50;

  if (tier === 'ELITE') base *= 2;
  if (sponsored) base *= 1.5;

  return Math.floor(base);
}
