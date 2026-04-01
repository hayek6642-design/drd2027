export function phase5Decision({ pbs, antiFraud }) {
  if (antiFraud < 60) return 'LOSER'
  if (pbs >= 80 && antiFraud >= 70) return 'WINNER'
  if (pbs < 50) return 'LOSER'
  return 'DISMISS'
}

export default { phase5Decision }