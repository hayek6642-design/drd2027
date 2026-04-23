import { BasePolicy } from "./BasePolicy.js"

export class StorePolicy extends BasePolicy {
  validate({ fromUser, amount, assetId }) {
    if (!fromUser) throw new Error("Invalid user")
    if (!assetId) throw new Error("Invalid asset")
    if (amount <= 0) throw new Error("Invalid amount")
  }

  buildTransaction({ fromUser, amount, assetId }) {
    return {
      type: "AssetPurchase",
      from: fromUser,
      amount,
      assetId,
      description: "StorePurchase"
    }
  }
}
