# DRD2027 — Database Backup Guide

## Files
| File | Purpose |
|------|---------|
| `drd2027_backup.sql` | Full SQLite-compatible backup (schema + data) |
| `scripts/turso_backup.py` | Script to regenerate the backup from live Turso |

## How to regenerate the backup

Set env vars and run:
```bash
export TURSO_URL=libsql://ytclear-prod-drd2026.aws-eu-west-1.turso.io
export TURSO_TOKEN=<your_turso_auth_token>
python3 scripts/turso_backup.py
```

Output: `drd2027_backup.sql` in the project root.

## How to restore (Turso / SQLite)
```bash
# To a new Turso database:
turso db shell <new-db-name> < drd2027_backup.sql

# To local SQLite:
sqlite3 new.db < drd2027_backup.sql
```

## How to migrate to PostgreSQL (Neon / Supabase / Render Postgres)
1. `sed -i 's/INSERT OR IGNORE/INSERT/g' drd2027_backup.sql`
2. Remove `PRAGMA` lines
3. Replace `CURRENT_TIMESTAMP` with `NOW()`
4. Replace UUID blob generation with `gen_random_uuid()`
5. `psql <connection_string> -f drd2027_backup.sql`

## Update policy
Regenerate and commit `drd2027_backup.sql` any time:
- A new table or column is added to the schema
- Significant data changes occur (new products, user base grows)
- Before/after any migration
