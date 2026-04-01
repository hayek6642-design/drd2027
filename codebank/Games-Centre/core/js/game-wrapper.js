/**
 * game-wrapper.js - Enhanced Version
 * 
 * Manages the Iframe lifecycle, Multi-player Support, Betting Logic, and communication with the Game.
 * Integrates with betting-core, fair-play, and local-transaction-ledger.
 */
import { ledgerKernel } from '../../../../ledger/local-transaction-ledger.js';
import { assetsBus } from '../../../../ledger/local-assets-bus.js';
import { bettingCore, GAME_MODES } from './betting-core.js';
import { fairPlay } from './fair-play.js';

export class GameWrapper {
    constructor(iframeElement, gameData, userId, config = {}) {
        this.iframe = iframeElement;
        this.gameData = gameData;
        this.userId = userId;
        this.config = config;
        this.active = false;

        // Betting
        this.betId = null;
        this.betAmount = config.betAmount || 0;
        this.gameMode = config.gameMode || GAME_MODES.PRACTICE;
        this.opponents = config.opponents || [];

        // Session tracking
        this.gameSessionId = null;
        this.fairPlaySessionId = null;
        this.startTime = null;

        // Listen for messages from the game
        window.addEventListener('message', this._handleMessage.bind(this));

        // Performance tracking
        this.frameCount = 0;
        this.lastFPSCheck = Date.now();
        this.currentFPS = 0;
    }

    async startGame(betAmount = 0, opponents = []) {
        this.betAmount = betAmount;
        this.opponents = opponents;
        this.gameSessionId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.startTime = Date.now();

        // Determine game mode
        if (opponents.length > 0) {
            this.gameMode = opponents.length === 1 ? GAME_MODES.PVP : GAME_MODES.TOURNAMENT;
        } else if (betAmount > 0) {
            this.gameMode = GAME_MODES.SOLO_VS_AI;
        } else {
            this.gameMode = GAME_MODES.PRACTICE;
        }

        // Initialize fair play session
        if (betAmount > 0) {
            this.fairPlaySessionId = fairPlay.initSession(
                this.gameData.id,
                this.userId,
                this.betId
            );
        }

        // Create bet if applicable
        if (this.betAmount > 0) {
            try {
                // Build players array
                const players = [
                    { userId: this.userId, role: 'player1', amount: this.betAmount }
                ];

                // Add opponents
                this.opponents.forEach((opponent, index) => {
                    players.push({
                        userId: opponent.userId,
                        role: `player${index + 2}`,
                        amount: opponent.betAmount || this.betAmount
                    });
                });

                // Create bet via betting core
                const betResult = await bettingCore.createBet({
                    players,
                    gameId: this.gameData.id,
                    gameMode: this.gameMode,
                    asset: this.config.asset || 'code',
                    metadata: {
                        sessionId: this.gameSessionId,
                        gameTitle: this.gameData.title
                    }
                });

                if (!betResult.success) {
                    throw new Error(betResult.error);
                }

                this.betId = betResult.betId;
                console.log(`[GameWrapper] Bet created: ${this.betId}`);
            } catch (e) {
                console.error('Betting failed', e);
                return { success: false, error: e.message };
            }
        }

        this.active = true;

        // Notify game it can start
        this._postToGame({
            type: 'GAME_START',
            settings: {
                bet: this.betAmount,
                gameMode: this.gameMode,
                sessionId: this.gameSessionId,
                opponents: this.opponents,
                userId: this.userId
            }
        });

        // Start performance monitoring
        this._startPerformanceMonitoring();

        return { success: true, sessionId: this.gameSessionId, betId: this.betId };
    }

    async endGame(result) {
        if (!this.active) return;
        this.active = false;

        const duration = Date.now() - this.startTime;

        // Validate score if betting
        if (this.betId && this.fairPlaySessionId) {
            const validation = await fairPlay.verifyScore(
                this.fairPlaySessionId,
                result.score || 0
            );

            if (!validation.valid) {
                console.error('[GameWrapper] Score validation failed:', validation.reason);

                // Cancel bet and refund
                await bettingCore.cancelBet(this.betId, 'Fair play violation: ' + validation.reason);

                return {
                    success: false,
                    error: 'Game validation failed',
                    reason: validation.reason
                };
            }
        }

        // Process bet result
        if (this.betId) {
            try {
                const betResult = await bettingCore.processBetResult(this.betId, {
                    winnerId: result.won ? this.userId : (this.opponents[0]?.userId || null),
                    isDraw: result.draw || false,
                    score: result.score || 0,
                    duration
                });

                if (!betResult.success) {
                    console.error('[GameWrapper] Bet result processing failed:', betResult.error);
                }
            } catch (e) {
                console.error('[GameWrapper] Error processing bet:', e);
            }
        }

        // Emit game stats
        assetsBus.emit('game-completed', {
            userId: this.userId,
            gameId: this.gameData.id,
            gameTitle: this.gameData.title,
            score: result.score || 0,
            won: result.won || false,
            duration,
            gameMode: this.gameMode,
            betAmount: this.betAmount,
            averageFPS: this.currentFPS
        });

        console.log('[GameWrapper] Game ended:', result);
    }

    _handleMessage(event) {
        // Ensure message is from our iframe
        if (event.source !== this.iframe.contentWindow) return;

        const { type, payload } = event.data;

        switch (type) {
            case 'GAME_OVER':
                this.endGame(payload);
                break;

            case 'SCORE_UPDATE':
                if (this.fairPlaySessionId) {
                    fairPlay.trackScore(this.fairPlaySessionId, payload.score);
                }
                break;

            case 'GAME_ACTION':
                if (this.fairPlaySessionId) {
                    fairPlay.trackAction(this.fairPlaySessionId, payload);
                }
                break;

            case 'READY':
                console.log('[GameWrapper] Game iframe ready');
                break;

            case 'FRAME_RENDERED':
                this.frameCount++;
                break;
        }
    }

    _postToGame(msg) {
        if (this.iframe && this.iframe.contentWindow) {
            var __o;
            try { var __s = this.iframe.getAttribute('src') || this.iframe.src || ''; __o = new URL(__s, window.location.href).origin } catch(_) { __o = window.location.origin }
            this.iframe.contentWindow.postMessage(msg, __o);
        }
    }

    _startPerformanceMonitoring() {
        this.performanceInterval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - this.lastFPSCheck;

            if (elapsed >= 1000) {
                this.currentFPS = Math.round((this.frameCount / elapsed) * 1000);
                this.frameCount = 0;
                this.lastFPSCheck = now;

                // Emit performance metrics
                if (this.currentFPS < 30) {
                    console.warn(`[GameWrapper] Low FPS: ${this.currentFPS}`);
                }
            }
        }, 1000);
    }

    _stopPerformanceMonitoring() {
        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
        }
    }

    /**
     * Pause game
     */
    pause() {
        this._postToGame({ type: 'PAUSE' });
    }

    /**
     * Resume game
     */
    resume() {
        this._postToGame({ type: 'RESUME' });
    }

    /**
     * Get current game stats
     */
    getStats() {
        return {
            sessionId: this.gameSessionId,
            betId: this.betId,
            duration: this.startTime ? Date.now() - this.startTime : 0,
            fps: this.currentFPS,
            gameMode: this.gameMode,
            betAmount: this.betAmount
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        this.active = false;
        this._stopPerformanceMonitoring();

        if (this.betId && bettingCore.activeBets.has(this.betId)) {
            // Game destroyed before completion - cancel bet
            bettingCore.cancelBet(this.betId, 'Game interrupted');
        }
    }
}
