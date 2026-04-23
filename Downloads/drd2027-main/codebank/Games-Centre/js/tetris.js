// Tetris Game Logic
class TetrisGame {
    constructor() {
        this.grid = Array(20).fill().map(() => Array(10).fill(0));
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.gameOver = false;
        this.paused = false;
        this.animationFrame = null;
        
        // Tetromino shapes
        this.shapes = {
            I: [[1, 1, 1, 1]],
            O: [[1, 1], [1, 1]],
            T: [[0, 1, 0], [1, 1, 1]],
            S: [[0, 1, 1], [1, 1, 0]],
            Z: [[1, 1, 0], [0, 1, 1]],
            J: [[1, 0, 0], [1, 1, 1]],
            L: [[0, 0, 1], [1, 1, 1]]
        };
        
        // Colors for each piece
        this.colors = {
            I: '#00f0f0',
            O: '#f0f000',
            T: '#a000f0',
            S: '#00f000',
            Z: '#f00000',
            J: '#0000f0',
            L: '#f0a000'
        };
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupControls();
        this.newGame();
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('tetris-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.blockSize = 30;
        
        // Set canvas size based on grid
        this.canvas.width = this.grid[0].length * this.blockSize;
        this.canvas.height = this.grid.length * this.blockSize;
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (this.gameOver || this.paused) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    this.movePiece(-1, 0);
                    break;
                case 'ArrowRight':
                    this.movePiece(1, 0);
                    break;
                case 'ArrowDown':
                    this.movePiece(0, 1);
                    break;
                case 'ArrowUp':
                    this.rotatePiece();
                    break;
                case ' ':
                    this.hardDrop();
                    break;
                case 'p':
                    this.togglePause();
                    break;
            }
        });
    }
    
    newGame() {
        this.grid = Array(20).fill().map(() => Array(10).fill(0));
        this.score = 0;
        this.gameOver = false;
        this.paused = false;
        
        this.currentPiece = this.generatePiece();
        this.nextPiece = this.generatePiece();
        
        this.updateScore();
        this.gameLoop();
    }
    
    generatePiece() {
        const pieces = Object.keys(this.shapes);
        const type = pieces[Math.floor(Math.random() * pieces.length)];
        const shape = this.shapes[type];
        
        return {
            type,
            shape: shape.map(row => [...row]),
            x: Math.floor((this.grid[0].length - shape[0].length) / 2),
            y: 0
        };
    }
    
    movePiece(dx, dy) {
        const newX = this.currentPiece.x + dx;
        const newY = this.currentPiece.y + dy;
        
        if (this.isValidMove(this.currentPiece.shape, newX, newY)) {
            this.currentPiece.x = newX;
            this.currentPiece.y = newY;
            return true;
        }
        
        if (dy > 0) {
            this.lockPiece();
            this.checkLines();
            this.spawnNewPiece();
        }
        
        return false;
    }
    
    rotatePiece() {
        const rotated = this.currentPiece.shape[0].map((_, i) =>
            this.currentPiece.shape.map(row => row[i]).reverse()
        );
        
        if (this.isValidMove(rotated, this.currentPiece.x, this.currentPiece.y)) {
            this.currentPiece.shape = rotated;
        }
    }
    
    isValidMove(shape, x, y) {
        return shape.every((row, dy) =>
            row.every((value, dx) =>
                value === 0 ||
                (x + dx >= 0 &&
                 x + dx < this.grid[0].length &&
                 y + dy >= 0 &&
                 y + dy < this.grid.length &&
                 this.grid[y + dy][x + dx] === 0)
            )
        );
    }
    
    lockPiece() {
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    if (this.currentPiece.y + y < 0) {
                        this.gameOver = true;
                    } else {
                        this.grid[this.currentPiece.y + y][this.currentPiece.x + x] = this.currentPiece.type;
                    }
                }
            });
        });
    }
    
    checkLines() {
        let linesCleared = 0;
        
        for (let y = this.grid.length - 1; y >= 0; y--) {
            if (this.grid[y].every(cell => cell !== 0)) {
                this.grid.splice(y, 1);
                this.grid.unshift(Array(10).fill(0));
                linesCleared++;
                y++; // Check the same row again
            }
        }
        
        if (linesCleared > 0) {
            this.updateScore(linesCleared);
        }
    }
    
    updateScore(linesCleared = 0) {
        const points = [0, 100, 300, 500, 800]; // Points for 0, 1, 2, 3, 4 lines
        this.score += points[linesCleared];
        
        document.getElementById('score').textContent = this.score;
    }
    
    spawnNewPiece() {
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.generatePiece();
        
        if (!this.isValidMove(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y)) {
            this.gameOver = true;
            this.handleGameOver();
        }
    }
    
    handleGameOver() {
        // Award prizes based on score
        try {
            const currentRewards = window.getRewards ? window.getRewards() : { codes: 0, silverBars: 0, goldBars: 0 };
            
            // Calculate prize based on score
            const prize = {
                codes: Math.floor(this.score / 100) * 10 // 10 codes per 100 points
            };
            
            const updatedRewards = {
                codes: (currentRewards.codes || 0) + prize.codes,
                silverBars: currentRewards.silverBars,
                goldBars: currentRewards.goldBars
            };
            
            if (window.saveRewards) {
                window.saveRewards(updatedRewards);
                if (window.showToast) {
                    window.showToast(`Game Over! You won ${prize.codes} codes!`, 'success');
                }
            }
        } catch (error) {
            console.error('Failed to award game over prize:', error);
        }
        
        cancelAnimationFrame(this.animationFrame);
        this.drawGameOver();
    }
    
    drawGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 40);
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Press SPACE to restart', this.canvas.width / 2, this.canvas.height / 2 + 80);
    }
    
    togglePause() {
        this.paused = !this.paused;
        if (!this.paused) {
            this.gameLoop();
        }
    }
    
    drawBlock(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * this.blockSize, y * this.blockSize, this.blockSize - 1, this.blockSize - 1);
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.drawBlock(x, y, this.colors[value]);
                }
            });
        });
        
        // Draw current piece
        if (this.currentPiece) {
            this.currentPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        this.drawBlock(
                            this.currentPiece.x + x,
                            this.currentPiece.y + y,
                            this.colors[this.currentPiece.type]
                        );
                    }
                });
            });
        }
    }
    
    gameLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        
        const delta = timestamp - this.lastTime;
        
        if (delta > 1000) { // Move piece down every second
            this.movePiece(0, 1);
            this.lastTime = timestamp;
        }
        
        this.draw();
        
        if (!this.gameOver && !this.paused) {
            this.animationFrame = requestAnimationFrame((t) => this.gameLoop(t));
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new TetrisGame();
    
    // Handle restart
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' && game.gameOver) {
            game.newGame();
        }
    });
});
