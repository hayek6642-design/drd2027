// Screenshot Functionality
// Extracted from inline script in yt-new.html

// Screenshot functionality
let screenshotCount = 0;
const maxScreenshots = 5;
const screenshotInterval = 24 * 60 * 60 * 1000; // 24 hours

// Initialize screenshot functionality
window.initScreenshot = function() {
    // Check if user has exceeded daily limit
    const lastReset = localStorage.getItem('screenshotLastReset');
    const now = Date.now();
    
    if (!lastReset || now - parseInt(lastReset) > screenshotInterval) {
        localStorage.setItem('screenshotCount', '0');
        localStorage.setItem('screenshotLastReset', now.toString());
    }
    
    // Add screenshot button to the page
    const screenshotBtn = document.createElement('button');
    screenshotBtn.id = 'screenshot-btn';
    screenshotBtn.className = 'btn btn-primary';
    screenshotBtn.textContent = 'Screenshot';
    screenshotBtn.style.position = 'fixed';
    screenshotBtn.style.bottom = '20px';
    screenshotBtn.style.right = '20px';
    screenshotBtn.style.zIndex = '10000';
    screenshotBtn.style.display = 'none'; // Hidden by default
    
    screenshotBtn.addEventListener('click', captureScreenshot);
    document.body.appendChild(screenshotBtn);
    
    // Show button after 5 seconds
    setTimeout(() => {
        screenshotBtn.style.display = 'block';
    }, 5000);
}

// Capture screenshot function
async function captureScreenshot() {
    const count = parseInt(localStorage.getItem('screenshotCount') || '0');
    
    if (count >= maxScreenshots) {
        showToast('Daily screenshot limit reached. Try again tomorrow.');
        return;
    }
    
    try {
        // Flash effect
        const flash = document.getElementById('screenshot-flash');
        flash.style.opacity = '1';
        setTimeout(() => flash.style.opacity = '0', 100);
        
        // Capture screenshot
        const canvas = await html2canvas(document.body, {
            allowTaint: true,
            useCORS: true,
            backgroundColor: null
        });
        const dataUrl = canvas.toDataURL('image/png');
        
        // Convert to blob
        canvas.toBlob(async (blob) => {
            if (!blob) {
                showToast('Failed to capture screenshot');
                return;
            }
            
            // Save to localStorage
            const url = URL.createObjectURL(blob);
            const screenshots = JSON.parse(localStorage.getItem('screenshots') || '[]');
            screenshots.push({
                url: url,
                timestamp: Date.now(),
                filename: `screenshot_${Date.now()}.png`
            });
            
            // Keep only last 10 screenshots
            if (screenshots.length > 10) {
                screenshots.shift();
            }
            
            localStorage.setItem('screenshots', JSON.stringify(screenshots));
            localStorage.setItem('screenshotCount', (count + 1).toString());
            
            // Also save to CodeBank Shots (IndexedDB)
            try {
                if (!window.shotsDB) {
                    await new Promise((resolve) => {
                        const s = document.createElement('script');
                        s.src = '/services/yt-clear/codebank/shots/shots-db.js';
                        s.onload = resolve;
                        s.onerror = resolve;
                        document.head.appendChild(s);
                    });
                }
                if (window.shotsDB && typeof window.shotsDB.saveScreenshot === 'function') {
                    await window.shotsDB.saveScreenshot(dataUrl);
                    window.dispatchEvent(new Event('shots-updated'));
                }
            } catch (e) {
                console.warn('ShotsDB save failed:', e);
            }

            // Show preview
            const preview = document.getElementById('screenshot-preview');
            const previewImg = document.getElementById('screenshot-preview-img');
            previewImg.src = url;
            preview.style.opacity = '1';
            preview.style.transform = 'translateY(0)';
            
            // Hide preview after 3 seconds
            setTimeout(() => {
                preview.style.opacity = '0';
                preview.style.transform = 'translateY(20px)';
            }, 3000);
            
            showToast('Screenshot captured!');
        }, 'image/png');
        
    } catch (error) {
        console.error('Screenshot error:', error);
        showToast('Failed to capture screenshot');
    }
}

// Show toast message
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'screenshot-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScreenshot);
} else {
    initScreenshot();
}

function showCounterTemporarily(duration=5000){const el=document.getElementById('counter');if(!el)return;el.classList.remove('hidden');if(window.counterRevealTimeout){clearTimeout(window.counterRevealTimeout)}window.counterRevealTimeout=setTimeout(()=>{el.classList.add('hidden')},duration)}
function initializeCounterHoverReveal(){const codeDisplayElement=document.getElementById('code-display');if(!codeDisplayElement)return;let hoverStartX=null;let revealTriggered=false;const reset=()=>{hoverStartX=null;revealTriggered=false};codeDisplayElement.addEventListener('mouseenter',reset);codeDisplayElement.addEventListener('mousemove',e=>{if(revealTriggered)return;if(hoverStartX===null){hoverStartX=e.offsetX;return}const w=codeDisplayElement.clientWidth||1;const startedOnLeft=hoverStartX<=w*0.25;const reachedRightEdge=e.offsetX>=w*0.75;if(startedOnLeft&&reachedRightEdge){revealTriggered=true;showCounterTemporarily(5000)}});codeDisplayElement.addEventListener('mouseleave',reset)}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initializeCounterHoverReveal)}else{initializeCounterHoverReveal()}
window.instantScreenshot = captureScreenshot;
window.captureScreenshot = captureScreenshot;
