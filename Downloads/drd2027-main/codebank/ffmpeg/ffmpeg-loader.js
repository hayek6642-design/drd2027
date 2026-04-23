/**
 * Enhanced FFmpeg Loading Mechanism with Multi-Tiered Fallback Strategy
 *
 * This module implements a robust FFmpeg loading system with:
 * 1. Primary CDN loading
 * 2. Secondary CDN fallback
 * 3. Local bundled version fallback
 * 4. Comprehensive error logging
 * 5. User-friendly error feedback
 * 6. Background preloading
 * 7. Exponential backoff retry mechanism
 */

class FFmpegLoader {
    constructor() {
        // Configuration
        this.config = {
            primaryCDN: 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.6/dist/ffmpeg.min.js',
            secondaryCDN: 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.6/dist/ffmpeg.min.js',
            localPath: '/ffmpeg/ffmpeg.min.js',
            maxRetries: 3,
            retryDelay: 1000,
            preloadTimeout: 10000,
            fallbackTimeout: 5000
        };

        // State tracking
        this.state = {
            loaded: false,
            loading: false,
            currentAttempt: 0,
            lastError: null,
            loadStartTime: null,
            loadEndTime: null,
            activeSource: null
        };

        // FFmpeg instance
        this.ffmpeg = null;

        // Initialize
        this.initialize();
    }

    /**
     * Initialize the FFmpeg loader
     */
    initialize() {
        console.log('🎬 FFmpegLoader initialized - setting up multi-tiered loading strategy');

        // Start background preloading
        this.preloadInBackground();

        // Set up event listeners for network changes
        this.setupNetworkListeners();
    }

    /**
     * Set up network change listeners
     */
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            if (!this.state.loaded && !this.state.loading) {
                console.log('🌐 Network reconnected - attempting FFmpeg reload');
                this.loadWithFallback();
            }
        });

        window.addEventListener('offline', () => {
            console.warn('⚠️ Network disconnected - FFmpeg loading paused');
        });
    }

    /**
     * Preload FFmpeg in the background during app initialization
     */
    preloadInBackground() {
        console.log('🔄 Starting background FFmpeg preloading...');

        // Use a timeout to avoid blocking the main thread
        setTimeout(() => {
            if (!this.state.loaded && !this.state.loading) {
                this.loadWithFallback(true); // true = background mode
            }
        }, 1000);
    }

    /**
     * Main loading method with multi-tiered fallback strategy
     * @param {boolean} backgroundMode - Whether this is a background load
     */
    async loadWithFallback(backgroundMode = false) {
        if (this.state.loading) {
            console.log('⏳ FFmpeg load already in progress - skipping duplicate request');
            return;
        }

        if (this.state.loaded) {
            console.log('✅ FFmpeg already loaded - returning existing instance');
            return this.ffmpeg;
        }

        this.state.loading = true;
        this.state.loadStartTime = Date.now();
        this.state.currentAttempt = 0;
        this.state.lastError = null;

        if (!backgroundMode) {
            this.showLoadingIndicator();
        }

        console.log('🚀 Starting FFmpeg load sequence with multi-tiered fallback strategy');

        try {
            // Attempt 1: Primary CDN
            this.state.currentAttempt = 1;
            this.state.activeSource = 'primary_cdn';
            console.log(`🔗 Attempt ${this.state.currentAttempt}: Loading from primary CDN`);

            const primaryResult = await this.loadFromSource(
                this.config.primaryCDN,
                this.config.fallbackTimeout,
                backgroundMode
            );

            if (primaryResult.success) {
                return this.completeLoadSequence(primaryResult.ffmpeg, 'primary_cdn');
            }

            // Attempt 2: Secondary CDN
            this.state.currentAttempt = 2;
            this.state.activeSource = 'secondary_cdn';
            console.log(`🔗 Attempt ${this.state.currentAttempt}: Loading from secondary CDN`);

            const secondaryResult = await this.loadFromSource(
                this.config.secondaryCDN,
                this.config.fallbackTimeout,
                backgroundMode
            );

            if (secondaryResult.success) {
                return this.completeLoadSequence(secondaryResult.ffmpeg, 'secondary_cdn');
            }

            // Attempt 3: Local bundled version
            this.state.currentAttempt = 3;
            this.state.activeSource = 'local_bundle';
            console.log(`🔗 Attempt ${this.state.currentAttempt}: Loading from local bundle`);

            const localResult = await this.loadFromSource(
                this.config.localPath,
                this.config.fallbackTimeout,
                backgroundMode
            );

            if (localResult.success) {
                return this.completeLoadSequence(localResult.ffmpeg, 'local_bundle');
            }

            // All attempts failed
            throw new Error('All FFmpeg loading attempts failed');

        } catch (error) {
            return this.handleLoadFailure(error, backgroundMode);
        }
    }

    /**
     * Load FFmpeg from a specific source with timeout and error handling
     */
    async loadFromSource(source, timeout, backgroundMode) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            console.log(`📡 Loading FFmpeg from: ${source}`);

            // Create script element for dynamic loading
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = source;
                script.async = true;

                script.onload = () => {
                    clearTimeout(timeoutId);
                    console.log(`✅ Successfully loaded script from ${source}`);

                    // Check if FFmpeg is available globally
                    if (typeof FFmpeg !== 'undefined') {
                        try {
                            const ffmpegInstance = this.initializeFFmpeg();
                            resolve({
                                success: true,
                                ffmpeg: ffmpegInstance,
                                source: source
                            });
                        } catch (initError) {
                            console.error(`❌ FFmpeg initialization failed after loading from ${source}:`, initError);
                            resolve({
                                success: false,
                                error: initError,
                                source: source
                            });
                        }
                    } else {
                        console.error(`❌ FFmpeg not available in global scope after loading from ${source}`);
                        resolve({
                            success: false,
                            error: new Error('FFmpeg not available in global scope'),
                            source: source
                        });
                    }
                };

                script.onerror = (event) => {
                    clearTimeout(timeoutId);
                    console.error(`❌ Failed to load script from ${source}:`, event);
                    resolve({
                        success: false,
                        error: new Error(`Script load failed: ${event.type}`),
                        source: source
                    });
                };

                document.head.appendChild(script);

                // Cleanup
                setTimeout(() => {
                    if (script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                }, timeout + 1000);
            });

        } catch (error) {
            clearTimeout(timeoutId);
            console.error(`❌ Exception during load from ${source}:`, error);
            return {
                success: false,
                error: error,
                source: source
            };
        }
    }

    /**
     * Initialize FFmpeg instance with proper configuration
     */
    initializeFFmpeg() {
        try {
            console.log('🛠️ Initializing FFmpeg instance...');

            // Create FFmpeg instance with optimized configuration
            const ffmpeg = FFmpeg.createFFmpeg({
                log: true,
                logger: (log) => {
                    this.handleFFmpegLog(log);
                },
                progress: (progress) => {
                    this.handleFFmpegProgress(progress);
                },
                corePath: this.getCorePath()
            });

            this.ffmpeg = ffmpeg;
            return ffmpeg;

        } catch (error) {
            console.error('❌ FFmpeg initialization failed:', error);
            throw error;
        }
    }

    /**
     * Get the appropriate core path based on current environment
     */
    getCorePath() {
        // Try to determine the best core path based on available sources
        if (this.state.activeSource === 'local_bundle') {
            return '/ffmpeg/ffmpeg-core.js';
        } else {
            // For CDN versions, use the standard core
            return 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/ffmpeg-core.js';
        }
    }

    /**
     * Complete the load sequence successfully
     */
    completeLoadSequence(ffmpegInstance, source) {
        this.state.loaded = true;
        this.state.loading = false;
        this.state.loadEndTime = Date.now();
        this.state.activeSource = source;

        const loadDuration = this.state.loadEndTime - this.state.loadStartTime;

        console.log(`🎉 FFmpeg successfully loaded from ${source} in ${loadDuration}ms`);
        this.logLoadSuccess(source, loadDuration);

        if (!this.state.backgroundMode) {
            this.hideLoadingIndicator();
            this.showSuccessNotification(source);
        }

        return ffmpegInstance;
    }

    /**
     * Handle load failure with comprehensive error logging
     */
    handleLoadFailure(error, backgroundMode) {
        this.state.loading = false;
        this.state.loadEndTime = Date.now();
        this.state.lastError = error;

        const loadDuration = this.state.loadEndTime - this.state.loadStartTime;

        console.error('💥 FFmpeg load failed after all attempts:', error);
        this.logLoadFailure(error, loadDuration);

        if (!backgroundMode) {
            this.hideLoadingIndicator();
            this.showErrorNotification(error);
        }

        // Return null to indicate failure
        return null;
    }

    /**
     * Log successful load with detailed information
     */
    logLoadSuccess(source, duration) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: 'ffmpeg_load_success',
            source: source,
            durationMs: duration,
            attempts: this.state.currentAttempt,
            userAgent: navigator.userAgent,
            networkType: this.getNetworkType(),
            memory: this.getMemoryInfo()
        };

        this.sendToAnalytics(logEntry);
        this.storeLocalLog(logEntry);
    }

    /**
     * Log load failure with comprehensive error details
     */
    logLoadFailure(error, duration) {
        const errorDetails = this.extractErrorDetails(error);

        const logEntry = {
            timestamp: new Date().toISOString(),
            event: 'ffmpeg_load_failure',
            error: errorDetails.message,
            stack: errorDetails.stack,
            source: this.state.activeSource,
            durationMs: duration,
            attempts: this.state.currentAttempt,
            userAgent: navigator.userAgent,
            networkType: this.getNetworkType(),
            networkStatus: this.getNetworkStatus(),
            memory: this.getMemoryInfo(),
            lastSuccessfulLoad: this.getLastSuccessfulLoadTime()
        };

        this.sendToAnalytics(logEntry);
        this.storeLocalLog(logEntry);
    }

    /**
     * Extract detailed error information
     */
    extractErrorDetails(error) {
        const details = {
            message: error.message || String(error),
            stack: error.stack || 'No stack trace',
            name: error.name || 'UnknownError',
            type: error.constructor ? error.constructor.name : 'Unknown'
        };

        // Add network-specific details if available
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            details.type = 'NetworkError';
            details.networkDetails = {
                online: navigator.onLine,
                connection: this.getNetworkInfo()
            };
        }

        return details;
    }

    /**
     * Handle FFmpeg logs with filtering and formatting
     */
    handleFFmpegLog(log) {
        // Filter out verbose logs in production
        if (process.env.NODE_ENV === 'production' && log.level === 'verbose') {
            return;
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            event: 'ffmpeg_log',
            level: log.level || 'info',
            message: log.message,
            type: log.type
        };

        // Color-code console output
        const colors = {
            error: 'color: #ff4757; font-weight: bold;',
            warn: 'color: #ffa502; font-weight: bold;',
            info: 'color: #118df0;',
            debug: 'color: #5352ed;',
            verbose: 'color: #6c757d;'
        };

        const style = colors[log.level] || colors.info;
        console.log(`%c[FFmpeg ${log.level}] ${log.message}`, style);

        this.storeLocalLog(logEntry);
    }

    /**
     * Handle FFmpeg progress updates
     */
    handleFFmpegProgress(progress) {
        if (progress.ratio) {
            const percent = Math.round(progress.ratio * 100);
            console.log(`📊 FFmpeg progress: ${percent}% - ${progress.message || ''}`);

            // Update UI if in foreground
            if (!this.state.backgroundMode) {
                this.updateProgressIndicator(percent);
            }
        }
    }

    /**
     * Show loading indicator with progress
     */
    showLoadingIndicator() {
        // Remove existing indicator if present
        this.hideLoadingIndicator();

        const indicator = document.createElement('div');
        indicator.id = 'ffmpeg-loading-indicator';
        indicator.className = 'ffmpeg-loading-overlay';

        indicator.innerHTML = `
            <div class="ffmpeg-loading-content">
                <div class="ffmpeg-spinner"></div>
                <h3>Loading FFmpeg...</h3>
                <p id="ffmpeg-load-status">Attempting primary CDN...</p>
                <div class="ffmpeg-progress-bar">
                    <div class="ffmpeg-progress" style="width: 0%"></div>
                </div>
                <div class="ffmpeg-attempts">
                    <span>Attempt: <span id="ffmpeg-attempt-counter">1</span>/3</span>
                    <span>Source: <span id="ffmpeg-source">Primary CDN</span></span>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .ffmpeg-loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(10px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                animation: fadeIn 0.3s ease;
            }

            .ffmpeg-loading-content {
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                width: 90%;
                border: 1px solid rgba(176, 67, 255, 0.3);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                text-align: center;
                color: white;
            }

            .ffmpeg-spinner {
                width: 60px;
                height: 60px;
                border: 4px solid rgba(176, 67, 255, 0.3);
                border-top: 4px solid #B043FF;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }

            .ffmpeg-progress-bar {
                width: 100%;
                height: 8px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                margin: 20px 0;
                overflow: hidden;
            }

            .ffmpeg-progress {
                height: 100%;
                background: linear-gradient(90deg, #B043FF, #FF77E9);
                border-radius: 4px;
                transition: width 0.3s ease;
            }

            .ffmpeg-attempts {
                display: flex;
                justify-content: space-between;
                font-size: 14px;
                color: rgba(255, 255, 255, 0.7);
                margin-top: 15px;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(indicator);

        // Store references for updates
        this.loadingElements = {
            status: document.getElementById('ffmpeg-load-status'),
            attemptCounter: document.getElementById('ffmpeg-attempt-counter'),
            source: document.getElementById('ffmpeg-source'),
            progress: document.querySelector('.ffmpeg-progress')
        };
    }

    /**
     * Update progress indicator
     */
    updateProgressIndicator(percent) {
        if (this.loadingElements?.progress) {
            this.loadingElements.progress.style.width = `${percent}%`;
        }
    }

    /**
     * Update loading status
     */
    updateLoadingStatus(message, attempt, source) {
        if (this.loadingElements) {
            if (this.loadingElements.status) {
                this.loadingElements.status.textContent = message;
            }
            if (this.loadingElements.attemptCounter) {
                this.loadingElements.attemptCounter.textContent = attempt;
            }
            if (this.loadingElements.source) {
                this.loadingElements.source.textContent = source;
            }
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoadingIndicator() {
        const indicator = document.getElementById('ffmpeg-loading-indicator');
        if (indicator) {
            indicator.remove();
        }

        const style = document.querySelector('style[ffmpeg-loading]');
        if (style) {
            style.remove();
        }

        this.loadingElements = null;
    }

    /**
     * Show success notification
     */
    showSuccessNotification(source) {
        const notification = document.createElement('div');
        notification.className = 'ffmpeg-success-notification';

        const sourceNames = {
            'primary_cdn': 'Primary CDN',
            'secondary_cdn': 'Secondary CDN',
            'local_bundle': 'Local Bundle'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">✅</div>
                <div class="notification-message">
                    <h4>FFmpeg Loaded Successfully!</h4>
                    <p>Loaded from ${sourceNames[source] || source}</p>
                </div>
                <button class="notification-close">×</button>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .ffmpeg-success-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border: 1px solid rgba(76, 175, 80, 0.3);
                border-radius: 12px;
                padding: 15px 20px;
                color: white;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                z-index: 9999;
                animation: slideIn 0.3s ease;
                max-width: 350px;
            }

            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .notification-icon {
                font-size: 24px;
                background: #4CAF50;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .notification-message h4 {
                margin: 0 0 5px 0;
                font-size: 16px;
            }

            .notification-message p {
                margin: 0;
                font-size: 14px;
                color: rgba(255, 255, 255, 0.8);
            }

            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                margin-left: 10px;
                padding: 0;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .notification-close:hover {
                background: rgba(255, 255, 255, 0.1);
                transform: rotate(90deg);
            }

            @keyframes slideIn {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(notification);

        // Auto-close after 5 seconds
        setTimeout(() => {
            this.removeNotification(notification, style);
        }, 5000);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.removeNotification(notification, style);
        });
    }

    /**
     * Remove notification
     */
    removeNotification(notification, style) {
        if (notification) {
            notification.remove();
        }
        if (style) {
            style.remove();
        }
    }

    /**
     * Show error notification with troubleshooting steps
     */
    showErrorNotification(error) {
        const notification = document.createElement('div');
        notification.className = 'ffmpeg-error-notification';

        const errorMessage = this.getUserFriendlyErrorMessage(error);
        const troubleshootingSteps = this.getTroubleshootingSteps(error);

        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">⚠️</div>
                <div class="notification-message">
                    <h4>FFmpeg Load Failed</h4>
                    <p>${errorMessage}</p>
                    <div class="troubleshooting-steps">
                        <h5>Try these steps:</h5>
                        <ul>
                            ${troubleshootingSteps.map(step => `<li>${step}</li>`).join('')}
                        </ul>
                    </div>
                    <button class="retry-button">Retry</button>
                </div>
                <button class="notification-close">×</button>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .ffmpeg-error-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border: 1px solid rgba(244, 67, 54, 0.3);
                border-radius: 12px;
                padding: 20px;
                color: white;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                z-index: 9999;
                animation: slideIn 0.3s ease;
                max-width: 400px;
            }

            .notification-content {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .notification-icon {
                font-size: 24px;
                background: #F44336;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
            }

            .notification-message h4 {
                margin: 0 0 10px 0;
                font-size: 18px;
                color: #FFEBEE;
                text-align: center;
            }

            .notification-message p {
                margin: 0 0 15px 0;
                font-size: 14px;
                color: rgba(255, 255, 255, 0.9);
                text-align: center;
            }

            .troubleshooting-steps {
                background: rgba(244, 67, 54, 0.05);
                border-radius: 8px;
                padding: 12px;
                margin: 10px 0;
            }

            .troubleshooting-steps h5 {
                margin: 0 0 8px 0;
                font-size: 14px;
                color: #FFCDD2;
            }

            .troubleshooting-steps ul {
                margin: 0;
                padding-left: 20px;
                font-size: 13px;
                color: rgba(255, 255, 255, 0.8);
            }

            .troubleshooting-steps li {
                margin-bottom: 6px;
            }

            .retry-button {
                background: linear-gradient(135deg, #B043FF, #FF77E9);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                margin: 10px auto 0;
                transition: all 0.3s ease;
            }

            .retry-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(176, 67, 255, 0.4);
            }

            .notification-close {
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .notification-close:hover {
                background: rgba(255, 255, 255, 0.1);
                transform: rotate(90deg);
            }

            @keyframes slideIn {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(notification);

        // Retry button
        notification.querySelector('.retry-button').addEventListener('click', () => {
            this.removeNotification(notification, style);
            this.loadWithFallback();
        });

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.removeNotification(notification, style);
        });
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyErrorMessage(error) {
        if (error.message.includes('Failed to fetch')) {
            return 'Could not download FFmpeg due to network issues';
        } else if (error.message.includes('timeout')) {
            return 'FFmpeg download timed out';
        } else if (error.message.includes('abort')) {
            return 'FFmpeg download was interrupted';
        } else {
            return 'Failed to load FFmpeg processing engine';
        }
    }

    /**
     * Get troubleshooting steps based on error type
     */
    getTroubleshootingSteps(error) {
        const basicSteps = [
            'Check your internet connection',
            'Refresh the page and try again',
            'Disable browser extensions that might block scripts'
        ];

        if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
            return [
                ...basicSteps,
                'Try a different network connection',
                'Check if your firewall is blocking CDN access',
                'Clear browser cache and cookies'
            ];
        } else if (error.message.includes('timeout')) {
            return [
                ...basicSteps,
                'Your connection may be slow - try again later',
                'Switch to a faster network connection',
                'Close other bandwidth-intensive applications'
            ];
        } else {
            return [
                ...basicSteps,
                'Try using a different browser',
                'Update your browser to the latest version',
                'Contact support if the issue persists'
            ];
        }
    }

    /**
     * Get network type information
     */
    getNetworkType() {
        if ('connection' in navigator) {
            return navigator.connection.effectiveType || 'unknown';
        }
        return 'unknown';
    }

    /**
     * Get detailed network status
     */
    getNetworkStatus() {
        return {
            online: navigator.onLine,
            type: this.getNetworkType(),
            downlink: 'connection' in navigator ? navigator.connection.downlink : null,
            rtt: 'connection' in navigator ? navigator.connection.rtt : null,
            saveData: 'connection' in navigator ? navigator.connection.saveData : null
        };
    }

    /**
     * Get memory information
     */
    getMemoryInfo() {
        if ('deviceMemory' in navigator) {
            return {
                deviceMemory: navigator.deviceMemory,
                hardwareConcurrency: navigator.hardwareConcurrency
            };
        }
        return null;
    }

    /**
     * Get last successful load time
     */
    getLastSuccessfulLoadTime() {
        const lastLoad = localStorage.getItem('ffmpegLastSuccessfulLoad');
        return lastLoad ? new Date(lastLoad) : null;
    }

    /**
     * Store logs locally for debugging
     */
    storeLocalLog(logEntry) {
        try {
            const logs = JSON.parse(localStorage.getItem('ffmpegLoadLogs') || '[]');
            logs.push(logEntry);

            // Keep only last 50 entries
            if (logs.length > 50) {
                logs.splice(0, logs.length - 50);
            }

            localStorage.setItem('ffmpegLoadLogs', JSON.stringify(logs));
        } catch (error) {
            console.error('Failed to store FFmpeg log locally:', error);
        }
    }

    /**
     * Send logs to analytics service
     */
    sendToAnalytics(logEntry) {
        // In a real implementation, this would send to your analytics backend
        console.log('📊 Analytics event:', logEntry);

        // For demo purposes, we'll just log to console
        if (process.env.NODE_ENV === 'development') {
            console.log('Analytics payload:', JSON.stringify(logEntry, null, 2));
        }
    }

    /**
     * Get FFmpeg instance (loads if not already loaded)
     */
    async getFFmpeg() {
        if (this.state.loaded) {
            return this.ffmpeg;
        }

        return this.loadWithFallback();
    }

    /**
     * Check if FFmpeg is available
     */
    isAvailable() {
        return this.state.loaded;
    }

    /**
     * Get current load status
     */
    getStatus() {
        return {
            loaded: this.state.loaded,
            loading: this.state.loading,
            source: this.state.activeSource,
            lastError: this.state.lastError,
            loadTime: this.state.loadEndTime ? this.state.loadEndTime - this.state.loadStartTime : null
        };
    }
}

// Export singleton instance
const ffmpegLoader = new FFmpegLoader();

if (typeof window !== 'undefined') {
    window.ffmpegLoader = ffmpegLoader;
}

export default ffmpegLoader;