/**
 * Zagel Core - The Brain
 * Merges: ChatGPT modularity + Our child voice + slang Arabic
 */

import { ZagelVoice } from "./zagel-voice.js";
import { ZagelAI } from "./zagel-ai.js";
import { ZagelUI } from "./zagel-ui.js";
import { ZagelIntent } from "./zagel-intent.js";
import { ZagelMemory } from "./zagel-memory.js";

export const ZagelCore = (() => {
  
  let state = {
    enabled: true,
    isProcessing: false,
    currentUser: null,
    pendingTarget: null
  };

  // Initialize
  function init(user) {
    state.currentUser = user;
    ZagelMemory.load();
    console.log('[Zagel] Initialized for:', user?.name);
  }

  // ============================================
  // Handle Incoming Message (from E7ki)
  // ============================================
  async function handleIncoming(message) {
    if (!state.enabled) return;

    const { senderName, receiverName, text, isUrgent, type = 'text' } = message;

    // 🕊️ Visual appearance
    ZagelUI.flyIn(receiverName);
    
    // 👧 Child voice greeting
    ZagelVoice.speak(
      ZagelVoice.getRandomPhrase('greeting', { name: receiverName }),
      'excited'
    );

    // ⚡ FAST MODE (Immediate - no waiting)
    const fastText = ZagelVoice.convertToSlang(senderName, receiverName, text, 'normal');
    
    setTimeout(() => {
      ZagelVoice.speak(fastText, 'normal');
    }, 800);

    // 🧠 SMART MODE (Gemini enhancement - if not urgent)
    if (!isUrgent && type !== 'quick') {
      try {
        // Show thinking state
        ZagelUI.showThinking();

        const smartText = await ZagelAI.toIndirect({
          senderName,
          receiverName,
          text,
          tone: detectTone(text)
        });

        // Convert Gemini output to slang too
        const slangSmart = ZagelVoice.makeItChildish(smartText);

        setTimeout(() => {
          ZagelVoice.speak(slangSmart, 'smart');
          ZagelUI.hideThinking();
        }, 2000);

      } catch (e) {
        console.warn('[Zagel] AI failed, using fast mode only');
        ZagelUI.hideThinking();
      }
    }

    // Update memory with emotion
    const emotion = detectEmotion(text);
    ZagelMemory.updateMemory(senderName, emotion);
    
    // Save to memory
    ZagelMemory.saveContext(senderName, {
      lastMessage: text,
      timestamp: Date.now()
    });
  }

  // ============================================
  // Handle Voice Commands (from user)
  // ============================================
  async function handleVoiceCommand(transcript) {
    if (state.isProcessing) return;
    state.isProcessing = true;

    console.log('[Zagel] Heard:', transcript);

    // Memory-based greeting
    const user = state.currentUser;
    if (user) {
      const memoryGreeting = ZagelMemory.generateMemoryReply(user.id || user.name);
      ZagelVoice.speak(memoryGreeting, 'thinking');
    } else {
      ZagelVoice.speak('لحظة خليني أفهم 🤭', 'thinking');
    }

    // 🟢 FAST INTENT (Pattern matching - no AI delay)
    const fastIntent = ZagelIntent.parseFast(transcript);

    if (fastIntent && fastIntent.confidence > 0.8) {
      await executeIntent(fastIntent);
      state.isProcessing = false;
      return;
    }

    // 🟣 AI INTENT (Gemini for complex commands)
    try {
      ZagelUI.showThinking();
      const aiIntent = await ZagelAI.extractIntent(transcript);
      await executeIntent(aiIntent);
    } catch (e) {
      ZagelVoice.speak('مش فاهمة عليك 😅 حاول تقولها بطريقة أبسط', 'confused');
    } finally {
      ZagelUI.hideThinking();
      state.isProcessing = false;
    }
  }

  // ============================================
  // Execute Intent
  // ============================================
  async function executeIntent(intent) {
    if (!intent) return;

    switch (intent.action) {
      case 'send_message':
        await handleSendMessage(intent);
        break;
        
      case 'read_messages':
        await handleReadMessages();
        break;
        
      case 'quick_reply':
        await handleQuickReply(intent);
        break;
        
      case 'go_to':
        await handleNavigation(intent);
        break;
        
      default:
        ZagelVoice.speak('مش عارفة أعمل ده 🤔 جرب تقول "زاجل قول لـ..."', 'confused');
    }
  }

  async function handleSendMessage(intent) {
    const { target, message, tone = 'normal' } = intent;
    
    // Resolve target from memory if nickname
    const resolvedTarget = ZagelMemory.resolveContact(target) || target;
    
    ZagelVoice.speak(\`حاضر 😄 رح أقول لـ \${resolvedTarget}\`, 'excited');
    
    // Send via E7ki
    sendViaE7ki(resolvedTarget, message, tone);
    
    // Confirm
    setTimeout(() => {
      ZagelVoice.speak(
        ZagelVoice.getRandomPhrase('confirmSent', { target: resolvedTarget }),
        'happy'
      );
    }, 1000);
  }

  async function handleReadMessages() {
    const unread = await fetchUnreadMessages();
    
    if (unread.length === 0) {
      ZagelVoice.speak('ما فيه رسائل جديدة يا بطل 😊', 'normal');
      return;
    }

    ZagelVoice.speak(\`عندك \${unread.length} رسائل! بقراها لك 🕊️\`, 'excited');

    for (let i = 0; i < unread.length; i++) {
      const msg = unread[i];
      const slang = ZagelVoice.convertToSlang(
        msg.sender, 
        state.currentUser?.name || 'حبيبي',
        msg.text,
        msg.urgent ? 'urgent' : 'normal'
      );
      
      await ZagelVoice.speak(slang, msg.urgent ? 'urgent' : 'normal');
      await delay(2000);
    }

    ZagelVoice.speak(ZagelVoice.getRandomPhrase('askReply'), 'question');
  }

  async function handleQuickReply(intent) {
    const { target, message = 'تمام 👍' } = intent;
    ZagelVoice.speak(message, 'happy');
    sendViaE7ki(target || 'recipient', message, 'normal');
  }

  async function handleNavigation(intent) {
    const { target } = intent;
    ZagelVoice.speak(\`روحت لـ \${target} 🚀\`, 'excited');
    // Navigation logic
  }

  function sendViaE7ki(target, message, tone) {
    const payload = {
      to: target,
      text: message,
      via: 'zagel',
      tone: tone,
      timestamp: Date.now()
    };

    // Integration with E7ki
    if (window.E7ki?.sendMessage) {
      window.E7ki.sendMessage(payload);
    } else {
      // Fallback: postMessage to parent
      window.parent.postMessage({
        type: 'zagel:send',
        payload: payload
      }, '*');
    }

    console.log('[Zagel] Sending:', payload);
  }

  // Helpers
  function detectTone(text) {
    if (text.includes('بسرعة') || text.includes('عاجل') || text.includes('الحين')) return 'urgent';
    if (text.includes('حب') || text.includes('اشتقت') || text.includes('مشتاق')) return 'romantic';
    if (text.includes('ههه') || text.includes('ضحك') || text.includes('😂')) return 'funny';
    return 'normal';
  }

  function detectEmotion(text) {
    if (/بسرعة|عاجل|ضروري|مهم/.test(text)) return 'urgent';
    if (/حب|اشتقت|قلب|عاشق/.test(text)) return 'romantic';
    if (/ههه|ضحك|😂|مزح/.test(text)) return 'funny';
    if (/حزن|وجع|مشكلة|مصيبة/.test(text)) return 'sad';
    return 'normal';
  }

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async function fetchUnreadMessages() {
    try {
      const res = await fetch('/api/e7ki/messages/unread', {
        credentials: 'include'
      });
      return await res.json();
    } catch (e) {
      return [];
    }
  }

  // Public API
  return {
    init,
    handleIncoming,
    handleVoiceCommand,
    toggle: () => { state.enabled = !state.enabled; return state.enabled; }
  };

})();
