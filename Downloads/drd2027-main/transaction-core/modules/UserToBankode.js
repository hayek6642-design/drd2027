export function userToBankode(transactionManager, userId, amount) {
  transactionManager.executeTransaction({
    type: "UserToBankode",
    from: userId,
    to: "Bankode",
    amount,
    description: `User ${userId} deposit to Bankode`
  })
}
