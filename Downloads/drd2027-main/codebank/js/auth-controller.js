/**
 * Auth Controller - Single source of truth for authentication UI state
 * Only ONE state is visible at a time:
 * - 'not-logged': Show Sign In button
 * - 'login-modal': Show login modal
 * - 'signup-modal': Show signup modal
 * - 'logged-in': Show email + Sign Out button
 */

class AuthController {
    constructor() {
        this.currentState = 'not-logged';
        this.user = null;
        this.token = null;
        console.log('[AuthController] Initialized');
    }

    init() {
        this.bindUIEvents();
        this.checkExistingSession();
    }

    /**
     * CRITICAL: Bind ALL UI events - MUST happen after DOM load
     */
    bindUIEvents() {
        // Sign In button opens login modal
        const btnShowLogin = document.getElementById('btn-show-login');
        if (btnShowLogin) {
            btnShowLogin.addEventListener('click', () => this.showLoginModal());
        }

        // Close login modal
        const loginClose = document.getElementById('login-close');
        if (loginClose) {
            loginClose.addEventListener('click', () => this.closeModals());
        }

        // Sign In form submission
        const signinForm = document.getElementById('signin-form');
        if (signinForm) {
            signinForm.addEventListener('submit', (e) => this.handleSignIn(e));
        }

        // Close signup modal
        const signupClose = document.getElementById('signup-close');
        if (signupClose) {
            signupClose.addEventListener('click', () => this.closeModals());
        }

        // Sign Up form submission
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignUp(e));
        }

        // Sign Out button
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => this.logout());
        }

        console.log('[AuthController] UI events bound');
    }

    /**
     * STATE MANAGEMENT - Hide all states, show only current one
     */
    setState(newState) {
        console.log('[AuthController] State change:', this.currentState, '->', newState);
        
        // Hide all
        const authNotLogged = document.getElementById('auth-not-logged');
        const loginModal = document.getElementById('login-modal');
        const signupModal = document.getElementById('signup-modal');
        const authLoggedIn = document.getElementById('auth-logged-in');

        if (authNotLogged) authNotLogged.style.display = 'none';
        if (loginModal) loginModal.style.display = 'none';
        if (signupModal) signupModal.style.display = 'none';
        if (authLoggedIn) authLoggedIn.style.display = 'none';

        // Show current
        switch(newState) {
            case 'not-logged':
                if (authNotLogged) authNotLogged.style.display = 'block';
                break;
            case 'login-modal':
                if (loginModal) loginModal.style.display = 'flex';
                break;
            case 'signup-modal':
                if (signupModal) signupModal.style.display = 'flex';
                break;
            case 'logged-in':
                if (authLoggedIn) authLoggedIn.style.display = 'flex';
                break;
        }

        this.currentState = newState;
    }

    showLoginModal() {
        // Redirect to login.html page instead of showing modal
        window.location.href = '/login.html';
    }

    showSignupModal() {
        // Redirect to login.html page with signup mode
        window.location.href = '/login.html?mode=signup';
    }

    closeModals() {
        this.setState('not-logged');
    }

    /**
     * SIGN IN - Email + Password
     */
    async handleSignIn(e) {
        if (e) e.preventDefault();

        const email = document.getElementById('signin-email')?.value;
        const password = document.getElementById('signin-password')?.value;
        const signinStatus = document.getElementById('signin-status');

        if (!email || !password) {
            if (signinStatus) signinStatus.textContent = 'Email and password required';
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.saveSession(data);
                this.setLoggedIn(data.user);
            } else {
                if (signinStatus) {
                    signinStatus.textContent = data.error || 'Login failed';
                }
            }
        } catch (error) {
            console.error('[AuthController] Sign in error:', error);
            if (signinStatus) signinStatus.textContent = 'Network error: ' + error.message;
        }
    }

    /**
     * SIGN UP - Create Account
     */
    async handleSignUp(e) {
        if (e) e.preventDefault();

        const email = document.getElementById('signup-email')?.value;
        const password = document.getElementById('signup-password')?.value;
        const confirm = document.getElementById('signup-confirm')?.value;
        const signupStatus = document.getElementById('signup-status');

        // Validation
        if (!email || !password || !confirm) {
            if (signupStatus) signupStatus.textContent = 'All fields required';
            return;
        }

        if (password !== confirm) {
            if (signupStatus) signupStatus.textContent = 'Passwords do not match';
            return;
        }

        if (password.length < 6) {
            if (signupStatus) signupStatus.textContent = 'Password must be at least 6 characters';
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                // After signup, redirect to login page
                alert('Account created! Please sign in.');
                window.location.href = '/login.html';
            } else {
                if (signupStatus) {
                    signupStatus.textContent = data.error || 'Registration failed';
                }
            }
        } catch (error) {
            console.error('[AuthController] Sign up error:', error);
            if (signupStatus) signupStatus.textContent = 'Network error: ' + error.message;
        }
    }

    /**
     * SET LOGGED IN STATE - Update UI and save session
     */
    setLoggedIn(user) {
        console.log('[AuthController] User logged in:', user.email);
        
        this.user = user;
        
        const userEmailDisplay = document.getElementById('user-email-display');
        if (userEmailDisplay) {
            userEmailDisplay.textContent = user.email;
        }

        this.setState('logged-in');
    }

    /**
     * SAVE SESSION - Store token and user data locally
     */
    saveSession(data) {
        if (data.token) {
            localStorage.setItem('session_token', data.token);
            this.token = data.token;
        }
        if (data.user?.id) {
            localStorage.setItem('userId', data.user.id);
        }
        if (data.user?.email) {
            localStorage.setItem('user_email', data.user.email);
        }
    }

    /**
     * CHECK EXISTING SESSION - Load user if already logged in
     */
    async checkExistingSession() {
        const token = localStorage.getItem('session_token');
        
        if (!token) {
            console.log('[AuthController] No existing session');
            this.setState('not-logged');
            return;
        }

        try {
            const response = await fetch('/api/auth/verify', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.token = token;
                this.setLoggedIn(data.user);
            } else {
                console.log('[AuthController] Session invalid, clearing');
                this.logout();
            }
        } catch (error) {
            console.error('[AuthController] Session check error:', error);
            this.setState('not-logged');
        }
    }

    /**
     * SIGN OUT - Clear session and return to login
     */
    logout() {
        console.log('[AuthController] User signed out');
        
        try {
            localStorage.removeItem('session_token');
            localStorage.removeItem('userId');
            localStorage.removeItem('user_email');
        } catch(e) {}

        this.user = null;
        this.token = null;
        this.setState('not-logged');
        
        // Reload to clear any cached user data
        location.reload();
    }
}

// Initialize controller when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.authController = new AuthController();
        window.authController.init();
    });
} else {
    // DOM already loaded
    window.authController = new AuthController();
    window.authController.init();
}

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthController;
}

// Make functions global for inline event handlers if needed
window.showLoginModal = () => window.location.href = '/login.html';
window.showSignupModal = () => window.location.href = '/login.html?mode=signup';
window.handleSignIn = (e) => window.authController?.handleSignIn(e);
window.handleSignUp = (e) => window.authController?.handleSignUp(e);
window.closeModals = () => window.authController?.closeModals();
