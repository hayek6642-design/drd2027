#!/bin/bash

# Phase 1: One-Time Migration to Turso
# This script performs a full schema and data migration to Turso with libSQL compatibility

DB_FILE="data.sqlite"
SCHEMA_FILE="ytclear-schema.sql"
DATA_DUMP_FILE="ytclear-data.sql"
FULL_DUMP_FILE="ytclear-full.sql"
TURSO_DB_NAME="ytclear-prod"
BACKUP_FILE="data.sqlite.bak.$(date +%Y%m%d_%H%M%S)"

echo "🔍 Starting ROBUST FULL migration process for $DB_FILE..."

# 1. Check for Turso CLI
if ! command -v turso &> /dev/null; then
    echo "⚠️ Turso CLI not found. Please install it first: 'brew install tursodatabase/tap/turso'"
    echo "   Or visit https://docs.turso.tech/cli/introduction"
    exit 1
fi

# 2. Create Backup (Rollback capability)
if [ -f "$DB_FILE" ]; then
    echo "💾 Creating backup of local SQLite: $BACKUP_FILE..."
    cp "$DB_FILE" "$BACKUP_FILE"
else
    echo "❌ Error: $DB_FILE not found!"
    exit 1
fi

# 3. Export full schema and data
echo "📦 Exporting full schema from local SQLite..."
sqlite3 "$DB_FILE" ".schema" > "$SCHEMA_FILE"

# libSQL compatibility: Remove AUTOINCREMENT and other potential issues
# INTEGER PRIMARY KEY is enough for auto-increment in libSQL/SQLite
sed -i '' 's/AUTOINCREMENT//g' "$SCHEMA_FILE"

echo "📦 Exporting full data dump from local SQLite..."
sqlite3 "$DB_FILE" ".dump" > "$FULL_DUMP_FILE"
# Again, remove AUTOINCREMENT from the dump if any
sed -i '' 's/AUTOINCREMENT//g' "$FULL_DUMP_FILE"

echo "✅ Export complete."

# 4. Create Turso database (if not exists)
echo "🚀 Ensuring Turso database '$TURSO_DB_NAME' exists..."
turso db create "$TURSO_DB_NAME" 2>/dev/null || echo "ℹ️ Database might already exist, continuing..."

# 5. Clean start: Optional - user might want to keep existing data? 
# But for a "Full Schema Migration" we usually want a clean state.
# Let's just apply the dump which usually handles CREATE TABLE IF NOT EXISTS if dumped correctly.
# However, standard .dump includes CREATE TABLE (without IF NOT EXISTS).

echo "📥 Importing everything to Turso (this may take a while)..."
# We use the full dump which includes schema and data
turso db shell "$TURSO_DB_NAME" < "$FULL_DUMP_FILE"

# 6. Verification
echo "📊 Verifying tables in Turso..."
LOCAL_TABLE_COUNT=$(sqlite3 "$DB_FILE" "SELECT count(*) FROM sqlite_master WHERE type='table';")
REMOTE_TABLE_COUNT=$(turso db shell "$TURSO_DB_NAME" ".tables" | wc -w | tr -d '[:space:]')

echo "   - Local Tables: $LOCAL_TABLE_COUNT"
echo "   - Turso Tables: $REMOTE_TABLE_COUNT"

# Check specific critical tables mentioned in actly.md
echo "🔍 Checking critical tables..."
CRITICAL_TABLES=("codes" "users" "event_store" "sessions")
for TABLE in "${CRITICAL_TABLES[@]}"; do
    COUNT=$(turso db shell "$TURSO_DB_NAME" "SELECT count(*) FROM $TABLE;" 2>/dev/null | tail -n 1 | tr -d '[:space:]')
    if [ -n "$COUNT" ] && [[ "$COUNT" =~ ^[0-9]+$ ]]; then
        echo "   ✅ Table '$TABLE' exists with $COUNT rows."
    else
        echo "   ❌ Table '$TABLE' is MISSING or could not be queried!"
        # Attempt manual creation if missing
        case $TABLE in
            "event_store")
                echo "   🛠️ Attempting to create missing table '$TABLE'..."
                turso db shell "$TURSO_DB_NAME" "CREATE TABLE IF NOT EXISTS event_store (id INTEGER PRIMARY KEY, event_type TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER);"
                ;;
            "codes")
                echo "   🛠️ Attempting to create missing table '$TABLE'..."
                turso db shell "$TURSO_DB_NAME" "CREATE TABLE IF NOT EXISTS codes (id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, user_id TEXT, created_at INTEGER, meta TEXT);"
                ;;
            "users")
                echo "   🛠️ Attempting to create missing table '$TABLE'..."
                turso db shell "$TURSO_DB_NAME" "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT, password TEXT NOT NULL, created_at INTEGER, updated_at INTEGER);"
                ;;
            "sessions")
                echo "   🛠️ Attempting to create missing table '$TABLE'..."
                turso db shell "$TURSO_DB_NAME" "CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT, created_at INTEGER, expires_at INTEGER);"
                ;;
        esac
    fi
done

echo "🎉 Migration Phase 1 (Full Schema & Data) Complete!"
echo "--------------------------------------------------"
echo "Next Steps:"
echo "1. Get your Turso URL: 'turso db show $TURSO_DB_NAME --url'"
echo "2. Get your Auth Token: 'turso db tokens create $TURSO_DB_NAME'"
echo "3. Update your .env file with:"
echo "   TURSO_URL=libsql://$TURSO_DB_NAME-[your-user].turso.io"
echo "   TURSO_TOKEN=[your-token]"
echo "--------------------------------------------------"
