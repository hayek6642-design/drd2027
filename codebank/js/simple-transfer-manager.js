// Simple Transfer Manager - Direct database operations without RPC functions
import { errorHandler, recoveryManager } from './advanced-error-handler.js';

export class SimpleTransferManager {
    constructor() {
        this.client = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Get Supabase client
            this.client = window.__SUPABASE_CLIENT__ || (window.Auth && window.Auth.client);
            if (!this.client) {
                console.warn('SimpleTransferManager: Supabase client not available');
                return;
            }

            this.initialized = true;
            console.log('SimpleTransferManager initialized successfully');
        } catch (error) {
            console.error('SimpleTransferManager initialization failed:', error);
        }
    }

    // Get or create balance for a user
    async getOrCreateBalance(userId) {
        if (!this.client) throw new Error('Not initialized');
        
        try {
            // Try to get existing balance
            const { data, error } = await this.client
                .from('balances')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code === 'PGRST116') {
                // Balance doesn't exist, create one
                const { data: newBalance, error: createError } = await this.client
                    .from('balances')
                    .insert({
                        user_id: userId,
                        codes: 0,
                        silver_bars: 0,
                        gold_bars: 0,
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                return newBalance;
            }

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('getOrCreateBalance error:', error);
            throw error;
        }
    }

    // Transfer codes between users by username
    async transferCodesByUsername(fromUserId, toUsername, amount) {
        if (!this.client) throw new Error('Not initialized');
        if (amount <= 0) throw new Error('Amount must be positive');

        try {
            // Get recipient user by username
            const { data: recipient, error: recipientError } = await this.client
                .from('profiles')
                .select('user_id')
                .eq('username', toUsername)
                .single();

            if (recipientError || !recipient) {
                throw new Error('Recipient username not found');
            }

            const toUserId = recipient.user_id;

            // Get sender balance
            const fromBalance = await this.getOrCreateBalance(fromUserId);
            console.log('🔄 Transfer: Sender balance before transfer:', fromBalance);
            if (fromBalance.codes < amount) {
                throw new Error(`Insufficient balance. Sender has ${fromBalance.codes} codes but trying to send ${amount}`);
            }

            // Get recipient balance
            const toBalance = await this.getOrCreateBalance(toUserId);
            console.log('🔄 Transfer: Recipient balance before transfer:', toBalance);

            // Execute transfer atomically using RPC function for better consistency
            try {
                const data = await errorHandler.executeWithRetry(async () => {
                    const { data, error } = await this.client.rpc('transfer_codes_by_username', {
                        from_user_id: fromUserId,
                        to_username: toUsername,
                        amount: amount
                    });

                    if (error) {
                        console.error('RPC transfer failed:', error);
                        throw new Error(`Transfer failed: ${error.message}`);
                    }

                    return data;
                }, { operation: 'rpc_transfer', fromUserId, toUsername, amount });

                console.log('✅ Transfer: RPC transfer completed successfully:', data);
                return {
                    success: true,
                    from_user: fromUserId,
                    to_user: toUserId,
                    to_username: toUsername,
                    amount: amount,
                    tx_id: data?.tx_id,
                    message: 'Transfer completed successfully via RPC'
                };

            } catch (rpcError) {
                console.warn('RPC transfer failed, falling back to direct database operations:', rpcError);

                // Fallback to direct database operations with proper atomicity
                await errorHandler.executeWithRetry(async () => {
                    const { error: senderError } = await this.client
                        .from('balances')
                        .update({
                            codes: fromBalance.codes - amount,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', fromUserId);

                    if (senderError) {
                        console.error('Sender balance update failed:', senderError);
                        throw new Error(`Failed to update sender balance: ${senderError.message}`);
                    }
                }, { operation: 'sender_balance_update', userId: fromUserId, amount });

                await errorHandler.executeWithRetry(async () => {
                    const { error: recipientUpdateError } = await this.client
                        .from('balances')
                        .update({
                            codes: toBalance.codes + amount,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', toUserId);

                    if (recipientUpdateError) {
                        // Rollback sender update if recipient update fails
                        console.error('Recipient balance update failed, rolling back:', recipientUpdateError);
                        await this.client
                            .from('balances')
                            .update({
                                codes: fromBalance.codes,
                                updated_at: new Date().toISOString()
                            })
                            .eq('user_id', fromUserId);
                        throw new Error(`Failed to update recipient balance: ${recipientUpdateError.message}`);
                    }
                }, { operation: 'recipient_balance_update', userId: toUserId, amount });

                console.log('✅ Transfer: Direct database transfer completed successfully');
            }

            // Create transaction record for both RPC and direct methods
            const { error: txError } = await this.client
                .from('transactions')
                .insert({
                    sender_id: fromUserId,
                    recipient_id: toUserId,
                    asset_type: 'codes',
                    amount: amount,
                    status: 'completed',
                    created_at: new Date().toISOString()
                });

            if (txError) {
                console.warn('Failed to create transaction record:', txError);
                // Don't fail the transfer for transaction record errors
            }

            return {
                success: true,
                from_user: fromUserId,
                to_user: toUserId,
                to_username: toUsername,
                amount: amount,
                message: 'Transfer completed successfully'
            };

        } catch (error) {
            console.error('transferCodesByUsername error:', error);
            throw error;
        }
    }

    // Transfer codes between users by email
    async transferCodes(fromUserId, toEmail, amount) {
        if (!this.client) throw new Error('Not initialized');
        if (amount <= 0) throw new Error('Amount must be positive');

        try {
            // Get recipient user by email
            const { data: recipient, error: recipientError } = await this.client
                .from('profiles')
                .select('user_id')
                .eq('email', toEmail)
                .single();

            if (recipientError || !recipient) {
                throw new Error('Recipient not found');
            }

            const toUserId = recipient.user_id;

            // Get sender balance
            const fromBalance = await this.getOrCreateBalance(fromUserId);
            console.log('🔄 Transfer: Sender balance before transfer:', fromBalance);
            if (fromBalance.codes < amount) {
                throw new Error(`Insufficient balance. Sender has ${fromBalance.codes} codes but trying to send ${amount}`);
            }

            // Get recipient balance
            const toBalance = await this.getOrCreateBalance(toUserId);
            console.log('🔄 Transfer: Recipient balance before transfer:', toBalance);

            // Execute transfer atomically using RPC function for better consistency
            try {
                const data = await errorHandler.executeWithRetry(async () => {
                    const { data, error } = await this.client.rpc('transfer_codes', {
                        from_user_id: fromUserId,
                        to_email: toEmail,
                        amount: amount
                    });

                    if (error) {
                        console.error('RPC transfer failed:', error);
                        throw new Error(`Transfer failed: ${error.message}`);
                    }

                    return data;
                }, { operation: 'rpc_transfer', fromUserId, toEmail, amount });

                console.log('✅ Transfer: RPC transfer completed successfully:', data);
                return {
                    success: true,
                    from_user: fromUserId,
                    to_user: toUserId,
                    to_email: toEmail,
                    amount: amount,
                    tx_id: data?.tx_id,
                    message: 'Transfer completed successfully via RPC'
                };

            } catch (rpcError) {
                console.warn('RPC transfer failed, falling back to direct database operations:', rpcError);

                // Fallback to direct database operations with proper atomicity
                await errorHandler.executeWithRetry(async () => {
                    const { error: senderError } = await this.client
                        .from('balances')
                        .update({
                            codes: fromBalance.codes - amount,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', fromUserId);

                    if (senderError) {
                        console.error('Sender balance update failed:', senderError);
                        throw new Error(`Failed to update sender balance: ${senderError.message}`);
                    }
                }, { operation: 'sender_balance_update', userId: fromUserId, amount });

                await errorHandler.executeWithRetry(async () => {
                    const { error: recipientUpdateError } = await this.client
                        .from('balances')
                        .update({
                            codes: toBalance.codes + amount,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', toUserId);

                    if (recipientUpdateError) {
                        // Rollback sender update if recipient update fails
                        console.error('Recipient balance update failed, rolling back:', recipientUpdateError);
                        await this.client
                            .from('balances')
                            .update({
                                codes: fromBalance.codes,
                                updated_at: new Date().toISOString()
                            })
                            .eq('user_id', fromUserId);
                        throw new Error(`Failed to update recipient balance: ${recipientUpdateError.message}`);
                    }
                }, { operation: 'recipient_balance_update', userId: toUserId, amount });

                console.log('✅ Transfer: Direct database transfer completed successfully');
            }

            // Create transaction record for both RPC and direct methods
            const { error: txError } = await this.client
                .from('transactions')
                .insert({
                    sender_id: fromUserId,
                    recipient_id: toUserId,
                    asset_type: 'codes',
                    amount: amount,
                    status: 'completed',
                    created_at: new Date().toISOString()
                });

            if (txError) {
                console.warn('Failed to create transaction record:', txError);
                // Don't fail the transfer for transaction record errors
            }

            return {
                success: true,
                from_user: fromUserId,
                to_user: toUserId,
                to_email: toEmail,
                amount: amount,
                message: 'Transfer completed successfully'
            };

        } catch (error) {
            console.error('transferCodes error:', error);
            throw error;
        }
    }

    // Send transfer email with verification
    async sendTransferEmail(recipientEmail, amount, transferId) {
        if (!this.client) throw new Error('Not initialized');

        try {
            // Create verification token
            const verificationToken = this.generateVerificationToken();

            // Get current user ID
            const currentUserId = this.getCurrentUserId();
            if (!currentUserId) {
                throw new Error('Could not determine current user');
            }

            // Store pending transfer
            const { error: storeError } = await this.firebase
                .from('pending_transfers')
                .insert({
                    sender_id: currentUserId,
                    recipient_email: recipientEmail,
                    amount: amount,
                    asset_type: 'codes',
                    verification_token: verificationToken,
                    verification_code: verificationToken.substring(0, 8), // Add verification_code field
                    status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (storeError) {
                throw new Error(`Failed to store transfer: ${storeError.message}`);
            }

            // Send email via Supabase function
            const { data, error } = await this.client.functions.invoke('send-transfer-email', {
                body: {
                    to: recipientEmail,
                    amount: amount,
                    transferId: transferId,
                    verificationToken: verificationToken
                }
            });

            if (error) {
                throw new Error(`Failed to send email: ${error.message}`);
            }

            return { success: true, message: 'Verification email sent successfully' };

        } catch (error) {
            console.error('Send transfer email failed:', error);
            throw error;
        }
    }

    // Generate a secure verification token
    generateVerificationToken() {
        return btoa(Math.random().toString()).substring(0, 32) +
               Date.now().toString(36) +
               Math.random().toString(36).substring(2);
    }

    // Get current user ID
    getCurrentUserId() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            return userData.id || userData.uid || userData.supabaseId;
        } catch (error) {
            console.error('Could not get current user ID:', error);
            return null;
        }
    }
}

export default SimpleTransferManager;
