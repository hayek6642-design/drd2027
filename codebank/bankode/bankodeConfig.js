/**
 * Bankode Configuration - Supabase Client Integration
 * This file provides Bankode-specific configuration using Supabase CDN
 */

// Bankode-specific configuration
const BANKODE_CONFIG = {
    // RPC Function Names
    RPC_FUNCTIONS: {
        VERIFY_PASSWORD: 'bankode_verify_password',
        SET_PASSWORD: 'bankode_set_password',
        GET_BALANCES: 'bankode_get_balances',
        GET_TRANSACTIONS: 'bankode_get_transactions',
        ADD_REWARD: 'bankode_add_reward',
        REMOVE_REWARD: 'bankode_remove_reward',
        VALIDATE_WALLET: 'bankode_validate_wallet',
        UPDATE_BALANCE: 'bankode_update_balance',
        MINT_ASSETS: 'bankode_mint_assets',
        ADMIN_ADJUST: 'bankode_admin_adjust',
        CREATE_AUDIT: 'bankode_create_audit'
    },

    // Table Names (Bankode-exclusive tables)
    TABLES: {
        USERS: 'auth.users',  // Auth users table
        BANKODE_USERS: 'bankode_users',  // Bankode users only
        BANKODE_BALANCES: 'bankode_balances',  // Bankode balances only
        BANKODE_REWARDS: 'bankode_rewards',  // Bankode rewards only
        BANKODE_TRANSACTIONS: 'bankode_transactions',  // Bankode transactions only
        AUTH: 'bankode_auth',  // Bankode authentication only
        AUDIT: 'bankode_audit',  // Bankode audit logs only
        ADMIN_ACTIONS: 'bankode_admin_actions'  // Bankode admin actions only
    },

    // Storage Configuration
    STORAGE: {
        ASSETS_BUCKET: 'bankode-assets',
        AVATARS_BUCKET: 'user-avatars'
    },

    // Security Settings
    SECURITY: {
        PASSWORD_MIN_LENGTH: 8,
        PASSWORD_MAX_LENGTH: 64,
        SESSION_TIMEOUT_MINUTES: 30,
        MAX_FAILED_ATTEMPTS: 5
    }
};

// Export configuration for other modules
window.BankodeConfig = BANKODE_CONFIG;