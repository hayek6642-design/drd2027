/**
 * Assets Central Core (ACC) Server
 * المصدر الوحيد للحقيقة لإدارة الأصول
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@libsql/client');
const WebSocket = require('ws');
const http = require('http');

class AssetsCentralCore {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        
        // Turso Database
        this.db = createClient({
            url: process.env.TURSO_URL || 'file:local.db',
            authToken: process.env.TURSO_AUTH_TOKEN
        });

        // Asset Cache (Single Source of Truth)
        this.assetsCache = new Map(); // userId -> { codes, silver, gold, lastUpdate }
        
        // Active Connections
        this.connections = new Map(); // userId -> WebSocket[]
        
        // Transaction Queue
        this.transactionQueue = [];
        this.processingQueue = false;

        this.init();
    }

    async init() {
        await this.initDatabase();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.startTransactionProcessor();
        
        const PORT = process.env.ACC_PORT || 3999;
        this.server.listen(PORT, '0.0.0.0', () => {
            console.log(`[ACC] Assets Central Core running on port ${PORT}`);
        });
    }

    async initDatabase() {
        await this.db.execute(`
            CREATE TABLE IF NOT EXISTS user_assets (
                user_id TEXT PRIMARY KEY,
                codes_count INTEGER DEFAULT 0,
                silver_balance INTEGER DEFAULT 0,
                gold_balance INTEGER DEFAULT 0,
                total_earned_silver INTEGER DEFAULT 0,
                total_earned_gold INTEGER DEFAULT 0,
                total_spent_silver INTEGER DEFAULT 0,
                total_spent_gold INTEGER DEFAULT 0,
                last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                version INTEGER DEFAULT 1
            )
        `);

        await this.db.execute(`
            CREATE TABLE IF NOT EXISTS asset_transactions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                type TEXT, -- 'credit', 'debit', 'barter', 'like', 'game_win', 'game_loss', 'transfer'
                asset_type TEXT, -- 'codes', 'silver', 'gold'
                amount INTEGER,
                balance_after INTEGER,
                service TEXT, -- 'pebalaash', 'farragna', 'battalooda', etc.
                description TEXT,
                metadata TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user_assets(user_id)
            )
        `);

        await this.db.execute(`
            CREATE TABLE IF NOT EXISTS service_mirrors (
                user_id TEXT,
                service TEXT,
                last_sync TIMESTAMP,
                sync_status TEXT,
                PRIMARY KEY (user_id, service)
            )
        `);

        console.log('[ACC] Database initialized');
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        
        // ACC Middleware - Inject ACC client to requests
        this.app.use((req, res, next) => {
            req.acc = this;
            next();
        });
    }

    setupRoutes() {
        // Get Assets (Mirror Request)
        this.app.get('/acc/assets/:userId', async (req, res) => {
            try {
                const { userId } = req.params;
                const assets = await this.getAssets(userId);
                res.json({
                    success: true,
                    data: assets,
                    timestamp: Date.now(),
                    source: 'acc_core'
                });
            } catch (error) {
                console.error('[ACC] Get assets error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Transaction Request
        this.app.post('/acc/transaction', async (req, res) => {
            try {
                const { userId, type, assetType, amount, service, description, metadata } = req.body;
                
                const result = await this.processTransaction({
                    userId,
                    type,
                    assetType,
                    amount,
                    service,
                    description,
                    metadata
                });

                res.json(result);
            } catch (error) {
                console.error('[ACC] Transaction error:', error);
                res.status(400).json({ success: false, error: error.message });
            }
        });

        // Batch Transaction (for games)
        this.app.post('/acc/batch-transaction', async (req, res) => {
            try {
                const { userId, transactions } = req.body;
                const results = [];
                
                for (const tx of transactions) {
                    const result = await this.processTransaction({
                        userId,
                        ...tx,
                        timestamp: Date.now()
                    });
                    results.push(result);
                }

                res.json({ success: true, results });
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        });

        // Sync Request from SafeCode
        this.app.post('/acc/sync', async (req, res) => {
            try {
                const { userId, assets, source } = req.body;
                const result = await this.syncAssets(userId, assets, source);
                res.json(result);
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Health Check
        this.app.get('/acc/health', (req, res) => {
            res.json({
                status: 'healthy',
                activeConnections: this.connections.size,
                cachedUsers: this.assetsCache.size,
                queueLength: this.transactionQueue.length
            });
        });
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            console.log('[ACC] New WebSocket connection');
            
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);
                    await this.handleWebSocketMessage(ws, data);
                } catch (error) {
                    ws.send(JSON.stringify({ error: error.message }));
                }
            });

            ws.on('close', () => {
                this.removeConnection(ws);
            });
        });
    }

    async handleWebSocketMessage(ws, data) {
        const { action, userId, payload } = data;

        switch (action) {
            case 'subscribe':
                // Service subscribing to asset updates
                if (!this.connections.has(userId)) {
                    this.connections.set(userId, new Set());
                }
                this.connections.get(userId).add(ws);
                ws.userId = userId;
                ws.service = payload?.service || 'unknown';
                
                // Send current assets immediately
                const assets = await this.getAssets(userId);
                ws.send(JSON.stringify({
                    type: 'assets_update',
                    data: assets
                }));
                break;

            case 'transaction':
                // Real-time transaction request
                const result = await this.processTransaction({
                    userId,
                    ...payload
                });
                ws.send(JSON.stringify({
                    type: 'transaction_result',
                    data: result
                }));
                break;

            case 'ping':
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                break;
        }
    }

    removeConnection(ws) {
        if (ws.userId && this.connections.has(ws.userId)) {
            this.connections.get(ws.userId).delete(ws);
            if (this.connections.get(ws.userId).size === 0) {
                this.connections.delete(ws.userId);
            }
        }
    }

    async getAssets(userId) {
        // Check cache first
        if (this.assetsCache.has(userId)) {
            const cached = this.assetsCache.get(userId);
            if (Date.now() - cached.lastUpdate < 5000) { // 5 second cache
                return cached;
            }
        }

        // Fetch from database
        const result = await this.db.execute({
            sql: 'SELECT * FROM user_assets WHERE user_id = ?',
            args: [userId]
        });

        if (result.rows.length === 0) {
            // Create new user assets
            const newAssets = {
                user_id: userId,
                codes_count: 0,
                silver_balance: 0,
                gold_balance: 0,
                total_earned_silver: 0,
                total_earned_gold: 0,
                total_spent_silver: 0,
                total_spent_gold: 0,
                version: 1
            };
            
            await this.db.execute({
                sql: `INSERT INTO user_assets 
                      (user_id, codes_count, silver_balance, gold_balance, version) 
                      VALUES (?, ?, ?, ?, ?)`,
                args: [userId, 0, 0, 0, 1]
            });

            this.assetsCache.set(userId, { ...newAssets, lastUpdate: Date.now() });
            return newAssets;
        }

        const assets = result.rows[0];
        this.assetsCache.set(userId, { ...assets, lastUpdate: Date.now() });
        return assets;
    }

    async processTransaction({ userId, type, assetType, amount, service, description, metadata }) {
        const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Get current assets with lock
        const currentAssets = await this.getAssets(userId);
        
        // Calculate new balance
        let newBalance;
        let currentBalance;
        
        if (assetType === 'codes') currentBalance = currentAssets.codes_count;
        else if (assetType === 'silver') currentBalance = currentAssets.silver_balance;
        else if (assetType === 'gold') currentBalance = currentAssets.gold_balance;

        if (type === 'debit' || type === 'spend' || type === 'barter' || type === 'like') {
            newBalance = currentBalance - (amount || 0);
            if (newBalance < 0) {
                throw new Error(`Insufficient ${assetType} balance`);
            }
        } else {
            newBalance = currentBalance + (amount || 0);
        }

        // Update database
        const columnMap = {
            'codes': 'codes_count',
            'silver': 'silver_balance',
            'gold': 'gold_balance'
        };

        await this.db.execute({
            sql: `UPDATE user_assets 
                  SET ${columnMap[assetType]} = ?, version = version + 1, last_sync = CURRENT_TIMESTAMP
                  WHERE user_id = ?`,
            args: [newBalance, userId]
        });

        // Record transaction
        await this.db.execute({
            sql: `INSERT INTO asset_transactions 
                  (id, user_id, type, asset_type, amount, balance_after, service, description, metadata)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [txId, userId, type, assetType, amount, newBalance, service, description, JSON.stringify(metadata || {})]
        });

        // Update cache
        const updatedAssets = await this.getAssets(userId);
        
        // Broadcast to all connected services
        this.broadcastUpdate(userId, {
            type: 'assets_updated',
            data: updatedAssets,
            transaction: { id: txId, type, assetType, amount, service }
        });

        // Update SafeCode if it's the source
        if (service !== 'safecode') {
            await this.notifySafeCode(userId, updatedAssets);
        }

        return {
            success: true,
            transactionId: txId,
            newBalance,
            assetType,
            userId
        };
    }

    async syncAssets(userId, assets, source) {
        // Sync from SafeCode or other sources
        const { codes, silver, gold } = assets;
        
        await this.db.execute({
            sql: `UPDATE user_assets 
                  SET codes_count = ?, silver_balance = ?, gold_balance = ?,
                      last_sync = CURRENT_TIMESTAMP, version = version + 1
                  WHERE user_id = ?`,
            args: [codes || 0, silver || 0, gold || 0, userId]
        });

        // Update cache
        const updatedAssets = await this.getAssets(userId);
        
        // Broadcast to all services
        this.broadcastUpdate(userId, {
            type: 'assets_synced',
            data: updatedAssets,
            source
        });

        return { success: true, assets: updatedAssets };
    }

    broadcastUpdate(userId, message) {
        if (this.connections.has(userId)) {
            const messageStr = JSON.stringify(message);
            this.connections.get(userId).forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(messageStr);
                }
            });
        }
    }

    async notifySafeCode(userId, assets) {
        // Send postMessage to SafeCode iframe if active
        // This will be handled by the client-side bridge
        this.broadcastUpdate(userId, {
            type: 'safecode_sync',
            data: assets
        });
    }

    startTransactionProcessor() {
        // Process queued transactions
        setInterval(async () => {
            if (this.transactionQueue.length > 0 && !this.processingQueue) {
                this.processingQueue = true;
                const tx = this.transactionQueue.shift();
                try {
                    await this.processTransaction(tx);
                } catch (error) {
                    console.error('[ACC] Queued transaction failed:', error);
                }
                this.processingQueue = false;
            }
        }, 100);
    }
}

// Initialize ACC
const acc = new AssetsCentralCore();

module.exports = acc;
