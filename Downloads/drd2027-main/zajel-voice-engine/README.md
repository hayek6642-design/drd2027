# 🎤 Zajel Voice Engine - React Native Mobile AI Agent

A complete, production-ready voice interaction engine for React Native that integrates cleanly with Zajel/Zagel OS.

## Features

✅ **Voice Input** - Speech-to-text with react-native-voice and expo-speech fallback  
✅ **Dual System Names** - Accepts both "Zajel" and "Zagel" as system identifiers  
✅ **Arabic Instruction Detection** - Keywords like "خلي", "افتكر", "ركز", "غير", "من دلوقتي"  
✅ **Behavior Engine** - Modifies responses based on stored user preferences and rules  
✅ **AsyncStorage Memory** - Persistent user data across sessions  
✅ **Clean Bridge** - Seamlessly integrates with existing Zajel/Zagel OS  
✅ **Modern UI** - Animated mic button, chat bubbles, real-time status indicators  
✅ **Text Fallback** - Keyboard input when voice is unavailable  
✅ **Debug Logging** - Comprehensive logging system with optional persistence  

## Project Structure

```
zajel-voice-engine/
├── App.js                              # Main entry point
├── app.json                            # Expo configuration
├── package.json                        # Dependencies
├── .gitignore
├── README.md
├── src/
│   ├── voice/
│   │   └── voiceInput.js              # Speech-to-text handler
│   ├── engine/
│   │   ├── instructionClassifier.js   # Detects instruction keywords
│   │   └── instructionParser.js       # Converts to structured rules
│   ├── memory/
│   │   ├── memoryStore.js             # AsyncStorage wrapper
│   │   └── memoryManager.js           # High-level memory operations
│   ├── behavior/
│   │   └── behaviorEngine.js          # Response modification engine
│   ├── integration/
│   │   └── zagelBridge.js             # Clean Zagel OS interface
│   ├── components/
│   │   ├── VoiceScreen.js             # Main UI screen
│   │   ├── MicButton.js               # Animated microphone button
│   │   ├── ChatBubble.js              # Message display
│   │   └── StatusIndicator.js         # Listening/Processing states
│   └── utils/
│       └── logger.js                  # Simple logging system
└── assets/
    └── sounds/                        # UI feedback sounds (optional)
```

## Installation

```bash
# Install dependencies
npm install

# Or with Expo
expo install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

## Usage

### Basic Integration with Zagel OS

```javascript
import zagelBridge from './src/integration/zagelBridge';

// Initialize with your Zagel core
const myZagelCore = {
  generateResponse: async (text, context) => {
    // Your AI logic here
    return await yourAI.generate(text, context);
  }
};

zagelBridge.initialize(myZagelCore);
```

### System Names Configuration

The Zajel Voice Engine accepts both **"Zajel"** and **"Zagel"** as system identifiers.

```javascript
import zagelBridge from './src/integration/zagelBridge';

// Initialize with default name (Zajel)
zagelBridge.initialize(myZagelCore);
console.log(zagelBridge.getSystemName()); // "Zajel"

// Or initialize with specific name
zagelBridge.initialize(myZagelCore, 'Zagel');
console.log(zagelBridge.getSystemName()); // "Zagel"

// Change system name at runtime
zagelBridge.setSystemName('Zajel');  // Returns true if valid

// Check if a name is accepted
zagelBridge.acceptsName('Zajel');  // true
zagelBridge.acceptsName('Zagel');  // true
zagelBridge.acceptsName('Zogel');  // false

// Get current status
const status = zagelBridge.getStatus();
console.log(status.systemName);     // Current name
console.log(status.acceptedNames);  // ["Zajel", "Zagel"]
```

The system detects both names in user input:
- Direct address: "Zajel, help me" or "يا Zagel"
- Case-insensitive: "zajel" or "ZAGEL"
- Responses automatically use the configured system name

### Voice Input Example

```javascript
import { useVoiceInput } from './src/voice/voiceInput';

function MyComponent() {
  const { isListening, transcript, startListening, stopListening } = useVoiceInput();
  
  return (
    <>
      <button onClick={() => startListening('ar-SA')}>
        {isListening ? 'Listening...' : 'Start'}
      </button>
      <p>{transcript}</p>
    </>
  );
}
```

### Instruction Classification

```javascript
import { useInstructionClassifier } from './src/engine/instructionClassifier';

function MyComponent() {
  const { classify, extract } = useInstructionClassifier();
  
  const text = "خلي ردودك قصيرة"; // "Make your responses short"
  const classification = classify(text);
  
  if (classification.isInstruction) {
    const details = extract(classification);
    console.log(details); // { category: 'response_style', value: 'short' }
  }
}
```

## Supported Instructions

### Arabic
- **خلي/خلى** - Set/Make (e.g., "خلي ردودك قصيرة" = "Make responses short")
- **افتكر** - Remember (e.g., "افتكر اني بحب القهوة" = "Remember I like coffee")
- **ركز** - Focus on (e.g., "ركز على التكنولوجيا" = "Focus on technology")
- **غير/غيّر** - Change
- **عدل** - Adjust
- **من دلوقتي** - From now on
- **من النهاردة** - From today

### English
- **set/make** - Set preference
- **remember** - Remember fact
- **focus** - Focus topic
- **change/adjust** - Modify behavior

## Response Styles

Users can request different response styles:
- **قصير (short)** - Brief, concise responses
- **طويل/مفصل (detailed)** - Comprehensive with examples
- **عادي (normal)** - Balanced, natural responses
- **مضحك (funny)** - Humorous tone
- **جاد (serious)** - Formal, professional tone
- **شاعري (poetic)** - Literary, metaphorical language

## Memory System

User preferences and rules are stored locally in AsyncStorage:
- User preferences (name, response style, language)
- Behavior rules (instruction-based modifications)
- Conversation history (last 200 messages)
- Instruction log (for debugging)

Access via `memoryManager`:

```javascript
import memoryManager from './src/memory/memoryManager';

// Get all memory
const memory = await memoryManager.getMemory();

// Update preferences
await memoryManager.updateResponseStyle('short');

// Get recent context for AI
const context = await memoryManager.getRecentContext(10);
```

## Behavior Engine

The behavior engine automatically applies stored rules to responses:

```javascript
import behaviorEngine from './src/behavior/behaviorEngine';

const response = "This is a long detailed response about a topic...";
const modified = await behaviorEngine.modifyResponse(response);
// Returns: { text: "This is a long...", appliedModifiers: {...} }
```

## Logging

Enable debug logging:

```javascript
import { logger } from './src/utils/logger';

logger.log('Debug message', data);
logger.warn('Warning');
logger.error('Error');

// Enable persistent logging
logger.persistLogs = true;

// Retrieve logs
const logs = await logger.getLogs();
```

## Key Design Principles

1. **Modularity** - Each component can be tested independently
2. **Clean Bridge** - No modifications to existing Zagel OS code
3. **User-Centric** - Instructions in natural Arabic and English
4. **Persistent Memory** - All preferences survive app restart
5. **Fallbacks** - Works with voice disabled
6. **Type Safety** - Well-documented data structures

## Dependencies

- **expo** ~50.0.0 - Development framework
- **react-native** 0.73.6 - Mobile framework
- **react-native-voice** ^3.2.4 - Speech recognition
- **expo-speech** ~11.7.0 - Text-to-speech fallback
- **@react-native-async-storage/async-storage** 1.21.0 - Data persistence
- **uuid** ^9.0.1 - ID generation

## Permissions Required

### iOS
- `NSMicrophoneUsageDescription` - For voice input
- `NSSpeechRecognitionUsageDescription` - For speech recognition

### Android
- `android.permission.RECORD_AUDIO` - For microphone
- `android.permission.INTERNET` - For API calls

These are configured in `app.json`.

## Extending the System

### Add Custom Instructions

Edit `instructionClassifier.js`:

```javascript
const INSTRUCTION_KEYWORDS = {
  'كلمة_جديدة': 'custom_action',
  // ...
};
```

### Add Custom Response Styles

Edit `behaviorEngine.js`:

```javascript
getStyleDefaults(style) {
  const defaults = {
    custom_style: {
      maxLength: 200,
      tone: 'custom',
      // ...
    }
  };
}
```

### Custom Memory Storage

The `memoryStore` is designed to be swappable. You can replace AsyncStorage with cloud storage:

```javascript
class CloudMemoryStore extends MemoryStore {
  async getUserPreferences() {
    return await cloudAPI.getPreferences();
  }
  // Override other methods...
}
```

## Troubleshooting

### Voice Input Not Working
- Check microphone permissions in app settings
- Ensure `react-native-voice` is properly linked
- Check device language settings for speech recognition

### Instructions Not Being Detected
- Verify Arabic text encoding (UTF-8)
- Check exact keyword matching in logs
- Add debug logging: `logger.log('Classifying:', text)`

### Memory Not Persisting
- Ensure `memoryManager.init()` is called on app start
- Check device storage availability
- Look for AsyncStorage errors in logs

## Future Enhancements

- [ ] Cloud backup of preferences
- [ ] Multi-user support
- [ ] Custom voice feedback sounds
- [ ] Voice-based UI navigation
- [ ] ML-based instruction detection
- [ ] Emotion detection from voice
- [ ] Conversation summaries

## License

MIT

## Support

For issues and questions, contact the Zagel OS team.
