import pg from 'pg';
const { Pool } = pg;

export const DbAdapter = {
  pool: null,

  connect: async function () {
    if (!this.pool) {
      const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
      if (!url) throw new Error('NEON_DATABASE_URL or DATABASE_URL is not set');

      this.pool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false } // Required for Neon
      });

      // Test connection
      const client = await this.pool.connect();
      client.release();
    }
    return this.pool;
  },

  query: async function (sql, params = []) {
    if (!this.pool) await this.connect();
    return this.pool.query(sql, params);
  },

  disconnect: async function () {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
};
