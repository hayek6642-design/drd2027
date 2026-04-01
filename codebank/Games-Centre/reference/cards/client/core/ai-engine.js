export class AIEngine {
    constructor() {
        this.difficulty = 'medium';
    }

    getNextMove(gameState) {
        // Simulate thinking delay
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    action: 'DRAW',
                    value: Math.floor(Math.random() * 10) + 1
                });
            }, 1000 + Math.random() * 1000);
        });
    }
}
