// play/pause-button.js
// Enhanced with Screenshot Integration and Escape Animation

let pressTimer;
let ytChannelPopup = null;

// Import screenshot functions (assuming they are global)
let hasReachedLimit, incrementScreenshotCount, activateEscapeButton, instantScreenshot;

// Initialize screenshot functions
function initScreenshotFunctions() {
    // Try to get functions from global scope or window
    hasReachedLimit = window.hasReachedLimit || (() => {
        try {
            const data = JSON.parse(localStorage.getItem("user_screenshots")) || { count: 0, month: new Date().getMonth(), year: new Date().getFullYear() };
            return data.count >= 10;
        } catch (e) {
            return false;
        }
    });
    
    incrementScreenshotCount = window.incrementScreenshotCount || (() => {
        try {
            const data = JSON.parse(localStorage.getItem("user_screenshots")) || { count: 0, month: new Date().getMonth(), year: new Date().getFullYear() };
            data.count++;
            localStorage.setItem("user_screenshots", JSON.stringify(data));
        } catch (e) {
            console.warn("Failed to increment screenshot count");
        }
    });
    
    activateEscapeButton = window.activateEscapeButton || (() => {
        console.warn("activateEscapeButton function not found");
    });
    
    instantScreenshot = window.instantScreenshot || (() => {
        console.warn("instantScreenshot function not found");
    });
}

// Enhanced click handler with screenshot functionality
const playPauseButton = document.getElementById('play-pause-button');
playPauseButton.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we've reached the screenshot limit
    if (hasReachedLimit && hasReachedLimit()) {
        // Activate escape mode!
        activateEscapeButton && activateEscapeButton();
        return;
    }
    
    // Normal YouTube player control
    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
    
    // Take screenshot after a short delay (after video state change)
    setTimeout(async () => {
        if (instantScreenshot && typeof instantScreenshot === 'function') {
            try {
                await instantScreenshot();
                incrementScreenshotCount && incrementScreenshotCount();
                
                // Check if we've reached the limit after this screenshot
                if (hasReachedLimit && hasReachedLimit()) {
                    // Show limit reached message
                    const limitMessage = document.createElement("div");
                    limitMessage.innerHTML = "🎉 Monthly limit reached!<br>Escaping mode activated! 🏃‍♂️";
                    limitMessage.style.cssText = `
                        position: fixed;
                        top: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                        color: white;
                        padding: 15px 25px;
                        border-radius: 25px;
                        font-size: 18px;
                        font-weight: bold;
                        z-index: 10002;
                        animation: message-pop 0.5s ease-out;
                        pointer-events: none;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    `;
                    document.body.appendChild(limitMessage);
                    setTimeout(() => limitMessage.remove(), 3000);
                    
                    // Activate escape mode after a delay
                    setTimeout(() => {
                        activateEscapeButton && activateEscapeButton();
                    }, 1000);
                }
            } catch (error) {
                console.error("Screenshot failed:", error);
            }
        }
    }, 500);
});

// Long press functionality
playPauseButton.addEventListener('mousedown', startTimer);
playPauseButton.addEventListener('mouseup', cancelTimer);
playPauseButton.addEventListener('mouseleave', cancelTimer);

// Touch events for mobile
playPauseButton.addEventListener('touchstart', startTimer);
playPauseButton.addEventListener('touchend', cancelTimer);
playPauseButton.addEventListener('touchcancel', cancelTimer);

function startTimer(e) {
    // If we're at the limit, don't open the popup, just escape
    if (hasReachedLimit && hasReachedLimit()) {
        e.preventDefault();
        activateEscapeButton && activateEscapeButton();
        return;
    }
    
    pressTimer = window.setTimeout(() => {
        // Pause the counter before opening popup
        if (typeof stopCounter === 'function') {
            stopCounter();
        }
        
        // Open YouTube channel in popup window
        if (ytChannelPopup && !ytChannelPopup.closed) {
            ytChannelPopup.focus();
        } else {
            ytChannelPopup = window.open('youtube-channel.html', 'youtubeChannel', 'width=600,height=700,resizable=yes');
            
            // Send channel ID to the popup window
            if (ytChannelPopup && typeof channelId !== 'undefined') {
                // Wait for popup to load before sending message
                    setTimeout(() => {
                        try { ytChannelPopup.postMessage({ channelId: channelId }, window.location.origin); } catch(_){}
                    }, 1000);
            }
        }
    }, 1000); // Reduced to 1 second for better UX
}

function cancelTimer() {
    if (pressTimer) {
        window.clearTimeout(pressTimer);
        pressTimer = null;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScreenshotFunctions);
} else {
    initScreenshotFunctions();
}
