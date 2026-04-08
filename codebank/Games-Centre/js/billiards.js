// Billiards Game Logic
class BilliardsGame {
    constructor() {
        this.canvas = document.getElementById('billiards-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.balls = [];
        this.cueBall = null;
        this.pockets = [];
        this.score = 0;
        this.gameOver = false;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupBalls();
        this.setupPockets();
        this.setupEventListeners();
        this.gameLoop();
    }
    
    setupCanvas() {
        // Set canvas size based on container
        this.canvas.width = 800;
        this.canvas.height = 400;
        
        // Table dimensions
        this.tableWidth = this.canvas.width - 40;
        this.tableHeight = this.canvas.height - 40;
    }
    
    setupBalls() {
        // Create cue ball
        this.cueBall = {
            x: this.canvas.width * 0.25,
            y: this.canvas.height / 2,
            radius: 10,
            color: '#ffffff',
            velocity: { x: 0, y: 0 },
            isMoving: false
        };
        
        // Create other balls in triangle formation
        const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#8f00ff'];
        let ballIndex = 0;
        const startX = this.canvas.width * 0.75;
        const startY = this.canvas.height / 2;
        const ballRadius = 10;
        const spacing = ballRadius * 2.1;
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col <= row; col++) {
                const x = startX + (row * spacing * Math.cos(Math.PI / 3));
                const y = startY + ((col - row/2) * spacing);
                
                this.balls.push({
                    x,
                    y,
                    radius: ballRadius,
                    color: colors[ballIndex % colors.length],
                    velocity: { x: 0, y: 0 },
                    isMoving: false
                });
                ballIndex++;
            }
        }
    }
    
    setupPockets() {
        // Add six pockets to the table
        const pocketPositions = [
            { x: 20, y: 20 },
            { x: this.canvas.width/2, y: 20 },
            { x: this.canvas.width - 20, y: 20 },
            { x: 20, y: this.canvas.height - 20 },
            { x: this.canvas.width/2, y: this.canvas.height - 20 },
            { x: this.canvas.width - 20, y: this.canvas.height - 20 }
        ];
        
        this.pockets = pocketPositions.map(pos => ({
            x: pos.x,
            y: pos.y,
            radius: 15
        }));
    }
    
    setupEventListeners() {
        let isAiming = false;
        let startX, startY;
        
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            
            if (this.isNearCueBall(startX, startY)) {
                isAiming = true;
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (!isAiming) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            this.draw(); // Redraw table
            this.drawAimLine(mouseX, mouseY);
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (!isAiming) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;
            
            const power = Math.min(this.calculatePower(startX, startY, endX, endY), 15);
            const angle = Math.atan2(endY - this.cueBall.y, endX - this.cueBall.x);
            
            this.cueBall.velocity.x = -Math.cos(angle) * power;
            this.cueBall.velocity.y = -Math.sin(angle) * power;
            this.cueBall.isMoving = true;
            
            isAiming = false;
        });
    }
    
    isNearCueBall(x, y) {
        const distance = Math.sqrt(
            Math.pow(x - this.cueBall.x, 2) + 
            Math.pow(y - this.cueBall.y, 2)
        );
        return distance < this.cueBall.radius * 2;
    }
    
    calculatePower(startX, startY, endX, endY) {
        return Math.sqrt(
            Math.pow(endX - startX, 2) + 
            Math.pow(endY - startY, 2)
        ) * 0.1;
    }
    
    drawAimLine(mouseX, mouseY) {
        this.ctx.beginPath();
        this.ctx.moveTo(this.cueBall.x, this.cueBall.y);
        this.ctx.lineTo(mouseX, mouseY);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.stroke();
    }
    
    update() {
        // Update ball positions
        this.updateBallPosition(this.cueBall);
        this.balls.forEach(ball => this.updateBallPosition(ball));
        
        // Check for collisions
        this.checkCollisions();
        
        // Check for pocketed balls
        this.checkPocketedBalls();
        
        // Check if all balls stopped moving
        const allStopped = !this.cueBall.isMoving && 
                          this.balls.every(ball => !ball.isMoving);
        
        // Check win condition
        if (allStopped && this.balls.length === 0) {
            this.handleWin();
        }
    }
    
    updateBallPosition(ball) {
        if (!ball.isMoving) return;
        
        // Apply friction
        ball.velocity.x *= 0.98;
        ball.velocity.y *= 0.98;
        
        // Update position
        ball.x += ball.velocity.x;
        ball.y += ball.velocity.y;
        
        // Check table boundaries
        if (ball.x - ball.radius < 20) {
            ball.x = ball.radius + 20;
            ball.velocity.x *= -0.8;
        }
        if (ball.x + ball.radius > this.canvas.width - 20) {
            ball.x = this.canvas.width - 20 - ball.radius;
            ball.velocity.x *= -0.8;
        }
        if (ball.y - ball.radius < 20) {
            ball.y = ball.radius + 20;
            ball.velocity.y *= -0.8;
        }
        if (ball.y + ball.radius > this.canvas.height - 20) {
            ball.y = this.canvas.height - 20 - ball.radius;
            ball.velocity.y *= -0.8;
        }
        
        // Stop ball if moving too slow
        if (Math.abs(ball.velocity.x) < 0.01 && Math.abs(ball.velocity.y) < 0.01) {
            ball.velocity.x = 0;
            ball.velocity.y = 0;
            ball.isMoving = false;
        }
    }
    
    checkCollisions() {
        // Check cue ball against other balls
        this.balls.forEach(ball => {
            this.checkBallCollision(this.cueBall, ball);
        });
        
        // Check balls against each other
        for (let i = 0; i < this.balls.length; i++) {
            for (let j = i + 1; j < this.balls.length; j++) {
                this.checkBallCollision(this.balls[i], this.balls[j]);
            }
        }
    }
    
    checkBallCollision(ballA, ballB) {
        const dx = ballB.x - ballA.x;
        const dy = ballB.y - ballA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < ballA.radius + ballB.radius) {
            // Collision detected
            const angle = Math.atan2(dy, dx);
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);
            
            // Rotate velocities
            const rotatedVelA = {
                x: ballA.velocity.x * cos + ballA.velocity.y * sin,
                y: ballA.velocity.y * cos - ballA.velocity.x * sin
            };
            const rotatedVelB = {
                x: ballB.velocity.x * cos + ballB.velocity.y * sin,
                y: ballB.velocity.y * cos - ballB.velocity.x * sin
            };
            
            // Swap velocities
            const temp = rotatedVelA.x;
            rotatedVelA.x = rotatedVelB.x;
            rotatedVelB.x = temp;
            
            // Rotate back
            ballA.velocity.x = rotatedVelA.x * cos - rotatedVelA.y * sin;
            ballA.velocity.y = rotatedVelA.y * cos + rotatedVelA.x * sin;
            ballB.velocity.x = rotatedVelB.x * cos - rotatedVelB.y * sin;
            ballB.velocity.y = rotatedVelB.y * cos + rotatedVelB.x * sin;
            
            // Move balls apart
            const overlap = (ballA.radius + ballB.radius - distance) / 2;
            const moveX = overlap * cos;
            const moveY = overlap * sin;
            
            ballA.x -= moveX;
            ballA.y -= moveY;
            ballB.x += moveX;
            ballB.y += moveY;
            
            ballA.isMoving = true;
            ballB.isMoving = true;
        }
    }
    
    checkPocketedBalls() {
        this.pockets.forEach(pocket => {
            // Check cue ball
            if (this.isBallInPocket(this.cueBall, pocket)) {
                this.handleScratch();
            }
            
            // Check other balls
            this.balls = this.balls.filter(ball => {
                if (this.isBallInPocket(ball, pocket)) {
                    this.score += 100;
                    this.updateScore();
                    return false;
                }
                return true;
            });
        });
    }
    
    isBallInPocket(ball, pocket) {
        const distance = Math.sqrt(
            Math.pow(ball.x - pocket.x, 2) + 
            Math.pow(ball.y - pocket.y, 2)
        );
        return distance < pocket.radius;
    }
    
    handleScratch() {
        // Reset cue ball position
        this.cueBall.x = this.canvas.width * 0.25;
        this.cueBall.y = this.canvas.height / 2;
        this.cueBall.velocity.x = 0;
        this.cueBall.velocity.y = 0;
        this.cueBall.isMoving = false;
        
        // Penalty
        this.score = Math.max(0, this.score - 50);
        this.updateScore();
    }
    
    handleWin() {
        this.gameOver = true;
        
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
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw table
        this.ctx.fillStyle = '#076324';
        this.ctx.fillRect(20, 20, this.tableWidth, this.tableHeight);
        
        // Draw pockets
        this.pockets.forEach(pocket => {
            this.ctx.beginPath();
            this.ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#000000';
            this.ctx.fill();
        });
        
        // Draw balls
        this.balls.forEach(ball => {
            this.drawBall(ball);
        });
        
        // Draw cue ball
        this.drawBall(this.cueBall);
    }
    
    drawBall(ball) {
        this.ctx.beginPath();
        this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = ball.color;
        this.ctx.fill();
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }
    
    gameLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const delta = timestamp - this.lastTime;
        
        if (delta > 16) { // Cap at ~60 FPS
            this.update();
            this.draw();
            this.lastTime = timestamp;
        }
        
        if (!this.gameOver) {
            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new BilliardsGame();
});
