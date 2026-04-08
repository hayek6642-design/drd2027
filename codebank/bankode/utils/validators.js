// Bankode Dashboard - Validation Functions
// Input validation and security checks

class BankodeValidators {
    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid
     */
    static validateEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email.trim());
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {Object} Validation result with isValid and message
     */
    static validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { isValid: false, message: 'Password is required' };
        }

        const minLength = window.BankodeConfig?.SECURITY?.PASSWORD_MIN_LENGTH || 8;
        const maxLength = window.BankodeConfig?.SECURITY?.PASSWORD_MAX_LENGTH || 64;

        if (password.length < minLength) {
            return { isValid: false, message: `Password must be at least ${minLength} characters` };
        }

        if (password.length > maxLength) {
            return { isValid: false, message: `Password must be less than ${maxLength} characters` };
        }

        // Check for common weak patterns
        const weakPatterns = ['123456', 'password', 'qwerty', '111111', 'admin'];
        const isWeak = weakPatterns.some(pattern =>
            password.toLowerCase().includes(pattern)
        );

        if (isWeak) {
            return { isValid: false, message: 'Password is too common or weak' };
        }

        return { isValid: true, message: 'Password is valid' };
    }

    /**
     * Validate numeric amount
     * @param {*} amount - Amount to validate
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {Object} Validation result
     */
    static validateAmount(amount, min = 0, max = Infinity) {
        if (amount === undefined || amount === null || amount === '') {
            return { isValid: false, message: 'Amount is required' };
        }

        const num = Number(amount);
        if (isNaN(num)) {
            return { isValid: false, message: 'Amount must be a valid number' };
        }

        if (num < min) {
            return { isValid: false, message: `Amount must be at least ${min}` };
        }

        if (num > max) {
            return { isValid: false, message: `Amount must be less than ${max}` };
        }

        return { isValid: true, message: 'Amount is valid', value: num };
    }

    /**
     * Validate currency type
     * @param {string} currency - Currency to validate
     * @returns {boolean} True if valid
     */
    static validateCurrency(currency) {
        const validCurrencies = ['codes', 'silver', 'gold'];
        return validCurrencies.includes(currency?.toLowerCase());
    }

    /**
     * Validate user ID
     * @param {string} userId - User ID to validate
     * @returns {boolean} True if valid
     */
    static validateUserId(userId) {
        if (!userId || typeof userId !== 'string') return false;
        // UUID format validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(userId);
    }

    /**
     * Validate transaction data
     * @param {Object} transaction - Transaction data
     * @returns {Object} Validation result
     */
    static validateTransaction(transaction) {
        if (!transaction) {
            return { isValid: false, message: 'Transaction data is required' };
        }

        const requiredFields = ['user_id', 'amount', 'currency', 'type'];
        const missingFields = requiredFields.filter(field => !transaction[field]);

        if (missingFields.length > 0) {
            return {
                isValid: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            };
        }

        const amountValidation = this.validateAmount(transaction.amount, 0.01);
        if (!amountValidation.isValid) {
            return amountValidation;
        }

        const currencyValidation = this.validateCurrency(transaction.currency);
        if (!currencyValidation) {
            return { isValid: false, message: 'Invalid currency type' };
        }

        return { isValid: true, message: 'Transaction data is valid' };
    }

    /**
     * Sanitize input to prevent XSS
     * @param {string} input - Input to sanitize
     * @returns {string} Sanitized input
     */
    static sanitizeInput(input) {
        if (!input || typeof input !== 'string') return '';
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Validate bank code format
     * @param {string} bankCode - Bank code to validate
     * @returns {Object} Validation result with isValid and message
     */
    static validateBankCode(bankCode) {
        // Handle null, undefined, or non-string input
        if (!bankCode) {
            return { isValid: false, message: 'Bank code is required' };
        }

        if (typeof bankCode !== 'string') {
            return { isValid: false, message: 'Bank code must be a string' };
        }

        const trimmed = bankCode.trim();

        // Length between 8 and 12 characters
        if (trimmed.length < 8 || trimmed.length > 12) {
            return { isValid: false, message: 'Bank code must be 8-12 characters long' };
        }

        // Alphanumeric only
        const alphanumeric = /^[a-zA-Z0-9]+$/;
        if (!alphanumeric.test(trimmed)) {
            return { isValid: false, message: 'Bank code must be alphanumeric' };
        }

        // Must contain at least one letter and one number
        const hasLetter = /[a-zA-Z]/.test(trimmed);
        const hasNumber = /[0-9]/.test(trimmed);
        if (!hasLetter || !hasNumber) {
            return { isValid: false, message: 'Bank code must contain at least one letter and one number' };
        }

        return { isValid: true, message: 'Bank code is valid' };
    }

    /**
     * Validate Bankode password format
     * @param {string} password - Bankode password to validate
     * @returns {Object} Validation result
     */
    static validateBankodePassword(password) {
        if (!password || typeof password !== 'string') {
            return { isValid: false, message: 'Bankode password is required' };
        }

        // Bankode passwords should be alphanumeric and 6-32 characters
        const re = /^[a-zA-Z0-9]{6,32}$/;
        if (!re.test(password)) {
            return { isValid: false, message: 'Bankode password must be 6-32 alphanumeric characters' };
        }

        return { isValid: true, message: 'Bankode password is valid' };
    }

    /**
     * Check if user is admin
     * @param {Object} user - User object
     * @returns {boolean} True if admin
     */
    static isAdmin(user) {
        return user?.app_metadata?.role === 'admin' ||
               user?.user_metadata?.is_admin === true;
    }
}

// Export validators
window.BankodeValidators = BankodeValidators;
