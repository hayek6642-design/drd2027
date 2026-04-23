# 🚀 Zajel Voice Engine - Quick Start Guide

**Complete React Native voice AI agent with support for both "Zajel" and "Zagel" system names.**

---

## 1️⃣ Installation

```bash
npm install
```

## 2️⃣ Basic Usage

### Initialize with Default Name (Zajel)

```javascript
import zagelBridge from './src/integration/zagelBridge';

zagelBridge.initialize(myZagelCore);
console.log(zagelBridge.getSystemName()); // "Zajel"
```

### Initialize with Alternate Name (Zagel)

```javascript
zagelBridge.initialize(myZagelCore, 'Zagel');
console.log(zagelBridge.getSystemName()); // "Zagel"
```

## 3️⃣ System Names

### Change Name at Runtime

```javascript
zagelBridge.setSystemName('Zajel');   // ✅ true
zagelBridge.setSystemName('Zagel');   // ✅ true
zagelBridge.setSystemName('Other');   // ❌ false
```

### Validate Names

```javascript
zagelBridge.acceptsName('Zajel');     // ✅ true
zagelBridge.acceptsName('Zagel');     // ✅ true
zagelBridge.acceptsName('Invalid');   // ❌ false
```

### Get Current Status

```javascript
const status = zagelBridge.getStatus();
console.log(status.systemName);       // "Zajel" or "Zagel"
console.log(status.acceptedNames);    // ["Zajel", "Zagel"]
```

## 4️⃣ Voice Recognition

### Arabic (ar-SA)

```javascript
import { useVoiceInput } from './src/voice/voiceInput';

function MyComponent() {
  const { startListening, isListening, transcript } = useVoiceInput();
  
  return (
    <button onClick={() => startListening('ar-SA')}>
      {isListening ? 'Listening...' : 'Speak'}
    </button>
  );
}
```

### English (en-US)

```javascript
startListening('en-US');
```

## 5️⃣ Instruction Detection

### Arabic Commands

```javascript
import { useInstructionClassifier } from './src/engine/instructionClassifier';

const { classify } = useInstructionClassifier();

const result = classify('خلي ردودك قصيرة'); // "Make responses short"
if (result.isInstruction) {
  console.log('Type:', result.type);           // "set"
  console.log('Instruction detected!');
}
```

### Supported Arabic Keywords

- **خلي** - Make/Set
- **افتكر** - Remember
- **ركز** - Focus
- **غير** - Change
- **عدل** - Adjust
- **من دلوقتي** - From now on

### English Commands

```javascript
classify('Set my responses to short');
classify('Remember that I like coffee');
classify('Change your tone to funny');
```

## 6️⃣ Response Styles

Users can request different styles:

| Style | Arabic | English |
|-------|--------|---------|
| Short | قصير | short, brief |
| Detailed | مفصل | detailed, long |
| Normal | عادي | normal |
| Funny | مضحك | funny, humor |
| Serious | جاد | serious, formal |
| Poetic | شاعري | poetic |

## 7️⃣ Memory System

### Save User Preference

```javascript
import memoryManager from './src/memory/memoryManager';

await memoryManager.savePreference('responseStyle', 'short');
```

### Load Preference

```javascript
const style = await memoryManager.getPreference('responseStyle');
console.log(style); // "short"
```

### Add to Conversation History

```javascript
await memoryManager.addToConversation('user', 'مرحبا');
await memoryManager.addToConversation('assistant', 'أهلا وسهلا');
```

## 8️⃣ Bridge to Zajel/Zagel OS

### Send Message and Get Response

```javascript
const result = await zagelBridge.sendMessageToZagel('مرحبا');

if (result.success) {
  console.log(result.text);           // Response text
  console.log(result.metadata);       // Applied modifiers
} else {
  console.log(result.error);          // Error message
}
```

### Confirm Instructions

```javascript
await zagelBridge.confirmInstruction(
  { category: 'response_style', value: 'short' },
  true
);
```

## 9️⃣ Behavior Engine

### Prepare Context for Response

```javascript
import behaviorEngine from './src/behavior/behaviorEngine';

const context = await behaviorEngine.prepareContext('خلي ردودك قصيرة');
console.log(context.userPreferences);
console.log(context.systemPrompt);
```

### Modify Response

```javascript
const original = 'This is a long response...';
const modified = await behaviorEngine.modifyResponse(original, {
  userMessage: 'خلي ردودك قصيرة'
});

console.log(modified.text);              // Modified response
console.log(modified.appliedModifiers);  // What was changed
```

## 🔟 UI Components

### Voice Screen

```javascript
import VoiceScreen from './src/components/VoiceScreen';

<VoiceScreen />
```

### Mic Button

```javascript
import MicButton from './src/components/MicButton';

<MicButton 
  onPress={handleMicPress}
  isActive={isListening}
/>
```

### Chat Bubble

```javascript
import ChatBubble from './src/components/ChatBubble';

<ChatBubble
  message="أهلا بك"
  author="assistant"
  timestamp={Date.now()}
/>
```

### Status Indicator

```javascript
import StatusIndicator from './src/components/StatusIndicator';

<StatusIndicator status="listening" />
// Statuses: idle, listening, processing, ready
```

## 1️⃣1️⃣ Logging

### Enable Debug Logging

```javascript
import { logger } from './src/utils/logger';

logger.log('User instruction:', 'خلي ردودك قصيرة');
logger.error('Failed to process:', error);
logger.warn('Low confidence match');
```

### Get Logs

```javascript
const logs = await logger.getLogs();
console.log(logs); // All logged messages
```

---

## 📚 Documentation

- **`README.md`** - Full project documentation
- **`SYSTEM_NAMES.md`** - Detailed system names guide
- **`IMPLEMENTATION_SUMMARY.md`** - Complete feature inventory
- **`QUICK_START.md`** - This file

---

## 🎯 Common Tasks

### Change System Name

```javascript
zagelBridge.setSystemName('Zagel');
```

### Save Custom Instruction

```javascript
const instruction = {
  category: 'response_style',
  value: 'short'
};
await memoryManager.saveInstruction(instruction, true);
```

### Get Bridge Status

```javascript
const status = zagelBridge.getStatus();
if (status.initialized) {
  console.log('Bridge ready with:', status.systemName);
}
```

### Detect User Instruction

```javascript
const { classify } = useInstructionClassifier();
const result = classify(userInput);
const systemNameMentioned = result.addressedToSystem;
```

---

## ⚡ Performance Tips

1. **Cache classifiers** - Reuse classifier instances
2. **Batch memory updates** - Group storage operations
3. **Use fallback text input** - When voice fails
4. **Monitor logs** - Check debug output for issues

---

## 🐛 Troubleshooting

### Voice Not Working?
- Check microphone permissions in `app.json`
- Verify language code (ar-SA for Arabic)
- Use text input fallback

### Instructions Not Detected?
- Check keyword spelling
- Use the classifier hook for testing
- Review logs with `logger.getLogs()`

### System Name Not Changing?
- Verify name is "Zajel" or "Zagel"
- Call `acceptsName()` to validate first
- Check `getSystemName()` to confirm change

---

## 🎓 Next Steps

1. Read `README.md` for full API
2. Check `SYSTEM_NAMES.md` for name configuration
3. Review `src/` code for implementation details
4. Customize components in `src/components/`
5. Extend behavior in `src/behavior/`

---

**Status**: ✅ Ready to Use  
**Both Names Supported**: Zajel ✅ | Zagel ✅  
**Languages**: Arabic (ar-SA) | English (en-US)
