# Game Integration Contract

This document defines the standardized contract that all games in the Games-Centre must follow to ensure consistency across the platform.

## Required Files

Every game must include the following files in its directory:

### Core Files
- `index.html` - Main game entry point
- `main.js` - Game initialization and app bootstrap
- `styles.css` - Game-specific styles

### Core Modules (Required Structure)
- `core/`
  - `state-machine.js` - Game state management
  - `game-engine.js` - Core game logic and mechanics
  - `service-modes.js` - Service level definitions (A, B, C)

### Communication Modules (Conditional)
- `communication/`
  - `ws-client.js` - WebSocket client for multiplayer
  - `text-chat.js` - Text chat (Mode B/C)
  - `audio-chat.js` - Audio chat (Mode C)
  - `video-chat.js` - Video chat (Mode C)
  - `communication-manager.js` - Orchestrates all communication features

### UI Modules
- `ui/`
  - `lobby.js` - Lobby and game selection UI
  - `game-ui.js` - In-game UI management
  - `results-ui.js` - Results and post-game UI

### Shared Assets
- `assets/` - Game assets (images, sounds, etc.)
- `anti-manipulation/` - Anti-cheat and security measures

## Required Events

All games must emit and listen to these standardized events:

### Game State Events
- `game-state-change` - When game state transitions
- `game-start` - When game begins
- `game-end` - When game concludes
- `player-action` - When player performs an action

### Communication Events
- `chat-message` - Text chat messages
- `audio-stream-added` - Audio stream available
- `audio-stream-removed` - Audio stream disconnected
- `video-stream-added` - Video stream available
- `video-stream-removed` - Video stream disconnected

### Service Level Events
- `service-level-changed` - When service level is updated
- `communication-enabled` - When communication features are enabled
- `communication-disabled` - When communication features are disabled

## Required APIs

### Game Engine API
All games must implement these methods in their GameEngine class:

```javascript
class GameEngine {
    constructor(stateMachine, wsClient) { /* ... */ }
    
    // Required methods
    startGame(mode, serviceLevel) { /* ... */ }
    drawCard() { /* ... */ }
    determineWinner() { /* ... */ }
    
    // Optional methods (game-specific)
    // ... game-specific methods
}
```

### Communication Manager API
All games with communication features must implement:

```javascript
class CommunicationManager {
    constructor(wsClient, serviceLevel) { /* ... */ }
    
    // Required methods
    init() { /* ... */ }
    handleMessage(data) { /* ... */ }
    sendTextMessage(text) { /* ... */ }
    toggleAudioMute() { /* ... */ }
    toggleVideo() { /* ... */ }
    cleanup() { /* ... */ }
    getStatus() { /* ... */ }
}
```

### Service Modes API
All games must define service levels:

```javascript
export const ServiceModes = {
    A: {
        id: 'A',
        name: 'Basic',
        features: [],
        fee: 100,
        reward: 210
    },
    B: {
        id: 'B',
        name: 'Text Chat',
        features: ['chat'],
        fee: 500,
        reward: 1050
    },
    C: {
        id: 'C',
        name: 'Full Service',
        features: ['chat', 'audio', 'video'],
        fee: 1000,
        reward: 2100
    }
};
```

## Required Service Hooks

### Assets Bus Integration
All games must integrate with the Assets Bus for:
- Asset loading and management
- Reward distribution
- Service fee calculation
- Compliance verification

### Islamic Compliance Rules
All games must:
- Avoid interest-based mechanisms
- Ensure fair and transparent gameplay
- Implement proper asset handling
- Follow Sharia-compliant reward structures

### Service Level Enable/Disable Logic
All games must:
- Enable/disable features based on service level
- Gracefully handle permission denials
- Provide fallback UI when features are unavailable
- Maintain game functionality regardless of service level

## Game Modes

All games must support these modes:
- **Practice Mode** - Single player vs AI
- **AI Mode** - Single player vs computer
- **Multiplayer Mode** - Live player vs player

## Communication Features by Service Level

### Mode A (Basic)
- No communication features
- Basic game functionality only
- Service fee: 100c
- Reward: 210c

### Mode B (Text Chat)
- Text chat enabled
- Audio and video disabled
- Service fee: 500c
- Reward: 1050c

### Mode C (Full Service)
- Text chat enabled
- Audio chat enabled (WebRTC)
- Video chat enabled (WebRTC)
- Service fee: 1000c
- Reward: 2100c

## Implementation Guidelines

### File Structure
```
games/
├── game-name/
│   ├── index.html
│   ├── main.js
│   ├── styles.css
│   ├── core/
│   │   ├── state-machine.js
│   │   ├── game-engine.js
│   │   └── service-modes.js
│   ├── communication/
│   │   ├── ws-client.js
│   │   ├── text-chat.js
│   │   ├── audio-chat.js
│   │   ├── video-chat.js
│   │   └── communication-manager.js
│   ├── ui/
│   │   ├── lobby.js
│   │   ├── game-ui.js
│   │   └── results-ui.js
│   ├── assets/
│   └── anti-manipulation/
```

### Error Handling
- Graceful fallbacks for missing permissions
- Clear error messages for users
- Proper cleanup of resources
- State consistency maintenance

### Performance
- Efficient resource loading
- Minimal memory usage
- Smooth communication handling
- Responsive UI updates

### Security
- Input validation
- Anti-cheat measures
- Secure WebSocket connections
- Proper asset handling

## Validation Checklist

Before a game can be integrated:

- [ ] All required files are present
- [ ] Required events are implemented
- [ ] Required APIs are available
- [ ] Service hooks are integrated
- [ ] Islamic compliance is verified
- [ ] Service level logic works correctly
- [ ] Communication features work in Mode C
- [ ] Graceful fallbacks are implemented
- [ ] Performance is acceptable
- [ ] Security measures are in place

## Migration Guide

For existing games to adopt this contract:

1. **Phase 1**: Add required file structure
2. **Phase 2**: Implement required APIs
3. **Phase 3**: Add communication modules
4. **Phase 4**: Integrate service hooks
5. **Phase 5**: Test and validate

This contract ensures all games in the Games-Centre provide a consistent, high-quality experience while maintaining the flexibility for game-specific features.