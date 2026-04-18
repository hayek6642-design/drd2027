/**
 * Extra Button Integration with Extra Mode System
 * Handles switch button functionality, long-press activation, and challenge system integration
 */


// Extra mode variables
let extraModeActive = false;
let extraWatchStartTime = 0;
let extraWatchTime = 0;
let extraTimerInterval = null;
let tabVisibilityLostTime = 0;
let currentWatchSession = null;
let extraBarMode = 'silver'; // 'silver' or 'gold'
let currentSwitchMode = 'center'; // 'center', 'silver', 'gold'
let originalCodeDisplay = ''; // Store original code display content
let extraModeActivationTime = 0; // Track when extra mode was activated
function __hasBankode(){
    try{
        const last = JSON.parse(localStorage.getItem('Bankode.last')||'null');
        return !!(last && last.code);
    }catch(_){ return false }
}

// Constants for rewards (in milliseconds) - TESTING MODE
const SILVER_BAR_TIME = 3 * 60 * 1000; // 3 minutes (for testing)
const GOLD_BAR_TIME = 4 * 60 * 1000; // 4 minutes (for testing)

// Track awarded rewards to prevent duplicates
let awardedSilver = false;
let awardedGold = false;

// Track active rewards that need to be claimed
let activeRewards = [];
let rewardClaimTimeout = 60000; // 1 minute in milliseconds
let rewardReady = false;
let activeReward = null;

// REWARD STATE MACHINE: 'IDLE' | 'READY' | 'CLAIMING' | 'DONE'
let rewardState = 'IDLE';

// Random challenge system variables
let challengeActive = false;
let challengeInterval = null;
let challengeTimeout = null;
let nextChallengeTime = 0;
let challengeAudio = null;
let watchDogAudio = null;
let displaySoundWasMuted = false;
let extraModePauseStart = null;
const EXTRA_MODE_GRACE_MS = 5 * 60 * 1000;

const __safeTranslate = (key, vars) => {
  try {
    if (typeof window.translate === 'function') {
      return window.translate(key, vars);
    }
  } catch (e) {}
  return key;
};


document.addEventListener('DOMContentLoaded', function () {
    if (window.DEBUG_MODE) console.log('Extra Button JS loaded - initializing switch functionality');

    // Initialize switch button functionality
    initializeSwitchButton();

    // Create Extra Mode UI elements if they don't exist
    createExtraModeUI();

    // Set up tab visibility detection
    setupTabVisibilityDetection();

    // Monitor Extra Mode state changes
    if (window.TimerManager) {
        window.TimerManager.setInterval(updateExtraModeDisplay, 1000);
    } else {
        setInterval(updateExtraModeDisplay, 1000);
    }

    // Monitor for continuous watching (check every 5 seconds)
    if (window.TimerManager) {
        window.TimerManager.setInterval(checkContinuousWatching, 5000);
    } else {
        setInterval(checkContinuousWatching, 5000);
    }

    // Initial state update
    updateExtraModeDisplay();

    // Track app start time for extra mode activation
    window.appStartTime = Date.now();

    if (!window.ExtraMode) {
        window.ExtraMode = {
            isActive: () => extraModeActive,
            activate: () => { activateExtraMode(extraBarMode); return true; },
            deactivate: () => { deactivateExtraMode(); return true; },
            toggle: () => { return extraModeActive ? window.ExtraMode.deactivate() : window.ExtraMode.activate(); },
            getState: () => getExtraModeState(),
            hasPendingReward: () => {
                try {
                    if (activeReward && !activeReward.claimed) return true;
                    return Array.isArray(activeRewards) && activeRewards.some(r => !r.claimed);
                } catch(_) { return false }
            }
        };
    }
});

/**
 * Periodic check for continuous watching state
 */
function checkContinuousWatching() {
    try {
        // If Extra Mode is active and reward not ready, ensure timer is running
        if (extraModeActive && !rewardReady && !extraTimerInterval) {
            startExtraTimer();
        }
        // If Extra Mode is inactive, ensure regular progress UI is restored
        if (!extraModeActive) {
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');
            if (progressBar) progressBar.style.display = 'none';
            if (progressText) progressText.style.display = 'none';
        }
    } catch(_) {}
}

/**
 * Initialize Switch button functionality
 */
function initializeSwitchButton() {
    if (window.DEBUG_MODE) console.log('Initializing Switch Button functionality');
    setupSwitchButtonEvents();
    updateExtraButtonDisabled();
}

/**
 * Setup Switch button event listeners
 */
function setupSwitchButtonEvents() {
    const switchContainer = document.getElementById('extra-switch-container');
    const switchKnob = document.getElementById('extra-switch-knob');
    
    if (switchContainer && switchKnob) {
        if (window.DEBUG_MODE) console.log('Setting up switch button events');
        
        // Add click event listener to the knob
        switchKnob.addEventListener('click', function(e) {
            e.stopPropagation();
            cycleSwitchMode();
        });

        // Add click event listener to the container (for clicking outside the knob)
        switchContainer.addEventListener('click', function(e) {
            if (e.target === switchContainer) {
                cycleSwitchMode();
            }
        });

        // Add hover effects for better UX
        switchKnob.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
        });

        switchKnob.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    } else {
        console.error('Switch button elements not found');
    }
}

/**
 * Cycle through switch modes: center -> silver -> gold -> center
 */
function cycleSwitchMode() {
    // console.log('Cycling switch mode from:', currentSwitchMode);
    
    // Check if current section allows extra mode switching (only Home section)
    const currentSection = window.currentSection || 'home';
    
    if (currentSwitchMode === 'center') {
        // Trying to switch to silver - only allowed on Home
        if (currentSection !== 'home') {
            console.warn('[Extra Switch] Cannot switch to silver/gold on', currentSection, 'section. Only available on Home section.');
            if (window.showExtraModeBlockedPopup && typeof window.showExtraModeBlockedPopup === 'function') {
                window.showExtraModeBlockedPopup();
            }
            return; // Prevent switching
        }
        switchToSilverMode();
    } else if (currentSwitchMode === 'silver') {
        // Trying to switch to gold - only allowed on Home
        if (currentSection !== 'home') {
            console.warn('[Extra Switch] Cannot switch to gold on', currentSection, 'section. Only available on Home section.');
            if (window.showExtraModeBlockedPopup && typeof window.showExtraModeBlockedPopup === 'function') {
                window.showExtraModeBlockedPopup();
            }
            return; // Prevent switching
        }
        switchToGoldMode();
    } else {
        // Switching to center (deactivate) - always allowed
        switchToCenterMode();
    }
}

function updateExtraButtonDisabled() {
    const container = document.getElementById('extra-switch-container');
    const knob = document.getElementById('extra-switch-knob');
    const disabled = (window.currentSection !== 'home');
    if (container) {
        if (disabled) container.classList.add('disabled'); else container.classList.remove('disabled');
    }
    if (knob) {
        knob.style.opacity = disabled ? '0.5' : '1';
        knob.style.pointerEvents = disabled ? 'none' : 'auto';
    }
}

/**
 * Switch to Silver Mode (left position)
 */
function switchToSilverMode() {
    // console.log('Switching to Silver Mode');
    currentSwitchMode = 'silver';
    extraBarMode = 'silver';
    
    const switchContainer = document.getElementById('extra-switch-container');
    if (switchContainer) {
        // Remove all mode classes
        switchContainer.classList.remove('silver-mode', 'gold-mode');
        // Add silver mode class
        switchContainer.classList.add('silver-mode');
    }
    
    // Activate extra mode if not already active
    if (!extraModeActive) {
        activateExtraMode('silver');
    } else {
        // If already active, just change the mode
        extraBarMode = 'silver';
        // Reset awarded flags for new mode
        awardedSilver = false;
        awardedGold = false;
        // Reset progress % when switching from gold to silver
        resetExtraModeProgress();
        // console.log('Switched to Silver Mode while Extra Mode is active');
    }
}

/**
 * Switch to Gold Mode (right position)
 */
function switchToGoldMode() {
    // console.log('Switching to Gold Mode');
    currentSwitchMode = 'gold';
    extraBarMode = 'gold';
    
    const switchContainer = document.getElementById('extra-switch-container');
    if (switchContainer) {
        // Remove all mode classes
        switchContainer.classList.remove('silver-mode', 'gold-mode');
        // Add gold mode class
        switchContainer.classList.add('gold-mode');
    }
    
    // Activate extra mode if not already active
    if (!extraModeActive) {
        activateExtraMode('gold');
    } else {
        // If already active, just change the mode
        extraBarMode = 'gold';
        // Reset awarded flags for new mode
        awardedSilver = false;
        awardedGold = false;
        // Reset progress % when switching from silver to gold
        resetExtraModeProgress();
        // console.log('Switched to Gold Mode while Extra Mode is active');
    }
}

/**
 * Switch to Center Mode (neutral position)
 */
function switchToCenterMode() {
    // console.log('Switching to Center Mode');
    currentSwitchMode = 'center';
    
    const switchContainer = document.getElementById('extra-switch-container');
    if (switchContainer) {
        // Remove all mode classes
        switchContainer.classList.remove('silver-mode', 'gold-mode');
    }
    
    // Deactivate extra mode if active
    if (extraModeActive) {
        deactivateExtraMode();
    }
}

/**
 * Reset switch button to center position (for external deactivation)
 */
function resetSwitchToCenter() {
    // console.log('Resetting switch button to center position');
    currentSwitchMode = 'center';
    
    const switchContainer = document.getElementById('extra-switch-container');
    if (switchContainer) {
        // Remove all mode classes
        switchContainer.classList.remove('silver-mode', 'gold-mode');
    }
}

/**
 * Activate Extra Mode
 */
async function activateExtraMode(mode) {
    // WATCH-DOG DEATH CHECK
    if (window.__DOG_IS_DEAD__ || localStorage.getItem('__DOG_IS_DEAD__') === 'true') {
        console.warn('[Extra Mode] Blocked: Watch-Dog is dead.');
        if (window.showToast) {
            window.showToast("You can't activate the Extra Mode because the dog is dead.", 'error');
        } else {
            alert("You can't activate the Extra Mode because the dog is dead.");
        }
        return;
    }

    if (window.SystemProtection?.isProtectionActive() || window.__EXTRA_MODE_LOCKED__ === true) {
        return;
    }
    // Check if current section allows extra mode (only Home section)
    const currentSection = window.currentSection || 'home';
    if (currentSection !== 'home') {
        console.warn('[Extra Mode] Cannot activate extra mode on', currentSection, 'section. Only available on Home section.');
        // Show popup notification
        if (window.showExtraModeBlockedPopup && typeof window.showExtraModeBlockedPopup === 'function') {
            window.showExtraModeBlockedPopup();
        }
        return; // Prevent activation
    }

    // INSTANT ACTIVATION - No delay on extra mode

    if (mode !== 'silver' && mode !== 'gold') mode = 'silver';
    extraBarMode = mode;
    if (window.DEBUG_MODE) console.log('Activating Extra Mode:', mode);

    try { createWatchSession(); } catch(_) {}
    extraModeActive = true;
    window.extraModeActive = true;
    extraWatchStartTime = Date.now();
    extraWatchTime = 0;
    awardedSilver = false;
    awardedGold = false;
    rewardState = 'IDLE'; // Reset reward state to IDLE on activation
    rewardReady = false;
    activeReward = null;

    // Reset progress bar to zero and ensure it's using Extra Mode's timer
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.style.transition = 'width 0.3s ease';
    }

    // Clear any existing interval to ensure fresh start
    if (extraTimerInterval) {
        clearInterval(extraTimerInterval);
        extraTimerInterval = null;
    }

    // Store original code display content before changing it
    const codeDisplay = document.getElementById('code-display');
    if (codeDisplay) {
        originalCodeDisplay = codeDisplay.textContent;
    }

    // Update UI
    updateExtraModeUI(true);
    // Fade the dr.dc.png background image to show progress % underneath
    fadePlayPauseButtonImage(true);
    try { document.body.classList.add('extra-mode'); } catch(_){}
    try { window.dispatchEvent(new CustomEvent('extra-mode:changed', { detail: { active: true } })); } catch(_){}

    try { window.handleExtraModeChange && window.handleExtraModeChange(true); } catch (_) {}

    // Watch session already created as guard

    // Start extra timer regardless of player state (for testing)
    startExtraTimer();

     // Pause normal code generation
    if (window.Bankode && typeof window.Bankode.pauseNormalGeneration === 'function') {
        window.Bankode.pauseNormalGeneration();
    }
    // Stop regular timer and code generation
    if (window.stopCounter) {
        window.stopCounter();
    }
    // Prevent 5-min code generation interval if running
    if (window.continuousWatchInterval) {
        clearInterval(window.continuousWatchInterval);
        window.continuousWatchInterval = null;
    }
    // Mark code generation as disabled
    window.codeGenerationActive = false;
    // Disable code generation progress bar and show extra mode progress
    disableCodeGenerationProgress();

    // Initialize challenge system
    initializeChallengeSystem();

    if (window.DEBUG_MODE) console.log('Extra Mode activated successfully');
}

/**
 * Deactivate Extra Mode
 */
function deactivateExtraMode() {
    try {
        if (window.DEBUG_MODE) console.log('Deactivating Extra Mode');
        extraModeActive = false;
        window.extraModeActive = false;
        extraWatchStartTime = 0;
        extraWatchTime = 0;
        currentWatchSession = null;
        awardedSilver = false;
        awardedGold = false;
        activeRewards = [];
        rewardReady = false;
        activeReward = null;
        rewardState = 'IDLE'; // Reset reward state to IDLE
        hideRewardNotification();
        stopChallengeSystem();
        stopExtraTimer();
        resetSwitchToCenter();
        updateExtraModeUI(false);
        // Restore the dr.dc.png background image when extra mode deactivates
        fadePlayPauseButtonImage(false);
        try { document.body.classList.remove('extra-mode'); } catch(_){}
        try { window.dispatchEvent(new CustomEvent('extra-mode:changed', { detail: { active: false } })); } catch(_){}
        try { window.handleExtraModeChange && window.handleExtraModeChange(false); } catch (_) {}
         // Resume normal code generation
        if (window.Bankode && typeof window.Bankode.resumeNormalGeneration === 'function') {
            window.Bankode.resumeNormalGeneration();
        }
        if (window.startCounter) {
            window.startCounter();
        }
        if (window.continuousWatchInterval) {
            clearInterval(window.continuousWatchInterval);
            window.continuousWatchInterval = null;
        }
        // FIX: Was setting codeGenerationActive = false on deactivation.
        // Deactivating Extra Mode should RESUME normal code generation (true).
        window.codeGenerationActive = true;
        if (window.isCounterPaused !== undefined) {
            window.isCounterPaused = false;
        }
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.style.display = 'none';
        }
        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.style.display = 'none';
        }
        enableCodeGenerationProgress();
        if (window.DEBUG_MODE) console.log('[ExtraMode] Fully deactivated and cleaned up');
    } catch (error) {
        console.error('[ExtraMode] Deactivation failed:', error);
        extraModeActive = false;
    }
}

/**
 * Update Extra Mode UI elements
 */
function updateExtraModeUI(isActive) {
    const extraButton = document.getElementById('extra-button');
    const extraStatus = document.getElementById('extra-status');
    const extraProgress = document.getElementById('extra-progress');
    const codeDisplay = document.getElementById('code-display');
    const extraCodeBar = document.getElementById('extra-code-bar');
    
    if (isActive) {
        if (extraButton) {
            extraButton.classList.add('glow-active');
            extraButton.textContent = 'EXTRA ACTIVE';
        }
        if (extraStatus) extraStatus.classList.add('hidden');
        if (extraProgress) extraProgress.classList.add('hidden');
        const pt = document.getElementById('progress-text');
        if (pt) pt.style.display = 'inline-block';
        if (codeDisplay) {
            codeDisplay.classList.remove('hidden');
            if (extraBarMode === 'silver') {
                codeDisplay.textContent = 'EXTRA SILVER';
            } else if (extraBarMode === 'gold') {
                codeDisplay.textContent = 'EXTRA GOLD';
            } else {
                codeDisplay.textContent = 'EXTRA MODE';
            }
        }
        if (extraCodeBar) extraCodeBar.classList.add('hidden');
    } else {
        if (extraButton) {
            extraButton.classList.remove('glow-active');
            extraButton.textContent = 'Extra';
        }
        if (extraStatus) extraStatus.classList.add('hidden');
        if (extraProgress) extraProgress.classList.add('hidden');
        const pt = document.getElementById('progress-text');
        if (pt) pt.style.display = 'none';
        if (codeDisplay) {
            codeDisplay.classList.remove('hidden');
            const restored = originalCodeDisplay || localStorage.getItem('uniqueCode') || '';
            if (restored) codeDisplay.textContent = restored;
        }
        if (extraCodeBar) extraCodeBar.classList.add('hidden');
    }
}

/**
 * Start Extra Mode timer
 */
function startExtraTimer() {
    if (!extraTimerInterval && extraModeActive) {
        if (window.DEBUG_MODE) console.log('Starting Extra Mode timer');
        const timerFn = () => {
            extraWatchTime += 100;
            // Timer tick (log suppressed to prevent console spam)
            updateExtraProgress();
            checkForRewards();
        };
        if (window.TimerManager) {
            extraTimerInterval = window.TimerManager.setInterval(timerFn, 100);
        } else {
            extraTimerInterval = setInterval(timerFn, 100);
        }
    } else {
        if (window.DEBUG_MODE) console.log('Extra timer not started:', {
            hasInterval: !!extraTimerInterval, 
            extraModeActive: extraModeActive 
        });
    }
}

/**
 * Stop Extra Mode timer
 */
function stopExtraTimer() {
    if (extraTimerInterval) {
        clearInterval(extraTimerInterval);
        extraTimerInterval = null;
    }
}


/**
 * Handle window focus
 */
function handleWindowFocus() {
    try {
        // When window regains focus, do NOT reactivate extra mode
        // User must manually activate it again
        if (window.DEBUG_MODE) console.log('[ExtraMode] Window focused - extra mode remains inactive');
    } catch(_) {}
}

// Auto-activation removed – extra mode now starts only via user switch toggle
function checkExtraModeActivation() {
    // No-op: user must toggle the switch manually
}

// Visibility listener (auto-activation disabled)
// document.addEventListener('visibilitychange', ...)

/**
 // Completely hide dr.dc.png on play-pause button when Extra Mode activates
// This allows the progress % to be visible and clickable
 */
function fadePlayPauseButtonImage(fadeOut = true) {
    const playPauseButton = document.getElementById('play-pause-button');
    if (!playPauseButton) return;
    
    if (fadeOut) {
        // Remove background image completely to show progress underneath
        playPauseButton.style.setProperty('background', 'none', 'important');
        playPauseButton.style.backgroundImage = 'none';
        playPauseButton.style.backgroundColor = 'transparent';
        playPauseButton.style.boxShadow = 'inset 0 0 15px 5px rgba(255,255,255,0.9)';
        playPauseButton.style.border = '2px solid rgba(255,255,255,0.8)';
        if (window.DEBUG_MODE) console.log('[ExtraMode] HIDDEN dr.dc.png');
    } else {
        // Restore the background image
        playPauseButton.style.setProperty('background', "url('/codebank/samma3ny/dr.dc.png?v=20260410') no-repeat center center", 'important');
        playPauseButton.style.backgroundImage = "url('/codebank/samma3ny/dr.dc.png?v=20260410')";
        playPauseButton.style.backgroundColor = 'transparent';
        playPauseButton.style.boxShadow = 'inset 0 0 5px 1px rgba(255, 255, 255, 0.8)';
        playPauseButton.style.border = 'none';
        if (window.DEBUG_MODE) console.log('[ExtraMode] RESTORED dr.dc.png');
    }
}

/**
 * Reset Extra Mode progress bar when tier switches
 */
function resetExtraModeProgress() {
    extraWatchTime = 0;
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.style.transition = 'width 0.3s ease';
    }
    const progressText = document.getElementById('progress-text');
    if (progressText) {
        progressText.textContent = '00%';
    }
    if (window.DEBUG_MODE) console.log('[ExtraMode] Progress reset on tier switch');
}

/**
 * Update Extra Mode progress bar
 */
function updateExtraProgress(percentOverride) {
    const progressBar = document.getElementById('progress-bar');
    const extraTime = document.getElementById('extra-time');
    const progressText = document.getElementById('progress-text');
    
    if (!progressBar) return;
    
    // Calculate progress based on active mode duration
    let progress = 0;
    const activeDuration = extraBarMode === 'silver' ? SILVER_BAR_TIME : GOLD_BAR_TIME;
    
    if (typeof percentOverride === 'number') {
        progress = Math.min(100, Math.max(0, percentOverride));
    } else {
        progress = (extraWatchTime / activeDuration) * 100;
        if (progress >= 100) progress = 100;
    }
    
    // Update progress bar width and ensure it's visible during Extra Mode
    if (progressBar) {
        // Ensure smooth transition for progress changes
        progressBar.style.transition = 'width 0.3s ease';
        progressBar.style.width = `${Math.min(progress, 100)}%`;
        progressBar.style.display = 'block';
        // Update color based on mode
        if (extraBarMode === 'silver') {
            progressBar.style.background = 'linear-gradient(90deg, #00ff00, #00cc00)';
        } else if (extraBarMode === 'gold') {
            progressBar.style.background = 'linear-gradient(90deg, #ffd700, #ffa500)';
        }
    }
    
    // Update time display
    if (extraTime) {
        extraTime.textContent = formatTime(extraWatchTime);
    }
    
    // Update progress text if it exists
    if (progressText) {
        const intPercent = Math.min(100, Math.floor(progress));
        progressText.textContent = `${String(intPercent).padStart(2,'0')}%`;
        progressText.style.color = extraBarMode === 'silver' ? '#c0c0c0' : '#ffd700';
    }
}


/**
 * Schedule automatic deactivation of extra mode after reward window expires
 */
let autoDeactivationTimer = null;

function scheduleAutoDeactivation(delayMs) {
    if (autoDeactivationTimer) {
        clearTimeout(autoDeactivationTimer);
    }
    autoDeactivationTimer = setTimeout(() => {
        if (extraModeActive && (!activeReward || !activeReward.claimed)) {
            console.log('[ExtraMode] Auto-deactivating - claim window expired');
            deactivateExtraMode();
        }
        autoDeactivationTimer = null;
    }, delayMs);
}

function cancelAutoDeactivation() {
    if (autoDeactivationTimer) {
        clearTimeout(autoDeactivationTimer);
        autoDeactivationTimer = null;
    }
}

/**
 * Check for reward milestones
 */
function checkForRewards() {
    const activeDuration = extraBarMode === 'silver' ? SILVER_BAR_TIME : GOLD_BAR_TIME;
    const progressPct = (extraWatchTime / activeDuration) * 100;
    if (progressPct >= 99 && !rewardReady && rewardState === 'IDLE') {
        rewardReady = true;
        rewardState = 'READY'; // Set reward state to READY
        
        stopExtraTimer();
        resetExtraModeProgress();
        
        const reward = {
            type: extraBarMode, // 'silver' | 'gold'
            source: 'extra',
            claimed: false
        };
        activeReward = reward;
        
        showRewardMessage(reward.type);
        
        // AUTO-DEACTIVATION: If user doesn\'t claim within 60s, auto-deactivate
        scheduleAutoDeactivation(60000); // 60 seconds // Show claim message only
    }
}

 

/**
 * Set reward lock
 */
function setRewardLock(lockKey) {
    try {
        const ss = window.safeStorage || null;
        if (ss) {
            const regKey = 'reward_registry';
            const tempId = `extra:${lockKey.split(':')[2]}`;
            let registry = [];
            try { registry = JSON.parse(ss.get(regKey) || '[]'); } catch(_) { registry = []; }
            if (!registry.includes(tempId)) { 
                registry.push(tempId); 
                ss.set(regKey, JSON.stringify(registry)); 
            }
            ss.set(lockKey, true);
        }
    } catch(_){ }
}

/**
 * Stop watchdog (challenge system)
 */
function stopWatchDog() {
    try {
        if (challengeTimeout) {
            clearTimeout(challengeTimeout);
            challengeTimeout = null;
        }
        if (challengeInterval) {
            clearTimeout(challengeInterval);
            challengeInterval = null;
        }
        if (watchDogAudio) {
            watchDogAudio.pause();
            watchDogAudio.currentTime = 0;
        }
        challengeActive = false;
        if (window.DEBUG_MODE) console.log('[Reward] Watchdog stopped');
    } catch(_) {}
}

/**
 * Disable reward UI during claiming
 */
function disableRewardUI() {
    try {
        const claimBtn = document.getElementById('extra-claim-btn');
        if (claimBtn) {
            claimBtn.disabled = true;
            claimBtn.classList.add('disabled');
            claimBtn.textContent = 'Claiming...';
        }
        const notification = document.getElementById('reward-notification');
        if (notification) {
            notification.style.cursor = 'default';
            notification.onclick = null;
        }
        if (window.DEBUG_MODE) console.log('[Reward] UI disabled');
    } catch(_) {}
}

/**
 * Cleanup extra mode UI after reward is done
 */
function cleanupExtraModeUI() {
    try {
        const claimBtn = document.getElementById('extra-claim-btn');
        if (claimBtn) {
            claimBtn.style.display = 'none';
            claimBtn.disabled = false;
            claimBtn.classList.remove('disabled');
        }
        const notification = document.getElementById('reward-notification');
        if (notification) {
            notification.onclick = null;
            notification.style.cursor = 'default';
            delete notification.dataset.rewardId;
        }
        if (window.DEBUG_MODE) console.log('[Reward] UI cleaned up');
    } catch(_) {}
}

 

/**
 * Show reward failed message
 */
function showRewardFailedMessage() {
    const notification = document.getElementById('reward-notification');
    const icon = document.getElementById('reward-icon');
    const title = document.getElementById('reward-title');
    const description = document.getElementById('reward-description');
    
    if (!notification) return;
    
    // Set notification content
    icon.textContent = 'X';
    icon.className = 'reward-icon';
    title.textContent = 'Reward Claim Failed';
    description.textContent = 'Failed to claim your reward. Please try again.';
    
    // Remove click handler
    notification.onclick = null;
    notification.style.cursor = 'default';
    delete notification.dataset.rewardId;
    
    // Show notification
    notification.classList.remove('hidden');
    
    // Hide after 3 seconds
    if (window.TimerManager) {
        window.TimerManager.setTimeout(() => {
            hideRewardNotification();
        }, 3000);
    } else {
        setTimeout(() => {
            hideRewardNotification();
        }, 3000);
    }
}

/**
 * Remove unclaimed reward after timeout
 */
function removeUnclaimedReward(rewardId) {
    const rewardIndex = activeRewards.findIndex(r => r.id === rewardId);
    if (rewardIndex === -1) {
        return; // Already claimed or removed
    }
    
    const reward = activeRewards[rewardIndex];
    if (reward.claimed) {
        return; // Already claimed
    }
    
    if (window.DEBUG_MODE) console.log(`Reward ${reward.name} expired - not claimed in time`);
    
    // Remove from active rewards
    activeRewards.splice(rewardIndex, 1);
    
    // Hide notification if it's still showing this reward
    const notification = document.getElementById('reward-notification');
    if (notification && notification.dataset.rewardId === rewardId) {
        hideRewardNotification();
        
        // Show expiration message
        const showExpiredFn = () => {
            showExpiredRewardNotification(reward);
        };
        if (window.TimerManager) {
            window.TimerManager.setTimeout(showExpiredFn, 500);
        } else {
            setTimeout(showExpiredFn, 500);
        }
    }

    // Reset progress and allow next cycle
    extraWatchTime = 0;
    awardedSilver = false;
    awardedGold = false;
    startExtraTimer();
}

/**
 * Show success claim notification
 */
function showSuccessClaimNotification(reward) {
    const notification = document.getElementById('reward-notification');
    const icon = document.getElementById('reward-icon');
    const title = document.getElementById('reward-title');
    const description = document.getElementById('reward-description');
    
    if (!notification) return;
    
    // Update content for success
    icon.textContent = 'OK';
    icon.className = 'reward-icon';
    title.textContent = 'Reward Claimed!';
    description.textContent = `Successfully claimed your ${reward.name}!`;
    
    // Remove click handler
    notification.onclick = null;
    notification.style.cursor = 'default';
    delete notification.dataset.rewardId;
    
    // Hide after 3 seconds
    if (window.TimerManager) {
        window.TimerManager.setTimeout(() => {
            hideRewardNotification();
        }, 3000);
    } else {
        setTimeout(() => {
            hideRewardNotification();
        }, 3000);
    }
}

/**
 * Show failed claim notification
 */
function showFailedClaimNotification(reward) {
    const notification = document.getElementById('reward-notification');
    const title = document.getElementById('reward-title');
    const description = document.getElementById('reward-description');
    
    if (!notification) return;
    
    title.textContent = 'Claim Failed';
    description.textContent = `Failed to save your ${reward.name}. Please try again.`;
    
    // Hide after 3 seconds
    if (window.TimerManager) {
        window.TimerManager.setTimeout(() => {
            hideRewardNotification();
        }, 3000);
    } else {
        setTimeout(() => {
            hideRewardNotification();
        }, 3000);
    }
}

 

/**
 * Create watch session in backend
 */
async function createWatchSession() {
    try {
        const base = window.APP_BACKEND_BASE_URL || '';
        if (!base) {
            return true;
        }
        const response = await fetch(base + '/api/watch-sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: window.USER_ID,
                totalWatchTime: 0,
                isExtraMode: true
            })
        });
        
        if (response.ok) {
            currentWatchSession = await response.json();
            if (window.DEBUG_MODE) console.log('Watch session created:', currentWatchSession);
            return true;
        } else {
            return true;
        }
    } catch (error) {
        console.error('Error creating watch session:', error);
        return true;
    }
}

function showNoInternetMessage() {
    const msg = 'لا يمكنك لأن لا يوجد إنترنت';
    try {
        const existing = document.getElementById('extra-mode-toast');
        const toast = existing || document.createElement('div');
        toast.id = 'extra-mode-toast';
        toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:10px 14px;border-radius:8px;font-size:14px;box-shadow:0 6px 14px rgba(0,0,0,0.25);z-index:99999;opacity:0;transition:opacity .2s ease';
        toast.textContent = msg;
        if (!existing) document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; });
        if (window.TimerManager) {
            window.TimerManager.clearTimeout(showNoInternetMessage._t);
            showNoInternetMessage._t = window.TimerManager.setTimeout(() => { toast.style.opacity = '0'; }, 2000);
        } else {
            clearTimeout(showNoInternetMessage._t);
            showNoInternetMessage._t = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
        }
    } catch(_) { alert(msg); }
}

/**
 * Setup tab visibility detection
 */
function setupTabVisibilityDetection() {
    // Handle page visibility change (tab switching, minimizing browser)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Handle window focus/blur (switching between applications)
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    
    // Handle beforeunload (page navigation, closing tab/window)
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Handle pagehide (more reliable for page navigation)
    window.addEventListener('pagehide', handlePageHide);
    
    // Handle unload (fallback for page closing)
    window.addEventListener('unload', handleUnload);
}

function handleVisibilityChange() {
    try {
        if (document.hidden) {
            // Deactivate extra mode when tab is hidden/switched
            if (extraModeActive) {
                if (window.DEBUG_MODE) console.log('[ExtraMode] Tab hidden - deactivating extra mode');
                deactivateExtraMode();
            }
        } else {
            // When tab becomes visible again, do NOT reactivate extra mode
            // User must manually activate it again
            if (window.DEBUG_MODE) console.log('[ExtraMode] Tab visible - extra mode remains inactive');
        }
    } catch(_) {}
}

function handleWindowBlur() {
    try {
        // Deactivate extra mode when window loses focus (user switches to another app)
        if (extraModeActive) {
            if (window.DEBUG_MODE) console.log('[ExtraMode] Window lost focus - deactivating extra mode');
            deactivateExtraMode();
        }
    } catch(_) {}
}



function handleBeforeUnload() {
    try { if (extraModeActive) deactivateExtraMode(); } catch(_) {}
}

function handleUnload() {
    try { if (extraModeActive) deactivateExtraMode(); } catch(_) {}
}

/**
 * Claim a reward - State Machine Implementation
 * 
 * State transitions:
 * IDLE -> READY (when reward is ready)
 * READY -> CLAIMING (when user clicks claim)
 * CLAIMING -> DONE (after SLVR is generated)
 * DONE -> IDLE (after cleanup)
 */
async function claimReward(reward) {
    // FIX BUG#3: AuthGate race condition — wait for auth to be ready before claiming
    // The console showed "[AuthGate] Queuing fetch to /api/rewards/claim until auth ready"
    // which means the claim fires before auth resolves and the request is held, possibly
    // expiring the reward window before it's sent.
    if (window.AuthGate && typeof window.AuthGate.isReady === 'function' && !window.AuthGate.isReady()) {
        console.warn('[Reward] AuthGate not ready — waiting up to 5s before claiming');
        await new Promise((resolve) => {
            const timeout = setTimeout(resolve, 5000); // max 5s wait
            const checkReady = setInterval(() => {
                if (window.AuthGate && window.AuthGate.isReady()) {
                    clearInterval(checkReady);
                    clearTimeout(timeout);
                    resolve();
                }
            }, 100);
        });
    }

    // STATE CHECK: Only allow claiming if state is READY
    if (rewardState !== 'READY') {
        console.warn('[Reward] Cannot claim - state is not READY:', rewardState);
        return false;
    }
    
    // IDEMPOTENCY CHECK: Prevent double claiming
    if (!extraModeActive || reward.claimed) {
        console.warn('[Reward] Cannot claim - already claimed or extra mode inactive');
        return false;
    }
    
    try {
        // STATE TRANSITION: READY -> CLAIMING
        rewardState = 'CLAIMING';
        if (window.DEBUG_MODE) console.log('[Reward] State: READY -> CLAIMING');
        
        // Cancel auto-deactivation since user claimed
        cancelAutoDeactivation();
        
        // STEP 1: Disable reward UI
        disableRewardUI();
        
        // STEP 2: Stop watchdog (MUST happen before reward is applied)
        stopWatchDog();
        
        // STEP 3: Claim the reward via API
        // FIX BUG#1: Added credentials:'include' so session cookie is sent with request
        // FIX BUG#2: Added X-CSRF-TOKEN header for CSRF-protected POST routes
        let csrfToken = '';
        try {
            csrfToken = document.querySelector('meta[name="csrf-token"]')?.content 
                     || document.querySelector('meta[name="x-csrf-token"]')?.content 
                     || document.querySelector('input[name="_csrf"]')?.value 
                     || '';
            
            if (!csrfToken) {
                const cookies = document.cookie.split(';').reduce((acc, c) => {
                    const [key, val] = c.trim().split('=');
                    acc[key] = decodeURIComponent(val || '');
                    return acc;
                }, {});
                csrfToken = cookies['XSRF-TOKEN'] || cookies['csrf_token'] || cookies['X-CSRF-TOKEN'] || '';
            }
        } catch (e) {
            console.warn('[Reward] CSRF token extraction failed:', e.message);
        }
        const response = await fetch('/api/rewards/claim', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {})
            },
            body: JSON.stringify({ type: reward.type })
        });

        if (!response.ok) {
            throw new Error('Claiming API call failed');
        }
        
        reward.claimed = true;
        reward.claimedAt = Date.now();
        
        // Clear expiry timer
        try { if (reward._expiryTimer) { clearTimeout(reward._expiryTimer); } } catch(_) {}
        
        // Set reward lock
        setRewardLock(`reward_lock:extra:${reward.type}`);
        
        // STATE TRANSITION: CLAIMING -> DONE
        rewardState = 'DONE';
        if (window.DEBUG_MODE) console.log('[Reward] State: CLAIMING -> DONE');
        
        // STEP 4: Show success message
        showRewardSuccess(reward.type.toUpperCase());
        
        // STEP 5: Cleanup and DEACTIVATE Extra Mode
        const cleanupFn = () => {
            deactivateExtraMode(); // Return to normal mode
            if (window.DEBUG_MODE) console.log('[Reward] State: DONE -> IDLE (cleanup complete)');
        };
        if (window.TimerManager) {
            window.TimerManager.setTimeout(cleanupFn, 3000);
        } else {
            setTimeout(cleanupFn, 3000);
        }
        
        return true;
    } catch (e) {
        console.error('[Reward] claim failed', e);
        
        // On error, reset state to READY so user can try again
        rewardState = 'READY';
        showRewardFailed();
        
        // Re-enable UI
        const claimBtn = document.getElementById('extra-claim-btn');
        if (claimBtn) {
            claimBtn.disabled = false;
            claimBtn.classList.remove('disabled');
            claimBtn.textContent = 'Claim';
        }
        
        return false;
    }
}

/**
 * Handle pagehide (more reliable for page navigation)
 */
function handlePageHide() {
    if (extraModeActive) {
        if (window.DEBUG_MODE) console.log('Page hiding - deactivating extra mode');
        deactivateExtraMode();
    }
}

/**
 * Show reward message
 */
function showRewardMessage(type, code = null) {
    const notification = document.getElementById('reward-notification');
    const icon = document.getElementById('reward-icon');
    const title = document.getElementById('reward-title');
    const description = document.getElementById('reward-description');
    
    if (!notification) return;
    
    // Set notification content
    icon.textContent = type === 'silver' ? 'Silver' : 'Gold';
    icon.className = `reward-icon ${type}`;
    
    if (code) {
        title.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Bar Earned!`;
        description.textContent = `Successfully claimed your ${type.charAt(0).toUpperCase() + type.slice(1)} Bar (${code})!`;
        notification.onclick = null;
        notification.style.cursor = 'default';
        delete notification.dataset.rewardId;
    } else {
        // Reward ready to claim
        title.textContent = `You have a ${type.charAt(0).toUpperCase() + type.slice(1)} Bar!`;
        description.textContent = 'Click here to claim your reward!';
        notification.style.cursor = 'pointer';
        
        // Add claim button
        let claimBtn = document.getElementById('extra-claim-btn');
        if (!claimBtn) {
            claimBtn = document.createElement('button');
            claimBtn.id = 'extra-claim-btn';
            claimBtn.textContent = 'Claim';
            claimBtn.style.cssText = 'margin-top: 10px; padding: 8px 16px; background: #00bfff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;';
            notification.appendChild(claimBtn);
        } else {
            claimBtn.style.display = 'block';
        }
        
        // Handle claim button click with disable logic
        claimBtn.onclick = (e) => {
            e.stopPropagation();
            if (claimBtn.disabled) return;
            
            // State machine handles all cleanup automatically
            if (activeReward) {
                claimReward(activeReward);
            }
        };
    }
    
    // Show notification
    notification.classList.remove('hidden');
    
    // Auto-expire reward message after 60s if not claimed
    if (!code) {
        const expireFn = () => {
            if (!activeReward || activeReward.claimed) return;
            console.warn('[Reward] expired without claim');
            hideRewardNotification();
            resetExtraModeProgress();
            deactivateExtraMode();
        };
        try {
            if (activeReward) {
                if (window.TimerManager) {
                    activeReward._expiryTimer = window.TimerManager.setTimeout(expireFn, 60000);
                } else {
                    activeReward._expiryTimer = setTimeout(expireFn, 60000);
                }
            }
        } catch(_) {
            if (window.TimerManager) {
                window.TimerManager.setTimeout(expireFn, 60000);
            } else {
                setTimeout(expireFn, 60000);
            }
        }
    }
}
function hideRewardNotification() {
    try {
        const notification = document.getElementById('reward-notification');
        const claimBtn = document.getElementById('extra-claim-btn');
        if (claimBtn) claimBtn.style.display = 'none';
        if (notification) {
            notification.classList.add('hidden');
            notification.onclick = null;
            notification.style.cursor = 'default';
            delete notification.dataset.rewardId;
        }
    } catch(_) {}
    try { if (typeof hideRewardMessage === 'function') hideRewardMessage(); } catch(_) {}
}

function showRewardSuccess(code){
    try {
        const type = (activeReward && activeReward.type) || extraBarMode || 'silver';
        const notification = document.getElementById('reward-notification');
        const icon = document.getElementById('reward-icon');
        const title = document.getElementById('reward-title');
        const description = document.getElementById('reward-description');
        if (!notification) return;
        icon.textContent = type === 'silver' ? 'Silver' : 'Gold';
        icon.className = `reward-icon ${type}`;
        title.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Bar Earned!`;
        description.textContent = `Successfully claimed your ${type.charAt(0).toUpperCase() + type.slice(1)} Bar (${code})!`;
        notification.onclick = null;
        notification.style.cursor = 'default';
        delete notification.dataset.rewardId;
        notification.classList.remove('hidden');
    } catch(_) {}
}

function showRewardFailed(){
    try { showRewardFailedMessage(); } catch(_) {}
}

/**
 * Format time in milliseconds to seconds:minutes:hours:days:years format
 */
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    
    // Calculate time units with proper resets
    const seconds = totalSeconds % 60;                                    // 0-59
    const minutes = Math.floor(totalSeconds / 60) % 60;                  // 0-59
    const hours = Math.floor(totalSeconds / 3600) % 24;                  // 0-23
    const days = Math.floor(totalSeconds / (3600 * 24)) % 365;           // 0-364
    const years = Math.floor(totalSeconds / (3600 * 24 * 365));          // 0+
    
    // FIX: Was outputting SS:MM:HH (reversed). Corrected to HH:MM:SS format.
    const formattedSeconds = String(seconds).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedHours = String(hours).padStart(2, '0');
    const formattedDays = String(days).padStart(3, '0');
    const formattedYears = String(years).padStart(1, '0');

    // Output: HH:MM:SS (with days/years appended if > 0)
    if (years > 0)  return `${formattedYears}y:${formattedDays}d:${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    if (days > 0)   return `${formattedDays}d:${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

/**
 * Get current Extra Mode state
 */
function getExtraModeState() {
    return {
        active: extraModeActive,
        watchTime: extraWatchTime,
        startTime: extraWatchStartTime,
        session: currentWatchSession,
        barMode: extraBarMode,
        currentSwitchMode: currentSwitchMode
    };
}

/**
 * Check if Extra Mode is active
 */
function isExtraModeActive() {
    return extraModeActive;
}

/**
 * Initialize random challenge system
 */
function initializeChallengeSystem() {
    if (window.DEBUG_MODE) console.log('Initializing challenge system');
    
    // Create audio for alarm
    try {
        challengeAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+D2u2ceBSl+y/DadCtPq+PxtmQcBjiR1vLNeywGI3bE8N2QQAoUXrPo66hVFAlFnt7wsmQEOITH6dWdQw');
        challengeAudio.volume = 0.3;
        watchDogAudio = new Audio('/services/yt-clear/extra-mode-b/watch-dog.mp3');
    } catch (error) {
        challengeAudio = null;
        watchDogAudio = null;
    }
    
    // Schedule first challenge
    scheduleNextChallenge();
}

/**
 * Schedule the next random challenge
 */
function scheduleNextChallenge() {
    if (!extraModeActive) return;
    
    // Random time between 1-2.5 minutes (in milliseconds) - TESTING MODE
    const minTime = 60 * 1000; // 1 minute
    const maxTime = 2.5 * 60 * 1000; // 2.5 minutes
    const randomDelay = Math.random() * (maxTime - minTime) + minTime;
    
    nextChallengeTime = Date.now() + randomDelay;
    
    if (window.DEBUG_MODE) console.log(`Next challenge scheduled in ${formatTime(randomDelay)}`);
    
    const challengeFn = () => {
        if (extraModeActive && !challengeActive) {
            startChallenge();
        }
    };
    if (window.TimerManager) {
        challengeInterval = window.TimerManager.setTimeout(challengeFn, randomDelay);
    } else {
        challengeInterval = setTimeout(challengeFn, randomDelay);
    }
}

/**
 * Start a challenge
 */
function startChallenge() {
    if (challengeActive || !extraModeActive) return;
    
    if (window.DEBUG_MODE) console.log('Starting challenge: Press Now!');
    challengeActive = true;
    
    // Show challenge message in the extra code bar
    showChallengeMessage();

    // Do not alter player mute state; watchdog should play independently

    // Play watch-dog sound (force unmute and full volume)
    if (watchDogAudio) {
        try {
            watchDogAudio.muted = false; // Ensure not muted
            watchDogAudio.volume = 1.0; // Ensure full volume
            watchDogAudio.currentTime = 0;
            watchDogAudio.play();
        } catch (error) {
            if (window.DEBUG_MODE) console.log('Could not play watch-dog sound');
        }
    }
    
    // Set timeout for challenge failure (1 minute)
    const failFn = () => {
        if (challengeActive) {
            failChallenge();
        }
    };
    if (window.TimerManager) {
        challengeTimeout = window.TimerManager.setTimeout(failFn, 60000);
    } else {
        challengeTimeout = setTimeout(failFn, 60000);
    }
}

/**
 * Show challenge message in the UI
 */
function showChallengeMessage(message) {
    try {
        const text = __safeTranslate(message || 'extraMode.challengePress');
        const codeDisplay = document.getElementById('code-display');
        if (!codeDisplay) return;
        codeDisplay.textContent = text + ' (60 seconds)';
        codeDisplay.classList.add('challenge-active');
        codeDisplay.style.cursor = 'pointer';
        codeDisplay.onclick = () => completeChallenge();
        startChallengeCountdown();
    } catch (e) {
        console.warn('[ExtraMode] Challenge UI skipped:', e);
    }
}

/**
 * Start challenge countdown
 */
function startChallengeCountdown() {
    const codeDisplay = document.getElementById('code-display');
    if (!codeDisplay) return;
    
    let secondsLeft = 60;
    const countFn = () => {
        if (!challengeActive) {
            if (window.TimerManager) {
                window.TimerManager.clearInterval(countdownInterval);
            } else {
                clearInterval(countdownInterval);
            }
            return;
        }
        
        secondsLeft--;
        codeDisplay.textContent = `${__safeTranslate('extraMode.challengePress')} (${secondsLeft} seconds)`;
        
        if (secondsLeft <= 0) {
            if (window.TimerManager) {
                window.TimerManager.clearInterval(countdownInterval);
            } else {
                clearInterval(countdownInterval);
            }
        }
    };
    let countdownInterval;
    if (window.TimerManager) {
        countdownInterval = window.TimerManager.setInterval(countFn, 1000);
    } else {
        countdownInterval = setInterval(countFn, 1000);
    }
}

/**
 * Complete challenge successfully
 */
function completeChallenge() {
    if (!challengeActive) return;
    
    if (window.DEBUG_MODE) console.log('Challenge completed successfully!');
    challengeActive = false;
    
    // Clear timeout
    if (challengeTimeout) {
        if (window.TimerManager) {
            window.TimerManager.clearTimeout(challengeTimeout);
        } else {
            clearTimeout(challengeTimeout);
        }
        challengeTimeout = null;
    }
    
    // Reset UI
    resetChallengeUI();

    // Stop watch-dog sound
    if (watchDogAudio) {
        watchDogAudio.pause();
        watchDogAudio.currentTime = 0;
    }

    // Keep player mute state unchanged

    // Show success message briefly
    showChallengeSuccessMessage();

    // Schedule next challenge
    scheduleNextChallenge();
} 

/**
 * Fail challenge and deactivate Extra Mode
 */
function failChallenge() {
    if (window.DEBUG_MODE) console.log('Challenge failed - deactivating Extra Mode');
    challengeActive = false;
    
    // Reset UI
    resetChallengeUI();
    // Stop watch-dog sound
    if (watchDogAudio) {
        watchDogAudio.pause();
        watchDogAudio.currentTime = 0;
    }
    // Keep player mute state unchanged
    
    // Show failure message
    showChallengeFailureMessage();
    
    // Deactivate Extra Mode after a brief delay
    if (window.TimerManager) {
        window.TimerManager.setTimeout(() => {
            deactivateExtraMode();
        }, 2000);
    } else {
        setTimeout(() => {
            deactivateExtraMode();
        }, 2000);
    }
}

/**
 * Reset challenge UI elements
 */
function resetChallengeUI() {
    const codeDisplay = document.getElementById('code-display');
    
    if (codeDisplay) {
        // Reset to original appearance using safe translate
        codeDisplay.textContent = __safeTranslate('extraMode.silver'); // Default to silver mode display
        codeDisplay.classList.remove('challenge-active');
        codeDisplay.style.cursor = 'default';
        codeDisplay.onclick = null;
    }
}

/**
 * Show challenge success message
 */
function showChallengeSuccessMessage() {
    const codeDisplay = document.getElementById('code-display');
    if (codeDisplay) {
        const originalText = codeDisplay.textContent;
        codeDisplay.textContent = __safeTranslate('extraMode.challengePassed');
        codeDisplay.style.color = '#00ff00';
        
        const successFn = () => {
            codeDisplay.textContent = originalText;
            codeDisplay.style.color = '';
        };
        if (window.TimerManager) {
            window.TimerManager.setTimeout(successFn, 3000);
        } else {
            setTimeout(successFn, 3000);
        }
    }
}

/**
 * Show challenge failure message
 */
function showChallengeFailureMessage() {
    const codeDisplay = document.getElementById('code-display');
    if (codeDisplay) {
        codeDisplay.textContent = __safeTranslate('extraMode.challengeFailed');
        codeDisplay.style.color = '#ff0000';
    }
}

/**
 * Stop challenge system
 */
function stopChallengeSystem() {
    if (window.DEBUG_MODE) console.log('Stopping challenge system');
    
    challengeActive = false;
    
    // Clear intervals and timeouts
    if (challengeInterval) {
        if (window.TimerManager) {
            window.TimerManager.clearTimeout(challengeInterval);
        } else {
            clearTimeout(challengeInterval);
        }
        challengeInterval = null;
    }
    
    if (challengeTimeout) {
        if (window.TimerManager) {
            window.TimerManager.clearTimeout(challengeTimeout);
        } else {
            clearTimeout(challengeTimeout);
        }
        challengeTimeout = null;
    }
    
    // Reset UI
    resetChallengeUI();
    
    nextChallengeTime = 0;
}

/**
 * Get challenge system status
 */
function getChallengeStatus() {
    return {
        active: challengeActive,
        nextChallengeTime: nextChallengeTime,
        timeUntilNext: nextChallengeTime > 0 ? nextChallengeTime - Date.now() : 0
    };
}

/**
 * Disable code generation progress bar and show extra mode progress
 */
function disableCodeGenerationProgress() {
    if (window.DEBUG_MODE) console.log('Disabling code generation progress bar');
    
    // Store original progress bar state and prepare for Extra Mode
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.dataset.originalWidth = progressBar.style.width;
        progressBar.dataset.originalBackground = progressBar.style.background;
        // Set initial Extra Mode style
        progressBar.style.background = extraBarMode === 'silver' ? 'linear-gradient(90deg, #00ff00, #00cc00)' : 'linear-gradient(90deg, #ffd700, #ffa500)';
        progressBar.style.width = '0%';
    }
    
    // Store original progress text
    const progressText = document.getElementById('progress-text');
    if (progressText) {
        progressText.dataset.originalText = progressText.textContent;
    }
    
    // Override the updateProgressBar function to prevent code generation progress
    if (window.updateProgressBar) {
        window.originalUpdateProgressBar = window.updateProgressBar;
        window.updateProgressBar = function() {
            // Do nothing - this prevents code generation progress updates
            if (window.DEBUG_MODE) console.log('Code generation progress disabled - Extra Mode active');
        };
    }
    
    // Override the calculateProgress function to return Extra Mode progress
    if (window.calculateProgress) {
        window.originalCalculateProgress = window.calculateProgress;
        window.calculateProgress = function(currentTime, nextCodeGenerationTime) {
            // Return Extra Mode progress instead
            if (extraModeActive) {
                const activeDuration = extraBarMode === 'silver' ? SILVER_BAR_TIME : GOLD_BAR_TIME;
                const progress = (extraWatchTime / activeDuration) * 100;
                return Math.min(progress, 100);
            } else {
                // Use original function if Extra Mode is not active
                return window.originalCalculateProgress ? window.originalCalculateProgress(currentTime, nextCodeGenerationTime) : 0;
            }
        };
    }
}

/**
 * Enable code generation progress bar and restore original functionality
 */
function enableCodeGenerationProgress() {
    if (window.DEBUG_MODE) console.log('Re-enabling code generation progress bar');
    
    // Restore original progress bar state
    const progressBar = document.getElementById('progress-bar');
    if (progressBar && progressBar.dataset.originalWidth) {
        progressBar.style.width = progressBar.dataset.originalWidth;
        progressBar.style.background = progressBar.dataset.originalBackground;
        delete progressBar.dataset.originalWidth;
        delete progressBar.dataset.originalBackground;
    }
    
    // Restore original progress text
    const progressText = document.getElementById('progress-text');
    if (progressText && progressText.dataset.originalText) {
        progressText.textContent = progressText.dataset.originalText;
        delete progressText.dataset.originalText;
    }
    
    // Restore original updateProgressBar function
    if (window.originalUpdateProgressBar) {
        window.updateProgressBar = window.originalUpdateProgressBar;
        delete window.originalUpdateProgressBar;
    }
    
    // Restore original calculateProgress function
    if (window.originalCalculateProgress) {
        window.calculateProgress = window.originalCalculateProgress;
        delete window.originalCalculateProgress;
    }
}

// Create Extra Mode UI elements if they don't exist
function createExtraModeUI() {
    // Create progress-text element and insert inside play-pause button
    if (!document.getElementById('progress-text')) {
        const playPauseBtn = document.getElementById('play-pause-button');
        if (playPauseBtn) {
            const progressText = document.createElement('span');
            progressText.id = 'progress-text';
            progressText.textContent = '00%';
            progressText.style.display = 'none';
            progressText.style.position = 'absolute';
            progressText.style.top = '50%';
            progressText.style.left = '50%';
            progressText.style.transform = 'translate(-50%, -50%)';
            progressText.style.color = '#00ff00';
            progressText.style.fontSize = '14px';
            progressText.style.fontWeight = 'bold';
            progressText.style.zIndex = '10';
            progressText.style.pointerEvents = 'none';
            playPauseBtn.appendChild(progressText);
        }
    }

    // Create reward notification element
    if (!document.getElementById('reward-notification')) {
        const rewardNotification = document.createElement('div');
        rewardNotification.id = 'reward-notification';
        rewardNotification.className = 'reward-notification hidden';
        rewardNotification.innerHTML = `
            <div class="reward-content">
                <div id="reward-icon" class="reward-icon"></div>
                <div class="reward-text">
                    <div id="reward-title" class="reward-title"></div>
                    <div id="reward-description" class="reward-description"></div>
                </div>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(rewardNotification);
    }
}

// Monitor Extra Mode state changes
function updateExtraModeDisplay() {
    const isActive = extraModeActive;
    const codeDisplay = document.getElementById('code-display');
    const pt = document.getElementById('progress-text');
    
    if (isActive && codeDisplay) {
        // ONLY update code-display when extra mode is ACTIVE
        if (extraBarMode === 'silver') {
            codeDisplay.textContent = 'EXTRA SILVER';
        } else if (extraBarMode === 'gold') {
            codeDisplay.textContent = 'EXTRA GOLD';
        } else {
            codeDisplay.textContent = 'EXTRA MODE';
        }
        if (pt) pt.style.display = 'inline-block';
    } else if (!isActive && pt) {
        // When NOT active, just hide progress text and let code display handler manage the code
        pt.style.display = 'none';
    }
}

// Add CSS for Extra Mode elements
const extraModeStyles = `
    <style>
        .extra-status {
            margin-top: 10px;
            padding: 10px;
            background-color: rgba(0, 191, 255, 0.1);
            border: 1px solid rgba(0, 191, 255, 0.3);
            border-radius: 5px;
            color: #00bfff;
            font-size: 0.8em;
            text-align: center;
        }

        .extra-status.hidden {
            display: none;
        }

        #extra-progress {
            margin-top: 10px;
        }

        #progress-bar {
            width: 0%;
            height: 4px;
            background: linear-gradient(90deg, #00ff00, #00cc00);
            border-radius: 2px;
            transition: width 0.3s ease;
            margin-bottom: 5px;
            position: relative;
            overflow: hidden;
        }

        #progress-bar::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, 
                transparent,
                rgba(255, 255, 255, 0.4),
                transparent
            );
            animation: progressShine 2s linear infinite;
        }

        @keyframes progressShine {
            0% { left: -100%; }
            100% { left: 100%; }
        }

        #extra-time {
            font-size: 0.7em;
            color: #00bfff;
        }

        .reward-notification {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #00bfff;
            border-radius: 10px;
            padding: 20px;
            z-index: 10000;
            min-width: 300px;
            box-shadow: 0 0 20px rgba(0, 191, 255, 0.5);
            animation: rewardPopup 0.5s ease-out;
        }

        .reward-notification.hidden {
            display: none;
        }

        .reward-content {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .reward-icon {
            font-size: 2em;
            animation: rewardPulse 1s ease-in-out infinite;
        }

        .reward-icon.silver {
            color: #c0c0c0;
        }

        .reward-icon.gold {
            color: #ffd700;
        }

        .reward-text {
            flex: 1;
        }

        .reward-title {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 5px;
            color: #fff;
        }

        .reward-description {
            font-size: 0.9em;
            color: #ccc;
        }

        @keyframes rewardPopup {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            100% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }

        @keyframes rewardPulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.1);
            }
        }

        #extra-button.glow-active {
            background: linear-gradient(45deg, #00bfff, #0080ff);
            box-shadow: 0 0 20px rgba(0, 191, 255, 0.8);
            animation: buttonGlow 2s ease-in-out infinite;
        }

        @keyframes buttonGlow {
            0%, 100% {
                box-shadow: 0 0 20px rgba(0, 191, 255, 0.8);
            }
            50% {
                box-shadow: 0 0 30px rgba(0, 191, 255, 1);
            }
        }

        #extra-code-bar {
            background-color: rgba(0, 191, 255, 0.1);
            border: 1px solid rgba(0, 191, 255, 0.3);
            color: #00bfff;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
            text-align: center;
            font-size: 0.8em;
            cursor: default;
            transition: all 0.3s ease;
        }

        #extra-code-bar.challenge-active {
            background-color: rgba(255, 0, 0, 0.2);
            border-color: rgba(255, 0, 0, 0.5);
            color: #ff0000;
            cursor: pointer;
            animation: challengePulse 1s ease-in-out infinite;
        }

        @keyframes challengePulse {
            0%, 100% {
                background-color: rgba(255, 0, 0, 0.2);
                box-shadow: 0 0 10px rgba(255, 0, 0, 0.3);
            }
            50% {
                background-color: rgba(255, 0, 0, 0.4);
                box-shadow: 0 0 20px rgba(255, 0, 0, 0.6);
            }
        }

        .pulse {
            animation: pulse 1s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.05);
            }
        }
    </style>
`;

// Add styles to head
if (!document.getElementById('extra-mode-styles')) {
    // FIX: Was creating a <div> element for styles (unreliable). Use <style> tag.
    const styleElement = document.createElement('style');
    styleElement.id = 'extra-mode-styles';
    styleElement.textContent = extraModeStyles;
    document.head.appendChild(styleElement);
}

// FIX: Was assigning window.ExtraMode unconditionally (overwriting the guarded assignment
// made during DOMContentLoaded). Now uses Object.assign to extend without overwriting.
if (!window.ExtraMode) window.ExtraMode = {};
Object.assign(window.ExtraMode, {
    initialize: initializeSwitchButton,
    activate: activateExtraMode,
    deactivate: deactivateExtraMode,
    startTimer: startExtraTimer,
    stopTimer: stopExtraTimer,
    isActive: isExtraModeActive,
    getState: getExtraModeState,
    claimReward: claimReward,
    getActiveRewards: () => activeRewards,
    setClaimTimeout: (timeout) => rewardClaimTimeout = timeout,
    completeChallenge: completeChallenge,
    getChallengeStatus: getChallengeStatus,
    forceChallenge: startChallenge, // For testing purposes
    resetSwitch: resetSwitchToCenter, // For external switch reset
    disableCodeProgress: disableCodeGenerationProgress, // For external progress control
    enableCodeProgress: enableCodeGenerationProgress // For external progress control
}); 
    function recordRewardAndAsset(reward){
        try{
            if (window.AssetBus) {
                const state = window.AssetBus.getState();
                const seriesKey = reward.type;
                const assetCode = seriesKey === 'silver'
                  ? (typeof generateAsset==='function' ? generateAsset('silver') : window.AssetBus.__genAssetCode('silver'))
                  : (typeof generateAsset==='function' ? generateAsset('gold') : window.AssetBus.__genAssetCode('gold'));
                const currentSeries = Array.isArray(state.series?.[seriesKey]) ? state.series[seriesKey].slice() : [];
                const newSeries = currentSeries.concat([assetCode]);
                const updatedState = {
                  ...state,
                  series: { ...state.series, [seriesKey]: newSeries },
                  last: { ...state.last, [seriesKey]: assetCode }
                };
                // FIX BUG#4: Moved ss declaration OUTSIDE the if block so it's accessible below
            const ss = window.safeStorage || null;
                if (ss) { ss.set('codebank_assets', JSON.stringify(updatedState)); }
                window.dispatchEvent(new CustomEvent('assets:updated', { detail: updatedState }));
            }
            
            // Reward registry (legacy) is intentionally skipped until UI success

            // Rewards object (legacy summary)
            var r = {};
            try { r = JSON.parse((ss ? ss.get('codebank_rewards') : null) || '{}'); } catch(_) { r = {}; }
            if (reward.type === 'silver') r.silverBars = (parseInt(r.silverBars||'0',10) + 1);
            if (reward.type === 'gold') r.goldBars = (parseInt(r.goldBars||'0',10) + 1);
            r.lastUpdated = new Date().toISOString();
            ss.set('codebank_rewards', JSON.stringify(r));

            // Asset counters (legacy)
            if (reward.type === 'silver') {
                var s = parseInt(ss.get('asset-silver') || '0', 10) + 1; ss.set('asset-silver', String(s));
            } else if (reward.type === 'gold') {
                var g = parseInt(ss.get('asset-gold') || '0', 10) + 1; ss.set('asset-gold', String(g));
            }
        }catch(e){ console.warn('recordRewardAndAsset failed', e); }
    }
