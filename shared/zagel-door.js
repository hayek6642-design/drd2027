// ===============================
// 🚪 ZAGEL DOOR - Knock Interaction
// ===============================

import { ZagelVoice } from './zagel-voice.js'
import { detectEmotionFast } from './zagel-emotion.js'

export const ZagelDoor = {
  
  attempts: 0,
  maxAttempts: 3,
  waiting: false,
  currentMsg: null,
  onEnter: null, // Callback when user welcomes Zagel

  // Start the knock sequence
  startKnocking(msg) {
    this.currentMsg = msg
    this.attempts = 0
    this.waiting = true
    
    console.log('🚪 Zagel knocking...')
    this.knock()
  },

  // Single knock attempt
  knock() {
    this.attempts++
    
    // Play knock sound (2 taps)
    this.playKnockSound()
    
    // Voice based on attempt number
    const greetings = [
      "في حد هنا؟ 😄",
      "أنا زاجل... حد موجود؟ 😊",
      "ياااا... في حد؟ 😅"
    ]
    
    ZagelVoice.softSay(greetings[this.attempts - 1] || greetings[2])
    
    // Start listening for response
    this.listenForResponse()
    
    // Timeout for next attempt
    setTimeout(() => {
      if (this.waiting && this.attempts < this.maxAttempts) {
        this.knock()
      } else if (this.waiting) {
        this.escalate()
      }
    }, 5000)
  },

  // Play knock sound effect
  playKnockSound() {
    // Create oscillator for "tok tok" sound
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      
      oscillator.frequency.value = 800
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)
      
      oscillator.start(audioCtx.currentTime)
      oscillator.stop(audioCtx.currentTime + 0.1)
      
      // Second tap
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator()
        const gain2 = audioCtx.createGain()
        osc2.connect(gain2)
        gain2.connect(audioCtx.destination)
        osc2.frequency.value = 600
        gain2.gain.setValueAtTime(0.2, audioCtx.currentTime)
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08)
        osc2.start(audioCtx.currentTime)
        osc2.stop(audioCtx.currentTime + 0.08)
      }, 150)
      
    } catch (e) {
      console.log('Audio not available')
    }
  },

  // Listen for user response
  async listenForResponse() {
    try {
      const { startListening, stopListening } = await import('./zagel-voice.js')
      
      // Listen for 4 seconds
      await startListening((text) => {
        if (this.isWelcoming(text)) {
          this.enter()
          stopListening()
        }
      }, 4000)
      
    } catch (e) {
      console.error('Door listen error:', e)
    }
  },

  // Check if text is welcoming
  isWelcoming(text) {
    const welcomingWords = [
      'تعالي', 'ادخلي', 'زاجل', 'اهلا', 'هلا', 
      'come', 'hello zagel', 'yes zagel', 'come in',
      'تفضلي', 'حياك', 'welcome', 'hi zagel'
    ]
    
    const lower = text.toLowerCase()
    return welcomingWords.some(w => lower.includes(w))
  },

  // Escalation when no response
  escalate() {
    ZagelVoice.sayLoud("يااااا!! عندك رسالة! 😆")
    
    // Stronger vibration
    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 500])
    }
    
    // Final call after delay
    setTimeout(() => {
      if (this.waiting) {
        ZagelVoice.sayLoud("وينك؟ رُد علي! 😄")
        this.waiting = false
      }
    }, 3000)
  },

  // User welcomed Zagel - enter!
  enter() {
    this.waiting = false
    
    // Play door open sound
    this.playDoorOpenSound()
    
    // Notify via callback
    if (this.onEnter && this.currentMsg) {
      this.onEnter(this.currentMsg)
    }
    
    console.log('🚪 Zagel entered')
  },

  // Door open sound effect
  playDoorOpenSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      
      // Creaking door sound (simplified)
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      
      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(200, audioCtx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.5)
      
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5)
      
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      
      oscillator.start()
      oscillator.stop(audioCtx.currentTime + 0.5)
      
    } catch (e) {
      console.log('Audio not available')
    }
  },

  // Smart mode - check user mood/time before knocking
  shouldKnock(userId) {
    const hour = new Date().getHours()
    const isLateNight = hour < 6 || hour > 23
    
    if (isLateNight) {
      // Gentle knock at night
      return { gentle: true, message: "عندك رسالة (بصوت واطي) 😴" }
    }
    
    return { gentle: false }
  }
}

export default ZagelDoor
