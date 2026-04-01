// Payment Gateway Integration System
// Secure financial exchange processing with multiple payment providers
// Supports Stripe, PayPal, cryptocurrency, and other payment methods

import { errorHandler } from './advanced-error-handler.js';
import { transactionMonitor } from './transaction-monitor.js';
import { securityManager } from './security-manager.js';

export class PaymentGateway {
    constructor(options = {}) {
        this.providers = new Map();
        this.defaultProvider = options.defaultProvider || 'stripe';
        this.enableFraudDetection = options.enableFraudDetection !== false;
        this.maxPaymentAmount = options.maxPaymentAmount || 50000;
        this.minPaymentAmount = options.minPaymentAmount || 0.50;

        // Payment tracking
        this.paymentHistory = [];
        this.pendingPayments = new Map();
        this.failedPayments = [];

        // Fraud detection
        this.fraudDetector = new FraudDetector();

        // Initialize providers
        this._initializeProviders(options);

        console.log('🚀 Payment Gateway initialized');
    }

    // Process a payment
    async processPayment(paymentData) {
        const paymentId = paymentData.id || `payment_${Date.now()}_${Math.random().toString(36).substring(2)}`;

        try {
            console.log('💳 Processing payment:', paymentId, paymentData);

            // Validate payment data
            this._validatePaymentData(paymentData);

            const payment = {
                id: paymentId,
                userId: paymentData.userId,
                provider: paymentData.provider || this.defaultProvider,
                amount: paymentData.amount,
                currency: paymentData.currency || 'USD',
                method: paymentData.method, // 'card', 'bank', 'crypto', 'wallet'
                description: paymentData.description,
                metadata: paymentData.metadata || {},
                status: 'pending', // 'pending', 'processing', 'completed', 'failed', 'cancelled'
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Security validation
            const securityValidation = securityManager.validateTransactionSecurity({
                amount: payment.amount,
                toEmail: null
            }, { id: paymentData.userId });

            if (!securityValidation.valid) {
                throw new Error(`Security validation failed: ${securityValidation.issues.join(', ')}`);
            }

            // Fraud detection
            if (this.enableFraudDetection) {
                const fraudCheck = await this.fraudDetector.checkPayment(payment);
                if (fraudCheck.risk > 0.8) {
                    throw new Error('Payment blocked due to high fraud risk');
                }
                payment.fraudScore = fraudCheck.risk;
            }

            // Get provider
            const provider = this.providers.get(payment.provider);
            if (!provider) {
                throw new Error(`Payment provider '${payment.provider}' not available`);
            }

            // Check provider limits
            if (payment.amount > provider.maxAmount || payment.amount < provider.minAmount) {
                throw new Error(`Payment amount outside provider limits`);
            }

            // Add to pending payments
            this.pendingPayments.set(paymentId, payment);

            // Process with provider
            const result = await provider.processPayment(payment);

            // Update payment status
            payment.status = result.success ? 'completed' : 'failed';
            payment.providerTransactionId = result.transactionId;
            payment.fee = result.fee || 0;
            payment.netAmount = payment.amount - payment.fee;
            payment.updatedAt = new Date().toISOString();

            // Remove from pending
            this.pendingPayments.delete(paymentId);

            // Add to history
            this._addToPaymentHistory(payment);

            if (result.success) {
                console.log('✅ Payment completed:', paymentId);

                // Record successful transaction
                transactionMonitor.recordTransactionComplete(`payment_${paymentId}`, true, null, {
                    paymentId,
                    amount: payment.amount,
                    provider: payment.provider
                });

                return payment;
            } else {
                console.error('❌ Payment failed:', paymentId, result.error);

                // Record failed transaction
                transactionMonitor.recordError(new Error(result.error), 'payment_failed', {
                    paymentId,
                    amount: payment.amount,
                    provider: payment.provider
                });

                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Error processing payment:', error);

            // Update payment status if it exists
            const payment = this.pendingPayments.get(paymentId);
            if (payment) {
                payment.status = 'failed';
                payment.error = error.message;
                payment.updatedAt = new Date().toISOString();
                this._addToPaymentHistory(payment);
                this.pendingPayments.delete(paymentId);
            }

            throw error;
        }
    }

    // Refund a payment
    async refundPayment(paymentId, amount = null, reason = 'requested_by_customer') {
        try {
            console.log('💸 Refunding payment:', paymentId);

            // Find original payment
            const originalPayment = this.paymentHistory.find(p => p.id === paymentId);
            if (!originalPayment) {
                throw new Error('Original payment not found');
            }

            const refundAmount = amount || originalPayment.amount;

            if (refundAmount > originalPayment.amount) {
                throw new Error('Refund amount cannot exceed original payment');
            }

            // Get provider
            const provider = this.providers.get(originalPayment.provider);
            if (!provider) {
                throw new Error(`Payment provider '${originalPayment.provider}' not available`);
            }

            // Process refund
            const result = await provider.refundPayment(originalPayment, refundAmount, reason);

            if (result.success) {
                // Record refund
                const refund = {
                    id: `refund_${Date.now()}_${Math.random().toString(36).substring(2)}`,
                    originalPaymentId: paymentId,
                    amount: refundAmount,
                    reason,
                    status: 'completed',
                    providerRefundId: result.refundId,
                    createdAt: new Date().toISOString()
                };

                console.log('✅ Payment refunded:', paymentId);
                return refund;
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Error refunding payment:', error);
            throw error;
        }
    }

    // Get supported payment methods
    getSupportedMethods() {
        const methods = [];

        for (const [providerName, provider] of this.providers.entries()) {
            methods.push(...provider.getSupportedMethods().map(method => ({
                ...method,
                provider: providerName
            })));
        }

        return methods;
    }

    // Get payment history
    getPaymentHistory(userId = null, filters = {}) {
        let payments = [...this.paymentHistory];

        if (userId) {
            payments = payments.filter(p => p.userId === userId);
        }

        if (filters.provider) {
            payments = payments.filter(p => p.provider === filters.provider);
        }

        if (filters.status) {
            payments = payments.filter(p => p.status === filters.status);
        }

        if (filters.fromDate) {
            payments = payments.filter(p => new Date(p.createdAt) >= new Date(filters.fromDate));
        }

        if (filters.toDate) {
            payments = payments.filter(p => new Date(p.createdAt) <= new Date(filters.toDate));
        }

        if (filters.limit) {
            payments = payments.slice(0, filters.limit);
        }

        return payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Get payment statistics
    getPaymentStats(timeframe = '24h') {
        const now = Date.now();
        const timeframeMs = this._parseTimeframe(timeframe);

        const recentPayments = this.paymentHistory.filter(
            p => now - new Date(p.createdAt).getTime() < timeframeMs
        );

        const stats = {
            totalPayments: recentPayments.length,
            totalVolume: 0,
            successfulPayments: 0,
            failedPayments: 0,
            byProvider: {},
            byMethod: {},
            byCurrency: {},
            averageAmount: 0
        };

        for (const payment of recentPayments) {
            stats.totalVolume += payment.amount || 0;

            if (payment.status === 'completed') {
                stats.successfulPayments++;
            } else if (payment.status === 'failed') {
                stats.failedPayments++;
            }

            // By provider
            stats.byProvider[payment.provider] = (stats.byProvider[payment.provider] || 0) + 1;

            // By method
            stats.byMethod[payment.method] = (stats.byMethod[payment.method] || 0) + 1;

            // By currency
            stats.byCurrency[payment.currency] = (stats.byCurrency[payment.currency] || 0) + payment.amount;
        }

        stats.averageAmount = stats.totalPayments > 0 ? stats.totalVolume / stats.totalPayments : 0;
        stats.successRate = stats.totalPayments > 0 ? (stats.successfulPayments / stats.totalPayments) * 100 : 0;

        return stats;
    }

    // Validate webhook signature
    validateWebhook(provider, payload, signature) {
        const providerInstance = this.providers.get(provider);
        if (!providerInstance) {
            throw new Error(`Provider '${provider}' not found`);
        }

        return providerInstance.validateWebhook(payload, signature);
    }

    // Process webhook
    async processWebhook(provider, payload) {
        try {
            console.log('🔗 Processing webhook:', provider, payload);

            const providerInstance = this.providers.get(provider);
            if (!providerInstance) {
                throw new Error(`Provider '${provider}' not found`);
            }

            const result = await providerInstance.processWebhook(payload);

            // Update payment status if found
            if (result.paymentId) {
                const payment = this.paymentHistory.find(p => p.providerTransactionId === result.paymentId);
                if (payment) {
                    payment.status = result.status;
                    payment.updatedAt = new Date().toISOString();
                }
            }

            return result;

        } catch (error) {
            console.error('Error processing webhook:', error);
            throw error;
        }
    }

    // Initialize payment providers
    _initializeProviders(options) {
        // Stripe provider
        if (options.stripe?.enabled !== false) {
            this.providers.set('stripe', new StripeProvider(options.stripe));
        }

        // PayPal provider
        if (options.paypal?.enabled !== false) {
            this.providers.set('paypal', new PayPalProvider(options.paypal));
        }

        // Cryptocurrency provider
        if (options.crypto?.enabled !== false) {
            this.providers.set('crypto', new CryptoProvider(options.crypto));
        }

        // Mock provider for testing
        if (options.mock || process.env.NODE_ENV === 'development') {
            this.providers.set('mock', new MockProvider(options.mock));
        }

        console.log(`📦 Initialized ${this.providers.size} payment providers`);
    }

    // Validate payment data
    _validatePaymentData(paymentData) {
        if (!paymentData.userId) {
            throw new Error('User ID is required');
        }

        if (!paymentData.amount || paymentData.amount <= 0) {
            throw new Error('Valid amount is required');
        }

        if (paymentData.amount > this.maxPaymentAmount) {
            throw new Error(`Amount exceeds maximum limit of ${this.maxPaymentAmount}`);
        }

        if (paymentData.amount < this.minPaymentAmount) {
            throw new Error(`Amount below minimum limit of ${this.minPaymentAmount}`);
        }

        if (!paymentData.currency) {
            throw new Error('Currency is required');
        }

        if (!paymentData.method) {
            throw new Error('Payment method is required');
        }
    }

    // Add to payment history
    _addToPaymentHistory(payment) {
        this.paymentHistory.unshift(payment);

        // Keep only recent history (last 10000 entries)
        if (this.paymentHistory.length > 10000) {
            this.paymentHistory = this.paymentHistory.slice(0, 10000);
        }

        // Persist to localStorage
        this._persistPaymentHistory();
    }

    // Persist payment history
    _persistPaymentHistory() {
        try {
            localStorage.setItem('payment_history', JSON.stringify(this.paymentHistory.slice(0, 1000)));
        } catch (error) {
            console.warn('Failed to persist payment history:', error);
        }
    }

    // Parse timeframe
    _parseTimeframe(timeframe) {
        const units = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };

        return units[timeframe] || units['24h'];
    }

    // Load persisted payment history
    _loadPersistedHistory() {
        try {
            const historyData = localStorage.getItem('payment_history');
            if (historyData) {
                const history = JSON.parse(historyData);
                this.paymentHistory = history;
                console.log(`💾 Loaded ${history.length} payment history entries`);
            }
        } catch (error) {
            console.warn('Failed to load payment history:', error);
        }
    }

    // Get gateway statistics
    getGatewayStats() {
        return {
            providers: Array.from(this.providers.keys()),
            pendingPayments: this.pendingPayments.size,
            totalHistory: this.paymentHistory.length,
            defaultProvider: this.defaultProvider,
            fraudDetection: this.enableFraudDetection,
            limits: {
                maxAmount: this.maxPaymentAmount,
                minAmount: this.minPaymentAmount
            }
        };
    }

    // Destroy gateway
    destroy() {
        this.providers.clear();
        this.paymentHistory = [];
        this.pendingPayments.clear();
        this.failedPayments = [];

        console.log('💥 Payment Gateway destroyed');
    }
}

// Fraud Detection System
export class FraudDetector {
    constructor(options = {}) {
        this.sensitivity = options.sensitivity || 'medium'; // 'low', 'medium', 'high'
        this.rules = this._initializeRules();
        this.userHistory = new Map();
    }

    async checkPayment(payment) {
        const checks = [];

        // Amount check
        checks.push(this._checkAmount(payment));

        // Velocity check
        checks.push(await this._checkVelocity(payment));

        // Pattern check
        checks.push(this._checkPattern(payment));

        // Geographic check
        checks.push(this._checkGeography(payment));

        // Calculate overall risk score
        const riskScore = this._calculateRiskScore(checks);

        return {
            risk: riskScore,
            checks,
            recommendation: riskScore > 0.8 ? 'block' : riskScore > 0.5 ? 'review' : 'approve'
        };
    }

    _checkAmount(payment) {
        const amount = payment.amount;
        let risk = 0;

        if (amount > 10000) risk += 0.3;
        if (amount > 50000) risk += 0.4;
        if (amount < 1) risk += 0.2;

        return { check: 'amount', risk, details: { amount } };
    }

    async _checkVelocity(payment) {
        const userId = payment.userId;
        const now = Date.now();
        const hourAgo = now - 60 * 60 * 1000;

        const userPayments = this.userHistory.get(userId) || [];
        const recentPayments = userPayments.filter(p => p.timestamp > hourAgo);

        let risk = 0;
        if (recentPayments.length > 5) risk += 0.3;
        if (recentPayments.length > 10) risk += 0.4;

        return { check: 'velocity', risk, details: { recentCount: recentPayments.length } };
    }

    _checkPattern(payment) {
        // Check for suspicious patterns
        let risk = 0;

        // Round amounts might be suspicious
        if (payment.amount % 1 === 0 && payment.amount > 1000) {
            risk += 0.1;
        }

        // Very specific amounts
        if (payment.amount === 1234.56 || payment.amount === 9999.99) {
            risk += 0.2;
        }

        return { check: 'pattern', risk, details: { amount: payment.amount } };
    }

    _checkGeography(payment) {
        // Geographic risk assessment would go here
        // For now, return low risk
        return { check: 'geography', risk: 0, details: {} };
    }

    _calculateRiskScore(checks) {
        const totalRisk = checks.reduce((sum, check) => sum + check.risk, 0);
        return Math.min(totalRisk, 1.0);
    }

    _initializeRules() {
        return {
            amount: { max: 50000, weight: 0.3 },
            velocity: { maxPerHour: 10, weight: 0.3 },
            pattern: { weight: 0.2 },
            geography: { weight: 0.2 }
        };
    }
}

// Payment Provider Base Class
export class PaymentProvider {
    constructor(config = {}) {
        this.name = config.name || 'unknown';
        this.maxAmount = config.maxAmount || 50000;
        this.minAmount = config.minAmount || 0.50;
        this.supportedCurrencies = config.supportedCurrencies || ['USD'];
        this.supportedMethods = config.supportedMethods || [];
    }

    async processPayment(payment) {
        throw new Error('processPayment must be implemented by provider');
    }

    async refundPayment(originalPayment, amount, reason) {
        throw new Error('refundPayment must be implemented by provider');
    }

    getSupportedMethods() {
        return this.supportedMethods;
    }

    validateWebhook(payload, signature) {
        return true; // Override in specific providers
    }

    processWebhook(payload) {
        throw new Error('processWebhook must be implemented by provider');
    }
}

// Stripe Payment Provider
export class StripeProvider extends PaymentProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'stripe';
        this.apiKey = config.apiKey;
        this.webhookSecret = config.webhookSecret;
        this.supportedMethods = [
            { id: 'card', name: 'Credit/Debit Card', currencies: ['USD', 'EUR', 'GBP'] },
            { id: 'bank', name: 'Bank Transfer', currencies: ['USD', 'EUR', 'GBP'] }
        ];
    }

    async processPayment(payment) {
        try {
            // This would integrate with actual Stripe API
            console.log('💳 Processing Stripe payment:', payment.id);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            return {
                success: true,
                transactionId: `stripe_${Date.now()}`,
                fee: payment.amount * 0.029 + 0.30 // Stripe's 2.9% + $0.30 fee
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async refundPayment(originalPayment, amount, reason) {
        try {
            console.log('💸 Processing Stripe refund:', originalPayment.id);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));

            return {
                success: true,
                refundId: `stripe_refund_${Date.now()}`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    validateWebhook(payload, signature) {
        // Implement Stripe webhook signature validation
        return true;
    }

    processWebhook(payload) {
        // Process Stripe webhook payload
        return {
            paymentId: payload.data?.object?.id,
            status: payload.data?.object?.status
        };
    }
}

// PayPal Payment Provider
export class PayPalProvider extends PaymentProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'paypal';
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        this.supportedMethods = [
            { id: 'paypal', name: 'PayPal Balance', currencies: ['USD', 'EUR', 'GBP', 'CAD'] }
        ];
    }

    async processPayment(payment) {
        try {
            console.log('💰 Processing PayPal payment:', payment.id);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            return {
                success: true,
                transactionId: `paypal_${Date.now()}`,
                fee: payment.amount * 0.029 + 0.30 // PayPal's 2.9% + $0.30 fee
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async refundPayment(originalPayment, amount, reason) {
        try {
            console.log('💸 Processing PayPal refund:', originalPayment.id);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800));

            return {
                success: true,
                refundId: `paypal_refund_${Date.now()}`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Cryptocurrency Payment Provider
export class CryptoProvider extends PaymentProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'crypto';
        this.supportedCurrencies = ['BTC', 'ETH', 'USDC', 'USDT'];
        this.supportedMethods = [
            { id: 'bitcoin', name: 'Bitcoin', currencies: ['BTC'] },
            { id: 'ethereum', name: 'Ethereum', currencies: ['ETH'] },
            { id: 'usdc', name: 'USD Coin', currencies: ['USDC'] },
            { id: 'usdt', name: 'Tether', currencies: ['USDT'] }
        ];
    }

    async processPayment(payment) {
        try {
            console.log('₿ Processing crypto payment:', payment.id);

            // Simulate blockchain confirmation
            await new Promise(resolve => setTimeout(resolve, 3000));

            return {
                success: true,
                transactionId: `crypto_${Date.now()}`,
                fee: 0.0001 // Small network fee
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async refundPayment(originalPayment, amount, reason) {
        // Crypto refunds are more complex, would require additional logic
        return {
            success: false,
            error: 'Cryptocurrency refunds not supported'
        };
    }
}

// Mock Payment Provider (for testing)
export class MockProvider extends PaymentProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'mock';
        this.failRate = config.failRate || 0.1; // 10% failure rate
        this.supportedMethods = [
            { id: 'mock_card', name: 'Mock Card', currencies: ['USD', 'EUR'] },
            { id: 'mock_bank', name: 'Mock Bank', currencies: ['USD'] }
        ];
    }

    async processPayment(payment) {
        await new Promise(resolve => setTimeout(resolve, 200));

        // Simulate random failures
        if (Math.random() < this.failRate) {
            return {
                success: false,
                error: 'Mock payment failed'
            };
        }

        return {
            success: true,
            transactionId: `mock_${Date.now()}`,
            fee: payment.amount * 0.02
        };
    }

    async refundPayment(originalPayment, amount, reason) {
        await new Promise(resolve => setTimeout(resolve, 100));

        return {
            success: true,
            refundId: `mock_refund_${Date.now()}`
        };
    }
}

// Create global instances
export const paymentGateway = new PaymentGateway({
    stripe: { enabled: true },
    paypal: { enabled: true },
    crypto: { enabled: true },
    mock: process.env.NODE_ENV === 'development'
});

export const fraudDetector = new FraudDetector();

// Auto-initialize
if (typeof window !== 'undefined') {
    window.paymentGateway = paymentGateway;
    window.fraudDetector = fraudDetector;
    console.log('🚀 Payment Gateway ready');
}

export default PaymentGateway;