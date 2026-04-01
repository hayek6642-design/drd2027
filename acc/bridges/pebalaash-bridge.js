/**
 * Pebalaash Bridge - جسر خدمة البدل
 * للمقايضة باستخدام الأصول
 */

class PebalaashBridge extends ServiceBridgeBase {
    constructor() {
        super('pebalaash', {
            currency: 'silver',
            allowBarter: true,
            allowPurchase: true
        });

        this.cart = [];
        this.listeners = new Map();
    }

    onACCConnected() {
        super.onACCConnected();
        this.setupPebalaashIntegration();
    }

    setupPebalaashIntegration() {
        // Listen for barter requests from Pebalaash
        this.registerMessageHandler('barter_request', (data) => {
            this.handleBarterRequest(data);
        });

        this.registerMessageHandler('purchase_request', (data) => {
            this.handlePurchaseRequest(data);
        });

        this.registerMessageHandler('get_balance', () => {
            this.sendToService({
                type: 'balance_response',
                data: this.assets
            });
        });

        // Inject Pebalaash-specific UI
        this.injectPebalaashUI();
    }

    async handleBarterRequest(data) {
        const { itemId, itemName, price, sellerId } = data;
        
        try {
            // Check balance
            if (!this.assets || this.assets.silver_balance < price) {
                this.sendToService({
                    type: 'barter_failed',
                    error: 'Insufficient silver balance',
                    required: price,
                    available: this.assets?.silver_balance || 0
                });
                return;
            }

            // Execute barter transaction
            const result = await this.requestTransaction('barter', price, 'silver', {
                itemId,
                itemName,
                sellerId,
                description: `Barter: ${itemName}`
            });

            if (result.success) {
                this.sendToService({
                    type: 'barter_success',
                    data: {
                        itemId,
                        price,
                        newBalance: result.newBalance,
                        transactionId: result.transactionId
                    }
                });

                // Notify seller
                this.notifySeller(sellerId, {
                    type: 'item_sold',
                    itemId,
                    price,
                    buyerId: this.acc.userId
                });
            } else {
                this.sendToService({
                    type: 'barter_failed',
                    error: result.error || 'Transaction failed'
                });
            }
        } catch (error) {
            console.error('[PebalaashBridge] Barter error:', error);
            this.sendToService({
                type: 'barter_failed',
                error: error.message
            });
        }
    }

    async handlePurchaseRequest(data) {
        const { itemId, itemName, price, currency = 'silver' } = data;
        
        try {
            const result = await this.requestTransaction('spend', price, currency, {
                itemId,
                itemName,
                description: `Purchase: ${itemName}`
            });

            if (result.success) {
                this.sendToService({
                    type: 'purchase_success',
                    data: {
                        itemId,
                        price,
                        currency,
                        transactionId: result.transactionId
                    }
                });
            } else {
                this.sendToService({
                    type: 'purchase_failed',
                    error: result.error
                });
            }
        } catch (error) {
            this.sendToService({
                type: 'purchase_failed',
                error: error.message
            });
        }
    }

    injectPebalaashUI() {
        // Add ACC balance display to Pebalaash interface
        const style = document.createElement('style');
        style.textContent = `
            .acc-pebalaash-widget {
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 20px;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                z-index: 10000;
                font-family: system-ui, sans-serif;
                min-width: 200px;
            }
            
            .acc-pebalaash-widget h4 {
                margin: 0 0 10px 0;
                font-size: 14px;
                opacity: 0.9;
            }
            
            .acc-pebalaash-balance {
                display: flex;
                gap: 15px;
                font-size: 18px;
                font-weight: bold;
            }
            
            .acc-pebalaash-balance span {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .acc-pebalaash-insufficient {
                animation: shake 0.5s;
                color: #ff6b6b !important;
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
        `;
        document.head.appendChild(style);
    }

    renderAssets() {
        super.renderAssets();
        
        // Update Pebalaash-specific UI
        const widget = document.querySelector('.acc-pebalaash-widget');
        if (widget && this.assets) {
            const silverEl = widget.querySelector('.silver-balance');
            const goldEl = widget.querySelector('.gold-balance');
            
            if (silverEl) silverEl.textContent = this.assets.silver_balance || 0;
            if (goldEl) goldEl.textContent = this.assets.gold_balance || 0;
        }
    }

    notifySeller(sellerId, data) {
        // Send notification to seller via ACC
        if (this.acc) {
            this.acc.send({
                action: 'notify_user',
                userId: sellerId,
                payload: data
            });
        }
    }

    // Helper: Check if user can afford item
    canAfford(price, currency = 'silver') {
        if (!this.assets) return false;
        const balance = currency === 'gold' ? this.assets.gold_balance : this.assets.silver_balance;
        return balance >= price;
    }

    // Helper: Get formatted balance
    getBalanceDisplay() {
        if (!this.assets) return { silver: 0, gold: 0 };
        return {
            silver: this.assets.silver_balance || 0,
            gold: this.assets.gold_balance || 0,
            codes: this.assets.codes_count || 0
        };
    }
}

// Auto-initialize if in Pebalaash context
if (window.location.pathname.includes('pebalaash')) {
    window.pebalaashBridge = new PebalaashBridge();
}
