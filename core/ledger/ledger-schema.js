
/**
 * Ledger Event Types
 * STRICTLY APPEND-ONLY.
 */
export const LEDGER_EVENTS = {
    GRANT: 'GRANT',       // System grants assets (Mint)
    LOCK: 'LOCK',         // Assets locked for potential spend
    RELEASE: 'RELEASE',   // Locked assets returned to available
    SPEND: 'SPEND',       // Locked assets actually spent (Burn/Transfer)
    TRANSFER: 'TRANSFER', // Direct P2P transfer (Future use)
    PENALTY: 'PENALTY'    // Admin/System deduction
};

export const ASSET_TYPES = {
    CODES: 'codes',
    BARS_SILVER: 'bars_silver',
    BARS_GOLD: 'bars_gold'
};
