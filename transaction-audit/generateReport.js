import { auditTransactions } from './auditTransactions.js'

function generateReport() {
  const report = auditTransactions()
  console.log('=== FULL TRANSACTION AUDIT REPORT ===')
  console.table(report)
}

generateReport()
