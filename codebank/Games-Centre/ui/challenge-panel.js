/**
 * Challenge Panel UI Component
 * Interface for creating and managing challenges
 */

class ChallengePanel {
  constructor() {
    this.element = null;
    this.competitionEngine = null;
    this.gameRegistry = null;
    this.eventListeners = new Map();
    this.currentChallenge = null;
  }

  /**
   * Initialize the challenge panel
   */
  init(elementId, competitionEngine, gameRegistry) {
    this.element = document.getElementById(elementId);
    if (!this.element) {
      throw new Error(`Challenge panel element not found: ${elementId}`);
    }

    this.competitionEngine = competitionEngine;
    this.gameRegistry = gameRegistry;
    this.render();
    this.setupEventListeners();

    console.log('[ChallengePanel] Initialized');
    this.emit('challenge-panel:ready');
  }

  /**
   * Render the challenge panel UI
   */
  render() {
    if (!this.element) return;

    const games = this.gameRegistry.getAllGames();

    this.element.innerHTML = `
      <div class="challenge-panel">
        <div class="challenge-panel-header">
          <h2>Create Challenge</h2>
          <button id="closeChallengePanel" class="btn-close">×</button>
        </div>

        <div class="challenge-panel-content">
          <div class="challenge-form">
            <div class="form-group">
              <label for="challengeGame">Game</label>
              <select id="challengeGame" class="form-control">
                ${games.map(game => `
                  <option value="${game.gameId}">${game.metadata.title}</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label for="challengeMode">Mode</label>
              <select id="challengeMode" class="form-control">
                <option value="multiplayer">Multiplayer</option>
                <option value="vs-computer">VS Computer</option>
              </select>
            </div>

            <div class="form-group">
              <label for="challengeValue">Value Mode</label>
              <select id="challengeValue" class="form-control">
                <option value="zero-value">Zero Value (Friendly)</option>
                <option value="points">Points</option>
                <option value="virtual-currency">Virtual Currency</option>
              </select>
            </div>

            <div class="form-group">
              <label>Services</label>
              <div class="service-options">
                <label>
                  <input type="checkbox" id="challengeTextChat" checked> Text Chat
                </label>
                <label>
                  <input type="checkbox" id="challengeAudio"> Audio Call
                </label>
                <label>
                  <input type="checkbox" id="challengeVideo"> Video Call
                </label>
              </div>
            </div>

            <div class="form-group">
              <label for="challengeMessage">Challenge Message</label>
              <textarea id="challengeMessage" class="form-control" placeholder="Add a message to your challenge..."></textarea>
            </div>

            <button id="createChallengeBtn" class="btn btn-primary">Create Challenge</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close panel
    this.element.querySelector('#closeChallengePanel')?.addEventListener('click', () => {
      this.hide();
    });

    // Create challenge
    this.element.querySelector('#createChallengeBtn')?.addEventListener('click', () => {
      this.createChallenge();
    });
  }

  /**
   * Show the challenge panel
   */
  show() {
    if (this.element) {
      this.element.style.display = 'block';
    }
  }

  /**
   * Hide the challenge panel
   */
  hide() {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  /**
   * Create a new challenge
   */
  createChallenge() {
    const gameId = this.element.querySelector('#challengeGame')?.value;
    const mode = this.element.querySelector('#challengeMode')?.value;
    const valueMode = this.element.querySelector('#challengeValue')?.value;
    const message = this.element.querySelector('#challengeMessage')?.value;

    const services = {
      text: this.element.querySelector('#challengeTextChat')?.checked || false,
      audio: this.element.querySelector('#challengeAudio')?.checked || false,
      video: this.element.querySelector('#challengeVideo')?.checked || false
    };

    if (!gameId) {
      alert('Please select a game');
      return;
    }

    const creator = `player_${Math.floor(Math.random() * 10000)}`;

    try {
      const challenge = this.competitionEngine.createChallenge({
        gameId,
        mode,
        creator,
        valueMode,
        services,
        metadata: {
          message: message || 'Friendly challenge'
        }
      });

      this.currentChallenge = challenge;
      console.log('[ChallengePanel] Challenge created:', challenge);
      this.emit('challenge:created', challenge);

      // Show success message
      alert(`Challenge created successfully! Challenge ID: ${challenge.id}`);

      // Hide panel
      this.hide();
    } catch (error) {
      console.error('[ChallengePanel] Failed to create challenge:', error);
      alert(`Failed to create challenge: ${error.message}`);
    }
  }

  /**
   * Event system
   */
  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  emit(event, data) {
    const handlers = this.eventListeners.get(event) || [];
    handlers.forEach(handler => handler(data));

    // Also emit as DOM event
    window.dispatchEvent(new CustomEvent(`challenge-panel:${event}`, {
      detail: data
    }));
  }
}

// Singleton instance
const challengePanel = new ChallengePanel();
export default challengePanel;