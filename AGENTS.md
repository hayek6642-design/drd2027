# Agent Memory - drd2027

## Database Fix Instructions

My database is **Turso cloud** (confirmed in logs: `libsql://ytclear-prod-drd2026.aws-eu-west-1.turso.io`). 

I need you to fix the schema by adding `conversation_id` column to two tables:

**Option A - Turso CLI (Immediate fix):**
```bash
turso db shell ytclear-prod-drd2026
```
Then run:
```sql
ALTER TABLE e7ki_messages ADD COLUMN conversation_id TEXT;
ALTER TABLE zagel_messages ADD COLUMN conversation_id TEXT;
CREATE INDEX IF NOT EXISTS idx_e7ki_messages_conversation_id ON e7ki_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_zagel_messages_conversation_id ON zagel_messages(conversation_id);
```

**Option B - Runtime Migration (Recommended):**
Add this to `server.js` startup to auto-fix on next deploy:
```javascript
async function fixSchema() {
  try {
    await db.execute(`ALTER TABLE e7ki_messages ADD COLUMN conversation_id TEXT`);
  } catch(e) { /* ignore if exists */ }
  try {
    await db.execute(`ALTER TABLE zagel_messages ADD COLUMN conversation_id TEXT`);
  } catch(e) { /* ignore if exists */ }
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_e7ki_messages_conversation_id ON e7ki_messages(conversation_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_zagel_messages_conversation_id ON zagel_messages(conversation_id)`);
  console.log('[DB] Schema migration complete');
}
fixSchema();
```

Use **Option B** so it auto-fixes on every deploy without manual CLI work.