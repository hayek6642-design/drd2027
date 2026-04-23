/**
 * ============================================================================
 * ZAGEL INTEGRATION HOOKS
 * ============================================================================
 * 
 * This file provides hooks to integrate Zagel Avatar System with your
 * existing DRD2027 codebase events like:
 * - New code uploads
 * - New messages received
 * - New videos posted
 * - New products added
 * - News/announcements
 * 
 * Usage:
 * 1. Include this script AFTER zagel-integration.js in yt-new-clear.html
 * 2. Call the hook functions when events occur in your application
 * 
 * ============================================================================
 */

window.ZagelHooks = window.ZagelHooks || (() => {
  'use strict';

  const hooks = {
    
    /**
     * Hook: New code written or uploaded
     * @param {string} codeTitle - Code title/name
     * @param {string} codeLanguage - Programming language
     * @param {string} codeType - Type (e.g., "snippet", "library", "project")
     */
    onNewCode(codeTitle, codeLanguage, codeType = 'snippet') {
      console.log('[ZagelHooks] New code:', codeTitle);
      
      const description = `${codeLanguage} ${codeType}`;
      ZagelSystem.emitCode(
        `New ${codeType}: ${codeTitle}`,
        description
      );
    },

    /**
     * Hook: New message received
     * @param {string} senderName - Name of message sender
     * @param {string} messagePreview - First 50 chars of message
     * @param {string} messageType - Type (e.g., "chat", "email", "notification")
     */
    onNewMessage(senderName, messagePreview, messageType = 'chat') {
      console.log('[ZagelHooks] New message from:', senderName);
      
      ZagelSystem.emitMessage(
        `New message from ${senderName}`,
        messagePreview.substring(0, 50) + (messagePreview.length > 50 ? '...' : '')
      );
    },

    /**
     * Hook: New video uploaded or shared
     * @param {string} videoTitle - Video title
     * @param {string} videoDuration - Duration in format "5:32"
     * @param {string} uploaderName - Who uploaded it
     */
    onNewVideo(videoTitle, videoDuration, uploaderName) {
      console.log('[ZagelHooks] New video:', videoTitle);
      
      ZagelSystem.emitVideo(
        `New video: ${videoTitle}`,
        `${videoDuration} • uploaded by ${uploaderName}`
      );
    },

    /**
     * Hook: New product added (Pebalaash/store)
     * @param {string} productName - Product name
     * @param {number} price - Product price
     * @param {string} category - Product category
     */
    onNewProduct(productName, price, category) {
      console.log('[ZagelHooks] New product:', productName);
      
      ZagelSystem.emitProduct(
        `New ${category}: ${productName}`,
        `Available now • ${price || 'Check price'}`
      );
    },

    /**
     * Hook: News or announcement
     * @param {string} newsTitle - News headline
     * @param {string} newsSource - Source/publication
     * @param {string} newsCategory - Category
     */
    onNewsUpdate(newsTitle, newsSource, newsCategory = 'Announcement') {
      console.log('[ZagelHooks] News update:', newsTitle);
      
      ZagelSystem.emitNews(
        `${newsCategory}: ${newsTitle}`,
        `From ${newsSource}`
      );
    },

    /**
     * Hook: Code assets synchronized
     * @param {number} totalCodes - Total codes in database
     * @param {number} newCodes - Number of newly added codes
     */
    onAssetsSynced(totalCodes, newCodes) {
      console.log('[ZagelHooks] Assets synced:', totalCodes, 'codes');
      
      if (newCodes > 0) {
        ZagelSystem.emitCode(
          `Synced ${newCodes} new code(s)`,
          `Total in bank: ${totalCodes}`
        );
      }
    },

    /**
     * Hook: SafeCode accessed/executed
     * @param {string} codeName - Name of safe code
     * @param {string} language - Programming language
     */
    onSafeCodeAccessed(codeName, language) {
      console.log('[ZagelHooks] SafeCode accessed:', codeName);
      
      ZagelSystem.emitCode(
        `SafeCode Executed: ${codeName}`,
        language || 'Code execution'
      );
    },

    /**
     * Hook: Session/Authentication event
     * @param {string} eventType - Type of auth event
     * @param {string} details - Additional details
     */
    onAuthEvent(eventType, details) {
      console.log('[ZagelHooks] Auth event:', eventType);
      
      const eventMap = {
        'login': { icon: '🔓', msg: 'You\'ve logged in' },
        'logout': { icon: '🔐', msg: 'You\'ve logged out' },
        'session_restored': { icon: '✅', msg: 'Session restored' },
        'two_factor': { icon: '🛡️', msg: 'Two-factor enabled' },
      };
      
      const config = eventMap[eventType] || { icon: 'ℹ️', msg: eventType };
      ZagelSystem.emitMessage(
        `${config.icon} ${config.msg}`,
        details || 'Authentication event'
      );
    },

    /**
     * Hook: Error or warning notification
     * @param {string} errorTitle - Error title
     * @param {string} errorMessage - Error details
     * @param {string} severity - 'warning' | 'error' | 'critical'
     */
    onError(errorTitle, errorMessage, severity = 'error') {
      console.log(`[ZagelHooks] ${severity}:`, errorTitle);
      
      // Only emit non-critical errors to avoid spam
      if (severity !== 'critical') {
        ZagelSystem.emitMessage(
          `⚠️ ${errorTitle}`,
          errorMessage
        );
      }
    },

    /**
     * Hook: Settings changed
     * @param {string} settingName - Name of setting
     * @param {string} newValue - New value
     */
    onSettingChanged(settingName, newValue) {
      console.log('[ZagelHooks] Setting changed:', settingName);
      
      ZagelSystem.emitMessage(
        `⚙️ Setting updated: ${settingName}`,
        `New value: ${newValue}`
      );
    },
  };

  return hooks;
})();

// ============================================================================
// AUTO-INTEGRATION HOOKS
// ============================================================================

/**
 * Hook into existing AssetsManager to notify Zagel of code updates
 */
if (window.AssetsManager) {
  const originalWriteCode = window.AssetsManager.writeCode;
  window.AssetsManager.writeCode = function(code, metadata = {}) {
    const result = originalWriteCode.call(this, code, metadata);
    
    // Notify Zagel
    if (ZagelHooks) {
      const language = metadata.language || 'Unknown';
      const codeTitle = metadata.title || 'Untitled Code';
      ZagelHooks.onNewCode(codeTitle, language, 'uploaded');
    }
    
    return result;
  };
  
  console.log('[ZagelHooks] Hooked into AssetsManager.writeCode');
}

/**
 * Hook into localStorage to track asset syncs
 */
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  const result = originalSetItem.call(this, key, value);
  
  if (key === 'assets_cache' && ZagelHooks) {
    try {
      const assets = JSON.parse(value);
      if (assets.codes && Array.isArray(assets.codes)) {
        console.log('[ZagelHooks] Assets updated:', assets.codes.length, 'codes');
      }
    } catch (e) {}
  }
  
  return result;
};

console.log('[ZagelHooks] Auto-integration hooks installed');
