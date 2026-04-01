export class UsersManager {
  constructor() {
    this.users = []
  }

  addUser(user) {
    this.users.push({ ...user, balance: user.balance || 0, assets: user.assets || [] })
  }

  getUser(userId) {
    return this.users.find(u => u.id === userId)
  }

  updateBalance(userId, amount) {
    const user = this.getUser(userId)
    if (!user) throw new Error("User not found")
    if (user.balance + amount < 0) throw new Error("Insufficient balance")
    user.balance += amount
    return user.balance
  }

  addAsset(userId, assetId) {
    const user = this.getUser(userId)
    if (!user.assets.includes(assetId)) user.assets.push(assetId)
  }

  removeAsset(userId, assetId) {
    const user = this.getUser(userId)
    if (!user) throw new Error("User not found")
    user.assets = user.assets.filter(a => a !== assetId)
  }
}
