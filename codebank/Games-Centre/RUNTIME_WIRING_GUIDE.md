# Runtime Integration - Wiring Guide

## 🔌 Complete End-to-End Flow

This document shows how to wire all pieces together in dashboard.js for a working game experience.

### Current State
- ✅ Core systems exist (betting, lobbies, matchmaking, etc.)
- ✅ Runtime loader created
- ✅ Transport layer created
- ✅ Session manager created
- ❌ NOT WIRED TOGETHER

### Required Changes to dashboard.js

#### 1. Add Imports at Top
```javascript
import { createGameRuntime } from './core/js/game-runtime-loader.js';
import { transport } from './core/js/transport.js';
import { sessionManager } from './core/js/session-manager.js';
import { bettingCore } from './core/js/betting-core.js';
import { lobbyManager } from './core/js/lobby-manager.js';
import { matchmaker } from './core/js/matchmaking.js';
```

#### 2. Initialize Session on Load
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // Create user session
    currentSession = sessionManager.createSession(currentUserId, currentUsername);
    
    // Initialize game runtime
    const gameContainer = document.getElementById('gameContainer');
    gameRuntime = createGameRuntime(gameContainer);
    
    // Setup runtime event handlers
    setupRuntimeEvents();
    
    //... rest of init
});
```

#### 3. Wire Runtime Events
```javascript
function setupRuntimeEvents() {
    // Game ready
    gameRuntime.on('game:ready', () => {
        console.log('Game ready');
        hideLoadingState();
    });
    
    // Game end
    gameRuntime.on('game:end', async (data) => {
        await handleGameEnd(data.result);
    });
    
    // Score updates
    gameRuntime.on('game:score', (data) => {
        updateScoreDisplay(data.score);
    });
}
```

#### 4. Wire Game Launch (Complete Flow)
```javascript
async function launchGame(game, betAmount = 0, gameMode = 'practice') {
    try {
        // 1. Load game in runtime
        showLoadingState();
        await gameRuntime.loadGame(game);
        
        // 2. Create game wrapper
        const gameFrame = document.getElementById('gameFrame');
        currentGameWrapper = new GameWrapper(gameFrame, game, currentUserId, {
            betAmount,
            gameMode
        });
        
        // 3. Bind to session
        const gameInstanceId = `game_${Date.now()}`;
        sessionManager.bindGame(currentSession.sessionId, game, gameInstanceId);
        
        // 4. Start game via wrapper (creates bet if needed)
        const startResult = await currentGameWrapper.startGame(betAmount, []);
        
        if (!startResult.success) {
            throw new Error(startResult.error);
        }
        
        // 5. Bind bet to session
        if (startResult.betId) {
            sessionManager.bindBet(currentSession.sessionId, startResult.betId);
        }
        
        // 6. Start runtime
        gameRuntime.startGame({
            bet: betAmount,
            gameMode,
            sessionId: currentSession.sessionId
        });
        
        // 7. Initialize chat
        if (!textChat) {
            textChat = new TextChat(game.id, currentUserId, currentUsername);
        }
        
        // 8. Show game container
        document.getElementById('dashboardView').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'flex';
        
    } catch (error) {
        console.error('Game launch failed:', error);
        showError(error.message);
    }
}
```

#### 5. Wire Game End (Complete Flow)
```javascript
async function handleGameEnd(result) {
    try {
        // 1. End via wrapper (processes bet)
        await currentGameWrapper.endGame(result);
        
        // 2. Update leaderboard
        leaderboard.updateScore(
            currentSession.currentGame.id,
            currentUserId,
            result.score || 0,
            currentUsername
        );
        
        // 3. Unbind from session
        sessionManager.unbindGame(currentSession.sessionId);
        
        //  4. Show results
        showGameResults(result);
        
    } catch (error) {
        console.error('Game end failed:', error);
    }
}
```

#### 6. Wire Chat (Complete Flow)
```javascript
function initChat(gameId) {
    if (!textChat) {
        textChat = new TextChat(gameId, currentUserId, currentUsername);
    }
    
    // Subscribe to transport
    transport.on('chat:message', (data) => {
        if (data.gameId === gameId) {
            displayChatMessage(data);
        }
    });
    
    // Send button
    document.getElementById('sendMessage').onclick = () => {
        const message = document.getElementById('chatInput').value;
        if (!message.trim()) return;
        
        // Send via chat
        textChat.sendMessage(message);
        
        // Also via transport for remote users
        transport.send('chat:message', {
            gameId,
            userId: currentUserId,
            username: currentUsername,
            message,
            timestamp: Date.now()
        });
        
        // Clear input
        document.getElementById('chatInput').value = '';
    };
}
```

#### 7. Wire Lobby Events
```javascript
function setupLobbyEvents(lobbyId) {
    transport.on('lobby:player-joined', (data) => {
        if (data.lobbyId === lobbyId) {
            updateLobbyPlayerList(data);
        }
    });
    
    transport.on('lobby:ready', (data) => {
        if (data.lobbyId === lobbyId) {
            enableStartButton();
        }
    });
    
    transport.on('lobby:game-starting', (data) => {
        if (data.lobbyId === lobbyId) {
            const lobby = lobbyManager.getLobby(lobbyId);
            launchMultiplayerGame(lobby);
        }
    });
}
```

#### 8. Wire Balance Updates
```javascript
async function updateBalanceDisplay() {
    const codeBalance = await assetsBus.getBalance(currentUserId, 'code');
    const barsBalance = await assetsBus.getBalance(currentUserId, 'bars');
    
    document.getElementById('codesBalance').textContent = codeBalance.toLocaleString();
    document.getElementById('barsBalance').textContent = barsBalance.toLocaleString();
}

// Update after bet settlement
window.addEventListener('bet-completed', async () => {
    await updateBalanceDisplay();
});
```

---

## 🎯 Key Wiring Points

### UI → Core
```
Button Click
  ↓
Event Handler
  ↓
Session Manager (bind)
  ↓
Core System (lobby/betting/etc)
  ↓
Transport (notify others)
```

### Core → UI
```
Core Event (bet-completed, etc)
  ↓
Event Listener
  ↓
Update UI Display
  ↓
Update Session State
```

### Game → Dashboard
```
Game iframe
  ↓
postMessage (GAME_OVER)
  ↓
Game Runtime Loader
  ↓
Game Wrapper (process bet)
  ↓
Betting Core (settle)
  ↓
Assets Bus (update balances)
```

---

## ✅ Minimal Working Example

Add to dashboard.js after all the setup code:

```javascript
// TESTING: Quick launch function
window.quickLaunchSnake = async () => {
    const snakeGame = allGames.find(g => g.id === 'snake');
    if (snakeGame) {
        await launchGame(snakeGame, 0, 'practice');
    }
};

// Run in console: quickLaunchSnake()
```

---

## 🧪 Test Checklist

After wiring:
- [ ] Click game card → Game loads
- [ ] Game displays in iframe
- [ ] Score updates in real-time
- [ ] Game over → Returns to dashboard
- [ ] Chat message → Appears in chat
- [ ] Balance updates after bet settled
- [ ] Lobby shows other players
- [ ] Session persists across page nav

---

## 🚨 Common Issues

1. **Game doesn't load**
   - Check gameFrame exists
   - Check game URL is correct
   - Check iframe sandbox permissions

2. **Chat doesn't work**
   - Check transport is connected
   - Check BroadcastChannel browser support
   - Check event listeners are set up

3. **Balance doesn't update**
   - Check Assets Bus is connected
   - Check bet completion events fire
   - Check balance display function is called

4. **Session lost on refresh**
   - Currently expected (no persistence)
   - Add localStorage session recovery if needed

---

## 📋 Implementation Order

1. ✅ Add imports
2. ✅ Initialize session
3. ✅ Initialize runtime
4. ✅ Wire game launch
5. ✅ Wire game end
6. ⏳ Wire chat
7. ⏳ Wire balance display
8. ⏳ Wire lobby events
9. ⏳ Test end-to-end

Current: Need to update dashboard.js with these changes
