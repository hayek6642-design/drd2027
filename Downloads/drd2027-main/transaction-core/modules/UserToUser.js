export function userToUser(transactionManager, senderId, receiverId, amount) {
  transactionManager.executeTransaction({
    type: "UserToUser",
    from: senderId,
    to: receiverId,
    amount,
    description: `Transfer from user ${senderId} to user ${receiverId}`
  })
}
