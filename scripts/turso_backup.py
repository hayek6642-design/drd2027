import json
import urllib.request
import urllib.error
import datetime
import re

TURSO_URL = "https://ytclear-prod-drd2026.aws-eu-west-1.turso.io"
TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQyMjI4MTcsImlkIjoiMDE5ZDE3ZWItYWQwMS03MGQ4LWIxZmUtNTQ3ZWE4ZjI1Mzk3IiwicmlkIjoiZGM5MDcyYTMtNWMwOS00MjcxLTk5YjctMDk1MjhmZmNlMTE5In0.Gn4dKjNGEC3d_s5hH9UbNCZjVEezOxlIpbS3eE3n0rAB59ECbq6KmIzxMwGexa-jC-Q7Yj3AzLmqLa5lELwgAg"

def turso_query(sql):
    payload = json.dumps({
        "requests": [
            {"type": "execute", "stmt": {"sql": sql}},
            {"type": "close"}
        ]
    }).encode()
    req = urllib.request.Request(
        f"{TURSO_URL}/v2/pipeline",
        data=payload,
        headers={
            "Authorization": f"Bearer {TURSO_TOKEN}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e)}

def get_tables():
    res = turso_query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' ORDER BY name")
    results = res.get("results", [])
    if not results or results[0].get("type") == "error":
        print("ERROR getting tables:", res)
        return []
    rows = results[0].get("response", {}).get("result", {}).get("rows", [])
    return [row[0]["value"] for row in rows]

def get_create_stmt(table):
    res = turso_query(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{table}'")
    results = res.get("results", [])
    if not results or results[0].get("type") == "error":
        return f"-- ERROR getting CREATE for {table}"
    rows = results[0].get("response", {}).get("result", {}).get("rows", [])
    if not rows or not rows[0]:
        return f"-- No CREATE statement for {table}"
    return rows[0][0]["value"] or f"-- No CREATE statement for {table}"

def get_indexes(table):
    res = turso_query(f"SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='{table}' AND sql IS NOT NULL ORDER BY name")
    results = res.get("results", [])
    if not results or results[0].get("type") == "error":
        return []
    rows = results[0].get("response", {}).get("result", {}).get("rows", [])
    return [row[0]["value"] for row in rows if row[0]["value"]]

def get_rows(table):
    res = turso_query(f"SELECT * FROM \"{table}\"")
    results = res.get("results", [])
    if not results or results[0].get("type") == "error":
        err = results[0].get("error", {}) if results else {}
        print(f"  WARN: {table} - {err.get('message','unknown error')}")
        return [], []
    result = results[0].get("response", {}).get("result", {})
    cols = [c["name"] for c in result.get("cols", [])]
    rows = result.get("rows", [])
    return cols, rows

def escape_value(cell):
    if cell is None:
        return "NULL"
    t = cell.get("type", "null")
    v = cell.get("value")
    if t == "null" or v is None:
        return "NULL"
    if t in ("integer", "float"):
        return str(v)
    # text / blob
    s = str(v)
    s = s.replace("'", "''")
    return f"'{s}'"

def row_to_insert(table, cols, row):
    col_list = ", ".join(f'"{c}"' for c in cols)
    val_list = ", ".join(escape_value(cell) for cell in row)
    return f'INSERT OR IGNORE INTO "{table}" ({col_list}) VALUES ({val_list});'

# ── Main ──────────────────────────────────────────────────────────────────────
print("Connecting to Turso...")
tables = get_tables()
print(f"Found {len(tables)} tables: {tables}")

now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
lines = []

lines.append(f"""-- ============================================================
-- DRD2027 — FULL DATABASE BACKUP
-- Project : DRD2027 (Codebank App)
-- Source  : Turso (libsql) — ytclear-prod-drd2026.aws-eu-west-1.turso.io
-- Created : {now}
-- ============================================================
-- PORTABLE FORMAT: SQLite 3 compatible (default target)
-- Migration notes at bottom of file
-- ============================================================

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;
""")

total_rows = 0

for table in sorted(tables):
    print(f"  Dumping: {table}")
    create_sql = get_create_stmt(table)
    indexes = get_indexes(table)
    cols, rows = get_rows(table)

    lines.append(f"-- ────────────────────────────────────────────────────────────")
    lines.append(f"-- TABLE: {table}  ({len(rows)} rows)")
    lines.append(f"-- ────────────────────────────────────────────────────────────")
    lines.append(f"DROP TABLE IF EXISTS \"{table}\";")
    lines.append(create_sql + ";")
    lines.append("")

    for idx_sql in indexes:
        lines.append(idx_sql + ";")
    if indexes:
        lines.append("")

    if rows and cols:
        for row in rows:
            lines.append(row_to_insert(table, cols, row))
        total_rows += len(rows)
    lines.append("")

lines.append("COMMIT;")
lines.append("PRAGMA foreign_keys = ON;")
lines.append("")
lines.append(f"""
-- ============================================================
-- SUMMARY
-- Tables : {len(tables)}
-- Total rows backed up: {total_rows}
-- ============================================================

-- ============================================================
-- MIGRATION NOTES
-- ============================================================
-- To restore to a NEW SQLite / Turso database:
--   1. Run this entire file via the Turso CLI:
--        turso db shell <new-db-name> < drd2027_backup.sql
--      OR via sqlite3:
--        sqlite3 new.db < drd2027_backup.sql
--
-- To migrate to PostgreSQL:
--   1. Replace: "TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob...)))"
--      with:    "UUID PRIMARY KEY DEFAULT gen_random_uuid()"
--   2. Replace: "INTEGER" autoincrement → "SERIAL"
--   3. Replace: "CURRENT_TIMESTAMP" → "NOW()"
--   4. Remove:  PRAGMA statements
--   5. Replace: INSERT OR IGNORE → INSERT ON CONFLICT DO NOTHING
--   6. Run via psql: psql <connection_string> -f drd2027_backup.sql
--
-- To migrate to PlanetScale / MySQL:
--   1. Replace UUID generation with UUID()
--   2. Replace TEXT → VARCHAR(255) where needed
--   3. Replace BOOLEAN → TINYINT(1)
--
-- To migrate to Neon / Supabase (PostgreSQL-compatible):
--   Follow the PostgreSQL steps above.
--   Neon connection string format:
--   postgresql://user:pass@host.neon.tech/dbname?sslmode=require
-- ============================================================
""")

output = "\n".join(lines)
out_path = "/tmp/drd2027_backup.sql"
with open(out_path, "w", encoding="utf-8") as f:
    f.write(output)

print(f"\nBackup written to: {out_path}")
print(f"Tables: {len(tables)} | Rows: {total_rows}")
