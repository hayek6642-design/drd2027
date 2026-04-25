/**
 * Yahood Bridge — acc/bridges/yahood-bridge.js
 *
 * Connects the Yahood! Mining World game service to the
 * Assets Central Core (ACC). Handles:
 *   • YAHOOD_INIT  — send current assets to the game on startup
 *   • YAHOOD_EARN  — add mined treasure to ACC (permanent, on home-deposit)
 *   • YAHOOD_SPEND — deduct silver spent in-game (e.g. tools / land purchase)
 *
 * Message protocol (postMessage, source = 'YAHOOD'):
 *   → YAHOOD_INIT   {}                        game requests current balance
 *   → YAHOOD_EARN   { codes, silver, gold }   deposit treasure to ACC
 *   → YAHOOD_SPEND  { silver }                spend silver from ACC
 *
 * Response (source = 'ACC'):
 *   ← ACC_ASSETS_UPDATE { codes, silver, gold }
 */

class YahoodBridge extends ServiceBridgeBase {
    constructor() {
        super('yahood', {
            bidirectionalSync: true,
            autoSync: false,          // Yahood triggers syncs explicitly
            syncInterval: 0
        });

        this.pendingEarnings = { codes: 0, silver: 0, gold: 0 };
    }

    /* ── Lifecycle ── */

    onACCConnected() {
        super.onACCConnected();
        this._setupHandlers();
        this._pushAssetsToGame();
        console.log('[YahoodBridge] Connected to ACC ✓');
    }

    /* ── Private helpers ── */

    _setupHandlers() {
        // Game requests its current balance
        this.registerMessageHandler('YAHOOD_INIT', (_data) => {
            this._pushAssetsToGame();
        });

        // Game deposits mined treasure (player reached home safely)
        this.registerMessageHandler('YAHOOD_EARN', (data) => {
            this._handleEarn(data.payload || data);
        });

        // Game spends silver (tools, land, etc.)
        this.registerMessageHandler('YAHOOD_SPEND', (data) => {
            this._handleSpend(data.payload || data);
        });
    }

    async _handleEarn({ codes = 0, silver = 0, gold = 0 }) {
        try {
            const response = await fetch(`${this.acc.httpUrl}/earn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.acc.userId,
                    assets: { codes, silver, gold },
                    source: 'yahood'
                })
            });

            const result = await response.json();
            if (result.success) {
                this.assets = result.assets;
                this._pushAssetsToGame();
                this.emit('earnComplete', { earned: { codes, silver, gold }, assets: result.assets });
                console.log(`[YahoodBridge] Earned — codes:${codes} silver:${silver} gold:${gold}`);
            } else {
                console.error('[YahoodBridge] Earn failed:', result.error);
            }
        } catch (err) {
            console.error('[YahoodBridge] Earn error:', err);
        }
    }

    async _handleSpend({ silver = 0 }) {
        if (!silver || silver <= 0) return;
        try {
            const response = await fetch(`${this.acc.httpUrl}/spend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.acc.userId,
                    assets: { silver },
                    source: 'yahood'
                })
            });

            const result = await response.json();
            if (result.success) {
                this.assets = result.assets;
                this._pushAssetsToGame();
                console.log(`[YahoodBridge] Spent silver:${silver}`);
            } else {
                // Notify game of insufficient funds
                this.sendToService({ type: 'ACC_SPEND_DENIED', reason: result.error || 'Insufficient balance' });
            }
        } catch (err) {
            console.error('[YahoodBridge] Spend error:', err);
        }
    }

    _pushAssetsToGame() {
        this.sendToService({
            source: 'ACC',
            type: 'ACC_ASSETS_UPDATE',
            payload: this.assets || { codes: 0, silver: 0, gold: 0 }
        });
    }

    /* ── Public API (called by ACC orchestrator) ── */

    getServiceId() { return 'yahood'; }

    getServiceInfo() {
        return {
            id: 'yahood',
            name: 'Yahood! Mining World',
            description: 'Geo-based treasure mining game with real-time PvP.',
            category: 'games',
            url: '/codebank/yahood/',
            bridgeVersion: '1.0.0'
        };
    }
}

// Register with ACC bridge system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YahoodBridge;
} else if (typeof window !== 'undefined') {
    window.YahoodBridge = YahoodBridge;
}

export default YahoodBridge;
