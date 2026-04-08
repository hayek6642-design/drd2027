import { BasePolicy } from "./BasePolicy.js"

export class LikePolicy extends BasePolicy {
  validate({ fromUser, toUser, amount, likeType }) {
    if (!fromUser || !toUser) throw new Error("Invalid users")
    if (amount <= 0) throw new Error("Invalid amount")
  }

  buildTransaction({ fromUser, toUser, amount, likeType }) {
    return {
      type: "UserToUser",
      from: fromUser,
      to: toUser,
      amount,
      description: `LikePolicy:${likeType}`
    }
  }
}
