export class PolicyEngine {
  constructor(transactionManager) {
    this.tm = transactionManager
    this.policies = new Map()
  }

  register(name, policy) {
    this.policies.set(name, policy)
  }

  run(name, context) {
    const policy = this.policies.get(name)
    if (!policy) throw new Error("Policy not registered")
    return policy.execute(context)
  }
}
