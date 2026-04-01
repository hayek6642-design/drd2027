# Game Integration Guide

## Overview
This guide explains how to integrate your game with the Games Centre dashboard to enable score tracking, leaderboards, betting, and multiplayer features.

## Quick Start

### 1. Include the Integration Library

Add this to your game's HTML file:

```html
<script type="module" src="../_shared/game-integration.js"></script>
```

### 2. Notify When Game is Ready

In your game's JavaScript, after initialization:

```javascript
// Get game integration
const gameIntegration = window.gameIntegration;

// Notify dashboard the game is ready
if (gameIntegration) {
    gameIntegration.ready();
}
```

### 3. Notify When Game Ends

When the game ends, send the results:

```javascript
if (gameIntegration) {
    gameIntegration.gameOver({
        score: finalScore,        // The player's score
        won: playerWon            // true if player won, false otherwise
    });
}
```

## Complete Example

### Snake Game Pattern (Best Practice)

```javascript
// At the top of your game file
let gameIntegration = window.gameIntegration || null;

// ... your game code ...

function initialize() {
    // Setup game
    setupCanvas();
    resetGame();
    
    // Start game loop
    loop();
    
    // Notify dashboard game is ready
    if (gameIntegration) {
        gameIntegration.ready();
    }
}

function gameOver() {
    // Stop game loop
    stopLoop();
    
    // Display game over screen
    showGameOverScreen();
    
    // Report to dashboard
    if (gameIntegration) {
        gameIntegration.gameOver({ 
            score: currentScore, 
            won: currentScore > 0 
        });
    }
}

// Start the game
initialize();
```

## API Reference

### gameIntegration.ready()
Notify the dashboard that your game has loaded and is ready to play.

**When to call:** After game initialization is complete.

```javascript
gameIntegration.ready();
```

### gameIntegration.gameOver(result)
Notify the dashboard that the game has ended.

**When to call:** When the game ends (player loses, wins, or quits).

**Parameters:**
- `result.score` (number): The player's final score
- `result.won` (boolean): Whether the player won
- `result.rewardMultiplier` (number, optional): Multiplier for rewards (default: 1)

```javascript
gameIntegration.gameOver({ 
    score: 1500, 
    won: true,
    rewardMultiplier: 2.0  // Optional: 2x rewards
});
```

### gameIntegration.updateScore(score)
Send real-time score updates (optional).

**When to call:** During gameplay for live score tracking.

```javascript
// Update score in real-time
setInterval(() => {
    gameIntegration.updateScore(currentScore);
}, 1000); // Every second
```

### gameIntegration.trackFrame()
Notify the dashboard that a frame has been rendered (for FPS tracking).

**When to call:** In your game loop, once per frame.

```javascript
function gameLoop() {
    update();
    render();
    
    // Track frame for performance monitoring
    if (gameIntegration) {
        gameIntegration.trackFrame();
    }
    
    requestAnimationFrame(gameLoop);
}
```

### gameIntegration.getBetAmount()
Get the current bet amount (if betting is enabled).

**Returns:** Number representing the bet amount, or 0 if no bet.

```javascript
const betAmount = gameIntegration.getBetAmount();
if (betAmount > 0) {
    console.log('Playing for:', betAmount, 'tokens');
}
```

### gameIntegration.isEmbedded()
Check if the game is running inside the dashboard.

**Returns:** Boolean - true if embedded in dashboard, false if standalone.

```javascript
if (gameIntegration && gameIntegration.isEmbedded()) {
    // Running in dashboard - enable integration features
} else {
    // Running standalone - disable integration features
}
```

### gameIntegration.onPauseRequest(callback)
Handle pause requests from the dashboard.

```javascript
gameIntegration.onPauseRequest(() => {
    pauseGame();
});
```

### gameIntegration.onResumeRequest(callback)
Handle resume requests from the dashboard.

```javascript
gameIntegration.onResumeRequest(() => {
    resumeGame();
});
```

## Best Practices

### 1. Always Check if Integration is Available

```javascript
if (gameIntegration) {
    gameIntegration.ready();
}
```

This ensures your game works both standalone and in the dashboard.

### 2. Call ready() Only Once

Call `ready()` only after your game is fully initialized and playable.

```javascript
// ✅ Good
function initialize() {
    loadAssets();
    setupCanvas();
    startGame();
    gameIntegration?.ready(); // After everything is ready
}

// ❌ Bad
gameIntegration?.ready(); // Called before game is ready
loadAssets();
setupCanvas();
```

### 3. Always Call gameOver()

Every game session must end with a `gameOver()` call. This is critical for:
- Score tracking
- Leaderboard updates
- Bet settlement
- Session cleanup

```javascript
// ✅ Good - Always call gameOver
function endGame() {
    stopGame();
    gameIntegration?.gameOver({ score: finalScore, won: playerWon });
}

// ❌ Bad - Forgot to call gameOver
function endGame() {
    stopGame();
    // Missing gameOver() call!
}
```

### 4. Use requestAnimationFrame for Frame Tracking

For accurate FPS tracking:

```javascript
function gameLoop() {
    // Game logic
    update();
    render();
    
    // Track frame
    gameIntegration?.trackFrame();
    
    // Use requestAnimationFrame for smooth 60fps
    requestAnimationFrame(gameLoop);
}
```

### 5. Handle Standalone Mode Gracefully

Your game should work even without the integration:

```javascript
// Use optional chaining
gameIntegration?.ready();
gameIntegration?.gameOver({ score, won });

// Or with explicit checks
if (gameIntegration) {
    gameIntegration.ready();
}
```

## Common Patterns

### Canvas-Based Games

```javascript
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let score = 0;
let gameActive = false;

function startGame() {
    gameActive = true;
    score = 0;
    gameLoop();
    gameIntegration?.ready();
}

function gameLoop() {
    if (!gameActive) return;
    
    update();
    render(ctx);
    gameIntegration?.trackFrame();
    
    requestAnimationFrame(gameLoop);
}

function endGame(won) {
    gameActive = false;
    gameIntegration?.gameOver({ score, won });
}
```

### DOM-Based Games

```javascript
let score = 0;
let isPlaying = false;

function initialize() {
    setupEventListeners();
    resetBoard();
    isPlaying = true;
    gameIntegration?.ready();
}

function checkWinCondition() {
    if (hasWon()) {
        isPlaying = false;
        gameIntegration?.gameOver({ score, won: true });
    } else if (hasLost()) {
        isPlaying = false;
        gameIntegration?.gameOver({ score, won: false });
    }
}
```

### Turn-Based Games

```javascript
let moves = 0;
let gameEnded = false;

function startGame() {
    moves = 0;
    gameEnded = false;
    gameIntegration?.ready();
}

function makeMove() {
    if (gameEnded) return;
    
    // Process move
    moves++;
    
    // Check end condition
    if (isGameOver()) {
        gameEnded = true;
        const won = checkWinner() === 'player';
        gameIntegration?.gameOver({ score: moves, won });
    }
}
```

## Performance Optimization

### Use Frame Tracking for Performance Monitoring

```javascript
let frameCount = 0;
let lastFPSUpdate = Date.now();

function gameLoop() {
    update();
    render();
    
    // Track every frame
    gameIntegration?.trackFrame();
    frameCount++;
    
    // Log FPS every second (optional)
    const now = Date.now();
    if (now - lastFPSUpdate >= 1000) {
        console.log('FPS:', frameCount);
        frameCount = 0;
        lastFPSUpdate = now;
    }
    
    requestAnimationFrame(gameLoop);
}
```

### Optimize Score Updates

Don't update score every frame - batch updates:

```javascript
// ✅ Good - Update every second
setInterval(() => {
    gameIntegration?.updateScore(currentScore);
}, 1000);

// ❌ Bad - Update every frame (too frequent)
function gameLoop() {
    gameIntegration?.updateScore(currentScore); // Spamming updates
    requestAnimationFrame(gameLoop);
}
```

## Troubleshooting

### Game doesn't load in dashboard

1. Check console for errors
2. Verify path to game-integration.js is correct
3. Ensure game HTML includes the script tag
4. Check that gameIntegration.ready() is called

### Scores don't appear on leaderboard

1. Verify gameIntegration.gameOver() is called
2. Check that score value is a number
3. Ensure won parameter is a boolean
4. Check browser console for errors

### Performance issues

1. Use requestAnimationFrame instead of setInterval
2. Call trackFrame() once per frame
3. Don't call updateScore() too frequently
4. Optimize render logic

### Game works standalone but not in dashboard

1. Check for iframe-breaking code (e.g., top.location)
2. Verify CORS/CSP policies
3. Test in browser console: `window.gameIntegration`
4. Ensure game doesn't use absolute paths

## Testing Checklist

Before submitting your game:

- [ ] Game loads in dashboard without errors
- [ ] gameIntegration.ready() is called after initialization
- [ ] gameIntegration.gameOver() is called when game ends
- [ ] Score is tracked correctly
- [ ] Leaderboard updates with your scores
- [ ] Game works in standalone mode (without dashboard)
- [ ] No console errors
- [ ] Performance is smooth (>30 FPS)
- [ ] Back button returns to dashboard
- [ ] Game can be played multiple times

## Examples

See these games for reference implementations:
- `snake/snake.js` - Full integration with all features
- `tertis-classic/ter.js` - jQuery-based game integration

## Support

For questions or issues:
1. Check the AUDIT_REPORT.md for known issues
2. Review existing game implementations
3. Test in browser console
4. Check dashboard.js for integration handling

## Advanced Features

### Multiplayer Integration

```javascript
// Listen for opponent data
gameIntegration.onOpponentJoined((opponent) => {
    console.log('Opponent:', opponent.username);
});

// Send game state
gameIntegration.sendGameState({ position: playerPos });
```

### Betting Integration

```javascript
const betAmount = gameIntegration.getBetAmount();
if (betAmount > 0) {
    // Show bet amount in UI
    showBetDisplay(betAmount);
}
```

### Custom Reward Multipliers

```javascript
// Give bonus rewards for exceptional performance
const multiplier = score > 1000 ? 2.0 : 1.0;
gameIntegration.gameOver({ 
    score, 
    won: true, 
    rewardMultiplier: multiplier 
});
```

---

**Remember:** The integration layer is designed to be non-intrusive. Your game should always work standalone, with integration features being optional enhancements.
