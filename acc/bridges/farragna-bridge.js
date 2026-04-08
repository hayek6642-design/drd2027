/**
 * Farragna Bridge - جسر خدمة الفرagna (الإعجابات)
 * للإعجابات العادية والسوبر والميجا باستخدام الأصول
 */

class FarragnaBridge extends ServiceBridgeBase {
    constructor() {
        super('farragna', {
            likeCost: 1,        // 1 silver
            superLikeCost: 5,   // 5 silver
            megaLikeCost: 10,   // 10 silver
            allowCustomAmount: true
        });

        this.likeHistory = new Map(); // contentId -> likeType
    }

    onACCConnected() {
        super.onACCConnected();
        this.setupFarragnaIntegration();
    }

    setupFarragnaIntegration() {
        // Like action handlers
        this.registerMessageHandler('like', (data) => {
            this.handleLike(data, 'normal');
        });

        this.registerMessageHandler('superlike', (data) => {
            this.handleLike(data, 'super');
        });

        this.registerMessageHandler('megalike', (data) => {
            this.handleLike(data, 'mega');
        });

        this.registerMessageHandler('custom_like', (data) => {
            this.handleCustomLike(data);
        });

        this.injectFarragnaUI();
    }

    async handleLike(data, likeType) {
        const { contentId, contentOwnerId } = data;
        
        const costs = {
            normal: this.config.likeCost,
            super: this.config.superLikeCost,
            mega: this.config.megaLikeCost
        };

        const cost = costs[likeType] || this.config.likeCost;

        // Check if already liked
        if (this.likeHistory.has(contentId)) {
            this.sendToService({
                type: 'like_failed',
                error: 'Already liked this content',
                contentId
            });
            return;
        }

        try {
            const result = await this.requestTransaction('like', cost, 'silver', {
                contentId,
                contentOwnerId,
                likeType,
                description: `${likeType} like on ${contentId}`
            });

            if (result.success) {
                this.likeHistory.set(contentId, likeType);
                
                this.sendToService({
                    type: 'like_success',
                    data: {
                        contentId,
                        likeType,
                        cost,
                        newBalance: result.newBalance
                    }
                });

                // Notify content owner
                this.notifyContentOwner(contentOwnerId, {
                    type: 'new_like',
                    contentId,
                    likeType,
                    amount: cost
                });
            } else {
                this.sendToService({
                    type: 'like_failed',
                    error: result.error,
                    contentId,
                    required: cost,
                    available: this.assets?.silver_balance || 0
                });
            }
        } catch (error) {
            this.sendToService({
                type: 'like_failed',
                error: error.message,
                contentId
            });
        }
    }

    async handleCustomLike(data) {
        const { contentId, amount, message } = data;
        
        if (amount < 1) {
            this.sendToService({
                type: 'like_failed',
                error: 'Minimum amount is 1 silver'
            });
            return;
        }

        try {
            const result = await this.requestTransaction('like', amount, 'silver', {
                contentId,
                customMessage: message,
                description: `Custom like: ${amount} silver`
            });

            if (result.success) {
                this.sendToService({
                    type: 'custom_like_success',
                    data: {
                        contentId,
                        amount,
                        message,
                        newBalance: result.newBalance
                    }
                });
            }
        } catch (error) {
            this.sendToService({
                type: 'like_failed',
                error: error.message
            });
        }
    }

    injectFarragnaUI() {
        const style = document.createElement('style');
        style.textContent = `
            .acc-farragna-likes {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            .acc-like-btn {
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 8px 16px;
                border: none;
                border-radius: 20px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s;
            }
            
            .acc-like-btn.normal {
                background: #e0e0e0;
                color: #333;
            }
            
            .acc-like-btn.super {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .acc-like-btn.mega {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                font-size: 1.1em;
            }
            
            .acc-like-btn:hover {
                transform: scale(1.05);
            }
            
            .acc-like-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }
            
            .acc-like-cost {
                font-size: 0.8em;
                opacity: 0.8;
            }
            
            .acc-farragna-balance {
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 10px 20px;
                border-radius: 25px;
                font-weight: 600;
                z-index: 10000;
            }
        `;
        document.head.appendChild(style);
    }

    renderAssets() {
        super.renderAssets();
        
        // Update like buttons state based on balance
        const buttons = document.querySelectorAll('.acc-like-btn');
        buttons.forEach(btn => {
            const cost = parseInt(btn.dataset.cost) || 1;
            const canAfford = this.canAfford(cost);
            btn.disabled = !canAfford;
            
            if (!canAfford) {
                btn.title = `Need ${cost} silver, you have ${this.assets?.silver_balance || 0}`;
            }
        });

        // Update balance display
        const balanceDisplay = document.querySelector('.acc-farragna-balance');
        if (balanceDisplay && this.assets) {
            balanceDisplay.innerHTML = `🥈 ${this.assets.silver_balance || 0}`;
        }
    }

    canAfford(amount) {
        return (this.assets?.silver_balance || 0) >= amount;
    }

    notifyContentOwner(ownerId, data) {
        if (this.acc) {
            this.acc.send({
                action: 'notify_user',
                userId: ownerId,
                payload: data
            });
        }
    }

    // Get like statistics
    getLikeStats() {
        const stats = { normal: 0, super: 0, mega: 0, total: 0 };
        this.likeHistory.forEach((type) => {
            stats[type] = (stats[type] || 0) + 1;
            stats.total++;
        });
        return stats;
    }
}

// Auto-initialize
if (window.location.pathname.includes('farragna')) {
    window.farragnaBridge = new FarragnaBridge();
}
