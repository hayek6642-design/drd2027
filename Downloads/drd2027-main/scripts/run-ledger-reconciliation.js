#!/usr/bin/env node

/**
 * Ledger Reconciliation Script
 * 
 * This script provides a command-line interface to run ledger reconciliation
 * with various options for testing and production use.
 * 
 * Usage:
 *   node scripts/run-ledger-reconciliation.js [options]
 * 
 * Options:
 *   --dry-run     Show what would be detected without taking any action
 *   --report-only Show current ledger state without making corrections
 *   --help        Show this help message
 */

import WatchDog from '../services/watchdog/watchdog.js';
import { query as dbQuery } from '../api/config/db.js';

async function main() {
  const args = process.argv.slice(2);
  
  // Show help if requested
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Ledger Reconciliation Script

Usage: node scripts/run-ledger-reconciliation.js [options]

Options:
  --dry-run     Show what would be detected without taking any action
  --report-only Show current ledger state without making corrections
  --help, -h    Show this help message

Examples:
  node scripts/run-ledger-reconciliation.js --dry-run
  node scripts/run-ledger-reconciliation.js --report-only
  node scripts/run-ledger-reconciliation.js
`);
    process.exit(0);
  }

  // Initialize WatchDog with database query function
  await WatchDog.setDb(dbQuery);

  // Check for report-only mode
  if (args.includes('--report-only')) {
    console.log('🔍 Generating ledger reconciliation report...\n');
    try {
      const result = await WatchDog.reconcile({ dryRun: true });
      console.log('📄 Reconciliation Report:');
      console.log('');
      console.log('User ID | Asset ID | Computed Balance | Issue Type | Transactions');
      console.log('--------|----------|------------------|------------|-------------');
      result.report.forEach(report => {
        const issues = report.issue_type || 'None';
        const transactions = report.transactions || 0;
        console.log(`${report.user_id.padEnd(8)}|${report.asset_id.padEnd(8)}|${report.computed_balance.toFixed(2).padStart(16)}|${issues.padEnd(10)}|${transactions}`);
      });
      console.log('\n✅ Report generation completed successfully');
    } catch (error) {
      console.error('❌ Failed to generate report:', error.message);
      process.exit(1);
    }
    process.exit(0);
  }

  // Check for dry-run mode
  const isDryRun = args.includes('--dry-run');

  if (isDryRun) {
    console.log('🔍 Running ledger reconciliation in DRY RUN mode...\n');
    console.log('This will show what issues would be detected without taking any action.\n');
  } else {
    console.log('🔧 Running ledger reconciliation...\n');
    console.log('This will detect and report issues without making any changes.\n');
  }

  try {
    const result = await WatchDog.reconcile({ dryRun: isDryRun });
    if (result.success) {
      if (isDryRun) {
        console.log('\n✅ Dry run completed successfully');
        console.log('No changes were made - this was a test run');
      } else {
        console.log('\n✅ Ledger reconciliation completed successfully');
        if (result.alerts > 0) {
          console.log(`🚨 ${result.alerts} alerts raised - please review the report`);
        }
      }
    } else {
      console.error('❌ Reconciliation failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Reconciliation failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});