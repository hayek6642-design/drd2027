
import crypto from 'crypto';

export const AssetLocker = {
    /**
     * Generate a secure Lock ID
     */
    generateLockId() {
        return `lock_${crypto.randomBytes(8).toString('hex')}`;
    },

    /**
     * Verify if a lock ID is valid format (basic check)
     */
    isValidLockId(lockId) {
        return typeof lockId === 'string' && lockId.startsWith('lock_');
    }
};
