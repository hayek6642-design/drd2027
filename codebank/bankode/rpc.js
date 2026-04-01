// Bankode Dashboard - RPC Functions
// Secure Supabase RPC calls for Bankode operations

class BankodeRPC {
    constructor() {
        this.supabase = window.supabase;
        this.config = window.BankodeConfig;
        this.helpers = window.BankodeHelpers;
        this.validators = window.BankodeValidators;

        // Supabase client should be initialized from bankodeConfig.js
    }

    /**
     * Verify Bankode password
     * @param {string} password - Bankode password to verify
     * @returns {Promise<Object>} RPC call result
     */
    async verifyPassword(password) { return { success: false, error: 'Disabled' } }

    /**
     * Set Bankode password
     * @param {string} currentPassword - Current password (for verification)
     * @param {string} newPassword - New password to set
     * @returns {Promise<Object>} RPC call result
     */
    async setPassword() { return { success: false, error: 'Disabled' } }

    /**
     * Get user balances
     * @returns {Promise<Object>} RPC call result with balances
     */
    async getBalances() {
        const userId = window.CODEBANK_TRUSTED_USER_ID;
        if (!userId) return { success: false, error: 'Missing trusted user' };
        const { data, error } = await this.supabase.rpc('bankode_get_balances', { p_user_id: userId });
        if (error) return { success: false, error: error.message };
        if (data && typeof data === 'object') {
            return { success: true, data: { codes: data.balance_codes || 0, silver: data.balance_silver || 0, gold: data.balance_gold || 0 } };
        }
        return { success: false, error: 'Invalid data format received' };
    }

    /**
     * Get user transactions
     * @param {number} limit - Number of transactions to fetch
     * @param {number} offset - Offset for pagination
     * @returns {Promise<Object>} RPC call result with transactions
     */
    async getTransactions(limit = 10, offset = 0) {
        const userId = window.CODEBANK_TRUSTED_USER_ID;
        if (!userId) return { success: false, error: 'Missing trusted user' };
        const { data, error } = await this.supabase.rpc('bankode_get_transactions', { p_user_id: userId, p_limit: limit, p_offset: offset });
        if (error) return { success: false, error: error.message };
        if (Array.isArray(data)) return { success: true, data };
        if (data && typeof data === 'object') return { success: true, data: Array.isArray(data.transactions) ? data.transactions : [] };
        return { success: true, data: [] };
    }

    /**
     * Mint assets (Admin only)
     * @param {string} userId - User ID to mint assets for
     * @param {string} currency - Currency type (codes, silver, gold)
     * @param {number} amount - Amount to mint
     * @param {string} reason - Reason for minting
     * @returns {Promise<Object>} RPC call result
     */
    async mintAssets(userId, currency, amount, reason = '') {
        const adminId = window.CODEBANK_TRUSTED_USER_ID;
        if (!adminId) return { success: false, error: 'Missing trusted user' };
        const userValidation = this.validators.validateUserId(userId);
        const currencyValidation = this.validators.validateCurrency(currency);
        const amountValidation = this.validators.validateAmount(amount, 0.01);
        if (!userValidation) return { success: false, error: 'Invalid user ID' };
        if (!currencyValidation) return { success: false, error: 'Invalid currency type' };
        if (!amountValidation.isValid) return { success: false, error: amountValidation.message };
        const { data, error } = await this.supabase.rpc('bankode_mint_assets', { p_admin_id: adminId, p_user_id: userId, p_currency: currency, p_amount: amountValidation.value, p_reason: reason });
        if (error) return { success: false, error: error.message };
        return { success: true, data };
    }

    /**
     * Admin adjust balance
     * @param {string} userId - User ID to adjust balance for
     * @param {string} currency - Currency type (codes, silver, gold)
     * @param {number} amount - Amount to adjust (can be negative)
     * @param {string} reason - Reason for adjustment
     * @returns {Promise<Object>} RPC call result
     */
    async adminAdjust(userId, currency, amount, reason = '') {
        const adminId = window.CODEBANK_TRUSTED_USER_ID;
        if (!adminId) return { success: false, error: 'Missing trusted user' };
        const userValidation = this.validators.validateUserId(userId);
        const currencyValidation = this.validators.validateCurrency(currency);
        const amountValidation = this.validators.validateAmount(amount);
        if (!userValidation) return { success: false, error: 'Invalid user ID' };
        if (!currencyValidation) return { success: false, error: 'Invalid currency type' };
        if (!amountValidation.isValid) return { success: false, error: amountValidation.message };
        const { data, error } = await this.supabase.rpc('bankode_admin_adjust', { p_admin_id: adminId, p_user_id: userId, p_currency: currency, p_amount: amountValidation.value, p_reason: reason });
        if (error) return { success: false, error: error.message };
        return { success: true, data };
    }

    /**
     * Create audit log entry
     * @param {string} action - Action performed
     * @param {string} details - Details about the action
     * @param {string} severity - Severity level (info, warning, error)
     * @returns {Promise<Object>} RPC call result
     */
    async createAudit(action, details = '', severity = 'info') {
        const userId = window.CODEBANK_TRUSTED_USER_ID;
        if (!userId) return { success: false, error: 'Missing trusted user' };
        const { data, error } = await this.supabase.rpc('bankode_create_audit', { p_user_id: userId, p_action: action, p_details: details, p_severity: severity });
        if (error) return { success: false, error: error.message };
        return { success: true, data };
    }
}

// Initialize and export RPC instance
window.BankodeRPC = new BankodeRPC();
