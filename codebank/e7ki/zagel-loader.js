/**
 * Zagel Loader - Initialize in E7ki
 * Entry point for the entire Zagel system
 */

import { ZagelCore } from './zagel/zagel-core.js';
import('./zagel/zagel-styles.css');

// Initialize when E7ki loads
document.addEventListener('DOMContentLoaded', () => {
  
  console.log('[Zagel] Initializing...');
  
  // Get current user from AuthClient or window
  const user = window.AuthClient?.getUser?.() || window.__USER__ || null;
  
  if (user) {
    ZagelCore.init(user);
    
    // Hook into E7ki message events
    window.addEventListener('e7ki:message', (e) => {
      ZagelCore.handleIncoming({
        senderName: e.detail.from,
        receiverName: user.name || user.id,
        text: e.detail.text,
        isUrgent: e.detail.urgent || false,
        type: e.detail.type || 'text'
      });
    });

    console.log('[Zagel] Ready for user:', user.name);
  } else {
    console.warn('[Zagel] No user detected, waiting for auth...');
  }

  // Add Zagel button to UI
  addZagelButton();
});

function addZagelButton() {
  // Check if button already exists
  if (document.getElementById('zagel-trigger')) {
    return;
  }

  const btn = document.createElement('button');
  btn.id = 'zagel-trigger';
  btn.setAttribute('aria-label', 'Zagel voice command');
  btn.innerHTML = '🕊️ زاجل';
  btn.title = 'اضغط للتحدث إلى زاجل';
  
  btn.onclick = () => {
    startVoiceRecognition();
  };
  
  document.body.appendChild(btn);
  console.log('[Zagel] Button added to UI');
}

function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    alert('متسف، المتصفح ما فيه دعم لـ voice recognition');
    return;
  }

  const recognition = new SpeechRecognition();
  const btn = document.getElementById('zagel-trigger');
  
  // Settings
  recognition.lang = 'ar-SA';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  // Visual feedback
  btn.classList.add('listening');
  console.log('[Zagel] Listening...');

  recognition.onstart = () => {
    console.log('[Zagel] Recognition started');
  };

  recognition.onresult = (e) => {
    let transcript = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        console.log('[Zagel] Final transcript:', transcript);
        ZagelCore.handleVoiceCommand(transcript);
      }
    }
  };

  recognition.onerror = (e) => {
    console.error('[Zagel] Error:', e.error);
    btn.classList.remove('listening');
  };

  recognition.onend = () => {
    btn.classList.remove('listening');
    console.log('[Zagel] Recognition ended');
  };

  recognition.start();

  // Timeout after 10 seconds
  setTimeout(() => {
    if (btn.classList.contains('listening')) {
      recognition.abort();
    }
  }, 10000);
}

// Export for external use
if (typeof window !== 'undefined') {
  window.Zagel = {
    init: (user) => ZagelCore.init(user),
    handleIncoming: (msg) => ZagelCore.handleIncoming(msg),
    handleVoiceCommand: (transcript) => ZagelCore.handleVoiceCommand(transcript)
  };
}

console.log('[Zagel] Loader initialized 🕊️');
