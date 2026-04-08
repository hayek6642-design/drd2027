// Banking Transaction Processor
// Handles purchases and sales of codes, bars, and other tradable items
// Includes order management, price discovery, and settlement processing

import { errorHandler } from './advanced-error-handler.js';
import { transactionMonitor } from './transaction-monitor.js';
import { securityManager } from './security-manager.js';
import { getCurrentUser } from './firebase-integration.js';

export class BankingProcessor {
    constructor(options = {}) {
        this.enableTrading = options.enableTrading !== false;
        this.maxOrderValue = options.maxOrderValue || 1000000; // 1M max order
        this.minOrderValue = options.minOrderValue || 1; // 1 min order
        this.tradingFee = options.tradingFee || 0.001; // 0.1% fee
        this.maxOrdersPerUser = options.maxOrdersPerUser || 100;

        // Order books
        this.buyOrders = new Map(); // price -> orders
        this.sellOrders = new Map(); // price -> orders
        this.userOrders = new Map(); // userId -> orders
        this.orderHistory = [];

        // Market data
        this.priceHistory = [];
        this.marketStats = {
            lastPrice: 0,
            volume24h: 0,
            high24h: 0,
            low24h: 0,
            priceChange24h: 0
        };

        // Processing queues
        this.orderProcessingQueue = [];
        this.settlementQueue = [];

        // Initialize
        this._startProcessingLoops();

        console.log('🚀 Banking Processor initialized');
    }

    // Place a buy order
    async placeBuyOrder(orderData) {
        return await this._placeOrder({
            ...orderData,
            type: 'buy',
            side: 'bid'
        });
    }

    // Place a sell order
    async placeSellOrder(orderData) {
        return await this._placeOrder({
            ...orderData,
            type: 'sell',
            side: 'ask'
        });
    }

    // Place a generic order
    async _placeOrder(orderData) {
        const orderId = orderData.id || `order_${Date.now()}_${Math.random().toString(36).substring(2)}`;

        try {
            console.log('📋 Placing order:', orderId, orderData);

            // Validate order
            this._validateOrder(orderData);

            const order = {
                id: orderId,
                userId: orderData.userId,
                type: orderData.type, // 'buy' or 'sell'
                assetType: orderData.assetType || 'codes',
                quantity: orderData.quantity,
                price: orderData.price,
                totalValue: orderData.quantity * orderData.price,
                fee: orderData.quantity * orderData.price * this.tradingFee,
                status: 'open', // 'open', 'filled', 'partial', 'cancelled'
                filledQuantity: 0,
                remainingQuantity: orderData.quantity,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Security validation
            const securityValidation = securityManager.validateTransactionSecurity({
                amount: order.totalValue,
                toEmail: null // Internal order
            }, { id: orderData.userId });

            if (!securityValidation.valid) {
                throw new Error(`Security validation failed: ${securityValidation.issues.join(', ')}`);
            }

            // Check user order limits
            this._checkUserOrderLimits(orderData.userId);

            // Add to order book
            this._addToOrderBook(order);

            // Add to user orders
            if (!this.userOrders.has(orderData.userId)) {
                this.userOrders.set(orderData.userId, []);
            }
            this.userOrders.get(orderData.userId).push(order);

            // Add to history
            this._addToOrderHistory({
                orderId,
                action: 'place',
                details: orderData,
                timestamp: Date.now()
            });

            // Try to match order immediately
            await this._matchOrder(order);

            // Record transaction
            transactionMonitor.recordTransactionComplete(`order_place_${orderId}`, true, null, {
                orderId,
                type: order.type,
                quantity: order.quantity,
                price: order.price
            });

            console.log('✅ Order placed:', orderId);
            return order;

        } catch (error) {
            console.error('Error placing order:', error);
            transactionMonitor.recordError(error, 'order_place', { orderId, orderData });
            throw error;
        }
    }

    // Cancel an order
    async cancelOrder(orderId, userId) {
        try {
            console.log('❌ Cancelling order:', orderId);

            let order = null;
            let orderBook = null;

            // Find order in buy orders
            for (const [price, orders] of this.buyOrders.entries()) {
                const index = orders.findIndex(o => o.id === orderId && o.userId === userId);
                if (index !== -1) {
                    order = orders[index];
                    orderBook = this.buyOrders;
                    orders.splice(index, 1);
                    break;
                }
            }

            // Find order in sell orders if not found in buy orders
            if (!order) {
                for (const [price, orders] of this.sellOrders.entries()) {
                    const index = orders.findIndex(o => o.id === orderId && o.userId === userId);
                    if (index !== -1) {
                        order = orders[index];
                        orderBook = this.sellOrders;
                        orders.splice(index, 1);
                        break;
                    }
                }
            }

            if (!order) {
                throw new Error('Order not found or not owned by user');
            }

            // Update order status
            order.status = 'cancelled';
            order.updatedAt = new Date().toISOString();

            // Remove from user orders
            const userOrderList = this.userOrders.get(userId);
            if (userOrderList) {
                const index = userOrderList.findIndex(o => o.id === orderId);
                if (index !== -1) {
                    userOrderList.splice(index, 1);
                }
            }

            // Add to history
            this._addToOrderHistory({
                orderId,
                action: 'cancel',
                details: { reason: 'user_requested' },
                timestamp: Date.now()
            });

            console.log('✅ Order cancelled:', orderId);
            return order;

        } catch (error) {
            console.error('Error cancelling order:', error);
            transactionMonitor.recordError(error, 'order_cancel', { orderId, userId });
            throw error;
        }
    }

    // Get order book
    getOrderBook(assetType = 'codes', limit = 20) {
        const buyOrders = [];
        const sellOrders = [];

        // Get top buy orders (highest price first)
        const buyPrices = Array.from(this.buyOrders.keys()).sort((a, b) => b - a);
        for (const price of buyPrices.slice(0, limit)) {
            buyOrders.push(...this.buyOrders.get(price));
        }

        // Get top sell orders (lowest price first)
        const sellPrices = Array.from(this.sellOrders.keys()).sort((a, b) => a - b);
        for (const price of sellPrices.slice(0, limit)) {
            sellOrders.push(...this.sellOrders.get(price));
        }

        return {
            assetType,
            buyOrders: buyOrders.slice(0, limit),
            sellOrders: sellOrders.slice(0, limit),
            spread: buyPrices.length > 0 && sellPrices.length > 0 ?
                sellPrices[0] - buyPrices[0] : 0,
            lastUpdated: new Date().toISOString()
        };
    }

    // Get user's orders
    getUserOrders(userId) {
        return this.userOrders.get(userId) || [];
    }

    // Get market data
    getMarketData(assetType = 'codes', timeframe = '24h') {
        const now = Date.now();
        const timeframeMs = this._parseTimeframe(timeframe);

        const recentPrices = this.priceHistory.filter(
            price => now - price.timestamp < timeframeMs
        );

        if (recentPrices.length === 0) {
            return {
                assetType,
                currentPrice: this.marketStats.lastPrice,
                priceChange24h: this.marketStats.priceChange24h,
                volume24h: this.marketStats.volume24h,
                high24h: this.marketStats.high24h,
                low24h: this.marketStats.low24h,
                lastUpdated: new Date().toISOString()
            };
        }

        const prices = recentPrices.map(p => p.price);
        const volumes = recentPrices.map(p => p.volume);

        return {
            assetType,
            currentPrice: prices[prices.length - 1],
            priceChange24h: this._calculatePriceChange(recentPrices),
            volume24h: volumes.reduce((sum, vol) => sum + vol, 0),
            high24h: Math.max(...prices),
            low24h: Math.min(...prices),
            priceHistory: recentPrices.slice(-100), // Last 100 data points
            lastUpdated: new Date().toISOString()
        };
    }

    // Get user's portfolio
    getUserPortfolio(userId) {
        const orders = this.getUserOrders(userId);
        const openOrders = orders.filter(o => o.status === 'open' || o.status === 'partial');
        const filledOrders = orders.filter(o => o.status === 'filled');

        const totalInvested = filledOrders
            .filter(o => o.type === 'buy')
            .reduce((sum, o) => sum + (o.filledQuantity * o.price), 0);

        const totalSold = filledOrders
            .filter(o => o.type === 'sell')
            .reduce((sum, o) => sum + (o.filledQuantity * o.price), 0);

        return {
            userId,
            openOrders: openOrders.length,
            totalInvested,
            totalSold,
            netPosition: totalInvested - totalSold,
            orderHistory: filledOrders.slice(0, 50), // Last 50 orders
            lastUpdated: new Date().toISOString()
        };
    }

    // Process market orders (immediate execution)
    async processMarketOrder(orderData) {
        try {
            console.log('⚡ Processing market order:', orderData);

            const assetType = orderData.assetType || 'codes';
            const orderBook = orderData.type === 'buy' ? this.sellOrders : this.buyOrders;

            if (orderBook.size === 0) {
                throw new Error('No liquidity available for market order');
            }

            // Get best available price
            const prices = Array.from(orderBook.keys());
            const bestPrice = orderData.type === 'buy' ?
                Math.min(...prices) : // Buy at lowest ask
                Math.max(...prices);  // Sell at highest bid

            // Create limit order at best price
            const limitOrder = await this._placeOrder({
                ...orderData,
                price: bestPrice,
                orderType: 'market_converted_to_limit'
            });

            return limitOrder;

        } catch (error) {
            console.error('Error processing market order:', error);
            throw error;
        }
    }

    // Internal order matching logic
    async _matchOrder(newOrder) {
        try {
            const oppositeBook = newOrder.type === 'buy' ? this.sellOrders : this.buyOrders;

            if (oppositeBook.size === 0) {
                return; // No matching orders
            }

            const executableOrders = [];

            // Find executable orders
            for (const [price, orders] of oppositeBook.entries()) {
                const canExecute = newOrder.type === 'buy' ? price <= newOrder.price : price >= newOrder.price;

                if (canExecute) {
                    executableOrders.push(...orders);
                }
            }

            // Sort by price (best price first)
            executableOrders.sort((a, b) => {
                return newOrder.type === 'buy' ?
                    a.price - b.price : // Buy: lowest price first
                    b.price - a.price;  // Sell: highest price first
            });

            // Execute matches
            for (const existingOrder of executableOrders) {
                if (newOrder.remainingQuantity <= 0) break;

                const matchQuantity = Math.min(newOrder.remainingQuantity, existingOrder.remainingQuantity);

                if (matchQuantity > 0) {
                    await this._executeTrade(newOrder, existingOrder, matchQuantity);
                }
            }

        } catch (error) {
            console.error('Error matching order:', error);
            throw error;
        }
    }

    // Execute a trade between two orders
    async _executeTrade(order1, order2, quantity) {
        try {
            const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substring(2)}`;
            const tradePrice = order2.price; // Use the existing order's price
            const tradeValue = quantity * tradePrice;

            console.log('💱 Executing trade:', tradeId, {
                buyOrder: order1.id,
                sellOrder: order2.id,
                quantity,
                price: tradePrice
            });

            // Update order states
            order1.filledQuantity += quantity;
            order1.remainingQuantity -= quantity;
            order1.status = order1.remainingQuantity === 0 ? 'filled' : 'partial';
            order1.updatedAt = new Date().toISOString();

            order2.filledQuantity += quantity;
            order2.remainingQuantity -= quantity;
            order2.status = order2.remainingQuantity === 0 ? 'filled' : 'partial';
            order2.updatedAt = new Date().toISOString();

            // Record trade
            const trade = {
                id: tradeId,
                buyOrderId: order1.id,
                sellOrderId: order2.id,
                quantity,
                price: tradePrice,
                value: tradeValue,
                fee: tradeValue * this.tradingFee,
                timestamp: Date.now()
            };

            // Add to trade history
            this._addToTradeHistory(trade);

            // Update market statistics
            this._updateMarketStats(trade);

            // Add to order history
            this._addToOrderHistory({
                orderId: order1.id,
                action: 'partial_fill',
                details: { tradeId, quantity, price: tradePrice },
                timestamp: Date.now()
            });

            this._addToOrderHistory({
                orderId: order2.id,
                action: 'partial_fill',
                details: { tradeId, quantity, price: tradePrice },
                timestamp: Date.now()
            });

            // Remove filled orders from order book
            if (order1.status === 'filled') {
                this._removeFromOrderBook(order1);
            }

            if (order2.status === 'filled') {
                this._removeFromOrderBook(order2);
            }

            console.log('✅ Trade executed:', tradeId);

        } catch (error) {
            console.error('Error executing trade:', error);
            throw error;
        }
    }

    // Validate order data
    _validateOrder(orderData) {
        if (!orderData.userId) {
            throw new Error('User ID is required');
        }

        if (!['buy', 'sell'].includes(orderData.type)) {
            throw new Error('Order type must be buy or sell');
        }

        if (!orderData.quantity || orderData.quantity <= 0) {
            throw new Error('Valid quantity is required');
        }

        if (!orderData.price || orderData.price <= 0) {
            throw new Error('Valid price is required');
        }

        const totalValue = orderData.quantity * orderData.price;
        if (totalValue > this.maxOrderValue) {
            throw new Error(`Order value exceeds maximum limit of ${this.maxOrderValue}`);
        }

        if (totalValue < this.minOrderValue) {
            throw new Error(`Order value below minimum limit of ${this.minOrderValue}`);
        }
    }

    // Check user order limits
    _checkUserOrderLimits(userId) {
        const userOrderCount = (this.userOrders.get(userId) || []).length;
        if (userOrderCount >= this.maxOrdersPerUser) {
            throw new Error(`Maximum orders per user limit reached (${this.maxOrdersPerUser})`);
        }
    }

    // Add order to order book
    _addToOrderBook(order) {
        const book = order.type === 'buy' ? this.buyOrders : this.sellOrders;
        const price = order.price;

        if (!book.has(price)) {
            book.set(price, []);
        }

        book.get(price).push(order);
    }

    // Remove order from order book
    _removeFromOrderBook(order) {
        const book = order.type === 'buy' ? this.buyOrders : this.sellOrders;
        const price = order.price;

        if (book.has(price)) {
            const orders = book.get(price);
            const index = orders.findIndex(o => o.id === order.id);
            if (index !== -1) {
                orders.splice(index, 1);
                if (orders.length === 0) {
                    book.delete(price);
                }
            }
        }
    }

    // Add to order history
    _addToOrderHistory(entry) {
        this.orderHistory.unshift(entry);

        // Keep only recent history (last 10000 entries)
        if (this.orderHistory.length > 10000) {
            this.orderHistory = this.orderHistory.slice(0, 10000);
        }
    }

    // Add to trade history
    _addToTradeHistory(trade) {
        this.priceHistory.unshift({
            price: trade.price,
            volume: trade.quantity,
            timestamp: trade.timestamp
        });

        // Keep only recent price history (last 1000 entries)
        if (this.priceHistory.length > 1000) {
            this.priceHistory = this.priceHistory.slice(0, 1000);
        }
    }

    // Update market statistics
    _updateMarketStats(trade) {
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;

        // Update 24h statistics
        const recentTrades = this.priceHistory.filter(t => t.timestamp > dayAgo);

        if (recentTrades.length > 0) {
            const prices = recentTrades.map(t => t.price);
            const volumes = recentTrades.map(t => t.volume);

            this.marketStats = {
                lastPrice: trade.price,
                volume24h: volumes.reduce((sum, vol) => sum + vol, 0),
                high24h: Math.max(...prices),
                low24h: Math.min(...prices),
                priceChange24h: this._calculatePriceChange(recentTrades)
            };
        } else {
            this.marketStats.lastPrice = trade.price;
        }
    }

    // Calculate price change over timeframe
    _calculatePriceChange(priceHistory) {
        if (priceHistory.length < 2) return 0;

        const oldest = priceHistory[priceHistory.length - 1];
        const newest = priceHistory[0];

        return ((newest.price - oldest.price) / oldest.price) * 100;
    }

    // Parse timeframe string
    _parseTimeframe(timeframe) {
        const units = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };

        return units[timeframe] || units['24h'];
    }

    // Start processing loops
    _startProcessingLoops() {
        // Process order matching every 100ms
        setInterval(() => {
            this._processOrderMatching();
        }, 100);

        // Process settlements every 1 second
        setInterval(() => {
            this._processSettlements();
        }, 1000);

        // Update market data every 5 seconds
        setInterval(() => {
            this._updateMarketData();
        }, 5000);
    }

    // Process order matching
    async _processOrderMatching() {
        // This would process any pending order matches
        // For now, orders are matched immediately when placed
    }

    // Process settlements
    async _processSettlements() {
        // Process completed trades and update user balances
        // This would integrate with the balance system
    }

    // Update market data
    _updateMarketData() {
        // Update any external price feeds or market data
        // This could integrate with external APIs
    }

    // Get processor statistics
    getProcessorStats() {
        const totalOrders = this.orderHistory.length;
        const openOrders = Array.from(this.buyOrders.values()).reduce((sum, orders) => sum + orders.length, 0) +
                          Array.from(this.sellOrders.values()).reduce((sum, orders) => sum + orders.length, 0);

        return {
            totalOrders,
            openOrders,
            buyOrders: Array.from(this.buyOrders.values()).reduce((sum, orders) => sum + orders.length, 0),
            sellOrders: Array.from(this.sellOrders.values()).reduce((sum, orders) => sum + orders.length, 0),
            totalUsers: this.userOrders.size,
            marketStats: this.marketStats,
            lastUpdated: new Date().toISOString()
        };
    }

    // Clear all orders (for testing/admin)
    clearAllOrders() {
        this.buyOrders.clear();
        this.sellOrders.clear();
        this.userOrders.clear();
        this.orderHistory = [];

        console.log('🗑️ All orders cleared');
    }

    // Destroy processor
    destroy() {
        this.buyOrders.clear();
        this.sellOrders.clear();
        this.userOrders.clear();
        this.orderHistory = [];
        this.priceHistory = [];

        console.log('💥 Banking Processor destroyed');
    }
}

// Create global instance
export const bankingProcessor = new BankingProcessor();

// Auto-initialize
if (typeof window !== 'undefined') {
    window.bankingProcessor = bankingProcessor;
    console.log('🚀 Banking Processor ready');
}

export default BankingProcessor;