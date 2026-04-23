/**
 * tab-manager.js - Enhanced tab and service management for CodeBank
 */

const tabReferences = { farragna: null };
const tabConfig = {
    farragna: {
        url: './farragna/index.html',
        name: 'Farragna Player',
        features: 'width=1024,height=768,resizable=yes,scrollbars=yes,status=yes',
        onLoadCallback: function(win) {
            console.log('Farragna tab loaded successfully');
            try {
                const displayBtn = win.document.querySelector('.player-display-btn');
                if (displayBtn) {
                    displayBtn.addEventListener('click', () => {
                        window.opener.postMessage({ type: 'farragna:status', status: 'playing', action: 'display_clicked' }, window.location.origin);
                    });
                }
            } catch (err) { console.error('Error initializing Farragna display button:', err); }
        }
    }
};

export function initTabManager() {
    const farragnaBtn = document.getElementById('open-farragna');
    farragnaBtn?.addEventListener('click', () => openTab('farragna'));

    window.addEventListener('message', handleMessage);
    console.log('🔗 Tab Manager initialized');
}

export function openTab(type) {
    if (!tabConfig[type]) return;
    if (tabReferences[type] && !tabReferences[type].closed) {
        tabReferences[type].focus();
        return tabReferences[type];
    }

    const config = tabConfig[type];
    tabReferences[type] = window.open(config.url, config.name, config.features);
    tabReferences[type]?.addEventListener('load', () => config.onLoadCallback(tabReferences[type]));
    return tabReferences[type];
}

function handleMessage(event) {
    if (event.origin !== window.location.origin) return;
    if (!event.data || !event.data.type) return;

    switch (event.data.type) {
        case 'farragna:status':
            if (event.data.status === 'playing') window.showToast?.('Farragna player started', 'info');
            break;
        case 'tab:close':
            if (event.data.tabName && tabReferences[event.data.tabName]) {
                tabReferences[event.data.tabName].close();
                tabReferences[event.data.tabName] = null;
            }
            break;
        case 'CODEBANK_ASSETS_SYNC':
            if (typeof window.__renderSafeList__ === 'function') window.__renderSafeList__();
            break;
    }
}

export function activateTab(tabId) {
    try {
        const buttons = document.querySelectorAll('.tab-btn');
        buttons.forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`[data-tab="${tabId}"]`) || document.querySelector(`[data-tab-id="${tabId}"]`);
        activeBtn?.classList.add('active');

        const panels = document.querySelectorAll('#tab-content .tab-content');
        panels.forEach(p => p.classList.remove('active'));
        const panel = document.getElementById(`${tabId}-tab`);
        panel?.classList.add('active');

        const map = {
            eb3at: 'eb3at-dashboard', games: 'games-dashboard', samma3ny: 'samma3ny-dashboard',
            farragna: 'farragna-dashboard', oneworld: 'oneworld-dashboard', corsa: 'corsa-dashboard',
            setta: 'setta-dashboard'
        };
        const id = map[tabId];
        const iframe = id && document.getElementById(id);
        if (iframe && !iframe.src && iframe.dataset.src) iframe.src = iframe.dataset.src;

        if (tabId === 'shots') {
            const shotsIframe = document.getElementById('main-tab-iframe');
            if (shotsIframe && !shotsIframe.src) shotsIframe.src = '/codebank/shots/shots.html';
        }
    } catch(_) {}
}
