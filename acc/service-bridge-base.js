/**
 * Service Bridge Base Class
 * القاعدة المشتركة لجميع جسور الخدمات
 */

class ServiceBridgeBase {
    constructor(serviceName, config = {}) {
        this.serviceName = serviceName;
        this.config = config;
        this.acc = null;
        this.assets = null;
        this.initialized = false;
        this.messageHandlers = new Map();
        
        this.init();
    }

    init() {
        this.setupMessageHandlers();
        this.injectBridgeScript();
        this.initialized = true;
        console.log(`[${this.serviceName}] Bridge initialized`);
    }

    setACC(accClient) {
        this.acc = accClient;
        this.onACCConnected();
    }

    setupMessageHandlers() {
        window.addEventListener('message', (event) => {
            this.handleMessage(event);
        });
    }

    handleMessage(event) {
        const { type, data, source } = event.data || {};
        
        if (source !== this.serviceName && source !== 'acc') return;

        const handler = this.messageHandlers.get(type);
        if (handler) {
            handler(data, event);
        }
    }

    registerMessageHandler(type, handler) {
        this.messageHandlers.set(type, handler);
    }

    sendToParent(data) {
        if (window.parent !== window) {
            window.parent.postMessage({
                ...data,
                source: this.serviceName
            }, '*');
        }
    }

    sendToService(data) {
        // Send to iframe if exists
        const iframe = document.getElementById(`${this.serviceName}-iframe`);
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                ...data,
                source: 'acc'
            }, '*');
        }
    }

    // Override in subclasses
    onACCConnected() {
        console.log(`[${this.serviceName}] Connected to ACC`);
    }

    updateAssets(assets) {
        this.assets = assets;
        this.renderAssets();
        this.notifyService();
    }

    // Override in subclasses
    renderAssets() {
        console.log(`[${this.serviceName}] Render assets:`, this.assets);
    }

    notifyService() {
        this.sendToService({
            type: 'assets_update',
            data: this.assets
        });
    }

    // Transaction helpers
    async requestTransaction(type, amount, assetType, metadata = {}) {
        if (!this.acc) {
            throw new Error('ACC not connected');
        }

        return await this.acc.requestTransaction(type, amount, assetType, {
            service: this.serviceName,
            ...metadata
        });
    }

    // Inject bridge detection script into service
    injectBridgeScript() {
        // This will be overridden by specific bridges
    }

    // Utility: Create asset display element
    createAssetDisplay(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const display = document.createElement('div');
        display.className = `acc-service-display acc-${this.serviceName}-display`;
        display.innerHTML = `
            <div class="acc-service-assets">
                <span class="acc-badge codes" title="Codes">${this.assets?.codes_count || 0}</span>
                <span class="acc-badge silver" title="Silver">${this.assets?.silver_balance || 0}</span>
                <span class="acc-badge gold" title="Gold">${this.assets?.gold_balance || 0}</span>
            </div>
        `;

        container.appendChild(display);
        return display;
    }

    // Update display
    updateDisplay() {
        const display = document.querySelector(`.acc-${this.serviceName}-display`);
        if (display && this.assets) {
            const codes = display.querySelector('.codes');
            const silver = display.querySelector('.silver');
            const gold = display.querySelector('.gold');

            if (codes) codes.textContent = `${this.assets.codes_count || 0}`;
            if (silver) silver.textContent = `${this.assets.silver_balance || 0}`;
            if (gold) gold.textContent = `${this.assets.gold_balance || 0}`;
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServiceBridgeBase;
}
