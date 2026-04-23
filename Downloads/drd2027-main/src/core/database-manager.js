// src/core/database-manager.js
/**
 * Database Manager with WAL Mode + Transaction Queue
 * Solves "Database Locked" errors and improves concurrency
 */

class DatabaseManager {
  constructor() {
    this.db = null;
    this.queue = [];
    this.isProcessing = false;
    this.writeQueue = [];
    this.batchSize = 50;
    this.flushInterval = 100; // ms
    this.maxRetries = 3;
    
    this.metrics = {
      queued: 0,
      processed: 0,
      errors: 0,
      avgWaitTime: 0
    };
    
    this.init();
  }

  async init() {
    // Initialize SQLite with WAL mode
    this.db = await this.openDatabase();
    
    // Enable WAL mode for better concurrency
    await this.exec('PRAGMA journal_mode = WAL;');
    await this.exec('PRAGMA synchronous = NORMAL;');
    await this.exec('PRAGMA cache_size = 10000;');
    await this.exec('PRAGMA temp_store = MEMORY;');
    await this.exec('PRAGMA mmap_size = 268435456;'); // 256MB memory mapping
    
    // Start batch processor
    this.startBatchProcessor();
    
    console.log('[DatabaseManager] WAL mode enabled, queue started');
  }

  async openDatabase() {
    // Check environment
    if (typeof window !== 'undefined' && window.sqlitePlugin) {
      // Cordova/Capacitor SQLite
      return window.sqlitePlugin.openDatabase({
        name: 'codebank.db',
        location: 'default',
        androidDatabaseProvider: 'system',
        androidLockWorkaround: 1
      });
    } else if (typeof window !== 'undefined' && window.openDatabase) {
      // WebSQL (legacy)
      return window.openDatabase('codebank', '1.0', 'CodeBank DB', 50 * 1024 * 1024);
    } else {
      // SQL.js for browser testing
      const initSqlJs = await import('sql.js');
      const SQL = await initSqlJs.default({
        locateFile: file => `https://sql.js.org/dist/${file}`
      });
      return new SQL.Database();
    }
  }

  // Queue-based write operations
  async queueWrite(operation) {
    return new Promise((resolve, reject) => {
      const item = {
        id: Math.random().toString(36).substr(2, 9),
        operation,
        resolve,
        reject,
        retries: 0,
        enqueuedAt: Date.now()
      };
      
      this.writeQueue.push(item);
      this.metrics.queued++;
      
      // Process immediately if critical
      if (operation.priority === 'critical') {
        this.processQueue();
      }
    });
  }

  startBatchProcessor() {
    // Process batch every 100ms
    setInterval(() => this.processBatch(), this.flushInterval);
    
    // Also process on beforeunload
    window.addEventListener('beforeunload', () => {
      this.processBatch(true); // Force sync
    });
  }

  async processBatch(force = false) {
    if (this.isProcessing && !force) return;
    if (this.writeQueue.length === 0) return;
    
    this.isProcessing = true;
    
    const batch = this.writeQueue.splice(0, this.batchSize);
    
    try {
      await this.executeBatch(batch);
      
      // Resolve all promises
      batch.forEach(item => {
        const waitTime = Date.now() - item.enqueuedAt;
        this.updateAvgWaitTime(waitTime);
        item.resolve({ id: item.id, processed: true });
      });
      
      this.metrics.processed += batch.length;
      
    } catch (error) {
      // Retry logic
      const retryable = batch.filter(item => {
        if (item.retries < this.maxRetries && this.isRetryableError(error)) {
          item.retries++;
          this.writeQueue.unshift(item); // Re-queue at front
          return false;
        }
        return true;
      });
      
      // Reject failed items
      retryable.forEach(item => {
        item.reject(error);
        this.metrics.errors++;
      });
    } finally {
      this.isProcessing = false;
      
      // Process more if queue still has items
      if (this.writeQueue.length > 0 && !force) {
        setTimeout(() => this.processBatch(), 0);
      }
    }
  }

  async executeBatch(batch) {
    const operations = batch.map(item => item.operation);
    
    // Group by type for efficiency
    const grouped = this.groupOperations(operations);
    
    // Execute in transaction
    await this.beginTransaction();
    
    try {
      for (const group of grouped) {
        switch (group.type) {
          case 'INSERT':
            await this.executeBulkInsert(group.table, group.records);
            break;
          case 'UPDATE':
            await this.executeBulkUpdate(group.table, group.records);
            break;
          case 'DELETE':
            await this.executeBulkDelete(group.table, group.ids);
            break;
          default:
            for (const op of group.operations) {
              await this.exec(op.sql, op.params);
            }
        }
      }
      
      await this.commitTransaction();
      
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }

  groupOperations(operations) {
    const groups = [];
    let currentGroup = null;
    
    for (const op of operations) {
      if (op.type === 'INSERT' && op.table) {
        if (!currentGroup || currentGroup.type !== 'INSERT' || currentGroup.table !== op.table) {
          currentGroup = { type: 'INSERT', table: op.table, records: [] };
          groups.push(currentGroup);
        }
        currentGroup.records.push(op.data);
      } else {
        // Non-bulk operations
        if (!currentGroup || currentGroup.type !== 'MIXED') {
          currentGroup = { type: 'MIXED', operations: [] };
          groups.push(currentGroup);
        }
        currentGroup.operations.push(op);
      }
    }
    
    return groups;
  }

  async executeBulkInsert(table, records) {
    if (records.length === 0) return;
    
    // Generate bulk insert SQL
    const columns = Object.keys(records[0]);
    const placeholders = records.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`;
    
    const params = records.flatMap(r => columns.map(c => r[c]));
    
    await this.exec(sql, params);
  }

  async executeBulkUpdate(table, records) {
    for (const record of records) {
      const id = record.id;
      delete record.id;
      
      const sets = Object.keys(record).map(k => `${k} = ?`).join(', ');
      const sql = `UPDATE ${table} SET ${sets} WHERE id = ?`;
      
      await this.exec(sql, [...Object.values(record), id]);
    }
  }

  async executeBulkDelete(table, ids) {
    const placeholders = ids.map(() => '?').join(',');
    await this.exec(`DELETE FROM ${table} WHERE id IN (${placeholders})`, ids);
  }

  // Transaction helpers
  async beginTransaction() {
    await this.exec('BEGIN IMMEDIATE');
  }

  async commitTransaction() {
    await this.exec('COMMIT');
  }

  async rollbackTransaction() {
    await this.exec('ROLLBACK');
  }

  // Read operations (direct, no queue)
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(sql, params, (tx, results) => {
          const rows = [];
          for (let i = 0; i < results.rows.length; i++) {
            rows.push(results.rows.item(i));
          }
          resolve(rows);
        }, (tx, error) => {
          reject(error);
        });
      });
    });
  }

  // Execute with retry
  async exec(sql, params = []) {
    let lastError;
    
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await this.executeSql(sql, params);
      } catch (error) {
        lastError = error;
        
        if (this.isRetryableError(error) && i < this.maxRetries - 1) {
          await this.delay(Math.pow(2, i) * 100); // Exponential backoff
        } else {
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  executeSql(sql, params) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(sql, params, 
          (tx, result) => resolve(result),
          (tx, error) => reject(error)
        );
      });
    });
  }

  isRetryableError(error) {
    const retryableCodes = [
      'SQLITE_BUSY',
      'SQLITE_LOCKED',
      'database is locked',
      'BUSY'
    ];
    
    return retryableCodes.some(code => 
      error.message?.includes(code) || error.code?.includes(code)
    );
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateAvgWaitTime(waitTime) {
    const alpha = 0.1; // Smoothing factor
    this.metrics.avgWaitTime = 
      (alpha * waitTime) + ((1 - alpha) * this.metrics.avgWaitTime);
  }

  // Public API for code generation (high frequency)
  async queueCodeGeneration(codeData) {
    return this.queueWrite({
      type: 'INSERT',
      table: 'codes',
      data: {
        ...codeData,
        created_at: Date.now(),
        status: 'active'
      },
      priority: codeData.critical ? 'critical' : 'normal'
    });
  }

  // Public API for ledger updates
  async queueLedgerUpdate(ledgerData) {
    return this.queueWrite({
      type: 'UPDATE',
      table: 'ledger',
      data: ledgerData,
      priority: 'critical'
    });
  }

  // Get queue status
  getStatus() {
    return {
      queueLength: this.writeQueue.length,
      isProcessing: this.isProcessing,
      metrics: { ...this.metrics },
      walMode: true
    };
  }

  // Emergency flush
  async emergencyFlush() {
    return this.processBatch(true);
  }
}

// Export singleton
export const dbManager = new DatabaseManager();

// Global access
window.DatabaseManager = dbManager;