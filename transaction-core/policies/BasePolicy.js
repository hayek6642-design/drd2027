export class BasePolicy {
  constructor(transactionManager) {
    this.tm = transactionManager
  }

  validate(context) {
    throw new Error("Policy must implement validate()")
  }

  buildTransaction(context) {
    throw new Error("Policy must implement buildTransaction()")
  }

  execute(context) {
    this.validate(context)
    const tx = this.buildTransaction(context)
    return this.tm.executeTransaction(tx)
  }
}
