import { StateMachine } from './core/state-machine.js';
import { GameEngine } from './core/game-engine.js';
import { LobbyUI } from './ui/lobby.js';
import { GameUI } from './ui/game-ui.js';
import { ResultsUI } from './ui/results-ui.js';
import { WebSocketClient } from './communication/ws-client.js';
import { CommunicationManager } from './communication/communication-manager.js';

class App {
    constructor() {
        console.log("App Constructing...");
        this.stateMachine = new StateMachine();
        this.wsClient = new WebSocketClient();
        
        // Initialize Core Engines
        this.gameEngine = new GameEngine(this.stateMachine, this.wsClient);
        
        // Initialize UI Modules (Ensure DOM exists)
        document.addEventListener('DOMContentLoaded', () => {
            this.lobbyUI = new LobbyUI(this);
            this.gameUI = new GameUI(this);
            this.resultsUI = new ResultsUI(this);
            this.init();
        });
    }

    async init() {
        console.log("System Initializing...");
        this.wsClient.connect();
        
        // Initial State
        setTimeout(() => {
            this.stateMachine.transition('LOBBY');
        }, 1500);
        
        // Global state listener
        this.stateMachine.subscribe((state) => {
            console.log(`State Changed: ${state}`);
            this.updateView(state);
        });
    }

    updateView(state) {
        console.log(`Updating view for state: ${state}`);
        // Simple router logic
        document.querySelectorAll('.screen').forEach(el => {
            el.classList.remove('active');
        });

        const screenMap = {
            'INIT': 'loading-screen',
            'LOBBY': 'lobby-screen',
            'READY': 'game-screen',
            'RUNNING': 'game-screen',
            'PAUSED': 'game-screen',
            'COMPLETED': 'results-screen'
        };

        const activeId = screenMap[state];
        if (activeId) {
            const screen = document.getElementById(activeId);
            if (screen) {
                screen.classList.add('active');
                console.log(`Screen ${activeId} is now active`);
                
                // Re-bind game events if entering game screen
                if (activeId === 'game-screen') {
                    this.gameUI.bindEvents();
                }
            }
        }

        // Handle specific UI logic for game running
        if (state === 'RUNNING' || state === 'READY') {
            const isChatMode = this.lobbyUI.serviceLevel === 'B' || this.lobbyUI.serviceLevel === 'C';
            document.getElementById('chat-panel').classList.toggle('hidden', !isChatMode);
        }

        if (state === 'COMPLETED') {
            this.resultsUI.update();
        }
    }
}

// Global Boot
window.app = new App();