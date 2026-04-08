// buttons.js - Button event handlers for quick actions, transfers, forms, etc.

 

// Firestore functions removed - Firebase integration disabled

// Track current signed-in username for self-transfer prevention
let currentUserUsername = null;

// Diagnostic logging for debugging
console.log('🔍 [DEBUG] buttons.js: Starting to load button handlers...');
console.log('🔍 [DEBUG] buttons.js: Current URL:', window.location.href);
console.log('🔍 [DEBUG] buttons.js: Checking auth.js import...');



// Optional lookup URL for environments that provide one
const LOOKUP_USER_FN_URL = window.LOOKUP_USER_FN_URL || window.__LOOKUP_USER_FN_URL__ || null;

// Log the configured lookup URL so deploy/slug mismatches are easy to spot in console
console.log('🔍 [CONFIG] LOOKUP_USER_FN_URL =', LOOKUP_USER_FN_URL);

// Friendly lookup error notifier
function notifyLookupError(status, body) {
    const msg = status === 404 ? 'Recipient not found. Check the username.' : status === 401 ? 'Lookup requires authentication. Please sign in.' : 'Recipient lookup failed. Try again later.';
    try { window.showToast && window.showToast(msg, 'error'); } catch (e) { /* ignore */ }
    console.warn('Lookup error:', status, body);
}

// Build headers for lookup requests. Prefer available client session token when present.
async function buildLookupHeaders() {
    const headers = { 'Content-Type': 'application/json' };

    // Try to get Authorization from app auth client if available
    try {
        const client = getSupabaseClient();
        if (client && typeof client.getIdToken === 'function') {
            const token = await client.getIdToken().catch(() => null);
            if (token && token.length > 10) {
                headers['Authorization'] = `Bearer ${token}`;
                return headers;
            }
        }
    } catch (e) { /* ignore */ }

    // Common global names where the anon key might be exposed
    const possibleKeys = [
        window.__LOOKUP_USER_FN_KEY__,
        window.__LOOKUP_USER_FN_KEY,
        window.__SUPABASE_ANON_KEY__,
        window.__SUPABASE_ANON_KEY,
        window.SUPABASE_ANON_KEY,
        window.__VITE_SUPABASE_KEY__,
        window.__VITE_SUPABASE_KEY,
    ];

    for (const k of possibleKeys) {
        if (typeof k === 'string' && k.length > 10) {
            headers['apikey'] = k;
            headers['Authorization'] = `Bearer ${k}`;
            return headers;
        }
    }

    

    // Last-resort: no auth available
    return headers;
}

// Smart user lookup function
async function lookupUserId(username) {
    try {
        if (!username) return null;

        // Best-effort current user check
        let currentUser = null;
        try {
            currentUser = await window.authHelper?.getCurrentUser?.() || null;
        } catch (e) {
            // ignore
        }

        // Prefer direct Supabase lookup when client available
        try {
            const client = getSupabaseClient();
            if (client) {
                const { data, error } = await client
                    .from('profiles')
                    .select('user_id')
                    .eq('username', username)
                    .single();
                if (!error && data && data.user_id) return data.user_id;
            }
        } catch (e) { /* ignore and fall back */ }

        // Fallback to provided lookup URL if present
        if (LOOKUP_USER_FN_URL) {
            try {
                const hdrs = await buildLookupHeaders();
                const res = await fetch(LOOKUP_USER_FN_URL, {
                    method: 'POST',
                    headers: hdrs,
                    body: JSON.stringify({ username })
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data && data.user_id) return data.user_id;
                notifyLookupError(res.status, data);
                return null;
            } catch (err) {
                console.error('Lookup request failed:', err);
                return null;
            }
        }

        return null;
    } catch (err) {
        console.error('lookupUserId error:', err);
        return null;
    }
}

// Wait for auth to be ready
const waitForAuth = async () => {
  try { return !!(window.Auth || window.authHelper); } catch(_) { return false; }
};

//
async function refreshBalances(profileId) { }

// Function to create initial balance record (Firebase removed - now no-op)
async function createBalanceRecord(profileId) {
    console.log('✅ Asset sync: Balance record creation skipped (Firebase removed)');
}

// Function to sync localStorage assets (Firebase removed - now no-op)
async function syncAssetsToFirebase(profileId) {
    console.log('✅ Asset sync: Sync skipped (Firebase removed)');
    return true;
}
// Basic mock implementations for testing functionality

// Listen for auth state changes from side panel - Fixed to prevent conflicts
window.addEventListener('auth:verified', () => { });

window.addEventListener('auth:signedOut', () => { });

// Listen for signup success (needs email confirmation)
window.addEventListener('auth:signup_success', (event) => {
       try {
           console.log('Signup success event received:', event.detail);
           // Show message that email confirmation is needed
           try { window.showToast && window.showToast('Account created! Please check your email and confirm your account before transferring assets.', 'info'); } catch(e) {}

           // Disable transfer button until email is confirmed
           const sendButton = document.getElementById('send-button');
           if (sendButton) {
               sendButton.disabled = true;
               sendButton.textContent = 'Confirm Email First';
           }
       } catch(e){
           console.warn('Error handling signup success event:', e);
       }
   });

// Initial visibility check on page load
// Since this script loads after DOM is ready, execute directly
console.log('🔍 [DEBUG] buttons.js: Page loaded, checking elements...');
(async () => {
    await waitForAuth();

    const isAuthenticated = window.isAuthenticated ? await window.isAuthenticated() : false;
    console.log('🔍 [DEBUG] buttons.js: isAuthenticated =', isAuthenticated);
    const signinBtn = document.getElementById('signin-btn');
    console.log('🔍 [DEBUG] buttons.js: signinBtn element found =', !!signinBtn);

    if (signinBtn && !signinBtn.disabled) {
        signinBtn.style.display = isAuthenticated ? 'none' : '';
    }

    // Hide anonymous button when authenticated
    const anonymousBtn = document.getElementById('anonymous-btn');
    if (anonymousBtn) {
        anonymousBtn.style.display = isAuthenticated ? 'none' : '';
    }

    // Set initial signed-in/out state
    const notSignedIn = document.getElementById('not-signed-in');
    const signedIn = document.getElementById('signed-in');
    if (isAuthenticated) {
        if (notSignedIn) notSignedIn.classList.add('hidden');
        if (signedIn) signedIn.classList.remove('hidden');
    } else {
        if (notSignedIn) notSignedIn.classList.remove('hidden');
        if (signedIn) signedIn.classList.add('hidden');
    }

    // Disable send button if not authenticated
    const sendButton = document.getElementById('send-button');
    if (sendButton) {
        sendButton.disabled = !isAuthenticated;
        if (!isAuthenticated) {
            sendButton.textContent = 'Sign In Required';
        } else {
            sendButton.textContent = 'Send';
        }
    }

    // Determine current signed-in username (best-effort). Used to prevent self-transfers.
    try {
        if (window.authHelper && typeof window.authHelper.getCurrentUser === 'function') {
            const cu = await window.authHelper.getCurrentUser();
            currentUserUsername = cu?.user_metadata?.username?.toLowerCase() || null;
        }
    } catch (e) {
        console.warn('Failed to get current user from authHelper:', e);
    }

    

    // Live validation: disable send button if recipient equals current user's username
    const receiverInput = document.getElementById('receiver-username');
    const sendBtn = document.getElementById('send-button');
    if (receiverInput && sendBtn) {
        // Create or find inline error element
        let recipientError = document.getElementById('recipient-error');
        if (!recipientError) {
            recipientError = document.createElement('div');
            recipientError.id = 'recipient-error';
            recipientError.style.color = '#c00';
            recipientError.style.fontSize = '13px';
            recipientError.style.marginTop = '6px';
            receiverInput.insertAdjacentElement('afterend', recipientError);
        }

        const validateRecipient = () => {
            try {
                const val = (receiverInput.value || '').trim().toLowerCase();
                if (val && currentUserUsername && val === currentUserUsername) {
                    // Disable action and show message
                    sendBtn.disabled = true;
                    recipientError.textContent = 'You cannot send assets to yourself. You can only send assets to another user.';
                } else {
                    sendBtn.disabled = false;
                    recipientError.textContent = '';
                }
            } catch (e) { console.warn('Recipient validation error:', e); }
        };

        receiverInput.addEventListener('input', validateRecipient, { passive: true });
        // Run once on load
        validateRecipient();
    }
})();

// Since this script loads after DOM is ready, execute directly
console.log('🔍 [DEBUG] buttons.js: Setting up button handlers...');

// Back button functionality (from yt-coder)
const backBtn = document.getElementById('back-btn');
console.log('🔍 [DEBUG] backBtn element found =', !!backBtn);
if (backBtn) {
   backBtn.addEventListener('click', function() {
       window.history.back();
   });
}

// Quick actions in Overview removed per requirements

const quickPlayBtn = document.getElementById('quick-play');
if (quickPlayBtn) {
   quickPlayBtn.addEventListener('click', () => {
       console.log('Play Games clicked');
       try { window.showToast && window.showToast('Opening Quick Games dialog...', 'info'); } catch(e) { console.warn('Toast failed: Opening Quick Games dialog...'); }
       const dialog = document.getElementById('game-dialog');
       if (dialog) dialog.style.display = 'flex';
   });
}

// Compression buttons removed per requirements

// Transfer button in Overview
const sendButton = document.getElementById('send-button');
console.log('🔍 [DEBUG] sendButton element found =', !!sendButton);
if (sendButton) {
   sendButton.addEventListener('click', async () => {
       console.log('Send button clicked - starting transfer process');
       try {
           console.log('🔍 [DEBUG] Transfer: Starting transfer process...');
           // Wait for auth to be ready
           await waitForAuth();

           // Simplified authentication check using consolidated auth helper
           console.log('🔍 [DEBUG] Transfer: Checking authentication...');
           try {
               const authResult = await window.authHelper.checkTransferAuth();
               const currentUser = authResult.user;
               console.log('🔍 [DEBUG] Transfer: Authentication verified for user:', currentUser.email);
           } catch (authError) {
               try { window.showToast && window.showToast(authError.message, 'warning'); } catch(e) {}
               const settingsBtn = document.getElementById('settings-btn');
               if (settingsBtn) {
                   settingsBtn.classList.add('animate-bounce');
               }
               return;
           }

           // Validate form inputs
           const assetType = document.getElementById('asset-type').value;
           const amount = parseInt(document.getElementById('transfer-amount').value) || 0;
           const username = document.getElementById('receiver-username').value;

           if (!amount || !username) {
               try { window.showToast && window.showToast('Please enter amount and username.', 'warning'); } catch(e) {}
               return;
           }

           if (assetType !== 'codes') {
               try { window.showToast && window.showToast('Only codes can be transferred currently.', 'warning'); } catch(e) {}
               return;
           }

           console.log('🔍 [DEBUG] Transfer: Session verified for user:', /* currentUser */ (typeof currentUser !== 'undefined' && currentUser ? currentUser.user_metadata?.username || currentUser.username : 'unknown'));

           // Get user info (use getFirebaseClient and avoid undefined globals)
           let user = null;
           let session = null;
           try {
               const client = getFirebaseClient();
               if (client) {
                   try {
                       user = client.currentUser;
                       if (user) {
                           session = { access_token: await user.getIdToken() };
                       }
                   } catch(e) {
                       console.warn('Failed to get user from Firebase client:', e);
                   }
               }
           } catch (e) {
               console.warn('User/session fetch overall failed:', e);
           }

          

           if (!user?.id) {
               try { window.showToast && window.showToast('Could not determine user ID. Please try signing out and in again.', 'error'); } catch(e) {}
               return;
           }

           // Lookup recipient user_id by username using smart routing
           console.log('🔍 [DEBUG] Transfer: Looking up recipient user_id for username:', username);
           const recipientUserId = await lookupUserId(username);
           if (!recipientUserId) {
               console.error('Recipient lookup failed: User not found');
               try { window.showToast && window.showToast('Recipient username not found. Please check the username and try again.', 'error'); } catch(e) {}
               return;
           }
           console.log('🔍 [DEBUG] Transfer: Found recipient user_id:', recipientUserId);

           // Execute transfer - prefer centralized transactions module if available
           try {
               console.log('🔍 [DEBUG] Transfer: Attempting to load transactions module...');
               let txModule = null;
               try {
                   txModule = (await import('./transactions.js')).default;
                   console.log('🔍 [DEBUG] Transfer: transactions module loaded successfully =', !!txModule);
               } catch(e) {
                   console.log('🔍 [DEBUG] Transfer: transactions module failed to load:', e);
                   txModule = null;
               }
               if (txModule && typeof txModule.sendTransaction === 'function') {
                   // Enable Firebase usage if we have a session
                   try {
                       const client = getFirebaseClient();
                       if (client && client.currentUser) {
                           txModule.enableFirebase(true);
                       }
                   } catch(e){}

                   // Show sending feedback
                   try { sendButton.disabled = true; sendButton.textContent = 'Sending...'; } catch(e){}
                   const r = await txModule.sendTransaction(username, amount);
                   try { sendButton.textContent = 'Send'; sendButton.disabled = false; } catch(e){}
                   if (r && r.success) {
                       try { window.showToast && window.showToast(`Transfer sent: ${amount} codes to ${username} (Tx ID: ${r.tx_id})`, 'success'); } catch(e){}
                       await refreshBalances(user.id);
                   } else {
                       throw r.error || new Error('Transaction failed');
                   }
               } else {
                   // Fallback: direct function call (legacy) - now using username lookup
                   console.log('🔍 [DEBUG] Transfer: Using legacy fetch method...');
                   const res = await fetch('https://us-central1-d-connect-2025.cloudfunctions.net/create-transfer', {
                       method: 'POST',
                       headers: {
                           'Content-Type': 'application/json',
                           'Authorization': `Bearer ${session?.access_token || ''}`,
                       },
                       body: JSON.stringify({ recipient: recipientUserId, codes: amount })
                   });
                   if (!res.ok) throw new Error(await res.text());
                   const result = await res.json();
                   if (result.success) { try { window.showToast && window.showToast(`Transfer sent: ${amount} codes to ${username} (Tx ID: ${result.tx_id})`, 'success'); } catch(e){}; await refreshBalances(user.id); } else { throw new Error(result.message || 'Unknown error'); }
               }
           } catch (err) {
               console.error('Transfer failed:', err);
               try { window.showToast && window.showToast(`Transfer failed: ${err.message || String(err)}`, 'error'); } catch(e) {}
           }
       } catch (e) {
           console.error('Transfer handler error:', e);
           try { window.showToast && window.showToast('An unexpected error occurred.', 'error'); } catch(e) {}
       }
   });
}

// Buy form submission
const buyForm = document.getElementById('buy-form');
if (buyForm) {
   buyForm.addEventListener('submit', (e) => {
       e.preventDefault();
       const currency = document.getElementById('buy-currency').value;
       const amount = parseInt(document.getElementById('buy-amount').value) || 0;
       const method = document.getElementById('payment-method').value;
       console.log(`Buy: ${amount} ${currency} via ${method}`);
       try { window.showToast && window.showToast(`Purchase processed: ${amount} ${currency} (Mock)`, 'success'); } catch(e) { console.warn('Toast failed: Purchase processed'); }
       // Add codes mock - REMOVED: Do not update DOM counters directly
       buyForm.reset();
   });
}

// Sell form submission
const sellForm = document.getElementById('sell-form');
if (sellForm) {
   sellForm.addEventListener('submit', (e) => {
       e.preventDefault();
       const codes = parseInt(document.getElementById('codes-to-sell').value) || 0;
       const currency = document.getElementById('sell-currency').value;
       console.log(`Sell: ${codes} codes for ${currency}`);
       try { window.showToast && window.showToast(`Sell order placed: ${codes} codes (Mock)`, 'success'); } catch(e) { console.warn('Toast failed: Sell order placed'); }
       // Deduct codes mock - REMOVED: Do not update DOM counters directly
       sellForm.reset();
   });
}

// Game dialog buttons - combined: mock + navigate
const quickGameBtns = document.querySelectorAll('.quick-game-btn');
quickGameBtns.forEach(btn => {
   btn.addEventListener('click', () => {
       const game = btn.dataset.game;
       console.log(`${game} game selected`);
       try { window.showToast && window.showToast(`${game.charAt(0).toUpperCase() + game.slice(1)} game starting... (Mock)`, 'info'); } catch(e) { console.warn('Toast failed: Game starting'); }
       // Navigate to game (from yt-coder)
       window.location.href = `games/${game}.html`;
       const dialog = document.getElementById('game-dialog');
       if (dialog) dialog.style.display = 'none';
   });
});

// Close game dialog
const closeGameDialog = document.getElementById('close-game-dialog');
if (closeGameDialog) {
   closeGameDialog.addEventListener('click', () => {
       document.getElementById('game-dialog').style.display = 'none';
   });
}

// Games controls
const toggleSoundBtn = document.getElementById('toggle-sound');
if (toggleSoundBtn) {
   let soundOn = true;
   toggleSoundBtn.addEventListener('click', () => {
       soundOn = !soundOn;
       toggleSoundBtn.innerHTML = soundOn ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
       console.log(`Sound ${soundOn ? 'enabled' : 'disabled'}`);
   });
}

const fullscreenGamesBtn = document.getElementById('fullscreen-games');
if (fullscreenGamesBtn) {
   fullscreenGamesBtn.addEventListener('click', () => {
       const container = document.querySelector('.games-centre-container');
       if (container.requestFullscreen) {
           container.requestFullscreen();
       }
       console.log('Fullscreen games toggled');
   });
}

const refreshGamesBtn = document.getElementById('refresh-games');
if (refreshGamesBtn) {
   refreshGamesBtn.addEventListener('click', () => {
       const iframe = document.getElementById('games-dashboard');
       if (iframe) {
           iframe.src = iframe.src;
           console.log('Games refreshed');
       }
   });
}

// Farragna controls
const toggleSoundFarragnaBtn = document.getElementById('toggle-sound-farragna');
if (toggleSoundFarragnaBtn) {
   let farragnaSoundOn = true;
   toggleSoundFarragnaBtn.addEventListener('click', () => {
       farragnaSoundOn = !farragnaSoundOn;
       toggleSoundFarragnaBtn.innerHTML = farragnaSoundOn ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
       // Send message to iframe
       const iframe = document.getElementById('farragna-dashboard');
       if (iframe && iframe.contentWindow) {
           const __o = (function(){ try{ const s = iframe.getAttribute('src')||''; return new URL(s, window.location.href).origin }catch(_){ return window.location.origin } })();
           iframe.contentWindow.postMessage({
               type: 'globalMuteUnmute',
               muted: !farragnaSoundOn
           }, __o);
       }
       console.log(`Farragna sound ${farragnaSoundOn ? 'enabled' : 'disabled'}`);
   });
}

const fullscreenFarragnaBtn = document.getElementById('fullscreen-farragna');
if (fullscreenFarragnaBtn) {
   fullscreenFarragnaBtn.addEventListener('click', () => {
       const container = document.querySelector('.farragna-container');
       if (container) {
           if (container.requestFullscreen) {
               container.requestFullscreen();
           } else if (container.webkitRequestFullscreen) {
               container.webkitRequestFullscreen();
           } else if (container.msRequestFullscreen) {
               container.msRequestFullscreen();
           }
           console.log('Farragna fullscreen toggled');
       }
   });
}

const refreshFarragnaBtn = document.getElementById('refresh-farragna');
if (refreshFarragnaBtn) {
   refreshFarragnaBtn.addEventListener('click', () => {
       const iframe = document.getElementById('farragna-dashboard');
       if (iframe) {
           iframe.src = iframe.src;
           console.log('Farragna refreshed');
       }
   });
}

// Premium button (combined: redirect + mock)
const premiumBtn = document.getElementById('premium-btn');
if (premiumBtn) {
   premiumBtn.addEventListener('click', () => {
       try { window.showToast && window.showToast('Premium status: Active (Mock)', 'info'); } catch(e) { console.warn('Toast failed: Premium status'); }
       console.log('Premium button clicked');
       // Redirect to premium.html (from yt-coder)
       window.location.href = 'premium.html';
   });
}

// Subscribe button in banner
const subscribeBtn = document.getElementById('subscribe-btn');
if (subscribeBtn) {
   subscribeBtn.addEventListener('click', () => {
       try { window.showToast && window.showToast('Redirecting to YouTube subscribe... (Mock)', 'info'); } catch(e) { console.warn('Toast failed: Redirecting to YouTube subscribe'); }
       console.log('Subscribe clicked');
   });
}

// Settings buttons (from yt-coder)
// Check auth state before showing sign-in UI - Fixed to prevent conflicts
async function updateSignInUI() {
     const isAuthenticated = window.isAuthenticated ? await window.isAuthenticated() : false;
     const signinBtn = document.getElementById('signin-btn');
     const anonymousBtn = document.getElementById('anonymous-btn');

     if (signinBtn) {
         // Only update visibility if button is not currently processing
         if (!signinBtn.disabled) {
             signinBtn.style.display = isAuthenticated ? 'none' : '';
         }
     }

     if (anonymousBtn) {
         anonymousBtn.style.display = isAuthenticated ? 'none' : '';
     }

     const notSignedIn = document.getElementById('not-signed-in');
     const signedIn = document.getElementById('signed-in');
     if (isAuthenticated) {
         if (notSignedIn) notSignedIn.classList.add('hidden');
         if (signedIn) signedIn.classList.remove('hidden');
     } else {
         if (notSignedIn) notSignedIn.classList.remove('hidden');
         if (signedIn) signedIn.classList.add('hidden');
     }
 }

document.querySelectorAll('.settings-btn').forEach(btn => {
   btn.addEventListener('click', async function() {
       const action = this.dataset.action;
       switch(action) {
           case 'signin':
           case 'switch-account':
               await waitForAuth();
               if (window.isAuthenticated && await window.isAuthenticated()) {
                   try { window.showToast && window.showToast('You are already signed in.', 'info'); } catch(e) {}
                   return;
               }

               if (window.location.pathname.endsWith('indexCB.html')) {
                   try {
                       const returnUrl = encodeURIComponent('./indexCB.html');
                       const w = 600, h = 700;
                       const left = window.screenX + (window.outerWidth - w) / 2;
                       const top = window.screenY + (window.outerHeight - h) / 2;
                       const openerOrigin = encodeURIComponent(window.location.origin || window.location.hostname);
                       const popup = window.open(
                           `./login.html?return=${returnUrl}&openerOrigin=${openerOrigin}`,
                           'auth_popup',
                           `width=${w},height=${h},left=${left},top=${top}`
                       );
                       if (!popup) {
                           try { window.showToast && window.showToast('Popup blocked. Please enable popups to sign in.', 'warning'); } catch(e) {}
                       }
                   } catch (e) {
                       const returnUrl = encodeURIComponent('./indexCB.html');
                       window.location.href = `login.html?return=${returnUrl}`;
                   }
               } else {
                   const returnUrl = encodeURIComponent('./indexCB.html');
                   window.location.href = `login.html?return=${returnUrl}`;
               }
               break;

           case 'anonymous':
               await waitForAuth();
               if (window.isAuthenticated && await window.isAuthenticated()) {
                   try { window.showToast && window.showToast('You are already signed in.', 'info'); } catch(e) {}
                   return;
               }

               // Disable button and show loading state
               const anonymousBtn = document.getElementById('anonymous-btn');
               if (anonymousBtn) {
                   anonymousBtn.disabled = true;
                   const originalText = anonymousBtn.innerHTML;
                   anonymousBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing in...';

                   try {
                       // Call anonymous sign-in
                       if (window.auth && window.auth.signInAnonymously) {
                           const result = await window.auth.signInAnonymously();
                           if (result.error) {
                               throw new Error(result.error.message || 'Anonymous sign-in failed');
                           }
                           try { window.showToast && window.showToast('Signed in anonymously! You can now transfer assets.', 'success'); } catch(e) {}
                       } else {
                           throw new Error('Anonymous sign-in not available');
                       }
                   } catch (error) {
                       console.error('Anonymous sign-in failed:', error);
                       try { window.showToast && window.showToast('Anonymous sign-in failed. Please try again.', 'error'); } catch(e) {}
                       // Reset button
                       anonymousBtn.disabled = false;
                       anonymousBtn.innerHTML = originalText;
                   }
               }
               break;

           case 'premium':
               window.location.href = 'premium.html';
               break;
           case 'help':
               window.location.href = 'help.html';
               break;
           case 'about':
               window.location.href = 'about.html';
               break;
           case 'signout':
               // This will be handled by auth.js
               if (window.handleSignOut) window.handleSignOut();
               break;
       }
   });
});

// CGTrigger form (if admin)
const cgForm = document.getElementById('cgtrigger-form');
if (cgForm) {
   cgForm.addEventListener('submit', (e) => {
       e.preventDefault();
       const trigger = document.getElementById('trigger').value;
       const prefix = document.getElementById('actionPrefix').value;
       console.log(`New trigger: ${trigger} -> ${prefix}`);
       try { window.showToast && window.showToast(`Trigger saved: ${trigger} (Mock)`, 'success'); } catch(e) { console.warn('Toast failed: Trigger saved'); }
       cgForm.reset();
   });
}

console.log('🔍 [DEBUG] buttons.js: All handlers attached successfully');
console.log('buttons.js loaded - all handlers attached');
