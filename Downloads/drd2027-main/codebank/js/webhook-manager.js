// Webhook Manager for External API Integration
// Handles incoming webhooks from external services
// Provides validation, processing, and response management

import { errorHandler } from './advanced-error-handler.js';
import { transactionMonitor } from './transaction-monitor.js';

export class WebhookManager {
    constructor(options = {}) {
        this.webhookHandlers = new Map();
        this.webhookSecrets = new Map();
        this.webhookHistory = [];
        this.maxHistorySize = options.maxHistorySize || 10000;

        // Retry configuration
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;

        // Initialize
        this._initializeDefaultHandlers();
        this._startCleanupTask();

        console.log('🚀 Webhook Manager initialized');
    }

    // Register webhook handler
    registerHandler(serviceName, eventType, handler, options = {}) {
        const handlerKey = `${serviceName}:${eventType}`;

        const handlerConfig = {
            handler,
            serviceName,
            eventType,
            secret: options.secret,
            validateSignature: options.validateSignature !== false,
            retryPolicy: options.retryPolicy || 'immediate',
            timeout: options.timeout || 30000,
            registeredAt: new Date().toISOString()
        };

        this.webhookHandlers.set(handlerKey, handlerConfig);

        if (options.secret) {
            this.webhookSecrets.set(serviceName, options.secret);
        }

        console.log('✅ Webhook handler registered:', handlerKey);
        return handlerKey;
    }

    // Process incoming webhook
    async processWebhook(serviceName, eventType, payload, headers = {}, options = {}) {
        const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        const startTime = Date.now();

        try {
            console.log('🪝 Processing webhook:', serviceName, eventType);

            const handlerKey = `${serviceName}:${eventType}`;
            const handlerConfig = this.webhookHandlers.get(handlerKey);

            if (!handlerConfig) {
                throw new Error(`No handler registered for ${handlerKey}`);
            }

            // Validate webhook signature if required
            if (handlerConfig.validateSignature) {
                const isValid = await this._validateWebhookSignature(
                    serviceName,
                    payload,
                    headers
                );

                if (!isValid) {
                    throw new Error('Invalid webhook signature');
                }
            }

            // Create webhook context
            const webhookContext = {
                id: webhookId,
                serviceName,
                eventType,
                payload,
                headers,
                timestamp: new Date().toISOString(),
                sourceIp: headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown',
                userAgent: headers['user-agent'] || 'unknown'
            };

            // Process webhook with timeout and retry logic
            const result = await this._executeWebhookHandler(
                handlerConfig,
                webhookContext,
                options
            );

            // Record successful processing
            const processingTime = Date.now() - startTime;
            this._recordWebhookEvent({
                id: webhookId,
                serviceName,
                eventType,
                status: 'success',
                processingTime,
                result: result.data,
                timestamp: Date.now()
            });

            transactionMonitor.recordTransactionComplete(`webhook_${webhookId}`, true, null, {
                serviceName,
                eventType,
                processingTime,
                status: 'success'
            });

            console.log('✅ Webhook processed successfully:', webhookId);
            return {
                success: true,
                webhookId,
                result: result.data,
                processingTime
            };

        } catch (error) {
            console.error('Error processing webhook:', error);

            // Record failed processing
            const processingTime = Date.now() - startTime;
            this._recordWebhookEvent({
                id: webhookId,
                serviceName,
                eventType,
                status: 'failed',
                processingTime,
                error: error.message,
                timestamp: Date.now()
            });

            transactionMonitor.recordError(error, 'webhook_processing', {
                webhookId,
                serviceName,
                eventType,
                processingTime
            });

            return {
                success: false,
                webhookId,
                error: error.message,
                processingTime
            };
        }
    }

    // Get webhook history
    getWebhookHistory(filters = {}) {
        let history = [...this.webhookHistory];

        if (filters.serviceName) {
            history = history.filter(h => h.serviceName === filters.serviceName);
        }

        if (filters.eventType) {
            history = history.filter(h => h.eventType === filters.eventType);
        }

        if (filters.status) {
            history = history.filter(h => h.status === filters.status);
        }

        if (filters.fromDate) {
            history = history.filter(h => h.timestamp >= filters.fromDate);
        }

        if (filters.toDate) {
            history = history.filter(h => h.timestamp <= filters.toDate);
        }

        if (filters.limit) {
            history = history.slice(0, filters.limit);
        }

        return history.sort((a, b) => b.timestamp - a.timestamp);
    }

    // Get webhook statistics
    getWebhookStats(timeframe = '24h') {
        const now = Date.now();
        const timeframeMs = this._parseTimeframe(timeframe);

        const recentWebhooks = this.webhookHistory.filter(
            h => now - h.timestamp < timeframeMs
        );

        const stats = {
            total: recentWebhooks.length,
            successful: 0,
            failed: 0,
            averageProcessingTime: 0,
            byService: {},
            byEventType: {}
        };

        let totalProcessingTime = 0;

        for (const webhook of recentWebhooks) {
            if (webhook.status === 'success') {
                stats.successful++;
            } else {
                stats.failed++;
            }

            totalProcessingTime += webhook.processingTime || 0;

            // By service
            stats.byService[webhook.serviceName] = (stats.byService[webhook.serviceName] || 0) + 1;

            // By event type
            stats.byEventType[webhook.eventType] = (stats.byEventType[webhook.eventType] || 0) + 1;
        }

        stats.averageProcessingTime = stats.total > 0 ? totalProcessingTime / stats.total : 0;
        stats.successRate = stats.total > 0 ? (stats.successful / stats.total) * 100 : 0;

        return stats;
    }

    // Validate webhook signature
    async _validateWebhookSignature(serviceName, payload, headers) {
        try {
            const secret = this.webhookSecrets.get(serviceName);
            if (!secret) {
                return true; // No secret configured
            }

            const signature = headers['x-signature'] || headers['x-hub-signature'];
            if (!signature) {
                throw new Error('No signature provided');
            }

            // Generate expected signature
            const expectedSignature = await this._generateSignature(payload, secret);

            // Compare signatures
            return this._compareSignatures(signature, expectedSignature);

        } catch (error) {
            console.error('Webhook signature validation failed:', error);
            return false;
        }
    }

    // Generate HMAC signature
    async _generateSignature(payload, secret) {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(payload));
        const key = encoder.encode(secret);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            key,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
        const hashArray = Array.from(new Uint8Array(signature));

        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Compare signatures securely
    _compareSignatures(providedSignature, expectedSignature) {
        // Use constant-time comparison to prevent timing attacks
        if (providedSignature.length !== expectedSignature.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < providedSignature.length; i++) {
            result |= providedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
        }

        return result === 0;
    }

    // Execute webhook handler with retry logic
    async _executeWebhookHandler(handlerConfig, context, options) {
        const maxRetries = options.maxRetries || this.maxRetries;
        const retryDelay = options.retryDelay || this.retryDelay;

        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Execute handler with timeout
                const result = await Promise.race([
                    handlerConfig.handler(context),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Handler timeout')), handlerConfig.timeout)
                    )
                ]);

                return {
                    success: true,
                    data: result,
                    attempts: attempt
                };

            } catch (error) {
                lastError = error;

                if (attempt < maxRetries) {
                    console.log(`Retry attempt ${attempt} for webhook ${context.id} after ${retryDelay}ms`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                }
            }
        }

        throw lastError;
    }

    // Record webhook event
    _recordWebhookEvent(eventData) {
        this.webhookHistory.unshift(eventData);

        // Keep only recent history
        if (this.webhookHistory.length > this.maxHistorySize) {
            this.webhookHistory = this.webhookHistory.slice(0, this.maxHistorySize);
        }

        // Persist periodically
        if (this.webhookHistory.length % 100 === 0) {
            this._persistWebhookHistory();
        }
    }

    // Initialize default webhook handlers
    _initializeDefaultHandlers() {
        // Payment gateway webhooks
        this.registerHandler('stripe', 'payment_intent.succeeded', this._handleStripePaymentSuccess.bind(this));
        this.registerHandler('stripe', 'payment_intent.payment_failed', this._handleStripePaymentFailure.bind(this));
        this.registerHandler('paypal', 'payment.completed', this._handlePayPalPaymentCompleted.bind(this));
        this.registerHandler('paypal', 'payment.failed', this._handlePayPalPaymentFailed.bind(this));

        // Blockchain webhooks
        this.registerHandler('ethereum', 'transaction.confirmed', this._handleEthereumTransaction.bind(this));
        this.registerHandler('polygon', 'transaction.confirmed', this._handlePolygonTransaction.bind(this));

        // External API webhooks
        this.registerHandler('exchange_rates', 'rate.updated', this._handleExchangeRateUpdate.bind(this));
        this.registerHandler('news', 'article.published', this._handleNewsArticle.bind(this));
    }

    // Default webhook handlers

    async _handleStripePaymentSuccess(context) {
        console.log('💳 Stripe payment succeeded:', context.payload.id);

        // Update payment status in database
        // This would integrate with the payment gateway system

        return { processed: true, paymentId: context.payload.id };
    }

    async _handleStripePaymentFailure(context) {
        console.log('❌ Stripe payment failed:', context.payload.id);

        // Handle payment failure
        // This would integrate with the payment gateway system

        return { processed: true, paymentId: context.payload.id };
    }

    async _handlePayPalPaymentCompleted(context) {
        console.log('💰 PayPal payment completed:', context.payload.id);

        return { processed: true, paymentId: context.payload.id };
    }

    async _handlePayPalPaymentFailed(context) {
        console.log('❌ PayPal payment failed:', context.payload.id);

        return { processed: true, paymentId: context.payload.id };
    }

    async _handleEthereumTransaction(context) {
        console.log('⛓️ Ethereum transaction confirmed:', context.payload.transactionHash);

        // Update transaction status
        // This would integrate with the blockchain integration system

        return { processed: true, transactionHash: context.payload.transactionHash };
    }

    async _handlePolygonTransaction(context) {
        console.log('⛓️ Polygon transaction confirmed:', context.payload.transactionHash);

        return { processed: true, transactionHash: context.payload.transactionHash };
    }

    async _handleExchangeRateUpdate(context) {
        console.log('💱 Exchange rate updated:', context.payload.from, 'to', context.payload.to);

        // Update cached exchange rates
        // This would integrate with the cache layer

        return { processed: true, rate: context.payload.rate };
    }

    async _handleNewsArticle(context) {
        console.log('📰 News article published:', context.payload.title);

        // Process news article
        // This could trigger notifications or update feeds

        return { processed: true, articleId: context.payload.id };
    }

    // Start cleanup task
    _startCleanupTask() {
        setInterval(() => {
            this._cleanupOldHistory();
        }, 3600000); // Clean up every hour
    }

    // Clean up old webhook history
    _cleanupOldHistory() {
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        const cutoffTime = Date.now() - maxAge;

        const originalLength = this.webhookHistory.length;
        this.webhookHistory = this.webhookHistory.filter(event => event.timestamp > cutoffTime);

        const cleanedCount = originalLength - this.webhookHistory.length;
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} old webhook history entries`);
        }
    }

    // Persist webhook history
    _persistWebhookHistory() {
        try {
            localStorage.setItem('webhook_history', JSON.stringify(this.webhookHistory.slice(0, 1000)));
        } catch (error) {
            console.warn('Failed to persist webhook history:', error);
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

    // Get manager statistics
    getManagerStats() {
        return {
            registeredHandlers: this.webhookHandlers.size,
            totalHistory: this.webhookHistory.length,
            services: Array.from(new Set(this.webhookHistory.map(h => h.serviceName))),
            maxHistorySize: this.maxHistorySize
        };
    }

    // Clear webhook history
    clearHistory() {
        this.webhookHistory = [];
        localStorage.removeItem('webhook_history');
        console.log('🗑️ Webhook history cleared');
    }

    // Destroy webhook manager
    destroy() {
        this.webhookHandlers.clear();
        this.webhookSecrets.clear();
        this.webhookHistory = [];

        console.log('💥 Webhook Manager destroyed');
    }
}

// Create global instance
export const webhookManager = new WebhookManager({
    maxHistorySize: 10000,
    maxRetries: 3,
    retryDelay: 1000
});

// Auto-initialize
if (typeof window !== 'undefined') {
    window.webhookManager = webhookManager;
    console.log('🚀 Webhook Manager ready');
}

export default WebhookManager;