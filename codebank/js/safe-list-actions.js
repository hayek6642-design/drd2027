/**
 * safe-list-actions.js
 * 
 * This file contains the pagination logic and the asset-sending (Codes/Silver/Gold)
 * functionality for the SafeCode application.
 */

(function(window) {
    'use strict';

    const PAGE_SIZE = 10;
    window.SAFE_PAGE = 1;
    window.__SAFE_SELECTED_CODES__ = new Set();
    window.__GUARDIAN__ = null;

    /**
     * WATCH-DOG GUARDIAN ACTIONS
     */
    async function initWatchDogGuardian() {
        if (window.__DOG_INITIALIZING__) return;
        window.__DOG_INITIALIZING__ = true;

        const containerId = 'guardian-dog-container';
        let container = document.getElementById(containerId);
        
        if (!container) {
            console.warn('[WatchDog] Container not found, skipping initialization');
            window.__DOG_INITIALIZING__ = false;
            return;
        }

        // Prevent double mounting if scene already exists
        if (container.querySelector('canvas')) {
            console.log('[WatchDog] Canvas already exists, skipping');
            window.__DOG_INITIALIZING__ = false;
            return;
        }

        // 🦴 Check status before showing dog - show skeleton if dead
        let initialDogState = 'idle';
        try {
            const statusResp = await fetch('/api/watchdog/status', { credentials: 'include' });
            const status = await statusResp.json();

            if (status.success && status.dogState === 'DEAD') {
                console.warn('[WatchDog] 💀 Guardian is DEAD. Showing skeleton.');
                window.__DOG_IS_DEAD__ = true;
                localStorage.setItem('__DOG_IS_DEAD__', 'true');
                initialDogState = 'dead';
            } else {
                window.__DOG_IS_DEAD__ = false;
                localStorage.removeItem('__DOG_IS_DEAD__');
                initialDogState = 'idle';
            }
        } catch(e) {
            console.warn('[WatchDog] Status check failed (server may be down):', e);
            // Continue with alive dog if server is down
        }

        try {
            console.log('[WatchDog] 🛡️ Activating 3D Guardian (state: ' + initialDogState + ')');
            
            // 🛡️ Pre-clear container to ensure fresh mount
            container.innerHTML = ''; 
            
            const corePath = '/shared/watchdog-core/watchdog-core.js';
            const module = await import(corePath + '?v=' + Date.now());
            const { createWatchDog } = module;
            
            if (typeof createWatchDog !== 'function') {
                throw new Error('createWatchDog is not a function in ' + corePath);
            }

            window.__GUARDIAN__ = createWatchDog(container, { initialState: initialDogState });
            console.log('[WatchDog] ✅ 3D Guardian successfully activated');
            
            container.style.pointerEvents = 'auto'; // Enable clicks
            container.style.cursor = 'pointer';
            container.title = 'Click to feed 10 codes!';
            
            container.onclick = async () => {
                const count = window.__SAFE_SELECTED_CODES__.size;
                if (count < 10) {
                    showFeedPopup(`Need 10 codes to feed! (You have ${count} selected)`);
                    return;
                }
                
                // Show feeding confirmation
                showFeedConfirmation(Array.from(window.__SAFE_SELECTED_CODES__).slice(0, 10));
            };

            // Link with asset events
             window.addEventListener('assets:updated', (e) => {
                 console.log('[WatchDog] Assets updated, transitioning to WATCHING state');
                 if (window.__GUARDIAN__) window.__GUARDIAN__.setState('watching');
                 
                 // Return to idle after a delay
                 if (window.__WATCHDOG_IDLE_TIMER__) clearTimeout(window.__WATCHDOG_IDLE_TIMER__);
                 window.__WATCHDOG_IDLE_TIMER__ = setTimeout(() => {
                     if (window.__GUARDIAN__) {
                         console.log('[WatchDog] Returning to IDLE state');
                         window.__GUARDIAN__.setState('idle');
                     }
                 }, 5000);
             });

             // Support for manual alert/healing triggers
             window.addEventListener('tx:success', () => {
                 if (window.__GUARDIAN__) window.__GUARDIAN__.setState('healing');
                 setTimeout(() => window.__GUARDIAN__ && window.__GUARDIAN__.setState('idle'), 4000);
             });

             window.addEventListener('tx:error', () => {
                 if (window.__GUARDIAN__) window.__GUARDIAN__.setState('alert');
                 setTimeout(() => window.__GUARDIAN__ && window.__GUARDIAN__.setState('idle'), 4000);
             });

        } catch (err) {
            console.error('[WatchDog] Failed to load 3D core:', err);
            // Try fallback initialization
            try {
                // Check if fallback already exists
                if (container.querySelector('.fallback-dog')) return;

                const isDead = (initialDogState === 'dead');
                const fallbackDog = document.createElement('div');
                fallbackDog.className = 'fallback-dog';
                fallbackDog.id = 'fallback-dog-2d';

                if (isDead) {
                    // Dead state: show skeleton/skull
                    fallbackDog.innerHTML = `
                        <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;">
                            <div style="font-size:80px;filter:drop-shadow(0 0 10px #FF4444);animation:pulse-dead 1.5s ease-in-out infinite;">💀</div>
                            <div style="color:#FF4444;font-size:13px;font-weight:bold;text-align:center;text-shadow:0 0 8px #FF4444;">Guardian is Dead</div>
                            <div style="color:#888;font-size:11px;text-align:center;">Buy a new dog from Pebalaash<br>to revive (1000 codes)</div>
                        </div>`;
                    fallbackDog.style.cursor = 'not-allowed';
                    fallbackDog.title = 'Guardian is dead — cannot feed';
                    console.log('[WatchDog] 💀 Fallback: showing DEAD skeleton dog');
                } else {
                    // Alive state: show live dog, make clickable for feeding
                    fallbackDog.innerHTML = `
                        <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;">
                            <div style="font-size:80px;filter:drop-shadow(0 0 10px #B043FF);animation:pulse-live 2s ease-in-out infinite;">🐕</div>
                            <div style="color:#B043FF;font-size:13px;font-weight:bold;text-align:center;text-shadow:0 0 8px #B043FF;">Click to Feed (10 codes)</div>
                        </div>`;
                    fallbackDog.style.cursor = 'pointer';
                    fallbackDog.title = 'Click to feed 10 codes!';
                    fallbackDog.onclick = async () => {
                        const count = window.__SAFE_SELECTED_CODES__?.size ?? 0;
                        if (count < 10) {
                            showFeedPopup(`Need 10 codes to feed! (You have ${count} selected)`);
                            return;
                        }
                        showFeedConfirmation(Array.from(window.__SAFE_SELECTED_CODES__).slice(0, 10));
                    };
                    console.log('[WatchDog] 🐕 Fallback: showing ALIVE 2D dog (clickable)');
                }

                // Inject CSS animations if not already present
                if (!document.getElementById('fallback-dog-style')) {
                    const style = document.createElement('style');
                    style.id = 'fallback-dog-style';
                    style.textContent = `
                        @keyframes pulse-live { 0%,100%{transform:scale(1);} 50%{transform:scale(1.08);} }
                        @keyframes pulse-dead { 0%,100%{opacity:1;} 50%{opacity:0.5;} }
                    `;
                    document.head.appendChild(style);
                }

                container.appendChild(fallbackDog);
                console.log('[WatchDog] Fallback 2D dog created (state: ' + initialDogState + ')');
            } catch (fallbackErr) {
                console.error('[WatchDog] Fallback also failed:', fallbackErr);
            }
        } finally {
            window.__DOG_INITIALIZING__ = false;
        }
    }

    /**
     * PAGINATION LOGIC
     */
    function updatePagination(list, renderCallback) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return list.slice(0, PAGE_SIZE);

        const maxPage = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
        if (window.SAFE_PAGE > maxPage) window.SAFE_PAGE = maxPage;

        pagination.style.display = list.length > PAGE_SIZE ? 'flex' : 'none';

        const currentEl = document.getElementById('current-page');
        const totalEl = document.getElementById('total-pages');
        if (currentEl) currentEl.textContent = window.SAFE_PAGE;
        if (totalEl) totalEl.textContent = maxPage;

        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (prevBtn) {
            prevBtn.disabled = window.SAFE_PAGE <= 1;
            // 🛡️ RE-BIND ON EVERY CALL: Ensure the renderCallback is fresh and not locked
            prevBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.SAFE_PAGE > 1) {
                    window.SAFE_PAGE--;
                    console.log('[Pagination] Prev clicked, new page:', window.SAFE_PAGE);
                    if (typeof renderCallback === 'function') renderCallback();
                }
            };
        }

        if (nextBtn) {
            nextBtn.disabled = window.SAFE_PAGE >= maxPage;
            // 🛡️ RE-BIND ON EVERY CALL: Ensure the renderCallback is fresh and not locked
            nextBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.SAFE_PAGE < maxPage) {
                    window.SAFE_PAGE++;
                    console.log('[Pagination] Next clicked, new page:', window.SAFE_PAGE);
                    if (typeof renderCallback === 'function') renderCallback();
                }
            };
        }

        const start = (window.SAFE_PAGE - 1) * PAGE_SIZE;
        return list.slice(start, start + PAGE_SIZE);
    }

    /**
     * ASSET SENDING LOGIC
     */
    function setupSendButton() {
        let sendBtn = document.getElementById('safe-send-btn');
        if (!sendBtn) {
            sendBtn = document.createElement('button');
            sendBtn.id = 'safe-send-btn';
            sendBtn.className = 'tab-btn active';
            // Positioned beside the pagination panel
            sendBtn.style.cssText = `
                position: fixed; 
                bottom: 25px; 
                right: 20px; 
                z-index: 10001; 
                padding: 10px 20px; 
                border-radius: 12px; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.5); 
                display: none;
                font-weight: 600;
                border: 1px solid rgba(255,255,255,0.2);
                background: linear-gradient(135deg, #B043FF, #FF77E9);
                color: white;
                cursor: pointer;
                pointer-events: auto;
            `;
            document.body.appendChild(sendBtn);
            
            sendBtn.onclick = async () => {
                const codes = Array.from(window.__SAFE_SELECTED_CODES__);
                if (!codes.length) return;
                
                // Show recipient popup
                showSendPopup(codes);
            };
        }
        updateSendButtonVisibility();
    }

    function updateSendButtonVisibility() {
        const sendBtn = document.getElementById('safe-send-btn');
        if (!sendBtn) return;
        
        const count = window.__SAFE_SELECTED_CODES__.size;
        sendBtn.style.display = count > 0 ? 'flex' : 'none';
        sendBtn.innerHTML = `<span>📤</span> Send ${count > 1 ? `(${count})` : ''} Assets`;
    }

    function showSendPopup(codes) {
        // 🛡️ CRITICAL AUTH status check — robust multi-fallback (fixes iframe context where getStatus() may not exist)
        function _resolveAuthStatus() {
            if (window.Auth && typeof window.Auth.getStatus === 'function') {
                return window.Auth.getStatus();
            }
            if (window.Auth && typeof window.Auth.isAuthenticated === 'function') {
                return window.Auth.isAuthenticated() ? 'authenticated' : 'unauthenticated';
            }
            if (window.__AUTH_READY__ || window.__AUTH_STATE__?.authenticated) {
                return 'authenticated';
            }
            try {
                if (window.top && window.top !== window && window.top.Auth && typeof window.top.Auth.isAuthenticated === 'function') {
                    return window.top.Auth.isAuthenticated() ? 'authenticated' : 'unauthenticated';
                }
            } catch(e) {}
            return 'unauthenticated';
        }
        const authStatus = _resolveAuthStatus();
        if (authStatus !== 'authenticated') {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:30000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
            overlay.innerHTML = `
                <div style="background: #121212; padding: 40px; border-radius: 24px; border: 1px solid #ff4444; width: 400px; text-align:center; box-shadow: 0 0 50px rgba(255, 68, 68, 0.2);">
                    <div style="font-size: 48px; margin-bottom: 20px;">🔒</div>
                    <h3 style="color:#fff; margin-bottom: 15px;">Authentication Required</h3>
                    <p style="color:#8b949e; margin-bottom: 25px; line-height:1.6;">${authStatus === 'loading' ? 'Authenticating your session...' : 'You must be logged in to transfer assets.'}</p>
                    <button id="close-auth-error" class="tab-btn active" style="width:100%; background:#ff4444; border:none; padding:15px; border-radius:12px; color:#fff; font-weight:bold; cursor:pointer;">GOT IT</button>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.querySelector('#close-auth-error').onclick = () => document.body.removeChild(overlay);
            return;
        }

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:20000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
        
        const popup = document.createElement('div');
        popup.style.cssText = 'background: #121212; padding: 40px; border-radius: 24px; border: 1px solid #B043FF; width: 450px; box-shadow: 0 0 50px rgba(176, 67, 255, 0.3); position: relative; overflow: hidden;';
        
        // Add a subtle background glow
        const glow = document.createElement('div');
        glow.style.cssText = 'position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle, rgba(176,67,255,0.05) 0%, transparent 70%);pointer-events:none;';
        popup.appendChild(glow);

        popup.innerHTML += `
            <div style="position:relative; z-index:1;">
                <h3 style="margin-bottom:15px;color:#fff;text-align:center;font-size:24px;letter-spacing:1px;">TRANSFER ASSETS</h3>
                <div style="height:2px; width:60px; background:#B043FF; margin: 0 auto 25px;"></div>
                
                <p style="color:#8b949e;margin-bottom:30px;font-size:15px;text-align:center;line-height:1.6;">
                    You are sending <span style="color:#fff;font-weight:bold;">${codes.length}</span> asset(s).<br>
                    Please enter the recipient's registered email below.
                </p>

                <div style="margin-bottom:30px;">
                    <label style="display:block;color:#B043FF;margin-bottom:10px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Recipient Email</label>
                    <div style="position:relative;">
                        <span style="position:absolute;left:15px;top:50%;transform:translateY(-50%);color:#8b949e;">📧</span>
                        <input type="email" id="recipient-email" placeholder="user@example.com" 
                            style="width:100%;padding:15px 15px 15px 45px;background:#1a1a1a;border:1px solid #333;border-radius:12px;color:#fff;outline:none;font-size:16px;transition:border-color 0.3s;">
                    </div>
                </div>

                <div style="display:flex;gap:15px;">
                    <button id="cancel-send" class="tab-btn" style="flex:1;padding:15px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;font-weight:bold;cursor:pointer;">CANCEL</button>
                    <button id="confirm-send" class="tab-btn active" style="flex:1.5;padding:15px;border-radius:12px;background:linear-gradient(135deg, #B043FF, #FF77E9);border:none;color:#fff;font-weight:bold;cursor:pointer;box-shadow:0 4px 15px rgba(176,67,255,0.4);">GO!</button>
                </div>
            </div>
        `;
        
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        const emailInput = popup.querySelector('#recipient-email');
        emailInput.focus();

        // Input focus effect
        emailInput.onfocus = () => emailInput.style.borderColor = '#B043FF';
        emailInput.onblur = () => emailInput.style.borderColor = '#333';

        popup.querySelector('#cancel-send').onclick = () => document.body.removeChild(overlay);
        
        popup.querySelector('#confirm-send').onclick = async (e) => {
            const confirmBtn = e.currentTarget;
            const email = emailInput.value.trim();
            
            if (!email || !email.includes('@')) {
                emailInput.style.borderColor = '#ff4444';
                emailInput.animate([
                    { transform: 'translateX(-5px)' },
                    { transform: 'translateX(5px)' },
                    { transform: 'translateX(0)' }
                ], { duration: 200, iterations: 3 });
                return;
            }

            // 🛡️ FRONTEND LOCK: Disable button to prevent double submission
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'not-allowed';
            confirmBtn.innerHTML = 'PROCESSING...';
            
            const content = popup.querySelector('div[style*="z-index:1"]');
            const originalContent = content.innerHTML;
            
            content.innerHTML = `
                <div style="text-align:center;padding:40px 20px;">
                    <div class="spinner" style="margin:0 auto 25px; width:60px; height:60px; border-width:4px;"></div>
                    <h3 style="color:#fff;margin-bottom:10px;font-size:20px;">Processing...</h3>
                    <p style="color:#8b949e;">Verifying recipient and finalizing ledger entries.</p>
                </div>
            `;
            
            // 🛡️ REQUEST TIMEOUT: 10s timeout using AbortController
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            try {
                // Determine current tab to set asset type
                const assetType = window.ACTIVE_ASSET_TAB || 'codes';
                
                // 🛡️ PRODUCTION FIX: Unique transaction ID
                const transactionId = crypto.randomUUID();
                
                console.log(`[CLIENT] Sending transfer request. Asset: ${assetType}, Codes: ${codes.length}, TxId: ${transactionId}`);

                const response = await fetch('/api/transfer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        transactionId,
                        codes: codes,
                        receiverEmail: email,
                        type: assetType
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || result.message || 'Transfer failed');
                }
                
                // 🏆 SUCCESS: FORCING SERVER SYNC
                console.log('[CLIENT] Transfer success. Forcing server sync.');
                window.dispatchEvent(new CustomEvent('tx:success'));
                window.__SAFE_SELECTED_CODES__.clear();
                updateSendButtonVisibility();
                
                // Force AssetBus to sync from server (the only source of truth)
                if (window.AssetBus && typeof window.AssetBus.sync === 'function') {
                    await window.AssetBus.sync();
                }
                
                content.innerHTML = `
                    <div style="text-align:center;padding:40px 20px;">
                        <div style="font-size:64px;margin-bottom:25px;animation: fadeInUp 0.5s ease;">✅</div>
                        <h3 style="color:#fff;margin-bottom:15px;font-size:24px;">TRANSFER COMPLETE</h3>
                        <p style="color:#8b949e;margin-bottom:30px;line-height:1.6;">
                            Successfully transferred <span style="color:#fff;font-weight:bold;">${codes.length}</span> asset(s) to:<br>
                            <span style="color:var(--primary-color);font-weight:bold;">${email}</span>
                        </p>
                        <button id="close-success" class="tab-btn active" style="width:100%;padding:15px;border-radius:12px;background:linear-gradient(135deg, #B043FF, #FF77E9);border:none;color:#fff;font-weight:bold;cursor:pointer;">AWESOME!</button>
                    </div>
                `;
                
                popup.querySelector('#close-success').onclick = () => {
                    document.body.removeChild(overlay);
                    // Refresh the asset list via AssetBus sync
                    if (window.AssetBus && typeof window.AssetBus.sync === 'function') {
                        window.AssetBus.sync();
                    } else {
                        window.location.reload();
                    }
                };
                
            } catch (err) {
                clearTimeout(timeoutId);
                window.dispatchEvent(new CustomEvent('tx:error'));
                
                let errorMessage = err.message;
                if (err.name === 'AbortError') {
                    errorMessage = 'Request timed out. Please check your connection.';
                }

                content.innerHTML = `
                    <div style="text-align:center;padding:40px 20px;">
                        <div style="font-size:64px;margin-bottom:25px;">❌</div>
                        <h3 style="color:#fff;margin-bottom:15px;font-size:24px;">TRANSFER FAILED</h3>
                        <p style="color:#ff4444;margin-bottom:30px;line-height:1.6;">${errorMessage}</p>
                        <button id="close-error" class="tab-btn active" style="width:100%;padding:15px;border-radius:12px;background:rgba(255,255,255,0.1);border:1px solid #ff4444;color:#fff;font-weight:bold;cursor:pointer;">TRY AGAIN</button>
                    </div>
                `;
                popup.querySelector('#close-error').onclick = () => {
                    // Restore original content to allow retry
                    content.innerHTML = originalContent;
                    // Re-bind email focus events
                    const newEmailInput = content.querySelector('#recipient-email');
                    if (newEmailInput) {
                        newEmailInput.value = email; // Keep the email
                        newEmailInput.onfocus = () => newEmailInput.style.borderColor = '#B043FF';
                        newEmailInput.onblur = () => newEmailInput.style.borderColor = '#333';
                    }
                    // No need to remove overlay, just let user try again
                    document.body.removeChild(overlay);
                };
            }
        };
    }

    function showFeedPopup(msg) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:30000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);';
        
        const popup = document.createElement('div');
        popup.style.cssText = 'background: #1a1b1e; padding: 30px; border-radius: 20px; border: 1px solid #B043FF; width: 350px; text-align: center;';
        
        popup.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 15px;">🍖</div>
            <h3 style="color:#fff; margin-bottom: 10px;">Hungry Guardian</h3>
            <p style="color:#8b949e; font-size: 14px; margin-bottom: 20px;">${msg}</p>
            <button id="close-feed-info" class="tab-btn active" style="width:100%;">OK</button>
        `;
        
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        popup.querySelector('#close-feed-info').onclick = () => document.body.removeChild(overlay);
    }

    function showFeedConfirmation(codes) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:30000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);';
        
        const popup = document.createElement('div');
        popup.style.cssText = 'background: #1a1b1e; padding: 30px; border-radius: 20px; border: 1px solid #B043FF; width: 400px; text-align: center;';
        
        popup.innerHTML = `
            <div style="font-size: 50px; margin-bottom: 15px;">🍖</div>
            <h3 style="color:#fff; margin-bottom: 10px;">FEED THE GUARDIAN?</h3>
            <p style="color:#8b949e; font-size: 14px; margin-bottom: 25px;">
                You are about to feed 10 codes to the Watch-Dog.<br>
                This will keep him active for another 24 hours.
            </p>
            <div style="display:flex; gap:10px;">
                <button id="cancel-feed" class="tab-btn" style="flex:1;">NOT NOW</button>
                <button id="confirm-feed" class="tab-btn active" style="flex:1;">FEED (10 CODES)</button>
            </div>
        `;
        
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        popup.querySelector('#cancel-feed').onclick = () => document.body.removeChild(overlay);
        
        popup.querySelector('#confirm-feed').onclick = async () => {
            popup.innerHTML = `<div style="padding:20px;"><div class="spinner" style="margin:0 auto 20px;"></div><p style="color:#fff;">Feeding Guardian...</p></div>`;
            
            try {
                const response = await fetch('/api/watchdog/feed', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ codes })
                });
                
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.error || 'Feeding failed');
                
                // 🏆 SUCCESS
                if (window.__GUARDIAN__) window.__GUARDIAN__.setState('healing');
                window.__SAFE_SELECTED_CODES__.clear();
                updateSendButtonVisibility();
                
                popup.innerHTML = `
                    <div style="padding:20px;">
                        <div style="font-size:64px; margin-bottom:20px;">🐕❤️</div>
                        <h3 style="color:#fff; margin-bottom:10px;">DOG FED!</h3>
                        <p style="color:#8b949e; margin-bottom:20px;">The Guardian is now active and protecting your assets.</p>
                        <button id="close-feed-success" class="tab-btn active" style="width:100%;">GREAT!</button>
                    </div>
                `;
                
                popup.querySelector('#close-feed-success').onclick = () => {
                    document.body.removeChild(overlay);
                    if (window.AssetBus) window.AssetBus.sync();
                    else window.location.reload();
                };
                
            } catch (err) {
                popup.innerHTML = `
                    <div style="padding:20px;">
                        <div style="font-size:64px; margin-bottom:20px;">❌</div>
                        <h3 style="color:#fff; margin-bottom:10px;">FEEDING FAILED</h3>
                        <p style="color:#ff4444; margin-bottom:20px;">${err.message}</p>
                        <button id="close-feed-error" class="tab-btn active" style="width:100%;">OK</button>
                    </div>
                `;
                popup.querySelector('#close-feed-error').onclick = () => document.body.removeChild(overlay);
            }
        };
    }

    // Export to window
    window.SafeActions = {
        updatePagination,
        setupSendButton,
        updateSendButtonVisibility,
        initWatchDogGuardian,
        PAGE_SIZE
    };

    // Auto-init on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWatchDogGuardian);
    } else {
        initWatchDogGuardian();
    }

})(window);
