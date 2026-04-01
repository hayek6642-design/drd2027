// ================================
// Instant Mobile-Style Screenshot System (Enhanced with Complete Escape System)
// ================================

const SCREENSHOT_KEY = "user_screenshots";
const MONTHLY_DATA_KEY = "monthly_screenshot_data";

// --------------------
// 1. Enhanced LocalStorage for Monthly Limit (Dual System for Compatibility)
// --------------------
function getScreenshotData() {
    try {
        const data = JSON.parse(localStorage.getItem(SCREENSHOT_KEY)) || { count: 0, month: new Date().getMonth(), year: new Date().getFullYear() };
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        if (data.month !== currentMonth || data.year !== currentYear) {
            data.count = 0;
            data.month = currentMonth;
            data.year = currentYear;
            localStorage.setItem(SCREENSHOT_KEY, JSON.stringify(data));
        }

        return data;
    } catch (e) {
        console.warn("LocalStorage unavailable, using in-memory fallback.");
        return { count: 0, month: new Date().getMonth(), year: new Date().getFullYear() };
    }
}

// Enhanced monthly data system for escape button
function getMonthlyScreenshotData() {
    try {
        const data = JSON.parse(localStorage.getItem(MONTHLY_DATA_KEY)) || { count: 0, month: new Date().getMonth(), year: new Date().getFullYear() };
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        if (data.month !== currentMonth || data.year !== currentYear) {
            data.count = 0;
            data.month = currentMonth;
            data.year = currentYear;
            localStorage.setItem(MONTHLY_DATA_KEY, JSON.stringify(data));
        }

        return data;
    } catch (e) {
        console.warn("LocalStorage unavailable, using in-memory fallback.");
        return { count: 0, month: new Date().getMonth(), year: new Date().getFullYear() };
    }
}

function incrementScreenshotCount() {
    // Update legacy system
    const legacyData = getScreenshotData();
    legacyData.count++;
    try {
        localStorage.setItem(SCREENSHOT_KEY, JSON.stringify(legacyData));
    } catch (e) {
        console.warn("Failed to save screenshot count.");
    }
    
    // Update new monthly system
    const monthlyData = getMonthlyScreenshotData();
    monthlyData.count++;
    try {
        localStorage.setItem(MONTHLY_DATA_KEY, JSON.stringify(monthlyData));
    } catch (e) {
        console.warn("Failed to save monthly screenshot count.");
    }
}

function hasReachedLimit() {
    const monthlyData = getMonthlyScreenshotData();
    return monthlyData.count >= 10;
}


// --------------------
// 3. YouTube Thumbnail Preload (Enhanced with Fallback and Async Loading)
// --------------------
const ytIframe = document.getElementById("yt-iframe");
const ytThumbLayer = document.createElement("div");
ytThumbLayer.style.position = "fixed";
ytThumbLayer.style.top = "0";
ytThumbLayer.style.left = "0";
ytThumbLayer.style.width = "100%";
ytThumbLayer.style.height = "100%";
ytThumbLayer.style.zIndex = "-100000";
ytThumbLayer.style.display = "none";
ytThumbLayer.style.pointerEvents = "none";
document.body.appendChild(ytThumbLayer);

const ytThumbImg = document.createElement("img");
ytThumbImg.style.width = "100%";
ytThumbImg.style.height = "100%";
ytThumbImg.style.objectFit = "cover";
ytThumbLayer.appendChild(ytThumbImg);

function getYouTubeID(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([^?&]+)/);
    return match ? match[1] : null;
}

async function preloadThumbnail() {
    const videoID = getYouTubeID(ytIframe?.src);
    if (!videoID) return false;
    ytThumbImg.src = `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`;
    return new Promise((resolve) => {
        ytThumbImg.onload = () => resolve(true);
        ytThumbImg.onerror = () => {
            ytThumbImg.src = `https://img.youtube.com/vi/${videoID}/hqdefault.jpg`; // Fallback
            ytThumbImg.onload = () => resolve(true);
            ytThumbImg.onerror = () => resolve(false);
        };
    });
}

// --------------------
// 4. Enhanced Full-Page Screenshot Function (With Complete Background Capture)
// --------------------
let isCapturing = false; // Debounce for rapid clicks

async function instantScreenshot() {
    if (isCapturing) return;
    isCapturing = true;

    try {
        console.log("🎬 Starting enhanced screenshot capture...");
        
        // Capture the entire page including video container
        const fullPageCanvas = await captureFullPageScreenshot();
        
        if (fullPageCanvas) {
            const imageData = fullPageCanvas.toDataURL("image/png");
            showScreenshotAnimation(imageData);
            saveScreenshotToStorage(imageData);
            console.log("✅ Full-page screenshot captured successfully");
        } else {
            throw new Error("Failed to capture full page");
        }

    } catch (e) {
        console.error("Screenshot failed:", e);
        
        // Fallback: Try simple page screenshot
        try {
            console.log("🔄 Attempting fallback screenshot...");
            const fallbackCanvas = await captureFallbackScreenshot();
            if (fallbackCanvas) {
                const imageData = fallbackCanvas.toDataURL("image/png");
                showScreenshotAnimation(imageData);
                saveScreenshotToStorage(imageData);
                console.log("✅ Fallback screenshot captured");
            }
        } catch (fallbackError) {
            console.error("Fallback screenshot also failed:", fallbackError);
            alert("فشل في التقاط اللقطة. تأكد من تحميل الصفحة بالكامل وحاول مرة أخرى.");
        }
    } finally {
        isCapturing = false;
    }
}

// Enhanced full-page screenshot with YouTube background
async function captureFullPageScreenshot() {
    try {
        // Ensure YouTube iframe is loaded
        const ytIframe = document.getElementById("yt-iframe");
        if (!ytIframe) {
            console.warn("YouTube iframe not found");
            return null;
        }

        // Wait for iframe to be fully loaded
        await waitForIframeLoad(ytIframe);
        
        // Get the current video thumbnail as background
        const videoThumbnail = await getCurrentVideoThumbnail();
        
        // Create a full-page canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // Set canvas size to full page dimensions
        const pageWidth = window.innerWidth;
        const pageHeight = window.innerHeight;
        canvas.width = pageWidth;
        canvas.height = pageHeight;
        
        // Create background with video thumbnail
        if (videoThumbnail) {
            // Create background pattern with video thumbnail
            ctx.fillStyle = "#000000"; // Fallback black background
            ctx.fillRect(0, 0, pageWidth, pageHeight);
            
            // Try to draw the thumbnail as background
            try {
                ctx.drawImage(videoThumbnail, 0, 0, pageWidth, pageHeight);
            } catch (e) {
                console.warn("Could not draw thumbnail to canvas:", e);
            }
        } else {
            // Fallback to gradient background
            const gradient = ctx.createLinearGradient(0, 0, pageWidth, pageHeight);
            gradient.addColorStop(0, "#1a1a1a");
            gradient.addColorStop(1, "#2d2d2d");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, pageWidth, pageHeight);
        }
        
        // Capture all visible elements using html2canvas
        const screenshotCanvas = await html2canvas(document.body, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            scale: window.devicePixelRatio || 1,
            width: pageWidth,
            height: pageHeight,
            scrollX: 0,
            scrollY: 0,
            windowWidth: pageWidth,
            windowHeight: pageHeight
        });
        
        // Draw the screenshot over our background
        ctx.drawImage(screenshotCanvas, 0, 0);
        
        return canvas;
        
    } catch (error) {
        console.error("Full-page screenshot failed:", error);
        return null;
    }
}

// Fallback screenshot method
async function captureFallbackScreenshot() {
    try {
        const canvas = await html2canvas(document.body, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#000000",
            scale: window.devicePixelRatio || 1
        });
        
        return canvas;
    } catch (error) {
        console.error("Fallback screenshot failed:", error);
        return null;
    }
}

// Wait for iframe to be fully loaded
function waitForIframeLoad(iframe) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("Iframe load timeout"));
        }, 5000);
        
        if (iframe.contentDocument?.readyState === 'complete') {
            clearTimeout(timeout);
            resolve();
        } else {
            iframe.addEventListener('load', () => {
                clearTimeout(timeout);
                resolve();
            }, { once: true });
            
            iframe.addEventListener('error', () => {
                clearTimeout(timeout);
                reject(new Error("Iframe load error"));
            }, { once: true });
        }
    });
}

// Get current video thumbnail from YouTube API
async function getCurrentVideoThumbnail() {
    try {
        // Get current video ID from iframe src or player
        const videoId = extractVideoIdFromIframe() || getCurrentVideoIdFromPlayer();
        
        if (videoId) {
            // Try to get thumbnail from YouTube API
            const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            
            // Test if thumbnail loads successfully
            const thumbnailImg = new Image();
            thumbnailImg.crossOrigin = 'anonymous';
            
            return new Promise((resolve, reject) => {
                thumbnailImg.onload = () => resolve(thumbnailImg);
                thumbnailImg.onerror = () => {
                    // Fallback to hqdefault
                    const fallbackImg = new Image();
                    fallbackImg.crossOrigin = 'anonymous';
                    fallbackImg.onload = () => resolve(fallbackImg);
                    fallbackImg.onerror = () => reject(new Error("Thumbnail loading failed"));
                    fallbackImg.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                };
                thumbnailImg.src = thumbnailUrl;
            });
        }
        
        return null;
    } catch (error) {
        console.warn("Could not get video thumbnail:", error);
        return null;
    }
}

// Extract video ID from iframe src
function extractVideoIdFromIframe() {
    const iframe = document.getElementById("yt-iframe");
    if (iframe && iframe.src) {
        const match = iframe.src.match(/embed\/([^?]+)/);
        return match ? match[1] : null;
    }
    return null;
}

// Get current video ID from YouTube player
function getCurrentVideoIdFromPlayer() {
    try {
        if (typeof player !== 'undefined' && player.getVideoData) {
            const videoData = player.getVideoData();
            return videoData?.video_id || null;
        }
    } catch (error) {
        console.warn("Could not get video ID from player:", error);
    }
    return null;
}

// حفظ لقطة في localStorage
function saveScreenshotToStorage(dataUrl) {
    let list = JSON.parse(localStorage.getItem("captured_screenshots") || "[]");
    list.unshift({
        id: Date.now(),
        image: dataUrl
    });
    // حد أقصى 20 لقطة لتجنب الإفراط في التخزين
    if (list.length > 20) list = list.slice(0, 20);
    localStorage.setItem("captured_screenshots", JSON.stringify(list));
}

// استرجاع جميع اللقطات
function getAllScreenshots() {
    return JSON.parse(localStorage.getItem("captured_screenshots") || "[]");
}

// حذف لقطة محددة
function deleteScreenshot(id) {
    let list = getAllScreenshots();
    list = list.filter(item => item.id !== id);
    localStorage.setItem("captured_screenshots", JSON.stringify(list));
}

// فتح نافذة عرض اللقطات
function openScreenshotPopup() {
    const list = getAllScreenshots();
    let html = `
    <div class="screenshot-popup-overlay" id="sPopup">
        <div class="screenshot-popup">
            <h2>اللقطات المحفوظة</h2>
            <button class="close-popup" onclick="closeScreenshotPopup()">✕</button>
            <div class="screenshots-grid">
    `;
    if (list.length === 0) {
        html += `<p class="empty-text">لا توجد لقطات محفوظة</p>`;
    } else {
        list.forEach(item => {
            html += `
                <div class="screenshot-item">
                    <img src="${item.image}" class="screenshot-thumb" onclick="openFullScreenshot('${item.image}')">
                    <button class="delete-btn" onclick="deleteSingleScreenshot(${item.id})">حذف</button>
                </div>
            `;
        });
    }
    html += `
            </div>
            <button class="delete-all-btn" onclick="deleteAllScreenshots()">حذف جميع اللقطات</button>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
}

// إغلاق النافذة
function closeScreenshotPopup() {
    document.getElementById("sPopup")?.remove();
}

// فتح اللقطة بحجم كامل
function openFullScreenshot(src) {
    window.open(src, "_blank");
}

// حذف لقطة واحدة
function deleteSingleScreenshot(id) {
    deleteScreenshot(id);
    closeScreenshotPopup();
    openScreenshotPopup();
}

// حذف جميع اللقطات
function deleteAllScreenshots() {
    localStorage.removeItem("captured_screenshots");
    closeScreenshotPopup();
    openScreenshotPopup();
}

// --------------------
// 5. Flash + Preview Animation (Enhanced with Better Timing and Accessibility)
// --------------------
function showScreenshotAnimation(imageData) {
    // Flash with reduced motion check
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const flashDuration = prefersReducedMotion ? 50 : 200;

    const flash = document.createElement("div");
    flash.style.position = "fixed";
    flash.style.top = "0";
    flash.style.left = "0";
    flash.style.width = "100%";
    flash.style.height = "100%";
    flash.style.background = "rgba(255,255,255,0.5)";
    flash.style.zIndex = "9999";
    flash.style.opacity = "0";
    flash.style.transition = `opacity ${flashDuration}ms ease`;
    document.body.appendChild(flash);

    requestAnimationFrame(() => flash.style.opacity = "1");
    setTimeout(() => {
        flash.style.opacity = "0";
        setTimeout(() => flash.remove(), flashDuration);
    }, flashDuration / 2);

    // Preview bubble with fade-out
    const preview = document.createElement("img");
    preview.src = imageData;
    preview.style.position = "fixed";
    preview.style.bottom = "20px";
    preview.style.right = "20px";
    preview.style.width = "100px";
    preview.style.height = "60px";
    preview.style.zIndex = "10000";
    preview.style.border = "2px solid white";
    preview.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    preview.style.transition = "opacity 1s ease";
    preview.style.opacity = "1";
    document.body.appendChild(preview);
    setTimeout(() => {
        preview.style.opacity = "0";
        setTimeout(() => preview.remove(), 1000);
    }, 1000);
}
// ================================
// GLOBAL EXPORTS - MUST BE AT THE END
// ================================

// Expose functions globally for play-pause button integration
window.hasReachedLimit = hasReachedLimit;
window.incrementScreenshotCount = incrementScreenshotCount;
window.instantScreenshot = instantScreenshot;

// Expose additional functions for module compatibility
window.getScreenshotData = getScreenshotData;
window.getMonthlyScreenshotData = getMonthlyScreenshotData;
window.saveScreenshotToStorage = saveScreenshotToStorage;
window.getAllScreenshots = getAllScreenshots;
window.deleteScreenshot = deleteScreenshot;
window.openScreenshotPopup = openScreenshotPopup;
window.closeScreenshotPopup = closeScreenshotPopup;
window.openFullScreenshot = openFullScreenshot;
window.deleteSingleScreenshot = deleteSingleScreenshot;
window.deleteAllScreenshots = deleteAllScreenshots;
window.showScreenshotAnimation = showScreenshotAnimation;
window.captureFullPageScreenshot = captureFullPageScreenshot;
window.captureFallbackScreenshot = captureFallbackScreenshot;
window.waitForIframeLoad = waitForIframeLoad;
window.getCurrentVideoThumbnail = getCurrentVideoThumbnail;
window.extractVideoIdFromIframe = extractVideoIdFromIframe;
window.getCurrentVideoIdFromPlayer = getCurrentVideoIdFromPlayer;

// Debug info
console.log('✅ screenshot.js loaded - functions exposed globally');
console.log(' - hasReachedLimit:', typeof hasReachedLimit);
console.log(' - incrementScreenshotCount:', typeof incrementScreenshotCount);
console.log(' - instantScreenshot:', typeof instantScreenshot);
console.log(' - getScreenshotData:', typeof getScreenshotData);
console.log(' - getMonthlyScreenshotData:', typeof getMonthlyScreenshotData);