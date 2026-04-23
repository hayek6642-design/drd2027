/*
Test file for Bankode Admin Dashboard Integration
*/

// Test the unifiedStorage API
console.log('🧪 Testing Bankode Admin Dashboard Integration...');

// Wait for unifiedStorage to be ready
window.unifiedStorageReady.then(async () => {
  console.log('✅ unifiedStorage is ready');

  try {
    // Test 1: Check if AdminStorage is available
    if (!window.unifiedStorage) {
      throw new Error('AdminStorage not available');
    }
    console.log('✅ AdminStorage API is available');

    // Test 2: Check Supabase connection
    const supabase = window.unifiedStorage.supabase;
    if (!supabase || !supabase.from) {
      throw new Error('Supabase client not properly initialized');
    }
    console.log('✅ Supabase client is properly initialized');

    // Test 3: Test RPC calls (without actual execution to avoid side effects)
    const rpcMethods = [
      'getAllBalances',
      'getAllTransactions',
      'logAdminAction',
      'adminAdjust',
      'mintAssets',
      'getAuditLogs',
      'getAdminActions'
    ];

    for (const method of rpcMethods) {
      if (typeof window.unifiedStorage[method] !== 'function') {
        throw new Error(`Method ${method} not available`);
      }
    }
    console.log('✅ All RPC methods are available');

    // Test 4: Check BankodeDashboard
    if (!window.BankodeDashboard) {
      console.warn('⚠️ BankodeDashboard not yet initialized (this is expected)');
    } else {
      console.log('✅ BankodeDashboard is available');
    }

    console.log('🎉 All integration tests passed!');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}).catch(error => {
  console.error('❌ unifiedStorage initialization failed:', error);
});

// Test BankodeDashboard initialization
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Wait a bit for dashboard to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (window.BankodeDashboard) {
      console.log('✅ BankodeDashboard initialized successfully');
    } else {
      console.warn('⚠️ BankodeDashboard not initialized yet');
    }
  } catch (error) {
    console.error('❌ Dashboard initialization test failed:', error);
  }
});