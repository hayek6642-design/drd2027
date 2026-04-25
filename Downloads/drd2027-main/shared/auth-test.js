/**
 * AUTH DIAGNOSTIC TEST
 * 
 * This test verifies the complete auth flow from parent to iframes.
 * Open browser console and look for [AUTH::TEST] logs.
 */

(function() {
  'use strict';

  const isParent = window.self === window.top;
  const iframeId = new Date().getTime();

  console.log(`[AUTH::TEST] ${isParent ? '🏠 PARENT' : '📦 IFRAME'} initialized`);

  if (isParent) {
    // TEST: Parent should broadcast auth
    console.log('[AUTH::TEST] Parent waiting for auth requests...');
    
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'auth:request') {
        console.log('[AUTH::TEST] ✅ Parent received auth:request from iframe');
        console.log('[AUTH::TEST] AppState.auth.token:', AppState?.auth?.token ? '✅ Present' : '❌ Missing');
        console.log('[AUTH::TEST] AppState.auth.user:', AppState?.auth?.user?.email || '❌ Missing');
      }
      
      if (e.data?.type === 'auth:response') {
        console.log('[AUTH::TEST] Parent received auth:response (should not happen)');
      }
    });
  } else {
    // TEST: Iframe should request auth and receive it
    console.log(`[AUTH::TEST] Iframe ${iframeId} requesting auth from parent...`);
    
    let requestCount = 0;
    const interval = setInterval(() => {
      requestCount++;
      if (requestCount > 1) {
        console.log(`[AUTH::TEST] Auth request #${requestCount} - still waiting...`);
      }
      if (requestCount > 20) {
        console.error('[AUTH::TEST] ❌ FAILED: No auth received after 20 requests (10 seconds)');
        clearInterval(interval);
      }
    }, 500);
    
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'auth:response') {
        clearInterval(interval);
        console.log('[AUTH::TEST] ✅ Iframe received auth:response from parent');
        console.log('[AUTH::TEST] Auth token:', e.data.token ? '✅ Present' : '❌ Missing');
        console.log('[AUTH::TEST] Auth user:', e.data.auth?.email || '❌ Missing');
        
        if (e.data.token && e.data.auth?.email) {
          console.log('[AUTH::TEST] 🎉 AUTH FLOW SUCCESSFUL - Ready to make API calls');
          console.log('[AUTH::TEST] Can now send: Authorization: Bearer ' + e.data.token.substring(0, 20) + '...');
        } else {
          console.error('[AUTH::TEST] ❌ PARTIAL AUTH - Token or user missing');
        }
      }
    });
  }
})();
