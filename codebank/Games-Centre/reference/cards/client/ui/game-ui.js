export class GameUI {
    constructor(app) {
        this.app = app;
        this.chatPanel = document.getElementById('chat-panel');
        
        // Listen to game engine events
        window.addEventListener('opponent-moved', (e) => {
            this.revealOpponentCard(e.detail.value);
        });

        // Listen to WS for remote moves
        this.app.wsClient.subscribe((data) => {
            if (data.type === 'GAME_ACTION' && data.action.type === 'DRAW') {
                this.revealOpponentCard(data.action.value);
            }
        });
    }

    bindEvents() {
        const drawBtn = document.getElementById('draw-btn');
        if (drawBtn) {
            console.log("GameUI: Binding draw button");
            drawBtn.onclick = (e) => {
                e.preventDefault();
                console.log('Draw button clicked');
                if (this.app.gameEngine.myCard !== null) {
                    console.log('Card already drawn');
                    return;
                }
                
                this.app.gameEngine.drawCard();
                drawBtn.disabled = true;
                drawBtn.style.opacity = '0.5';
                document.getElementById('game-status').innerText = "OPPONENT'S TURN...";
                this.checkGameCompletion();
            };
        }
    }

    revealOpponentCard(value) {
        const cardEl = document.getElementById('opponent-card');
        if (cardEl) {
            cardEl.classList.remove('back');
            cardEl.innerText = this.app.gameEngine.getCardDisplay(value);
            this.app.gameEngine.opponentCard = value;
            this.checkGameCompletion();
        }
    }

    checkGameCompletion() {
        if (this.app.gameEngine.myCard !== null && this.app.gameEngine.opponentCard !== null) {
            document.getElementById('round-message').innerText = "Calculating results...";
            setTimeout(() => {
                this.app.stateMachine.transition('COMPLETED');
            }, 1500);
        }
    }
}
