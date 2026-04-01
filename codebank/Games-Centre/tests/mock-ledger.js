/**
 * Mock Ledger Kernel for Testing
 */
export const ledgerKernel = {
    appendTransaction: async (tx) => {
        console.log('[MockLedger] Appending transaction:', tx);
        return { success: true, transactionId: 'mock_tx_' + Date.now() };
    },

    getHistory: async (userId) => {
        return [];
    }
};
