import { BaseRepository } from "./BaseRepository.js"

export class BalancesRepository extends BaseRepository {
  async upsertUser(userId, client) {
    const c = client || (this.client && this.client.pool)
    await c.query(
      `INSERT INTO balances(user_id, balance) VALUES($1, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    )
  }

  async applyTransfer(actor, target, amount, client) {
    const c = client || (this.client && this.client.pool)
    await this.upsertUser(actor, c)
    await this.upsertUser(target, c)
    await c.query(`UPDATE balances SET balance = balance - $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`, [actor, amount])
    await c.query(`UPDATE balances SET balance = balance + $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`, [target, amount])
  }

  async applyDebit(userId, amount, client) {
    const c = client || (this.client && this.client.pool)
    await this.upsertUser(userId, c)
    await c.query(`UPDATE balances SET balance = balance - $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`, [userId, amount])
  }

  async applyCredit(userId, amount, client) {
    const c = client || (this.client && this.client.pool)
    await this.upsertUser(userId, c)
    await c.query(`UPDATE balances SET balance = balance + $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`, [userId, amount])
  }
}
