/**
 * Asset Mirror - المرآة الموزعة للأصول
 * تعكس الأصول في الوقت الفعلي لجميع الخدمات
 */

class AssetMirror {
    constructor() {
        this.mirrors = new Map(); // service -> mirror element/data
        this.observers = new Map();
        this.updateQueue = [];
        this.isProcessing = false;
    }

    // Create visual mirror for a service
    createMirror(serviceName, containerSelector, options = {}) {
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.warn(`[AssetMirror] Container not found: ${containerSelector}`);
            return null;
        }

        const mirror = document.createElement('div');
        mirror.className = `acc-asset-mirror acc-mirror-${serviceName}`;
        mirror.innerHTML = this.getMirrorTemplate(options);
        
        container.appendChild(mirror);
        
        this.mirrors.set(serviceName, {
            element: mirror,
            container: container,
            lastUpdate: Date.now(),
            options
        });

        // Add animation styles
        this.injectStyles();

        return mirror;
    }

    getMirrorTemplate(options = {}) {
        const { compact = false, showIcons = true, theme = 'dark' } = options;
        
        if (compact) {
            return `
                <div class="acc-mirror-compact acc-theme-${theme}">
                    ${showIcons ? '<span class="acc-icon">🔐</span>' : ''}
                    <span class="acc-codes">0</span>
                    ${showIcons ? '<span class="acc-icon">🥈</span>' : ''}
                    <span class="acc-silver">0</span>
                    ${showIcons ? '<span class="acc-icon">🥇</span>' : ''}
                    <span class="acc-gold">0</span>
                </div>
            `;
        }

        return `
            <div class="acc-mirror-full acc-theme-${theme}">
                <div class="acc-asset-item" data-type="codes">
                    <div class="acc-asset-icon">🔐</div>
                    <div class="acc-asset-info">
                        <span class="acc-asset-label">الرموز</span>
                        <span class="acc-asset-value acc-codes">0</span>
                    </div>
                </div>
                <div class="acc-asset-item" data-type="silver">
                    <div class="acc-asset-icon">🥈</div>
                    <div class="acc-asset-info">
                        <span class="acc-asset-label">الفضة</span>
                        <span class="acc-asset-value acc-silver">0</span>
                    </div>
                </div>
                <div class="acc-asset-item" data-type="gold">
                    <div class="acc-asset-icon">🥇</div>
                    <div class="acc-asset-info">
                        <span class="acc-asset-label">الذهب</span>
                        <span class="acc-asset-value acc-gold">0</span>
                    </div>
                </div>
            </div>
        `;
    }

    updateMirror(serviceName, assets) {
        const mirror = this.mirrors.get(serviceName);
        if (!mirror) return;

        const { element } = mirror;
        
        // Queue update for batch processing
        this.updateQueue.push({
            serviceName,
            element,
            assets,
            timestamp: Date.now()
        });

        if (!this.isProcessing) {
            this.processUpdateQueue();
        }
    }

    processUpdateQueue() {
        this.isProcessing = true;
        
        requestAnimationFrame(() => {
            while (this.updateQueue.length > 0) {
                const update = this.updateQueue.shift();
                this.applyUpdate(update);
            }
            
            this.isProcessing = false;
        });
    }

    applyUpdate({ element, assets }) {
        const codesEl = element.querySelector('.acc-codes');
        const silverEl = element.querySelector('.acc-silver');
        const goldEl = element.querySelector('.acc-gold');

        if (codesEl) {
            this.animateValue(codesEl, parseInt(codesEl.textContent) || 0, assets.codes_count || 0);
        }
        if (silverEl) {
            this.animateValue(silverEl, parseInt(silverEl.textContent) || 0, assets.silver_balance || 0);
        }
        if (goldEl) {
            this.animateValue(goldEl, parseInt(goldEl.textContent) || 0, assets.gold_balance || 0);
        }

        // Add flash effect
        element.classList.add('acc-updated');
        setTimeout(() => element.classList.remove('acc-updated'), 500);
    }

    animateValue(element, start, end) {
        if (start === end) return;
        
        const duration = 500;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(start + (end - start) * easeOutQuart);
            
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = end.toLocaleString();
            }
        };
        
        requestAnimationFrame(animate);
    }

    injectStyles() {
        if (document.getElementById('acc-mirror-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'acc-mirror-styles';
        styles.textContent = `
            .acc-asset-mirror {
                font-family: system-ui, -apple-system, sans-serif;
                transition: all 0.3s ease;
            }
            
            .acc-mirror-compact {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.8);
                border-radius: 20px;
                color: white;
                font-size: 14px;
                font-weight: 600;
            }
            
            .acc-mirror-full {
                display: flex;
                flex-direction: column;
                gap: 12px;
                padding: 16px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .acc-asset-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                transition: transform 0.2s;
            }
            
            .acc-asset-item:hover {
                transform: translateX(5px);
                background: rgba(255, 255, 255, 0.1);
            }
            
            .acc-asset-icon {
                font-size: 24px;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 50%;
            }
            
            .acc-asset-info {
                display: flex;
                flex-direction: column;
            }
            
            .acc-asset-label {
                font-size: 12px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .acc-asset-value {
                font-size: 20px;
                font-weight: 700;
                color: #fff;
            }
            
            .acc-updated {
                animation: acc-flash 0.5s ease;
            }
            
            @keyframes acc-flash {
                0%, 100% { box-shadow: 0 0 0 0 transparent; }
                50% { box-shadow: 0 0 20px 5px rgba(0, 212, 255, 0.5); }
            }
            
            .acc-icon {
                opacity: 0.8;
            }
            
            .acc-theme-light {
                background: rgba(255, 255, 255, 0.95) !important;
                color: #333 !important;
            }
            
            .acc-theme-light .acc-asset-value {
                color: #1a1a2e !important;
            }
        `;
        
        document.head.appendChild(styles);
    }

    // Global update - update all mirrors at once
    updateAll(assets) {
        this.mirrors.forEach((mirror, serviceName) => {
            this.updateMirror(serviceName, assets);
        });
    }

    // Remove mirror
    removeMirror(serviceName) {
        const mirror = this.mirrors.get(serviceName);
        if (mirror && mirror.element) {
            mirror.element.remove();
            this.mirrors.delete(serviceName);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssetMirror;
}
