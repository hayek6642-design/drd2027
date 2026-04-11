// ===============================
// 🎬 ZAGEL 3D INTEGRATION
// ===============================
// Bridge between voice system and 3D avatar
// Syncs animations, mouth movement, and state changes

import { createZagel3D, ZAGEL_STATES } from './zagel-3d.js'
import { ZagelVoice } from './zagel-voice.js'

class Zagel3DIntegration {
  constructor(containerElement) {
    this.container = containerElement
    this.scene = null
    this.isInitialized = false
    this.isSpeaking = false
    this.isListening = false
    this.speechAnalyzer = null
    this.animationFrameId = null
    
    this.init()
  }

  init() {
    if (!this.container) {
      console.warn('[Zagel3D] No container provided')
      return
    }

    try {
      // Create 3D scene
      this.scene = createZagel3D(this.container, {
        onBirdClick: () => this.onBirdClick()
      })

      // Setup speech analyzer for mouth sync
      this.setupSpeechAnalyzer()

      // Hook into voice system
      this.hookVoiceSystem()

      this.isInitialized = true
      console.log('[Zagel3D] Initialized successfully')
    } catch (error) {
      console.error('[Zagel3D] Initialization failed:', error)
    }
  }

  setupSpeechAnalyzer() {
    // Analyze audio for mouth movement
    // This is a simple analyzer - can be enhanced with WebAudio API
    const analyzer = {
      getVolumeLevel: () => {
        // For now, return a simulated value based on time
        // In production, use AudioContext.createAnalyser()
        return Math.random() * 0.5 + 0.3
      }
    }

    this.speechAnalyzer = analyzer
  }

  hookVoiceSystem() {
    // Intercept voice system events
    const originalSpeak = ZagelVoice.speak
    const self = this

    ZagelVoice.speak = function(text, mood = 'normal') {
      // Trigger state change and mouth sync
      self.onSpeakStart(text, mood)

      // Call original speak
      originalSpeak.call(this, text, mood)
    }

    // Hook listening start
    const originalListeningStart = ZagelVoice.startListening
    ZagelVoice.startListening = function(callback) {
      self.onListeningStart()
      return originalListeningStart.call(this, callback)
    }

    // Hook listening stop
    const originalListeningStop = ZagelVoice.stopListening
    ZagelVoice.stopListening = function() {
      self.onListeningStop()
      return originalListeningStop.call(this)
    }
  }

  onSpeakStart(text, mood = 'normal') {
    if (!this.isInitialized || !this.scene) return

    this.isSpeaking = true

    // Determine state based on mood
    let state = ZAGEL_STATES.TALKING
    if (mood === 'excited') state = ZAGEL_STATES.EXCITED
    if (mood === 'soft') state = ZAGEL_STATES.IDLE

    this.scene.setState(state)

    // Start mouth animation
    this.startMouthSync(text)

    // Stop after speech finishes (estimate: 0.1s per character + minimum)
    const duration = Math.max(text.length * 50, 1500)
    setTimeout(() => {
      this.onSpeakEnd()
    }, duration)
  }

  onSpeakEnd() {
    if (!this.isInitialized || !this.scene) return

    this.isSpeaking = false
    this.scene.setState(ZAGEL_STATES.IDLE)
    this.stopMouthSync()
  }

  onListeningStart() {
    if (!this.isInitialized || !this.scene) return

    this.isListening = true
    this.scene.setState(ZAGEL_STATES.LISTENING)
  }

  onListeningStop() {
    if (!this.isInitialized || !this.scene) return

    this.isListening = false
    
    if (!this.isSpeaking) {
      this.scene.setState(ZAGEL_STATES.IDLE)
    }
  }

  startMouthSync(text) {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }

    // Simulate mouth movement based on phonemes
    // More sophisticated implementation would use phoneme detection
    const phonemes = this.extractPhonemes(text)
    let phonemeIndex = 0
    const startTime = Date.now()
    const estimatedDuration = Math.max(text.length * 50, 1500)

    const animate = () => {
      if (!this.isSpeaking) return

      const elapsed = Date.now() - startTime
      const progress = elapsed / estimatedDuration

      if (progress >= 1) {
        this.scene.syncBeakWithSpeech(0) // Close mouth
        return
      }

      // Get current phoneme
      const currentPhonemeIndex = Math.floor(progress * phonemes.length)
      const phoneme = phonemes[currentPhonemeIndex]

      // Map phoneme to mouth opening (0-1)
      const mouthOpen = this.getBeakOpenLevel(phoneme)

      this.scene.syncBeakWithSpeech(mouthOpen)

      this.animationFrameId = requestAnimationFrame(animate)
    }

    animate()
  }

  stopMouthSync() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    this.scene.syncBeakWithSpeech(0)
  }

  extractPhonemes(text) {
    // Simple phoneme extraction (can be enhanced)
    // For Arabic: group by vowels and consonants
    const phonemes = []
    for (let char of text) {
      if ('اةيةويي'.includes(char)) {
        phonemes.push('vowel')
      } else if (char.match(/[أإآ]/)) {
        phonemes.push('vowel-open')
      } else if ('بتثجحخدذرزسشصضطظعغفقكلمنهو'.includes(char)) {
        phonemes.push('consonant')
      }
    }
    return phonemes.length > 0 ? phonemes : ['vowel']
  }

  getBeakOpenLevel(phoneme) {
    // Map phoneme to beak opening level (0-1)
    const mapping = {
      'vowel-open': 0.9,  // A, E sounds
      'vowel': 0.6,
      'consonant': 0.2,
      'default': 0.3
    }
    return mapping[phoneme] || mapping['default']
  }

  setState(state) {
    if (this.isInitialized && this.scene) {
      this.scene.setState(state)
    }
  }

  // Animation presets
  async playExcited() {
    this.setState(ZAGEL_STATES.EXCITED)
    await new Promise(r => setTimeout(r, 3000))
    this.setState(ZAGEL_STATES.IDLE)
  }

  async playFlying() {
    this.setState(ZAGEL_STATES.FLYING)
    await new Promise(r => setTimeout(r, 2000))
    this.setState(ZAGEL_STATES.IDLE)
  }

  async playSleeping() {
    this.setState(ZAGEL_STATES.SLEEPING)
  }

  async wakeUp() {
    this.setState(ZAGEL_STATES.IDLE)
  }

  onBirdClick() {
    console.log('[Zagel3D] Bird clicked!')
    // Can trigger custom action
  }

  dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    if (this.scene) {
      this.scene.dispose()
    }
  }
}

// ===============================
// 🌍 Global Instance Management
// ===============================

let globalZagel3D = null

export function initZagel3D(containerElement) {
  if (!containerElement) {
    console.warn('[Zagel3D] Container element required')
    return null
  }

  globalZagel3D = new Zagel3DIntegration(containerElement)
  return globalZagel3D
}

export function getZagel3D() {
  return globalZagel3D
}

export function disposeZagel3D() {
  if (globalZagel3D) {
    globalZagel3D.dispose()
    globalZagel3D = null
  }
}

export { Zagel3DIntegration }
