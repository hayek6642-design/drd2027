export class GameEngine {
    constructor(stateMachine, wsClient) {
        this.sm = stateMachine;
        this.ws = wsClient;
        this.myCard = null;
        this.opponentCard = null;
        this.mode = 'practice';
        this.serviceLevel = 'A';
        this.communicationManager = null;
    }

    startGame(mode, serviceLevel) {
        this.mode = mode;
        this.serviceLevel = serviceLevel;
        console.log(`Starting game: ${mode} - ${serviceLevel}`);
        
        this.sm.transition('READY');
        
        // Initialize Communication Manager based on service level
        if (this.communicationManager) {
            this.communicationManager.cleanup();
        }
        
        // Import and initialize Communication Manager
        import('./communication/communication-manager.js').then(module => {
            this.communicationManager = new module.CommunicationManager(this.ws, serviceLevel);
        }).catch(err => {
            console.error('Failed to load Communication Manager:', err);
        });
        
        // Reset state for new game
        this.myCard = null;
        this.opponentCard = null;
        
        if (this.mode === 'ai') {
            setTimeout(() => {
                this.sm.transition('RUNNING');
                this.startAILogic();
            }, 1000);
        } else if (this.mode === 'practice') {
            setTimeout(() => {
                this.sm.transition('RUNNING');
                // Practice mode: random opponent move after short delay
                setTimeout(() => {
                    const practiceOpponentValue = Math.floor(Math.random() * 13) + 1;
                    this.opponentCard = practiceOpponentValue;
                    window.dispatchEvent(new CustomEvent('opponent-moved', { detail: { value: practiceOpponentValue } }));
                }, 2500);
            }, 1000);
        } else {
            // Multiplayer - wait for signal
            document.getElementById('game-status').innerText = "SEARCHING FOR PLAYERS...";
            // Mock matching for now
            setTimeout(() => {
                this.sm.transition('RUNNING');
                document.getElementById('game-status').innerText = "MATCH FOUND";
            }, 2000);
        }
    }

    drawCard() {
        const value = Math.floor(Math.random() * 13) + 1; // 1-13
        this.myCard = value;
        
        // Animation trigger
        const cardEl = document.getElementById('my-card');
        cardEl.classList.remove('back');
        cardEl.innerText = this.getCardDisplay(value);
        
        this.ws.send({ 
            type: 'GAME_ACTION', 
            action: { type: 'DRAW', value: value } 
        });
        
        return value;
    }

    getCardDisplay(val) {
        const faces = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
        return faces[val] || val;
    }

    startAILogic() {
        setTimeout(() => {
            const aiValue = Math.floor(Math.random() * 13) + 1;
            this.opponentCard = aiValue;
            window.dispatchEvent(new CustomEvent('opponent-moved', { detail: { value: aiValue } }));
        }, 2000);
    }

    determineWinner() {
        if (this.myCard === null || this.opponentCard === null) return null;
        if (this.myCard > this.opponentCard) return 'player';
        if (this.opponentCard > this.myCard) return 'opponent';
        return 'draw';
    }
}