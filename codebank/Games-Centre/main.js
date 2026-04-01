/**
 * Games-Centre Main Entry Point
 * Demonstrates the complete system integration
 */

// Main initialization function
async function initializeGamesCentre() {
  console.log('[GamesCentre] Starting initialization...');

  try {
    // Import the runtime bridge
    const YTRuntimeBridge = (await import('./integrations/yt-runtime-bridge.js')).default;
    const bridge = new YTRuntimeBridge();

    // Initialize the bridge (which initializes the entire system)
    await bridge.init();

    console.log('[GamesCentre] System initialized successfully');

    // Get the game engine
    const gameEngine = bridge.getGameEngine();

    // Get other components
    const gameRegistry = bridge.getGameRegistry();
    const modeRegistry = bridge.getModeRegistry();
    const competitionEngine = bridge.getCompetitionEngine();
    const serviceEngine = bridge.getServiceEngine();
    const stateAuthority = bridge.getStateAuthority();

    // Log system status
    console.log('[GamesCentre] System Status:');
    console.log(`- Games Registered: ${gameRegistry.getAllGames().length}`);
    console.log(`- Modes Registered: ${modeRegistry.getAllModes().length}`);
    console.log(`- Current State: ${stateAuthority.getCurrentState()}`);

    // Initialize UI components
    await initializeUI(gameEngine);

    // Run test suite
    await runTestSuite();

    console.log('[GamesCentre] Ready for gameplay!');

    // Return the initialized system
    return {
      gameEngine,
      gameRegistry,
      modeRegistry,
      competitionEngine,
      serviceEngine,
      stateAuthority,
      bridge
    };

  } catch (error) {
    console.error('[GamesCentre] Initialization failed:', error);
    throw error;
  }
}

/**
 * Initialize UI components
 */
async function initializeUI(gameEngine) {
  console.log('[GamesCentre] Initializing UI components...');

  try {
    // Import UI components
    const GamesDashboard = (await import('./ui/games-dashboard.js')).default;
    const ModeSelector = (await import('./ui/mode-selector.js')).default;
    const ServiceSelector = (await import('./ui/service-selector.js')).default;
    const ChallengePanel = (await import('./ui/challenge-panel.js')).default;
    const GameLoader = (await import('./ui/game-loader.js')).default;

    // Create UI elements
    const dashboardElement = document.createElement('div');
    dashboardElement.id = 'gamesDashboard';
    document.body.appendChild(dashboardElement);

    const modeSelectorElement = document.createElement('div');
    modeSelectorElement.id = 'modeSelector';
    document.body.appendChild(modeSelectorElement);

    const serviceSelectorElement = document.createElement('div');
    serviceSelectorElement.id = 'serviceSelector';
    document.body.appendChild(serviceSelectorElement);

    const challengePanelElement = document.createElement('div');
    challengePanelElement.id = 'challengePanel';
    document.body.appendChild(challengePanelElement);

    const gameLoaderElement = document.createElement('div');
    gameLoaderElement.id = 'gameLoader';
    document.body.appendChild(gameLoaderElement);

    // Initialize UI components
    const dashboard = new GamesDashboard();
    dashboard.init('gamesDashboard', gameEngine);

    const modeSelector = new ModeSelector();
    modeSelector.init('modeSelector', gameEngine.modeRegistry);

    const serviceSelector = new ServiceSelector();
    serviceSelector.init('serviceSelector', gameEngine.serviceEngine);

    const challengePanel = new ChallengePanel();
    challengePanel.init('challengePanel', gameEngine.competitionEngine, gameEngine.gameRegistry);

    const gameLoader = new GameLoader();
    gameLoader.init('gameLoader', gameEngine);

    // Set up UI event listeners
    setupUIEventListeners(dashboard, modeSelector, serviceSelector, challengePanel, gameLoader);

    console.log('[GamesCentre] UI components initialized');

  } catch (error) {
    console.error('[GamesCentre] UI initialization failed:', error);
    throw error;
  }
}

/**
 * Set up UI event listeners
 */
function setupUIEventListeners(dashboard, modeSelector, serviceSelector, challengePanel, gameLoader) {
  // Dashboard events
  dashboard.on('game:started', (session) => {
    console.log('[GamesCentre] Game started from dashboard:', session);
    gameLoader.loadGame(session.gameId, session.modeId, session.config);
  });

  dashboard.on('show-challenge-creation', () => {
    challengePanel.show();
  });

  // Challenge panel events
  challengePanel.on('challenge:created', (challenge) => {
    console.log('[GamesCentre] Challenge created:', challenge);
    dashboard.loadChallenges();
  });

  // Game loader events
  gameLoader.on('back-to-dashboard', () => {
    dashboard.element.style.display = 'block';
    gameLoader.element.style.display = 'none';
  });

  console.log('[GamesCentre] UI event listeners set up');
}

/**
 * Run test suite
 */
async function runTestSuite() {
  console.log('[GamesCentre] Running test suite...');

  try {
    const TestSuite = (await import('./test-suite.js')).default;
    const testSuite = new TestSuite();

    const results = await testSuite.runAllTests();

    if (results.failed === 0) {
      console.log('[GamesCentre] ✅ All tests passed!');
    } else {
      console.log(`[GamesCentre] ⚠️  Some tests failed: ${results.failed}/${results.total}`);
    }

    return results;
  } catch (error) {
    console.error('[GamesCentre] Test suite failed:', error);
    throw error;
  }
}

/**
 * Demonstrate system capabilities
 */
async function demonstrateSystem(gameEngine) {
  console.log('[GamesCentre] Demonstrating system capabilities...');

  try {
    // Demonstrate game registration
    console.log('[GamesCentre] Demonstrating game registration...');
    const games = gameEngine.gameRegistry.getAllGames();
    console.log(`[GamesCentre] Registered games: ${games.map(g => g.gameId).join(', ')}`);

    // Demonstrate mode registration
    console.log('[GamesCentre] Demonstrating mode registration...');
    const modes = gameEngine.modeRegistry.getAllModes();
    console.log(`[GamesCentre] Registered modes: ${modes.map(m => m.modeId).join(', ')}`);

    // Demonstrate challenge creation
    console.log('[GamesCentre] Demonstrating challenge creation...');
    const challenge = gameEngine.competitionEngine.createChallenge({
      gameId: 'snake',
      mode: 'multiplayer',
      creator: 'demo_player',
      valueMode: 'zero-value',
      services: {
        text: true,
        audio: false,
        video: false
      }
    });

    console.log(`[GamesCentre] Challenge created: ${challenge.id}`);

    // Demonstrate service enabling
    console.log('[GamesCentre] Demonstrating service management...');
    gameEngine.serviceEngine.enable({
      text: true,
      audio: true,
      video: false
    });

    console.log('[GamesCentre] Services enabled: text, audio');

    // Demonstrate state management
    console.log('[GamesCentre] Demonstrating state management...');
    const stateAuthority = gameEngine.stateAuthority;
    stateAuthority.transitionTo('LOADING');
    stateAuthority.transitionTo('READY');
    stateAuthority.transitionTo('RUNNING');

    console.log(`[GamesCentre] Current state: ${stateAuthority.getCurrentState()}`);

    console.log('[GamesCentre] System demonstration complete');

  } catch (error) {
    console.error('[GamesCentre] System demonstration failed:', error);
    throw error;
  }
}

// Export main function
export async function startGamesCentre() {
  try {
    // Initialize the system
    const system = await initializeGamesCentre();

    // Demonstrate system capabilities
    await demonstrateSystem(system.gameEngine);

    console.log('[GamesCentre] 🎮 Games-Centre is ready!');

    // Return the initialized system for external use
    return system;
  } catch (error) {
    console.error('[GamesCentre] Failed to start Games-Centre:', error);
    throw error;
  }
}

// Auto-start if running in browser
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    try {
      // Add some basic styling for the demo
      const style = document.createElement('style');
      style.textContent = `
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
        }

        .games-dashboard, .game-loader {
          max-width: 1200px;
          margin: 0 auto;
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .game-card, .challenge-card {
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 15px;
          margin-bottom: 15px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .btn {
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 8px;
        }

        .btn-primary {
          background-color: #2196F3;
        }

        .btn-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          position: absolute;
          right: 10px;
          top: 10px;
        }

        .game-iframe {
          width: 100%;
          height: 500px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .hidden {
          display: none !important;
        }
      `;
      document.head.appendChild(style);

      // Start the Games-Centre
      const gamesCentre = await startGamesCentre();

      // Expose to window for debugging
      window.GamesCentre = gamesCentre;

      console.log('[GamesCentre] System ready and exposed as window.GamesCentre');

    } catch (error) {
      console.error('[GamesCentre] Auto-start failed:', error);

      // Show error to user
      const errorElement = document.createElement('div');
      errorElement.style.position = 'fixed';
      errorElement.style.top = '0';
      errorElement.style.left = '0';
      errorElement.style.right = '0';
      errorElement.style.backgroundColor = '#ffebee';
      errorElement.style.color = '#c62828';
      errorElement.style.padding = '15px';
      errorElement.style.textAlign = 'center';
      errorElement.style.zIndex = '1000';
      errorElement.textContent = `Failed to start Games-Centre: ${error.message}`;
      document.body.appendChild(errorElement);
    }
  });
}

// Export for module usage
export default {
  startGamesCentre,
  initializeGamesCentre,
  runTestSuite,
  demonstrateSystem
};