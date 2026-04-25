// floating-app.js - Shared module for floating window functionality
class FloatingApp {
    constructor(container) {
        // Store references to key elements
        this.container = container;
        this.isFloating = false;
        this.originalWindowState = {
            width: window.outerWidth,
            height: window.outerHeight,
            left: window.screenX,
            top: window.screenY
        };
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.isDragging = false;
        
        // Set up global double-click handler for the whole page
        document.body.addEventListener('dblclick', (e) => {
            // Ignore if clicking on interactive elements
            if (e.target.closest('button, input, a, iframe, #code-display, #counter-container, .popup-overlay')) {
                return;
            }
            this.toggleFloating();
        });
        
        // Store initial window state
        this.saveWindowState();
        
        // Initialize event listeners
        this.initEventListeners();
    }

    saveWindowState() {
        this.originalWindowState = {
            width: window.outerWidth,
            height: window.outerHeight,
            left: window.screenX,
            top: window.screenY
        };
    }

    toggleFloating() {
        if (this.isFloating) {
            this.disableFloating();
        } else {
            this.enableFloating();
        }
    }

    async requestWindowFeatures() {
        try {
            // Request permission for Picture-in-Picture if available
            if (document.pictureInPictureEnabled) {
                const video = this.container.querySelector('video');
                if (video) {
                    await video.requestPictureInPicture();
                }
            }

            // Request window management permissions if available
            if ('getScreenDetails' in window) {
                const screenDetails = await window.getScreenDetails();
                return true;
            }
        } catch (err) {
            console.log('Advanced window features not available:', err);
        }
        return false;
    }

    calculateFloatingSize() {
        // Calculate preferred floating window size (30% of screen width/height)
        const screen = window.screen;
        return {
            width: Math.round(screen.availWidth * 0.3),
            height: Math.round(screen.availHeight * 0.3),
            left: Math.round(screen.availWidth * 0.7),
            top: Math.round(screen.availHeight * 0.1)
        };
    }

    async enableFloating() {
        if (this.isFloating) return;
        
        this.isFloating = true;
        
        // Request necessary permissions and features
        await this.requestWindowFeatures();
        
        // Calculate new window size and position
        const floatingSize = this.calculateFloatingSize();
        
        // Store current window state before modifying
        this.saveWindowState();
        
        try {
            // Resize and reposition the browser window
            window.resizeTo(floatingSize.width, floatingSize.height);
            window.moveTo(floatingSize.left, floatingSize.top);
            
            // Add floating styles to the window
            document.documentElement.style.setProperty('--window-width', floatingSize.width + 'px');
            document.documentElement.style.setProperty('--window-height', floatingSize.height + 'px');
            
            // Add floating class for additional styling
            document.body.classList.add('window-floating');
            
            // Set window always on top if supported
            if (window.navigator.windowControlsOverlay) {
                window.navigator.windowControlsOverlay.visible = true;
            }
            
        } catch (err) {
            console.log('Window manipulation not available:', err);
            // Fallback to in-page floating if window manipulation fails
            this.fallbackToInPageFloat(floatingSize);
        }
    }

    async disableFloating() {
        if (!this.isFloating) return;
        
        this.isFloating = false;
        
        try {
            // Restore original window size and position
            window.resizeTo(this.originalWindowState.width, this.originalWindowState.height);
            window.moveTo(this.originalWindowState.left, this.originalWindowState.top);
            
            // Remove floating styles
            document.documentElement.style.removeProperty('--window-width');
            document.documentElement.style.removeProperty('--window-height');
            
            // Remove floating class
            document.body.classList.remove('window-floating');
            
            // Disable always on top if supported
            if (window.navigator.windowControlsOverlay) {
                window.navigator.windowControlsOverlay.visible = false;
            }
            
            // Exit Picture-in-Picture if active
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            }
            
        } catch (err) {
            console.log('Window restoration failed:', err);
            // Fallback to restoring in-page state if window manipulation fails
            this.fallbackFromInPageFloat();
        }
    }

    initEventListeners() {
        // Handle window dragging when in floating mode
        document.addEventListener('mousedown', (e) => {
            if (!this.isFloating) return;
            // Allow dragging from any non-interactive area
            if (e.target.closest('button, input, a, iframe, video')) return;
            
            this.isDragging = true;
            this.dragStartX = e.screenX - window.screenX;
            this.dragStartY = e.screenY - window.screenY;
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            // Move the entire browser window
            window.moveTo(
                e.screenX - this.dragStartX,
                e.screenY - this.dragStartY
            );
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        // Handle browser window bounds
        window.addEventListener('resize', () => {
            if (!this.isFloating) return;
            
            const screen = window.screen;
            const minWidth = Math.round(screen.availWidth * 0.2);
            const minHeight = Math.round(screen.availHeight * 0.2);
            
            // Ensure minimum window size
            if (window.outerWidth < minWidth || window.outerHeight < minHeight) {
                window.resizeTo(
                    Math.max(window.outerWidth, minWidth),
                    Math.max(window.outerHeight, minHeight)
                );
            }
            
            // Keep window within screen bounds
            if (window.screenX < 0) window.moveTo(0, window.screenY);
            if (window.screenY < 0) window.moveTo(window.screenX, 0);
            if (window.screenX + window.outerWidth > screen.availWidth) {
                window.moveTo(screen.availWidth - window.outerWidth, window.screenY);
            }
            if (window.screenY + window.outerHeight > screen.availHeight) {
                window.moveTo(window.screenX, screen.availHeight - window.outerHeight);
            }
        });

        // Fallback touch events for mobile
        let touchStartX, touchStartY;
        
        document.addEventListener('touchstart', (e) => {
            if (!this.isFloating) return;
            if (e.target.closest('button, input, a, iframe, video')) return;
            
            touchStartX = e.touches[0].screenX - window.screenX;
            touchStartY = e.touches[0].screenY - window.screenY;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (touchStartX === undefined) return;
            
            window.moveTo(
                e.touches[0].screenX - touchStartX,
                e.touches[0].screenY - touchStartY
            );
        }, { passive: true });

        document.addEventListener('touchend', () => {
            touchStartX = undefined;
            touchStartY = undefined;
        });
    }

    // Fallback methods for browsers that don't support window manipulation
    fallbackToInPageFloat(size) {
        this.container.style.position = 'fixed';
        this.container.style.width = size.width + 'px';
        this.container.style.height = size.height + 'px';
        this.container.style.top = '10vh';
        this.container.style.right = '20px';
        this.container.style.zIndex = '999999999';
        this.container.style.background = '#000';
        this.container.style.borderRadius = '10px';
        this.container.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
        this.container.style.resize = 'both';
        this.container.style.overflow = 'auto';
    }

    fallbackFromInPageFloat() {
        Object.entries(this.originalStyles).forEach(([key, value]) => {
            this.container.style[key] = value;
        });
    }
}

// Export for use in other files
export default FloatingApp;
