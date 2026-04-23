import { BasePolicy } from "./BasePolicy.js"

export class CreatorIncentivePolicy extends BasePolicy {
  validate({ toUser, amount, reason }) {
    if (!toUser) throw new Error("Invalid user")
    if (amount <= 0) throw new Error("Invalid incentive")
  }

  buildTransaction({ toUser, amount, reason }) {
    return {
      type: "BankodeToUser",
      from: "Bankode",
      to: toUser,
      amount,
      description: reason ? `CreatorIncentive:${reason}` : "CreatorIncentive"
    }
  }
}
