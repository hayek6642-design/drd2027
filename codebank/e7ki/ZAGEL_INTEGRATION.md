# 🕊️ Zagel Integration into E7ki

## Overview
Zagel is a child girl voice assistant character integrated into E7ki. She speaks with slang Arabic, uses a childish lisp (س → ث), and maintains memory of user interactions.

## File Structure
```
codebank/e7ki/
├── zagel/
│   ├── zagel-core.js         # Main orchestrator
│   ├── zagel-voice.js        # Personality & slang phrases
│   ├── zagel-ai.js           # Gemini API integration
│   ├── zagel-intent.js       # Fast regex pattern matching
│   ├── zagel-ui.js           # Pigeon animation & UI
│   ├── zagel-memory.js       # Relationship & mood tracking
│   └── zagel-styles.css      # UI styling
├── zagel-loader.js           # Entry point (loads all modules)
└── ZAGEL_INTEGRATION.md      # This file
```

## Integration Steps

### 1. Load Zagel in HTML/Main Entry
Add to your main HTML or entry point:
```html
<script src="/codebank/e7ki/zagel-loader.js"></script>
```

Or in JavaScript:
```js
// Load Zagel when E7ki is ready
if (window.E7ki) {
  E7ki.on('ready', () => {
    loadScript('/codebank/e7ki/zagel-loader.js');
  });
}
```

### 2. Environment Setup
Set Gemini API key (in your .env or runtime config):
```js
window.ZAGEL_API_KEY = 'your-gemini-api-key';
```

### 3. Hook into E7ki Events
The loader will automatically:
- Add the 🕊️ pigeon button to the UI
- Listen for voice commands via `E7kiVoice.onCommand()`
- Handle user messages via `E7ki.on('message')`

## Features

### Child Voice Personality
- Speaks with child girl voice (pitch: 1.3, rate: 0.95)
- Uses Gulf slang: وش، ليش، كيفك، الحين، etc.
- Childish lisp: "س" sounds like "ث"
- Responds with context-aware replies

### Memory System
- **Interaction Tracking**: Counts interactions per contact
- **Relationship Levels**: 0 (stranger) → 3 (best friend)
- **Mood Tracking**: angry, happy, funny, curious
- **Dominant Mood**: Personality shifts based on mood
- **Persistence**: localStorage + optional backend API

### Intent System
- **Fast Intent Matching**: Regex-based pattern matching (no AI delay)
- **Fallback to Gemini**: Complex requests use AI
- **Commands**: Voice commands for common actions

## API Endpoints (Optional Backend)

### Save Memory
```
POST /api/zagel/memory/save
{
  userId: string,
  memory: {
    interactions: number,
    relationshipLevel: number,
    dominantMood: string,
    lastInteraction: timestamp,
    nicknames: { [name]: string }
  }
}
```

### Get Memory
```
GET /api/zagel/memory/:userId
```

## Voice Commands

```
"وش أخبارك؟"          → Status check
"قول لي نكتة"         → Tell a joke
"اذكري اسمي"          → Remember my name
"كم مرة تكلمنا؟"      → Interaction count
"وينك من زمان؟"      → Long time no see
```

## Customization

### Change Voice Personality
Edit `zagel-voice.js`:
- `PERSONALITY_PHRASES` - Change responses
- `SLANG_PHRASES` - Add Arabic slang
- Modify TTS pitch/rate in `speak()`

### Modify Relationship Logic
Edit `zagel-memory.js`:
- Adjust relationship thresholds in `getRelationshipLevel()`
- Customize mood messages in `generateMemoryReply()`

### Update UI
Edit `zagel-ui.js` and `zagel-styles.css`:
- Animation frames
- Colors, fonts, positions
- Speech bubble styling

## Performance Notes
- Memory stored in localStorage (5MB limit)
- Optional PostgreSQL backend for persistence
- Regex intent matching: <10ms
- Gemini API calls: ~1-2s (with fallback)

## Troubleshooting

**Zagel button not showing?**
- Check if `zagel-loader.js` loaded
- Verify Gemini API key is set

**Memory not persisting?**
- Check localStorage is enabled
- Verify backend API is running

**Voice not working?**
- Check browser TTS support
- Verify `window.ZAGEL_API_KEY` is set

## Support
Contact: E7ki Development Team
