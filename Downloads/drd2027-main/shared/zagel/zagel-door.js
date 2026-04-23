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
  onEnter: null,

  startKnocking(msg) {
    this.currentMsg = msg
    this.attempts = 0
    this.waiting = true
    
    console.log('🚪 Zagel knocking...')
    this.knock()
  },

  knock() {
    this.attempts++
    this.playKnockSound()
    
    const greetings = [
      "في حد هنا؟ 😄",
      "أنا زاجل... حد موجود؟ 😊",
      "ياااا... في حد؟ 😅"
    ]
    
    ZagelVoice.softSay(greetings[this.attempts - 1] || greetings[2])
    this.listenForResponse()
    
    setTimeout(() => {
      if (this.waiting && this.attempts < this.maxAttempts) {
        this.knock()
      } else if (this.waiting) {
        this.escalate()
      }
    }, 5000)
  },

  playKnockSound() {
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
      
    } catch (e) {
      console.log('Audio not available')
    }
  },

  async listenForResponse() {
    try {
      const { startListening } = await import('./zagel-voice.js')
      await startListening((text) => {
        if (this.isWelcoming(text)) {
          this.enter()
        }
      }, 4000)
    } catch (e) {
      console.error('Door listen error:', e)
    }
  },

  isWelcoming(text) {
    const welcomingWords = [
      'تعالي', 'ادخلي', 'زاجل', 'اهلا', 'هلا', 
      'come', 'hello zagel', 'yes zagel', 'come in'
    ]
    
    const lower = text.toLowerCase()
    return welcomingWords.some(w => lower.includes(w))
  },

  escalate() {
    ZagelVoice.sayLoud("يااااا!! عندك رسالة! 😆")
    
    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 500])
    }
    
    setTimeout(() => {
      if (this.waiting) {
        ZagelVoice.sayLoud("وينك؟ رُد علي! 😄")
        this.waiting = false
      }
    }, 3000)
  },

  enter() {
    this.waiting = false
    this.playDoorOpenSound()
    
    if (this.onEnter && this.currentMsg) {
      this.onEnter(this.currentMsg)
    }
    
    console.log('🚪 Zagel entered')
  },

  playDoorOpenSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
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

  shouldKnock(userId) {
    const hour = new Date().getHours()
    const isLateNight = hour < 6 || hour > 23
    
    if (isLateNight) {
      return { gentle: true, message: "عندك رسالة (بصوت واطي) 😴" }
    }
    
    return { gentle: false }
  }
}
