export class Ledger {
  constructor() {
    this.transactions = []
  }

  log(transaction) {
    transaction.timestamp = new Date().toISOString()
    this.transactions.push(transaction)
    console.log("Transaction logged:", transaction)
  }

  getAll() {
    return this.transactions
  }
}
