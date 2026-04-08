import { BaseRepository } from "./BaseRepository.js"
import crypto from "crypto"

export class EventVaultRepository extends BaseRepository {
  async insert({ event_type, actor_user_id, target_user_id, amount, asset_id, metadata, status }, client) {
    const c = client || (this.client && this.client.pool)
    const payload = { event_type, actor_user_id, target_user_id, amount, asset_id, metadata: metadata || {}, status: status || 'success' }
    const txHash = crypto.createHash('sha256').update(JSON.stringify({ ...payload, ts: Date.now() })).digest('hex')
    const res = await c.query(
      `INSERT INTO event_vault(event_type, actor_user_id, target_user_id, amount, asset_id, metadata, status, tx_hash)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [payload.event_type, payload.actor_user_id || null, payload.target_user_id || null, payload.amount || null, payload.asset_id || null, JSON.stringify(payload.metadata), payload.status, txHash]
    )
    return res.rows[0]?.id
  }
}
