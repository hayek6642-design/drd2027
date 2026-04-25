/**
 * Database Migration Runner
 * Applies pending migrations to the database
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export class MigrationRunner {
  constructor(dbAdapter) {
    this.dbAdapter = dbAdapter;
    this.appliedMigrations = new Set();
  }

  async runPendingMigrations() {
    try {
      // Ensure migrations directory exists
      await fs.ensureDir(MIGRATIONS_DIR);

      // Get all migration files
      const files = await fs.readdir(MIGRATIONS_DIR);
      const migrations = files
        .filter(f => f.endsWith('.js'))
        .sort();

      if (migrations.length === 0) {
        console.log('[Migrations] No migrations found');
        return;
      }

      console.log(`[Migrations] Found ${migrations.length} migration(s)`);

      for (const file of migrations) {
        const migrationName = file.replace('.js', '');
        
        // Skip if already applied
        if (this.appliedMigrations.has(migrationName)) {
          continue;
        }

        try {
          const migrationPath = path.join(MIGRATIONS_DIR, file);
          const module = await import(`file://${migrationPath}`);
          const { up } = module;

          if (!up) {
            console.warn(`[Migrations] ${file} missing 'up' function`);
            continue;
          }

          console.log(`[Migrations] Applying: ${file}`);
          await up(this.dbAdapter);
          
          this.appliedMigrations.add(migrationName);
          console.log(`[Migrations] ✓ Applied: ${file}`);
        } catch (err) {
          console.error(`[Migrations] ✗ Error applying ${file}:`, err.message);
          // Continue with other migrations instead of failing completely
        }
      }

      console.log(`[Migrations] Complete: ${this.appliedMigrations.size}/${migrations.length} applied`);
    } catch (err) {
      console.error('[Migrations] Runner error:', err.message);
    }
  }

  async rollback(count = 1) {
    try {
      const files = await fs.readdir(MIGRATIONS_DIR);
      const migrations = files
        .filter(f => f.endsWith('.js'))
        .sort()
        .reverse()
        .slice(0, count);

      for (const file of migrations) {
        try {
          const migrationPath = path.join(MIGRATIONS_DIR, file);
          const module = await import(`file://${migrationPath}`);
          const { down } = module;

          if (!down) {
            console.warn(`[Migrations] ${file} missing 'down' function`);
            continue;
          }

          console.log(`[Migrations] Rolling back: ${file}`);
          await down(this.dbAdapter);
          console.log(`[Migrations] ✓ Rolled back: ${file}`);
        } catch (err) {
          console.error(`[Migrations] Error rolling back ${file}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[Migrations] Rollback error:', err.message);
    }
  }
}

export default MigrationRunner;
