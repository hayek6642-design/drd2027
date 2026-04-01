// Screenshot Limit Indicator
// Extracted from inline script in yt-new.html

// Screenshot limit indicator
window.initScreenshotLimitIndicator = function() {
    const maxScreenshots = 5;
    const screenshotInterval = 24 * 60 * 60 * 1000; // 24 hours
    
    // Create limit indicator element
    const limitIndicator = document.createElement('div');
    limitIndicator.className = 'limit-indicator';
    limitIndicator.style.display = 'none'; // Hidden by default
    
    document.body.appendChild(limitIndicator);
    
    // Update limit indicator
    function updateLimitIndicator() {
        let count = parseInt(localStorage.getItem('screenshotCount') || '0');
        const lastReset = parseInt(localStorage.getItem('screenshotLastReset') || '0');
        const now = Date.now();
        
        // Check if we need to reset the counter
        if (now - lastReset > screenshotInterval) {
            localStorage.setItem('screenshotCount', '0');
            localStorage.setItem('screenshotLastReset', now.toString());
            count = 0;
        }
        
        if (count >= maxScreenshots) {
            limitIndicator.style.display = 'block';
            limitIndicator.textContent = `Daily limit reached: ${count}/${maxScreenshots}`;
        } else {
            limitIndicator.style.display = 'none';
        }
    }
    
    // Update indicator every 5 seconds
    setInterval(updateLimitIndicator, 5000);
    
    // Initial update
    updateLimitIndicator();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScreenshotLimitIndicator);
} else {
    initScreenshotLimitIndicator();
}
