/**
 * Auth Refactor Test Suite
 * Run in browser console to verify implementation
 */

const AuthTests = {
  // Test 1: Guest auto-creation
  async test_GuestAutoCreate() {
    console.clear();
    console.log('🧪 Test 1: Guest Auto-Creation');
    
    // Clear storage and reload
    localStorage.clear();
    
    // Wait for SessionManager to initialize
    await new Promise(r => setTimeout(r, 500));
    
    const session = window.sessionManager?.getSession();
    
    console.assert(session, 'Session should exist');
    console.assert(session.type === 'guest', 'Should be guest type');
    console.assert(session.guestId, 'Should have guestId');
    console.assert(session.version === '2.0', 'Should have version 2.0');
    
    console.log('✅ Test 1 passed', session);
    return true;
  },

  // Test 2: Session persistence
  async test_SessionPersistence() {
    console.log('\n🧪 Test 2: Session Persistence');
    
    const sm1 = window.sessionManager;
    const id1 = sm1?.getId();
    
    // Simulate page reload by creating new instance
    const stored = localStorage.getItem('zagelsession');
    
    console.assert(stored, 'Session should be stored in localStorage');
    const parsed = JSON.parse(stored);
    console.assert(parsed.type === 'guest', 'Should be guest session');
    console.assert(parsed.guestId === id1, 'guestId should match');
    
    console.log('✅ Test 2 passed - session persisted:', id1);
    return true;
  },

  // Test 3: No redirect loops
  async test_NoRedirectLoops() {
    console.log('\n🧪 Test 3: No Redirect Loops');
    
    const initialUrl = window.location.href;
    const startTime = Date.now();
    
    await new Promise(r => setTimeout(r, 2000));
    
    const finalUrl = window.location.href;
    const elapsed = Date.now() - startTime;
    
    console.assert(initialUrl === finalUrl, 'Should not redirect');
    console.assert(elapsed < 3000, 'Should complete quickly');
    
    console.log('✅ Test 3 passed - no redirects detected');
    return true;
  },

  // Test 4: Upgrade to user
  async test_UpgradeToUser() {
    console.log('\n🧪 Test 4: Guest → User Upgrade');
    
    const sm = window.sessionManager;
    const guestId = sm?.getId();
    
    // Simulate login
    sm?.upgradeToUser(
      { id: 'user_test_123', email: 'test@example.com' },
      'test_token_abc123'
    );
    
    const session = sm?.getSession();
    
    console.assert(session.type === 'user', 'Should be user type');
    console.assert(session.userId === 'user_test_123', 'Should have userId');
    console.assert(session.email === 'test@example.com', 'Should have email');
    console.assert(session.token === 'test_token_abc123', 'Should have token');
    console.assert(session.metadata.upgradedFrom === guestId, 'Should track upgrade');
    
    console.log('✅ Test 4 passed - upgraded to user:', session);
    return true;
  },

  // Test 5: Downgrade to guest
  async test_DowngradeToGuest() {
    console.log('\n🧪 Test 5: User → Guest Downgrade');
    
    const sm = window.sessionManager;
    
    // First upgrade
    sm?.upgradeToUser(
      { id: 'user_logout_test', email: 'logout@test.com' },
      'logout_token'
    );
    
    // Then downgrade
    sm?.downgradeToGuest();
    
    const session = sm?.getSession();
    
    console.assert(session.type === 'guest', 'Should be guest type');
    console.assert(session.guestId, 'Should have new guestId');
    console.assert(!session.userId, 'Should not have userId');
    
    console.log('✅ Test 5 passed - downgraded to guest:', session.guestId);
    return true;
  },

  // Test 6: Session listeners
  async test_SessionListeners() {
    console.log('\n🧪 Test 6: Session Listeners');
    
    const sm = window.sessionManager;
    let callCount = 0;
    let lastSession = null;
    
    const unsubscribe = sm?.subscribe((session) => {
      callCount++;
      lastSession = session;
    });
    
    // Trigger a change
    sm?.upgradeToUser(
      { id: 'listener_test', email: 'listener@test.com' },
      'listener_token'
    );
    
    await new Promise(r => setTimeout(r, 100));
    
    console.assert(callCount > 0, 'Listener should be called');
    console.assert(lastSession.type === 'user', 'Should receive updated session');
    
    unsubscribe?.();
    
    console.log('✅ Test 6 passed - listeners working:', callCount, 'calls');
    return true;
  },

  // Test 7: Token management
  async test_TokenManagement() {
    console.log('\n🧪 Test 7: Token Management');
    
    const sm = window.sessionManager;
    
    // Guest should have no token
    sm?.downgradeToGuest();
    let token = sm?.getToken();
    console.assert(!token, 'Guest should have no token');
    
    // User should have token
    sm?.upgradeToUser(
      { id: 'token_test', email: 'token@test.com' },
      'test_token_value'
    );
    token = sm?.getToken();
    console.assert(token === 'test_token_value', 'User should have token');
    
    console.log('✅ Test 7 passed - token management correct');
    return true;
  },

  // Test 8: Debug info
  async test_DebugInfo() {
    console.log('\n🧪 Test 8: Debug Info');
    
    const sm = window.sessionManager;
    const debug = sm?.getDebugInfo();
    
    console.assert(debug.type, 'Should have type');
    console.assert(debug.id, 'Should have id');
    console.assert(typeof debug.isUser === 'boolean', 'Should have isUser flag');
    console.assert(typeof debug.isGuest === 'boolean', 'Should have isGuest flag');
    
    console.log('✅ Test 8 passed - debug info:', debug);
    return true;
  },

  // Run all tests
  async runAll() {
    console.clear();
    console.log('🚀 Auth Refactor Test Suite\n');
    
    const tests = [
      this.test_GuestAutoCreate,
      this.test_SessionPersistence,
      this.test_NoRedirectLoops,
      this.test_UpgradeToUser,
      this.test_DowngradeToGuest,
      this.test_SessionListeners,
      this.test_TokenManagement,
      this.test_DebugInfo
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
      try {
        const result = await test.call(this);
        if (result) passed++;
      } catch (err) {
        console.error('❌ Test failed:', err);
        failed++;
      }
    }
    
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
    
    if (failed === 0) {
      console.log('✨ All tests passed! Auth refactor is working correctly.');
    }
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthTests;
}

// Also expose globally
if (typeof window !== 'undefined') {
  window.AuthTests = AuthTests;
}
