/**
 * Game Runtime Loader
 * 
 * Responsible for:
 * - Loading game iframes/modules
 * - Initializing game loops
 * - Binding to game-wrapper
 * - Emitting lifecycle events
 * 
 * NO new features - just connects existing pieces
 */

export class GameRuntimeLoader {
    constructor(containerElement) {
        this.container = containerElement;
        this.currentGame = null;
        this.gameFrame = null;
        this.loadTimeout = 30000; // 30s timeout
        this.eventHandlers = new Map();
    }

    /**
     * Load a game into the runtime
     */
    async loadGame(gameData, wrapper) {
        console.log('[RuntimeLoader] Loading game:', gameData.title);

        this.currentGame = gameData;

        // Create or get iframe
        this.gameFrame = this.container.querySelector('iframe') || document.createElement('iframe');
        this.gameFrame.id = 'gameFrame';
        this.gameFrame.className = 'game-iframe';

        // Set iframe attributes
        this.gameFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
        this.gameFrame.setAttribute('allow', 'autoplay; fullscreen');

        if (!this.gameFrame.parentElement) {
            this.container.appendChild(this.gameFrame);
        }

        // Emit loading event
        this.emit('game:loading', { game: gameData });

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Game load timeout'));
            }, this.loadTimeout);

            // Setup load handler
            this.gameFrame.onload = () => {
                clearTimeout(timeout);
                console.log('[RuntimeLoader] Game iframe loaded');

                // Wait a bit for game initialization
                setTimeout(() => {
                    this.emit('game:ready', { game: gameData });
                    resolve({ success: true });
                }, 500);
            };

            // Setup error handler
            this.gameFrame.onerror = (error) => {
                clearTimeout(timeout);
                console.error('[RuntimeLoader] Game load error:', error);
                this.emit('game:error', { game: gameData, error });
                reject(error);
            };

            // Load the game
            this.gameFrame.src = gameData.url;
        });
    }

    /**
     * Start the game (trigger game loop)
     */
    startGame(settings = {}) {
        if (!this.gameFrame || !this.currentGame) {
            throw new Error('No game loaded');
        }

        console.log('[RuntimeLoader] Starting game with settings:', settings);

        // Send start message to game iframe
        this.postMessageToGame({
            type: 'GAME_START',
            settings
        });

        this.emit('game:start', {
            game: this.currentGame,
            settings
        });
    }

    /**
     * End the game
     */
    endGame(result) {
        console.log('[RuntimeLoader] Ending game:', result);

        this.emit('game:end', {
            game: this.currentGame,
            result
        });

        this.currentGame = null;
    }

    /**
     * Pause game
     */
    pauseGame() {
        this.postMessageToGame({ type: 'PAUSE' });
        this.emit('game:pause', { game: this.currentGame });
    }

    /**
     * Resume game
     */
    resumeGame() {
        this.postMessageToGame({ type: 'RESUME' });
        this.emit('game:resume', { game: this.currentGame });
    }

    /**
     * Unload current game
     */
    unloadGame() {
        if (this.gameFrame) {
            this.gameFrame.src = 'about:blank';
            this.emit('game:unload', { game: this.currentGame });
        }
        this.currentGame = null;
    }

    /**
     * Post message to game iframe
     */
    postMessageToGame(message) {
        if (this.gameFrame && this.gameFrame.contentWindow) {
            var __o;
            try { var __s = this.gameFrame.getAttribute('src') || this.gameFrame.src || ''; __o = new URL(__s, window.location.href).origin } catch(_) { __o = window.location.origin }
            this.gameFrame.contentWindow.postMessage(message, __o);
        }
    }

    /**
     * Listen for messages from game iframe
     */
    setupGameMessageListener() {
        window.addEventListener('message', (event) => {
            if (!this.gameFrame || event.source !== this.gameFrame.contentWindow) {
                return;
            }

            const { type, payload } = event.data;

            switch (type) {
                case 'READY':
                    this.emit('game:ready', { game: this.currentGame });
                    break;

                case 'GAME_OVER':
                    this.endGame(payload);
                    break;

                case 'SCORE_UPDATE':
                    this.emit('game:score', { score: payload.score });
                    break;

                case 'GAME_ACTION':
                    this.emit('game:action', payload);
                    break;

                case 'FRAME_RENDERED':
                    this.emit('game:frame', {});
                    break;
            }
        });
    }

    /**
     * Event emitter
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    emit(event, data) {
        const handlers = this.eventHandlers.get(event) || [];
        handlers.forEach(handler => handler(data));

        // Also emit as DOM event
        window.dispatchEvent(new CustomEvent(`runtime:${event}`, {
            detail: data
        }));
    }

    /**
     * Cleanup
     */
    destroy() {
        this.unloadGame();
        this.eventHandlers.clear();
    }
}

// Export singleton factory
export function createGameRuntime(container) {
    const runtime = new GameRuntimeLoader(container);
    runtime.setupGameMessageListener();
    return runtime;
}
