// Dominos Game Logic
class DominosGame {
    constructor() {
        this.dominoes = [];
        this.playerHand = [];
        this.computerHand = [];
        this.board = [];
        this.currentPlayer = 'player';
        this.gameOver = false;
        this.score = 0;
        
        this.init();
    }
    
    init() {
        this.createDominoes();
        this.shuffleDominoes();
        this.dealDominoes();
        this.setupBoard();
        this.setupEventListeners();
        this.updateDisplay();
    }
    
    createDominoes() {
        // Create all possible domino combinations (0-6)
        for (let i = 0; i <= 6; i++) {
            for (let j = i; j <= 6; j++) {
                this.dominoes.push({
                    left: i,
                    right: j,
                    rotation: 0
                });
            }
        }
    }
    
    shuffleDominoes() {
        for (let i = this.dominoes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.dominoes[i], this.dominoes[j]] = [this.dominoes[j], this.dominoes[i]];
        }
    }
    
    dealDominoes() {
        // Deal 7 dominoes to each player
        this.playerHand = this.dominoes.splice(0, 7);
        this.computerHand = this.dominoes.splice(0, 7);
    }
    
    setupBoard() {
        // Start with highest double domino
        let startingDomino;
        let startingPlayer;
        
        const playerDouble = this.findHighestDouble(this.playerHand);
        const computerDouble = this.findHighestDouble(this.computerHand);
        
        if (playerDouble && (!computerDouble || playerDouble.left > computerDouble.left)) {
            startingDomino = playerDouble;
            startingPlayer = 'player';
            this.playerHand = this.playerHand.filter(d => d !== startingDomino);
        } else if (computerDouble) {
            startingDomino = computerDouble;
            startingPlayer = 'computer';
            this.computerHand = this.computerHand.filter(d => d !== startingDomino);
        } else {
            // No doubles, start with any domino from player
            startingDomino = this.playerHand[0];
            startingPlayer = 'player';
            this.playerHand.shift();
        }
        
        this.board.push(startingDomino);
        this.currentPlayer = startingPlayer === 'player' ? 'computer' : 'player';
    }
    
    findHighestDouble(hand) {
        return hand
            .filter(d => d.left === d.right)
            .sort((a, b) => b.left - a.left)[0];
    }
    
    setupEventListeners() {
        document.getElementById('domino-container').addEventListener('click', (e) => {
            if (this.currentPlayer !== 'player' || this.gameOver) return;
            
            const dominoEl = e.target.closest('.domino');
            if (!dominoEl) return;
            
            const index = parseInt(dominoEl.dataset.index);
            const domino = this.playerHand[index];
            
            if (this.canPlayDomino(domino)) {
                this.playDomino(index);
            }
        });
    }
    
    canPlayDomino(domino) {
        if (this.board.length === 0) return true;
        
        const leftEnd = this.board[0].left;
        const rightEnd = this.board[this.board.length - 1].right;
        
        return domino.left === leftEnd || domino.right === leftEnd ||
               domino.left === rightEnd || domino.right === rightEnd;
    }
    
    playDomino(index) {
        const domino = this.playerHand[index];
        
        if (this.board.length === 0) {
            this.board.push(domino);
        } else {
            const leftEnd = this.board[0].left;
            const rightEnd = this.board[this.board.length - 1].right;
            
            if (domino.right === leftEnd) {
                domino.rotation = 180;
                this.board.unshift(domino);
            } else if (domino.left === leftEnd) {
                this.board.unshift(domino);
            } else if (domino.left === rightEnd) {
                this.board.push(domino);
            } else if (domino.right === rightEnd) {
                domino.rotation = 180;
                this.board.push(domino);
            }
        }
        
        this.playerHand.splice(index, 1);
        this.updateScore(domino);
        
        if (this.playerHand.length === 0) {
            this.handleWin();
            return;
        }
        
        this.currentPlayer = 'computer';
        this.updateDisplay();
        
        setTimeout(() => this.computerTurn(), 1000);
    }
    
    computerTurn() {
        // Find playable dominoes
        const playableDominoes = this.computerHand.filter(d => this.canPlayDomino(d));
        
        if (playableDominoes.length === 0) {
            if (this.dominoes.length > 0) {
                this.computerHand.push(this.dominoes.pop());
                this.computerTurn();
            } else {
                this.currentPlayer = 'player';
                this.updateDisplay();
            }
            return;
        }
        
        // Play first available domino
        const domino = playableDominoes[0];
        const index = this.computerHand.indexOf(domino);
        
        if (this.board.length === 0) {
            this.board.push(domino);
        } else {
            const leftEnd = this.board[0].left;
            const rightEnd = this.board[this.board.length - 1].right;
            
            if (domino.right === leftEnd) {
                domino.rotation = 180;
                this.board.unshift(domino);
            } else if (domino.left === leftEnd) {
                this.board.unshift(domino);
            } else if (domino.left === rightEnd) {
                this.board.push(domino);
            } else if (domino.right === rightEnd) {
                domino.rotation = 180;
                this.board.push(domino);
            }
        }
        
        this.computerHand.splice(index, 1);
        
        if (this.computerHand.length === 0) {
            this.handleLoss();
            return;
        }
        
        this.currentPlayer = 'player';
        this.updateDisplay();
    }
    
    updateScore(domino) {
        const points = domino.left + domino.right;
        this.score += points;
        document.getElementById('score').textContent = this.score;
    }
    
    handleWin() {
        this.gameOver = true;
        
        // Calculate remaining points in computer's hand
        const remainingPoints = this.computerHand.reduce((sum, d) => sum + d.left + d.right, 0);
        this.score += remainingPoints;
        
        // Award prizes
        try {
            const currentRewards = window.getRewards ? window.getRewards() : { codes: 0, silverBars: 0, goldBars: 0 };
            
            const prize = {
                codes: Math.floor(this.score / 10) * 5 // 5 codes per 10 points
            };
            
            const updatedRewards = {
                codes: (currentRewards.codes || 0) + prize.codes,
                silverBars: currentRewards.silverBars,
                goldBars: currentRewards.goldBars
            };
            
            if (window.saveRewards) {
                window.saveRewards(updatedRewards);
                if (window.showToast) {
                    window.showToast(`You won! Earned ${prize.codes} codes!`, 'success');
                }
            }
        } catch (error) {
            console.error('Failed to award win prize:', error);
        }
        
        this.updateDisplay();
    }
    
    handleLoss() {
        this.gameOver = true;
        
        // Calculate remaining points in player's hand
        const remainingPoints = this.playerHand.reduce((sum, d) => sum + d.left + d.right, 0);
        this.score -= remainingPoints;
        
        // Small consolation prize for playing
        try {
            const currentRewards = window.getRewards ? window.getRewards() : { codes: 0, silverBars: 0, goldBars: 0 };
            
            const prize = {
                codes: 10 // Consolation prize
            };
            
            const updatedRewards = {
                codes: (currentRewards.codes || 0) + prize.codes,
                silverBars: currentRewards.silverBars,
                goldBars: currentRewards.goldBars
            };
            
            if (window.saveRewards) {
                window.saveRewards(updatedRewards);
                if (window.showToast) {
                    window.showToast(`Game Over! Consolation prize: ${prize.codes} codes`, 'info');
                }
            }
        } catch (error) {
            console.error('Failed to award consolation prize:', error);
        }
        
        this.updateDisplay();
    }
    
    updateDisplay() {
        this.drawPlayerHand();
        this.drawBoard();
        this.drawComputerHand();
        this.updateGameStatus();
    }
    
    drawPlayerHand() {
        const container = document.getElementById('player-hand');
        container.innerHTML = '';
        
        this.playerHand.forEach((domino, index) => {
            container.appendChild(this.createDominoElement(domino, index));
        });
    }
    
    drawBoard() {
        const container = document.getElementById('board');
        container.innerHTML = '';
        
        this.board.forEach(domino => {
            container.appendChild(this.createDominoElement(domino));
        });
    }
    
    drawComputerHand() {
        const container = document.getElementById('computer-hand');
        container.innerHTML = '';
        
        // Show back of dominoes for computer hand
        this.computerHand.forEach(() => {
            const dominoEl = document.createElement('div');
            dominoEl.className = 'domino back';
            container.appendChild(dominoEl);
        });
    }
    
    createDominoElement(domino, index = null) {
        const el = document.createElement('div');
        el.className = 'domino';
        if (index !== null) el.dataset.index = index;
        
        const leftHalf = document.createElement('div');
        leftHalf.className = 'domino-half';
        leftHalf.textContent = domino.left;
        
        const rightHalf = document.createElement('div');
        rightHalf.className = 'domino-half';
        rightHalf.textContent = domino.right;
        
        el.appendChild(leftHalf);
        el.appendChild(rightHalf);
        
        if (domino.rotation) {
            el.style.transform = `rotate(${domino.rotation}deg)`;
        }
        
        return el;
    }
    
    updateGameStatus() {
        const status = document.getElementById('game-status');
        
        if (this.gameOver) {
            status.textContent = this.playerHand.length === 0 ? 'You Win!' : 'Computer Wins!';
        } else {
            status.textContent = `Current Player: ${this.currentPlayer === 'player' ? 'Your' : 'Computer\'s'} Turn`;
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new DominosGame();
});
