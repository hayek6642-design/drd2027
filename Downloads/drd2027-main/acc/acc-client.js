/**
 * Assets Central Core (ACC) Client
 * العميل الذي يعمل في المتصفح ويوزع الأصول على الخدمات
 */

class ACCClient {
constructor(config = {}) {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isRender = window.location.hostname.includes('onrender.com');
        this.serverUrl = config.serverUrl || (isRender ? `wss://${window.location.host}/acc` : (isLocal ? 'ws://localhost:3999' : ''));
        this.httpUrl = config.httpUrl || (isRender ? `https://${window.location.host}/acc` : (isLocal ? 'http://localhost:3999/acc' : ''));
        this.userId = config.userId || null;
        this.token = config.token || null;

        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3; // Reduced from 5 to prevent infinite loops
        this.listeners = new Map();
        this.assets = null;
        this.connected = false;
        this.serviceBridges = new Map();

        this.init();
    }

    init() {
        if (this.userId && this.serverUrl) {
            this.connect();
        }
    }

connect() {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        try {
            this.ws = new WebSocket(this.serverUrl);

            this.ws.onopen = () => {
                if (window.DEBUG_MODE) console.log('[ACC Client] Connected to ACC Server');
                this.connected = true;
                this.reconnectAttempts = 0;

                // Subscribe to updates
                this.send({
                    action: 'subscribe',
                    userId: this.userId,
                    payload: { service: this.detectService() }
                });

                this.emit('connected');
            };

            this.ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            };

            this.ws.onclose = () => {
                if (window.DEBUG_MODE) console.log('[ACC Client] Disconnected');
                this.connected = false;
                this.attemptReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('[ACC Client] WebSocket error:', error);
                this.emit('error', error);
                // Don't spam console with reconnection attempts
            };
        } catch (e) {
            console.error('[ACC Client] Connection failed:', e);
            this.attemptReconnect();
        }
    }

    detectService() {
        // Detect which service is running
        const path = window.location.pathname;
        if (path.includes('pebalaash')) return 'pebalaash';
        if (path.includes('farragna')) return 'farragna';
        if (path.includes('battalooda')) return 'battalooda';
        if (path.includes('settaxtes3a')) return 'settaxtes3a';
        if (path.includes('games')) return 'games';
        if (path.includes('safecode')) return 'safecode';
        return 'unknown';
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                if (window.DEBUG_MODE) console.log(`[ACC Client] Reconnecting... Attempt ${this.reconnectAttempts}`);
                this.connect();
            }, 3000 * this.reconnectAttempts);
        } else {
            if (window.DEBUG_MODE) console.log('[ACC Client] Max reconnection attempts reached, falling back to HTTP');
            this.fallbackToHTTP();
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case 'assets_update':
            case 'assets_updated':
            case 'assets_synced':
                this.assets = message.data;
                this.emit('assetsUpdated', this.assets);
                this.updateAllBridges();
                // 🔧 FIX: Sync state to AssetBusV2 so dashboard.getState() works
                if (window.AssetBusV2 && typeof window.AssetBusV2.setState === 'function') {
                    window.AssetBusV2.setState(message.data);
                }
                break;

            case 'transaction_result':
                this.emit('transactionComplete', message.data);
                break;

            case 'safecode_sync':
                // Special handling for SafeCode sync
                this.emit('safecodeSync', message.data);
                break;
        }

        this.emit('message', message);
    }

    send(data) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    // Transaction Methods
    async spend(amount, assetType = 'silver', options = {}) {
        return this.requestTransaction('spend', amount, assetType, options);
    }

    async earn(amount, assetType = 'silver', options = {}) {
        return this.requestTransaction('credit', amount, assetType, options);
    }

    async barter(amount, assetType = 'silver', options = {}) {
        return this.requestTransaction('barter', amount, assetType, options);
    }

    async like(amount, assetType = 'silver', options = {}) {
        return this.requestTransaction('like', amount, assetType, options);
    }

    async gameWin(amount, assetType = 'silver', options = {}) {
        return this.requestTransaction('game_win', amount, assetType, options);
    }

    async gameLoss(amount, assetType = 'silver', options = {}) {
        return this.requestTransaction('game_loss', amount, assetType, options);
    }

    async requestTransaction(type, amount, assetType, options) {
        const payload = {
            type,
            assetType,
            amount,
            service: options.service || this.detectService(),
            description: options.description || '',
            metadata: options.metadata || {}
        };

        // Try WebSocket first
        if (this.connected) {
            this.send({
                action: 'transaction',
                userId: this.userId,
                payload
            });

            return new Promise((resolve) => {
                const handler = (result) => {
                    if (result.transactionId) {
                        this.off('transactionComplete', handler);
                        resolve(result);
                    }
                };
                this.on('transactionComplete', handler);
                
                // Timeout fallback
                setTimeout(() => {
                    this.off('transactionComplete', handler);
                    resolve({ success: false, error: 'Timeout' });
                }, 5000);
            });
        }

        // Fallback to HTTP
        try {
            const response = await fetch(`${this.httpUrl}/transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    ...payload
                })
            });
            return await response.json();
        } catch (error) {
            console.error('[ACC Client] Transaction failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Bridge Management
    registerBridge(serviceName, bridgeInstance) {
        this.serviceBridges.set(serviceName, bridgeInstance);
        bridgeInstance.setACC(this);
        
        // Send current assets if available
        if (this.assets) {
            bridgeInstance.updateAssets(this.assets);
        }
    }

    updateAllBridges() {
        if (!this.assets) return;
        
        this.serviceBridges.forEach((bridge, serviceName) => {
            try {
                bridge.updateAssets(this.assets);
            } catch (error) {
                console.error(`[ACC Client] Failed to update ${serviceName}:`, error);
            }
        });
    }

    // Event System
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('[ACC Client] Event handler error:', error);
                }
            });
        }
    }

    // Getters
    getAssets() {
        return this.assets;
    }

    getBalance(assetType) {
        if (!this.assets) return 0;
        if (assetType === 'codes') return this.assets.codes_count || 0;
        if (assetType === 'silver') return this.assets.silver_balance || 0;
        if (assetType === 'gold') return this.assets.gold_balance || 0;
        return 0;
    }

// Static instance for global access
    static instance = null;

    static init(config) {
        if (!ACCClient.instance) {
            ACCClient.instance = new ACCClient(config);
        }
        return ACCClient.instance;
    }

    static getInstance() {
        return ACCClient.instance;
    }

    /**
     * 🔧 FIX: Reset singleton on logout so re-login creates a fresh instance
     * with the new userId and reconnects WebSocket.
     */
    static reset() {
        if (ACCClient.instance) {
            try { ACCClient.instance.ws?.close(); } catch(_) {}
            if (ACCClient.instance.pollInterval) clearInterval(ACCClient.instance.pollInterval);
            ACCClient.instance.listeners.clear();
            ACCClient.instance.serviceBridges.clear();
            ACCClient.instance.assets = null;
            ACCClient.instance.connected = false;
            ACCClient.instance = null;
        }
    }

    // Fallback to HTTP polling when WebSocket fails
    fallbackToHTTP() {
        if (window.DEBUG_MODE) console.log('[ACC Client] Falling back to HTTP polling');
        this.connected = false;
        this.ws = null;

        // Poll every 30 seconds
        this.pollInterval = setInterval(() => {
            this.syncViaHTTP();
        }, 30000);
    }

    // HTTP sync method
    async syncViaHTTP() {
        try {
            const response = await fetch(`${this.httpUrl}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.userId })
            });
            const data = await response.json();
            this.assets = data;
            this.emit('assetsUpdated', this.assets);
            this.updateAllBridges();
        } catch (error) {
            console.error('[ACC Client] HTTP sync failed:', error);
        }
    }
}

// Auto-initialize if config exists
if (window.ACC_CONFIG) {
    ACCClient.init(window.ACC_CONFIG);
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ACCClient;
}
