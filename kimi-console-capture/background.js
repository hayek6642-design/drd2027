// Handle critical error notifications
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'critical-error') {
    // Optional: Show notification for critical errors
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Console Error Detected',
      message: `Critical error: ${request.data.type}`,
      priority: 1
    });
  }
  sendResponse({ received: true });
  return true;
});