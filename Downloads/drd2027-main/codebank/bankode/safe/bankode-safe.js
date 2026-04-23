// Premium 3D Asset Safe - Complete Realistic Implementation
(() => {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForDependenciesAndInit);
  } else {
    // DOM is ready, but also wait for all dependencies
    waitForDependenciesAndInit();
  }

  // Helper function to wait for dependencies before initializing
  async function waitForDependenciesAndInit() {
    try {
      console.log('🏗️ Safe: Waiting for dependencies...');

      // Wait for DOM to be ready first
      if (window.waitForDOM) {
        await window.waitForDOM();
        console.log('✅ Safe: DOM is ready');
      }

      // Wait for Supabase to be available using helper function
      if (window.waitForSupabase) {
        await window.waitForSupabase();
        console.log('✅ Safe: Supabase is ready');
      } else if (!window.supabase) {
        // Fallback to manual wait
        await new Promise((resolve) => {
          window.addEventListener('supabase:ready', resolve, { once: true });
        });
        console.log('✅ Safe: Supabase is ready (fallback)');
      }

      // CRITICAL: Wait for unifiedStorage to be fully initialized
      // This is the key fix - unifiedStorage exposes a ready promise
      if (window.unifiedStorageReady) {
        await window.unifiedStorageReady;
        console.log('✅ Safe: unifiedStorage is fully ready');
      } else if (window.unifiedStorage && window.unifiedStorage.unifiedStorageReady) {
        await window.unifiedStorage.unifiedStorageReady;
        console.log('✅ Safe: unifiedStorage is fully ready (via API)');
      } else {
        // Fallback - wait for unifiedStorage object and its methods
        let attempts = 0;
        while (!window.unifiedStorage || !window.unifiedStorage.getCurrentUser) {
          if (attempts++ > 100) { // 5 seconds timeout
            throw new Error('unifiedStorage not initialized within timeout');
          }
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        console.log('✅ Safe: unifiedStorage is ready (fallback)');
      }

      console.log('✅ Safe: All dependencies ready, initializing AssetSafe');
      initAssetSafe();
    } catch (error) {
      console.error('❌ Safe: Failed to wait for dependencies:', error);
      // Still try to initialize even if dependencies aren't available
      console.log('⚠️ Safe: Initializing without all dependencies');
      initAssetSafe();
    }
  }

  function initAssetSafe() {
    // Check if we're on the Assets page
    if (!document.querySelector('.asset-safe-container')) {
      console.log('Asset Safe only loads on pages with .asset-safe-container');
      return;
    }

    // DOM elements
    const container = document.querySelector('.asset-safe-container');
    const scene = container.querySelector('.safe-3d-scene');
    const door = container.querySelector('.safe-door-3d');
    const dial = container.querySelector('.safe-dial');
    const handle = container.querySelector('.safe-handle');
    const bolts = container.querySelectorAll('.safe-bolt');
    const led = container.querySelector('.safe-led');
    const innerChamber = container.querySelector('.safe-inner-chamber');
    const closeBtn = container.querySelector('.safe-close-btn');
    const instructions = container.querySelector('.safe-instructions');

    // Password panel elements
    const passwordPanel = container.querySelector('.password-panel') || createPasswordPanel();
    const passwordInput = passwordPanel.querySelector('.password-input');
    const passwordBtn = passwordPanel.querySelector('.password-btn.primary');
    const cancelBtn = passwordPanel.querySelector('.password-btn:not(.primary)');
    const resetLink = passwordPanel.querySelector('.reset-password a');

    // Supabase integration
    const supabase = window.unifiedStorage && window.unifiedStorage.supabase;
    const supabaseAvailable = !!supabase;

    // State variables
    let isDragging = false;
    let lastAngle = 0;
    let currentAngle = 0;
    let velocity = 0;
    let lastTime = 0;
    let animationId = null;
    let isOpen = false;
    let isPasswordVerified = false;
    let failedAttempts = 0;
    let lockoutUntil = 0;
    let lastTickSound = 0;
    let isLockedOut = false;
    let lockoutEndTime = 0;

    // Combination lock state - Real safe behavior
    let combinationStage = 0; // 0: first right turn, 1: left turn, 2: final right turn
    let rightTurns = 0;
    let leftTurns = 0;
    let currentNumber = 0;
    let directionHistory = [];

    // Default combination: 12, 28, 6 (right, left, right)
    const COMBINATION = [12, 28, 6];
    const MAX_FAILED_ATTEMPTS = 5;
    const LOCKOUT_DURATION = 30 * 1000; // 30 seconds for 5 attempts
    const FULL_LOCK_ATTEMPTS = 10;
    const FULL_LOCK_DURATION = 5 * 60 * 1000; // 5 minutes for full lock

    // Password system
    const STORAGE_KEY = 'asset_safe_password';
    const SALT_KEY = 'asset_safe_salt';
    const PASS_PHRASE = 'doitasap2025'; // For AES encryption

    // Audio context and sounds
    let audioContext = null;
    const sounds = {};

    // Initialize audio
    async function initAudio() {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        createSounds();
      } catch (e) {
        console.warn('Web Audio API not supported:', e);
      }
    }

    function createSounds() {
      sounds.tick = () => {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.05);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);
      };

      sounds.unlock = () => {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
      };

      sounds.buzzer = () => {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      };

      sounds.lock = () => {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      };

      sounds.hinge = () => {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(120, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.8);

        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.8);
      };

      sounds.lockClick = () => {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.05);

        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      };

      sounds.alarm = () => {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1400, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(1600, audioContext.currentTime + 0.2);

        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      };
    }

    function playSound(soundName) {
      if (sounds[soundName]) {
        sounds[soundName]();
      }
    }

    function vibrate(pattern = [100, 50, 100]) {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    }

    // Password System with AES Encryption
    async function deriveKey() {
      const enc = new TextEncoder();
      const salt = enc.encode(SALT_KEY);
      const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(PASS_PHRASE), {name: 'PBKDF2'}, false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey(
        {name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256'},
        {name: 'AES-GCM', length: 256},
        false,
        ['encrypt', 'decrypt']
      );
      return key;
    }

    async function encryptPassword(password) {
      const key = await deriveKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = new TextEncoder().encode(password);
      const ct = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, data);
      return {iv: Array.from(iv), ct: Array.from(new Uint8Array(ct))};
    }

    async function decryptPassword(payload) {
      const key = await deriveKey();
      const iv = new Uint8Array(payload.iv);
      const ct = new Uint8Array(payload.ct);
      const plain = await crypto.subtle.decrypt({name: 'AES-GCM', iv}, key, ct);
      return new TextDecoder().decode(plain);
    }

    async function setPassword(password) {
      try {
        const encrypted = await encryptPassword(password);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
        return true;
      } catch (e) {
        console.error('Failed to set password:', e);
        return false;
      }
    }

    async function verifyPassword(inputPassword) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          // First time setup
          await setPassword(inputPassword);
          return true;
        }
        const payload = JSON.parse(stored);
        const storedPassword = await decryptPassword(payload);
        return storedPassword === inputPassword;
      } catch (e) {
        console.error('Failed to verify password:', e);
        return false;
      }
    }

    async function resetPassword(oldPassword, newPassword) {
      if (await verifyPassword(oldPassword)) {
        return await setPassword(newPassword);
      }
      return false;
    }

    // Create password panel dynamically
    function createPasswordPanel() {
      const panel = document.createElement('div');
      panel.className = 'password-panel';
      panel.innerHTML = `
        <h4>Enter Password</h4>
        <input id="safe-password-input" name="safe-password" type="password" class="password-input" placeholder="Enter password" maxlength="50">
        <div class="password-buttons">
          <button class="password-btn">Cancel</button>
          <button class="password-btn primary">Unlock</button>
        </div>
        <div class="reset-password">
          <a href="#" class="reset-link">Reset Password</a>
        </div>
      `;
      container.appendChild(panel);
      return panel;
    }

    // Show/Hide password panel
    function showPasswordPanel() {
      passwordPanel.classList.add('visible');
      passwordInput.focus();
    }

    function hidePasswordPanel() {
      passwordPanel.classList.remove('visible');
      passwordInput.value = '';
    }

    // Update dial rotation
    function updateDialRotation(angle) {
      currentAngle = ((angle % 360) + 360) % 360;
      dial.style.transform = `translate(-50%, -50%) translateZ(30px) rotate(${currentAngle}deg)`;
      currentNumber = angleToNumber(currentAngle);
    }

    // Get angle from mouse/touch event
    function getAngleFromEvent(e) {
      const rect = dial.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - centerX;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - centerY;
      let angle = Math.atan2(y, x) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      return angle;
    }

    // Convert angle to number (0-39)
    function angleToNumber(angle) {
      return Math.round(((angle % 360) + 360) % 360 / 9) % 40;
    }

    // Convert number to angle
    function numberToAngle(number) {
      return (number * 9) % 360;
    }

    // Snap to nearest number
    function snapToNumber(angle) {
      const number = angleToNumber(angle);
      return numberToAngle(number);
    }

    // Physics animation for dial
    function animateDial() {
      if (!isDragging && Math.abs(velocity) > 0.01) {
        velocity *= 0.95; // Friction
        const newAngle = (currentAngle + velocity) % 360;
        
        // Snap when slow
        if (Math.abs(velocity) < 0.5) {
          const snapped = snapToNumber(newAngle);
          const diff = snapped - newAngle;
          const adjustedAngle = newAngle + diff * 0.15;
          velocity *= 0.8;
          updateDialRotation(adjustedAngle);
        } else {
          updateDialRotation(newAngle);
        }

        animationId = requestAnimationFrame(animateDial);
      } else {
        cancelAnimationFrame(animationId);
        animationId = null;
        // Final snap
        const snapped = snapToNumber(currentAngle);
        animateSnap(snapped);
      }
    }

    // Smooth snap animation
    function animateSnap(targetAngle) {
      const startAngle = currentAngle;
      const diff = ((targetAngle - startAngle + 540) % 360) - 180; // Shortest path
      const startTime = Date.now();
      const duration = 200;

      function snapFrame() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        updateDialRotation(startAngle + diff * easeOut);
        
        if (progress < 1) {
          requestAnimationFrame(snapFrame);
        } else {
          checkCombination();
        }
      }
      requestAnimationFrame(snapFrame);
    }

    // Track rotations and direction changes
    function updateTurnTracking(delta) {
      const fullRotation = 360;
      
      if (delta > 180) {
        // Wrapped around backwards (left turn)
        if (velocity > 0) rightTurns++;
        else leftTurns++;
      } else if (delta < -180) {
        // Wrapped around forwards (right turn)
        if (velocity > 0) rightTurns++;
        else leftTurns++;
      } else {
        // Normal movement
        if (velocity > 0 && delta > 0) rightTurns++;
        if (velocity < 0 && delta < 0) leftTurns++;
      }
    }

    // Start dragging
    function startDrag(e) {
      if (isOpen || isLockedOut() || isLockedOut) return;
      isDragging = true;
      lastAngle = getAngleFromEvent(e);
      velocity = 0;
      cancelAnimationFrame(animationId);
      dial.classList.add('rotating');
      e.preventDefault();
    }

    // Drag movement
    function onDrag(e) {
      if (!isDragging || isOpen) return;
      
      const angle = getAngleFromEvent(e);
      const now = Date.now();
      const timeDelta = Math.max(now - lastTime, 1);

      let delta = angle - lastAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      updateDialRotation(currentAngle + delta);
      updateTurnTracking(delta);

      // Calculate velocity
      velocity = delta / timeDelta * 16.67; // Normalize to 60fps

      lastAngle = angle;
      lastTime = now;

      // Play lock-click sound
      const newNumber = angleToNumber(currentAngle);
      if (newNumber !== currentNumber && Date.now() - lastTickSound > 50) {
        playSound('lockClick');
        lastTickSound = Date.now();
      }
    }

    // End dragging
    function endDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      dial.classList.remove('rotating');

      // Start inertia animation
      if (Math.abs(velocity) > 0.1) {
        animateDial();
      } else {
        checkCombination();
      }
    }

    // Check combination logic
    function checkCombination() {
      const number = angleToNumber(currentAngle);
      const direction = velocity >= 0 ? 'right' : 'left';

      // Update direction history
      if (directionHistory.length === 0 || directionHistory[directionHistory.length - 1] !== direction) {
        directionHistory.push(direction);
      }

      // Combination logic: Right 2+ turns to 12, Left to 28, Right to 6
      if (combinationStage === 0) {
        // First stage: Right turns to COMBINATION[0]
        if (direction === 'right' && number === COMBINATION[0] && rightTurns >= 2) {
          combinationStage = 1;
          flashLed('success');
          resetTurnCounts();
        }
      } else if (combinationStage === 1) {
        // Second stage: Left turn to COMBINATION[1]
        if (direction === 'left' && number === COMBINATION[1]) {
          combinationStage = 2;
          flashLed('success');
          resetTurnCounts();
        }
      } else if (combinationStage === 2) {
        // Third stage: Right turn to COMBINATION[2]
        if (direction === 'right' && number === COMBINATION[2]) {
          // Combination complete!
          if (isPasswordVerified) {
            unlockSafe();
          } else {
            showPasswordPanel();
          }
        }
      }
    }

    function resetTurnCounts() {
      rightTurns = 0;
      leftTurns = 0;
      directionHistory = [];
    }

    // LED status management
    function flashLed(type) {
      led.className = 'safe-led';
      if (type === 'success') {
        led.classList.add('success');
        setTimeout(() => led.className = 'safe-led', 1000);
      } else if (type === 'warning') {
        led.classList.add('warning');
        setTimeout(() => led.className = 'safe-led', 1000);
      }
    }

    function setLedStatus(type) {
      led.className = 'safe-led';
      if (type) led.classList.add(type);
    }

    // Lockout management
    function checkLockoutStatus() {
      return Date.now() < lockoutUntil || isLockedOut;
    }

    function setLockout() {
      lockoutUntil = Date.now() + LOCKOUT_DURATION;
      isLockedOut = false;
      showLockoutMessage();
      saveState({ locked: true, lockoutUntil });
    }

    function setFullLock() {
      isLockedOut = true;
      lockoutEndTime = Date.now() + FULL_LOCK_DURATION;
      showFullLockMessage();
      saveState({ fullyLocked: true, lockoutEndTime });

      // Create audit entry
      if (window.unifiedStorage) {
        window.unifiedStorage.createEb3atNotification({
          user_id: 'admin', // or get current user
          actor_id: null,
          transfer_id: null,
          type: 'safe_lockout',
          payload: { attempts: failedAttempts, lockoutDuration: FULL_LOCK_DURATION }
        }).catch(err => console.warn('Failed to create audit notification:', err));
      }
    }

    function showLockoutMessage() {
      const timeLeft = Math.ceil((lockoutUntil - Date.now()) / 1000);
      instructions.textContent = `Safe locked! Try again in ${timeLeft} seconds.`;
    }

    function showFullLockMessage() {
      const timeLeft = Math.ceil((lockoutEndTime - Date.now()) / 60000);
      instructions.textContent = `Safe fully locked due to too many failed attempts! Contact admin. Unlocks in ${timeLeft} minutes.`;
    }

    // LED flash red 3 times
    function flashLedRed(times) {
      let count = 0;
      const flash = () => {
        if (count < times * 2) {
          setLedStatus(count % 2 === 0 ? 'warning' : null);
          count++;
          setTimeout(flash, 200);
        }
      };
      flash();
    }

    // Dial spin-back animation
    function spinBackDial() {
      const startAngle = currentAngle;
      const targetAngle = 0;
      const duration = 800;
      const startTime = Date.now();

      function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        updateDialRotation(startAngle + (targetAngle - startAngle) * easeOut);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      }
      animate();
    }

    // Pulse text effect
    function showWrongPasswordText() {
      const wrongText = document.createElement('div');
      wrongText.textContent = 'WRONG PASSWORD';
      wrongText.className = 'wrong-password-pulse';
      wrongText.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #ff0000;
        font-size: 24px;
        font-weight: bold;
        text-shadow: 0 0 10px rgba(255,0,0,0.8);
        z-index: 1000;
        pointer-events: none;
        animation: wrongPulse 1s ease-out;
      `;
      scene.appendChild(wrongText);

      setTimeout(() => {
        if (wrongText.parentNode) {
          wrongText.parentNode.removeChild(wrongText);
        }
      }, 1000);
    }

    // Wrong attempt
    function wrongAttempt() {
      failedAttempts++;
      playSound('alarm'); // High-pitch alarm instead of buzzer
      vibrate([300, 150, 300, 150, 300]);

      // Stronger shake
      scene.classList.add('shake-hard');

      // LED flashes red 3 times
      flashLedRed(3);

      // Dial spin-back animation
      spinBackDial();

      // Pulse text effect
      showWrongPasswordText();

      setTimeout(() => {
        scene.classList.remove('shake-hard');
        if (isLockedOut) {
          showLockoutMessage();
        } else {
          instructions.textContent = 'Wrong combination! Try again.';
        }
      }, 1000);

      resetCombination();

      // Lockout logic
      if (failedAttempts >= FULL_LOCK_ATTEMPTS) {
        setFullLock();
      } else if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        setLockout();
      }
    }

    function resetCombination() {
      combinationStage = 0;
      resetTurnCounts();
      updateDialRotation(0);
    }

    // Unlock sequence
    async function unlockSafe() {
      playSound('unlock');
      vibrate([300, 100, 300]);

      // Step 1: Handle rotates first
      setTimeout(() => {
        handle.classList.add('unlocked');
        playSound('lockClick');
      }, 200);

      // Step 2: LED turns green
      setTimeout(() => {
        setLedStatus('success');
      }, 400);

      // Step 3: Retract bolts
      setTimeout(() => {
        bolts.forEach(bolt => bolt.classList.add('retracted'));
        playSound('lock');
      }, 700);

      // Step 4: Open door with hinge sound
      setTimeout(() => {
        playSound('hinge');
        door.classList.add('opening');
        isOpen = true;
      }, 1000);

      // Step 5: LED glows white, show inner chamber
      setTimeout(() => {
        led.classList.add('glow');
        innerChamber.classList.add('visible');
        revealAssets();
      }, 1300);

      // Reset combination for next time
      resetCombination();
      failedAttempts = 0;
      saveState({ unlocked: true, timestamp: Date.now() });
    }

    // Close sequence
    function closeSafe() {
      playSound('lock');
      
      innerChamber.classList.remove('visible');
      door.classList.remove('opening');
      isOpen = false;
      isPasswordVerified = false;

      handle.classList.remove('unlocked');
      bolts.forEach(bolt => bolt.classList.remove('retracted'));
      setLedStatus(null);

      resetCombination();
      saveState({ locked: true, timestamp: Date.now() });
      
      // Dispatch closed event for UI updates
      window.dispatchEvent(new CustomEvent('safe:closed'));
    }

    // Reveal assets
    function revealAssets() {
      const assetCard = document.querySelector('.asset-card');
      if (assetCard) {
        assetCard.classList.remove('locked');
      }
      window.dispatchEvent(new CustomEvent('safe:opened'));
    }

    // Keyboard support
    function handleKeydown(e) {
      if (isOpen) return;

      switch (e.key) {
        case 'ArrowLeft':
          updateDialRotation(currentAngle - 9);
          checkCombination();
          playSound('tick');
          break;
        case 'ArrowRight':
          updateDialRotation(currentAngle + 9);
          checkCombination();
          playSound('tick');
          break;
        case 'Enter':
          if (passwordPanel.classList.contains('visible')) {
            passwordBtn.click();
          }
          break;
        case 'Escape':
          if (passwordPanel.classList.contains('visible')) {
            hidePasswordPanel();
          }
          break;
        case 'o':
        case 'O':
          if (e.ctrlKey) {
            unlockSafe();
          }
          break;
        case 'r':
        case 'R':
          if (e.ctrlKey) {
            closeSafe();
          }
          break;
      }
    }

    // Instructions management
    function updateInstructions() {
      if (combinationStage === 0) {
        instructions.innerHTML = '<strong>Stage 1:</strong> Turn right 2+ times, stop at 12';
      } else if (combinationStage === 1) {
        instructions.innerHTML = '<strong>Stage 2:</strong> Turn left, stop at 28';
      } else if (combinationStage === 2) {
        instructions.innerHTML = '<strong>Stage 3:</strong> Turn right, stop at 6, then enter password';
      }
    }

    // State persistence
    async function saveState(state = {}) {
      if (supabaseAvailable) {
        try {
          const user = await unifiedStorage.getCurrentUser();
          if (user) {
            await unifiedStorage.saveData('safe_state', state);
          }
        } catch (e) {
          console.warn('Failed to save to Supabase:', e);
        }
      }
    }

    async function loadState() {
      if (supabaseAvailable) {
        try {
          const user = await unifiedStorage.getCurrentUser();
          if (user) {
            const state = await unifiedStorage.getData('safe_state');
            return state || {};
          }
        } catch (e) {
          console.warn('Failed to load from Supabase:', e);
        }
      }
      return {};
    }

    // Event listeners
    dial.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', endDrag);

    dial.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', onDrag, { passive: false });
    window.addEventListener('touchend', endDrag);

    handle.addEventListener('click', () => {
      if (isLockedOut()) {
        wrongAttempt();
        return;
      }
      if (combinationStage === 2 && isPasswordVerified) {
        unlockSafe();
      } else if (combinationStage === 2 && !isPasswordVerified) {
        showPasswordPanel();
      } else {
        wrongAttempt();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeSafe);
    }

    // Password panel events
    if (passwordBtn) passwordBtn.addEventListener('click', async () => {
      const password = passwordInput.value.trim();
      if (password) {
        const verified = await verifyPassword(password);
        if (verified) {
          isPasswordVerified = true;
          hidePasswordPanel();
          if (combinationStage === 2) {
            unlockSafe();
          }
        } else {
          passwordInput.style.borderColor = '#ff0000';
          setTimeout(() => {
            passwordInput.style.borderColor = '';
          }, 1000);
        }
      }
    });

    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      hidePasswordPanel();
    });

    if (resetLink) resetLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const oldPassword = prompt('Enter current password:');
      if (oldPassword) {
        const newPassword = prompt('Enter new password:');
        if (newPassword) {
          const success = await resetPassword(oldPassword, newPassword);
          if (success) {
            alert('Password reset successfully!');
          } else {
            alert('Failed to reset password. Check your current password.');
          }
        }
      }
    });

    if (passwordInput) passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        passwordBtn.click();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', handleKeydown);

    // Instructions updates
    setInterval(updateInstructions, 1000);

    // Initialize dial marks
    function initDialMarks() {
      const ticksContainer = dial.querySelector('.safe-dial-ticks');
      if (!ticksContainer) return;

      ticksContainer.innerHTML = '';

      for (let i = 0; i < 40; i++) {
        const angle = i * 9;

        const tick = document.createElement('div');
        tick.className = `safe-dial-tick ${i % 5 === 0 ? 'major' : ''}`;
        tick.style.setProperty('--rotation', `${angle}deg`);
        ticksContainer.appendChild(tick);

        if (i % 5 === 0) {
          const number = document.createElement('div');
          number.className = 'safe-dial-number';
          number.textContent = i;
          number.style.setProperty('--rotation', `${angle}deg`);
          ticksContainer.appendChild(number);
        }
      }
    }

    // Initialize
    async function initialize() {
      await initAudio();
      initDialMarks();
      updateDialRotation(0);

      // Load previous state
      const savedState = await loadState();
      if (savedState.unlocked) {
        // Auto-open if previously unlocked
        setTimeout(() => unlockSafe(), 500);
      } else if (savedState.fullyLocked && savedState.lockoutEndTime) {
        isLockedOut = true;
        lockoutEndTime = savedState.lockoutEndTime;
        if (Date.now() < lockoutEndTime) {
          showFullLockMessage();
        } else {
          isLockedOut = false; // Lockout expired
        }
      } else if (savedState.locked && savedState.lockoutUntil) {
        lockoutUntil = savedState.lockoutUntil;
        if (checkLockoutStatus()) {
          showLockoutMessage();
        }
      }

      // Set ARIA labels
      if (dial) dial.setAttribute('aria-label', 'Safe combination dial. Turn to enter combination: right to 12, left to 28, right to 6');
      if (handle) handle.setAttribute('aria-label', 'Safe handle. Click after entering correct combination');
      if (closeBtn) closeBtn.setAttribute('aria-label', 'Close safe door');

      // Focus management
      if (dial) dial.setAttribute('tabindex', '0');
      if (handle) handle.setAttribute('tabindex', '0');
      if (closeBtn) closeBtn.setAttribute('tabindex', '0');

      console.log('Premium 3D Asset Safe initialized');
    }

    initialize();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    });

    // Public API
    window.AssetSafe = {
      open: unlockSafe,
      close: closeSafe,
      reset: () => {
        resetCombination();
        updateDialRotation(0);
      },
      isOpen: () => isOpen,
      isLockedOut: () => checkLockoutStatus() || isLockedOut,
      getFailedAttempts: () => failedAttempts,
      resetLockout: () => {
        isLockedOut = false;
        lockoutUntil = 0;
        lockoutEndTime = 0;
        failedAttempts = 0;
        instructions.textContent = 'Enter the combination to unlock the safe.';
      }
    };
  }
})();