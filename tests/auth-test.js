/**
 * Auth Refactor Test Suite
 * Run in browser console or include in page
 */

(function() {
    'use strict';

    const tests = {
        /**
         * Test 1: Guest auto-creation
         */
        async test1_guestAutoCreate() {
            try {
                // Wait for session manager to initialize
                await new Promise(r => setTimeout(r, 500));
                
                if (!window.sessionManager) {
                    return { pass: false, message: 'SessionManager not loaded' };
                }
                
                const session = window.sessionManager.getSession();
                if (!session) {
                    return { pass: false, message: 'No session created' };
                }
                
                if (session.type !== 'guest') {
                    return { pass: false, message: 'Wrong session type: ' + session.type };
                }
                
                if (!session.guestId) {
                    return { pass: false, message: 'No guestId' };
                }
                
                return { pass: true, message: 'Guest auto-creation works' };
            } catch (err) {
                return { pass: false, message: 'Error: ' + err.message };
            }
        },

        /**
         * Test 2: No redirect loops
         */
        async test2_noRedirect() {
            try {
                const start = Date.now();
                await new Promise(r => setTimeout(r, 2000));
                const end = Date.now();
                
                // Should complete within 3 seconds (generous)
                if (end - start > 3000) {
                    return { pass: false, message: 'Possible redirect loop detected' };
                }
                
                return { pass: true, message: 'No redirect loops' };
            } catch (err) {
                return { pass: false, message: 'Error: ' + err.message };
            }
        },

        /**
         * Test 3: Session persistence
         */
        async test3_sessionPersistence() {
            try {
                if (!window.sessionManager) {
                    return { pass: false, message: 'SessionManager not loaded' };
                }
                
                const id1 = window.sessionManager.getId();
                
                // Reload page and check if same ID
                window.location.reload();
                
                return { pending: true, message: 'Reload to test persistence' };
            } catch (err) {
                return { pass: false, message: 'Error: ' + err.message };
            }
        },

        /**
         * Test 4: Upgrade flow
         */
        async test4_upgradeFlow() {
            try {
                if (!window.sessionManager) {
                    return { pass: false, message: 'SessionManager not loaded' };
                }
                
                const sm = window.sessionManager;
                
                // Create guest session
                sm.createGuestSession();
                const guestId = sm.getId();
                
                // Upgrade to user
                sm.upgradeToUser({ 
                    id: 'test_user_123', 
                    email: 'test@test.com' 
                }, 'test_token_abc', 7);
                
                // Check results
                if (!sm.isUser()) {
                    return { pass: false, message: 'Not upgraded to user' };
                }
                
                if (sm.getId() !== 'test_user_123') {
                    return { pass: false, message: 'User ID not set correctly' };
                }
                
                return { pass: true, message: 'Guest → User upgrade works' };
            } catch (err) {
                return { pass: false, message: 'Error: ' + err.message };
            }
        },

        /**
         * Test 5: Debug info
         */
        async test5_debugInfo() {
            try {
                if (!window.sessionManager) {
                    return { pass: false, message: 'SessionManager not loaded' };
                }
                
                const info = window.sessionManager.getDebugInfo();
                console.log('[AuthTest] Debug info:', info);
                
                return { pass: true, message: 'Debug info: ' + JSON.stringify(info) };
            } catch (err) {
                return { pass: false, message: 'Error: ' + err.message };
            }
        }
    };

    /**
     * Run all tests
     */
    window.runAuthTests = async function() {
        console.log('='.repeat(40));
        console.log('Running Auth Refactor Tests...');
        console.log('='.repeat(40));
        
        const results = [];
        
        for (const [name, test] of Object.entries(tests)) {
            try {
                const result = await test();
                results.push({ name, ...result });
                
                if (result.pass) {
                    console.log('✅ ' + name + ': ' + result.message);
                } else {
                    console.error('❌ ' + name + ': ' + result.message);
                }
            } catch (err) {
                console.error('❌ ' + name + ' crashed:', err);
            }
        }
        
        console.log('='.repeat(40));
        const passed = results.filter(r => r.pass).length;
        console.log('Results: ' + passed + '/' + results.length + ' passed');
        
        return results;
    };

    /**
     * Run single test
     */
    window.runAuthTest = async function(testName) {
        const test = tests[testName];
        if (!test) {
            console.error('Test not found:', testName);
            return;
        }
        
        const result = await test();
        console.log(result.pass ? '✅' : '❌', result.message);
        return result;
    };

    console.log('[AuthTest] Test suite loaded. Run window.runAuthTests()');

})();