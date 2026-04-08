/**
 * CodeBank Exchange Application
 * Main application logic and state management
 */

class CodeBankApp {
    constructor() {
        this.state = {
            user: null,
            assets: { codes: 0, silverBars: 0, goldBars: 0, savedCodes: [] },
            status: { subscribers: 0, isMonetized: false, progressPercentage: 0, remainingSubscribers: 1000 },
            currencyRates: { USD: '0.032', EUR: '0.030', GBP: '0.025', SAR: '0.121', AED: '0.118' },
            transactions: [],
            gameStats: { totalGames: 0, totalWon: 0, winRate: '0%', biggestWin: 0 },
            isLoading: false
        };
        
        this.longPressTimeout = null;
        this.refreshIntervals = [];
        
        this.init();
    }

    async init() {
        // Check authentication
        if (!this.checkAuth()) {
            return;
        }

        // Initialize DOM elements
        this.initDOM();
        
        // Load initial data
        await this.loadInitialData();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start periodic data refresh
        this.startPeriodicRefresh();
        
        // Update UI
        this.updateUI();
    }

    checkAuth() {
        // Temporarily disabled authentication check
        this.state.user = {
            uid: 'temp-user',
            email: 'temp@example.com',
            displayName: 'Temporary User'
        };
        return true;
    }

    initDOM() {
        // Get all DOM elements
        this.elements = {
            // Header elements
            subscriberCount: document.getElementById('subscriber-count'),
            monetizationStatus: document.getElementById('monetization-status'),
            codesCount: document.getElementById('codes-count'),
            totalEgpValue: document.getElementById('total-egp-value'),
            progressBar: document.getElementById('progress-bar'),
            progressPercentage: document.getElementById('progress-percentage'),
            progressFill: document.getElementById('progress-fill'),
            remainingSubscribers: document.getElementById('remaining-subscribers'),
            
            // Banner elements
            monetizationBanner: document.getElementById('monetization-banner'),
            subscribeBtn: document.getElementById('subscribe-btn'),
            currencyTicker: document.getElementById('currency-ticker'),
            
            // Asset elements
            assetCodes: document.getElementById('asset-codes'),
            assetSilver: document.getElementById('asset-silver'),
            assetGold: document.getElementById('asset-gold'),
            
            // Game stats elements
            totalGames: document.getElementById('total-games'),
            gamesWon: document.getElementById('games-won'),
            winRate: document.getElementById('win-rate'),
            biggestWin: document.getElementById('biggest-win'),
            
            // Form elements
            buyForm: document.getElementById('buy-form'),
            sellForm: document.getElementById('sell-form'),
            gameForm: document.getElementById('game-form'),
            
            // Transaction list
            transactionsList: document.getElementById('transactions-list'),
            
            // Dialogs
            gameDialog: document.getElementById('game-dialog'),
            closeGameDialog: document.getElementById('close-game-dialog'),
            
            // Quick action buttons
            quickGrind: document.getElementById('quick-grind'),
            quickCompress: document.getElementById('quick-compress'),
            quickPlay: document.getElementById('quick-play'),
            compressSilver: document.getElementById('compress-silver'),
            compressGold: document.getElementById('compress-gold'),
            
            // Balance element for long press
            userBalance: document.getElementById('user-balance')
        };
    }

    async loadInitialData() {
        this.state.isLoading = true;
        
        try {   
            // Load all data in parallel
            const [status, assets, currencyRates, transactions, gameStats] = await Promise.all([
                api.getStatus(),
                api.getUserAssets(),
                api.getCurrencyRates(),
                api.getTransactions(),
                api.getGameStats()
            ]);
            
            this.state.status = status;
            this.state.assets = assets.assets;
            this.state.currencyRates = currencyRates.rates;
            this.state.transactions = transactions.transactions;
            this.state.gameStats = gameStats.stats;
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            showToast('Failed to load data', 'error');
        }
        
        this.state.isLoading = false;
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.showTab(tabName);
            });
        });

        // Long press for games
        this.setupLongPress();

        // Form submissions
        this.setupForms();

        // Quick action buttons
        this.setupQuickActions();

        // Subscribe button
        if (this.elements.subscribeBtn) {
            this.elements.subscribeBtn.addEventListener('click', () => {
                window.open('https://www.youtube.com/channel/UCZ5heNyv3s5dIw9mtjsAGsg?sub_confirmation=1', '_blank');
            });
        }

        // Dialog close
        if (this.elements.closeGameDialog) {
            this.elements.closeGameDialog.addEventListener('click', () => {
                this.hideGameDialog();
            });
        }

        // Quick game buttons
        document.querySelectorAll('.quick-game-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameType = e.target.dataset.game;
                this.playQuickGame(gameType);
            });
        });

        // Back button
        document.getElementById('back-btn').addEventListener('click', () => {
            window.location.href = 'yt-new.html';
        });
    }

    setupLongPress() {
        if (!this.elements.userBalance) return;

        const startLongPress = () => {
            this.longPressTimeout = setTimeout(() => {
                this.showGameDialog();
            }, 500);
        };

        const endLongPress = () => {
            if (this.longPressTimeout) {
                clearTimeout(this.longPressTimeout);
                this.longPressTimeout = null;
            }
        };

        this.elements.userBalance.addEventListener('mousedown', startLongPress);
        this.elements.userBalance.addEventListener('mouseup', endLongPress);
        this.elements.userBalance.addEventListener('mouseleave', endLongPress);
        this.elements.userBalance.addEventListener('touchstart', startLongPress);
        this.elements.userBalance.addEventListener('touchend', endLongPress);
    }

    setupForms() {
        // Buy form
        if (this.elements.buyForm) {
            this.elements.buyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleBuySubmit(e);
            });
        }

        // Sell form
        if (this.elements.sellForm) {
            this.elements.sellForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSellSubmit(e);
            });
        }

        // Game form
        if (this.elements.gameForm) {
            this.elements.gameForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleGameSubmit(e);
            });

            // Update total cost when inputs change
            const updateCost = () => {
                const games = parseInt(document.getElementById('games-to-play').value) || 1;
                const codesPerGame = parseInt(document.getElementById('codes-per-game').value) || 25;
                const totalCost = games * codesPerGame;
                document.getElementById('total-cost').textContent = `${totalCost} codes`;
            };

            document.getElementById('games-to-play').addEventListener('input', updateCost);
            document.getElementById('codes-per-game').addEventListener('input', updateCost);
        }

        // Card number formatting
        const cardNumberInput = document.getElementById('card-number');
        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
                const matches = value.match(/\d{4,16}/g);
                const match = matches && matches[0] || '';
                const parts = [];

                for (let i = 0, len = match.length; i < len; i += 4) {
                    parts.push(match.substring(i, i + 4));
                }

                if (parts.length) {
                    e.target.value = parts.join(' ');
                } else {
                    e.target.value = value;
                }
            });
        }

        // Expiry date formatting
        const expiryInput = document.getElementById('expiry-date');
        if (expiryInput) {
            expiryInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2, 4);
                }
                e.target.value = value;
            });
        }
    }

    setupQuickActions() {
        // compress/grind quick actions removed per requirements

        if (this.elements.quickPlay) {
            this.elements.quickPlay.addEventListener('click', () => {
                this.showTab('games');
            });
        }

        // piston compression buttons removed per requirements
    }

    startPeriodicRefresh() {
        // Refresh status every 30 seconds
        this.refreshIntervals.push(setInterval(async () => {
            try {   
                const status = await api.getStatus();
                this.state.status = status;
                this.updateHeaderInfo();
            } catch (error) {
                console.error('Error refreshing status:', error);
            }
        }, 30000));

        // Refresh currency rates every minute
        this.refreshIntervals.push(setInterval(async () => {
            try {   
                const currencyRates = await api.getCurrencyRates();
                this.state.currencyRates = currencyRates.rates;
                this.updateCurrencyTicker();
            } catch (error) {
                console.error('Error refreshing currency rates:', error);
            }
        }, 60000));
    }

    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove active class from all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected tab
        const selectedTab = document.getElementById(`${tabName}-tab`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }

        // Add active class to selected button
        const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }
    }

    showGameDialog() {
        if (this.elements.gameDialog) {
            this.elements.gameDialog.style.display = 'flex';
        }
    }

    hideGameDialog() {
        if (this.elements.gameDialog) {
            this.elements.gameDialog.style.display = 'none';
        }
    }

    async playQuickGame(gameType) {
        this.hideGameDialog();
        
        try {   
            const result = await api.playGames({
                gameType,
                gamesToPlay: 1,
                codesPerGame: 25
            });
            
            showToast(
                `${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Complete!`,
                result.netChange > 0 ? 'success' : 'warning'
            );
            
            // Refresh assets and stats
            await this.refreshUserData();
            
        } catch (error) {
            console.error('Error playing quick game:', error);
            showToast(error.message || 'Failed to play game', 'error');
        }
    }

    async handleBuySubmit(e) {
        const data = {
            currency: document.getElementById('buy-currency').value,
            amount: document.getElementById('buy-amount').value,
            paymentMethod: document.getElementById('payment-method').value,
            paymentDetails: {
                cardNumber: document.getElementById('card-number').value,
                expiryDate: document.getElementById('expiry-date').value,
                cvv: document.getElementById('cvv').value,
                cardholderName: document.getElementById('cardholder-name').value
            }
        };

        try {   
            const submitBtn = document.getElementById('buy-submit');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';

            await api.buyCodes(data);
            showToast('Codes purchased successfully!', 'success');
            
            // Reset form
            e.target.reset();
            
            // Refresh data
            await this.refreshUserData();
            
        } catch (error) {
            console.error('Error buying codes:', error);
            showToast(error.message || 'Failed to purchase codes', 'error');
        } finally {
            const submitBtn = document.getElementById('buy-submit');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-shopping-cart mr-2"></i>Purchase Codes';
        }
    }

    async handleSellSubmit(e) {
        if (!this.state.status.isMonetized) {
            showToast('Banking services will be enabled when YouTube channel reaches 1,000 subscribers', 'error');
            return;
        }

        const data = {
            codesToSell: parseInt(document.getElementById('codes-to-sell').value),
            currency: document.getElementById('sell-currency').value,
            bankDetails: {
                bankName: document.getElementById('bank-name').value,
                accountHolderName: document.getElementById('account-holder').value,
                accountNumber: document.getElementById('account-number').value
            }
        };

        try {   
            const submitBtn = document.getElementById('sell-submit');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';

            await api.sellCodes(data);
            showToast('Codes sold successfully!', 'success');
            
            // Reset form
            e.target.reset();
            
            // Refresh data
            await this.refreshUserData();
            
        } catch (error) {
            console.error('Error selling codes:', error);
            showToast(error.message || 'Failed to sell codes', 'error');
        } finally {
            const submitBtn = document.getElementById('sell-submit');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-coins mr-2"></i>Sell Codes';
        }
    }

    async handleGameSubmit(e) {
        const data = {
            gameType: document.getElementById('game-type').value,
            gamesToPlay: parseInt(document.getElementById('games-to-play').value),
            codesPerGame: parseInt(document.getElementById('codes-per-game').value)
        };

        try {   
            const submitBtn = document.getElementById('play-submit');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Playing...';

            const result = await api.playGames(data);
            showToast(
                `Game Complete! Won ${result.gamesWon}/${result.totalGames} games. Net change: ${result.netChange} codes`,
                result.netChange > 0 ? 'success' : 'warning'
            );
            
            // Refresh data
            await this.refreshUserData();
            
        } catch (error) {
            console.error('Error playing games:', error);
            showToast(error.message || 'Failed to play games', 'error');
        } finally {
            const submitBtn = document.getElementById('play-submit');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Play Games';
        }
    }

    async grindCodes() {
        try {   
            await api.grind('/api/grind');
            showToast('Grinding completed successfully!', 'success');
            await this.refreshUserData();
        } catch (error) {
            console.error('Error grinding:', error);
            showToast(error.message || 'Failed to grind', 'error');
        }
    }

    async compressCodes(mode) {
        try {   
            await api.compressCodes({ amount: 1, mode });
            showToast(`Codes compressed to ${mode} successfully!`, 'success');
            await this.refreshUserData();
        } catch (error) {
            console.error('Error compressing codes:', error);
            showToast(error.message || 'Failed to compress codes', 'error');
        }
    }

    async refreshUserData() {
        try {   
            const [assets, transactions, gameStats] = await Promise.all([
                api.getUserAssets(),
                api.getTransactions(),
                api.getGameStats()
            ]);
            
            this.state.assets = assets.assets;
            this.state.transactions = transactions.transactions;
            this.state.gameStats = gameStats.stats;
            
            this.updateUI();
        } catch (error) {
            console.error('Error refreshing user data:', error);
        }
    }

    updateUI() {
        this.updateHeaderInfo();
        this.updateAssets();
        this.updateGameStats();
        this.updateTransactions();
        this.updateCurrencyTicker();
        this.updateMonetizationUI();
    }

    updateHeaderInfo() {
        if (this.elements.subscriberCount) {
            this.elements.subscriberCount.textContent = this.state.status.subscribers || 0;
        }

        if (this.elements.monetizationStatus) {
            this.elements.monetizationStatus.className = `ml-3 w-2 h-2 rounded-full animate-pulse ${
                this.state.status.isMonetized ? 'bg-green-400' : 'bg-yellow-400'
            }`;
        }

        if (this.elements.codesCount) {
            this.elements.codesCount.textContent = (this.state.assets.codes || 0).toLocaleString();
        }

        if (this.elements.totalEgpValue) {
            const totalValue = 
                (this.state.assets.codes / 100) +
                (this.state.assets.silverBars * 1) +
                (this.state.assets.goldBars * 10);
            this.elements.totalEgpValue.textContent = totalValue.toFixed(2);
        }

        // Progress bar
        if (!this.state.status.isMonetized) {
            if (this.elements.progressBar) {
                this.elements.progressBar.style.display = 'block';
            }
            if (this.elements.progressPercentage) {
                this.elements.progressPercentage.textContent = this.state.status.progressPercentage || 0;
            }
            if (this.elements.progressFill) {
                this.elements.progressFill.style.width = `${this.state.status.progressPercentage || 0}%`;
            }
            if (this.elements.remainingSubscribers) {
                this.elements.remainingSubscribers.textContent = this.state.status.remainingSubscribers || 1000;
            }
        } else {
            if (this.elements.progressBar) {
                this.elements.progressBar.style.display = 'none';
            }
        }
    }

    updateAssets() {
        if (this.elements.assetCodes) {
            this.elements.assetCodes.textContent = (this.state.assets.codes || 0).toLocaleString();
        }
        if (this.elements.assetSilver) {
            this.elements.assetSilver.textContent = (this.state.assets.silverBars || 0).toLocaleString();
        }
        if (this.elements.assetGold) {
            this.elements.assetGold.textContent = (this.state.assets.goldBars || 0).toLocaleString();
        }
    }

    updateGameStats() {
        if (this.elements.totalGames) {
            this.elements.totalGames.textContent = this.state.gameStats.totalGames || 0;
        }
        if (this.elements.gamesWon) {
            this.elements.gamesWon.textContent = this.state.gameStats.totalWon || 0;
        }
        if (this.elements.winRate) {
            this.elements.winRate.textContent = this.state.gameStats.winRate || '0%';
        }
        if (this.elements.biggestWin) {
            this.elements.biggestWin.textContent = this.state.gameStats.biggestWin || 0;
        }
    }

    updateTransactions() {
        if (!this.elements.transactionsList) return;

        if (!this.state.transactions || this.state.transactions.length === 0) {
            this.elements.transactionsList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-history text-3xl mb-2"></i>
                    <p>No transactions yet</p>
                </div>
            `;
            return;
        }

        this.elements.transactionsList.innerHTML = this.state.transactions.map(transaction => `
            <div class="flex items-center justify-between p-4 border rounded-lg">
                <div class="flex items-center space-x-3">
                    <div class="p-2 bg-gray-100 rounded-full">
                        <i class="fas fa-${this.getTransactionIcon(transaction.type)}"></i>
                    </div>
                    <div>
                        <div class="font-medium">${transaction.description}</div>
                        <div class="text-sm text-gray-500">${formatDate(transaction.timestamp)}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-semibold ${transaction.amount.startsWith('-') ? 'text-red-600' : 'text-green-600'}">
                        ${transaction.amount}
                    </div>
                    <div class="text-sm text-gray-500">${transaction.status}</div>
                </div>
            </div>
        `).join('');
    }

    updateCurrencyTicker() {
        if (!this.elements.currencyTicker) return;

        const rates = this.state.currencyRates;
        const tickerContent = [
            `USD: $${parseFloat(rates.USD || 0).toFixed(3)}`,
            `EUR: €${parseFloat(rates.EUR || 0).toFixed(3)}`,
            `GBP: £${parseFloat(rates.GBP || 0).toFixed(3)}`,
            `SAR: ${parseFloat(rates.SAR || 0).toFixed(3)} SAR`,
            `AED: ${parseFloat(rates.AED || 0).toFixed(3)} AED`
        ];

        this.elements.currencyTicker.innerHTML = tickerContent.map(item => 
            `<span class="mx-8">${item}</span>`
        ).join('');
    }

    updateMonetizationUI() {
        // Update monetization banner
        if (this.elements.monetizationBanner) {
            this.elements.monetizationBanner.style.display = this.state.status.isMonetized ? 'none' : 'block';
        }

        // Update sell form availability
        const sellLocked = document.getElementById('sell-locked');
        const sellForm = document.getElementById('sell-form');
        
        if (sellLocked && sellForm) {
            if (this.state.status.isMonetized) {
                sellLocked.style.display = 'none';
                sellForm.style.display = 'block';
            } else {
                sellLocked.style.display = 'block';
                sellForm.style.display = 'none';
            }
        }
    }

    getTransactionIcon(type) {
        const icons = {
            'buy': 'shopping-cart',
            'sell': 'coins',
            'game': 'gamepad',
            'grind': 'zap',
            'compress': 'compress',
            'default': 'exchange-alt'
        };
        return icons[type] || icons.default;
    }

    destroy() {
        // Clear intervals
        this.refreshIntervals.forEach(interval => clearInterval(interval));
        
        // Clear timeout
        if (this.longPressTimeout) {
            clearTimeout(this.longPressTimeout);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (!window.__CODEBANK_APP_INIT__) {
        window.__CODEBANK_APP_INIT__ = true;
        window.codeBankApp = new CodeBankApp();
    }
});

// Handle page unload
window.addEventListener('beforeunload', function() {
    if (window.codeBankApp) {
        window.codeBankApp.destroy();
    }
});
