// Bankode Dashboard - Formatting Functions
// Functions for formatting numbers, dates, and other data

class BankodeFormatters {
    /**
     * Format number as currency
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency symbol (default: '')
     * @param {number} decimals - Number of decimal places (default: 2)
     * @returns {string} Formatted currency string
     */
    static formatCurrency(amount, currency = '', decimals = 2) {
        if (amount === undefined || amount === null) return '0';

        const num = Number(amount);
        if (isNaN(num)) return '0';

        const options = {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        };

        const formatted = num.toLocaleString(undefined, options);

        if (currency) {
            return `${currency}${formatted}`;
        }

        return formatted;
    }

    /**
     * Format number with abbreviations (K, M, B)
     * @param {number} num - Number to format
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted number with abbreviation
     */
    static formatNumberWithAbbreviation(num, decimals = 2) {
        if (num === undefined || num === null) return '0';
        if (isNaN(num)) return '0';

        const absNum = Math.abs(num);
        let formatted;

        if (absNum >= 1e9) {
            formatted = (num / 1e9).toFixed(decimals) + 'B';
        } else if (absNum >= 1e6) {
            formatted = (num / 1e6).toFixed(decimals) + 'M';
        } else if (absNum >= 1e3) {
            formatted = (num / 1e3).toFixed(decimals) + 'K';
        } else {
            formatted = num.toFixed(decimals);
        }

        return formatted;
    }

    /**
     * Format transaction type
     * @param {string} type - Transaction type
     * @returns {string} Formatted type with icon
     */
    static formatTransactionType(type) {
        const typeMap = {
            deposit: { text: 'Deposit', icon: 'fas fa-arrow-down text-green-500', class: 'text-green-500' },
            withdrawal: { text: 'Withdrawal', icon: 'fas fa-arrow-up text-red-500', class: 'text-red-500' },
            transfer: { text: 'Transfer', icon: 'fas fa-exchange-alt text-blue-500', class: 'text-blue-500' },
            mint: { text: 'Mint', icon: 'fas fa-coins text-yellow-500', class: 'text-yellow-500' },
            burn: { text: 'Burn', icon: 'fas fa-fire text-orange-500', class: 'text-orange-500' },
            admin: { text: 'Admin Adjust', icon: 'fas fa-user-shield text-purple-500', class: 'text-purple-500' }
        };

        const format = typeMap[type?.toLowerCase()] || {
            text: type || 'Unknown',
            icon: 'fas fa-question-circle text-gray-500',
            class: 'text-gray-500'
        };

        return `<i class="${format.icon} mr-1"></i><span class="${format.class}">${format.text}</span>`;
    }

    /**
     * Format transaction status
     * @param {string} status - Transaction status
     * @returns {string} Formatted status with badge
     */
    static formatTransactionStatus(status) {
        const statusMap = {
            completed: { text: 'Completed', class: 'bg-green-100 text-green-800' },
            pending: { text: 'Pending', class: 'bg-yellow-100 text-yellow-800' },
            failed: { text: 'Failed', class: 'bg-red-100 text-red-800' },
            processing: { text: 'Processing', class: 'bg-blue-100 text-blue-800' },
            cancelled: { text: 'Cancelled', class: 'bg-gray-100 text-gray-800' }
        };

        const format = statusMap[status?.toLowerCase()] || {
            text: status || 'Unknown',
            class: 'bg-gray-100 text-gray-800'
        };

        return `<span class="px-2 py-1 rounded-full text-xs font-medium ${format.class}">${format.text}</span>`;
    }

    /**
     * Format date for display
     * @param {Date|string} date - Date to format
     * @param {string} format - Format type (full, short, time)
     * @returns {string} Formatted date string
     */
    static formatDateForDisplay(date, format = 'full') {
        if (!date) return 'N/A';

        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid Date';

        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();

        switch (format) {
            case 'short':
                return isToday ? d.toLocaleTimeString() : d.toLocaleDateString();
            case 'time':
                return d.toLocaleTimeString();
            case 'full':
            default:
                return isToday
                    ? `Today at ${d.toLocaleTimeString()}`
                    : d.toLocaleString();
        }
    }

    /**
     * Format user name
     * @param {Object} user - User object
     * @returns {string} Formatted user name
     */
    static formatUserName(user) {
        if (!user) return 'Unknown User';

        return user.display_name ||
               user.username ||
               user.email ||
               user.id?.substring(0, 8) ||
               'Unknown User';
    }

    /**
     * Format balance change
     * @param {number} change - Balance change amount
     * @returns {string} Formatted change with color indication
     */
    static formatBalanceChange(change) {
        if (change === undefined || change === null) return '';

        const num = Number(change);
        if (isNaN(num)) return '';

        const sign = num >= 0 ? '+' : '';
        const color = num >= 0 ? 'text-green-500' : 'text-red-500';

        return `<span class="${color}">${sign}${this.formatCurrency(Math.abs(num))}</span>`;
    }

    /**
     * Format percentage change
     * @param {number} change - Percentage change
     * @returns {string} Formatted percentage with color
     */
    static formatPercentageChange(change) {
        if (change === undefined || change === null) return '';

        const num = Number(change);
        if (isNaN(num)) return '';

        const sign = num >= 0 ? '+' : '';
        const color = num >= 0 ? 'text-green-500' : 'text-red-500';

        return `<span class="${color}">${sign}${num.toFixed(2)}%</span>`;
    }

    /**
     * Format currency symbol
     * @param {string} currency - Currency type
     * @returns {string} Currency symbol
     */
    static getCurrencySymbol(currency) {
        const symbols = {
            codes: '💻',
            silver: '🪙',
            gold: '🏆'
        };

        return symbols[currency?.toLowerCase()] || currency || '';
    }
}

// Export formatters
window.BankodeFormatters = BankodeFormatters;