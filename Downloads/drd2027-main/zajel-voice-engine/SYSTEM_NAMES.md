# 🏷️ Zajel Voice Engine - System Names

The Zajel Voice Engine accepts both **"Zajel"** and **"Zagel"** as valid system identifiers. This document explains how to use and configure system names.

## Quick Summary

- ✅ **Primary Name**: `Zajel` (modern spelling)
- ✅ **Alternative Name**: `Zagel` (traditional spelling)
- ✅ **Both names are fully supported** - Use whichever you prefer
- ✅ **Case-insensitive** - "zajel", "ZAJEL", "Zajel" all work
- ✅ **Runtime configurable** - Change the name at any time

## Configuration

### Default Initialization

```javascript
import zagelBridge from './src/integration/zagelBridge';

// Initializes with default name "Zajel"
zagelBridge.initialize(myZagelCore);
```

### Specify System Name

```javascript
import zagelBridge from './src/integration/zagelBridge';

// Initialize as "Zagel"
zagelBridge.initialize(myZagelCore, 'Zagel');

// Initialize as "Zajel"
zagelBridge.initialize(myZagelCore, 'Zajel');
```

### Change Name at Runtime

```javascript
// Change to Zagel
zagelBridge.setSystemName('Zagel');

// Change to Zajel
zagelBridge.setSystemName('Zajel');

// Invalid names return false
const success = zagelBridge.setSystemName('Zogel');  // false
```

## API Reference

### `getSystemName()`

Returns the current system name.

```javascript
const name = zagelBridge.getSystemName();
console.log(name); // "Zajel" or "Zagel"
```

### `acceptsName(name)`

Checks if a name is valid for the system.

```javascript
zagelBridge.acceptsName('Zajel');   // true
zagelBridge.acceptsName('Zagel');   // true
zagelBridge.acceptsName('zajel');   // true (case-insensitive)
zagelBridge.acceptsName('Zogel');   // false
```

### `setSystemName(name)`

Changes the system name. Returns `true` if successful, `false` if invalid.

```javascript
zagelBridge.setSystemName('Zajel');  // true
zagelBridge.setSystemName('Zagel');  // true
zagelBridge.setSystemName('Other');  // false
```

### `getStatus()`

Returns bridge status including system name information.

```javascript
const status = zagelBridge.getStatus();
// {
//   initialized: true,
//   hasCore: true,
//   systemName: "Zajel",
//   acceptedNames: ["Zajel", "Zagel"],
//   memoryReady: true
// }
```

## User Interaction

### Direct Address Recognition

Users can address the system by name:

```
"Zajel, what's the weather?"
"يا Zagel، ما هو الوقت؟"
"Zagel, help me"
```

The system detects both names in conversation and responds appropriately with the configured name:

```
User: "Zajel, who are you?"
System: "أهلاً! أنا Zajel، كيف أقدر أساعدك؟"
         (Hello! I'm Zajel, how can I help you?)

User: "Zagel, who are you?"
System: "أهلاً! أنا Zagel، كيف أقدر أساعدك؟"
         (Hello! I'm Zagel, how can I help you?)
```

### Instruction Detection

Both names are recognized in instruction context:

```javascript
import { useInstructionClassifier } from './src/engine/instructionClassifier';

const { classify } = useInstructionClassifier();

// Direct address with system name
classify("Zajel, خلي ردودك قصيرة");
// Returns: { isInstruction: true, addressedToSystem: true, ... }

// Instruction without direct address still works
classify("خلي ردودك قصيرة");
// Returns: { isInstruction: true, addressedToSystem: false, ... }
```

## Internal Structure

### System Names Constants

File: `src/constants/systemNames.js`

```javascript
export const SYSTEM_NAMES = {
  PRIMARY: 'Zajel',      // Modern spelling
  ALTERNATE: 'Zagel',     // Traditional spelling
  ALL: ['Zajel', 'Zagel'] // All accepted names
};
```

### Name Validation Functions

```javascript
// Normalize input (handles case-insensitivity)
normalizeSystemName('zajel');   // "Zajel"
normalizeSystemName('ZAGEL');   // "Zagel"
normalizeSystemName('xyz');     // null

// Check validity
isValidSystemName('Zajel');     // true
isValidSystemName('Zagel');     // true
isValidSystemName('Other');     // false

// Get regex pattern for matching
getSystemNamePattern();
// Returns: /\b(Zajel|Zagel)\b/gi
```

## Use Cases

### Multi-Language Support

Configure different system names for different user preferences:

```javascript
// User preference API
async function initializeWithUserPreference(userSettings) {
  const { preferredSystemName } = await fetchUserSettings();
  zagelBridge.initialize(myZagelCore, preferredSystemName);
}
```

### Fallback Behavior

If one name is not available, automatically use the other:

```javascript
function initialize(primaryName, fallbackName) {
  const success = zagelBridge.setSystemName(primaryName);
  if (!success && fallbackName) {
    zagelBridge.setSystemName(fallbackName);
  }
}

// Usage
initialize('Zagel', 'Zajel');
```

### Multi-Account Support

Different users can have different system name preferences:

```javascript
const users = {
  user1: { name: 'Zajel' },
  user2: { name: 'Zagel' }
};

function switchUser(userId) {
  const { name } = users[userId];
  zagelBridge.setSystemName(name);
}
```

## Testing

Test system name functionality:

```javascript
import { isValidSystemName, normalizeSystemName } from './src/constants/systemNames';

// Test validation
test('validates system names', () => {
  expect(isValidSystemName('Zajel')).toBe(true);
  expect(isValidSystemName('Zagel')).toBe(true);
  expect(isValidSystemName('Invalid')).toBe(false);
});

// Test normalization
test('normalizes system names', () => {
  expect(normalizeSystemName('zajel')).toBe('Zajel');
  expect(normalizeSystemName('ZAGEL')).toBe('Zagel');
  expect(normalizeSystemName('zajel ')).toBe('Zajel');
});

// Test bridge integration
test('bridge accepts both names', () => {
  expect(zagelBridge.acceptsName('Zajel')).toBe(true);
  expect(zagelBridge.acceptsName('Zagel')).toBe(true);
  expect(zagelBridge.acceptsName('Other')).toBe(false);
});
```

## Best Practices

1. **Use default initialization** if you don't have a specific requirement
   ```javascript
   zagelBridge.initialize(myZagelCore);  // Uses "Zajel"
   ```

2. **Validate user input** before changing system name
   ```javascript
   if (zagelBridge.setSystemName(userInput)) {
     console.log('System name updated');
   } else {
     console.log('Invalid system name');
   }
   ```

3. **Store user preferences** if allowing system name selection
   ```javascript
   await memoryManager.savePreference('systemName', selectedName);
   ```

4. **Check status** in debug mode
   ```javascript
   const status = zagelBridge.getStatus();
   logger.log('Current system:', status.systemName);
   logger.log('Accepted names:', status.acceptedNames);
   ```

## Extending System Names

To add more system name variations in the future:

```javascript
// In src/constants/systemNames.js
export const SYSTEM_NAMES = {
  PRIMARY: 'Zajel',
  ALTERNATE: 'Zagel',
  LEGACY: 'Zojel',           // If needed
  ALL: ['Zajel', 'Zagel', 'Zojel']
};

// Then add validation in normalizeSystemName()
if (normalized === 'zojel') return SYSTEM_NAMES.LEGACY;
```

---

**Last Updated**: 2024  
**Status**: Production Ready  
**Supported Names**: Zajel, Zagel
