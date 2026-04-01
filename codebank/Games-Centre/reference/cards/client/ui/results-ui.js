export class ResultsUI {
    constructor(app) {
        this.app = app;
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('return-lobby-btn').addEventListener('click', () => {
            this.resetGame();
            this.app.stateMachine.transition('LOBBY');
        });
    }

    update() {
        const winner = this.app.gameEngine.determineWinner();
        const banner = document.getElementById('winner-banner');
        const rewards = document.getElementById('rewards-display');
        
        if (winner === 'player') {
            banner.innerText = "YOU WON!";
            banner.style.color = "hsl(142 76% 36%)";
            const reward = this.app.gameEngine.mode === 'practice' ? '0' : '210';
            rewards.innerText = `Reward: ${reward} Codes Credited to Pool`;
        } else if (winner === 'opponent') {
            banner.innerText = "YOU LOST";
            banner.style.color = "hsl(0 84% 60%)";
            rewards.innerText = "No rewards this time. Better luck next time!";
        } else {
            banner.innerText = "IT'S A DRAW";
            banner.style.color = "hsl(45 100% 50%)";
            rewards.innerText = "Assets returned to Ledger status.";
        }
    }

    resetGame() {
        const cards = ['my-card', 'opponent-card'];
        cards.forEach(id => {
            const el = document.getElementById(id);
            el.classList.add('back');
            el.innerText = "?";
        });
        
        document.getElementById('draw-btn').disabled = false;
        document.getElementById('game-status').innerText = "WAITING";
        document.getElementById('round-message').innerText = "Draw your card";
        
        this.app.gameEngine.myCard = null;
        this.app.gameEngine.opponentCard = null;
    }
}
