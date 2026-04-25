/**
 * Batch Storage Update Script for CodeBank
 * This script provides a template for updating all localStorage usage to safeStorage
 * 
 * Usage: Run this script in the browser console to automatically update localStorage calls
 */

// Template for replacing localStorage calls with safeStorage calls
const storageReplacements = {
  'localStorage.getItem(': 'safeStorage.get(',
  'localStorage.setItem(': 'safeStorage.set(',
  'localStorage.removeItem(': 'safeStorage.remove(',
  'localStorage.clear(': 'safeStorage.clear(',
  'localStorage.key(': 'Object.keys(safeStorage.getKeys ? safeStorage.getKeys() : {})[',
  'localStorage.length': 'safeStorage.getKeys ? safeStorage.getKeys().length : 0'
};

// Function to replace localStorage calls in a string
function replaceLocalStorageCalls(code) {
  let updatedCode = code;
  
  // Replace localStorage.getItem calls
  updatedCode = updatedCode.replace(/localStorage\.getItem\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, (match, key) => {
    return `safeStorage.get('${key}')`;
  });
  
  // Replace localStorage.setItem calls
  updatedCode = updatedCode.replace(/localStorage\.setItem\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/g, (match, key, value) => {
    return `safeStorage.set('${key}', ${value})`;
  });
  
  // Replace localStorage.removeItem calls
  updatedCode = updatedCode.replace(/localStorage\.removeItem\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, (match, key) => {
    return `safeStorage.remove('${key}')`;
  });
  
  // Replace localStorage.clear calls
  updatedCode = updatedCode.replace(/localStorage\.clear\s*\(\s*\)/g, 'safeStorage.clear()');
  
  // Replace localStorage.length
  updatedCode = updatedCode.replace(/localStorage\.length/g, 'safeStorage.getKeys ? safeStorage.getKeys().length : 0');
  
  // Replace localStorage.key calls
  updatedCode = updatedCode.replace(/localStorage\.key\s*\(\s*([^)]+)\s*\)/g, (match, index) => {
    return `safeStorage.getKeys ? safeStorage.getKeys()[${index}] : null`;
  });
  
  return updatedCode;
}

// Function to add safeStorage import/declaration to a file
function addSafeStorageImport(code, filename) {
  // Check if safeStorage is already imported or declared
  if (code.includes('safeStorage') || code.includes('import') && code.includes('safe-storage')) {
    return code;
  }
  
  // Add import statement at the top
  const importStatement = `// Safe Storage Integration for ${filename}\n`;
  
  // For files that might be standalone, add a fallback check
  const fallbackCheck = `
// Ensure safeStorage is available
if (typeof safeStorage === 'undefined') {
  console.warn('⚠️ safeStorage not found, localStorage operations may fail');
}
`;

  return importStatement + code + fallbackCheck;
}

// List of files that need to be updated (this would be processed by the build system)
const filesToUpdate = [
  'js/advanced-cache-layer.js',
  'js/advanced-error-handler.js',
  'js/api-integration-framework.js',
  'js/app-core.js',
  'js/asset-manager.js',
  'js/banking-processor.js',
  'js/blockchain-integration.js',
  'js/buttons.js',
  'js/camera-verification.js',
  'js/clerk-config.js',
  'js/cloudinary-config-client.js',
  'js/counter-test.html',
  'js/Counter.js',
  'js/email-transfer-manager.js',
  'js/extra-mode.js',
  'js/floating-app.js',
  'js/health-check.js',
  'js/notification-manager.js',
  'js/payment-gateway.js',
  'js/prayer-alert-system.js',
  'js/premium-integration.js',
  'js/premium-manager.js',
  'js/security-manager.js',
  'js/settings-manager.js',
  'js/simple-transfer-manager.js',
  'js/transaction-monitor.js',
  'js/transaction-queue.js',
  'js/transaction-system.js',
  'js/transactions-ui.js',
  'js/transactions.js',
  'js/utils.js',
  'js/vanilla-shared-ui.js',
  'js/wallet.js',
  'js/webhook-manager.js'
];

console.log('📦 Safe Storage Batch Update Script loaded');
console.log('Files to update:', filesToUpdate.length);
console.log('Use replaceLocalStorageCalls() and addSafeStorageImport() functions to update files');

// Export functions for manual use
window.CodeBankStorageUpdater = {
  replaceLocalStorageCalls,
  addSafeStorageImport,
  filesToUpdate
};