# Firebase / Firestore Removed

This project uses **PostgreSQL (via Drizzle ORM)** for all data persistence.

Firebase / Firestore is NOT used. The `firestore.rules` file uploaded previously
has been superseded by server-side route authentication in:

  codebank/pebalaash/server/routes.ts

## Balloon Points System

- Points are stored in `wallets.balloon_points` column
- Every pop is logged in `balloon_logs` table
- Migration: `codebank/pebalaash/migration-v3.sql`

## Integration

See: `services/balloon/balloon.service.js`
