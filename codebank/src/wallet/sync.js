// Minimal TransactionSync stub for codebank
export const TransactionSync = {
    async syncPendingTransactions() {
        console.log('TransactionSync.syncPendingTransactions() called (stub)');
        return Promise.resolve();
    }
};

export default TransactionSync;