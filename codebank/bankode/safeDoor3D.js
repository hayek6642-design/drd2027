class SafeDoor3D {
  constructor(_supabaseClient) {
    this.supabase = null;
    this.safeRecord = null;

    // UI elements
    this.safeDoorModal = document.getElementById('safeDoorModal');
    this.safeDoor3D = document.getElementById('safeDoor3D');
    this.bankodePassword = document.getElementById('bankodePassword');
    this.verifyPasswordBtn = document.getElementById('verifyPasswordBtn');
    this.closeSafeDoor = document.getElementById('closeSafeDoor');
    this.safeDoorStatus = document.getElementById('safeDoorStatus');
    this.safeDoorElement = this.safeDoor3D?.querySelector('.safe-door');

    // Setup event listeners
    this.setupEventListeners();
  }

  // Offline stub
  async loadSafe(_ownerUid) {
    this.safeRecord = { owner_uid: 'local', password_hash: '' };
  }

  // Verify password
  async verifyPassword(_inputPassword) { await this.handlePasswordFailure(); throw new Error('Offline mode: verification disabled') }

  // Handle failed password attempts
  async handlePasswordFailure() { this.shakeSafeDoor(); this.playAlarmSound(); }

  // Frontend effects
  shakeSafeDoor() {
    const door = document.getElementById('safeDoor3D');
    door.classList.add('shake');
    setTimeout(() => door.classList.remove('shake'), 600);
  }

  playAlarmSound() {
    const audio = new Audio('/sounds/alarm.mp3');
    audio.play();
  }

  // Admin balance fetch
  async getAdminBalance() { return { codes: 0, silverBars: 0, goldBars: 0 } }

  // UI Methods
  setupEventListeners() {
    if (this.closeSafeDoor) {
      this.closeSafeDoor.addEventListener('click', () => {
        this.closeSafeDoorModal();
      });
    }

    if (this.verifyPasswordBtn) {
      this.verifyPasswordBtn.addEventListener('click', () => {
        this.verifyPasswordUI();
      });
    }

    if (this.bankodePassword) {
      this.bankodePassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.verifyPasswordUI();
        }
      });
    }
  }

  async openSafeDoor() {
    try {
      // Load safe record for the admin user
      await this.loadSafe('7186c7f0-e4b6-48a7-9c24-b750a7cdde25');

      if (this.safeDoorModal) {
        this.safeDoorModal.classList.remove('hidden');
        if (this.bankodePassword) {
          this.bankodePassword.value = '';
          this.bankodePassword.focus();
        }
        this.updateStatus('Enter your Bankode password to unlock the safe');
      }
    } catch (error) {
      console.error('Failed to load safe:', error);
      this.updateStatus('Failed to load safe configuration', 'error');
    }
  }

  closeSafeDoorModal() {
    if (this.safeDoorModal) {
      this.safeDoorModal.classList.add('hidden');
    }
  }

  async verifyPasswordUI() {
    const password = this.bankodePassword?.value.trim();
    if (!password) {
      this.updateStatus('Please enter your Bankode password', 'error');
      return;
    }

    if (this.verifyPasswordBtn) {
      this.verifyPasswordBtn.disabled = true;
      this.verifyPasswordBtn.textContent = 'Verifying...';
    }

    try {
      const isValid = await this.verifyPassword(password);
      if (isValid) {
        this.handlePasswordSuccessUI();
      }
    } catch (error) {
      this.handlePasswordFailureUI(error.message);
    } finally {
      if (this.verifyPasswordBtn) {
        this.verifyPasswordBtn.disabled = false;
        this.verifyPasswordBtn.textContent = 'Verify';
      }
    }
  }

  handlePasswordSuccessUI() {
    this.updateStatus('SafeDoor unlocked! Access granted.', 'success');
    // Show admin panel if needed
    setTimeout(() => {
      const adminPanelModal = document.getElementById('adminPanelModal');
      if (adminPanelModal) {
        adminPanelModal.classList.remove('hidden');
      }
    }, 1000);
  }

  handlePasswordFailureUI(message) {
    this.updateStatus(message, 'error');
  }

  updateStatus(message, type = 'info') {
    if (this.safeDoorStatus) {
      this.safeDoorStatus.textContent = message;
      this.safeDoorStatus.classList.remove('text-green-500', 'text-red-500', 'text-blue-500');
      if (type === 'success') {
        this.safeDoorStatus.classList.add('text-green-500');
      } else if (type === 'error') {
        this.safeDoorStatus.classList.add('text-red-500');
      } else {
        this.safeDoorStatus.classList.add('text-blue-500');
      }
    }
  }
}

// Initialize globally
window.SafeDoor3D = new SafeDoor3D(null);
