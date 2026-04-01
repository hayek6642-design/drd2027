// transaction-system.js - Complete transaction system for user-to-user transfers
// This replaces the complex and error-prone transaction logic in buttons.js
// Safe Storage Integration for CodeBank Transaction System

import { EmailTransferManager } from './email-transfer-manager.js';
import { SimpleTransferManager } from './simple-transfer-manager.js';
import { errorHandler, recoveryManager } from './advanced-error-handler.js';
import { transactionMonitor } from './transaction-monitor.js';
import { transactionCache } from './transaction-cache.js';
import { securityManager } from './security-manager.js';
 

// Safe firebase client getter
const getSupabaseClient = () => {
  const client = window.__SUPABASE_CLIENT__;
  if (!client) {
    console.warn('Supabase client not available');
    return null;
  }
  return client;
};

 

// Function to refresh balances from Supabase with caching
async function refreshBalances(userId) {
    console.log('🔄 Transaction: Refreshing balances from Supabase for user:', userId);

    // Try cache first
    const cacheKey = `balance_${userId}`;
    const cachedBalance = await transactionCache.get(cacheKey, 'balance');

    if (cachedBalance) {
        console.log('🎯 Transaction: Using cached balance for user:', userId);
        updateBalanceDisplay(cachedBalance);
        return cachedBalance;
    }

    const client = getSupabaseClient();
    if (!client) {
      console.warn('Supabase client not available for refreshBalances');
      return;
    }

    try {
      const freshBalance = await errorHandler.executeWithRetry(async () => {
        const { data, error } = await client.from('balances').select('codes, silver_bars, gold_bars').eq('user_id', userId).single();
        if (error) {
          console.error('Failed to fetch balances:', error);
          // If no record exists, create one with current localStorage values
          if (error.code === 'PGRST116') {
            console.log('🔄 Transaction: No balance record found, creating one...');
            await createBalanceRecord(userId);
            return null;
          }
          throw error;
        }
        return data;
      }, { operation: 'balance_fetch', userId });

      if (freshBalance) {
        // Cache the fresh balance
        await transactionCache.setBalance(userId, freshBalance);

        // Update localStorage with Supabase values
        console.log('🔄 Transaction: Updating localStorage from Supabase:', freshBalance);
        safeStorage.set('asset-codes', String(freshBalance.codes || 0));
        safeStorage.set('asset-silver', String(freshBalance.silver_bars || 0));
        safeStorage.set('asset-gold', String(freshBalance.gold_bars || 0));
        safeStorage.set('asset-lastUpdated', new Date().toISOString());

        // Update DOM elements
        updateBalanceDisplay(freshBalance);

        console.log('✅ Transaction: Balances refreshed from Supabase successfully');
        return freshBalance;
      }
    } catch (e) {
      console.error('refreshBalances error:', e);
      transactionMonitor.recordError(e, 'balance_refresh', { userId });
    }

    return null;
  }

  // Helper function to update balance display elements
  function updateBalanceDisplay(balanceData) {
    // REMOVED: Do not update DOM counters directly
    // Single Source of Truth: All balance updates should go through 
    // This function is kept for backward compatibility but should not update DOM directly
  }

// Function to create initial balance record in Supabase
async function createBalanceRecord(userId) {
   const client = getSupabaseClient();
   if (!client) return;

   try {
     // Get current localStorage values
     const codes = parseInt(safeStorage.get('asset-codes') || '0', 10);
     const silverBars = parseInt(safeStorage.get('asset-silver') || '0', 10);
     const goldBars = parseInt(safeStorage.get('asset-gold') || '0', 10);

     const { data, error } = await client.from('balances').insert({
       user_id: userId,
       codes: codes,
       silver_bars: silverBars,
       gold_bars: goldBars
     }).select().single();

     if (error) {
       console.error('Failed to create balance record:', error);
       return;
     }

     console.log('✅ Transaction: Created initial balance record in Supabase:', data);
   } catch (e) {
     console.error('createBalanceRecord error:', e);
   }
 }

// Main transaction handler
export async function handleTransfer() {
   const sendButton = document.getElementById('send-button');
   if (!sendButton) {
     console.error('Send button not found');
     transactionMonitor.recordError(new Error('Send button not found'), 'ui_validation');
     return;
   }

   // Generate transaction ID for monitoring
   const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2)}`;
   transactionMonitor.recordTransactionStart(transactionId, 'transfer', {
     userAgent: navigator.userAgent,
     url: window.location.href
   });

   const startTime = Date.now();

   try {
     // Set loading state
     const originalText = sendButton.innerHTML;
     sendButton.disabled = true;
     sendButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Processing...';

     transactionMonitor.recordTransactionStep(transactionId, 'ui_update', { action: 'loading_state' });

    // Simplified authentication check using consolidated auth helper
    const currentUser = (typeof window !== 'undefined' && window.CODEBANK_USER) || null;

    // Validate and get form inputs
    const assetType = document.getElementById('asset-type').value;
    const amount = parseInt(document.getElementById('transfer-amount').value) || 0;
    const recipientUsername = document.getElementById('receiver-username').value?.trim();

    // Security validation
    const transactionData = {
      assetType,
      amount,
      toUsername: recipientUsername,
      timestamp: Date.now()
    };

    const securityValidation = securityManager.validateTransactionSecurity(transactionData, userData);
    if (!securityValidation.valid) {
      const securityError = new Error(`Security validation failed: ${securityValidation.issues.join(', ')}`);
      transactionMonitor.recordError(securityError, 'security_validation', { transactionData, userData });
      throw securityError;
    }

    // Rate limiting check
    if (!securityValidation.rateLimit.allowed) {
      const rateLimitError = new Error(securityValidation.rateLimit.reason);
      transactionMonitor.recordError(rateLimitError, 'rate_limit', { userId: userData.id });
      throw rateLimitError;
    }

    // Record audit trail
    securityManager.recordAuditEntry('transaction_initiated', {
      userId: userData.id,
      amount,
      toUsername: recipientUsername,
      assetType
    });

    // Comprehensive validation
    if (!amount || amount <= 0) {
      throw new Error('Please enter a valid amount greater than 0');
    }

    if (!recipientUsername) {
      throw new Error('Please enter recipient username');
    }

    // Username format validation (additional to security manager validation)
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(recipientUsername)) {
      throw new Error('Please enter a valid username (3-30 characters, letters, numbers, underscores only)');
    }

    if (assetType !== 'codes') {
      throw new Error('Only codes can be transferred currently');
    }

    // Get current user from centralized auth state manager
    const userData = currentUser;
    if (!userData?.id) {
      throw new Error('User context missing');
    }

    // Check current balance from localStorage (most up-to-date)
    const currentBalance = parseInt(safeStorage.get('asset-codes') || '0', 10);
    console.log('🔄 Transaction: Current balance from localStorage:', currentBalance);

    if (currentBalance < amount) {
      throw new Error(`Insufficient balance. You have ${currentBalance} codes but trying to send ${amount}`);
    }

    // Also verify with Supabase to ensure consistency
    try {
      const client = getSupabaseClient();
      if (client) {
        const result = await errorHandler.executeWithRetry(async () => {
          const { data: balanceData, error } = await client
            .from('balances')
            .select('codes')
            .eq('user_id', userData.id)
            .single();

          if (error) throw error;

          if (balanceData && balanceData.codes < amount) {
            throw new Error(`Insufficient balance in database. You have ${balanceData.codes} codes but trying to send ${amount}`);
          }

          return balanceData;
        }, { operation: 'balance_verification', userId: userData.id });

        console.log('🔄 Transaction: Supabase balance verified:', result?.codes);
      }
    } catch (dbError) {
      console.warn('Could not verify balance with Supabase:', dbError);
      // Continue with localStorage balance if Supabase check fails
    }

    // Initialize transfer managers
    let emailTransferManager;
    let simpleTransferManager;
    
    try {
      emailTransferManager = new EmailTransferManager();
      await emailTransferManager.initialize();
      console.log('EmailTransferManager initialized successfully');
    } catch (e) {
      console.warn('Could not load EmailTransferManager:', e);
      emailTransferManager = null;
    }
    
    try {
      simpleTransferManager = new SimpleTransferManager();
      await simpleTransferManager.initialize();
      console.log('SimpleTransferManager initialized successfully');
    } catch (e) {
      console.warn('Could not load SimpleTransferManager:', e);
      simpleTransferManager = null;
    }

    // Generate transfer ID (use UUID format for database compatibility)
    const transferId = crypto.randomUUID ? crypto.randomUUID() :
                      'transfer_' + Date.now() + '_' + Math.random().toString(36).substring(2);

    // Always use email transfer manager for now (safer approach)
    if (emailTransferManager) {
      // Use new username-based transfer system
      try {
        const result = await emailTransferManager.sendTransferEmail(recipientUsername, amount, transferId);

        // Record successful transaction in audit trail
        securityManager.recordAuditEntry('transaction_completed', {
          userId: userData.id,
          amount,
          toUsername: recipientUsername,
          assetType,
          method: 'email',
          transactionId
        });

        // Show success message
        const message = `✅ Transfer initiated! ${amount} codes will be sent to ${recipientUsername} after email verification.`;
        if (window.showToast) {
          window.showToast(message, 'success');
        } else {
          alert(message);
        }

        // Clear form
        document.getElementById('transfer-amount').value = '';
        document.getElementById('receiver-username').value = '';

        // Update balance immediately (optimistic update)
        const newBalance = currentBalance - amount;
        console.log('🔄 Transaction: Optimistic update - deducting', amount, 'codes from balance');

        // Update localStorage
        safeStorage.set('asset-codes', String(newBalance));

        // REMOVED: Do not update DOM counters directly

        // REMOVED: Do not update DOM counters directly

        // Trigger storage event for cross-tab synchronization
        const storageEvent = new StorageEvent('storage', {
          key: 'asset-codes',
          newValue: String(newBalance),
          oldValue: String(currentBalance),
          url: window.location.href
        });
        window.dispatchEvent(storageEvent);

        console.log('✅ Transaction: Optimistic balance update completed');
        transactionMonitor.recordTransactionComplete(transactionId, true, null, { method: 'email', amount, recipientUsername });

      } catch (emailError) {
        console.error('Email transfer failed:', emailError);
        transactionMonitor.recordError(emailError, 'email_transfer', { transactionId, amount, recipientUsername });
        transactionMonitor.recordTransactionComplete(transactionId, false, emailError);
        throw new Error(`Failed to send transfer email: ${emailError.message}`);
      }
    } else {
      // Fallback to direct transfer using RPC function
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Authentication system not ready. Please refresh and try again');
      }

      // Get session
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError || !sessionData?.session) {
        throw new Error('Session expired. Please sign in again');
      }

      // Try RPC function first, then fallback to direct operations
      let transferResult;

      try {
        // Try RPC function with retry logic
        transferResult = await errorHandler.executeWithRetry(async () => {
          const { data, error } = await client.rpc('transfer_codes_by_username', {
            from_user_id: userData.id,
            to_username: recipientUsername,
            amount: amount
          });

          if (error) throw error;
          return data;
        }, { operation: 'rpc_transfer', userId: userData.id, amount, toUsername: recipientUsername });
      } catch (rpcError) {
        console.warn('RPC transfer failed, trying direct method:', rpcError);

        // Attempt recovery before falling back
        const recovered = await recoveryManager.attemptRecovery(rpcError, {
          operation: 'rpc_transfer',
          userId: userData.id
        });

        if (simpleTransferManager) {
          try {
            // Use direct database operations with retry logic
            transferResult = await errorHandler.executeWithRetry(async () => {
              return await simpleTransferManager.transferCodesByUsername(userData.id, recipientUsername, amount);
            }, { operation: 'direct_transfer', userId: userData.id, amount, toUsername: recipientUsername });
          } catch (directError) {
            throw new Error(`Transfer failed: ${rpcError.message}. Direct method also failed: ${directError.message}`);
          }
        } else {
          throw new Error(`Transfer failed: ${rpcError.message}`);
        }
      }

      // Record successful transaction in audit trail
      securityManager.recordAuditEntry('transaction_completed', {
        userId: userData.id,
        amount,
        toUsername: recipientUsername,
        assetType,
        method: 'rpc',
        transactionId
      });

      // Show success
      const message = `✅ Transfer completed! ${amount} codes sent to ${recipientUsername}`;
      if (window.showToast) {
        window.showToast(message, 'success');
      } else {
        alert(message);
      }

      transactionMonitor.recordTransactionStep(transactionId, 'user_notification', { message, type: 'success' });

      // Clear form and update balance
      document.getElementById('transfer-amount').value = '';
      document.getElementById('receiver-username').value = '';

      // Refresh balances from Supabase to ensure consistency
      console.log('🔄 Transaction: Refreshing balances after transfer...');
      await refreshBalances(userData.id);

      transactionMonitor.recordTransactionComplete(transactionId, true, null, { method: 'rpc', amount, recipientUsername });

      // Sync updated balances to Supabase
      try {
        const client = getSupabaseClient();
        if (client) {
          const codes = parseInt(safeStorage.get('asset-codes') || '0', 10);
          const silverBars = parseInt(safeStorage.get('asset-silver') || '0', 10);
          const goldBars = parseInt(safeStorage.get('asset-gold') || '0', 10);

          await errorHandler.executeWithRetry(async () => {
            const { error } = await client.from('balances').upsert({
              user_id: userData.id,
              codes: codes,
              silver_bars: silverBars,
              gold_bars: goldBars,
              updated_at: new Date().toISOString()
            });

            if (error) throw error;
          }, { operation: 'balance_sync', userId: userData.id });

          console.log('✅ Transaction: Balances synced to Supabase after transfer');
        }
      } catch (syncError) {
        console.warn('Failed to sync balances to Supabase after transfer:', syncError);
      }
    }

  } catch (error) {
    console.error('Transfer error:', error);

    // Record error in monitoring system
    transactionMonitor.recordError(error, 'transfer', { transactionId, amount, recipientUsername });
    transactionMonitor.recordTransactionComplete(transactionId, false, error);

    // Enhanced error handling with specific error types and recovery suggestions
    let userMessage = 'Transfer failed: ';
    let errorType = 'error';
    let recoveryAction = null;

    if (error.message?.includes('Authentication system not initialized')) {
      userMessage += 'Please refresh the page and try again';
      recoveryAction = 'refresh';
    } else if (error.message?.includes('sign in') || error.message?.includes('Session expired')) {
      userMessage += 'Please sign in and try again';
      errorType = 'warning';
      recoveryAction = 'signin';
    } else if (error.message?.includes('insufficient')) {
      userMessage += 'You don\'t have enough codes for this transfer';
      errorType = 'warning';
    } else if (error.message?.includes('username')) {
      userMessage += 'Please check the username and try again';
      errorType = 'warning';
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      userMessage += 'Network error. Please check your connection and try again';
      errorType = 'warning';
      recoveryAction = 'retry';
    } else {
      userMessage += error.message || 'An unexpected error occurred';
    }

    // Show error with appropriate styling and recovery options
    if (window.showToast) {
      window.showToast(userMessage, errorType);

      // Add recovery action if applicable
      if (recoveryAction === 'refresh') {
        setTimeout(() => {
          if (window.showToast) {
            window.showToast('💡 Try refreshing the page to fix the issue', 'info');
          }
        }, 2000);
      } else if (recoveryAction === 'signin') {
        setTimeout(() => {
          const settingsBtn = document.getElementById('settings-btn');
          if (settingsBtn) {
            settingsBtn.classList.add('animate-bounce');
            setTimeout(() => settingsBtn.classList.remove('animate-bounce'), 3000);
          }
        }, 1000);
      }
    } else {
      alert(userMessage);
    }
  } finally {
    // Record performance metrics
    const endTime = Date.now();
    const duration = endTime - startTime;
    transactionMonitor.recordPerformanceMetric('transfer', duration, {
      transactionId,
      success: !error,
      amount,
      recipientUsername
    });

    // Restore button state
    sendButton.disabled = false;
    sendButton.innerHTML = originalText;

    transactionMonitor.recordTransactionStep(transactionId, 'ui_cleanup', { action: 'restore_button' });
  }
}

// Initialize transaction system when DOM is ready
export function initializeTransactionSystem() {
  document.addEventListener('DOMContentLoaded', function() {
    const sendButton = document.getElementById('send-button');
    if (sendButton) {
      // Remove any existing event listeners to prevent duplicates
      sendButton.replaceWith(sendButton.cloneNode(true));
      const newSendButton = document.getElementById('send-button');

      // Add our new handler
      newSendButton.addEventListener('click', handleTransfer);

      console.log('Transaction system initialized successfully');
    } else {
      console.warn('Send button not found during initialization');
    }
  });
}

// Function to update balances after successful transfer
function updateBalancesAfterTransfer(userId, amount, assetType = 'codes') {
  console.log('🔄 Transaction: Updating balances after transfer...');

  try {
    // Update localStorage based on asset type
    if (assetType === 'codes') {
      const currentBalance = parseInt(safeStorage.get('asset-codes') || '0', 10);
      const newBalance = currentBalance - amount;
      safeStorage.set('asset-codes', String(newBalance));

      // Update DOM elements
    // REMOVED: Do not update DOM counters directly


      // REMOVED: Do not update DOM counters directly

      console.log('🔄 Transaction: Updated codes balance:', newBalance);
    }

    // Trigger storage events for cross-tab synchronization
    const storageEvent = new StorageEvent('storage', {
      key: `asset-${assetType}`,
      newValue: safeStorage.get(`asset-${assetType}`),
      url: window.location.href
    });
    window.dispatchEvent(storageEvent);

    // Update rewards object
    const rewards = JSON.parse(safeStorage.get('codebank_rewards') || '{"codes":0,"silverBars":0,"goldBars":0}');
    if (assetType === 'codes') {
      rewards.codes = parseInt(safeStorage.get('asset-codes') || '0', 10);
    } else if (assetType === 'silver') {
      rewards.silverBars = parseInt(safeStorage.get('asset-silver') || '0', 10);
    } else if (assetType === 'gold') {
      rewards.goldBars = parseInt(safeStorage.get('asset-gold') || '0', 10);
    }
    rewards.lastUpdated = new Date().toISOString();
    safeStorage.set('codebank_rewards', JSON.stringify(rewards));

    console.log('✅ Transaction: Balances updated successfully after transfer');
    return true;

  } catch (error) {
    console.error('Error updating balances after transfer:', error);
    return false;
  }
}

// Export for use in other modules
export default {
  handleTransfer,
  initializeTransactionSystem,
  refreshBalances,
  waitForAuth,
  updateBalancesAfterTransfer
};
