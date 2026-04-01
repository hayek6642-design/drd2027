/**
 * Games-Centre Test Suite
 * Comprehensive testing for all components and features
 */

class GamesCentreTestSuite {
  constructor() {
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
    this.gameEngine = null;
    this.testStartTime = null;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('[TestSuite] Starting comprehensive test suite...');
    this.testStartTime = Date.now();

    try {
      // Initialize the system
      await this.initializeSystem();

      // Run core component tests
      await this.testGameEngine();
      await this.testGameRegistry();
      await this.testModeRegistry();
      await this.testCompetitionEngine();
      await this.testServiceEngine();
      await this.testStateAuthority();

      // Run game mode tests
      await this.testGameModes();

      // Run service tests
      await this.testServices();

      // Run integration tests
      await this.testIntegration();

      // Run UI component tests
      await this.testUIComponents();

      // Run game contract tests
      await this.testGameContracts();

      // Run challenge system tests
      await this.testChallengeSystem();

      // Run error handling tests
      await this.testErrorHandling();

      // Run state recovery tests
      await this.testStateRecovery();

      // Print final results
      this.printTestResults();

      console.log('[TestSuite] Test suite completed');
      return this.testResults;
    } catch (error) {
      console.error('[TestSuite] Test suite failed:', error);
      this.testResults.errors.push({
        test: 'Test Suite Execution',
        error: error.message,
        stack: error.stack
      });
      this.testResults.failed++;
      this.testResults.total++;

      this.printTestResults();
      return this.testResults;
    }
  }

  /**
   * Initialize the system for testing
   */
  async initializeSystem() {
    console.log('[TestSuite] Initializing system...');

    try {
      // Import and initialize the runtime bridge
      const YTRuntimeBridge = (await import('./integrations/yt-runtime-bridge.js')).default;
      const bridge = new YTRuntimeBridge();
      await bridge.init();

      this.gameEngine = bridge.getGameEngine();
      console.log('[TestSuite] System initialized successfully');
      this.logTestResult('System Initialization', true);
    } catch (error) {
      console.error('[TestSuite] System initialization failed:', error);
      this.logTestResult('System Initialization', false, error.message);
      throw error;
    }
  }

  /**
   * Test Game Engine
   */
  async testGameEngine() {
    console.log('[TestSuite] Testing Game Engine...');

    try {
      // Test engine initialization
      if (!this.gameEngine) {
        throw new Error('Game engine not initialized');
      }

      // Test engine properties
      if (!this.gameEngine.gameRegistry) {
        throw new Error('Game registry not available');
      }

      if (!this.gameEngine.modeRegistry) {
        throw new Error('Mode registry not available');
      }

      if (!this.gameEngine.competitionEngine) {
        throw new Error('Competition engine not available');
      }

      if (!this.gameEngine.serviceEngine) {
        throw new Error('Service engine not available');
      }

      if (!this.gameEngine.stateAuthority) {
        throw new Error('State authority not available');
      }

      console.log('[TestSuite] Game Engine tests passed');
      this.logTestResult('Game Engine', true);
    } catch (error) {
      console.error('[TestSuite] Game Engine test failed:', error);
      this.logTestResult('Game Engine', false, error.message);
    }
  }

  /**
   * Test Game Registry
   */
  async testGameRegistry() {
    console.log('[TestSuite] Testing Game Registry...');

    try {
      const registry = this.gameEngine.gameRegistry;

      // Test initial state
      const initialGames = registry.getAllGames();
      if (initialGames.length === 0) {
        throw new Error('No games registered initially');
      }

      // Test game registration
      const testGame = {
        init: () => Promise.resolve(),
        start: () => Promise.resolve(),
        onAction: () => {},
        onFinish: () => {},
        destroy: () => {}
      };

      registry.register('test-game', testGame, {
        title: 'Test Game',
        category: 'test',
        description: 'A test game'
      });

      // Verify registration
      const registeredGame = registry.getGame('test-game');
      if (!registeredGame) {
        throw new Error('Test game not registered');
      }

      const metadata = registry.getMetadata('test-game');
      if (metadata.title !== 'Test Game') {
        throw new Error('Game metadata incorrect');
      }

      // Test unregistration
      registry.unregister('test-game');
      if (registry.hasGame('test-game')) {
        throw new Error('Test game not unregistered');
      }

      console.log('[TestSuite] Game Registry tests passed');
      this.logTestResult('Game Registry', true);
    } catch (error) {
      console.error('[TestSuite] Game Registry test failed:', error);
      this.logTestResult('Game Registry', false, error.message);
    }
  }

  /**
   * Test Mode Registry
   */
  async testModeRegistry() {
    console.log('[TestSuite] Testing Mode Registry...');

    try {
      const registry = this.gameEngine.modeRegistry;

      // Test initial state
      const initialModes = registry.getAllModes();
      if (initialModes.length === 0) {
        throw new Error('No modes registered initially');
      }

      // Test mode registration
      const testMode = {
        start: () => Promise.resolve(),
        handleAction: () => {},
        end: () => {}
      };

      registry.register('test-mode', testMode, {
        title: 'Test Mode',
        description: 'A test mode'
      });

      // Verify registration
      const registeredMode = registry.getMode('test-mode');
      if (!registeredMode) {
        throw new Error('Test mode not registered');
      }

      const metadata = registry.getMetadata('test-mode');
      if (metadata.title !== 'Test Mode') {
        throw new Error('Mode metadata incorrect');
      }

      // Test unregistration
      registry.unregister('test-mode');
      if (registry.hasMode('test-mode')) {
        throw new Error('Test mode not unregistered');
      }

      console.log('[TestSuite] Mode Registry tests passed');
      this.logTestResult('Mode Registry', true);
    } catch (error) {
      console.error('[TestSuite] Mode Registry test failed:', error);
      this.logTestResult('Mode Registry', false, error.message);
    }
  }

  /**
   * Test Competition Engine
   */
  async testCompetitionEngine() {
    console.log('[TestSuite] Testing Competition Engine...');

    try {
      const engine = this.gameEngine.competitionEngine;

      // Test challenge creation
      const challenge = engine.createChallenge({
        gameId: 'snake',
        mode: 'multiplayer',
        creator: 'test_player_1',
        valueMode: 'zero-value'
      });

      if (!challenge || !challenge.id) {
        throw new Error('Challenge not created properly');
      }

      // Test challenge acceptance
      const acceptedChallenge = engine.acceptChallenge(challenge.id, 'test_player_2');
      if (acceptedChallenge.status !== 'WAITING') {
        throw new Error('Challenge not accepted properly');
      }

      // Test challenge cancellation
      const cancelledChallenge = engine.cancelChallenge(challenge.id, 'Test cancellation');
      if (cancelledChallenge.status !== 'CANCELLED') {
        throw new Error('Challenge not cancelled properly');
      }

      console.log('[TestSuite] Competition Engine tests passed');
      this.logTestResult('Competition Engine', true);
    } catch (error) {
      console.error('[TestSuite] Competition Engine test failed:', error);
      this.logTestResult('Competition Engine', false, error.message);
    }
  }

  /**
   * Test Service Engine
   */
  async testServiceEngine() {
    console.log('[TestSuite] Testing Service Engine...');

    try {
      const engine = this.gameEngine.serviceEngine;

      // Test service enabling
      engine.enable({
        text: true,
        audio: false,
        video: false
      });

      if (!engine.isServiceActive('text')) {
        throw new Error('Text service not enabled');
      }

      if (engine.isServiceActive('audio')) {
        throw new Error('Audio service should not be enabled');
      }

      // Test service disabling
      engine.disableAll();
      if (engine.isServiceActive('text')) {
        throw new Error('Text service not disabled');
      }

      console.log('[TestSuite] Service Engine tests passed');
      this.logTestResult('Service Engine', true);
    } catch (error) {
      console.error('[TestSuite] Service Engine test failed:', error);
      this.logTestResult('Service Engine', false, error.message);
    }
  }

  /**
   * Test State Authority
   */
  async testStateAuthority() {
    console.log('[TestSuite] Testing State Authority...');

    try {
      const authority = this.gameEngine.stateAuthority;

      // Test initial state
      if (authority.getCurrentState() !== 'IDLE') {
        throw new Error('Initial state should be IDLE');
      }

      // Test state transitions
      authority.transitionTo('LOADING');
      if (authority.getCurrentState() !== 'LOADING') {
        throw new Error('State transition to LOADING failed');
      }

      authority.transitionTo('READY');
      if (authority.getCurrentState() !== 'READY') {
        throw new Error('State transition to READY failed');
      }

      // Test state history
      const history = authority.getStateHistory();
      if (history.length < 2) {
        throw new Error('State history not recorded properly');
      }

      // Test error handling
      authority.handleError(new Error('Test error'));
      if (authority.getCurrentState() !== 'ERROR') {
        throw new Error('Error state not set');
      }

      // Test reset
      authority.reset();
      if (authority.getCurrentState() !== 'IDLE') {
        throw new Error('Reset failed');
      }

      console.log('[TestSuite] State Authority tests passed');
      this.logTestResult('State Authority', true);
    } catch (error) {
      console.error('[TestSuite] State Authority test failed:', error);
      this.logTestResult('State Authority', false, error.message);
    }
  }

  /**
   * Test Game Modes
   */
  async testGameModes() {
    console.log('[TestSuite] Testing Game Modes...');

    try {
      const registry = this.gameEngine.modeRegistry;

      // Test single player mode
      const singlePlayerMode = registry.getMode('single-player');
      if (!singlePlayerMode) {
        throw new Error('Single player mode not found');
      }

      // Test VS computer mode
      const vsComputerMode = registry.getMode('vs-computer');
      if (!vsComputerMode) {
        throw new Error('VS computer mode not found');
      }

      // Test multiplayer mode
      const multiplayerMode = registry.getMode('multiplayer');
      if (!multiplayerMode) {
        throw new Error('Multiplayer mode not found');
      }

      console.log('[TestSuite] Game Modes tests passed');
      this.logTestResult('Game Modes', true);
    } catch (error) {
      console.error('[TestSuite] Game Modes test failed:', error);
      this.logTestResult('Game Modes', false, error.message);
    }
  }

  /**
   * Test Services
   */
  async testServices() {
    console.log('[TestSuite] Testing Services...');

    try {
      // Test text chat service
      const TextChatService = (await import('./services/text-chat/chat.js')).default;
      const textChat = new TextChatService();

      textChat.connect('test-game', 'test-player', 'TestPlayer');
      if (!textChat.isConnected()) {
        throw new Error('Text chat connection failed');
      }

      const message = textChat.sendMessage('Test message');
      if (message.text !== 'Test message') {
        throw new Error('Text chat message not sent properly');
      }

      textChat.disconnect();
      if (textChat.isConnected()) {
        throw new Error('Text chat disconnection failed');
      }

      console.log('[TestSuite] Services tests passed');
      this.logTestResult('Services', true);
    } catch (error) {
      console.error('[TestSuite] Services test failed:', error);
      this.logTestResult('Services', false, error.message);
    }
  }

  /**
   * Test Integration
   */
  async testIntegration() {
    console.log('[TestSuite] Testing Integration...');

    try {
      // Test game engine integration
      const games = this.gameEngine.gameRegistry.getAllGames();
      if (games.length === 0) {
        throw new Error('No games available for integration test');
      }

      // Test mode integration
      const modes = this.gameEngine.modeRegistry.getAllModes();
      if (modes.length === 0) {
        throw new Error('No modes available for integration test');
      }

      // Test service integration
      const services = this.gameEngine.serviceEngine;
      if (!services) {
        throw new Error('Services not available for integration test');
      }

      console.log('[TestSuite] Integration tests passed');
      this.logTestResult('Integration', true);
    } catch (error) {
      console.error('[TestSuite] Integration test failed:', error);
      this.logTestResult('Integration', false, error.message);
    }
  }

  /**
   * Test UI Components
   */
  async testUIComponents() {
    console.log('[TestSuite] Testing UI Components...');

    try {
      // Test dashboard creation
      const GamesDashboard = (await import('./ui/games-dashboard.js')).default;
      const dashboard = new GamesDashboard();

      // Create a test element
      const testElement = document.createElement('div');
      testElement.id = 'testDashboard';
      document.body.appendChild(testElement);

      // Initialize dashboard
      dashboard.init('testDashboard', this.gameEngine);

      // Clean up
      document.body.removeChild(testElement);

      console.log('[TestSuite] UI Components tests passed');
      this.logTestResult('UI Components', true);
    } catch (error) {
      console.error('[TestSuite] UI Components test failed:', error);
      this.logTestResult('UI Components', false, error.message);
    }
  }

  /**
   * Test Game Contracts
   */
  async testGameContracts() {
    console.log('[TestSuite] Testing Game Contracts...');

    try {
      // Test Snake game contract
      const SnakeGame = (await import('./games/snake/game.js')).default;

      // Verify contract methods
      const requiredMethods = ['init', 'start', 'onAction', 'onFinish', 'destroy'];
      for (const method of requiredMethods) {
        if (typeof SnakeGame[method] !== 'function') {
          throw new Error(`Game contract missing method: ${method}`);
        }
      }

      // Test game initialization
      await SnakeGame.init({ mode: 'single-player' });

      // Test game start
      await SnakeGame.start();

      // Test game action
      SnakeGame.onAction({ type: 'KEY_PRESS', key: 'ArrowRight' });

      // Test game finish
      SnakeGame.onFinish({ status: 'COMPLETED' });

      // Test game destruction
      SnakeGame.destroy();

      console.log('[TestSuite] Game Contracts tests passed');
      this.logTestResult('Game Contracts', true);
    } catch (error) {
      console.error('[TestSuite] Game Contracts test failed:', error);
      this.logTestResult('Game Contracts', false, error.message);
    }
  }

  /**
   * Test Challenge System
   */
  async testChallengeSystem() {
    console.log('[TestSuite] Testing Challenge System...');

    try {
      const engine = this.gameEngine.competitionEngine;

      // Create a challenge
      const challenge = engine.createChallenge({
        gameId: 'snake',
        mode: 'multiplayer',
        creator: 'challenge_creator',
        valueMode: 'zero-value',
        services: {
          text: true,
          audio: false,
          video: false
        }
      });

      // Verify challenge creation
      const retrievedChallenge = engine.getChallenge(challenge.id);
      if (!retrievedChallenge) {
        throw new Error('Challenge not found after creation');
      }

      // Test challenge acceptance
      const accepted = engine.acceptChallenge(challenge.id, 'challenge_acceptor');
      if (accepted.status !== 'WAITING') {
        throw new Error('Challenge acceptance failed');
      }

      // Test getting active challenges
      const activeChallenges = engine.getActiveChallenges();
      if (activeChallenges.length === 0) {
        throw new Error('No active challenges found');
      }

      // Test challenge cancellation
      const cancelled = engine.cancelChallenge(challenge.id, 'Test cancellation');
      if (cancelled.status !== 'CANCELLED') {
        throw new Error('Challenge cancellation failed');
      }

      console.log('[TestSuite] Challenge System tests passed');
      this.logTestResult('Challenge System', true);
    } catch (error) {
      console.error('[TestSuite] Challenge System test failed:', error);
      this.logTestResult('Challenge System', false, error.message);
    }
  }

  /**
   * Test Error Handling
   */
  async testErrorHandling() {
    console.log('[TestSuite] Testing Error Handling...');

    try {
      // Test invalid game start
      try {
        await this.gameEngine.startGame('non-existent-game', 'single-player');
        throw new Error('Should have thrown error for non-existent game');
      } catch (error) {
        // This is expected
      }

      // Test invalid mode
      try {
        await this.gameEngine.startGame('snake', 'non-existent-mode');
        throw new Error('Should have thrown error for non-existent mode');
      } catch (error) {
        // This is expected
      }

      // Test state authority error handling
      const authority = this.gameEngine.stateAuthority;
      authority.handleError(new Error('Test error for handling'));

      console.log('[TestSuite] Error Handling tests passed');
      this.logTestResult('Error Handling', true);
    } catch (error) {
      console.error('[TestSuite] Error Handling test failed:', error);
      this.logTestResult('Error Handling', false, error.message);
    }
  }

  /**
   * Test State Recovery
   */
  async testStateRecovery() {
    console.log('[TestSuite] Testing State Recovery...');

    try {
      const authority = this.gameEngine.stateAuthority;

      // Test state history tracking
      authority.transitionTo('LOADING');
      authority.transitionTo('READY');
      authority.transitionTo('RUNNING');

      const history = authority.getStateHistory();
      if (history.length < 3) {
        throw new Error('State history not tracked properly');
      }

      // Test state recovery from error
      authority.handleError(new Error('Test error'));
      if (authority.getCurrentState() !== 'ERROR') {
        throw new Error('Error state not set');
      }

      // Verify recovery attempt
      let recoveryAttempted = false;
      authority.on('state:recovery-attempt', () => {
        recoveryAttempted = true;
      });

      // Wait for recovery attempt
      await new Promise(resolve => setTimeout(resolve, 6000));

      if (!recoveryAttempted) {
        throw new Error('Recovery attempt not triggered');
      }

      console.log('[TestSuite] State Recovery tests passed');
      this.logTestResult('State Recovery', true);
    } catch (error) {
      console.error('[TestSuite] State Recovery test failed:', error);
      this.logTestResult('State Recovery', false, error.message);
    }
  }

  /**
   * Log test result
   */
  logTestResult(testName, passed, errorMessage = '') {
    this.testResults.total++;

    if (passed) {
      this.testResults.passed++;
      console.log(`[TestSuite] ✅ ${testName} - PASSED`);
    } else {
      this.testResults.failed++;
      console.log(`[TestSuite] ❌ ${testName} - FAILED`);
      this.testResults.errors.push({
        test: testName,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Print test results
   */
  printTestResults() {
    const duration = ((Date.now() - this.testStartTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(50));
    console.log('GAMES-CENTRE TEST SUITE RESULTS');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`Passed: ${this.testResults.passed}`);
    console.log(`Failed: ${this.testResults.failed}`);
    console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(2)}%`);
    console.log(`Duration: ${duration} seconds`);
    console.log('='.repeat(50));

    if (this.testResults.errors.length > 0) {
      console.log('\nERRORS:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.test}: ${error.error}`);
      });
    }

    console.log('\n' + '='.repeat(50));
  }
}

// Singleton instance
const testSuite = new GamesCentreTestSuite();
export default testSuite;