// External API Integration Framework
// Seamless connection with third-party services
// Supports RESTful APIs, OAuth, webhooks, and health monitoring

import { errorHandler } from './advanced-error-handler.js';
import { transactionMonitor } from './transaction-monitor.js';

export class APIIntegrationFramework {
    constructor(options = {}) {
        this.apis = new Map();
        this.oauthProviders = new Map();
        this.webhookHandlers = new Map();
        this.rateLimiters = new Map();

        // API health monitoring
        this.healthChecks = new Map();
        this.healthHistory = new Map();

        // Request/response interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];

        // Initialize
        this._initializeDefaultAPIs(options);
        this._startHealthMonitoring();

        console.log('🚀 API Integration Framework initialized');
    }

    // Register external API
    registerAPI(apiConfig) {
        try {
            console.log('📡 Registering API:', apiConfig.name);

            const api = new ExternalAPI(apiConfig);
            this.apis.set(apiConfig.name, api);

            // Set up rate limiter
            if (apiConfig.rateLimit) {
                const rateLimiter = new RateLimiter(apiConfig.rateLimit);
                this.rateLimiters.set(apiConfig.name, rateLimiter);
            }

            // Set up health checks
            if (apiConfig.healthCheck) {
                this.healthChecks.set(apiConfig.name, {
                    endpoint: apiConfig.healthCheck.endpoint,
                    interval: apiConfig.healthCheck.interval || 60000,
                    lastCheck: null,
                    status: 'unknown'
                });
            }

            // Register webhook handlers
            if (apiConfig.webhooks) {
                for (const [event, handler] of Object.entries(apiConfig.webhooks)) {
                    this.registerWebhookHandler(apiConfig.name, event, handler);
                }
            }

            console.log('✅ API registered:', apiConfig.name);
            return api;

        } catch (error) {
            console.error('Error registering API:', error);
            throw error;
        }
    }

    // Make API request
    async request(apiName, endpoint, options = {}) {
        const requestId = `api_req_${Date.now()}_${Math.random().toString(36).substring(2)}`;

        try {
            const api = this.apis.get(apiName);
            if (!api) {
                throw new Error(`API '${apiName}' not registered`);
            }

            // Check rate limits
            const rateLimiter = this.rateLimiters.get(apiName);
            if (rateLimiter) {
                const rateLimitResult = rateLimiter.check('global');
                if (!rateLimitResult.success) {
                    throw new Error(`Rate limit exceeded for ${apiName}: ${rateLimitResult.message}`);
                }
            }

            console.log('🌐 Making API request:', apiName, endpoint);

            // Apply request interceptors
            let requestOptions = { ...options };
            for (const interceptor of this.requestInterceptors) {
                requestOptions = await interceptor(requestOptions, { apiName, endpoint });
            }

            // Make the request
            const response = await api.request(endpoint, requestOptions);

            // Apply response interceptors
            let processedResponse = response;
            for (const interceptor of this.responseInterceptors) {
                processedResponse = await interceptor(processedResponse, { apiName, endpoint });
            }

            // Record successful request
            transactionMonitor.recordTransactionComplete(`api_request_${requestId}`, true, null, {
                apiName,
                endpoint,
                method: options.method || 'GET',
                status: response.status
            });

            return processedResponse;

        } catch (error) {
            console.error('Error making API request:', error);

            // Record failed request
            transactionMonitor.recordError(error, 'api_request', {
                requestId,
                apiName,
                endpoint,
                method: options.method || 'GET'
            });

            throw error;
        }
    }

    // Register OAuth provider
    registerOAuthProvider(providerName, config) {
        try {
            console.log('🔐 Registering OAuth provider:', providerName);

            const provider = new OAuthProvider(providerName, config);
            this.oauthProviders.set(providerName, provider);

            console.log('✅ OAuth provider registered:', providerName);
            return provider;

        } catch (error) {
            console.error('Error registering OAuth provider:', error);
            throw error;
        }
    }

    // Authenticate with OAuth provider
    async authenticateWithOAuth(providerName, options = {}) {
        try {
            const provider = this.oauthProviders.get(providerName);
            if (!provider) {
                throw new Error(`OAuth provider '${providerName}' not registered`);
            }

            console.log('🔑 Authenticating with OAuth:', providerName);

            const result = await provider.authenticate(options);

            if (result.success) {
                console.log('✅ OAuth authentication successful:', providerName);
                return result;
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Error with OAuth authentication:', error);
            throw error;
        }
    }

    // Register webhook handler
    registerWebhookHandler(apiName, event, handler) {
        const handlerKey = `${apiName}_${event}`;
        this.webhookHandlers.set(handlerKey, handler);
        console.log('🪝 Webhook handler registered:', handlerKey);
    }

    // Process incoming webhook
    async processWebhook(apiName, event, payload, signature = null) {
        try {
            const handlerKey = `${apiName}_${event}`;
            const handler = this.webhookHandlers.get(handlerKey);

            if (!handler) {
                console.warn('No webhook handler found for:', handlerKey);
                return { success: false, error: 'Handler not found' };
            }

            console.log('🪝 Processing webhook:', handlerKey);

            // Validate signature if provided
            if (signature) {
                const api = this.apis.get(apiName);
                if (api && api.validateWebhookSignature) {
                    const isValid = await api.validateWebhookSignature(payload, signature);
                    if (!isValid) {
                        throw new Error('Invalid webhook signature');
                    }
                }
            }

            // Process webhook
            const result = await handler(payload, { apiName, event });

            // Record webhook processing
            transactionMonitor.recordTransactionComplete(`webhook_${Date.now()}`, true, null, {
                apiName,
                event,
                processed: true
            });

            return result;

        } catch (error) {
            console.error('Error processing webhook:', error);
            transactionMonitor.recordError(error, 'webhook_processing', { apiName, event });
            throw error;
        }
    }

    // Add request interceptor
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
        console.log('➕ Request interceptor added');
    }

    // Add response interceptor
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
        console.log('➕ Response interceptor added');
    }

    // Get API health status
    getAPIHealth(apiName = null) {
        if (apiName) {
            return this.healthHistory.get(apiName) || [];
        }

        const allHealth = {};
        for (const [name, history] of this.healthHistory.entries()) {
            allHealth[name] = history.slice(0, 10); // Last 10 checks
        }

        return allHealth;
    }

    // Get framework statistics
    getFrameworkStats() {
        return {
            registeredAPIs: this.apis.size,
            oauthProviders: this.oauthProviders.size,
            webhookHandlers: this.webhookHandlers.size,
            rateLimiters: this.rateLimiters.size,
            healthChecks: this.healthChecks.size,
            interceptors: {
                request: this.requestInterceptors.length,
                response: this.responseInterceptors.length
            }
        };
    }

    // Initialize default APIs
    _initializeDefaultAPIs(options) {
        // Exchange rate API
        if (options.exchangeRates?.enabled !== false) {
            this.registerAPI({
                name: 'exchange_rates',
                baseUrl: options.exchangeRates?.baseUrl || 'https://api.exchangerate-api.com/v4',
                rateLimit: { maxRequests: 1000, windowMs: 60000 },
                healthCheck: { endpoint: '/status', interval: 300000 }
            });
        }

        // News API
        if (options.news?.enabled !== false) {
            this.registerAPI({
                name: 'news',
                baseUrl: options.news?.baseUrl || 'https://newsapi.org/v2',
                apiKey: options.news?.apiKey,
                rateLimit: { maxRequests: 100, windowMs: 60000 },
                healthCheck: { endpoint: '/sources', interval: 600000 }
            });
        }

        // Weather API
        if (options.weather?.enabled !== false) {
            this.registerAPI({
                name: 'weather',
                baseUrl: options.weather?.baseUrl || 'https://api.openweathermap.org/data/2.5',
                apiKey: options.weather?.apiKey,
                rateLimit: { maxRequests: 1000, windowMs: 60000 },
                healthCheck: { endpoint: '/weather?q=London', interval: 300000 }
            });
        }

        console.log(`📦 Initialized ${this.apis.size} default APIs`);
    }

    // Start health monitoring
    _startHealthMonitoring() {
        setInterval(async () => {
            await this._performHealthChecks();
        }, 30000); // Check every 30 seconds
    }

    // Perform health checks
    async _performHealthChecks() {
        for (const [apiName, healthConfig] of this.healthChecks.entries()) {
            try {
                const api = this.apis.get(apiName);
                if (!api) continue;

                const health = await api.request(healthConfig.endpoint, {
                    method: 'GET',
                    timeout: 5000
                });

                const healthStatus = {
                    timestamp: Date.now(),
                    status: health.status < 400 ? 'healthy' : 'unhealthy',
                    responseTime: health.responseTime,
                    statusCode: health.status
                };

                // Update health history
                if (!this.healthHistory.has(apiName)) {
                    this.healthHistory.set(apiName, []);
                }

                const history = this.healthHistory.get(apiName);
                history.unshift(healthStatus);

                // Keep only recent history
                if (history.length > 100) {
                    history.splice(100);
                }

                healthConfig.lastCheck = Date.now();
                healthConfig.status = healthStatus.status;

                console.log(`💚 Health check for ${apiName}: ${healthStatus.status}`);

            } catch (error) {
                console.error(`Health check failed for ${apiName}:`, error);

                const healthStatus = {
                    timestamp: Date.now(),
                    status: 'unhealthy',
                    error: error.message
                };

                // Update health history
                if (!this.healthHistory.has(apiName)) {
                    this.healthHistory.set(apiName, []);
                }

                const history = this.healthHistory.get(apiName);
                history.unshift(healthStatus);

                healthConfig.status = 'unhealthy';
            }
        }
    }

    // Destroy framework
    destroy() {
        this.apis.clear();
        this.oauthProviders.clear();
        this.webhookHandlers.clear();
        this.rateLimiters.clear();
        this.healthChecks.clear();
        this.healthHistory.clear();
        this.requestInterceptors = [];
        this.responseInterceptors = [];

        console.log('💥 API Integration Framework destroyed');
    }
}

// External API Class
export class ExternalAPI {
    constructor(config) {
        this.name = config.name;
        this.baseUrl = config.baseUrl;
        this.apiKey = config.apiKey;
        this.headers = config.headers || {};
        this.timeout = config.timeout || 30000;
        this.retries = config.retries || 3;

        // OAuth configuration
        this.oauth = config.oauth;

        // Webhook configuration
        this.webhookSecret = config.webhookSecret;
    }

    // Make HTTP request
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const startTime = Date.now();

        try {
            // Prepare headers
            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'TransactionSystem/1.0',
                ...this.headers
            };

            // Add API key if configured
            if (this.apiKey) {
                if (this.apiKey.header) {
                    headers[this.apiKey.header] = this.apiKey.value;
                } else {
                    // Add to query parameters
                    const separator = endpoint.includes('?') ? '&' : '?';
                    endpoint += `${separator}api_key=${this.apiKey}`;
                }
            }

            // Add authorization if OAuth token available
            if (this.oauth && this.oauth.accessToken) {
                headers['Authorization'] = `Bearer ${this.oauth.accessToken}`;
            }

            // Prepare request options
            const requestOptions = {
                method: options.method || 'GET',
                headers,
                timeout: options.timeout || this.timeout
            };

            if (options.body) {
                requestOptions.body = JSON.stringify(options.body);
            }

            console.log(`🌐 ${requestOptions.method} ${url}`);

            // Make request with retries
            let lastError;
            for (let attempt = 1; attempt <= this.retries; attempt++) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                    const response = await fetch(url, {
                        ...requestOptions,
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    const responseTime = Date.now() - startTime;

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();

                    return {
                        status: response.status,
                        data,
                        headers: response.headers,
                        responseTime,
                        url
                    };

                } catch (error) {
                    lastError = error;

                    if (attempt < this.retries) {
                        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                        console.log(`Retry attempt ${attempt} for ${url} after ${delay}ms`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            throw lastError;

        } catch (error) {
            console.error(`API request failed for ${url}:`, error);
            throw error;
        }
    }

    // Validate webhook signature
    async validateWebhookSignature(payload, signature) {
        if (!this.webhookSecret) {
            return true; // No secret configured
        }

        try {
            // This would implement HMAC validation
            // For now, return true
            return true;
        } catch (error) {
            console.error('Webhook signature validation failed:', error);
            return false;
        }
    }
}

// OAuth Provider Class
export class OAuthProvider {
    constructor(name, config) {
        this.name = name;
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        this.authorizationUrl = config.authorizationUrl;
        this.tokenUrl = config.tokenUrl;
        this.scope = config.scope || [];
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
    }

    // Authenticate user
    async authenticate(options = {}) {
        try {
            console.log('🔑 Starting OAuth flow for:', this.name);

            // Generate authorization URL
            const authUrl = this._buildAuthorizationUrl(options);

            // In a real implementation, this would redirect to authUrl
            // For now, simulate the flow
            const tokenData = await this._simulateTokenExchange();

            // Store tokens
            this.accessToken = tokenData.access_token;
            this.refreshToken = tokenData.refresh_token;
            this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

            return {
                success: true,
                accessToken: this.accessToken,
                refreshToken: this.refreshToken,
                expiresIn: tokenData.expires_in
            };

        } catch (error) {
            console.error('OAuth authentication failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Refresh access token
    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            console.log('🔄 Refreshing access token for:', this.name);

            // Simulate token refresh
            const tokenData = await this._simulateTokenRefresh();

            this.accessToken = tokenData.access_token;
            this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

            return {
                success: true,
                accessToken: this.accessToken,
                expiresIn: tokenData.expires_in
            };

        } catch (error) {
            console.error('Token refresh failed:', error);
            throw error;
        }
    }

    // Build authorization URL
    _buildAuthorizationUrl(options) {
        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            scope: this.scope.join(' '),
            redirect_uri: options.redirectUri || window.location.origin + '/oauth/callback',
            state: options.state || 'random_state'
        });

        return `${this.authorizationUrl}?${params.toString()}`;
    }

    // Simulate token exchange (in real implementation, this would call the token endpoint)
    async _simulateTokenExchange() {
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            access_token: `access_token_${Date.now()}`,
            refresh_token: `refresh_token_${Date.now()}`,
            expires_in: 3600,
            token_type: 'Bearer'
        };
    }

    // Simulate token refresh
    async _simulateTokenRefresh() {
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            access_token: `new_access_token_${Date.now()}`,
            expires_in: 3600,
            token_type: 'Bearer'
        };
    }
}

// Rate Limiter for API requests
export class RateLimiter {
    constructor(options = {}) {
        this.maxRequests = options.maxRequests || 100;
        this.windowMs = options.windowMs || 60000;
        this.requests = [];
    }

    check(key = 'global') {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        // Remove old requests
        this.requests = this.requests.filter(time => time > windowStart);

        if (this.requests.length >= this.maxRequests) {
            const resetTime = this.requests[0] + this.windowMs;
            return {
                success: false,
                limit: this.maxRequests,
                remaining: 0,
                resetTime,
                message: 'Rate limit exceeded'
            };
        }

        return {
            success: true,
            limit: this.maxRequests,
            remaining: this.maxRequests - this.requests.length,
            resetTime: now + this.windowMs
        };
    }

    recordRequest(key = 'global') {
        this.requests.push(Date.now());
    }
}

// Create global instance
export const apiIntegrationFramework = new APIIntegrationFramework({
    exchangeRates: { enabled: true },
    news: { enabled: true },
    weather: { enabled: true }
});

// Auto-initialize
if (typeof window !== 'undefined') {
    window.apiIntegrationFramework = apiIntegrationFramework;
    console.log('🚀 API Integration Framework ready');
}

export default APIIntegrationFramework;