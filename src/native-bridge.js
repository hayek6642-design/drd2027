/**
 * native-bridge.js - Capacitor Native Bridge for CodeBank
 * 
 * Provides a unified interface between web and native capabilities.
 * Detects platform and routes calls to appropriate handlers.
 * 
 * Usage:
 *   import { NativeBridge } from './native-bridge.js';
 *   if (NativeBridge.isNative()) { ... }
 */

const NativeBridge = (() => {
  'use strict';

  // ==========================================
  // Platform Detection
  // ==========================================
  
  const _platform = (() => {
    try {
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        return window.Capacitor.getPlatform(); // 'android' | 'ios'
      }
    } catch (_) {}
    return 'web';
  })();

  const _isNative = _platform === 'android' || _platform === 'ios';

  // ==========================================
  // Capacitor Plugin Lazy Loaders
  // ==========================================

  let _plugins = {};

  async function getPlugin(name) {
    if (_plugins[name]) return _plugins[name];
    
    try {
      if (window.Capacitor && window.Capacitor.Plugins) {
        _plugins[name] = window.Capacitor.Plugins[name];
        return _plugins[name];
      }
    } catch (e) {
      console.warn(`[NativeBridge] Plugin ${name} not available:`, e.message);
    }
    return null;
  }

  // ==========================================
  // Network & HTTP (CORS-free on native)
  // ==========================================

  /**
   * Make an HTTP request that bypasses CORS on native platforms.
   * Falls back to standard fetch on web.
   */
  async function nativeFetch(url, options = {}) {
    if (!_isNative) {
      return window.fetch(url, options);
    }

    try {
      const CapacitorHttp = await getPlugin('CapacitorHttp');
      if (!CapacitorHttp) {
        return window.fetch(url, options);
      }

      const response = await CapacitorHttp.request({
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        data: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
        webFetchExtra: {
          credentials: options.credentials || 'include'
        }
      });

      // Convert Capacitor response to fetch-like Response
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        headers: new Headers(response.headers || {}),
        json: async () => typeof response.data === 'string' ? JSON.parse(response.data) : response.data,
        text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
        blob: async () => new Blob([response.data])
      };
    } catch (err) {
      console.error('[NativeBridge] nativeFetch error:', err);
      // Fallback to standard fetch
      return window.fetch(url, options);
    }
  }

  // ==========================================
  // Cookie Management (native sessions)
  // ==========================================

  async function setCookie(url, name, value) {
    if (!_isNative) return;
    try {
      const Cookies = await getPlugin('CapacitorCookies');
      if (Cookies) {
        await Cookies.setCookie({ url, key: name, value });
      }
    } catch (e) {
      console.warn('[NativeBridge] setCookie error:', e.message);
    }
  }

  async function getCookies(url) {
    if (!_isNative) return {};
    try {
      const Cookies = await getPlugin('CapacitorCookies');
      if (Cookies) {
        const result = await Cookies.getCookies({ url });
        return result.cookies || result || {};
      }
    } catch (e) {
      console.warn('[NativeBridge] getCookies error:', e.message);
    }
    return {};
  }

  async function clearCookies(url) {
    if (!_isNative) return;
    try {
      const Cookies = await getPlugin('CapacitorCookies');
      if (Cookies) {
        await Cookies.clearCookies({ url });
      }
    } catch (e) {
      console.warn('[NativeBridge] clearCookies error:', e.message);
    }
  }

  // ==========================================
  // Push Notifications
  // ==========================================

  async function initPushNotifications(onReceive, onAction) {
    if (!_isNative) {
      console.log('[NativeBridge] Push notifications not available on web');
      return false;
    }

    try {
      const PushNotifications = await getPlugin('PushNotifications');
      if (!PushNotifications) return false;

      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') {
        console.warn('[NativeBridge] Push notification permission denied');
        return false;
      }

      // Register for push
      await PushNotifications.register();

      // Listen for registration token
      PushNotifications.addListener('registration', (token) => {
        console.log('[NativeBridge] Push token:', token.value);
        // Send token to server for future push sends
        sendPushTokenToServer(token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('[NativeBridge] Push registration error:', error);
      });

      // Listen for push received while app is open
      if (onReceive) {
        PushNotifications.addListener('pushNotificationReceived', onReceive);
      }

      // Listen for push action (user tapped notification)
      if (onAction) {
        PushNotifications.addListener('pushNotificationActionPerformed', onAction);
      }

      return true;
    } catch (e) {
      console.error('[NativeBridge] Push init error:', e);
      return false;
    }
  }

  async function sendPushTokenToServer(token) {
    try {
      await nativeFetch('/api/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, platform: _platform }),
        credentials: 'include'
      });
    } catch (e) {
      console.warn('[NativeBridge] Failed to register push token:', e.message);
    }
  }

  // ==========================================
  // Local Notifications (for background sync)
  // ==========================================

  async function showLocalNotification(title, body, data = {}) {
    if (!_isNative) {
      // Web fallback: use Notification API
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, data });
      }
      return;
    }

    try {
      const LocalNotifications = await getPlugin('LocalNotifications');
      if (LocalNotifications) {
        await LocalNotifications.schedule({
          notifications: [{
            title,
            body,
            id: Date.now(),
            extra: data,
            smallIcon: 'ic_stat_icon',
            iconColor: '#00d4ff'
          }]
        });
      }
    } catch (e) {
      console.warn('[NativeBridge] Local notification error:', e.message);
    }
  }

  // ==========================================
  // App State & Lifecycle
  // ==========================================

  async function onAppStateChange(callback) {
    if (!_isNative) return;
    try {
      const App = await getPlugin('App');
      if (App) {
        App.addListener('appStateChange', callback);
      }
    } catch (e) {
      console.warn('[NativeBridge] App state listener error:', e.message);
    }
  }

  async function onBackButton(callback) {
    if (!_isNative) return;
    try {
      const App = await getPlugin('App');
      if (App) {
        App.addListener('backButton', callback);
      }
    } catch (e) {
      console.warn('[NativeBridge] Back button listener error:', e.message);
    }
  }

  // ==========================================
  // Status Bar
  // ==========================================

  async function setStatusBarColor(color) {
    if (!_isNative) return;
    try {
      const StatusBar = await getPlugin('StatusBar');
      if (StatusBar) {
        await StatusBar.setBackgroundColor({ color });
      }
    } catch (e) {}
  }

  async function hideStatusBar() {
    if (!_isNative) return;
    try {
      const StatusBar = await getPlugin('StatusBar');
      if (StatusBar) await StatusBar.hide();
    } catch (e) {}
  }

  async function showStatusBar() {
    if (!_isNative) return;
    try {
      const StatusBar = await getPlugin('StatusBar');
      if (StatusBar) await StatusBar.show();
    } catch (e) {}
  }

  // ==========================================
  // Splash Screen
  // ==========================================

  async function hideSplash() {
    if (!_isNative) return;
    try {
      const SplashScreen = await getPlugin('SplashScreen');
      if (SplashScreen) {
        await SplashScreen.hide();
      }
    } catch (e) {}
  }

  // ==========================================
  // Share
  // ==========================================

  async function share(title, text, url) {
    if (!_isNative) {
      if (navigator.share) {
        return navigator.share({ title, text, url });
      }
      return;
    }

    try {
      const Share = await getPlugin('Share');
      if (Share) {
        await Share.share({ title, text, url, dialogTitle: title });
      }
    } catch (e) {
      console.warn('[NativeBridge] Share error:', e.message);
    }
  }

  // ==========================================
  // Clipboard
  // ==========================================

  async function writeClipboard(text) {
    if (!_isNative) {
      return navigator.clipboard?.writeText(text);
    }
    try {
      const Clipboard = await getPlugin('Clipboard');
      if (Clipboard) {
        await Clipboard.write({ string: text });
      }
    } catch (e) {
      // Fallback
      navigator.clipboard?.writeText(text);
    }
  }

  async function readClipboard() {
    if (!_isNative) {
      return navigator.clipboard?.readText();
    }
    try {
      const Clipboard = await getPlugin('Clipboard');
      if (Clipboard) {
        const result = await Clipboard.read();
        return result.value;
      }
    } catch (e) {
      return navigator.clipboard?.readText();
    }
  }

  // ==========================================
  // Network Status
  // ==========================================

  async function getNetworkStatus() {
    try {
      const Network = await getPlugin('Network');
      if (Network) {
        return await Network.getStatus();
      }
    } catch (e) {}
    return { connected: navigator.onLine, connectionType: 'unknown' };
  }

  async function onNetworkChange(callback) {
    try {
      const Network = await getPlugin('Network');
      if (Network) {
        Network.addListener('networkStatusChange', callback);
        return;
      }
    } catch (e) {}
    // Web fallback
    window.addEventListener('online', () => callback({ connected: true }));
    window.addEventListener('offline', () => callback({ connected: false }));
  }

  // ==========================================
  // Device Info
  // ==========================================

  async function getDeviceInfo() {
    try {
      const Device = await getPlugin('Device');
      if (Device) {
        return await Device.getInfo();
      }
    } catch (e) {}
    return {
      platform: 'web',
      model: navigator.userAgent,
      osVersion: navigator.platform,
      isVirtual: false
    };
  }

  // ==========================================
  // Safe Area Insets (for notch/dynamic island)
  // ==========================================

  function getSafeAreaInsets() {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
      bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
      left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
      right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0')
    };
  }

  // ==========================================
  // Public API
  // ==========================================

  return {
    // Platform
    platform: () => _platform,
    isNative: () => _isNative,
    isAndroid: () => _platform === 'android',
    isIOS: () => _platform === 'ios',
    isWeb: () => _platform === 'web',
    
    // Network
    nativeFetch,
    getNetworkStatus,
    onNetworkChange,
    
    // Cookies (auth session)
    setCookie,
    getCookies,
    clearCookies,
    
    // Notifications
    initPushNotifications,
    showLocalNotification,
    
    // App lifecycle
    onAppStateChange,
    onBackButton,
    
    // UI
    setStatusBarColor,
    hideStatusBar,
    showStatusBar,
    hideSplash,
    getSafeAreaInsets,
    
    // Share & Clipboard
    share,
    writeClipboard,
    readClipboard,
    
    // Device
    getDeviceInfo
  };
})();

// Make globally available
window.NativeBridge = NativeBridge;

// Auto-initialize on native platforms
if (NativeBridge.isNative()) {
  console.log(`[NativeBridge] Running on ${NativeBridge.platform()} native platform`);
  
  // Handle back button on Android
  NativeBridge.onBackButton(({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      // If on main screen, minimize app instead of closing
      if (window.Capacitor && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.minimizeApp();
      }
    }
  });

  // Handle app resume - sync data
  NativeBridge.onAppStateChange(({ isActive }) => {
    if (isActive) {
      console.log('[NativeBridge] App resumed - syncing data');
      // Trigger data sync when app comes back to foreground
      if (window.AssetBus && typeof window.AssetBus.sync === 'function') {
        window.AssetBus.sync();
      }
      if (window.__BANKODE_INSTANCE__ && typeof window.__BANKODE_INSTANCE__.syncWithServer === 'function') {
        window.__BANKODE_INSTANCE__.syncWithServer();
      }
    }
  });

  // Hide splash screen once DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => NativeBridge.hideSplash(), 500);
  });
}

// NativeBridge is already available globally via window.NativeBridge
