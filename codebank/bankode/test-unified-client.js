/**
 * Bankode Unified Client Test
 * This script tests that Bankode modules are properly using the unified Supabase client
 */

// Test function to verify unified client integration
async function testUnifiedClientIntegration() {
    console.log('🧪 Testing Bankode Unified Client Integration...');

    try {
        // Test 1: Check if unified supabase client is available
        if (typeof window.supabase === 'undefined') {
            console.error('❌ Test 1 Failed: Unified Supabase client not found');
            return false;
        }
        console.log('✅ Test 1 Passed: Unified Supabase client found');

        // Test 2: Check if Bankode modules can access the client
        if (typeof window.BankodeRPC === 'undefined' || typeof window.BankodeRLSManager === 'undefined') {
            console.error('❌ Test 2 Failed: Bankode modules not initialized');
            return false;
        }
        console.log('✅ Test 2 Passed: Bankode modules initialized');

        // Test 3: Check if BankodeConfig is available
        if (typeof window.BankodeConfig === 'undefined') {
            console.error('❌ Test 3 Failed: BankodeConfig not found');
            return false;
        }
        console.log('✅ Test 3 Passed: BankodeConfig available');

        // Test 4: Verify RPC functions can use the unified client
        const rpcTest = await window.BankodeRPC.getBalances();
        if (!rpcTest.success) {
            console.error('❌ Test 4 Failed: RPC functions cannot use unified client');
            return false;
        }
        console.log('✅ Test 4 Passed: RPC functions work with unified client');

        // Test 5: Verify RLS manager can use the unified client
        const rlsTest = await window.BankodeRLSManager.verifyRLSPolicies();
        if (!rlsTest.success) {
            console.error('❌ Test 5 Failed: RLS manager cannot use unified client');
            return false;
        }
        console.log('✅ Test 5 Passed: RLS manager works with unified client');

        console.log('🎉 All tests passed! Bankode is successfully using the unified Supabase client.');
        return true;

    } catch (error) {
        console.error('❌ Unified client test failed:', error);
        return false;
    }
}

// Run the test when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for all Bankode modules to load
    const checkInterval = setInterval(() => {
        if (window.supabase && window.BankodeRPC && window.BankodeRLSManager && window.BankodeConfig) {
            clearInterval(checkInterval);

            // Run the test
            testUnifiedClientIntegration().then(success => {
                if (success) {
                    console.log('🎉 Bankode unified client integration successful!');
                    alert('✅ Bankode is now using the unified Supabase client successfully!');
                } else {
                    console.error('❌ Bankode unified client integration failed!');
                    alert('❌ Bankode unified client integration failed. Check console for details.');
                }
            });
        }
    }, 100);
});

// Export for module usage
export { testUnifiedClientIntegration };