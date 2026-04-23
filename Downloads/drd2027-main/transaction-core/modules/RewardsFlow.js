export function rewardLike(transactionManager, fromUser, toUser, amount, likeType) {
  transactionManager.executeTransaction({
    type: "UserToUser",
    from: fromUser,
    to: toUser,
    amount,
    description: `Reward ${likeType} from ${fromUser} to ${toUser}`
  })
}
