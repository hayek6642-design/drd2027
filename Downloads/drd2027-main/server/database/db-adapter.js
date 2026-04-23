/**
 * CodeBank Database Adapter
 * Works with: better-sqlite3 (local) OR @libsql/client (Turso)
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import BetterSqlite3 from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseAdapter {
  constructor() {
    this.db = null;
    this.isTurso = false;
    this.isConnected = false;

    this.config = {
      localPath: process.env.DB_PATH || './data/codebank.db',
      tursoUrl: process.env.TURSO_DATABASE_URL,
      tursoToken: process.env.TURSO_AUTH_TOKEN
    };
  }

  async init() {
    try {
      if (this.config.tursoUrl && this.config.tursoToken) {
        await this.connectTurso();
      } else {
        this.connectLocal();
      }

      this.isConnected = true;
      console.log('[DB] Connected:', this.isTurso ? 'Turso' : 'Local SQLite');

      await this.setupTables();

    } catch (err) {
      console.error('[DB] Connection failed:', err.message);
      // Don't throw - let server continue without DB
    }
  }

  connectLocal() {
    try {
      const dir = path.dirname(this.config.localPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      this.db = new BetterSqlite3(this.config.localPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      this.isTurso = false;
    } catch (e) {
      console.error('[DB] better-sqlite3 not available:', e.message);
      this.isTurso = false;
    }
  }

  async connectTurso() {
    try {
      const libsql = await import('@libsql/client');
      this.db = libsql.createClient({
        url: this.config.tursoUrl,
        authToken: this.config.tursoToken
      });
      this.isTurso = true;
    } catch (e) {
      console.error('[DB] Turso client not available:', e.message);
      this.connectLocal();
    }
  }

  async query(sql, params = []) {
    if (!this.isConnected || !this.db) return [];

    if (this.isTurso) {
      const result = await this.db.execute({ sql, args: params });
      return result.rows;
    } else {
      const stmt = this.db.prepare(sql);
      return stmt.all(...params);
    }
  }

  async queryOne(sql, params = []) {
    const results = await this.query(sql, params);
    return results[0] || null;
  }

  async execute(sql, params = []) {
    if (!this.isConnected || !this.db) return { changes: 0 };

    if (this.isTurso) {
      const result = await this.db.execute({ sql, args: params });
      return { lastInsertRowid: result.lastInsertRowid, changes: result.rowsAffected };
    } else {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...params);
      return { lastInsertRowid: result.lastInsertRowid, changes: result.changes };
    }
  }

  async getUserAssets(userId) {
    const [codes, silver, gold] = await Promise.all([
      this.query('SELECT * FROM codes WHERE user_id = ? AND status = ?', [userId, 'active']),
      this.query('SELECT * FROM silver WHERE user_id = ?', [userId]),
      this.query('SELECT * FROM gold WHERE user_id = ?', [userId])
    ]);

    return {
      codes: codes || [],
      silver: silver || [],
      gold: gold || [],
      counts: {
        codes: codes?.length || 0,
        silver: silver?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0,
        gold: gold?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0
      }
    };
  }

  async saveCode(data) {
    await this.execute(`
      INSERT INTO codes (id, user_id, code, value, source, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = ?
    `, [data.id, data.userId, data.code, data.value, data.source,
        JSON.stringify(data.metadata), Date.now(), Date.now()]);
    return data;
  }

  async updateSilver(userId, amount, type, source) {
    const current = await this.queryOne('SELECT * FROM silver WHERE user_id = ?', [userId]);
    const currentAmount = current?.amount || 0;
    const newAmount = currentAmount + amount;

    if (newAmount < 0) throw new Error('Insufficient silver');

    const id = current?.id || `slv_${Date.now()}_${userId}`;
    await this.execute(`
      INSERT INTO silver (id, user_id, amount, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET amount = excluded.amount, updated_at = excluded.updated_at
    `, [id, userId, newAmount, Date.now()]);

    return { id, amount: newAmount };
  }

  async updateGold(userId, amount, type, source) {
    const current = await this.queryOne('SELECT * FROM gold WHERE user_id = ?', [userId]);
    const currentAmount = current?.amount || 0;
    const newAmount = currentAmount + amount;

    if (newAmount < 0) throw new Error('Insufficient gold');

    const id = current?.id || `gld_${Date.now()}_${userId}`;
    await this.execute(`
      INSERT INTO gold (id, user_id, amount, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET amount = excluded.amount, updated_at = excluded.updated_at
    `, [id, userId, newAmount, Date.now()]);

    return { id, amount: newAmount };
  }

  async setupTables() {
    if (!this.db) return;

    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, username TEXT UNIQUE,
        password_hash TEXT NOT NULL, created_at INTEGER,
        updated_at INTEGER, last_login INTEGER,
        is_active INTEGER DEFAULT 1, metadata TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS codes (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, code TEXT UNIQUE NOT NULL,
        value INTEGER DEFAULT 0, status TEXT DEFAULT 'active', source TEXT DEFAULT 'manual',
        metadata TEXT, created_at INTEGER, updated_at INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS silver (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount INTEGER DEFAULT 0,
        source TEXT, created_at INTEGER, updated_at INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS gold (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount INTEGER DEFAULT 0,
        source TEXT, created_at INTEGER, updated_at INTEGER
      )`
    ];

    for (const sql of tables) {
      try { await this.execute(sql); } catch (e) { /* ignore errors */ }
    }
    console.log('[DB] Tables ready');
  }
}

export default new DatabaseAdapter();