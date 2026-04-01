import { pool } from "../../api/config/db.js"

export class SQLiteClient {
  constructor() {
    this.pool = pool
  }

  async transaction(fn) {
    const client = await this.pool.connect()
    try {
      await client.query("BEGIN")
      const result = await fn(client)
      await client.query("COMMIT")
      return result
    } catch (e) {
      try { await client.query("ROLLBACK") } catch (_) {}
      throw e
    } finally {
      if (typeof client.release === 'function') {
        client.release()
      }
    }
  }
}
