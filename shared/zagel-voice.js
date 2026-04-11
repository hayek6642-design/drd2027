// ===============================
// 🔊 ZAGEL VOICE - TTS + STT Engine
// ===============================

let CapacitorSpeech = null
let Haptics = null

// Initialize Capacitor plugins
async function initCapacitor() {
  try {
    const speechModule = await import('@capgo/capacitor-speech-recognition')
    CapacitorSpeech = speechModule.SpeechRecognition
    
    const hapticsModule = await import('@capacitor/haptics')
    Haptics = hapticsModule.Haptics
  } catch (e) {
    console.log('[Zagel] Capacitor plugins not available, using web APIs')
  }
}

// Initialize on module load
initCapacitor()

// ===============================
// 🔊 Text-to-Speech
// ===============================

export const ZagelVoice = {
  
  async speak(text, mood = "normal") {
    console.log("🕊️ Zagel:", text)
    
    // Cancel any ongoing speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    
    const utterance = new SpeechSynthesisUtterance(text)
    
    // Language detection (Arabic/English)
    const isArabic = /[\u0600-\u06FF]/.test(text)
    utterance.lang = isArabic ? 'ar-SA' : 'en-US'
    
    // Mood-based voice settings
    switch (mood) {
      case "excited":
        utterance.rate = 1.2
        utterance.pitch = 1.1
        break
      case "soft":
        utterance.rate = 0.9
        utterance.pitch = 0.9
        utterance.volume = 0.7
        break
      case "loud":
        utterance.rate = 1.1
        utterance.pitch = 1.2
        utterance.volume = 1
        break
      default:
        utterance.rate = 1
        utterance.pitch = 1
    }
    
    window.speechSynthesis.speak(utterance)
  },

  softSay(text) {
    return this.speak(text, "soft")
  },

  sayLoud(text) {
    if (Haptics) {
      Haptics.vibrate({ duration: 100 })
    } else if (navigator.vibrate) {
      navigator.vibrate(100)
    }
    return this.speak(text, "loud")
  }
}

// ===============================
// 🎤 Speech-to-Text
// ===============================

let currentListener = null
let isListening = false

export async function startListening(onResult, duration = null) {
  // Try Capacitor first, fallback to Web Speech API
  if (CapacitorSpeech) {
    return startCapacitorListening(onResult, duration)
  } else {
    return startWebListening(onResult, duration)
  }
}

// Capacitor Speech Recognition 
async function startCapacitorListening(onResult, duration) {
  try {
    // Check permissions
    const perms = await CapacitorSpeech.checkPermissions()
    if (perms.speechRecognition !== 'granted') {
      await CapacitorSpeech.requestPermissions()
    }
    
    // Check availability
    const { available } = await CapacitorSpeech.available()
    if (!available) {
      throw new Error('Speech recognition not available')
    }
    
    isListening = true
    
    // Add partial results listener
    currentListener = await CapacitorSpeech.addListener('partialResults', (event) => {
      const text = event.matches?.[0]
      if (text) onResult(text)
    })
    
    // Start recognition
    await CapacitorSpeech.start({
      language: 'ar-SA', // Default Arabic
      maxResults: 3,
      partialResults: true,
      addPunctuation: true
    })
    
    // Auto-stop after duration
    if (duration) {
      setTimeout(() => stopListening(), duration)
    }
    
    return true
    
  } catch (error) {
    console.error('[Zagel] Capacitor speech error:', error)
    return startWebListening(onResult, duration)
  }
}

// Web Speech API fallback
function startWebListening(onResult, duration) {
  return new Promise((resolve, reject) => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      reject(new Error('Speech recognition not supported'))
      return
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'ar-SA'
    
    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1]
      if (lastResult.isFinal || lastResult[0].confidence > 0.7) {
        const text = lastResult[0].transcript
        onResult(text)
      }
    }
    
    recognition.onerror = (event) => {
      console.error('[Zagel] Web speech error:', event.error)
      if (event.error === 'not-allowed') {
        reject(new Error('Microphone permission denied'))
      }
    }
    
    recognition.onend = () => {
      isListening = false
    }
    
    recognition.start()
    isListening = true
    currentListener = recognition
    
    if (duration) {
      setTimeout(() => {
        recognition.stop()
      }, duration)
    }
    
    resolve(true)
  })
}

export async function stopListening() {
  isListening = false
  
  if (CapacitorSpeech) {
    try {
      await CapacitorSpeech.stop()
      if (currentListener) {
        await currentListener.remove()
        currentListener = null
      }
    } catch (e) {
      console.error('Error stopping Capacitor speech:', e)
    }
  }
  
  if (currentListener && typeof currentListener.stop === 'function') {
    currentListener.stop()
    currentListener = null
  }
}

export function isZagelListening() {
  return isListening
}

export default { ZagelVoice, startListening, stopListening, isZagelListening }
