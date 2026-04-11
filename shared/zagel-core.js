// ===============================
// 🧠 ZAGEL OS - CORE BRAIN v2.0
// ===============================
// Main command router and agent coordinator
// Integrated with ACC (Asset Core Controller) & E7ki

import { ZagelVoice } from './zagel-voice.js'
import { ZagelDoor } from './zagel-door.js'
import { detectIntent } from './zagel-intents.js'
import { detectEmotionFast } from './zagel-emotion.js'
import { updateMemory, getUserContext } from './zagel-memory.js'
import { getPersonalityResponse } from './zagel-personality.js'

// Try to import ACC (may not be available in all contexts)
let AssetCore, TransactionBridge, ServiceManager, AuthCore
try {
  AssetCore = (await import('../acc/asset-core.js')).default || (await import('../acc/asset-core.js'))
  TransactionBridge = (await import('../acc/transaction-bridge.js')).default || (await import('../acc/transaction-bridge.js'))
  ServiceManager = (await import('../service-manager.js')).default || (await import('../service-manager.js'))
  AuthCore = (await import('../auth-core.js')).default || (await import('../auth-core.js'))
} catch (e) {
  console.warn('[Zagel] ACC modules not available, using mock implementations')
}

// ===============================
// ⚡ Illusion of Speed (UX Pattern)
// ===============================

export function illusionDelay(cb, delay = 800, loadingText = "ثواني يا بطل 😄...") {
  ZagelVoice.speak(loadingText)
  
  return new Promise(resolve => {
    setTimeout(async () => {
      const result = await cb()
      resolve(result)
    }, delay)
  })
}

// ===============================
// 🤖 Agent Registry
// ===============================

const Agents = {
  
  // 🔹 Codes Agent
  async checkCodes(userId) {
    return illusionDelay(async () => {
      try {
        const assets = await AssetCore.getAssets(userId)
        const codes = assets.filter(a => a.type === 'code' || a.type === 'CO')
        ZagelVoice.speak(`عندك الآن ${codes.length} كود 😄`)
        return { success: true, count: codes.length }
      } catch (e) {
        ZagelVoice.speak("ما قدرت أجيب الأكواد 😅")
        return { error: e.message }
      }
    })
  },

  // 🔹 Gold Agent
  async transferGold(userId, intent) {
    if (!intent.target || !intent.amount) {
      ZagelVoice.speak("لمن وكم ذهب تبي ترسل؟ 😄")
      return { success: false, error: 'missing_params' }
    }
    
    return illusionDelay(async () => {
      try {
        const result = await TransactionBridge.transfer({
          from: userId,
          to: intent.target,
          type: 'gold',
          amount: intent.amount,
          reason: intent.reason || 'Zagel voice transfer'
        })
        
        if (result.success) {
          ZagelVoice.speak(`تم إرسال ${intent.amount} ذهب لـ ${intent.target} 😄`)
        } else {
          ZagelVoice.speak(`ما قدرت أرسل، ${result.error} 😅`)
        }
        return result
      } catch (e) {
        ZagelVoice.speak("خطأ في التحويل 😅")
        return { error: e.message }
      }
    }, 1200)
  },

  // 🔹 Silver Agent
  async transferSilver(userId, intent) {
    if (!intent.target || !intent.amount) {
      ZagelVoice.speak("لمن وكم فضة تبي ترسل؟ 😄")
      return { success: false, error: 'missing_params' }
    }

    return illusionDelay(async () => {
      try {
        const result = await TransactionBridge.transfer({
          from: userId,
          to: intent.target,
          type: 'silver',
          amount: intent.amount
        })
        ZagelVoice.speak(`تم إرسال ${intent.amount} فضة 😄`)
        return result
      } catch (e) {
        ZagelVoice.speak("خطأ في التحويل 😅")
        return { error: e.message }
      }
    })
  },

  // 🔹 App Agent
  async openApp(intent) {
    if (!intent.appName) {
      ZagelVoice.speak("اي تطبيق تبي تفتح؟ 😄")
      return { success: false }
    }
    
    try {
      const opened = await ServiceManager.launch(intent.appName)
      if (opened) {
        ZagelVoice.speak("فتحته لك 😄")
      } else {
        ZagelVoice.speak("ما لقيت التطبيق، تأكد من الاسم 😅")
      }
      return { success: opened }
    } catch (e) {
      ZagelVoice.speak("خطأ في فتح التطبيق 😅")
      return { error: e.message }
    }
  },

  // 🔹 Balance Agent (Check all assets)
  async checkBalance(userId) {
    return illusionDelay(async () => {
      try {
        const assets = await AssetCore.getAssets(userId)
        
        const gold = assets.filter(a => a.type === 'gold').reduce((sum, a) => sum + (a.amount || 1), 0)
        const silver = assets.filter(a => a.type === 'silver').reduce((sum, a) => sum + (a.amount || 1), 0)
        const codes = assets.filter(a => a.type === 'code' || a.type === 'CO').length
        
        ZagelVoice.speak(`رصيدك: ${gold} ذهب، ${silver} فضة، و${codes} كود 😄`)
        return { gold, silver, codes }
      } catch (e) {
        ZagelVoice.speak("ما قدرت أحسب رصيدك 😅")
        return { error: e.message }
      }
    })
  },

  // 🔹 Weather Agent
  async getWeather(location = null) {
    ZagelVoice.speak("لحظة أشوف الطقس 😄")
    
    try {
      const lat = location?.lat || 25.2048  // Dubai default
      const lon = location?.lon || 55.2708
      
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
      )
      const data = await res.json()
      const temp = data.current_weather.temperature
      
      const comments = {
        hot: temp > 35 ? "الجو حار اليوم 🥵" : null,
        nice: temp > 20 && temp < 30 ? "الجو جميل ☀️" : null,
        cold: temp < 15 ? "الجو بارد 🧥" : null
      }
      
      const comment = comments.hot || comments.nice || comments.cold || ""
      ZagelVoice.speak(`درجة الحرارة ${temp}° ${comment}`)
      
      return { temp, condition: data.current_weather.weathercode }
    } catch (e) {
      ZagelVoice.speak("ما قدرت أجيب الطقس، تأكد من الاتصال 😅")
      return { error: 'fetch_failed' }
    }
  },

  // 🔹 Call Agent
  async makeCall(intent) {
    if (!intent.phone && !intent.contact) {
      ZagelVoice.speak("مين تبي تتصل فيه؟ 😄")
      return { success: false }
    }
    
    try {
      // Try Capacitor plugin first
      try {
        const { CallNumber } = await import('@capacitor-community/call-number')
        await CallNumber.call({
          number: intent.phone || getContactPhone(intent.contact),
          bypassAppChooser: true
        })
        ZagelVoice.speak("اتصلت 😄")
        return { success: true }
      } catch (e) {
        // Fallback to tel: link
        window.location.href = `tel:${intent.phone}`
        ZagelVoice.speak("فتحت لك التطبيق 😄")
        return { success: true, method: 'fallback' }
      }
    } catch (e) {
      ZagelVoice.speak("ما قدرت أتصل 😅")
      return { error: e.message }
    }
  },

  // 🔹 Math Agent (Safe evaluation)
  async calculate(intent) {
    try {
      const expression = intent.expression.replace(/[^0-9+\-*/().]/g, '')
      const result = Function('"use strict"; return (' + expression + ')')(')
      ZagelVoice.speak(`الناتج هو ${result} 😄`)
      return { result }
    } catch (e) {
      ZagelVoice.speak("ما فهمت العملية الحسابية 😅")
      return { error: 'invalid_expression' }
    }
  },

  // 🔹 Chat Agent (Fallback)
  async chat(text, userId) {
    try {
      const personality = getPersonalityResponse(userId, text)
      ZagelVoice.speak(personality)
      return { type: 'chat', response: personality }
    } catch (e) {
      ZagelVoice.speak("أممم، معك حق! 😄")
      return { type: 'chat' }
    }
  }
}

// ===============================
// 🎯 Command Router
// ===============================

export async function handleZagelCommand(text, userId = null) {
  // Get authenticated user
  userId = userId || (AuthCore?.getState?.().userId)
  if (!userId) {
    ZagelVoice.speak("عفواً، لازم تسجل دخول أولاً 😅")
    return { error: 'not_authenticated' }
  }

  console.log('🎤 Zagel heard:', text)

  // 🧠 Context & Emotion Analysis
  const emotion = detectEmotionFast(text)
  const context = getUserContext(userId)
  updateMemory(userId, { text, emotion, timestamp: Date.now() })

  // 🎯 Intent Detection (Hybrid: Rules + AI)
  const intent = detectIntent(text, context)
  console.log('🎯 Intent:', intent.type, intent)

  // 🎭 Personality Check (Proactive suggestions)
  if (context.suggestions?.length > 0 && Math.random() > 0.7) {
    const suggestion = context.suggestions[0]
    ZagelVoice.softSay(`أقترح ${suggestion} 😄`)
  }

  // 🚀 Route to Agent
  try {
    switch (intent.type) {
      case 'CODES_CHECK':
        return await Agents.checkCodes(userId)
        
      case 'GOLD_TRANSFER':
        return await Agents.transferGold(userId, intent)
        
      case 'SILVER_TRANSFER':
        return await Agents.transferSilver(userId, intent)
        
      case 'BALANCE_CHECK':
        return await Agents.checkBalance(userId)
        
      case 'OPEN_APP':
        return await Agents.openApp(intent)
        
      case 'WEATHER':
        return await Agents.getWeather(intent.location)
        
      case 'CALL':
        return await Agents.makeCall(intent)
        
      case 'MATH':
        return await Agents.calculate(intent)
        
      case 'MULTI_ACTION':
        return await handleMultiAction(userId, intent.actions)
        
      default:
        return await Agents.chat(text, userId)
    }
  } catch (error) {
    console.error('[Zagel] Agent error:', error)
    ZagelVoice.speak("صار خطأ، جرب مرة ثانية 😅")
    return { error: error.message }
  }
}

// ===============================
// 🔥 Multi-Action Execution
// ===============================

async function handleMultiAction(userId, actions) {
  ZagelVoice.speak("تمام، بنفذ لك الأوامر بالترتيب 😄")
  
  const results = []
  for (const action of actions) {
    const result = await handleZagelCommand(action.text, userId)
    results.push(result)
    // Small delay between actions
    await new Promise(r => setTimeout(r, 500))
  }
  
  ZagelVoice.speak("خلصت كل شي! 🎉")
  return { multi: true, results }
}

// ===============================
// 🚪 Door System Integration
// ===============================

export function ZagelNotify(msg) {
  // Use door system for incoming messages
  ZagelDoor.startKnocking(msg)
}

// Initialize door system
ZagelDoor.onEnter = (msg) => {
  const relation = getRelation(msg.sender)
  ZagelVoice.sayLoud(`كيفك؟ 😄 ${relation} بيقول: ${msg.text}`)
}

// ===============================
// 🎤 Voice Interface
// ===============================

export async function startZagelListening() {
  const { startListening } = await import('./zagel-voice.js')
  
  await startListening((text) => {
    handleZagelCommand(text)
  })
}

export async function stopZagelListening() {
  const { stopListening } = await import('./zagel-voice.js')
  await stopListening()
}

// ===============================
// 🎨 UI Widget
// ===============================

export function initZagelWidget() {
  const widget = document.createElement('div')
  widget.id = 'zagel-widget'
  widget.innerHTML = `
    <style>
      #zagel-orb {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        z-index: 9999;
        transition: all 0.3s;
        font-size: 24px;
      }
      #zagel-orb:hover { transform: scale(1.1); }
      #zagel-orb.listening { 
        animation: pulse 1.5s infinite;
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
      }
      #zagel-tooltip {
        position: fixed;
        bottom: 90px;
        right: 20px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 15px;
        border-radius: 8px;
        font-size: 12px;
        display: none;
        max-width: 200px;
      }
    </style>
    <div id="zagel-orb">🕊️</div>
    <div id="zagel-tooltip">اضغط وقول "يا زاجل"</div>
  `
  
  document.body.appendChild(widget)
  
  const orb = document.getElementById('zagel-orb')
  const tooltip = document.getElementById('zagel-tooltip')
  let isListening = false
  
  orb.addEventListener('mouseenter', () => tooltip.style.display = 'block')
  orb.addEventListener('mouseleave', () => tooltip.style.display = 'none')
  
  orb.addEventListener('click', async () => {
    if (!isListening) {
      orb.classList.add('listening')
      isListening = true
      await startZagelListening()
    } else {
      orb.classList.remove('listening')
      isListening = false
      await stopZagelListening()
    }
  })
}

// ===============================
// 🔧 Helper Functions
// ===============================

function getContactPhone(contact) {
  // Map contact names to phone numbers (from user's contacts)
  const contactMap = {
    'wife': '0501234567',
    'son': '0509876543',
    'daughter': '0505555555',
    'friend': '0502222222'
  }
  return contactMap[contact] || contact
}

function getRelation(sender) {
  // Map sender to relation (from user's contacts)
  const relations = {
    'wife': 'زوجتك',
    'son': 'ابنك',
    'daughter': 'بنتك',
    'friend': 'صديقك'
  }
  return relations[sender] || sender
}

// Auto-init widget on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'complete') {
    initZagelWidget()
  } else {
    document.addEventListener('DOMContentLoaded', initZagelWidget)
  }
}

export default {
  handleZagelCommand,
  startZagelListening,
  stopZagelListening,
  initZagelWidget,
  ZagelNotify,
  illusionDelay
}
