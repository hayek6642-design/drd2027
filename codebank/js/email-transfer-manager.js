// EmailTransferManager - Handles email-based transactions and user lookup
export class EmailTransferManager {
    constructor() {
        this.client = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            this.client = window.__SUPABASE_CLIENT__ || (window.Auth && window.Auth.client);
            if (!this.client) {
                console.warn('EmailTransferManager: Supabase client not available');
                return;
            }

            this.initialized = true;
            console.log('EmailTransferManager initialized successfully');
        } catch (error) {
            console.error('EmailTransferManager initialization failed:', error);
        }
    }

    // Check URL for verification tokens and process them
    checkUrlForVerification() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('verification_token');
            const transferId = urlParams.get('transfer_id');

            if (token && transferId) {
                this.processEmailVerification(token, transferId);
            }
        } catch (error) {
            console.error('Error checking URL for verification:', error);
        }
    }

    // Process email verification for transfers
    async processEmailVerification(token, transferId) {
        try {
            if (!this.client) {
                throw new Error('EmailTransferManager not initialized');
            }

            // Verify the transfer and token
            const { data, error } = await this.client
                .from('pending_transfers')
                .select('*')
                .eq('id', transferId)
                .eq('verification_token', token)
                .single();

            if (error || !data) {
                throw new Error('Invalid or expired verification token');
            }

            // Mark transfer as verified and execute
            const { error: updateError } = await this.client
                .from('pending_transfers')
                .update({
                    status: 'verified',
                    verified_at: new Date().toISOString()
                })
                .eq('id', transferId);

            if (updateError) {
                throw new Error('Failed to verify transfer');
            }

            // Execute the actual transfer
            await this.executeTransfer(data);

            // Show success message
            this.showVerificationSuccess(data);

            // Clean URL
            this.cleanUrl();

        } catch (error) {
            console.error('Email verification failed:', error);
            this.showVerificationError(error.message);
        }
    }

    // Execute the actual transfer after verification
    async executeTransfer(transferData) {
        try {
            // Get recipient user by username (now stored in transferData)
            const { data: recipient, error: recipientError } = await this.client
                .from('profiles')
                .select('user_id')
                .eq('username', transferData.recipient_username)
                .single();

            if (recipientError || !recipient) {
                throw new Error('Recipient not found');
            }

            // Execute transfer using RPC (now using username)
            const { error: transferError } = await this.client.rpc('transfer_codes_by_username', {
                from_user_id: transferData.sender_id,
                to_username: transferData.recipient_username,
                amount: transferData.amount
            });

            if (transferError) {
                throw new Error(`Transfer failed: ${transferError.message}`);
            }

            // Update pending transfer status
            await this.client
                .from('pending_transfers')
                .update({ status: 'completed' })
                .eq('id', transferData.id);

        } catch (error) {
            console.error('Transfer execution failed:', error);
            throw error;
        }
    }

    // Show verification success message
    showVerificationSuccess(transferData) {
        const message = `✅ Transfer verified and completed! ${transferData.amount} codes sent to ${transferData.recipient_username}`;
        if (window.showToast) {
            window.showToast(message, 'success');
        } else {
            alert(message);
        }
    }

    // Show verification error message
    showVerificationError(message) {
        const errorMsg = `❌ Verification failed: ${message}`;
        if (window.showToast) {
            window.showToast(errorMsg, 'error');
        } else {
            alert(errorMsg);
        }
    }

    // Clean URL by removing verification parameters
    cleanUrl() {
        try {
            const url = new URL(window.location);
            url.searchParams.delete('verification_token');
            url.searchParams.delete('transfer_id');
            window.history.replaceState({}, document.title, url.pathname + url.hash);
        } catch (error) {
            console.warn('Could not clean URL:', error);
        }
    }

    // Send transfer email with verification link (now using username)
    async sendTransferEmail(recipientUsername, amount, transferId) {
        try {
            // Lookup recipient user by username
            const { data: recipient, error: recipientError } = await this.firebase
                .from('profiles')
                .select('user_id, email')
                .eq('username', recipientUsername)
                .single();

            if (recipientError || !recipient) {
                throw new Error('Recipient username not found');
            }

            // Create verification token
            const verificationToken = this.generateVerificationToken();

            // Store pending transfer using new function
            const { data: transferData, error: storeError } = await this.firebase.rpc('create_pending_transfer_by_username', {
                sender_id: this.getCurrentUserId(),
                recipient_username: recipientUsername,
                amount: amount,
                asset_type: 'codes'
            });

            if (storeError) {
                throw new Error(`Failed to store transfer: ${storeError.message}`);
            }

            // Send email via Supabase function (still send to recipient's email)
            const { data, error } = await this.firebase.functions.invoke('send-transfer-email', {
                body: {
                    to: recipient.email,
                    amount: amount,
                    transferId: transferData.transfer_id,
                    verificationToken: transferData.verification_token
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
            return userData.id || userData.uid || userData.firebaseId;
        } catch (error) {
            console.error('Could not get current user ID:', error);
            return null;
        }
    }
}

export default EmailTransferManager;
