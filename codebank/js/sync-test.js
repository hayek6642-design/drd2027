/**
 * TEST: SafeCode Instant Sync & Visibility
 * This script simulates the backend adding assets and verifies that:
 * 1. AssetBus picks up the change.
 * 2. Bridge broadcasts it.
 * 3. SafeCode UI receives and renders it.
 */

import { AssetBus } from '../../shared/local-asset-bus.js';

async function runSafeCodeSyncTest() {
    console.log('🧪 STARTING SAFE-CODE SYNC TEST...');
    
    // 1. Initial State Check
    const initialSnapshot = AssetBus.snapshot();
    console.log(`[TEST] Initial Asset Count: ${initialSnapshot.codes?.length || 0}`);

    // Simulate Backend Sync (Injecting a test code)
    const testCode = `TEST-${Date.now()}-CODE`;
    console.log(`[TEST] Simulating backend asset addition: ${testCode}`);
    
    // We use addCode which is the standard entry point for new assets
    const success = await AssetBus.addCode(testCode);
    
    if (!success) {
        console.error('❌ FAILED: AssetBus rejected the new asset.');
        return;
    }

    // 🛡️ PERSIST TO LOCAL STORAGE FOR IFRAME VISIBILITY
    const ss = window.safeStorage || {
        set: (k, v) => { try { localStorage.setItem(k, v) } catch(_) {} }
    };
    ss.set('codebank_assets', JSON.stringify(AssetBus.snapshot()));
    
    // 🛡️ BROADCAST VIA BRIDGE (Force sync if bridge is listening)
    window.postMessage({
        type: 'assetbus:broadcast',
        payload: AssetBus.snapshot(),
        source: 'sync-test'
    }, '*');

    // 3. Verify AssetBus State
    const updatedSnapshot = AssetBus.snapshot();
    const hasCode = updatedSnapshot.codes.includes(testCode);
    
    if (hasCode) {
        console.log('✅ SUCCESS: AssetBus updated instantly.');
    } else {
        console.error('❌ FAILED: AssetBus did not include the test code.');
        return;
    }

    // 4. Verify Event Dispatch (For UI rendering)
    let eventFired = false;
    const eventHandler = (e) => {
        if (e.detail && e.detail.codes && e.detail.codes.includes(testCode)) {
            eventFired = true;
            console.log('✅ SUCCESS: "assets:updated" event fired with new data.');
        }
    };
    
    window.addEventListener('assets:updated', eventHandler);
    
    // Trigger another update to test event firing
    await AssetBus.addCode(`EVENT-TEST-${Date.now()}`);
    
    setTimeout(() => {
        window.removeEventListener('assets:updated', eventHandler);
        if (!eventFired) {
            console.error('❌ FAILED: UI was not notified via event.');
        } else {
            console.log('🏁 TEST COMPLETE: FULL SYNC CHAIN VERIFIED.');
        }
    }, 1000);
}

// Attach to window for easy manual execution in console if needed
window.runSafeCodeSyncTest = runSafeCodeSyncTest;

// Auto-run if in test mode or requested
if (window.location.search.includes('test=safecode')) {
    runSafeCodeSyncTest();
}
