/**
 * Zagel Developer Gate
 * 7-tap rapid access detection and secure authentication
 */

import { ModeManager, MODES } from '../modes/modeManager.js';

const GATE_CONFIG = {
  TAP_COUNT: 7,              // Number of rapid taps required
  TAP_WINDOW_MS: 1500,       // Time window for all taps
  LOCKOUT_MS: 30000,         // Lockout after failed attempt
  MAX_ATTEMPTS: 3            // Max failed attempts before lockout
};

// State tracking
let tapTimestamps = [];
let failedAttempts = 0;
let lockoutUntil = null;

// UI elements for developer gate
let gateOverlay = null;

/**
 * Detect rapid tap sequence
 */
function recordTap(elementId) {
  const now = Date.now();
  
  // Check lockout
  if (lockoutUntil && now < lockoutUntil) {
    console.warn('[DeveloperGate] Locked out. Try again later.');
    return false;
  }
  
  // Reset if window expired
  if (tapTimestamps.length > 0 && now - tapTimestamps[0] > GATE_CONFIG.TAP_WINDOW_MS) {
    tapTimestamps = [];
  }
  
  // Add tap
  tapTimestamps.push(now);
  
  // Check if we have enough taps
  if (tapTimestamps.length >= GATE_CONFIG.TAP_COUNT) {
    tapTimestamps = [];
    triggerDeveloperGate();
    return true;
  }
  
  return false;
}

/**
 * Trigger the developer gate authentication
 */
function triggerDeveloperGate() {
  console.log('[DeveloperGate] Developer gate triggered!');
  showDeveloperGate();
}

/**
 * Show the developer gate authentication UI
 */
function showDeveloperGate() {
  // Remove existing overlay
  if (gateOverlay) {
    gateOverlay.remove();
  }
  
  // Create overlay
  gateOverlay = document.createElement('div');
  gateOverlay.id = 'zagel-developer-gate';
  gateOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: 'Segoe UI', sans-serif;
  `;
  
  gateOverlay.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 40px;
      border-radius: 20px;
      border: 2px solid #9b59b6;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 0 60px rgba(155, 89, 182, 0.4);
    ">
      <h2 style="color: #9b59b6; margin-bottom: 20px; font-size: 24px;">
        🔐 Developer Access
      </h2>
      <p style="color: #aaa; margin-bottom: 30px; font-size: 14px;">
        Enter passcode or voice phrase to access Learning Mode
      </p>
      
      <input type="password" id="gate-passcode" 
        placeholder="Enter passcode"
        style="
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #444;
          background: #0d1117;
          color: white;
          margin-bottom: 15px;
          font-size: 16px;
          text-align: center;
        "
      />
      
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="gate-submit" style="
          padding: 12px 30px;
          background: #9b59b6;
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        ">Verify</button>
        
        <button id="gate-cancel" style="
          padding: 12px 30px;
          background: transparent;
          border: 1px solid #666;
          border-radius: 8px;
          color: #aaa;
          cursor: pointer;
        ">Cancel</button>
      </div>
      
      <p id="gate-error" style="color: #e74c3c; margin-top: 15px; display: none; font-size: 13px;"></p>
      
      <p style="color: #666; margin-top: 25px; font-size: 12px;">
        Tap the Zagel button 7 times to access
      </p>
    </div>
  `;
  
  document.body.appendChild(gateOverlay);
  
  // Bind events
  document.getElementById('gate-submit').addEventListener('click', handleGateSubmit);
  document.getElementById('gate-cancel').addEventListener('click', closeDeveloperGate);
  document.getElementById('gate-passcode').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleGateSubmit();
  });
}

/**
 * Handle gate verification
 */
function handleGateSubmit() {
  const passcodeInput = document.getElementById('gate-passcode');
  const errorDisplay = document.getElementById('gate-error');
  const passcode = passcodeInput.value.trim();
  
  // Check passcode (owner should set this in config)
  const correctPasscode = localStorage.getItem('zagel_owner_passcode') || 'zagel2025';
  
  if (passcode === correctPasscode) {
    // Success - enter learning mode
    console.log('[DeveloperGate] Access granted!');
    failedAttempts = 0;
    ModeManager.toLearning();
    closeDeveloperGate();
    showLearningModeIndicator();
  } else {
    // Failed attempt
    failedAttempts++;
    errorDisplay.style.display = 'block';
    errorDisplay.textContent = `Incorrect passcode. ${GATE_CONFIG.MAX_ATTEMPTS - failedAttempts} attempts remaining.`;
    passcodeInput.value = '';
    
    if (failedAttempts >= GATE_CONFIG.MAX_ATTEMPTS) {
      // Lockout
      lockoutUntil = Date.now() + GATE_CONFIG.LOCKOUT_MS;
      failedAttempts = 0;
      errorDisplay.textContent = 'Too many failed attempts. Locked for 30 seconds.';
      setTimeout(closeDeveloperGate, 2000);
    }
  }
}

/**
 * Close the developer gate
 */
function closeDeveloperGate() {
  if (gateOverlay) {
    gateOverlay.remove();
    gateOverlay = null;
  }
  tapTimestamps = [];
}

/**
 * Show learning mode indicator in UI
 */
function showLearningModeIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'zagel-mode-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #9b59b6;
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: bold;
    z-index: 999998;
    box-shadow: 0 0 20px rgba(155, 89, 182, 0.6);
    animation: pulse 2s infinite;
  `;
  indicator.textContent = '🔧 Developer Mode Active';
  
  // Add animation style
  if (!document.getElementById('zagel-mode-styles')) {
    const style = document.createElement('style');
    style.id = 'zagel-mode-styles';
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(indicator);
}

/**
 * Hide learning mode indicator
 */
export function hideLearningModeIndicator() {
  const indicator = document.getElementById('zagel-mode-indicator');
  if (indicator) {
    indicator.remove();
  }
}

export function hideLearningModeIndicator() {
  const indicator = document.getElementById('zagel-mode-indicator');
  if (indicator) {
    indicator.remove();
  }
}

/**
 * Initialize the developer gate
 */
export function initDeveloperGate() {
  // Check if already in learning mode on load
  if (ModeManager.isLearning()) {
    showLearningModeIndicator();
  }
  
  // Register mode change to show/hide indicator
  ModeManager.onModeChange((newMode, oldMode) => {
    if (newMode === MODES.LEARNING) {
      showLearningModeIndicator();
    } else {
      hideLearningModeIndicator();
    }
  });
  
  console.log('[DeveloperGate] Initialized');
}

/**
 * Record a tap on Zagel button (call this from button handler)
 */
export function recordZagelTap() {
  return recordTap('zagel-button');
}

/**
 * Reset developer gate (for testing)
 */
export function resetDeveloperGate() {
  tapTimestamps = [];
  failedAttempts = 0;
  lockoutUntil = null;
  closeDeveloperGate();
  console.log('[DeveloperGate] Reset');
}

export default {
  initDeveloperGate,
  recordZagelTap,
  resetDeveloperGate,
  showDeveloperGate,
  hideLearningModeIndicator
};

// Also expose globally for script tag usage
window.ZagelDeveloperGate = {
  initDeveloperGate,
  recordZagelTap,
  resetDeveloperGate,
  showDeveloperGate,
  hideLearningModeIndicator
};