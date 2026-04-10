/**
 * Session UI Integration
 * Integrates email display and logout into CodeBank UI
 */

(function() {
    'use strict';
    
    // Wait for SessionManager to be ready
    function initSessionUI() {
        if (!window.SessionManager) {
            setTimeout(initSessionUI, 100);
            return;
        }
        
        console.log('[SessionUI] Initializing...');
        
        // Create sidebar container if it doesn't exist
        const sidebar = document.getElementById('session-sidebar') || createSessionSidebar();
        
        // Update email display
        updateEmailDisplay();
        
        // Listen for auth events
        window.addEventListener('auth:ready', updateEmailDisplay);
        window.addEventListener('auth:login', updateEmailDisplay);
        window.addEventListener('auth:logout', () => {
            updateEmailDisplay();
        });
    }
    
    function createSessionSidebar() {
        const container = document.createElement('div');
        container.id = 'session-sidebar';
        container.innerHTML = `
            <style>
                #session-sidebar {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 10000;
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 20px;
                    min-width: 280px;
                    max-width: 320px;
                }
                
                .session-user-card {
                    background: linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(138, 43, 226, 0.1) 100%);
                    border: 1px solid rgba(0, 212, 255, 0.3);
                    border-radius: 12px;
                    padding: 16px;
                    text-align: center;
                    margin-bottom: 14px;
                }
                
                .session-avatar {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #00d4ff 0%, #8a2be2 100%);
                    margin: 0 auto 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                }
                
                .session-label {
                    font-size: 10px;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 6px;
                }
                
                .session-email {
                    font-size: 13px;
                    font-weight: 600;
                    color: #00d4ff;
                    word-break: break-all;
                    line-height: 1.4;
                }
                
                .session-status {
                    font-size: 10px;
                    color: #4ade80;
                    margin-top: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                }
                
                .session-status-dot {
                    width: 6px;
                    height: 6px;
                    background: #4ade80;
                    border-radius: 50%;
                    display: inline-block;
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.2); }
                }
                
                .session-logout-btn {
                    width: 100%;
                    padding: 12px;
                    background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%);
                    border: none;
                    border-radius: 10px;
                    color: white;
                    font-weight: 600;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                
                .session-logout-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px rgba(255, 71, 87, 0.3);
                }
                
                .session-logout-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
            </style>
            
            <div class="session-user-card">
                <div class="session-avatar">👤</div>
                <div class="session-label">Logged in as</div>
                <div class="session-email" id="session-email-display">Loading...</div>
                <div class="session-status" id="session-status">
                    <span class="session-status-dot"></span>
                    <span>Active Session</span>
                </div>
            </div>
            
            <button class="session-logout-btn" id="session-logout-btn" onclick="handleSessionLogout()">
                <span>🚪</span>
                <span>Sign Out</span>
            </button>
        `;
        
        document.body.appendChild(container);
        return container;
    }
    
    function updateEmailDisplay() {
        const emailEl = document.getElementById('session-email-display');
        const statusEl = document.getElementById('session-status');
        
        if (!emailEl) return;
        
        const user = window.SessionManager?.getUser();
        const email = user?.email || window.SessionManager?.getEmail();
        
        if (email && window.SessionManager?.isAuthenticated()) {
            emailEl.textContent = email;
            emailEl.style.color = '#00d4ff';
            
            if (statusEl) {
                statusEl.innerHTML = `
                    <span class="session-status-dot"></span>
                    <span>Active Session</span>
                `;
            }
        } else {
            emailEl.textContent = 'Not logged in';
            emailEl.style.color = '#ff6b6b';
            
            if (statusEl) {
                statusEl.innerHTML = `
                    <span class="session-status-dot" style="background: #ff6b6b; animation: none;"></span>
                    <span>No Session</span>
                `;
            }
        }
    }
    
    // Global logout handler
    window.handleSessionLogout = async function() {
        const btn = document.getElementById('session-logout-btn');
        if (!confirm('Are you sure you want to sign out?')) return;
        
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span><span>Signing out...</span>';
        
        await window.SessionManager.logout();
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSessionUI);
    } else {
        setTimeout(initSessionUI, 500);
    }
})();
