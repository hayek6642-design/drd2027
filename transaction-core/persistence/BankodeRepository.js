import { BaseRepository } from "./BaseRepository.js"

export class BankodeRepository extends BaseRepository {
  async getBalance(client) {
    const c = client || (this.client && this.client.pool)
    const res = await c.query("SELECT balance FROM bankode LIMIT 1")
    const row = res.rows[0]
    return row ? row.balance : 0
  }

  async updateBalance(newBalance, client) {
    const c = client || (this.client && this.client.pool)
    await c.query("UPDATE bankode SET balance=$1", [newBalance])
  }
}
