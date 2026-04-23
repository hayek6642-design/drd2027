// Spinner Game Logic
class SpinnerGame {
    constructor() {
        this.spinning = false;
        this.angle = 0;
        this.spinButton = document.getElementById('spin-btn');
        this.spinner = document.getElementById('spinner-wheel');
        this.result = document.getElementById('result');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.spinButton.addEventListener('click', () => this.spin());
    }

    spin() {
        if (this.spinning) return;
        
        this.spinning = true;
        this.spinButton.disabled = true;
        this.result.textContent = '';
        
        // Random number of rotations (3-5 full rotations plus a partial)
        const rotations = 3 + Math.random() * 2;
        const finalAngle = rotations * 360 + Math.random() * 360;
        const duration = 3000; // 3 seconds
        
        this.spinner.style.transition = `transform ${duration}ms cubic-bezier(0.2, 0, 0.2, 1)`;
        this.spinner.style.transform = `rotate(${finalAngle}deg)`;
        
        setTimeout(() => this.handleSpinComplete(finalAngle % 360), duration);
    }

    handleSpinComplete(finalAngle) {
        this.spinning = false;
        this.spinButton.disabled = false;
        
        // Determine prize based on final angle
        const section = Math.floor((finalAngle + 30) / 60) % 6;
        const prizes = ['50 Codes', '10 Silver', '100 Codes', '1 Gold', '150 Codes', '5 Silver'];
        const prize = prizes[section];
        
        this.result.textContent = `You won: ${prize}!`;
        this.awardPrize(prize);
    }

    async awardPrize(prize) {
        const [amount, type] = prize.split(' ');
        let rewardUpdate = {};
        
        switch(type) {
            case 'Codes':
                rewardUpdate.codes = parseInt(amount);
                break;
            case 'Silver':
                rewardUpdate.silverBars = parseInt(amount);
                break;
            case 'Gold':
                rewardUpdate.goldBars = parseInt(amount);
                break;
        }
        
        // Update rewards using the shared utility
        try {
            const currentRewards = window.getRewards ? window.getRewards() : { codes: 0, silverBars: 0, goldBars: 0 };
            const updatedRewards = {
                codes: (currentRewards.codes || 0) + (rewardUpdate.codes || 0),
                silverBars: (currentRewards.silverBars || 0) + (rewardUpdate.silverBars || 0),
                goldBars: (currentRewards.goldBars || 0) + (rewardUpdate.goldBars || 0)
            };
            
            if (window.saveRewards) {
                window.saveRewards(updatedRewards);
                if (window.showToast) {
                    window.showToast(`Prize awarded: ${prize}!`, 'success');
                }
            }
        } catch (error) {
            console.error('Failed to award prize:', error);
            if (window.showToast) {
                window.showToast('Failed to award prize. Please try again.', 'error');
            }
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SpinnerGame();
});
