// Bankode Dashboard - Helper Functions
// Utility functions for common operations

class BankodeHelpers {
    /**
     * Debounce function to limit how often a function can be called
     * @param {Function} func - Function to debounce
     * @param {number} wait - Time in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function to limit how often a function can be called
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    /**
     * Format date to readable string
     * @param {Date|string} date - Date to format
     * @param {string} format - Format string (default: 'YYYY-MM-DD HH:mm:ss')
     * @returns {string} Formatted date
     */
    static formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
        if (!date) return 'N/A';

        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid Date';

        const pad = (num) => num.toString().padStart(2, '0');

        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        const seconds = pad(d.getSeconds());

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    /**
     * Generate random string
     * @param {number} length - Length of string
     * @returns {string} Random string
     */
    static generateRandomString(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} Success status
     */
    static copyToClipboard(text) {
        return navigator.clipboard.writeText(text)
            .then(() => true)
            .catch(() => false);
    }

    /**
     * Get URL parameter
     * @param {string} name - Parameter name
     * @returns {string|null} Parameter value or null
     */
    static getUrlParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info, warning)
     * @param {number} duration - Duration in milliseconds
     */
    static showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-4 py-2 rounded shadow-lg text-white
            ${type === 'success' ? 'bg-green-600' :
              type === 'error' ? 'bg-red-600' :
              type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'}`;

        notification.textContent = message;
        notification.style.zIndex = '1000';
        notification.style.animation = 'fadeIn 0.3s ease-out';

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, duration);
    }

    /**
     * Parse JSON safely
     * @param {string} jsonString - JSON string
     * @param {*} defaultValue - Default value if parsing fails
     * @returns {*} Parsed JSON or default value
     */
    static safeJsonParse(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.warn('Failed to parse JSON:', e);
            return defaultValue;
        }
    }

    /**
     * Deep clone object
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Check if object is empty
     * @param {Object} obj - Object to check
     * @returns {boolean} True if empty
     */
    static isEmpty(obj) {
        return obj == null || Object.keys(obj).length === 0;
    }

    
}

// Export helpers
window.BankodeHelpers = BankodeHelpers;
