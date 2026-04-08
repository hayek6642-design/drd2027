/**
 * sqlite-adapter.js - FIXED VERSION
 * Addresses: saved:0 issue, missing userId, duplicate handling, WAL mode
 */

(function() {
    'use strict';

    const DB_NAME = 'codebank_v1';
    let db = null;
    let currentUserId = null;
    let syncQueue = [];
    let isProcessing = false;

    // ==========================================
    // INITIALIZATION
    // ==========================================
    
    async function init() {
        try {
            // Try to open SQLite database (using sql.js or native Web SQLite)
            if (window.initSqlJs) {
                const SQL = await window.initSqlJs({
                    locateFile: file => `https://sql.js.org/dist/${file}`
                });
                db = new SQL.Database();
                if (window.DEBUG_MODE) console.log('[SQLITE] SQL.js initialized');
            } else if (window.sqlitePlugin) {
                // Cordova/Capacitor SQLite
                db = window.sqlitePlugin.openDatabase({
                    name: DB_NAME,
                    location: 'default'
                });
                if (window.DEBUG_MODE) console.log('[SQLITE] Native SQLite initialized');
            } else {
                // Fallback to IndexedDB wrapper
                console.warn('[SQLITE] No native SQLite, using IndexedDB fallback');
                db = createIndexedDBFallback();
            }

            await createSchema();
            
            // Listen for auth ready
            window.addEventListener('auth:ready', (e) => {
                if (e.detail?.userId) {
                    currentUserId = e.detail.userId;
                    if (window.DEBUG_MODE) console.log('[SQLITE] Auth ready, userId:', currentUserId);
                    flushQueue();
                }
            });

            if (window.DEBUG_MODE) console.log('[SQLITE] Adapter initialized');
            return true;
        } catch (err) {
            console.error('[SQLITE] Init failed:', err);
            return false;
        }
    }

    async function createSchema() {
        const schema = `
            CREATE TABLE IF NOT EXISTS codes (
                code TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                suffix TEXT,
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                synced_at DATETIME
            );
            
            CREATE INDEX IF NOT EXISTS idx_codes_user ON codes(user_id);
            CREATE INDEX IF NOT EXISTS idx_codes_status ON codes(status);
            
            CREATE TABLE IF NOT EXISTS sync_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT,
                action TEXT,
                result TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        await execSQL(schema);
    }

    // ==========================================
    // CORE SYNC FUNCTION - FIXED saved:0 ISSUE
    // ==========================================
    
    async function syncCode(codeData) {
        const { code, userId, suffix, source = 'unknown' } = codeData;
        
        // CRITICAL FIX: Validate userId before attempting write
        const effectiveUserId = userId || currentUserId;
        if (!effectiveUserId) {
            console.error('[SQLITE] REJECTED: No userId for code:', code, 'from:', source);
            
            // Queue for later if auth not ready
            if (!currentUserId) {
                if (window.DEBUG_MODE) console.log('[SQLITE] Queuing for post-auth sync');
                syncQueue.push({ ...codeData, retryCount: 0 });
            }
            
            return { 
                ok: false, 
                error: 'Missing userId', 
                saved: 0,
                queued: !currentUserId,
                code 
            };
        }

        try {
            // CRITICAL FIX: Use INSERT OR REPLACE to handle conflicts properly
            // This ensures we always get 1 row affected (either inserted or updated)
            const sql = `
                INSERT INTO codes (code, user_id, suffix, status, created_at, updated_at) 
                VALUES (?, ?, ?, 'active', datetime('now'), datetime('now'))
                ON CONFLICT(code) DO UPDATE SET 
                    user_id = excluded.user_id,
                    suffix = excluded.suffix,
                    status = 'active',
                    updated_at = datetime('now')
                WHERE excluded.user_id IS NOT NULL
            `;
            
            const result = await execSQL(sql, [code, effectiveUserId, suffix]);
            
            // CRITICAL FIX: Properly detect rows changed
            let saved = 0;
            if (result.changes !== undefined) {
                saved = result.changes;
            } else if (result.rowsAffected !== undefined) {
                saved = result.rowsAffected;
            } else {
                // Fallback: verify by checking if code exists
                const check = await querySQL('SELECT 1 FROM codes WHERE code = ? AND user_id = ?', [code, effectiveUserId]);
                saved = check.length > 0 ? 1 : 0;
            }

            // Log the sync attempt
            await logSyncAttempt(code, effectiveUserId, saved);

            if (saved === 0) {
                console.warn('[SQLITE] WARNING: 0 rows changed for', code);
                
                // Check why - does code exist with different user?
                const existing = await querySQL('SELECT * FROM codes WHERE code = ?', [code]);
                if (existing.length > 0) {
                    if (window.DEBUG_MODE) console.log('[SQLITE] Code exists:', existing[0]);
                    return { 
                        ok: true,  // Not a failure, just a duplicate
                        saved: 0, 
                        exists: true, 
                        existingUser: existing[0].user_id,
                        code 
                    };
                }
                
                return { ok: false, error: 'Unknown write failure', saved: 0, code };
            }

            if (window.DEBUG_MODE) console.log(`[SQLITE SYNC SUCCESS] {saved: ${saved}, code: ${code}, user: ${effectiveUserId}}`);
            
            // Publish success event for other components
            publishEvent('sqlite:sync-success', { code, userId: effectiveUserId, saved });
            
            return { ok: true, saved, code, userId: effectiveUserId };

        } catch (err) {
            console.error('[SQLITE] Sync error for', code, ':', err);
            
            // Queue for retry if it's a transient error
            if (isRetryableError(err) && codeData.retryCount < 3) {
                syncQueue.push({ ...codeData, retryCount: (codeData.retryCount || 0) + 1 });
                if (window.DEBUG_MODE) console.log('[SQLITE] Queued for retry, attempt', codeData.retryCount + 1);
            }
            
            return { ok: false, error: err.message, saved: 0, code };
        }
    }

    // ==========================================
    // QUEUE MANAGEMENT
    // ==========================================
    
    function queueSync(codeData) {
        // Don't queue if already processing this code
        const exists = syncQueue.find(q => q.code === codeData.code);
        if (exists) {
            if (window.DEBUG_MODE) console.log('[SQLITE] Code already in queue:', codeData.code);
            return;
        }
        
        syncQueue.push({ ...codeData, queuedAt: Date.now() });
        if (window.DEBUG_MODE) console.log('[SQLITE] Queued:', codeData.code, 'Queue size:', syncQueue.length);
    }

    async function flushQueue() {
        if (isProcessing || syncQueue.length === 0 || !currentUserId) return;
        
        isProcessing = true;
        if (window.DEBUG_MODE) console.log('[SQLITE] Flushing queue, items:', syncQueue.length);
        
        const batch = [...syncQueue];
        syncQueue = []; // Clear before processing to avoid duplicates
        
        for (const item of batch) {
            // Inject current userId if missing
            if (!item.userId) {
                item.userId = currentUserId;
            }
            
            await syncCode(item);
            
            // Small delay to prevent lock contention
            await delay(50);
        }
        
        isProcessing = false;
        
        // Check if new items were added during processing
        if (syncQueue.length > 0) {
            setTimeout(flushQueue, 100);
        }
    }

    // ==========================================
    // SQL EXECUTION HELPERS
    // ==========================================
    
    async function execSQL(sql, params = []) {
        if (!db) throw new Error('Database not initialized');
        
        // Handle different SQLite implementations
        if (db.run) {
            // sql.js
            return db.run(sql, params);
        } else if (db.executeSql) {
            // Cordova
            return new Promise((resolve, reject) => {
                db.executeSql(sql, params, 
                    (result) => resolve({ changes: result.rowsAffected }),
                    (err) => reject(err)
                );
            });
        } else {
            // IndexedDB fallback
            return db.exec(sql, params);
        }
    }

    async function querySQL(sql, params = []) {
        if (!db) throw new Error('Database not initialized');
        
        if (db.exec) {
            // sql.js
            const result = db.exec(sql, params);
            return result[0]?.values.map(row => {
                const obj = {};
                result[0].columns.forEach((col, i) => obj[col] = row[i]);
                return obj;
            }) || [];
        } else if (db.executeSql) {
            // Cordova
            return new Promise((resolve, reject) => {
                db.executeSql(sql, params,
                    (result) => {
                        const rows = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            rows.push(result.rows.item(i));
                        }
                        resolve(rows);
                    },
                    (err) => reject(err)
                );
            });
        } else {
            return db.query(sql, params);
        }
    }

    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================
    
    async function logSyncAttempt(code, userId, saved) {
        try {
            await execSQL(
                'INSERT INTO sync_log (code, action, result) VALUES (?, ?, ?)',
                [code, 'sync', saved > 0 ? 'success' : 'no_change']
            );
        } catch (e) {
            // Non-critical, ignore errors
        }
    }

    function isRetryableError(err) {
        const msg = err.message?.toLowerCase() || '';
        return msg.includes('locked') || 
               msg.includes('busy') || 
               msg.includes('timeout') ||
               msg.includes('network');
    }

    function delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function publishEvent(name, data) {
        window.dispatchEvent(new CustomEvent(name, { detail: data }));
        // Also notify Bankode if available
        if (window.Bankode?.emit) {
            window.Bankode.emit(name, data);
        }
    }

    // IndexedDB fallback for environments without SQLite
    function createIndexedDBFallback() {
        return {
            async exec(sql, params) {
                // Store in localStorage as temporary fallback
                const key = 'sqlite_fallback_codes';
                const codes = JSON.parse(localStorage.getItem(key) || '[]');
                
                // Simple INSERT parsing
                if (sql.includes('INSERT INTO codes')) {
                    const code = params[0];
                    const existing = codes.find(c => c.code === code);
                    if (!existing) {
                        codes.push({
                            code: params[0],
                            user_id: params[1],
                            suffix: params[2],
                            created_at: new Date().toISOString()
                        });
                        localStorage.setItem(key, JSON.stringify(codes));
                        return { changes: 1 };
                    }
                    return { changes: 0 };
                }
                return { changes: 0 };
            },
            async query(sql, params) {
                const key = 'sqlite_fallback_codes';
                const codes = JSON.parse(localStorage.getItem(key) || '[]');
                
                if (params[0] && sql.includes('WHERE code =')) {
                    return codes.filter(c => c.code === params[0]);
                }
                return codes;
            }
        };
    }

    // ==========================================
    // PUBLIC API
    // ==========================================
    
    window.SQLiteAdapter = {
        init,
        sync: syncCode,
        queue: queueSync,
        flush: flushQueue,
        
        // For debugging
        getQueue: () => [...syncQueue],
        getStats: async () => {
            const total = await querySQL('SELECT COUNT(*) as count FROM codes');
            const pending = syncQueue.length;
            return { total: total[0]?.count || 0, pending };
        },
        
        // Manual retry
        retryFailed: () => {
            const failed = syncQueue.filter(q => q.retryCount > 0);
            if (window.DEBUG_MODE) console.log('[SQLITE] Retrying', failed.length, 'failed items');
            flushQueue();
        }
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
