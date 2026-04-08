// Bankode Dashboard - Card Component
// Reusable card component for displaying balances and information

class BankodeCard {
    /**
     * Create a new card
     * @param {Object} options - Card options
     * @param {string} options.id - Card ID
     * @param {string} options.title - Card title
     * @param {string} options.value - Card value
     * @param {string} options.icon - Font Awesome icon class
     * @param {string} options.color - Tailwind color class
     * @param {string} options.subtitle - Card subtitle
     */
    constructor(options) {
        this.options = {
            id: options.id || 'card-' + Math.random().toString(36).substr(2, 9),
            title: options.title || 'Card',
            value: options.value || '0',
            icon: options.icon || 'fas fa-question-circle',
            color: options.color || 'blue',
            subtitle: options.subtitle || '',
            ...options
        };

        this.element = this.createElement();
    }

    /**
     * Create card element
     * @returns {HTMLElement} Card element
     */
    createElement() {
        const card = document.createElement('div');
        card.id = this.options.id;
        card.className = `bankode-card bg-gradient-to-br from-${this.options.color}-600 to-${this.options.color}-800 p-6 rounded-lg shadow-lg`;

        card.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold">${this.options.title}</h3>
                <i class="${this.options.icon} text-2xl"></i>
            </div>
            <div class="text-3xl font-bold" id="${this.options.id}-value">${this.options.value}</div>
            <div class="text-sm text-${this.options.color}-100 mt-2">${this.options.subtitle}</div>
        `;

        return card;
    }

    /**
     * Update card value
     * @param {string|number} value - New value
     */
    updateValue(value) {
        const valueElement = this.element.querySelector(`#${this.options.id}-value`);
        if (valueElement) {
            valueElement.textContent = value.toString();
        }
    }

    /**
     * Update card title
     * @param {string} title - New title
     */
    updateTitle(title) {
        const titleElement = this.element.querySelector('h3');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Get card element
     * @returns {HTMLElement} Card element
     */
    getElement() {
        return this.element;
    }

    /**
     * Add click handler to card
     * @param {Function} handler - Click handler function
     */
    onClick(handler) {
        this.element.addEventListener('click', handler);
        this.element.style.cursor = 'pointer';
    }
}

// Export Card component
window.BankodeCard = BankodeCard;