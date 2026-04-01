/**
 * CoRsA Dashboard Loading Overlay
 * Sophisticated loading system with branding and animations
 */

class CoRsALoadingOverlay {
    constructor() {
        this.isVisible = false;
        this.currentProgress = 0;
        this.loadingSteps = [
            { name: 'Initializing CoRsA Platform', weight: 15 },
            { name: 'Connecting to Market Data', weight: 20 },
            { name: 'Loading Portfolio Data', weight: 15 },
            { name: 'Syncing Balance Information', weight: 10 },
            { name: 'Preparing Trading Interface', weight: 20 },
            { name: 'Loading CoRsA Instruments', weight: 15 },
            { name: 'Finalizing Dashboard', weight: 5 }
        ];
        this.totalWeight = this.loadingSteps.reduce((sum, step) => sum + step.weight, 0);
        this.currentStepIndex = 0;
        this.animationFrame = null;
        
        this.init();
    }

    init() {
        this.createOverlay();
        this.setupStyles();
        this.setupAnimations();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'corsa-loading-overlay';
        this.overlay.className = 'corsa-loading-overlay';
        
        this.overlay.innerHTML = `
            <div class="corsa-loading-backdrop"></div>
            <div class="corsa-loading-container">
                <div class="corsa-loading-content">
                    <div class="corsa-logo-container">
                        <div class="corsa-logo">
                            <div class="corsa-logo-inner">
                                <div class="corsa-logo-text">CoRsA</div>
                                <div class="corsa-logo-subtitle">Advanced Trading Platform</div>
                            </div>
                            <div class="corsa-logo-pulse"></div>
                        </div>
                    </div>
                    
                    <div class="corsa-loading-details">
                        <div class="corsa-loading-step" id="loading-step-text">
                            Initializing CoRsA Platform...
                        </div>
                        
                        <div class="corsa-progress-container">
                            <div class="corsa-progress-bar">
                                <div class="corsa-progress-fill" id="progress-fill"></div>
                                <div class="corsa-progress-glow"></div>
                            </div>
                            <div class="corsa-progress-text">
                                <span class="corsa-progress-percentage" id="progress-percentage">0%</span>
                                <span class="corsa-progress-status">Preparing...</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="corsa-loading-decoration">
                        <div class="corsa-particles">
                            <div class="corsa-particle"></div>
                            <div class="corsa-particle"></div>
                            <div class="corsa-particle"></div>
                            <div class="corsa-particle"></div>
                            <div class="corsa-particle"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.overlay);
        this.progressFill = document.getElementById('progress-fill');
        this.progressPercentage = document.getElementById('progress-percentage');
        this.loadingStepText = document.getElementById('loading-step-text');
    }

    setupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .corsa-loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 10000;
                display: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .corsa-loading-overlay.visible {
                display: flex;
                opacity: 1;
            }

            .corsa-loading-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, 
                    rgba(13, 27, 42, 0.95) 0%, 
                    rgba(25, 42, 86, 0.95) 50%, 
                    rgba(13, 27, 42, 0.95) 100%);
                backdrop-filter: blur(8px) saturate(1.2);
                -webkit-backdrop-filter: blur(8px) saturate(1.2);
            }

            .corsa-loading-container {
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .corsa-loading-content {
                text-align: center;
                max-width: 500px;
                padding: 40px;
                border-radius: 20px;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 
                    0 8px 32px rgba(0, 0, 0, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                transform: translateY(0);
                animation: float 6s ease-in-out infinite;
            }

            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
            }

            .corsa-logo-container {
                margin-bottom: 40px;
            }

            .corsa-logo {
                position: relative;
                display: inline-block;
            }

            .corsa-logo-inner {
                position: relative;
                z-index: 2;
            }

            .corsa-logo-text {
                font-size: 3.5rem;
                font-weight: 700;
                background: linear-gradient(135deg, 
                    #00d4ff 0%, 
                    #0099cc 25%, 
                    #0066cc 50%, 
                    #0033cc 75%, 
                    #0000cc 100%);
                background-size: 200% 200%;
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: gradientShift 3s ease-in-out infinite;
                text-shadow: 0 0 30px rgba(0, 212, 255, 0.5);
                margin-bottom: 10px;
                letter-spacing: 2px;
            }

            @keyframes gradientShift {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
            }

            .corsa-logo-subtitle {
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.7);
                font-weight: 300;
                letter-spacing: 1px;
                text-transform: uppercase;
            }

            .corsa-logo-pulse {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 200px;
                height: 200px;
                transform: translate(-50%, -50%);
                border: 2px solid rgba(0, 212, 255, 0.3);
                border-radius: 50%;
                animation: pulse 2s ease-in-out infinite;
                z-index: 1;
            }

            @keyframes pulse {
                0% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(1.2);
                    opacity: 0;
                }
            }

            .corsa-loading-details {
                margin-bottom: 30px;
            }

            .corsa-loading-step {
                font-size: 1.1rem;
                color: rgba(255, 255, 255, 0.9);
                margin-bottom: 25px;
                font-weight: 400;
                letter-spacing: 0.5px;
                transition: opacity 0.3s ease;
            }

            .corsa-progress-container {
                max-width: 350px;
                margin: 0 auto;
            }

            .corsa-progress-bar {
                position: relative;
                width: 100%;
                height: 8px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 15px;
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
            }

            .corsa-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, 
                    #00d4ff 0%, 
                    #00aaff 25%, 
                    #0080ff 50%, 
                    #0055ff 75%, 
                    #0033cc 100%);
                background-size: 200% 100%;
                border-radius: 10px;
                width: 0%;
                transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }

            .corsa-progress-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(255, 255, 255, 0.4) 50%, 
                    transparent 100%);
                animation: shimmer 1.5s ease-in-out infinite;
            }

            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }

            .corsa-progress-glow {
                position: absolute;
                top: -2px;
                left: 0;
                right: 0;
                bottom: -2px;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(0, 212, 255, 0.6) 50%, 
                    transparent 100%);
                border-radius: 12px;
                opacity: 0;
                animation: progressGlow 2s ease-in-out infinite;
                z-index: -1;
            }

            @keyframes progressGlow {
                0%, 100% { opacity: 0; }
                50% { opacity: 1; }
            }

            .corsa-progress-text {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .corsa-progress-percentage {
                font-size: 1.4rem;
                font-weight: 600;
                color: #00d4ff;
                text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
            }

            .corsa-progress-status {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.6);
                font-weight: 300;
            }

            .corsa-loading-decoration {
                position: relative;
                height: 50px;
                overflow: hidden;
            }

            .corsa-particles {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }

            .corsa-particle {
                position: absolute;
                width: 4px;
                height: 4px;
                background: #00d4ff;
                border-radius: 50%;
                opacity: 0;
                animation: particleFloat 4s ease-in-out infinite;
            }

            .corsa-particle:nth-child(1) {
                left: 10%;
                animation-delay: 0s;
                animation-duration: 3s;
            }

            .corsa-particle:nth-child(2) {
                left: 30%;
                animation-delay: 0.5s;
                animation-duration: 3.5s;
            }

            .corsa-particle:nth-child(3) {
                left: 50%;
                animation-delay: 1s;
                animation-duration: 4s;
            }

            .corsa-particle:nth-child(4) {
                left: 70%;
                animation-delay: 1.5s;
                animation-duration: 3.2s;
            }

            .corsa-particle:nth-child(5) {
                left: 90%;
                animation-delay: 2s;
                animation-duration: 3.8s;
            }

            @keyframes particleFloat {
                0%, 100% {
                    transform: translateY(20px) scale(0);
                    opacity: 0;
                }
                20%, 80% {
                    transform: translateY(0) scale(1);
                    opacity: 0.8;
                }
                50% {
                    transform: translateY(-10px) scale(1.2);
                    opacity: 1;
                }
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .corsa-loading-content {
                    margin: 20px;
                    padding: 30px 20px;
                }

                .corsa-logo-text {
                    font-size: 2.5rem;
                }

                .corsa-logo-subtitle {
                    font-size: 0.9rem;
                }

                .corsa-loading-step {
                    font-size: 1rem;
                    margin-bottom: 20px;
                }

                .corsa-progress-percentage {
                    font-size: 1.2rem;
                }

                .corsa-progress-status {
                    font-size: 0.8rem;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    setupAnimations() {
        // Smooth progress animations are handled by CSS transitions
    }

  async show() {
    this.isVisible = true;
    this.overlay.classList.add('visible');
    
    // Start the loading animation
    this.startLoadingAnimation();
    try { window.dispatchEvent(new CustomEvent('corsa:loading:shown')); } catch(_){}
  }

  async hide() {
    this.isVisible = false;
    this.overlay.classList.remove('visible');
    
    // Wait for fade out animation
    setTimeout(() => {
      if (this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
    }, 300);
    try { window.dispatchEvent(new CustomEvent('corsa:loading:hidden')); } catch(_){}
  }

    startLoadingAnimation() {
        this.currentStepIndex = 0;
        this.currentProgress = 0;
        this.animateNextStep();
    }

    animateNextStep() {
        if (this.currentStepIndex >= this.loadingSteps.length) {
            this.completeLoading();
            return;
        }

        const step = this.loadingSteps[this.currentStepIndex];
        const targetProgress = this.calculateTargetProgress(this.currentStepIndex);
        
        // Update step text
        this.loadingStepText.textContent = step.name;
        
        // Animate to target progress
        this.animateProgress(targetProgress, () => {
            this.currentStepIndex++;
            setTimeout(() => this.animateNextStep(), 300);
        });
    }

    calculateTargetProgress(stepIndex) {
        let progress = 0;
        for (let i = 0; i < stepIndex; i++) {
            progress += this.loadingSteps[i].weight;
        }
        return (progress / this.totalWeight) * 100;
    }

    animateProgress(targetProgress, callback) {
        const duration = 800;
        const startTime = performance.now();
        const startProgress = this.currentProgress;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            
            this.currentProgress = startProgress + (targetProgress - startProgress) * easeOutCubic;
            this.updateProgressDisplay();
            
            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                this.currentProgress = targetProgress;
                this.updateProgressDisplay();
                if (callback) callback();
            }
        };
        
        this.animationFrame = requestAnimationFrame(animate);
    }

    updateProgressDisplay() {
        if (this.progressFill) {
            this.progressFill.style.width = `${this.currentProgress}%`;
        }
        
        if (this.progressPercentage) {
            this.progressPercentage.textContent = `${Math.round(this.currentProgress)}%`;
        }
    }

  completeLoading() {
    // Final animation to 100%
    this.animateProgress(100, () => {
      setTimeout(() => {
        try { window.dispatchEvent(new CustomEvent('corsa:loading:completed')); } catch(_){}
        this.hide();
      }, 500);
    });
  }

    // Public method to manually update progress
    updateProgress(progress, stepText = null) {
        this.currentProgress = Math.min(Math.max(progress, 0), 100);
        this.updateProgressDisplay();
        
        if (stepText && this.loadingStepText) {
            this.loadingStepText.textContent = stepText;
        }
    }

    // Cleanup method
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
    }
}

// Export for use in other modules
window.CoRsALoadingOverlay = CoRsALoadingOverlay;
window.Corsa = window.Corsa || {};
if (!window.Corsa.CoRsALoadingOverlay) {
  window.Corsa.CoRsALoadingOverlay = CoRsALoadingOverlay;
}
