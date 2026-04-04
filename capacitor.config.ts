import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.codebank.app',
  appName: 'CodeBank',
  webDir: 'www',
  
  // Server configuration - points to your Render backend
  server: {
    // In production, use the live URL for OTA updates
    url: 'https://drd2027.onrender.com',
    cleartext: true,
    allowNavigation: [
      'drd2027.onrender.com',
      '*.onrender.com',
      '*.googleapis.com',
      '*.youtube.com',
      '*.google.com',
      '*.gstatic.com',
      '*.firebaseapp.com',
      '*.cloudfunctions.net',
      'cdn.jsdelivr.net',
      'cdnjs.cloudflare.com',
      'unpkg.com',
      'fonts.googleapis.com',
      'fonts.gstatic.com'
    ],
    // Error handling - show custom error page instead of white screen
    errorPath: '/error.html'
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0d1117',
      showSpinner: true,
      spinnerColor: '#00d4ff',
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0d1117'
    },
    Keyboard: {
      resize: 'ionic',
      style: 'DARK'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#00d4ff'
    },
    CapacitorHttp: {
      enabled: true  // Use native HTTP for CORS-free requests
    },
    CapacitorCookies: {
      enabled: true  // Native cookie support for session auth
    }
  },

  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#0d1117',
    // Custom scheme for loading local assets
    // This avoids CORS issues in WebView
    overrideUserAgent: 'CodeBank-Android/1.0',
    appendUserAgent: ' CodeBankNative',
    // Enable hardware acceleration for YouTube player
    useLegacyBridge: false
  },

  ios: {
    contentInset: 'always',
    backgroundColor: '#0d1117',
    preferredContentMode: 'mobile',
    overrideUserAgent: 'CodeBank-iOS/1.0',
    appendUserAgent: ' CodeBankNative',
    // WKWebView configuration
    limitsNavigationsToAppBoundDomains: false,
    allowsLinkPreview: false
  }
};

export default config;
