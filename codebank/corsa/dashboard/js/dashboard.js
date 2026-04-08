/**
 * Code-StockMarket Dashboard
 * Full-featured stock market dashboard integrated into code display long-press popup
 * Supports real-time data, CoRsA assets, portfolio management, and codeBank integration
 * Enhanced with sophisticated lazy loading and CoRsA branding
 */

class CodeStockMarketDashboard {
    constructor() {
        this.socket = null;
        this.charts = new Map();
        this.marketData = new Map();
        this.userPortfolio = {
            codes: 0,
            silver: 0,
            gold: 0,
            positions: [],
            totalValue: 0
        };
        this.orders = [];
        this.corsaInstruments = new Map();
        this.realWorldFunds = [];
        this.userRole = 'user'; // user, broker, admin
        this.isAuthenticated = false;
        this.session = null;
        this.loadingOverlay = null;
        this.isInitialized = false;

        this.config = {
            websocketUrl: window.location.origin,
            apiBaseUrl: '/api/stock-market',
            corsaMultiplier: 100, // EGP conversion rate
            maxOrderSize: 1000000,
            circuitBreakerThreshold: 0.1, // 10% price change
            volatilityLimit: 0.05 // 5% max hourly change
        };

        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing Code-StockMarket Dashboard with CoRsA Loading System...');

            // Initialize sophisticated loading overlay
            this.loadingOverlay = new CoRsALoadingOverlay();
            await this.loadingOverlay.show();

            // Start lazy loading initialization
            await this.initializeWithLazyLoading();

        } catch (error) {
            console.error('❌ Failed to initialize dashboard:', error);
            if (this.loadingOverlay) {
                this.loadingOverlay.updateProgress(100, 'Loading Failed');
                setTimeout(() => this.loadingOverlay.hide(), 1000);
            }
            this.showError('Failed to initialize dashboard. Please refresh the page.');
        }
    }

    async initializeWithLazyLoading() {
        try {
            // Add timeout wrapper for each step
            const withTimeout = (promise, timeoutMs, description) => {
                return Promise.race([
                    promise,
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error(`${description} timeout`)), timeoutMs)
                    )
                ]);
            };

            // Step 1: Initialize core authentication and session
            await this.loadingOverlay.updateProgress(10, 'Initializing CoRsA Platform...');
            await withTimeout(this.initAuthentication(), 5000, 'Authentication');

            // Step 2: Load essential market data
            await this.loadingOverlay.updateProgress(25, 'Connecting to Market Data...');
            await withTimeout(this.loadMarketData(), 5000, 'Market Data');

            // Step 3: Load user portfolio and balance
            await this.loadingOverlay.updateProgress(35, 'Loading Portfolio Data...');
            await withTimeout(this.loadUserPortfolio(), 5000, 'Portfolio');

            // Step 4: Sync with codeBank system
            await this.loadingOverlay.updateProgress(45, 'Syncing Balance Information...');
            this.setupEventListeners();

            // Step 5: Load CoRsA instruments
            await this.loadingOverlay.updateProgress(55, 'Loading CoRsA Instruments...');
            await withTimeout(this.loadCorsaInstruments(), 5000, 'CoRsA Instruments');

            // Step 6: Initialize Realistic Charts
            await this.loadingOverlay.updateProgress(65, 'Setting up Realistic Charts...');
            await withTimeout(this.loadRealisticCharts(), 3000, 'Realistic Charts');

            // Step 7: Initialize Trading Console
            await this.loadingOverlay.updateProgress(75, 'Initializing Trading Console...');
            await withTimeout(this.loadConsole(), 3000, 'Trading Console');

            // Step 8: Load additional data
            await this.loadingOverlay.updateProgress(85, 'Loading Real-World Funds...');
            await withTimeout(this.loadRealWorldFunds(), 5000, 'Real-World Funds');

            // Step 9: Initialize real-time systems
            await this.loadingOverlay.updateProgress(95, 'Preparing Trading Interface...');
            this.initWebSocket();
            this.startRealTimeUpdates();

            // Step 10: Finalize initialization
            await this.loadingOverlay.updateProgress(100, 'Finalizing Dashboard...');

            // Mark as initialized
            this.isInitialized = true;

            console.log('✅ Code-StockMarket Dashboard initialized successfully with Enhanced Features');

            // Hide loading overlay after a brief delay
            setTimeout(() => this.loadingOverlay.hide(), 1500);

        } catch (error) {
            console.error('❌ Lazy loading initialization failed:', error);
            this.loadingOverlay.updateProgress(100, 'Loading Failed - Using Demo Mode');
            setTimeout(() => this.loadingOverlay.hide(), 2000);
            
            // Still mark as initialized to prevent hanging
            this.isInitialized = true;
            console.log('🚀 Dashboard initialized in demo mode with enhanced features');
        }
    }

    // Authentication & Authorization
    async initAuthentication() {
        try {
            // Check for existing session
            const sessionData = localStorage.getItem('stockMarketSession');
            if (sessionData) {
                this.session = JSON.parse(sessionData);
                this.userRole = this.session.role || 'user';
                this.isAuthenticated = true;
            }

            // Authenticate with codeBank system
            const userBalance = await this.getUserBalanceFromCodeBank();
            this.userPortfolio.codes = userBalance.codes || 0;
            this.userPortfolio.silver = userBalance.silver || 0;
            this.userPortfolio.gold = userBalance.gold || 0;

            this.updateBalanceDisplay();

            // Check if user has admin/price-setter privileges
            this.checkAdminPrivileges();

        } catch (error) {
            console.error('Authentication error:', error);
        }
    }

    async getUserBalanceFromCodeBank() {
        try {
            console.log('🔍 Fetching user balance from codeBank...');

            // Get balance from codeBank localStorage
            const rewardsData = localStorage.getItem('codebank_rewards');
            console.log('📦 Raw rewards data from localStorage:', rewardsData);

            if (rewardsData) {
                const rewards = JSON.parse(rewardsData);
                console.log('📊 Parsed rewards data:', rewards);

                const balance = {
                    codes: rewards.codes || rewards.points || 1000, // Provide fallback
                    silver: rewards.silverBars || 25, // Provide fallback
                    gold: rewards.goldBars || 10 // Provide fallback
                };

                console.log('✅ User balance retrieved:', balance);
                return balance;
            }

            // No rewards data found, provide reasonable defaults for demo
            const defaultBalance = {
                codes: 1500,
                silver: 30,
                gold: 15
            };

            console.log('📋 Using default balance (no rewards data found):', defaultBalance);
            return defaultBalance;

        } catch (error) {
            console.error('❌ Error fetching user balance:', error);

            // Return fallback values on error
            const fallbackBalance = {
                codes: 1000,
                silver: 20,
                gold: 10
            };

            console.log('🆘 Using fallback balance due to error:', fallbackBalance);
            return fallbackBalance;
        }
    }

    checkAdminPrivileges() {
        // In a real implementation, this would check user permissions
        // For demo purposes, check if user email contains 'admin' or 'broker'
        const userEmail = this.session?.email || '';
        if (userEmail.includes('admin') || userEmail.includes('broker')) {
            this.userRole = userEmail.includes('admin') ? 'admin' : 'broker';
            document.getElementById('admin-btn').style.display = 'block';
        }
    }

    // WebSocket Connection (Mock - no real server needed)
    initWebSocket() {
        try {
            // Simulate WebSocket connection without actual Socket.IO
            console.log('🔌 Simulating market data stream connection');
            
            // Set connected status immediately since we're using mock data
            setTimeout(() => {
                this.updateMarketStatus('Connected (Mock)', 'open');
            }, 1000);
            
            // Note: In production, this would connect to a real Socket.IO server
            console.log('📡 Running in demo mode with mock data (no real WebSocket server)');

        } catch (error) {
            console.error('WebSocket simulation error:', error);
            this.updateMarketStatus('Demo Mode', 'closed');
        }
    }

    // Market Data Management
    async loadMarketData() {
        try {
            // Load mock market data for different asset types
            const marketData = {
                stocks: [
                    { symbol: 'AAPL', name: 'Apple Inc.', price: 175.25, change: 2.15, changePercent: 1.24 },
                    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 138.50, change: -1.25, changePercent: -0.89 },
                    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 365.80, change: 5.20, changePercent: 1.44 },
                    { symbol: 'TSLA', name: 'Tesla Inc.', price: 242.15, change: -8.75, changePercent: -3.49 }
                ],
                crypto: [
                    { symbol: 'BTC', name: 'Bitcoin', price: 43250.75, change: 1250.30, changePercent: 2.98 },
                    { symbol: 'ETH', name: 'Ethereum', price: 2680.45, change: -85.20, changePercent: -3.08 },
                    { symbol: 'ADA', name: 'Cardano', price: 0.485, change: 0.025, changePercent: 5.43 }
                ],
                corsa: [
                    { symbol: 'CORS-A', name: 'CoRsA Premium Asset', price: 125.50, change: 5.25, changePercent: 4.37 },
                    { symbol: 'CORS-B', name: 'CoRsA Standard Asset', price: 89.75, change: -2.15, changePercent: -2.34 },
                    { symbol: 'CORS-G', name: 'CoRsA Gold Linked', price: 156.80, change: 8.90, changePercent: 6.02 }
                ]
            };

            // Update market data
            this.marketData.clear();
            Object.entries(marketData).forEach(([type, instruments]) => {
                this.marketData.set(type, instruments);
            });

            this.updateMarketWatch();
            this.updateMarketSummary();

        } catch (error) {
            console.error('Error loading market data:', error);
        }
    }

    // CoRsA Instruments
    async loadCorsaInstruments() {
        try {
            // Mock CoRsA instruments with EGP pricing
            const corsaInstruments = [
                {
                    id: 'CORS-001',
                    symbol: 'CORS-GOLD',
                    name: 'CoRsA Gold Linked Asset',
                    unit: 'shares',
                    decimals: 4,
                    settlement: 'T+2',
                    currentPrice: 156.80,
                    previousPrice: 147.90,
                    volume: 15420,
                    marketCap: 15680000,
                    priceHistory: this.generatePriceHistory(156.80, 7),
                    volatility: 0.045,
                    circuitBreaker: { upper: 162.69, lower: 133.11 },
                    adminControlled: true,
                    metadata: {
                        description: 'Gold-backed CoRsA asset with real-world gold price correlation',
                        riskLevel: 'Medium',
                        category: 'Commodity-Linked'
                    }
                },
                {
                    id: 'CORS-002',
                    symbol: 'CORS-SILVER',
                    name: 'CoRsA Silver Standard',
                    unit: 'shares',
                    decimals: 4,
                    settlement: 'T+1',
                    currentPrice: 89.75,
                    previousPrice: 91.90,
                    volume: 8750,
                    marketCap: 8975000,
                    priceHistory: this.generatePriceHistory(89.75, 7),
                    volatility: 0.038,
                    circuitBreaker: { upper: 93.24, lower: 76.26 },
                    adminControlled: true,
                    metadata: {
                        description: 'Silver-backed CoRsA asset with industrial demand correlation',
                        riskLevel: 'Medium',
                        category: 'Commodity-Linked'
                    }
                },
                {
                    id: 'CORS-003',
                    symbol: 'CORS-TECH',
                    name: 'CoRsA Technology Index',
                    unit: 'shares',
                    decimals: 4,
                    settlement: 'T+1',
                    currentPrice: 234.50,
                    previousPrice: 228.75,
                    volume: 25680,
                    marketCap: 23450000,
                    priceHistory: this.generatePriceHistory(234.50, 7),
                    volatility: 0.062,
                    circuitBreaker: { upper: 249.17, lower: 204.08 },
                    adminControlled: true,
                    metadata: {
                        description: 'Technology sector index tracking major tech companies',
                        riskLevel: 'High',
                        category: 'Index-Linked'
                    }
                }
            ];

            // Update CoRsA instruments
            this.corsaInstruments.clear();
            corsaInstruments.forEach(instrument => {
                this.corsaInstruments.set(instrument.symbol, instrument);
            });

            this.updateCorsaInstruments();

        } catch (error) {
            console.error('Error loading CoRsA instruments:', error);
        }
    }

    // Portfolio Management
    async loadUserPortfolio() {
        try {
            // Refresh user balance from codeBank before loading portfolio
            const userBalance = await this.getUserBalanceFromCodeBank();
            this.userPortfolio.codes = userBalance.codes || 0;
            this.userPortfolio.silver = userBalance.silver || 0;
            this.userPortfolio.gold = userBalance.gold || 0;

            // Update balance display immediately
            this.updateBalanceDisplay();

            // Mock portfolio data (for demo purposes)
            this.userPortfolio.positions = [
                {
                    instrument: 'CORS-GOLD',
                    symbol: 'CORS-001',
                    quantity: 125.50,
                    avgPrice: 152.30,
                    currentPrice: 156.80,
                    marketValue: 19680.40,
                    unrealizedPnL: 565.25,
                    unrealizedPnLPercent: 2.95,
                    type: 'long',
                    asset: 'codes'
                },
                {
                    instrument: 'AAPL',
                    symbol: 'AAPL',
                    quantity: 10.25,
                    avgPrice: 168.50,
                    currentPrice: 175.25,
                    marketValue: 1796.31,
                    unrealizedPnL: 69.31,
                    unrealizedPnLPercent: 4.01,
                    type: 'long',
                    asset: 'silver'
                },
                {
                    instrument: 'Bitcoin',
                    symbol: 'BTC',
                    quantity: 0.075,
                    avgPrice: 41000,
                    currentPrice: 43250.75,
                    marketValue: 3243.81,
                    unrealizedPnL: 168.81,
                    unrealizedPnLPercent: 5.49,
                    type: 'long',
                    asset: 'gold'
                }
            ];

            this.calculatePortfolioValue();
            this.updatePortfolioDisplay();

            console.log('✅ Portfolio loaded with balances:', this.userPortfolio);

        } catch (error) {
            console.error('Error loading portfolio:', error);
        }
    }

    // Real-world Funds
    async loadRealWorldFunds() {
        try {
            // Mock real-world funds
            this.realWorldFunds = [
                {
                    id: 'FUND-001',
                    name: 'Global Equity Fund',
                    type: 'ETF',
                    symbol: 'GEF',
                    nav: 125.75,
                    change: 2.15,
                    changePercent: 1.74,
                    aum: 2500000000,
                    expenseRatio: 0.12,
                    minInvestment: 100,
                    description: 'Diversified global equity fund tracking major indices'
                },
                {
                    id: 'FUND-002',
                    name: 'Emerging Markets Bond Fund',
                    type: 'Mutual Fund',
                    symbol: 'EMBF',
                    nav: 89.30,
                    change: -0.45,
                    changePercent: -0.50,
                    aum: 1800000000,
                    expenseRatio: 0.85,
                    minInvestment: 500,
                    description: 'Investment grade bonds from emerging market economies'
                },
                {
                    id: 'FUND-003',
                    name: 'Real Estate Investment Trust',
                    type: 'REIT',
                    symbol: 'PREIT',
                    nav: 156.80,
                    change: 1.25,
                    changePercent: 0.80,
                    aum: 3200000000,
                    expenseRatio: 0.95,
                    minInvestment: 1000,
                    description: 'Commercial real estate properties across major cities'
                }
            ];

            this.updateFundsDisplay();

        } catch (error) {
            console.error('Error loading real-world funds:', error);
        }
    }

    // UI Updates
    updateBalanceDisplay() {
        console.log('🔄 Updating balance display:', this.userPortfolio);

        // Update codes balance
        const codesElement = document.getElementById('codes-balance');
        if (codesElement) {
            codesElement.textContent = this.userPortfolio.codes.toLocaleString();
            console.log('✅ Codes balance updated:', this.userPortfolio.codes);
        } else {
            console.warn('⚠️ codes-balance element not found');
        }

        // Update silver balance
        const silverElement = document.getElementById('silver-balance');
        if (silverElement) {
            silverElement.textContent = this.userPortfolio.silver.toLocaleString();
            console.log('✅ Silver balance updated:', this.userPortfolio.silver);
        } else {
            console.warn('⚠️ silver-balance element not found');
        }

        // Update gold balance
        const goldElement = document.getElementById('gold-balance');
        if (goldElement) {
            goldElement.textContent = this.userPortfolio.gold.toLocaleString();
            console.log('✅ Gold balance updated:', this.userPortfolio.gold);
        } else {
            console.warn('⚠️ gold-balance element not found');
        }
    }

    updateMarketWatch() {
        const watchContainer = document.getElementById('market-watch');
        if (!watchContainer) return;

        let html = '';
        this.marketData.forEach((instruments, type) => {
            instruments.forEach(instrument => {
                const changeClass = instrument.change >= 0 ? 'price-positive' : 'price-negative';
                const changeSign = instrument.change >= 0 ? '+' : '';

                html += `
                    <div class="watch-item" onclick="selectInstrument('${instrument.symbol}', '${type}')">
                        <div>
                            <div class="fw-bold">${instrument.symbol}</div>
                            <div class="text-secondary small">${instrument.name}</div>
                        </div>
                        <div class="text-end">
                            <div class="fw-bold">${instrument.price.toFixed(2)}</div>
                            <div class="price-change ${changeClass} small">
                                ${changeSign}${instrument.change.toFixed(2)} (${changeSign}${instrument.changePercent.toFixed(2)}%)
                            </div>
                        </div>
                    </div>
                `;
            });
        });

        watchContainer.innerHTML = html;
    }

    updateMarketSummary() {
        const summaryContainer = document.getElementById('market-summary');
        if (!summaryContainer) return;

        const totalInstruments = Array.from(this.marketData.values()).reduce((sum, instruments) => sum + instruments.length, 0);
        const positiveChanges = Array.from(this.marketData.values()).flat().filter(inst => inst.change > 0).length;
        const negativeChanges = Array.from(this.marketData.values()).flat().filter(inst => inst.change < 0).length;

        const html = `
            <div class="row text-center">
                <div class="col-4">
                    <div class="h4 text-primary">${totalInstruments}</div>
                    <div class="small text-secondary">Total Instruments</div>
                </div>
                <div class="col-4">
                    <div class="h4 text-success">${positiveChanges}</div>
                    <div class="small text-secondary">Gainers</div>
                </div>
                <div class="col-4">
                    <div class="h4 text-danger">${negativeChanges}</div>
                    <div class="small text-secondary">Decliners</div>
                </div>
            </div>
        `;

        summaryContainer.innerHTML = html;
    }

    updateCorsaInstruments() {
        const container = document.getElementById('corsa-instruments');
        if (!container) return;

        let html = '<div class="row">';

        this.corsaInstruments.forEach((instrument, symbol) => {
            const changeClass = instrument.currentPrice >= instrument.previousPrice ? 'price-positive' : 'price-negative';
            const changePercent = ((instrument.currentPrice - instrument.previousPrice) / instrument.previousPrice * 100).toFixed(2);
            const changeSign = changePercent >= 0 ? '+' : '';

            html += `
                <div class="col-12 col-md-6 col-lg-4 mb-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <h6 class="card-title mb-1">${instrument.symbol}</h6>
                                    <small class="text-secondary">${instrument.name}</small>
                                </div>
                                <span class="badge badge-corsa">CoRsA</span>
                            </div>
                            <div class="row text-center">
                                <div class="col-6">
                                    <div class="h5 mb-0">${instrument.currentPrice.toFixed(2)} EGP</div>
                                    <div class="price-change ${changeClass} small">
                                        ${changeSign}${changePercent}%
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="small text-secondary">Volume</div>
                                    <div class="fw-bold">${instrument.volume.toLocaleString()}</div>
                                </div>
                            </div>
                            <div class="mt-3">
                                <button class="btn btn-primary btn-sm w-100" onclick="selectInstrument('${symbol}', 'corsa')">
                                    Trade Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    updatePortfolioDisplay() {
        const container = document.getElementById('portfolio-positions');
        if (!container) return;

        if (this.userPortfolio.positions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-briefcase fa-3x text-secondary mb-3"></i>
                    <h5>No Positions Yet</h5>
                    <p class="text-secondary">Start trading to build your portfolio</p>
                </div>
            `;
            return;
        }

        let html = '<div class="portfolio-grid">';

        this.userPortfolio.positions.forEach(position => {
            const pnlClass = position.unrealizedPnL >= 0 ? 'text-success' : 'text-danger';
            const pnlSign = position.unrealizedPnL >= 0 ? '+' : '';

            html += `
                <div class="position-card">
                    <div class="position-header">
                        <div>
                            <h6 class="mb-0">${position.instrument}</h6>
                            <small class="text-secondary">${position.quantity} shares</small>
                        </div>
                        <span class="badge bg-primary">${position.asset}</span>
                    </div>
                    <div class="position-details">
                        <div class="position-metric">
                            <span class="text-secondary">Market Value</span>
                            <span class="fw-bold">${position.marketValue.toFixed(2)}</span>
                        </div>
                        <div class="position-metric">
                            <span class="text-secondary">Avg Price</span>
                            <span>${position.avgPrice.toFixed(2)}</span>
                        </div>
                        <div class="position-metric">
                            <span class="text-secondary">Current Price</span>
                            <span>${position.currentPrice.toFixed(2)}</span>
                        </div>
                        <div class="position-metric">
                            <span class="text-secondary">P&L</span>
                            <span class="${pnlClass} fw-bold">
                                ${pnlSign}${position.unrealizedPnL.toFixed(2)} (${pnlSign}${position.unrealizedPnLPercent.toFixed(2)}%)
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Update total portfolio value
        const portfolioValueElement = document.getElementById('total-portfolio-value');
        if (portfolioValueElement) {
            portfolioValueElement.textContent = `$${this.userPortfolio.totalValue.toFixed(2)}`;
        } else {
            console.warn('⚠️ total-portfolio-value element not found');
        }
    }

    updateFundsDisplay() {
        const container = document.getElementById('funds-list');
        if (!container) return;

        let html = '<div class="row">';

        this.realWorldFunds.forEach(fund => {
            const changeClass = fund.change >= 0 ? 'text-success' : 'text-danger';
            const changeSign = fund.change >= 0 ? '+' : '';

            html += `
                <div class="col-12 col-md-6 col-lg-4 mb-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <h6 class="card-title mb-1">${fund.symbol}</h6>
                                    <small class="text-secondary">${fund.name}</small>
                                </div>
                                <span class="badge badge-fund">${fund.type}</span>
                            </div>
                            <div class="row text-center">
                                <div class="col-6">
                                    <div class="h5 mb-0">${fund.nav.toFixed(2)}</div>
                                    <div class="${changeClass} small">
                                        ${changeSign}${fund.change.toFixed(2)} (${changeSign}${fund.changePercent.toFixed(2)}%)
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="small text-secondary">AUM</div>
                                    <div class="fw-bold">$${(fund.aum / 1000000).toFixed(0)}M</div>
                                </div>
                            </div>
                            <div class="mt-3">
                                <button class="btn btn-success btn-sm w-100" onclick="investInFund('${fund.id}')">
                                    Invest Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    updateMarketStatus(status, statusClass) {
        const statusElement = document.getElementById('market-status');
        if (statusElement) {
            statusElement.innerHTML = `
                <div class="market-status">
                    <div class="status-indicator status-${statusClass}"></div>
                    <span>${status}</span>
                </div>
            `;
        }
    }

    // Realistic Charts Section
    async loadRealisticCharts() {
        try {
            console.log('📈 Initializing realistic stock market charts...');
            this.initializeRealisticChart();
            this.updateTechnicalIndicators();
            
        } catch (error) {
            console.error('Error loading realistic charts:', error);
        }
    }

    initializeRealisticChart() {
        const chartContainer = document.getElementById('realistic-chart');
        if (!chartContainer) return;

        // Clear existing chart
        chartContainer.innerHTML = '<canvas id="main-realistic-chart"></canvas>';
        const ctx = document.getElementById('main-realistic-chart').getContext('2d');

        // Generate realistic market data
        const marketData = this.generateRealisticMarketData();
        
        // Create the chart
        this.realisticChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: marketData.labels,
                datasets: [{
                    label: 'Price',
                    data: marketData.prices,
                    borderColor: '#ffd700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffd700',
                        bodyColor: '#fff',
                        borderColor: '#ffd700',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    },
                    y: {
                        display: true,
                        position: 'right',
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8',
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });

        console.log('✅ Realistic chart initialized');
    }

    generateRealisticMarketData() {
        const labels = [];
        const prices = [];
        let currentPrice = 100 + Math.random() * 50;
        
        for (let i = 0; i < 30; i++) {
            const time = new Date();
            time.setHours(time.getHours() - (29 - i));
            labels.push(time.toLocaleTimeString());
            
            // Add realistic price movement with some volatility
            const change = (Math.random() - 0.5) * currentPrice * 0.02;
            currentPrice += change;
            prices.push(currentPrice.toFixed(2));
        }
        
        return { labels, prices };
    }

    updateTechnicalIndicators() {
        const container = document.getElementById('technical-indicators');
        if (!container) return;

        const indicators = [
            { name: 'RSI (14)', value: (30 + Math.random() * 40).toFixed(1), status: 'neutral' },
            { name: 'MACD', value: (Math.random() * 2 - 1).toFixed(3), status: 'bullish' },
            { name: 'SMA (20)', value: (95 + Math.random() * 10).toFixed(2), status: 'neutral' },
            { name: 'EMA (12)', value: (98 + Math.random() * 8).toFixed(2), status: 'bullish' },
            { name: 'Bollinger Bands', value: 'Upper: 108.5', status: 'neutral' },
            { name: 'Volume', value: '1.2M', status: 'neutral' }
        ];

        let html = '<div class="row">';
        indicators.forEach(indicator => {
            const statusClass = indicator.status === 'bullish' ? 'text-success' :
                              indicator.status === 'bearish' ? 'text-danger' : 'text-warning';
            
            html += `
                <div class="col-md-4 mb-3">
                    <div class="d-flex justify-content-between">
                        <span>${indicator.name}:</span>
                        <span class="${statusClass}">${indicator.value}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // Console Section
    async loadConsole() {
        try {
            console.log('🖥️ Initializing trading console...');
            this.initializeConsole();
            this.updateConsoleState();
            this.startConsoleUpdates();
            
        } catch (error) {
            console.error('Error loading console:', error);
        }
    }

    initializeConsole() {
        this.consoleLogs = [];
        this.logToConsole('🚀 CoRsA Trading Console Initialized');
        this.logToConsole('📊 Connected to market data feed');
        this.logToConsole('💰 User balance loaded successfully');
        this.logToConsole('✅ All systems operational');
    }

    updateConsoleState() {
        // Update current state displays
        const codesElement = document.getElementById('current-codes');
        const silverElement = document.getElementById('current-silver');
        const goldElement = document.getElementById('current-gold');
        const portfolioElement = document.getElementById('current-portfolio-value');
        const priceElement = document.getElementById('quick-trade-price');

        if (codesElement) codesElement.value = this.userPortfolio.codes;
        if (silverElement) silverElement.value = this.userPortfolio.silver;
        if (goldElement) goldElement.value = this.userPortfolio.gold;
        if (portfolioElement) portfolioElement.value = `$${this.userPortfolio.totalValue.toFixed(2)}`;
        
        // Update current price for selected asset
        const selectedAsset = document.getElementById('quick-trade-asset')?.value || 'AAPL';
        const currentPrice = this.getCurrentPrice(selectedAsset);
        if (priceElement) priceElement.value = currentPrice ? currentPrice.toFixed(2) : '0.00';

        // Update last update time
        const lastUpdateElement = document.getElementById('last-update-time');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = new Date().toLocaleTimeString();
        }
    }

    logToConsole(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            message,
            type,
            id: Date.now()
        };

        this.consoleLogs.push(logEntry);
        
        // Keep only last 100 logs
        if (this.consoleLogs.length > 100) {
            this.consoleLogs.shift();
        }

        this.updateConsoleDisplay();
    }

    updateConsoleDisplay() {
        const container = document.getElementById('console-output');
        if (!container) return;

        let html = '';
        this.consoleLogs.slice(-50).forEach(log => { // Show last 50 logs
            const colorClass = log.type === 'error' ? '#ff4444' :
                              log.type === 'success' ? '#44ff44' :
                              log.type === 'warning' ? '#ffaa44' : '#00ff00';
            
            html += `<div style="color: ${colorClass};">[${log.timestamp}] ${log.message}</div>`;
        });

        container.innerHTML = html;
        container.scrollTop = container.scrollHeight; // Auto-scroll to bottom
    }

    startConsoleUpdates() {
        // Update console every 5 seconds
        setInterval(() => {
            this.updateConsoleState();
            this.logToConsole('📈 Market data updated', 'info');
        }, 5000);
    }

    // Event Handlers
    setupEventListeners() {
        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('show');
            });
        }

        // Market selector
        const marketSelector = document.getElementById('market-selector');
        if (marketSelector) {
            marketSelector.addEventListener('change', (e) => {
                this.updateMainChart(e.target.value);
            });
        }

        // Order form
        const orderForm = document.getElementById('orderForm');
        if (orderForm) {
            orderForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.placeOrder();
            });
        }

        // Transfer form
        const transferForm = document.getElementById('transferForm');
        if (transferForm) {
            transferForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.transferAssets();
            });
        }

        // Price form (admin)
        const priceForm = document.getElementById('priceForm');
        if (priceForm) {
            priceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updatePrice();
            });
        }

        // Order type change
        const orderType = document.getElementById('order-type');
        if (orderType) {
            orderType.addEventListener('change', (e) => {
                const priceField = document.getElementById('price-field');
                if (priceField) {
                    priceField.style.display = e.target.value === 'limit' ? 'block' : 'none';
                }
            });
        }
    }

    // Trading Functions
    placeOrder() {
        const formData = {
            assetType: document.getElementById('order-asset-type').value,
            instrument: document.getElementById('order-instrument').value,
            type: document.getElementById('order-type').value,
            side: document.getElementById('order-side').value,
            quantity: parseFloat(document.getElementById('order-quantity').value),
            price: document.getElementById('order-price').value ? parseFloat(document.getElementById('order-price').value) : null,
            asset: document.getElementById('order-asset').value
        };

        // Validate order
        if (!this.validateOrder(formData)) {
            return;
        }

        // Submit order
        this.submitOrder(formData);

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('orderModal'));
        modal.hide();
    }

    validateOrder(order) {
        // Check balance
        const requiredAmount = order.quantity * (order.price || this.getCurrentPrice(order.instrument));
        const availableBalance = this.userPortfolio[order.asset];

        if (requiredAmount > availableBalance) {
            this.showError(`Insufficient ${order.asset} balance. Required: ${requiredAmount}, Available: ${availableBalance}`);
            return false;
        }

        // Check order size limits
        if (requiredAmount > this.config.maxOrderSize) {
            this.showError(`Order size exceeds maximum limit of ${this.config.maxOrderSize}`);
            return false;
        }

        return true;
    }

    submitOrder(order) {
        // Mock order submission
        const newOrder = {
            id: Date.now().toString(),
            ...order,
            status: 'pending',
            timestamp: new Date().toISOString(),
            filledQuantity: 0,
            remainingQuantity: order.quantity
        };

        this.orders.push(newOrder);
        this.updateOrdersDisplay();

        // Simulate order execution
        setTimeout(() => {
            this.executeOrder(newOrder.id);
        }, Math.random() * 5000 + 1000);

        this.showSuccess('Order submitted successfully');
    }

    executeOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        // Simulate partial or full fill
        const fillQuantity = Math.random() > 0.3 ? order.remainingQuantity : Math.floor(order.remainingQuantity * Math.random());
        order.filledQuantity += fillQuantity;
        order.remainingQuantity -= fillQuantity;

        if (order.remainingQuantity === 0) {
            order.status = 'filled';
        } else {
            order.status = 'partially-filled';
        }

        this.updateOrdersDisplay();
        this.updatePortfolio();
    }

    transferAssets() {
        const formData = {
            to: document.getElementById('transfer-to').value,
            asset: document.getElementById('transfer-asset').value,
            amount: parseFloat(document.getElementById('transfer-amount').value)
        };

        // Validate transfer
        if (formData.amount > this.userPortfolio[formData.asset]) {
            this.showError(`Insufficient ${formData.asset} balance`);
            return;
        }

        // Mock transfer
        this.userPortfolio[formData.asset] -= formData.amount;
        this.updateBalanceDisplay();

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('transferModal'));
        modal.hide();

        this.showSuccess('Transfer completed successfully');
    }

    updatePrice() {
        const instrument = document.getElementById('admin-instrument').value;
        const newPrice = parseFloat(document.getElementById('admin-new-price').value);
        const reason = document.getElementById('admin-reason').value;

        // Update instrument price
        if (this.corsaInstruments.has(instrument)) {
            const corsaInstrument = this.corsaInstruments.get(instrument);
            corsaInstrument.previousPrice = corsaInstrument.currentPrice;
            corsaInstrument.currentPrice = newPrice;
            corsaInstrument.priceHistory.push({
                timestamp: new Date().toISOString(),
                price: newPrice
            });

            this.updateCorsaInstruments();
            this.updateAuditTrail(instrument, newPrice, reason);
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
        modal.hide();

        this.showSuccess('Price updated successfully');
    }

    // Utility Functions
    calculatePortfolioValue() {
        this.userPortfolio.totalValue = this.userPortfolio.positions.reduce((total, position) => {
            return total + position.marketValue;
        }, 0);
    }

    updatePortfolio() {
        // Update position values based on current prices
        this.userPortfolio.positions.forEach(position => {
            const currentPrice = this.getCurrentPrice(position.symbol);
            if (currentPrice) {
                position.currentPrice = currentPrice;
                position.marketValue = position.quantity * currentPrice;
                position.unrealizedPnL = position.marketValue - (position.quantity * position.avgPrice);
                position.unrealizedPnLPercent = (position.unrealizedPnL / (position.quantity * position.avgPrice)) * 100;
            }
        });

        this.calculatePortfolioValue();
        this.updatePortfolioDisplay();
    }

    getCurrentPrice(symbol) {
        // Check CoRsA instruments
        if (this.corsaInstruments.has(symbol)) {
            return this.corsaInstruments.get(symbol).currentPrice;
        }

        // Check market data
        for (const [type, instruments] of this.marketData) {
            const instrument = instruments.find(inst => inst.symbol === symbol);
            if (instrument) return instrument.price;
        }

        return null;
    }

    generatePriceHistory(currentPrice, days) {
        const history = [];
        let price = currentPrice;

        for (let i = days; i >= 0; i--) {
            history.push({
                timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
                price: price
            });
            price += (Math.random() - 0.5) * price * 0.02; // 2% daily volatility
        }

        return history;
    }

    selectInstrument(symbol, marketType) {
        // Populate order form with selected instrument
        document.getElementById('order-asset-type').value = marketType;
        document.getElementById('order-instrument').value = symbol;

        // Update instrument options
        this.updateInstrumentOptions(marketType);

        // Show order modal
        const modal = new bootstrap.Modal(document.getElementById('orderModal'));
        modal.show();
    }

    updateInstrumentOptions(marketType) {
        const select = document.getElementById('order-instrument');
        const instruments = this.marketData.get(marketType) || [];

        select.innerHTML = '<option value="">Select instrument...</option>';
        instruments.forEach(instrument => {
            select.innerHTML += `<option value="${instrument.symbol}">${instrument.symbol} - ${instrument.name}</option>`;
        });

        // Add CoRsA instruments if selected
        if (marketType === 'corsa') {
            this.corsaInstruments.forEach((instrument, symbol) => {
                select.innerHTML += `<option value="${symbol}">${symbol} - ${instrument.name}</option>`;
            });
        }
    }

    updateOrdersDisplay() {
        const container = document.getElementById('orders-table');
        if (!container) return;

        if (this.orders.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-list fa-3x text-secondary mb-3"></i>
                    <h5>No Orders Yet</h5>
                    <p class="text-secondary">Your order history will appear here</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-dark">
                    <thead>
                        <tr>
                            <th>Instrument</th>
                            <th>Type</th>
                            <th>Side</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.orders.forEach(order => {
            const statusClass = order.status === 'filled' ? 'text-success' :
                              order.status === 'partially-filled' ? 'text-warning' : 'text-secondary';

            html += `
                <tr>
                    <td>${order.instrument}</td>
                    <td>${order.type}</td>
                    <td>${order.side}</td>
                    <td>${order.filledQuantity}/${order.quantity}</td>
                    <td>${order.price || 'Market'}</td>
                    <td class="${statusClass}">${order.status}</td>
                    <td>${new Date(order.timestamp).toLocaleString()}</td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    updateAuditTrail(instrument, price, reason) {
        const container = document.getElementById('audit-trail');
        if (!container) return;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date().toLocaleString()}</td>
            <td>${instrument}</td>
            <td>Price Update</td>
            <td>${price.toFixed(2)} EGP</td>
        `;

        // Insert at top
        if (container.firstChild) {
            container.insertBefore(row, container.firstChild);
        } else {
            container.appendChild(row);
        }

        // Keep only last 10 entries
        while (container.children.length > 10) {
            container.removeChild(container.lastChild);
        }
    }

    // Real-time Updates
    startRealTimeUpdates() {
        // Update market data every 5 seconds
        setInterval(() => {
            this.updateMarketPrices();
        }, 5000);

        // Update portfolio every 10 seconds
        setInterval(() => {
            this.updatePortfolio();
        }, 10000);
    }

    updateMarketPrices() {
        // Simulate price updates
        this.marketData.forEach((instruments, type) => {
            instruments.forEach(instrument => {
                const change = (Math.random() - 0.5) * instrument.price * 0.01; // 1% max change
                instrument.price += change;
                instrument.change += change;
                instrument.changePercent = (instrument.change / (instrument.price - instrument.change)) * 100;
            });
        });

        this.updateMarketWatch();
        this.updateMarketSummary();
    }

    // WebSocket Event Handlers
    handleMarketDataUpdate(data) {
        // Update market data from WebSocket
        if (data.type && data.instruments) {
            this.marketData.set(data.type, data.instruments);
            this.updateMarketWatch();
        }
    }

    handleOrderUpdate(data) {
        // Update order status from WebSocket
        const order = this.orders.find(o => o.id === data.orderId);
        if (order) {
            Object.assign(order, data);
            this.updateOrdersDisplay();
        }
    }

    handlePriceUpdate(data) {
        // Update instrument price from WebSocket
        if (this.corsaInstruments.has(data.symbol)) {
            const instrument = this.corsaInstruments.get(data.symbol);
            instrument.previousPrice = instrument.currentPrice;
            instrument.currentPrice = data.price;
            this.updateCorsaInstruments();
        }
    }

    handlePortfolioUpdate(data) {
        // Update portfolio from WebSocket
        Object.assign(this.userPortfolio, data);
        this.updateBalanceDisplay();
        this.updatePortfolioDisplay();
    }

    handleCorsaUpdate(data) {
        // Update CoRsA instrument from WebSocket
        if (this.corsaInstruments.has(data.symbol)) {
            Object.assign(this.corsaInstruments.get(data.symbol), data);
            this.updateCorsaInstruments();
        }
    }

    // UI Helpers
    showError(message) {
        // Create alert
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alert);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    showSuccess(message) {
        // Create alert
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alert);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    // Chart Integration
    updateMainChart(marketType) {
        const chartContainer = document.getElementById('main-chart');
        if (!chartContainer) return;

        // Clear loading
        chartContainer.innerHTML = '<canvas id="priceChart"></canvas>';

        const instruments = this.marketData.get(marketType) || [];
        if (instruments.length === 0) return;

        const ctx = document.getElementById('priceChart').getContext('2d');

        const labels = instruments.map(inst => inst.symbol);
        const prices = instruments.map(inst => inst.price);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Price',
                    data: prices,
                    borderColor: 'rgb(30, 64, 175)',
                    backgroundColor: 'rgba(30, 64, 175, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }
}

// CoRsA Loading Overlay Class
class CoRsALoadingOverlay {
    constructor() {
        this.overlay = null;
        this.progressBar = null;
        this.statusText = null;
        this.isVisible = false;
    }

    async show() {
        if (this.isVisible) return;

        this.createOverlay();
        this.isVisible = true;

        // Animate in
        this.overlay.style.opacity = '0';
        this.overlay.style.display = 'flex';

        // Fade in animation
        setTimeout(() => {
            this.overlay.style.opacity = '1';
        }, 10);

        console.log('🚀 CoRsA Loading Overlay displayed');
    }

    async hide() {
        if (!this.isVisible) return;

        // Fade out animation
        this.overlay.style.opacity = '0';

        setTimeout(() => {
            if (this.overlay) {
                this.overlay.style.display = 'none';
            }
            this.isVisible = false;
        }, 300);

        console.log('✅ CoRsA Loading Overlay hidden');
    }

    createOverlay() {
        // Create overlay container
        this.overlay = document.createElement('div');
        this.overlay.id = 'corsa-loading-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            transition: opacity 0.3s ease;
            font-family: 'Inter', sans-serif;
        `;

        // Create logo/branding
        const logoContainer = document.createElement('div');
        logoContainer.style.cssText = `
            text-align: center;
            margin-bottom: 2rem;
        `;

        logoContainer.innerHTML = `
            <div style="font-size: 3rem; font-weight: 700; color: #ffd700; margin-bottom: 0.5rem; text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);">
                CoRsA
            </div>
            <div style="font-size: 1.2rem; color: #94a3b8; font-weight: 500;">
                Code-StockMarket Dashboard
            </div>
        `;

        // Create progress container
        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
            width: 300px;
            text-align: center;
        `;

        // Create progress bar
        this.progressBar = document.createElement('div');
        this.progressBar.style.cssText = `
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 1rem;
        `;

        // Create progress fill
        const progressFill = document.createElement('div');
        progressFill.style.cssText = `
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #ffd700, #ffed4e);
            border-radius: 4px;
            transition: width 0.3s ease;
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        `;
        this.progressBar.appendChild(progressFill);

        // Create status text
        this.statusText = document.createElement('div');
        this.statusText.style.cssText = `
            color: #94a3b8;
            font-size: 0.9rem;
            font-weight: 500;
            text-align: center;
        `;
        this.statusText.textContent = 'Initializing CoRsA Platform...';

        // Assemble progress container
        progressContainer.appendChild(this.progressBar);
        progressContainer.appendChild(this.statusText);

        // Assemble overlay
        this.overlay.appendChild(logoContainer);
        this.overlay.appendChild(progressContainer);

        // Add to document
        document.body.appendChild(this.overlay);

        console.log('🎨 CoRsA Loading Overlay created');
    }

    async updateProgress(percentage, status) {
        if (!this.progressBar || !this.statusText) return;

        const progressFill = this.progressBar.firstElementChild;
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }

        this.statusText.textContent = status;
        console.log(`📊 Progress: ${percentage}% - ${status}`);
    }
}

// Global functions for HTML onclick handlers
function selectInstrument(symbol, marketType) {
    if (window.dashboard) {
        window.dashboard.selectInstrument(symbol, marketType);
    }
}

function refreshData() {
    if (window.dashboard) {
        window.dashboard.loadMarketData();
        window.dashboard.loadUserPortfolio();
    }
}

function placeOrder() {
    if (window.dashboard) {
        window.dashboard.placeOrder();
    }
}

function transferAssets() {
    if (window.dashboard) {
        window.dashboard.transferAssets();
    }
}

function investInFund(fundId) {
    if (window.dashboard) {
        // Implement fund investment logic
        console.log('Investing in fund:', fundId);
    }
}

function refreshCorsaData() {
    if (window.dashboard) {
        window.dashboard.loadCorsaInstruments();
    }
}

function refreshPortfolio() {
    if (window.dashboard) {
        window.dashboard.loadUserPortfolio();
    }
}

function refreshOrders() {
    if (window.dashboard) {
        window.dashboard.updateOrdersDisplay();
    }
}

function updateRealisticChart() {
    if (window.dashboard) {
        window.dashboard.logToConsole('📈 Updating realistic chart...', 'info');
        window.dashboard.initializeRealisticChart();
        window.dashboard.updateTechnicalIndicators();
    }
}

function executeQuickTrade(action) {
    if (window.dashboard) {
        const asset = document.getElementById('quick-trade-asset').value;
        const amount = parseFloat(document.getElementById('quick-trade-amount').value);
        const price = window.dashboard.getCurrentPrice(asset);
        
        if (!amount || amount <= 0) {
            window.dashboard.showError('Please enter a valid amount');
            return;
        }
        
        if (!price) {
            window.dashboard.showError('Invalid asset selected');
            return;
        }
        
        const totalCost = amount * price;
        const userBalance = asset.includes('CORS') ? window.dashboard.userPortfolio.codes :
                           asset === 'AAPL' || asset === 'GOOGL' ? window.dashboard.userPortfolio.silver :
                           window.dashboard.userPortfolio.gold;
        
        if (action === 'buy' && totalCost > userBalance) {
            window.dashboard.showError('Insufficient balance');
            return;
        }
        
        // Execute the trade
        window.dashboard.logToConsole(`💰 ${action.toUpperCase()} ${amount} ${asset} at $${price.toFixed(2)}`, 'success');
        window.dashboard.logToConsole(`💳 Total cost: $${totalCost.toFixed(2)}`, 'info');
        
        // Update user balance (mock)
        if (action === 'buy') {
            window.dashboard.logToConsole('✅ Trade executed successfully', 'success');
        } else {
            window.dashboard.logToConsole('✅ Sell order placed', 'success');
        }
        
        window.dashboard.updateConsoleState();
    }
}

function refreshConsoleData() {
    if (window.dashboard) {
        window.dashboard.logToConsole('🔄 Refreshing console data...', 'info');
        window.dashboard.updateConsoleState();
    }
}

function clearConsole() {
    if (window.dashboard) {
        window.dashboard.consoleLogs = [];
        window.dashboard.logToConsole('🧹 Console cleared', 'warning');
    }
}

function exportLogs() {
    if (window.dashboard) {
        const logsText = window.dashboard.consoleLogs.map(log =>
            `[${log.timestamp}] ${log.message}`
        ).join('\n');
        
        const blob = new Blob([logsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `corsa-console-logs-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        window.dashboard.logToConsole('📁 Console logs exported', 'info');
    }
}

// Chart event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Chart timeframe change
    const timeframeSelect = document.getElementById('chart-timeframe');
    if (timeframeSelect) {
        timeframeSelect.addEventListener('change', () => {
            if (window.dashboard) {
                window.dashboard.logToConsole(`📊 Chart timeframe changed to ${timeframeSelect.value}`, 'info');
                updateRealisticChart();
            }
        });
    }
    
    // Chart symbol change
    const symbolSelect = document.getElementById('chart-symbol');
    if (symbolSelect) {
        symbolSelect.addEventListener('change', () => {
            if (window.dashboard) {
                window.dashboard.logToConsole(`📈 Chart symbol changed to ${symbolSelect.value}`, 'info');
                updateRealisticChart();
            }
        });
    }
    
    // Quick trade asset change
    const assetSelect = document.getElementById('quick-trade-asset');
    if (assetSelect) {
        assetSelect.addEventListener('change', () => {
            if (window.dashboard) {
                const price = window.dashboard.getCurrentPrice(assetSelect.value);
                const priceElement = document.getElementById('quick-trade-price');
                if (priceElement) {
                    priceElement.value = price ? price.toFixed(2) : '0.00';
                }
                window.dashboard.logToConsole(`💹 Asset selected: ${assetSelect.value} @ $${(price || 0).toFixed(2)}`, 'info');
            }
        });
    }
});

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Code-StockMarket Dashboard...');

    // Create global dashboard instance
    window.dashboard = new CodeStockMarketDashboard();

    // Make functions globally available
    window.selectInstrument = selectInstrument;
    window.refreshData = refreshData;
    window.placeOrder = placeOrder;
    window.transferAssets = transferAssets;
    window.investInFund = investInFund;
    window.refreshCorsaData = refreshCorsaData;
    window.refreshPortfolio = refreshPortfolio;
    window.refreshOrders = refreshOrders;
});