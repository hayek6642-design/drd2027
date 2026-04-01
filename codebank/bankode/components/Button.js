// Bankode Dashboard - Button Component
// Reusable button component with various styles and states

class BankodeButton {
    /**
     * Create a new button
     * @param {Object} options - Button options
     * @param {string} options.id - Button ID
     * @param {string} options.text - Button text
     * @param {string} options.type - Button type (primary, secondary, danger, success, etc.)
     * @param {string} options.size - Button size (sm, md, lg)
     * @param {string} options.icon - Font Awesome icon class
     * @param {boolean} options.disabled - Disabled state
     * @param {Function} options.onClick - Click handler
     */
    constructor(options) {
        this.options = {
            id: options.id || 'btn-' + Math.random().toString(36).substr(2, 9),
            text: options.text || 'Button',
            type: options.type || 'primary',
            size: options.size || 'md',
            icon: options.icon || '',
            disabled: options.disabled || false,
            onClick: options.onClick || (() => {}),
            ...options
        };

        this.element = this.createElement();
    }

    /**
     * Create button element
     * @returns {HTMLElement} Button element
     */
    createElement() {
        const button = document.createElement('button');
        button.id = this.options.id;
        button.type = 'button';

        // Set button classes based on type and size
        const typeClasses = {
            primary: 'bg-blue-600 hover:bg-blue-700 text-white',
            secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
            danger: 'bg-red-600 hover:bg-red-700 text-white',
            success: 'bg-green-600 hover:bg-green-700 text-white',
            warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
            info: 'bg-indigo-600 hover:bg-indigo-700 text-white',
            outline: 'border border-gray-600 hover:bg-gray-700 text-white'
        };

        const sizeClasses = {
            sm: 'px-3 py-1 text-sm',
            md: 'px-4 py-2',
            lg: 'px-6 py-3 text-lg'
        };

        button.className = `
            bankode-button
            ${typeClasses[this.options.type] || typeClasses.primary}
            ${sizeClasses[this.options.size] || sizeClasses.md}
            rounded
            transition-all
            duration-200
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
            focus:ring-opacity-50
            ${this.options.disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `;

        // Set button content
        if (this.options.icon) {
            button.innerHTML = `
                <i class="${this.options.icon} mr-2"></i>
                <span>${this.options.text}</span>
            `;
        } else {
            button.textContent = this.options.text;
        }

        // Add click handler
        if (!this.options.disabled) {
            button.addEventListener('click', this.options.onClick);
        }

        return button;
    }

    /**
     * Update button text
     * @param {string} text - New text
     */
    updateText(text) {
        this.options.text = text;
        const span = this.element.querySelector('span');
        if (span) {
            span.textContent = text;
        } else {
            this.element.textContent = text;
        }
    }

    /**
     * Update button disabled state
     * @param {boolean} disabled - New disabled state
     */
    updateDisabled(disabled) {
        this.options.disabled = disabled;
        if (disabled) {
            this.element.classList.add('opacity-50', 'cursor-not-allowed');
            this.element.removeEventListener('click', this.options.onClick);
        } else {
            this.element.classList.remove('opacity-50', 'cursor-not-allowed');
            this.element.addEventListener('click', this.options.onClick);
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.originalText = this.options.text;
        this.updateText('Loading...');
        this.updateDisabled(true);
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        if (this.originalText) {
            this.updateText(this.originalText);
        }
        this.updateDisabled(false);
    }

    /**
     * Get button element
     * @returns {HTMLElement} Button element
     */
    getElement() {
        return this.element;
    }

    /**
     * Add button to container
     * @param {HTMLElement|string} container - Container element or selector
     */
    addTo(container) {
        let target;
        if (typeof container === 'string') {
            target = document.querySelector(container);
        } else {
            target = container;
        }

        if (target) {
            target.appendChild(this.element);
        }
    }
}

// Export Button component
window.BankodeButton = BankodeButton;