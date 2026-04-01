import { BasePolicy } from "./BasePolicy.js"

export class GameRewardPolicy extends BasePolicy {
  validate({ toUser, amount }) {
    if (!toUser) throw new Error("Invalid user")
    if (amount <= 0) throw new Error("Invalid reward")
  }

  buildTransaction({ toUser, amount }) {
    return {
      type: "BankodeToUser",
      from: "Bankode",
      to: toUser,
      amount,
      description: "GameReward"
    }
  }
}
