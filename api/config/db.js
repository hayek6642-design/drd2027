import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let db;
let isLibsql = false;

// Helper to convert PG syntax to SQLite
const convertParams = (text) => {
  return text
    .replace(/\$(\d+)/g, '?')
    .replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/now\(\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/gen_random_uuid\(\)/gi, "(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))")
    .replace(/::(int|uuid|text|bigint|jsonb|uuid\[\]|timestamp|timestamptz)/gi, '')
    .replace(/GREATEST\(0,\s*/gi, 'MAX(0, ')
    .replace(/COALESCE\(([^,]+),\s*0\)/gi, 'IFNULL($1, 0)')
    .replace(/SELECT\s+pg_advisory_xact_lock\([^)]+\)/gi, 'SELECT 1') // Advisory locks not needed for SQLite (single writer)
    .replace(/hashtext\([^)]+\)/gi, '1')
}

// 1. Check for Turso (Supports both custom and Turso CLI default env var names)
const tursoUrl = process.env.TURSO_URL || process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (tursoUrl) {
  try {
    // Use HTTP client to bypass native library issues on macOS (libunwind)
    const { createClient } = await import('@libsql/client/http');
    console.log('🚀 [DB] Initializing Turso (libsql/http) connection');
    
    // Convert libsql:// to https:// for the HTTP client if needed
    const httpUrl = tursoUrl.replace('libsql://', 'https://');
    
    db = createClient({
      url: httpUrl,
      authToken: tursoToken
    });
    
    isLibsql = true;
  } catch (e) {
    console.error('❌ [TURSO] Failed to load @libsql/client:', e.message);
    console.warn('⚠️ [TURSO] Falling back to local SQLite due to library error');
  }
}

if (!isLibsql) {
  console.log('🏠 [DB] Initializing Local SQLite (better-sqlite3) connection');
  let Database;
  try {
    const mod = await import('better-sqlite3');
    Database = mod.default;
  } catch (e) {
    console.error('❌ [SQLITE] Failed to load better-sqlite3:', e.message);
    console.warn('⚠️ [SQLITE] Falling back to memory-only mock database');
    Database = class MockDatabase {
      constructor() { console.log('[MOCK DB] Initialized'); }
      pragma() { return this; }
      prepare() {
        return {
          run: () => ({ changes: 0, lastInsertRowid: 0 }),
          all: () => [],
          get: () => null
        };
      }
    };
  }

  const dbPath = process.env.DATABASE_URL?.startsWith('sqlite://') 
    ? process.env.DATABASE_URL.replace('sqlite://', '')
    : (process.env.SQLITE_DB_PATH || path.join(__dirname, '../../data.sqlite'));

  try {
    db = new Database(dbPath)
    if (typeof db.pragma === 'function') {
      try {
        db.pragma('journal_mode = WAL');
      } catch (e) {
        console.warn('⚠️ [SQLITE] WAL mode failed (likely managed environment):', e.message);
      }
    }
  } catch (e) {
    console.error('❌ [SQLITE] Database initialization failed:', e.message);
    db = new class { 
      prepare() { return { run: () => ({}), all: () => [], get: () => null }; }
      pragma() {}
    }();
  }
}

class Client {
  constructor(db) {
    this.db = db
    this.inTransaction = false
    this.tx = null
  }

  async query(text, params = [], options = {}) {
    const sqliteText = convertParams(text)
    const flatParams = (Array.isArray(params) && params.length === 1 && Array.isArray(params[0])) ? params[0] : params
    
    try {
      if (isLibsql) {
        // Libsql implementation (asynchronous)
        const cmd = sqliteText.trim().toUpperCase()
        
        if (cmd === 'BEGIN') {
          if (this.inTransaction) return { rows: [] }
          this.tx = await this.db.transaction()
          this.inTransaction = true
          return { rows: [] }
        }
        
        if (cmd === 'COMMIT') {
          if (!this.inTransaction || !this.tx) return { rows: [] }
          await this.tx.commit()
          this.tx = null
          this.inTransaction = false
          return { rows: [] }
        }
        
        if (cmd === 'ROLLBACK') {
          if (!this.inTransaction || !this.tx) return { rows: [] }
          await this.tx.rollback()
          this.tx = null
          this.inTransaction = false
          return { rows: [] }
        }

        const runner = this.inTransaction ? this.tx : this.db
        const result = await runner.execute({
          sql: sqliteText,
          args: flatParams
        });
        
        return {
          rows: result.rows,
          rowCount: result.rowsAffected,
          lastInsertRowid: result.lastInsertRowid
        };
      } else {
        // Better-sqlite3 implementation (synchronous)
        if (sqliteText.trim().toUpperCase() === 'BEGIN') {
          this.db.prepare('BEGIN').run()
          this.inTransaction = true
          return { rows: [] }
        }
        if (sqliteText.trim().toUpperCase() === 'COMMIT') {
          this.db.prepare('COMMIT').run()
          this.inTransaction = false
          return { rows: [] }
        }
        if (sqliteText.trim().toUpperCase() === 'ROLLBACK') {
          this.db.prepare('ROLLBACK').run()
          this.inTransaction = false
          return { rows: [] }
        }

        const stmt = this.db.prepare(sqliteText)
        if (sqliteText.trim().toUpperCase().startsWith('SELECT') || sqliteText.includes('RETURNING')) {
          const rows = stmt.all(...flatParams)
          return { rows, rowCount: rows.length }
        } else {
          const result = stmt.run(...flatParams)
          return { 
            rows: [], 
            rowCount: result.changes, 
            lastInsertRowid: result.lastInsertRowid 
          }
        }
      }
    } catch (error) {
      if (!options.silent) {
        console.error('[DB] Client Error:', error.message, { text: sqliteText, params })
      }
      throw error
    }
  }

  async batch(operations) {
    if (isLibsql) {
      const results = await this.db.batch(operations.map(op => ({
        sql: convertParams(op.sql),
        args: op.args || []
      })));
      return results;
    } else {
      // Manual transaction for better-sqlite3
      const results = [];
      this.db.prepare('BEGIN').run();
      try {
        for (const op of operations) {
          const sqliteText = convertParams(op.sql);
          const result = this.db.prepare(sqliteText).run(...(op.args || []));
          results.push(result);
        }
        this.db.prepare('COMMIT').run();
        return results;
      } catch (e) {
        this.db.prepare('ROLLBACK').run();
        throw e;
      }
    }
  }

  release() {
    // No-op
  }
}

export const pool = {
  connect: async () => new Client(db),
  query: async (text, params = [], options = {}) => {
    const client = new Client(db)
    return client.query(text, params, options)
  },
  batch: async (operations) => {
    const client = new Client(db)
    return client.batch(operations)
  }
}

export const query = pool.query
export const batch = pool.batch
export { db };
