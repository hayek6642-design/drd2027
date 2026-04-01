/**
 * Battalooda Bridge - جسر خدمة الألعاب
 * لإدارة المكاسب والخسائر في الألعاب
 */

class BattaloodaBridge extends ServiceBridgeBase {
    constructor() {
        super('battalooda', {
            defaultCurrency: 'silver',
            allowGoldGames: true,
            minBet: 10,
            maxBet: 10000
        });

        this.activeGames = new Map();
        this.gameHistory = [];
    }

    onACCConnected() {
        super.onACCConnected();
        this.setupBattaloodaIntegration();
    }

    setupBattaloodaIntegration() {
        // Game action handlers
        this.registerMessageHandler('start_game', (data) => {
            this.handleStartGame(data);
        });

        this.registerMessageHandler('end_game', (data) => {
            this.handleEndGame(data);
        });

        this.registerMessageHandler('place_bet', (data) => {
            this.handleBet(data);
        });

        this.registerMessageHandler('game_result', (data) => {
            this.handleGameResult(data);
        });

        this.registerMessageHandler('get_game_balance', () => {
            this.sendToService({
                type: 'game_balance',
                data: this.assets
            });
        });

        this.injectBattaloodaUI();
    }

    async handleStartGame(data) {
        const { gameId, gameType, entryFee = 0 } = data;

        if (entryFee > 0) {
            try {
                const result = await this.requestTransaction('spend', entryFee, 'silver', {
                    gameId,
                    gameType,
                    description: `Entry fee for ${gameType}`
                });

                if (!result.success) {
                    this.sendToService({
                        type: 'game_start_failed',
                        error: 'Insufficient balance for entry fee',
                        required: entryFee
                    });
                    return;
                }
            } catch (error) {
                this.sendToService({
                    type: 'game_start_failed',
                    error: error.message
                });
                return;
            }
        }

        this.activeGames.set(gameId, {
            gameType,
            startTime: Date.now(),
            bets: [],
            entryFee
        });

        this.sendToService({
            type: 'game_started',
            data: { gameId, gameType, entryFee }
        });
    }

    async handleBet(data) {
        const { gameId, amount, currency = 'silver' } = data;

        // Validate bet
        if (amount < this.config.minBet || amount > this.config.maxBet) {
            this.sendToService({
                type: 'bet_failed',
                error: `Bet must be between ${this.config.minBet} and ${this.config.maxBet}`
            });
            return;
        }

        try {
            const result = await this.requestTransaction('spend', amount, currency, {
                gameId,
                description: `Bet in game ${gameId}`
            });

            if (result.success) {
                const game = this.activeGames.get(gameId);
                if (game) {
                    game.bets.push({ amount, currency, timestamp: Date.now() });
                }

                this.sendToService({
                    type: 'bet_accepted',
                    data: {
                        gameId,
                        amount,
                        currency,
                        newBalance: result.newBalance
                    }
                });
            } else {
                this.sendToService({
                    type: 'bet_failed',
                    error: result.error
                });
            }
        } catch (error) {
            this.sendToService({
                type: 'bet_failed',
                error: error.message
            });
        }
    }

    async handleGameResult(data) {
        const { gameId, result, winAmount, currency = 'silver' } = data;
        const game = this.activeGames.get(gameId);
        
        if (!game) {
            this.sendToService({
                type: 'result_failed',
                error: 'Game not found'
            });
            return;
        }

        const isWin = result === 'win';
        const totalBets = game.bets.reduce((sum, bet) => sum + bet.amount, 0);

        try {
            if (isWin && winAmount > 0) {
                const txResult = await this.requestTransaction('game_win', winAmount, currency, {
                    gameId,
                    gameType: game.gameType,
                    description: `Win in ${game.gameType}`
                });

                this.gameHistory.push({
                    gameId,
                    gameType: game.gameType,
                    result: 'win',
                    amount: winAmount,
                    currency,
                    profit: winAmount - totalBets,
                    timestamp: Date.now()
                });

                this.sendToService({
                    type: 'game_win_processed',
                    data: {
                        gameId,
                        winAmount,
                        currency,
                        newBalance: txResult.newBalance,
                        profit: winAmount - totalBets
                    }
                });
            } else {
                // Loss - already deducted via bets, but record it
                this.gameHistory.push({
                    gameId,
                    gameType: game.gameType,
                    result: 'loss',
                    amount: totalBets,
                    currency,
                    timestamp: Date.now()
                });

                this.sendToService({
                    type: 'game_loss_recorded',
                    data: {
                        gameId,
                        lossAmount: totalBets,
                        currency
                    }
                });
            }

            // Cleanup
            this.activeGames.delete(gameId);

        } catch (error) {
            this.sendToService({
                type: 'result_failed',
                error: error.message
            });
        }
    }

    injectBattaloodaUI() {
        const style = document.createElement('style');
        style.textContent = `
            .acc-battalooda-hud {
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                color: white;
                padding: 20px;
                border-radius: 15px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                z-index: 10000;
                min-width: 250px;
            }
            
            .acc-battalooda-hud h3 {
                margin: 0 0 15px 0;
                font-size: 16px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .acc-battalooda-stats {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }
            
            .acc-stat-box {
                background: rgba(255,255,255,0.1);
                padding: 10px;
                border-radius: 8px;
                text-align: center;
            }
            
            .acc-stat-value {
                font-size: 24px;
                font-weight: bold;
                display: block;
            }
            
            .acc-stat-label {
                font-size: 11px;
                opacity: 0.8;
                text-transform: uppercase;
            }
            
            .acc-game-result {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.95);
                color: white;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                z-index: 10001;
                animation: popIn 0.3s ease;
            }
            
            @keyframes popIn {
                0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
            
            .acc-win { color: #4ade80; }
            .acc-loss { color: #f87171; }
        `;
        document.head.appendChild(style);
    }

    renderAssets() {
        super.renderAssets();
        
        // Update HUD
        const hud = document.querySelector('.acc-battalooda-hud');
        if (hud && this.assets) {
            const silverEl = hud.querySelector('.silver-value');
            const goldEl = hud.querySelector('.gold-value');
            
            if (silverEl) silverEl.textContent = (this.assets.silver_balance || 0).toLocaleString();
            if (goldEl) goldEl.textContent = (this.assets.gold_balance || 0).toLocaleString();
        }
    }

    // Get game statistics
    getGameStats() {
        const stats = {
            totalGames: this.gameHistory.length,
            wins: this.gameHistory.filter(g => g.result === 'win').length,
            losses: this.gameHistory.filter(g => g.result === 'loss').length,
            totalWagered: this.gameHistory.reduce((sum, g) => sum + (g.result === 'loss' ? g.amount : 0), 0),
            totalWon: this.gameHistory.reduce((sum, g) => sum + (g.result === 'win' ? g.amount : 0), 0),
            profit: 0
        };
        stats.profit = stats.totalWon - stats.totalWagered;
        return stats;
    }

    // Show game result overlay
    showResult(gameId, isWin, amount) {
        const existing = document.querySelector('.acc-game-result');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'acc-game-result';
        overlay.innerHTML = `
            <h2 class="${isWin ? 'acc-win' : 'acc-loss'}">
                ${isWin ? '🎉 فوز!' : '😞 خسارة'}
            </h2>
            <p>${isWin ? `ربحت ${amount} فضة` : `خسرت ${amount} فضة`}</p>
            <button onclick="this.parentElement.remove()" style="margin-top: 20px; padding: 10px 30px; border: none; border-radius: 25px; background: white; color: black; cursor: pointer;">إغلاق</button>
        `;
        
        document.body.appendChild(overlay);
        
        setTimeout(() => overlay.remove(), 5000);
    }
}

// Auto-initialize
if (window.location.pathname.includes('battalooda')) {
    window.battaloodaBridge = new BattaloodaBridge();
}
