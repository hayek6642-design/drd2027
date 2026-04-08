// Bankode Dashboard - Modal Component
// Reusable modal component for dialogs and forms

class BankodeModal {
    /**
     * Create a new modal
     * @param {Object} options - Modal options
     * @param {string} options.id - Modal ID
     * @param {string} options.title - Modal title
     * @param {string} options.content - Modal content HTML
     * @param {Array} options.buttons - Button definitions
     * @param {boolean} options.closable - Show close button
     * @param {string} options.size - Modal size (sm, md, lg, xl)
     */
    constructor(options) {
        this.options = {
            id: options.id || 'modal-' + Math.random().toString(36).substr(2, 9),
            title: options.title || 'Modal',
            content: options.content || '',
            buttons: options.buttons || [],
            closable: options.closable !== false,
            size: options.size || 'md',
            ...options
        };

        this.element = this.createElement();
        this.isOpen = false;
    }

    /**
     * Create modal element
     * @returns {HTMLElement} Modal element
     */
    createElement() {
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.id = `${this.options.id}-backdrop`;
        backdrop.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 hidden';
        backdrop.style.transition = 'opacity 0.3s ease';

        // Create modal container
        const modal = document.createElement('div');
        modal.id = this.options.id;
        modal.className = `bg-gray-800 rounded-lg p-6 relative ${this.getSizeClasses()}`;
        modal.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        modal.style.transform = 'translateY(-20px)';
        modal.style.opacity = '0';

        // Add close button if enabled
        if (this.options.closable) {
            const closeButton = document.createElement('button');
            closeButton.className = 'absolute top-4 right-4 text-gray-400 hover:text-white';
            closeButton.innerHTML = '<i class="fas fa-times text-xl"></i>';
            closeButton.addEventListener('click', () => this.close());
            modal.appendChild(closeButton);
        }

        // Add title
        const title = document.createElement('h2');
        title.className = 'text-xl font-bold mb-4 text-center';
        title.textContent = this.options.title;
        modal.appendChild(title);

        // Add content
        const content = document.createElement('div');
        content.id = `${this.options.id}-content`;
        content.className = 'mb-6';
        content.innerHTML = this.options.content;
        modal.appendChild(content);

        // Add buttons
        if (this.options.buttons.length > 0) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'flex space-x-2';

            this.options.buttons.forEach(button => {
                const btn = document.createElement('button');
                btn.className = `flex-1 ${this.getButtonClasses(button.type)} py-2 px-4 rounded`;
                btn.textContent = button.text;

                if (button.onClick) {
                    btn.addEventListener('click', button.onClick);
                }

                if (button.closeOnClick) {
                    btn.addEventListener('click', () => this.close());
                }

                buttonContainer.appendChild(btn);
            });

            modal.appendChild(buttonContainer);
        }

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        this.backdrop = backdrop;
        this.modal = modal;

        return backdrop;
    }

    /**
     * Get size classes for modal
     * @returns {string} Size classes
     */
    getSizeClasses() {
        const sizes = {
            sm: 'w-full max-w-sm',
            md: 'w-full max-w-md',
            lg: 'w-full max-w-lg',
            xl: 'w-full max-w-xl'
        };

        return sizes[this.options.size] || sizes.md;
    }

    /**
     * Get button classes based on type
     * @param {string} type - Button type
     * @returns {string} Button classes
     */
    getButtonClasses(type) {
        const types = {
            primary: 'bg-blue-600 hover:bg-blue-700',
            secondary: 'bg-gray-600 hover:bg-gray-700',
            danger: 'bg-red-600 hover:bg-red-700',
            success: 'bg-green-600 hover:bg-green-700'
        };

        return types[type] || types.primary;
    }

    /**
     * Open modal
     */
    open() {
        if (this.isOpen) return;

        this.isOpen = true;
        this.backdrop.classList.remove('hidden');
        this.backdrop.style.opacity = '1';

        // Add small delay for animation
        setTimeout(() => {
            this.modal.style.transform = 'translateY(0)';
            this.modal.style.opacity = '1';
        }, 10);

        // Add event listener for escape key
        document.addEventListener('keydown', this.handleKeyDown);
    }

    /**
     * Close modal
     */
    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.modal.style.transform = 'translateY(-20px)';
        this.modal.style.opacity = '0';

        // Add small delay for animation
        setTimeout(() => {
            this.backdrop.classList.add('hidden');
            this.backdrop.style.opacity = '0';
        }, 300);

        // Remove event listener for escape key
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    /**
     * Handle key down events
     * @param {KeyboardEvent} event - Key event
     */
    handleKeyDown = (event) => {
        if (event.key === 'Escape' && this.options.closable) {
            this.close();
        }
    }

    /**
     * Update modal content
     * @param {string} content - New content HTML
     */
    updateContent(content) {
        const contentElement = this.modal.querySelector(`#${this.options.id}-content`);
        if (contentElement) {
            contentElement.innerHTML = content;
        }
    }

    /**
     * Update modal title
     * @param {string} title - New title
     */
    updateTitle(title) {
        const titleElement = this.modal.querySelector('h2');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Get modal element
     * @returns {HTMLElement} Modal element
     */
    getElement() {
        return this.element;
    }

    /**
     * Check if modal is open
     * @returns {boolean} True if open
     */
    isOpen() {
        return this.isOpen;
    }
}

// Export Modal component
window.BankodeModal = BankodeModal;