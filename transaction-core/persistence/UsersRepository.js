import { BaseRepository } from "./BaseRepository.js"

export class UsersRepository extends BaseRepository {
  async get(id, client) {
    const c = client || (this.client && this.client.pool)
    const res = await c.query("SELECT id, email FROM users WHERE id=$1", [id])
    const user = res.rows[0] || null
    let balance = 0
    try {
      const b = await c.query("SELECT balance FROM balances WHERE user_id=$1", [id])
      balance = (b.rows[0] && b.rows[0].balance) || 0
    } catch(_) {}
    let assets = []
    try {
      const ares = await c.query("SELECT asset_id FROM user_assets WHERE user_id=$1", [id])
      assets = ares.rows.map(r => r.asset_id)
    } catch (_) {}
    return user ? { ...user, balance, assets } : null
  }

  async updateBalance(id, newBalance, client) {
    const c = client || (this.client && this.client.pool)
    await c.query("INSERT INTO balances(user_id, balance) VALUES($1,$2) ON CONFLICT (user_id) DO UPDATE SET balance=$2, updated_at=CURRENT_TIMESTAMP", [id, newBalance])
  }

  async addAsset(id, asset, client) {
    const c = client || (this.client && this.client.pool)
    await c.query(
      "INSERT INTO user_assets(user_id, asset_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [id, asset]
    )
  }

  async removeAsset(id, asset, client) {
    const c = client || (this.client && this.client.pool)
    await c.query("DELETE FROM user_assets WHERE user_id=$1 AND asset_id=$2", [id, asset])
  }
}
