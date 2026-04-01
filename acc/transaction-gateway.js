/**
 * Transaction Gateway - بوابة المعاملات
 * تتحكم في كل عمليات الإنفاق والكسب
 */

class TransactionGateway {
    constructor(accClient) {
        this.acc = accClient;
        this.rules = new Map();
        this.middleware = [];
        this.history = [];
        this.dailySpends = new Map();
        
        this.initDefaultRules();
    }

    initDefaultRules() {
        // Default transaction rules
        this.rules.set('min_silver_balance', 0);
        this.rules.set('min_gold_balance', 0);
        this.rules.set('max_transaction_silver', 10000);
        this.rules.set('max_transaction_gold', 1000);
        this.rules.set('daily_silver_limit', 50000);
        this.rules.set('daily_gold_limit', 5000);
    }

    // Add middleware for transaction processing
    use(middlewareFn) {
        this.middleware.push(middlewareFn);
    }

    // Execute transaction with middleware
    async execute(transaction) {
        const context = {
            transaction,
            approved: true,
            errors: [],
            metadata: {}
        };

        // Run middleware
        for (const middleware of this.middleware) {
            try {
                await middleware(context);
                if (!context.approved) break;
            } catch (error) {
                context.approved = false;
                context.errors.push(error.message);
            }
        }

        if (!context.approved) {
            return {
                success: false,
                errors: context.errors,
                transaction: null
            };
        }

        // Execute via ACC
        const result = await this.processViaACC(context.transaction);
        
        // Record in history
        this.history.push({
            ...result,
            timestamp: Date.now()
        });

        return result;
    }

    async processViaACC(tx) {
        const { type, amount, assetType, service, description, metadata } = tx;
        
        switch (type) {
            case 'spend':
            case 'debit':
                return await this.acc.spend(amount, assetType, { service, description, metadata });
            
            case 'earn':
            case 'credit':
                return await this.acc.earn(amount, assetType, { service, description, metadata });
            
            case 'barter':
                return await this.acc.barter(amount, assetType, { service, description, metadata });
            
            case 'like':
                return await this.acc.like(amount, assetType, { service, description, metadata });
            
            case 'superlike':
                return await this.acc.spend(amount * 5, assetType, { service, description: `${description} (Superlike)`, metadata });
            
            case 'megalike':
                return await this.acc.spend(amount * 10, assetType, { service, description: `${description} (Megalike)`, metadata });
            
            case 'game_win':
                return await this.acc.gameWin(amount, assetType, { service, description, metadata });
            
            case 'game_loss':
                return await this.acc.gameLoss(amount, assetType, { service, description, metadata });
            
            default:
                throw new Error(`Unknown transaction type: ${type}`);
        }
    }

    // Service-specific helpers
    async pebalaashBarter(userId, itemPrice, itemName) {
        return this.execute({
            type: 'barter',
            amount: itemPrice,
            assetType: 'silver',
            service: 'pebalaash',
            description: `Barter: ${itemName}`,
            metadata: { item: itemName }
        });
    }

    async farragnaLike(contentId, likeType = 'normal') {
        const costs = {
            normal: { amount: 1, type: 'like' },
            super: { amount: 5, type: 'superlike' },
            mega: { amount: 10, type: 'megalike' }
        };

        const cost = costs[likeType] || costs.normal;

        return this.execute({
            type: cost.type,
            amount: cost.amount,
            assetType: 'silver',
            service: 'farragna',
            description: `Like on ${contentId}`,
            metadata: { contentId, likeType }
        });
    }

    async battaloodaGameResult(gameId, isWin, amount, assetType = 'silver') {
        return this.execute({
            type: isWin ? 'game_win' : 'game_loss',
            amount,
            assetType,
            service: 'battalooda',
            description: `Game ${gameId}: ${isWin ? 'Win' : 'Loss'}`,
            metadata: { gameId, isWin }
        });
    }

    async settaXtes3aBid(auctionId, bidAmount) {
        return this.execute({
            type: 'spend',
            amount: bidAmount,
            assetType: 'gold',
            service: 'settaxtes3a',
            description: `Bid on auction ${auctionId}`,
            metadata: { auctionId }
        });
    }

    async gamesCentreBet(gameType, betAmount, assetType = 'silver') {
        return this.execute({
            type: 'spend',
            amount: betAmount,
            assetType,
            service: 'games',
            description: `Bet on ${gameType}`,
            metadata: { gameType }
        });
    }

    // Batch operations
    async batchTransfer(transfers) {
        const results = [];
        for (const transfer of transfers) {
            const result = await this.execute(transfer);
            results.push(result);
        }
        return results;
    }

    // Validation helpers
    validateBalance(required, available) {
        return available >= required;
    }

    validateDailyLimit(userId, amount, assetType) {
        const today = new Date().toDateString();
        const key = `${userId}_${assetType}_${today}`;
        const spent = this.dailySpends.get(key) || 0;
        const limit = assetType === 'gold' ? 
            this.rules.get('daily_gold_limit') : 
            this.rules.get('daily_silver_limit');
        
        return (spent + amount) <= limit;
    }

    // Get transaction history
    getHistory(filters = {}) {
        let filtered = this.history;
        
        if (filters.service) {
            filtered = filtered.filter(tx => tx.service === filters.service);
        }
        if (filters.type) {
            filtered = filtered.filter(tx => tx.type === filters.type);
        }
        if (filters.assetType) {
            filtered = filtered.filter(tx => tx.assetType === filters.assetType);
        }
        if (filters.since) {
            filtered = filtered.filter(tx => tx.timestamp >= filters.since);
        }

        return filtered;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransactionGateway;
}
