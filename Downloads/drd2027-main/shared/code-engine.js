/**
 * CodeEngine - Single Code Generator, Dual Renderers
 * Replaces broken storage/sync architecture with direct event emission
 */

window.CodeEngine = {
    listeners: [],

    /**
     * Register a listener for code generation events
     * @param {function} fn - Callback function that receives the generated code
     */
    on(fn) {
        if (typeof fn === 'function') {
            this.listeners.push(fn);
        } else {
            console.warn('[CodeEngine] Listener must be a function');
        }
    },

    /**
     * Emit a code generation event to all registered listeners
     * @param {string} code - The generated code to emit
     */
    emit(code) {
        console.log("🧬 CODE GENERATED:", code);
        this.listeners.forEach(fn => {
            try {
                fn(code);
            } catch (error) {
                console.error('[CodeEngine] Listener error:', error);
            }
        });
    }
};

// Export for modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.CodeEngine;
}