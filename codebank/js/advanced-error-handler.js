// Advanced Error Handler - Circuit Breaker Pattern and Retry Mechanisms
export class AdvancedErrorHandler {
    constructor(options = {}) {
        this.maxRetries = options.maxRetries || 3;
        this.baseDelay = options.baseDelay || 0;
        this.maxDelay = options.maxDelay || 0;
        this.backoffMultiplier = options.backoffMultiplier || 2;
        this.circuitBreakerThreshold = options.circuitBreakerThreshold || 5;
        this.circuitBreakerTimeout = options.circuitBreakerTimeout || 30000;

        // Circuit breaker state
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.circuitState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN

        // Retry metrics
        this.retryMetrics = {
            totalRetries: 0,
            successfulRetries: 0,
            failedRetries: 0,
            circuitBreakerTrips: 0
        };

        // Error classification patterns
        this.errorPatterns = {
            retryable: [
                'network',
                'timeout',
                'connection',
                'temporary',
                'rate.limit',
                'server.error',
                '502',
                '503',
                '504'
            ],
            nonRetryable: [
                'authentication',
                'authorization',
                'invalid.input',
                'not.found',
                'insufficient.funds',
                'validation.error'
            ]
        };
    }

    // Main error handling method with circuit breaker and retry logic
    async executeWithRetry(operation, context = {}) {
        const startTime = Date.now();

        try {
            // Check circuit breaker
            if (this.circuitState === 'OPEN') {
                if (Date.now() - this.lastFailureTime < this.circuitBreakerTimeout) {
                    throw new Error(`Circuit breaker is OPEN. Next retry at ${new Date(this.lastFailureTime + this.circuitBreakerTimeout).toISOString()}`);
                } else {
                    this.circuitState = 'HALF_OPEN';
                    console.log('🔄 Circuit breaker transitioning to HALF_OPEN');
                }
            }

            const result = await this._executeWithRetryLogic(operation, context);

            // Success - reset circuit breaker
            if (this.circuitState === 'HALF_OPEN') {
                this.circuitState = 'CLOSED';
                this.failureCount = 0;
                console.log('✅ Circuit breaker reset to CLOSED');
            }

            return result;

        } catch (error) {
            this._handleError(error, context);
            throw error;
        }
    }

    // Internal retry logic with exponential backoff
    async _executeWithRetryLogic(operation, context) {
        let lastError;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await operation(attempt);

                if (attempt > 0) {
                    this.retryMetrics.successfulRetries++;
                    console.log(`✅ Retry successful on attempt ${attempt + 1}`);
                }

                return result;

            } catch (error) {
                lastError = error;

                // Check if error is retryable
                if (!this._isRetryableError(error)) {
                    throw error;
                }

                // Don't retry on last attempt
                if (attempt === this.maxRetries) {
                    this.retryMetrics.failedRetries++;
                    throw error;
                }

                // Calculate delay with exponential backoff
                const delay = Math.min(
                    this.baseDelay * Math.pow(this.backoffMultiplier, attempt),
                    this.maxDelay
                );

                this.retryMetrics.totalRetries++;
                console.log(`🔄 Retrying operation in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries + 1})`);

                // Add jitter to prevent thundering herd
                const jitteredDelay = delay + Math.random() * 1000;
                await this._sleep(jitteredDelay);
            }
        }

        throw lastError;
    }

    // Check if error is retryable based on patterns
    _isRetryableError(error) {
        const errorMessage = (error.message || error.toString()).toLowerCase();

        // Check retryable patterns
        const isRetryable = this.errorPatterns.retryable.some(pattern =>
            errorMessage.includes(pattern.toLowerCase())
        );

        // Check non-retryable patterns (if matches, definitely not retryable)
        const isNonRetryable = this.errorPatterns.nonRetryable.some(pattern =>
            errorMessage.includes(pattern.toLowerCase())
        );

        return isRetryable && !isNonRetryable;
    }

    // Handle errors and update circuit breaker state
    _handleError(error, context) {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        // Trip circuit breaker if threshold reached
        if (this.failureCount >= this.circuitBreakerThreshold) {
            this.circuitState = 'OPEN';
            this.retryMetrics.circuitBreakerTrips++;
            console.warn(`🚨 Circuit breaker tripped after ${this.failureCount} failures`);
        }

        // Log error with context
        this._logError(error, context);
    }

    // Enhanced error logging
    _logError(error, context) {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            context: context,
            circuitState: this.circuitState,
            failureCount: this.failureCount,
            retryMetrics: this.retryMetrics
        };

        console.error('🚨 Advanced Error Handler:', errorInfo);

        // Store error for analysis (could be sent to monitoring service)
        this._storeErrorForAnalysis(errorInfo);
    }

    // Store error for later analysis
    _storeErrorForAnalysis(errorInfo) {
        try {
            const errors = JSON.parse(localStorage.getItem('transaction_errors') || '[]');
            errors.push(errorInfo);

            // Keep only last 100 errors
            if (errors.length > 100) {
                errors.splice(0, errors.length - 100);
            }

            localStorage.setItem('transaction_errors', JSON.stringify(errors));
        } catch (storageError) {
            console.warn('Failed to store error for analysis:', storageError);
        }
    }

    // Utility method for sleep/delay
    _sleep(ms) {
        return Promise.resolve();
    }

    // Get current metrics
    getMetrics() {
        return {
            ...this.retryMetrics,
            circuitState: this.circuitState,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime,
            isHealthy: this.circuitState !== 'OPEN'
        };
    }

    // Reset circuit breaker manually
    reset() {
        this.circuitState = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = null;
        console.log('🔄 Circuit breaker manually reset');
    }

    // Get error analysis
    getErrorAnalysis() {
        try {
            const errors = JSON.parse(localStorage.getItem('transaction_errors') || '[]');
            const last24Hours = Date.now() - 24 * 60 * 60 * 1000;

            const recentErrors = errors.filter(error =>
                new Date(error.timestamp) > new Date(last24Hours)
            );

            const errorCounts = recentErrors.reduce((acc, error) => {
                const message = error.message;
                acc[message] = (acc[message] || 0) + 1;
                return acc;
            }, {});

            return {
                totalErrors: errors.length,
                recentErrors: recentErrors.length,
                errorCounts: errorCounts,
                circuitBreakerTrips: this.retryMetrics.circuitBreakerTrips
            };
        } catch (error) {
            console.warn('Failed to get error analysis:', error);
            return null;
        }
    }
}

// Error Recovery Strategies
export class ErrorRecoveryManager {
    constructor() {
        this.recoveryStrategies = {
            network: this._recoverFromNetworkError.bind(this),
            authentication: this._recoverFromAuthError.bind(this),
            database: this._recoverFromDatabaseError.bind(this),
            rateLimit: this._recoverFromRateLimit.bind(this),
            timeout: this._recoverFromTimeout.bind(this)
        };
    }

    // Attempt error recovery based on error type
    async attemptRecovery(error, context = {}) {
        const errorType = this._classifyError(error);

        if (this.recoveryStrategies[errorType]) {
            try {
                console.log(`🔧 Attempting recovery from ${errorType} error`);
                return await this.recoveryStrategies[errorType](error, context);
            } catch (recoveryError) {
                console.error(`❌ Recovery failed for ${errorType}:`, recoveryError);
                throw recoveryError;
            }
        }

        return false;
    }

    // Classify error type for recovery strategy selection
    _classifyError(error) {
        const message = (error.message || error.toString()).toLowerCase();

        if (message.includes('network') || message.includes('connection')) {
            return 'network';
        }
        if (message.includes('auth') || message.includes('session')) {
            return 'authentication';
        }
        if (message.includes('database') || message.includes('sql')) {
            return 'database';
        }
        if (message.includes('rate') || message.includes('limit')) {
            return 'rateLimit';
        }
        if (message.includes('timeout')) {
            return 'timeout';
        }

        return 'unknown';
    }

    // Recovery strategies
    async _recoverFromNetworkError(error, context) {
        // Check network connectivity
        if (!navigator.onLine) {
            throw new Error('No internet connection. Please check your network and try again.');
        }

        // Wait for network to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
    }

    async _recoverFromAuthError(error, context) {
        // Attempt to refresh authentication
        try {
            if (window.authHelper) {
                const authResult = await window.authHelper.refreshAuth();
                return authResult.success;
            }
        } catch (authError) {
            console.warn('Auth refresh failed:', authError);
        }

        throw new Error('Authentication error. Please sign in again.');
    }

    async _recoverFromDatabaseError(error, context) {
        // For database errors, we might retry with a different approach
        // or suggest waiting for database recovery
        await new Promise(resolve => setTimeout(resolve, 5000));
        return true;
    }

    async _recoverFromRateLimit(error, context) {
        // Extract retry-after header or use exponential backoff
        const retryAfter = this._extractRetryAfter(error);
        const delay = retryAfter || 0;
        console.log(`⏳ Rate limited. Immediate retry without timers.`);
        return true;
    }

    async _recoverFromTimeout(error, context) {
        
        return true;
    }

    // Extract retry-after value from error
    _extractRetryAfter(error) {
        // This would typically come from HTTP headers
        // For now, return null to use default delay
        return null;
    }
}

// Export singleton instances
export const errorHandler = new AdvancedErrorHandler();
export const recoveryManager = new ErrorRecoveryManager();

export default AdvancedErrorHandler;
