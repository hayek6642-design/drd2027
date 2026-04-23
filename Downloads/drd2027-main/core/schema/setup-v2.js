
import { DbAdapter } from '../../sqlite/sqlite-server-adapter.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SCHEMA_SQL = `
-- Drop tables if they exist (for clean setup during dev, careful in prod!)
DROP TABLE IF EXISTS ledger_events CASCADE;
DROP TABLE IF EXISTS asset_balances CASCADE;
DROP TABLE IF EXISTS auth_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AUTH SESSIONS
CREATE TABLE IF NOT EXISTS auth_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ASSET BALANCES (Strict Non-Negative)
CREATE TABLE IF NOT EXISTS asset_balances (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, asset_type)
);

-- 4. LEDGER EVENTS (Append Only)
CREATE TABLE IF NOT EXISTS ledger_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    event_type TEXT NOT NULL, -- 'GRANT', 'LOCK', 'SPEND', 'RELEASE'
    asset_type TEXT NOT NULL,
    amount NUMERIC,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_token ON auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger_events(event_type);
`;

async function runMigration() {
    console.log('🔌 Connecting to Neon...');
    try {
        await DbAdapter.connect();
        console.log('✅ Connected.');

        console.log('📜 Running Schema SQL...');
        const res = await DbAdapter.query(SCHEMA_SQL);
        console.log('✅ Schema applied successfully.');

        // Validation query
        const tables = await DbAdapter.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'auth_sessions', 'asset_balances', 'ledger_events');
        `);
        console.table(tables.rows);

    } catch (err) {
        console.error('❌ Migration Failed:', err);
    } finally {
        await DbAdapter.disconnect();
        console.log('👋 Disconnected.');
    }
}

runMigration();
