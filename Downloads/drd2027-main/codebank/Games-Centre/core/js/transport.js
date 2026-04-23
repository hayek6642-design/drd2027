/**
 * Transport Layer - Real-time Communication
 * 
 * Provides WebSocket-based transport for:
 * - Lobby events
 * - Presence updates
 * - Chat messages
 * - Game state sync
 * 
 * Falls back to simple event bus if no server available
 */

class TransportLayer {
    constructor(config = {}) {
        this.serverUrl = config.serverUrl || null;
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.eventHandlers = new Map();
        this.messageQueue = [];
        this.userId = null;

        // Use local event bus as fallback
        this.useLocalFallback = !this.serverUrl;
        this.localBus = new BroadcastChannel('games-centre-transport');

        if (this.useLocalFallback) {
            console.log('[Transport] Using local fallback mode (no WebSocket server)');
            this.setupLocalFallback();
        }
    }

    /**
     * Connect to transport
     */
    async connect(userId) {
        this.userId = userId;

        if (this.useLocalFallback) {
            this.connected = true;
            this.emit('connected', { userId });
            return { success: true, mode: 'local' };
        }

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.serverUrl);

                this.ws.onopen = () => {
                    console.log('[Transport] WebSocket connected');
                    this.connected = true;
                    this.reconnectAttempts = 0;

                    // Send auth
                    this.send('auth', { userId });

                    // Flush queued messages
                    this.flushMessageQueue();

                    this.emit('connected', { userId });
                    resolve({ success: true, mode: 'websocket' });
                };

                this.ws.onerror = (error) => {
                    console.error('[Transport] WebSocket error:', error);
                    this.emit('error', { error });
                };

                this.ws.onclose = () => {
                    console.log('[Transport] WebSocket closed');
                    this.connected = false;
                    this.emit('disconnected', {});
                    this.attemptReconnect();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                // Timeout
                setTimeout(() => {
                    if (!this.connected) {
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);
            } catch (error) {
                console.error('[Transport] Connection failed:', error);
                reject(error);
            }
        });
    }

    /**
     * Setup local fallback (BroadcastChannel)
     */
    setupLocalFallback() {
        this.localBus.onmessage = (event) => {
            const { senderId, type, payload } = event.data;

            // Don't process own messages
            if (senderId === this.userId) return;

            this.emit(type, payload);
        };
    }

    /**
     * Send message
     */
    send(type, payload) {
        const message = { type, payload, userId: this.userId };

        if (this.useLocalFallback) {
            // Send via BroadcastChannel
            this.localBus.postMessage({
                senderId: this.userId,
                type,
                payload
            });
            return;
        }

        if (!this.connected) {
            // Queue message
            this.messageQueue.push(message);
            return;
        }

        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('[Transport] Send failed:', error);
            this.messageQueue.push(message);
        }
    }

    /**
     * Handle incoming message
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            const { type, payload } = message;

            this.emit(type, payload);
        } catch (error) {
            console.error('[Transport] Message parse error:', error);
        }
    }

    /**
     * Flush queued messages
     */
    flushMessageQueue() {
        while (this.messageQueue.length > 0 && this.connected) {
            const message = this.messageQueue.shift();
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Attempt reconnect
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[Transport] Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;

        setTimeout(() => {
            console.log(`[Transport] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            this.connect(this.userId).catch(() => {
                // Will retry
            });
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    /**
     * Event handlers
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    emit(event, data) {
        const handlers = this.eventHandlers.get(event) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`[Transport] Handler error for ${event}:`, error);
            }
        });
    }

    /**
     * Disconnect
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        if (this.localBus) {
            this.localBus.close();
        }

        this.connected = false;
    }
}

// Export singleton
export const transport = new TransportLayer({
    // serverUrl: 'ws://localhost:3000' // Uncomment when WebSocket server is ready
});

/**
 * Integration helpers
 */

// Lobby events
export function subscribeLobbyEvents(lobbyId, handlers) {
    transport.on('lobby:update', (data) => {
        if (data.lobbyId === lobbyId && handlers.onUpdate) {
            handlers.onUpdate(data);
        }
    });

    transport.on('lobby:player-joined', (data) => {
        if (data.lobbyId === lobbyId && handlers.onPlayerJoined) {
            handlers.onPlayerJoined(data);
        }
    });

    transport.on('lobby:player-left', (data) => {
        if (data.lobbyId === lobbyId && handlers.onPlayerLeft) {
            handlers.onPlayerLeft(data);
        }
    });

    transport.on('lobby:ready', (data) => {
        if (data.lobbyId === lobbyId && handlers.onReady) {
            handlers.onReady(data);
        }
    });
}

// Presence events
export function subscribePresenceEvents(handlers) {
    transport.on('presence:user-online', handlers.onUserOnline || (() => { }));
    transport.on('presence:user-offline', handlers.onUserOffline || (() => { }));
    transport.on('presence:status-changed', handlers.onStatusChanged || (() => { }));
}

// Chat events
export function subscribeChatEvents(gameId, handlers) {
    transport.on('chat:message', (data) => {
        if (data.gameId === gameId && handlers.onMessage) {
            handlers.onMessage(data);
        }
    });
}

// Game sync events
export function subscribeGameSyncEvents(sessionId, handlers) {
    transport.on('game:sync', (data) => {
        if (data.sessionId === sessionId && handlers.onSync) {
            handlers.onSync(data);
        }
    });
}
