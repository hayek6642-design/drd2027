/**
 * gate-system.js - 1000 Hours Gate System for CodeBank
 */

const BROADCAST_CHANNEL_NAME = 'yt-codebank-sync';
const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
let hasReached1000Hours = false;

export async function check1000HoursGate() {
    if (window.unifiedStorage?.cacheGet) {
        hasReached1000Hours = await window.unifiedStorage.cacheGet('hasReached1000Hours') === true;
    }
    if (hasReached1000Hours) {
        hideProgressBar();
        enableAllServices();
    } else {
        enforceRestrictions();
    }
}

function hideProgressBar() {
    const progressContainer = document.getElementById('watch-time-progress-container');
    progressContainer?.remove();
    window.unifiedStorage?.cacheSet?.('progressBarRemoved', true);
}

function enableAllServices() {
    const restrictedTabs = ['buy', 'sell', 'eb3at', 'piston', 'corsa'];
    restrictedTabs.forEach(tabId => {
        const tabBtn = document.querySelector(`[data-tab="${tabId}"]`);
        tabBtn?.removeEventListener('click', restrictTabClick);
    });
}

function enforceRestrictions() {
    const restrictedTabs = ['buy', 'sell', 'eb3at', 'piston', 'corsa'];
    restrictedTabs.forEach(tabId => {
        const tabBtn = document.querySelector(`[data-tab="${tabId}"]`);
        tabBtn?.addEventListener('click', restrictTabClick);
    });
}

function restrictTabClick(e) {
    e.preventDefault();
    e.stopPropagation();
    showRestrictionPopup("You still didn't reach the 1000 hours watching.");
    return false;
}

function showRestrictionPopup(message) {
    const overlay = document.createElement('div');
    overlay.id = 'restriction-overlay';
    overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(5px);`;
    overlay.innerHTML = `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; padding: 30px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); color: white;"><h3 style="margin-bottom: 20px; font-size: 24px;">Access Restricted</h3><p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">${message}</p><button id="restriction-close" style="background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.3); color: white; padding: 10px 20px; border-radius: 10px; cursor: pointer; font-size: 16px;">OK</button></div>`;
    document.body.appendChild(overlay);
    document.getElementById('restriction-close').onclick = () => overlay.remove();
}

export function updateWatchTimeProgress(watchTimeMs) {
    const totalMs = 1000 * 60 * 60 * 1000;
    const progress = Math.min((watchTimeMs / totalMs) * 100, 100);
    const totalHours = watchTimeMs / (1000 * 60 * 60);

    window.unifiedStorage?.cacheSet?.('totalWatchHours', totalHours);
    if (totalHours >= 1000) hideProgressBar();

    const progressBar = document.getElementById('watch-time-progress-bar');
    const percentageEl = document.getElementById('watch-time-percentage');
    const currentTimeEl = document.getElementById('watch-time-current');

    if (progressBar) progressBar.style.width = `${progress}%`;
    if (percentageEl) percentageEl.textContent = `${progress.toFixed(1)}%`;
    if (currentTimeEl) {
        const h = Math.floor(watchTimeMs / 3600000);
        const m = Math.floor((watchTimeMs % 3600000) / 60000);
        const s = Math.floor((watchTimeMs % 60000) / 1000);
        currentTimeEl.textContent = `${h.toString().padStart(3, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    if (watchTimeMs >= totalMs && !hasReached1000Hours) unlockGate();
}

function unlockGate() {
    hasReached1000Hours = true;
    window.unifiedStorage?.cacheSet?.('hasReached1000Hours', true);
    enableAllServices();
    bc.postMessage({ type: '1000_hours_unlocked' });
    console.log('🎉 1000 Hours Gate Unlocked!');
}

bc.onmessage = (event) => {
    if (event.data.type === 'watch_time_update') updateWatchTimeProgress(event.data.hours);
    else if (event.data.type === '1000_hours_unlocked' && !hasReached1000Hours) unlockGate();
};
