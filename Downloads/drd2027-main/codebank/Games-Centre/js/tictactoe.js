// TicTacToe Game Logic
class TicTacToe {
    constructor() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.winningCombos = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6] // Diagonals
        ];
        
        this.init();
    }
    
    init() {
        this.createBoard();
        this.addEventListeners();
        this.updateStatus();
    }
    
    createBoard() {
        const board = document.getElementById('tictactoe-board');
        board.innerHTML = '';
        
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            board.appendChild(cell);
        }
    }
    
    addEventListeners() {
        document.getElementById('tictactoe-board').addEventListener('click', (e) => {
            const cell = e.target;
            if (cell.classList.contains('cell') && !this.gameOver) {
                const index = parseInt(cell.dataset.index);
                this.makeMove(index);
            }
        });
        
        document.getElementById('restart-game').addEventListener('click', () => {
            this.resetGame();
        });
    }
    
    makeMove(index) {
        if (this.board[index] === null) {
            this.board[index] = this.currentPlayer;
            this.updateCell(index);
            
            if (this.checkWin()) {
                this.handleWin();
            } else if (this.checkDraw()) {
                this.handleDraw();
            } else {
                this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
                this.updateStatus();
                
                if (this.currentPlayer === 'O') {
                    // AI move
                    setTimeout(() => this.makeAIMove(), 500);
                }
            }
        }
    }
    
    makeAIMove() {
        if (this.gameOver) return;
        
        // Try to win
        const winMove = this.findWinningMove('O');
        if (winMove !== -1) {
            this.makeMove(winMove);
            return;
        }
        
        // Block player's winning move
        const blockMove = this.findWinningMove('X');
        if (blockMove !== -1) {
            this.makeMove(blockMove);
            return;
        }
        
        // Take center if available
        if (this.board[4] === null) {
            this.makeMove(4);
            return;
        }
        
        // Take a corner
        const corners = [0, 2, 6, 8];
        const availableCorners = corners.filter(i => this.board[i] === null);
        if (availableCorners.length > 0) {
            this.makeMove(availableCorners[Math.floor(Math.random() * availableCorners.length)]);
            return;
        }
        
        // Take any available space
        const availableMoves = this.board
            .map((cell, index) => cell === null ? index : null)
            .filter(cell => cell !== null);
            
        if (availableMoves.length > 0) {
            this.makeMove(availableMoves[Math.floor(Math.random() * availableMoves.length)]);
        }
    }
    
    findWinningMove(player) {
        for (let i = 0; i < this.board.length; i++) {
            if (this.board[i] === null) {
                // Try the move
                this.board[i] = player;
                if (this.checkWin()) {
                    // Undo the move
                    this.board[i] = null;
                    return i;
                }
                // Undo the move
                this.board[i] = null;
            }
        }
        return -1;
    }
    
    updateCell(index) {
        const cell = document.querySelector(`[data-index="${index}"]`);
        cell.textContent = this.board[index];
        cell.classList.add(this.board[index].toLowerCase());
    }
    
    checkWin() {
        return this.winningCombos.some(combo => {
            const [a, b, c] = combo;
            return this.board[a] &&
                   this.board[a] === this.board[b] &&
                   this.board[a] === this.board[c];
        });
    }
    
    checkDraw() {
        return this.board.every(cell => cell !== null);
    }
    
    handleWin() {
        this.gameOver = true;
        const winner = this.currentPlayer;
        document.getElementById('game-status').textContent = `${winner} Wins!`;
        
        // Award prizes for winning
        if (winner === 'X') { // Only award prizes when the player wins
            try {
                const currentRewards = window.getRewards ? window.getRewards() : { codes: 0, silverBars: 0, goldBars: 0 };
                const prize = { codes: 100 }; // Award 100 codes for winning
                
                const updatedRewards = {
                    codes: (currentRewards.codes || 0) + prize.codes,
                    silverBars: currentRewards.silverBars,
                    goldBars: currentRewards.goldBars
                };
                
                if (window.saveRewards) {
                    window.saveRewards(updatedRewards);
                    if (window.showToast) {
                        window.showToast('Congratulations! You won 100 codes!', 'success');
                    }
                }
            } catch (error) {
                console.error('Failed to award win prize:', error);
            }
        }
    }
    
    handleDraw() {
        this.gameOver = true;
        document.getElementById('game-status').textContent = "It's a Draw!";
        
        // Award a smaller prize for a draw
        try {
            const currentRewards = window.getRewards ? window.getRewards() : { codes: 0, silverBars: 0, goldBars: 0 };
            const prize = { codes: 25 }; // Award 25 codes for a draw
            
            const updatedRewards = {
                codes: (currentRewards.codes || 0) + prize.codes,
                silverBars: currentRewards.silverBars,
                goldBars: currentRewards.goldBars
            };
            
            if (window.saveRewards) {
                window.saveRewards(updatedRewards);
                if (window.showToast) {
                    window.showToast('Good game! You earned 25 codes for the draw!', 'success');
                }
            }
        } catch (error) {
            console.error('Failed to award draw prize:', error);
        }
    }
    
    updateStatus() {
        if (!this.gameOver) {
            document.getElementById('game-status').textContent = 
                `Current Player: ${this.currentPlayer}`;
        }
    }
    
    resetGame() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameOver = false;
        
        // Clear all cells
        document.querySelectorAll('.cell').forEach(cell => {
            cell.textContent = '';
            cell.classList.remove('x', 'o');
        });
        
        this.updateStatus();
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TicTacToe();
});
