# ⚡ Zagel OS - Quick Start (5 Minutes)

## 🎯 TL;DR

1. **Copy Files** → 30 seconds
2. **Install Deps** → 2 minutes  
3. **Configure** → 1 minute
4. **Deploy** → 1 minute
5. **Test** → 1 minute

---

## 📥 Step 1: Copy Files (30 seconds)

```bash
cd /tmp/drd2027

# Copy core files
cp /agent/home/zagel-*.js shared/

# Copy bridge
cp /agent/home/zagel-e7ki-bridge.js services/

# Done! ✅
```

---

## 📦 Step 2: Install Dependencies (2 minutes)

```bash
# Update package.json
npm install @capgo/capacitor-speech-recognition @capacitor/haptics @capacitor-community/call-number

# Sync Capacitor
npx cap sync

# Done! ✅
```

---

## ⚙️ Step 3: Configure (1 minute)

Edit `index.html`:

```html
<script type="module">
  import { initZagelWidget } from './shared/zagel/zagel-core.js'
  import { ZagelE7kiBridge } from './services/zagel-e7ki-bridge.js'
  
  // Setup bridge
  const bridge = new ZagelE7kiBridge({
    apiUrl: 'https://dr-d-h51l.onrender.com',
    apiKey: 'rnd_g1qDipOxJ21hHd7suZeCJ52BH92C'
  })
  
  // Initialize on auth ready
  document.addEventListener('auth:ready', async (e) => {
    bridge.config.userId = e.detail.userId
    await bridge.connect()
    await bridge.startMessageListener()
    initZagelWidget()
    console.log('✅ Zagel initialized!')
  })
</script>
```

---

## 🚀 Step 4: Deploy (1 minute)

```bash
# Commit
git add shared/zagel* services/zagel-e7ki-bridge.js
git commit -m "feat: Add Zagel OS voice assistant"

# Push
git push origin main

# Deploy to Render (auto or manual)
# Done! ✅
```

---

## ✅ Step 5: Test (1 minute)

Visit `https://dr-d-h51l.onrender.com` and:

1. Click the 🕊️ orb (bottom right)
2. Say: "يا زاجل، كم كود عندي؟"
3. Listen for Zagel's response ✅

---

## 🎤 Essential Commands

| Say This | What Happens |
|----------|-------------|
| كم كود عندي؟ | Shows code count |
| ارسل 5 ذهب | Transfers gold |
| كم رصيدي؟ | Shows all assets |
| افتح سمعني | Opens music app |
| كيف الجو؟ | Weather report |

---

## 🔧 Troubleshooting

### Widget Not Showing?
```javascript
// Check if Zagel loaded
console.log(window.Zagel) // Should exist
```

### Voice Not Working?
- Use **Chrome/Edge** (best support)
- Must be **HTTPS** (required for Web Speech API)
- Check **microphone permissions**

### E7ki Connection Error?
```javascript
// Check bridge status
fetch('https://dr-d-h51l.onrender.com/health')
  .then(r => r.json())
  .then(d => console.log('Status:', d))
```

---

## 📊 What's Included

✅ Voice Recognition (STT) - Web Speech + Capacitor  
✅ Voice Response (TTS) - Native synthesis  
✅ 8 Smart Agents - Codes, Gold, Weather, etc.  
✅ Message Notifications - Knock-knock system  
✅ Context Memory - Learns from interactions  
✅ Personality Evolution - Adapts to user  
✅ E7ki Integration - Full messaging support  
✅ Multi-Action Commands - "Do X then Y"

---

## 🎯 Next Steps

1. ✅ Complete 5-minute setup above
2. 📖 Read `ZAGEL_IMPLEMENTATION_GUIDE.md` for details
3. 🚀 Read `ZAGEL_DEPLOYMENT_GUIDE.md` for production
4. 🔧 Customize in `shared/zagel/config.js`
5. 🧪 Run tests: `npm run test:voice`

---

## 📂 File Locations

All files are in `/agent/home/`:

- `zagel-core.js` - Main brain
- `zagel-voice.js` - Voice engine
- `zagel-door.js` - Notifications
- `zagel-intents.js` - Intent detection
- `zagel-emotion.js` - Emotion detection
- `zagel-memory.js` - Memory system
- `zagel-personality.js` - Personality
- `zagel-e7ki-bridge.js` - E7ki integration

---

## 💡 Pro Tips

### 1. Add Custom Greetings
Edit `zagel-personality.js`:
```javascript
const greetings = [
  "أهلاً وسهلاً 😄",
  "كيف حالك؟ 🙌",
  "سعيد شفتك 😊"
]
```

### 2. Add More Voice Commands
Edit `zagel-intents.js` `INTENT_PATTERNS`

### 3. Change Voice Language
Edit `zagel-voice.js`:
```javascript
utterance.lang = 'en-US' // English
utterance.lang = 'fr-FR' // French
```

### 4. Debug Voice Input
```javascript
import { startListening } from './zagel/zagel-voice.js'
await startListening(text => console.log('Heard:', text))
```

---

## ⚠️ Important Notes

- 🔒 Keep API key secure (use env vars in production)
- 📱 Test on multiple devices
- 🎤 HTTPS required for voice (localhost exception)
- ⏱️ Voice latency typically < 1 second
- 🔊 Audio context may be limited on some devices

---

## 🎊 You're Done!

Your Zagel OS voice assistant is now live! 🚀

**Questions?** Check the detailed guides:
- `ZAGEL_IMPLEMENTATION_GUIDE.md` - How it works
- `ZAGEL_DEPLOYMENT_GUIDE.md` - Production setup
- `ZAGEL_FILES_MANIFEST.md` - Complete reference

**Support:** All documentation in `/agent/home/`

---

**Status:** ✅ Ready to Use  
**Last Updated:** April 11, 2026  
**Version:** 2.0 Production
