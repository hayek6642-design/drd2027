// Premium integration script for dashboard
import { PremiumManager } from './premium-manager.js';
import { CameraVerification } from './camera-verification.js';
import FloatingApp from './floating-app.js';
import { ExtraModeManager } from './extra-mode.js';

// Initialize managers
const premium = new PremiumManager({ verifyUrl: '' });

const appContainer = document.getElementById('app');
const floating = new FloatingApp(appContainer);
const extraMode = new ExtraModeManager({
    appContainer,
    floatingApp: floating,
    premium,
    unexpectedGraceMs: 2 * 60 * 1000
});

// YouTube channel URL - replace with your actual channel ID
const ytChannelUrl = 'https://www.youtube.com/channel/UCZ5heNyv3s5dIw9mtjsAGsg';

// Initialize Premium button state
function updatePremiumButton() {
    const premiumBtn = document.getElementById('yt-premium-btn');
    if (!premiumBtn) return;
    
    if (premium.isPremium()) {
        premiumBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        premiumBtn.classList.add('bg-green-600', 'hover:bg-green-700');
        premiumBtn.querySelector('span').textContent = 'Premium Active';
    }
}

// Handle camera verification flow
async function handleCameraVerification() { }

// Set up Premium button click handlers
document.addEventListener('DOMContentLoaded', () => {
    const premiumBtn = document.getElementById('yt-premium-btn');
    if (!premiumBtn) return;
    
    // Update initial button state
    updatePremiumButton();
    
    let lastClick = 0;
    const DOUBLE_CLICK_TIME = 300;
    
    premiumBtn.addEventListener('click', (e) => {
        const now = Date.now();
        
        if (now - lastClick < DOUBLE_CLICK_TIME) {
            e.preventDefault();
        } else {
            
        }
        
        lastClick = now;
    });
});
