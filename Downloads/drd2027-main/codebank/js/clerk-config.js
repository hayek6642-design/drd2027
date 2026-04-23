// Clerk Configuration
// This file contains Clerk configuration settings

export const clerkConfig = {
  // Disable Email OTP temporarily as requested
  emailOTP: {
    enabled: false,
    // Other OTP settings can be configured here when re-enabled
  },
  
  // Session configuration
  session: {
    // Session duration in milliseconds (7 days)
    duration: 7 * 24 * 60 * 60 * 1000,
    // Allow session reuse across tabs
    allowMultipleSessions: true,
    // Auto-extend session on activity
    autoExtend: true
  },
  
  // User profile configuration
  userProfile: {
    // Allow users to update their profile
    allowProfileUpdate: true,
    // Required fields for user registration
    requiredFields: ['email_address'],
    // Optional fields
    optionalFields: ['first_name', 'last_name']
  },
  
  // Security settings
  security: {
    // Require email verification
    requireEmailVerification: true,
    // Password strength requirements
    passwordStrength: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialCharacters: false
    }
  },
  
  // Appearance settings
  appearance: {
    // Theme configuration
    theme: {
      colors: {
        primary: '#FF6B35',
        textPrimary: '#1F2937',
        textSecondary: '#6B7280',
        background: '#FFFFFF',
        inputBackground: '#F3F4F6',
        error: '#EF4444'
      },
      borderRadius: '8px'
    }
  }
};

// Export configuration for use in frontend
export default clerkConfig;