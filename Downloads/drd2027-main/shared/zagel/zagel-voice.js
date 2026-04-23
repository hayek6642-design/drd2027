// ===============================
// 🔊 ZAGEL VOICE - TTS + STT Engine
// ===============================

let CapacitorSpeech = null
let Haptics = null

async function initCapacitor() {
  try {
    const speechModule = await import('@capgo/capacitor-speech-recognition')
    CapacitorSpeech = speechModule.SpeechRecognition
    
    const hapticsModule = await import('@capacitor/haptics')
    Haptics = hapticsModule.Haptics
  } catch (e) {
    console.log('[Zagel] Capacitor plugins not available')
  }
}

initCapacitor()

export const ZagelVoice = {
  
  async speak(text, mood = "normal") {
    console.log("🕊️ Zagel:", text)
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    
    const utterance = new SpeechSynthesisUtterance(text)
    const isArabic = /[\u0600-\u06FF]/.test(text)
    utterance.lang = isArabic ? 'ar-SA' : 'en-US'
    
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

let currentListener = null
let isListening = false

export async function startListening(onResult, duration = null) {
  if (CapacitorSpeech) {
    return startCapacitorListening(onResult, duration)
  } else {
    return startWebListening(onResult, duration)
  }
}

async function startCapacitorListening(onResult, duration) {
  try {
    const perms = await CapacitorSpeech.checkPermissions()
    if (perms.speechRecognition !== 'granted') {
      await CapacitorSpeech.requestPermissions()
    }
    
    isListening = true
    
    currentListener = await CapacitorSpeech.addListener('partialResults', (event) => {
      const text = event.matches?.[0]
      if (text) onResult(text)
    })
    
    await CapacitorSpeech.start({
      language: 'ar-SA',
      maxResults: 3,
      partialResults: true,
      addPunctuation: true
    })
    
    if (duration) {
      setTimeout(() => stopListening(), duration)
    }
    
    return true
    
  } catch (error) {
    console.error('[Zagel] Capacitor speech error:', error)
    return startWebListening(onResult, duration)
  }
}

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
      if (lastResult.isFinal) {
        const text = lastResult[0].transcript
        onResult(text)
      }
    }
    
    recognition.onerror = (event) => {
      console.error('[Zagel] Web speech error:', event.error)
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
