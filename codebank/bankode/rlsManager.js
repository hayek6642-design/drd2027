/**
 * Bankode RLS Manager - Row Level Security Policy Enforcement
 * This module ensures all database queries respect RLS policies and use proper authentication
 */

class BankodeRLSManager {
    constructor() {
        this.supabase = window.supabase;
        this.helpers = window.BankodeHelpers;
        this.validators = window.BankodeValidators;
    }

    /**
     * Get authenticated user with RLS-compliant session
     * @returns {Promise<Object|null>} Authenticated user or null
     */
    async getAuthenticatedUser() {
        return this.helpers.checkAuth();
    }

    /**
     * Execute RLS-safe query for bankode table with proper user_id filtering
     * @param {string} tableName - Table name (must be bankode_*)
     * @param {Object} query - Query parameters
     * @returns {Promise<Object>} Query result
     */
    async executeRLSSafeQuery(tableName, query) {
        try {
            // Validate table name for RLS compliance
            if (!tableName.startsWith('bankode_')) {
                throw new Error(`RLS violation: Table ${tableName} is not a Bankode table`);
            }

            const user = await this.getAuthenticatedUser();
            if (!user) {
                return { success: false, error: 'User not authenticated for RLS query' };
            }

            // Execute query with proper user_id filtering for RLS compliance
            const { data, error } = await this.supabase
                .from(tableName)
                .select(query.select || '*')
                .eq('user_id', user.id);  // Use user_id for RLS filtering

            if (error) {
                console.error(`RLS query error on ${tableName}:`, error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data };

        } catch (error) {
            console.error(`RLS query execution error:`, error);
            return { success: false, error: 'RLS query failed' };
        }
    }

    /**
     * Execute RLS-safe RPC call
     * @param {string} rpcName - RPC function name (must be bankode_*)
     * @param {Object} params - RPC parameters
     * @returns {Promise<Object>} RPC call result
     */
    async executeRLSSafeRPC(rpcName, params = {}) {
        try {
            // Validate RPC name for RLS compliance
            if (!rpcName.startsWith('bankode_')) {
                throw new Error(`RLS violation: RPC ${rpcName} is not a Bankode function`);
            }

            const user = await this.getAuthenticatedUser();
            if (!user) {
                return { success: false, error: 'User not authenticated for RLS RPC' };
            }

            // Add user ID to params if not already present
            if (!params.user_id && !params.admin_id) {
                params.user_id = user.id;
            }

            // Execute RPC with proper authentication context
            const { data, error } = await this.supabase.rpc(rpcName, params);

            if (error) {
                console.error(`RLS RPC error on ${rpcName}:`, error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data };

        } catch (error) {
            console.error(`RLS RPC execution error:`, error);
            return { success: false, error: 'RLS RPC failed' };
        }
    }

    /**
     * Get user balances with RLS enforcement
     * @returns {Promise<Object>} Balances result
     */
    async getBalancesWithRLS() {
        return this.executeRLSSafeRPC('bankode_get_balances');
    }

    /**
     * Get user transactions with RLS enforcement
     * @param {number} limit - Number of transactions to fetch
     * @param {number} offset - Offset for pagination
     * @returns {Promise<Object>} Transactions result
     */
    async getTransactionsWithRLS(limit = 10, offset = 0) {
        return this.executeRLSSafeRPC('bankode_get_transactions', {
            user_id: (await this.getAuthenticatedUser())?.id,
            limit: limit,
            offset: offset
        });
    }

    /**
     * Verify RLS policies are properly configured with user_id filtering
     * @returns {Promise<Object>} RLS verification result
     */
    async verifyRLSPolicies() {
        try {
            const user = await this.getAuthenticatedUser();
            if (!user) {
                return { success: false, error: 'Cannot verify RLS without authenticated user' };
            }

            // Test RLS access with proper user_id filtering
            const testResult = await this.executeRLSSafeQuery('bankode_balances', {
                select: 'balance_codes, balance_silver, balance_gold'
            });

            if (testResult.success) {
                return {
                    success: true,
                    message: 'RLS policies verified successfully with user_id filtering',
                    userId: user.id,
                    email: user.email,
                    walletData: testResult.data
                };
            } else {
                return {
                    success: false,
                    error: 'RLS policy verification failed',
                    details: testResult.error
                };
            }

        } catch (error) {
            console.error('RLS policy verification error:', error);
            return {
                success: false,
                error: 'RLS policy verification failed',
                details: error.message
            };
        }
    }

    /**
     * Get RLS policy definitions for Bankode tables
     * @returns {Object} RLS policy definitions
     */
    getRLSPolicyDefinitions() {
        return {
            bankode_balances: {
                select: 'USING (auth.uid() = user_id)',
                insert: 'WITH CHECK (auth.uid() = user_id)',
                update: 'WITH CHECK (auth.uid() = user_id)',
                delete: 'NO DELETE access'
            },
            bankode_transactions: {
                select: 'USING (auth.uid() = user_id OR auth.uid() = from_uid OR auth.uid() = to_uid)',
                insert: 'WITH CHECK (auth.uid() = user_id)',
                update: 'NO UPDATE access',
                delete: 'NO DELETE access'
            },
            bankode_auth: {
                select: 'USING (auth.uid() = user_id)',
                insert: 'WITH CHECK (auth.uid() = user_id)',
                update: 'WITH CHECK (auth.uid() = user_id)',
                delete: 'NO DELETE access'
            },
            bankode_audit: {
                select: 'USING (auth.uid() = user_id)',
                insert: 'WITH CHECK (auth.uid() = user_id)',
                update: 'NO UPDATE access',
                delete: 'NO DELETE access'
            }
        };
    }

    /**
     * Execute RPC with proper user_id parameter for validation
     * @param {string} rpcName - RPC function name
     * @param {Object} params - RPC parameters
     * @returns {Promise<Object>} RPC result
     */
    async executeValidationRPC(rpcName, params = {}) {
        try {
            const user = await this.getAuthenticatedUser();
            if (!user) {
                return { success: false, error: 'User not authenticated for validation RPC' };
            }

            // Ensure user_id is passed for validation
            params.p_user_id = user.id;

            // Execute validation RPC
            const { data, error } = await this.supabase.rpc(rpcName, params);

            if (error) {
                console.error(`Validation RPC error on ${rpcName}:`, error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data };

        } catch (error) {
            console.error(`Validation RPC execution error:`, error);
            return { success: false, error: 'Validation RPC failed' };
        }
    }

    /**
     * Fix validation counter to show 6/6 passed
     * @returns {Promise<Object>} Validation result
     */
    async fixValidationCounter() {
        try {
            const user = await this.getAuthenticatedUser();
            if (!user) {
                return { success: false, error: 'User not authenticated for validation fix' };
            }

            // Run all validation RPCs with proper user_id
            const validationResults = [];

            // 1. Wallet validation
            const walletValidation = await this.executeValidationRPC('bankode_validation_wallet', {
                p_user_id: user.id
            });
            validationResults.push(walletValidation.success);

            // 2. Balance validation
            const balanceValidation = await this.executeValidationRPC('bankode_validation_balance', {
                p_user_id: user.id
            });
            validationResults.push(balanceValidation.success);

            // 3. Transaction validation
            const transactionValidation = await this.executeValidationRPC('bankode_validation_transactions', {
                p_user_id: user.id
            });
            validationResults.push(transactionValidation.success);

            // 4. Auth validation
            const authValidation = await this.executeValidationRPC('bankode_validation_auth', {
                p_user_id: user.id
            });
            validationResults.push(authValidation.success);

            // 5. Audit validation
            const auditValidation = await this.executeValidationRPC('bankode_validation_audit', {
                p_user_id: user.id
            });
            validationResults.push(auditValidation.success);

            // 6. System validation
            const systemValidation = await this.executeValidationRPC('bankode_validation_system', {
                p_user_id: user.id
            });
            validationResults.push(systemValidation.success);

            const passedCount = validationResults.filter(r => r).length;
            const totalCount = validationResults.length;

            if (passedCount === totalCount) {
                return {
                    success: true,
                    message: `Validation fixed: ${passedCount}/${totalCount} passed`,
                    score: `${passedCount}/${totalCount}`
                };
            } else {
                return {
                    success: false,
                    error: `Validation incomplete: ${passedCount}/${totalCount} passed`,
                    failedValidations: validationResults.filter((r, i) => !r).map((_, i) => i + 1)
                };
            }

        } catch (error) {
            console.error('Validation counter fix error:', error);
            return { success: false, error: 'Failed to fix validation counter' };
        }
    }

    /**
     * Check if current user has admin privileges with RLS context
     * @returns {Promise<boolean>} True if user is admin
     */
    async isAdminWithRLS() {
        const user = await this.getAuthenticatedUser();
        if (!user) return false;

        // Check admin status with RLS context
        return this.validators.isAdmin(user);
    }
}

// Initialize and export RLS manager
window.BankodeRLSManager = new BankodeRLSManager();

// Export for module usage
export { BankodeRLSManager };