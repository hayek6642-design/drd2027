/**
 * SafeCode Bridge - جسر SafeCode
 * للمزامنة مع SafeCode وعرض الأصول
 */

class SafeCodeBridge extends ServiceBridgeBase {
    constructor() {
        super('safecode', {
            bidirectionalSync: true,
            autoSync: true,
            syncInterval: 5000
        });

        this.syncInterval = null;
        this.pendingSync = false;
    }

    onACCConnected() {
        super.onACCConnected();
        this.setupSafeCodeIntegration();
        
        if (this.config.autoSync) {
            this.startAutoSync();
        }
    }

    setupSafeCodeIntegration() {
        // Listen for SafeCode specific messages
        this.registerMessageHandler('safecode_assets_update', (data) => {
            // Received update from SafeCode - sync to ACC
            this.syncToACC(data);
        });

        this.registerMessageHandler('safecode_transfer_request', (data) => {
            this.handleTransferRequest(data);
        });

        this.registerMessageHandler('safecode_codes_generated', (data) => {
            this.handleCodesGenerated(data);
        });

        // Notify SafeCode that bridge is ready
        this.sendToService({
            type: 'bridge_ready',
            timestamp: Date.now()
        });
    }

    async syncToACC(data) {
        if (this.pendingSync) return;
        this.pendingSync = true;

        try {
            const { codes, silver, gold } = data;
            
            // Send to ACC server
            const response = await fetch(`${this.acc.httpUrl}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.acc.userId,
                    assets: { codes, silver, gold },
                    source: 'safecode'
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Update local cache
                this.assets = result.assets;
                this.emit('syncComplete', result);
            }
        } catch (error) {
            console.error('[SafeCodeBridge] Sync error:', error);
        } finally {
            this.pendingSync = false;
        }
    }

    async handleTransferRequest(data) {
        const { toUserId, assetType, amount, code } = data;

        try {
            // Verify in SafeCode first
            const verifyResult = await this.verifyInSafeCode(code);
            
            if (!verifyResult.valid) {
                this.sendToService({
                    type: 'transfer_failed',
                    error: 'Invalid code or insufficient balance'
                });
                return;
            }

            // Execute transfer via ACC
            const result = await this.requestTransaction('transfer', amount, assetType, {
                toUserId,
                code,
                description: `Transfer to ${toUserId}`
            });

            if (result.success) {
                // Confirm in SafeCode
                await this.confirmInSafeCode(code, 'transferred');

                this.sendToService({
                    type: 'transfer_success',
                    data: {
                        toUserId,
                        amount,
                        assetType,
                        transactionId: result.transactionId
                    }
                });
            } else {
                this.sendToService({
                    type: 'transfer_failed',
                    error: result.error
                });
            }
        } catch (error) {
            this.sendToService({
                type: 'transfer_failed',
                error: error.message
            });
        }
    }

    async handleCodesGenerated(data) {
        const { codes, source } = data;
        
        // Update ACC with new codes count
        try {
            await fetch(`${this.acc.httpUrl}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.acc.userId,
                    assets: {
                        codes: codes.length,
                        silver: this.assets?.silver_balance || 0,
                        gold: this.assets?.gold_balance || 0
                    },
                    source: source || 'safecode_generation'
                })
            });
        } catch (error) {
            console.error('[SafeCodeBridge] Codes sync error:', error);
        }
    }

    startAutoSync() {
        this.syncInterval = setInterval(() => {
            if (this.assets) {
                this.requestSyncFromSafeCode();
            }
        }, this.config.syncInterval);
    }

    requestSyncFromSafeCode() {
        this.sendToService({
            type: 'request_assets_sync',
            timestamp: Date.now()
        });
    }

    updateAssets(assets) {
        super.updateAssets(assets);
        
        // Send to SafeCode
        this.sendToService({
            type: 'acc_assets_update',
            data: assets
        });
    }

    async verifyInSafeCode(code) {
        // Implementation depends on SafeCode API
        return new Promise((resolve) => {
            const handler = (event) => {
                if (event.data?.type === 'code_verification_result') {
                    window.removeEventListener('message', handler);
                    resolve(event.data.data);
                }
            };
            
            window.addEventListener('message', handler);
            
            this.sendToService({
                type: 'verify_code',
                code: code
            });

            setTimeout(() => {
                window.removeEventListener('message', handler);
                resolve({ valid: false, error: 'Timeout' });
            }, 5000);
        });
    }

    async confirmInSafeCode(code, status) {
        this.sendToService({
            type: 'confirm_code_status',
            code,
            status
        });
    }

    renderAssets() {
        super.renderAssets();
        
        // Update SafeCode UI if needed
        const safeCodeContainer = document.querySelector('.safecode-assets');
        if (safeCodeContainer && this.assets) {
            // SafeCode will handle its own rendering via postMessage
            this.sendToService({
                type: 'update_display',
                data: this.assets
            });
        }
    }

    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }
}

// Auto-initialize
if (window.location.pathname.includes('safecode')) {
    window.safeCodeBridge = new SafeCodeBridge();
}
