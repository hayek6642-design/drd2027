import { BaseRepository } from "./BaseRepository.js"

export class LedgerRepository extends BaseRepository {
  async record(entry, client) {
    const c = client || (this.client && this.client.pool)
    const {
      id,
      type,
      from,
      to,
      amount,
      assetId,
      description,
      status,
      error,
      timestamp
    } = entry
    await c.query(
      `INSERT INTO ledger(id, event_type, from_user, to_user, amount, asset_id, status, timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, type, from || null, to || null, amount || null, assetId || null, status || null, timestamp || new Date().toISOString()]
    )
  }

  async projectFromEvent(eventId, client) {
    const c = client || (this.client && this.client.pool)
    await c.query(
      `INSERT INTO ledger(id, event_type, from_user, to_user, amount, asset_id, status, timestamp)
       SELECT id, event_type, actor_user_id, target_user_id, amount, asset_id, status, created_at
       FROM event_vault WHERE id = $1`,
      [eventId]
    )
  }
}
