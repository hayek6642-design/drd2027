/**
 * Authentication utilities for the modal authentication gate
 */

/**
 * Manually trigger the authentication modal
 * This can be called from anywhere in the application to show the modal
 */
export const triggerAuthentication = () => {
  if (window.__AUTH_OVERLAY_DISABLED__ === true) return;
  const event = new CustomEvent('trigger-authentication');
  window.dispatchEvent(event);
};

/**
 * Programmatically show authentication modal
 * This can be used for testing or programmatic authentication flows
 */
export const showAuthenticationModal = () => {
  if (window.__AUTH_OVERLAY_DISABLED__ === true) return;
  // Create a mock YouTube verification dialog to trigger our modal
  const mockDialog = document.createElement('div');
  mockDialog.textContent = '🔒 Identity Verification Required';
  mockDialog.style.display = 'none'; // Hide it but let our observer detect it
  document.body.appendChild(mockDialog);
  
  // Clean up after a short delay
  setTimeout(() => {
    if (mockDialog.parentNode) {
      mockDialog.parentNode.removeChild(mockDialog);
    }
  }, 1000);
};

/**
 * Check if user is currently authenticated
 * This would typically check against your authentication state
 */
export const isAuthenticated = () => {
  // This would check your actual authentication state
  // For now, we'll use a simple localStorage check
  return !!localStorage.getItem('user_authenticated');
};

/**
 * Set authentication state
 */
export const setAuthenticated = (authenticated) => {
  if (authenticated) {
    localStorage.setItem('user_authenticated', 'true');
  } else {
    localStorage.removeItem('user_authenticated');
  }
};

/**
 * Validate user credentials with backend
 */
export const validateCredentials = async (credentials) => {
  try {
    const response = await fetch('/api/auth/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    });
    
    if (!response.ok) {
      throw new Error('Authentication validation failed');
    }
    
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Authentication validation error:', error);
    return false;
  }
};
