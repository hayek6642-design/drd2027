/**
 * UI Components and Utilities for CodeBank Exchange
 * Reusable component functions and helpers
 */

/**
 * Toast notification system
 */
let toastCounter = 0;

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type: success, error, warning, info
 * @param {number} duration - Display duration in milliseconds
 */
function showToast(message, type = 'info', duration = 5000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.warn('Toast container not found');
        return;
    }

    const toastId = `toast-${++toastCounter}`;
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast ${type}`;
    
    const icon = getToastIcon(type);
    const title = getToastTitle(type);
    
    toast.innerHTML = `
        <div class="toast-header">
            <div class="flex items-center space-x-2">
                <i class="${icon}"></i>
                <span class="toast-title">${title}</span>
            </div>
            <button class="toast-close" onclick="removeToast('${toastId}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="toast-description">${message}</div>
    `;

    toastContainer.appendChild(toast);

    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            removeToast(toastId);
        }, duration);
    }
}

/**
 * Remove toast notification
 * @param {string} toastId - Toast element ID
 */
function removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.style.animation = 'toast-slide-out 0.3s ease-out forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
}

/**
 * Get toast icon based on type
 * @param {string} type - Toast type
 * @returns {string} Icon class
 */
function getToastIcon(type) {
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
}

/**
 * Get toast title based on type
 * @param {string} type - Toast type
 * @returns {string} Title text
 */
function getToastTitle(type) {
    const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
    };
    return titles[type] || titles.info;
}

/**
 * Loading state management
 */
class LoadingManager {
    constructor() {
        this.loadingStates = new Set();
    }

    /**
     * Show loading state for element
     * @param {string|HTMLElement} element - Element ID or element
     * @param {string} loadingText - Loading text to display
     */
    show(element, loadingText = 'Loading...') {
        const el = typeof element === 'string' ? document.getElementById(element) : element;
        if (!el) return;

        const originalContent = el.innerHTML;
        el.dataset.originalContent = originalContent;
        el.disabled = true;
        
        if (el.tagName === 'BUTTON') {
            el.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>${loadingText}`;
        } else {
            el.innerHTML = `<div class="flex items-center justify-center"><i class="fas fa-spinner fa-spin mr-2"></i>${loadingText}</div>`;
        }
        
        this.loadingStates.add(el);
    }

    /**
     * Hide loading state for element
     * @param {string|HTMLElement} element - Element ID or element
     */
    hide(element) {
        const el = typeof element === 'string' ? document.getElementById(element) : element;
        if (!el) return;

        if (this.loadingStates.has(el)) {
            el.innerHTML = el.dataset.originalContent || '';
            el.disabled = false;
            delete el.dataset.originalContent;
            this.loadingStates.delete(el);
        }
    }

    /**
     * Hide all loading states
     */
    hideAll() {
        this.loadingStates.forEach(el => {
            this.hide(el);
        });
    }
}

// Global loading manager instance
const loadingManager = new LoadingManager();

/**
 * Modal dialog utilities
 */
class ModalManager {
    constructor() {
        this.activeModals = [];
    }

    /**
     * Show modal dialog
     * @param {Object} options - Modal options
     */
    show(options) {
        const {
            title = 'Dialog',
            content = '',
            buttons = [],
            className = '',
            onClose = null
        } = options;

        const modalId = `modal-${Date.now()}`;
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = `dialog-overlay ${className}`;
        
        const buttonHtml = buttons.map(btn => 
            `<button class="btn ${btn.className || 'btn-primary'}" onclick="${btn.onclick || ''}">${btn.text}</button>`
        ).join(' ');

        modal.innerHTML = `
            <div class="dialog">
                <div class="dialog-header">
                    <h3 class="dialog-title">${title}</h3>
                    <button class="dialog-close" onclick="modalManager.hide('${modalId}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="dialog-content">
                    ${content}
                    ${buttonHtml ? `<div class="flex justify-end space-x-2 mt-4">${buttonHtml}</div>` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.activeModals.push({ id: modalId, onClose });

        // Handle backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hide(modalId);
            }
        });

        return modalId;
    }

    /**
     * Hide modal dialog
     * @param {string} modalId - Modal ID
     */
    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            const modalData = this.activeModals.find(m => m.id === modalId);
            if (modalData && modalData.onClose) {
                modalData.onClose();
            }
            
            modal.remove();
            this.activeModals = this.activeModals.filter(m => m.id !== modalId);
        }
    }

    /**
     * Hide all modals
     */
    hideAll() {
        this.activeModals.forEach(modal => {
            this.hide(modal.id);
        });
    }
}

// Global modal manager instance
const modalManager = new ModalManager();

/**
 * Form validation utilities
 */
class FormValidator {
    constructor() {
        this.rules = {
            required: (value) => value.trim() !== '',
            email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            minLength: (value, min) => value.length >= min,
            maxLength: (value, max) => value.length <= max,
            numeric: (value) => !isNaN(value) && !isNaN(parseFloat(value)),
            positive: (value) => parseFloat(value) > 0,
            integer: (value) => Number.isInteger(parseFloat(value))
        };
    }

    /**
     * Validate form field
     * @param {HTMLElement} field - Form field element
     * @param {Object} rules - Validation rules
     * @returns {Object} Validation result
     */
    validateField(field, rules) {
        const value = field.value;
        const errors = [];

        for (const [rule, param] of Object.entries(rules)) {
            const validator = this.rules[rule];
            if (validator && !validator(value, param)) {
                errors.push(this.getErrorMessage(rule, param));
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate entire form
     * @param {HTMLFormElement} form - Form element
     * @param {Object} fieldRules - Rules for each field
     * @returns {Object} Validation result
     */
    validateForm(form, fieldRules) {
        const results = {};
        let isFormValid = true;

        for (const [fieldName, rules] of Object.entries(fieldRules)) {
            const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (field) {
                const result = this.validateField(field, rules);
                results[fieldName] = result;
                
                if (!result.valid) {
                    isFormValid = false;
                    this.showFieldError(field, result.errors);
                } else {
                    this.clearFieldError(field);
                }
            }
        }

        return {
            valid: isFormValid,
            fields: results
        };
    }

    /**
     * Show field validation error
     * @param {HTMLElement} field - Form field
     * @param {Array} errors - Error messages
     */
    showFieldError(field, errors) {
        this.clearFieldError(field);
        
        field.classList.add('border-red-500');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-red-500 text-sm mt-1 field-error';
        errorDiv.textContent = errors[0]; // Show first error
        
        field.parentNode.appendChild(errorDiv);
    }

    /**
     * Clear field validation error
     * @param {HTMLElement} field - Form field
     */
    clearFieldError(field) {
        field.classList.remove('border-red-500');
        
        const errorDiv = field.parentNode.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    /**
     * Get error message for validation rule
     * @param {string} rule - Validation rule name
     * @param {*} param - Rule parameter
     * @returns {string} Error message
     */
    getErrorMessage(rule, param) {
        const messages = {
            required: 'This field is required',
            email: 'Please enter a valid email address',
            minLength: `Minimum length is ${param} characters`,
            maxLength: `Maximum length is ${param} characters`,
            numeric: 'Please enter a valid number',
            positive: 'Please enter a positive number',
            integer: 'Please enter a whole number'
        };
        return messages[rule] || 'Invalid value';
    }
}

// Global form validator instance
const formValidator = new FormValidator();

/**
 * Utility functions
 */

/**
 * Format date string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency
 */
function formatCurrency(amount, currency = 'EGP') {
    const symbols = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        EGP: 'EGP',
        SAR: 'SAR',
        AED: 'AED'
    };
    
    const symbol = symbols[currency] || currency;
    return `${symbol} ${amount.toLocaleString()}`;
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
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
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Check if user is on mobile device
 * @returns {boolean} True if mobile
 */
function isMobile() {
    return window.innerWidth < 768;
}

/**
 * Smooth scroll to element
 * @param {string|HTMLElement} element - Element selector or element
 * @param {number} offset - Scroll offset
 */
function scrollToElement(element, offset = 0) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (el) {
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
        return true;
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        showToast('Failed to copy to clipboard', 'error');
        return false;
    }
}

/**
 * Generate random ID
 * @param {number} length - ID length
 * @returns {string} Random ID
 */
function generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
