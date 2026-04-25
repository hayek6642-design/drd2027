/**
 * prayer-system.js - Global Prayer Alert System integration for CodeBank
 */

export function initPrayerSystem() {
    addIframeMuteIndicators();
    setupCrossComponentCommunication();
    console.log('🕌 Global Prayer Alert System integrated');
}

function addIframeMuteIndicators() {
    const iframes = [
        { id: 'games-dashboard', name: 'Games' },
        { id: 'samma3ny-dashboard', name: 'Samma3ny' },
        { id: 'farragna-dashboard', name: 'Farragna' },
        { id: 'oneworld-dashboard', name: 'OneWorld' },
        { id: 'eb3at-dashboard', name: 'Eb3at' }
    ];

    iframes.forEach(iframe => {
        const iframeElement = document.getElementById(iframe.id);
        if (iframeElement) {
            const indicator = document.createElement('div');
            indicator.id = `${iframe.id}-mute-indicator`;
            indicator.className = 'iframe-mute-indicator';
            indicator.style.cssText = `position: absolute; top: 10px; right: 10px; background: rgba(255, 0, 0, 0.8); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; z-index: 1000; display: none;`;
            indicator.textContent = '🔇 Muted for Prayer';
            iframeElement.parentElement?.appendChild(indicator);
        }
    });
}

function setupCrossComponentCommunication() {
    window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return;
        const { type, component } = event.data;
        if (type === 'MUTE_AUDIO') handleIframeMute(component, true);
        else if (type === 'UNMUTE_AUDIO') handleIframeMute(component, false);
    });
}

function handleIframeMute(component, shouldMute) {
    const map = { games: 'games-dashboard', samma3ny: 'samma3ny-dashboard', farragna: 'farragna-dashboard', oneworld: 'oneworld-dashboard', eb3at: 'eb3at-dashboard' };
    const iframeId = map[component];
    const iframe = iframeId && document.getElementById(iframeId);
    if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: shouldMute ? 'MUTE_AUDIO' : 'UNMUTE_AUDIO' }, "*");
        const indicator = document.getElementById(`${iframeId}-mute-indicator`);
        if (indicator) indicator.style.display = shouldMute ? 'block' : 'none';
    }
}
