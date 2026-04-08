export function bankodeToUser(transactionManager, userId, amount) {
  transactionManager.executeTransaction({
    type: "BankodeToUser",
    from: "Bankode",
    to: userId,
    amount,
    description: `Bankode reward to user ${userId}`
  })
}
