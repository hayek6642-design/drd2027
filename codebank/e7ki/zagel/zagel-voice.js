/**
 * Zagel Voice - Child Girl Personality + Slang Arabic
 */

export const ZagelVoice = (() => {

  let childVoice = null;
  let synth = window.speechSynthesis;

  // Initialize voice
  function init() {
    const loadVoices = () => {
      const voices = synth.getVoices();
      
      // Priority: Arabic female child voice
      childVoice = voices.find(v => 
        (v.name.includes('Google') && v.lang.includes('ar')) ||
        (v.name.includes('Laila') && v.lang.includes('ar')) ||
        (v.name.includes('Safaa') && v.lang.includes('ar')) ||
        (v.lang === 'ar-SA' && v.name.includes('Female'))
      );

      if (!childVoice) {
        childVoice = voices.find(v => v.lang.includes('ar'));
      }

      console.log('[ZagelVoice] Selected:', childVoice?.name || 'Default');
    };

    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
    loadVoices();
  }

  // ============================================
  // Slang Phrases Database
  // ============================================
  const phrases = {
    greeting: [
      'هلا والله! أنا زاجل جاهزة 🕊️',
      'هاي! زاجل هنا، وش تبي تسوي؟ 👋',
      'أنا موجودة! قول يا زاجل وأنا حاضرة 💕',
      'هلا فيك! وش فيه رسايل؟ 🕊️',
      'زاجل جت! وش تبي؟ 😊'
    ],
    
    confirmSent: [
      'تمام! وصلت الرسالة 💌',
      'على راسي! راح أوصلها الحين 🕊️',
      'حاضر يا بطل! راح أنقلها 💪',
      'تم! زاجل مشت 🚀',
      'وصلت! 🎉'
    ],
    
    askReply: [
      'وش ترد عليه؟ 🤔',
      'تبي ترد شي؟ 💭',
      'وش تقول له؟ 📝',
      'عندك رد؟ 🕊️'
    ],
    
    thinking: [
      'لحظة خليني أفهم 🤭',
      'ثانية بفكر... 💭',
      'هالحين... ⏳',
      'خليني أشوف... 👀'
    ],
    
    confused: [
      'مش فاهمة عليك 😅',
      'ما فهمت! عيدها بطريقة ثانية؟ 🤔',
      'وش تقصد؟ شرح لي أكثر 💭',
      'عيدها يا بطل، ما واضحة 😊'
    ]
  };

  function getRandomPhrase(category, vars = {}) {
    const list = phrases[category] || phrases.greeting;
    let text = list[Math.floor(Math.random() * list.length)];
    
    // Replace variables
    Object.keys(vars).forEach(key => {
      text = text.replace(\`{\${key}}\`, vars[key]);
    });
    
    return text;
  }

  // ============================================
  // Convert to Slang (العامية)
  // ============================================
  function convertToSlang(sender, receiver, message, tone = 'normal') {
    
    // Templates for different tones
    const templates = {
      normal: [
        'يا \${receiver}! \${sender} يقولك: "\${message}"',
        'هلا \${receiver}! \${sender} قال: "\${message}"',
        'يا \${receiver}! وصلتك رسالة من \${sender}: "\${message}" 🕊️'
      ],
      
      urgent: [
        'يا \${receiver}! \${sender} يستنك بسرعة: "\${message}" 🚨',
        'أسرع يا \${receiver}! \${sender} قال: "\${message}"',
        'يا \${receiver}! رسالة مهمة من \${sender}: "\${message}" ⚡'
      ],
      
      romantic: [
        'يا \${receiver}! \${sender} يقولك بكل حب: "\${message}" ❤️',
        'حبيبي \${receiver}! \${sender} مشتاقلك ويقول: "\${message}" 🥰',
        'يا \${receiver}! رسالة حلوة من \${sender}: "\${message}" 💕'
      ],
      
      funny: [
        'يا \${receiver}! \${sender} يضحك ويقول: "\${message}" 😂',
        'ههه يا \${receiver}! \${sender} يمزح: "\${message}" 🤣',
        'يا \${receiver}! \${sender} قال شي يضحك: "\${message}" 😆'
      ]
    };

    // Convert message words to slang
    let slangMsg = message
      .replace(/أنا/g, 'أنا')
      .replace(/هل/g, 'وش')
      .replace(/لماذا/g, 'ليش')
      .replace(/كيف حالك/g, 'كيفك')
      .replace(/جيد/g, 'تمام')
      .replace(/سيء/g, 'مو حلو')
      .replace(/سريع/g, 'بسرعة')
      .replace(/بطيء/g, 'بطيء')
      .replace(/أحبك/g, 'أحبك ❤️')
      .replace(/شكرا/g, 'شكراً يا حبيب');

    const templateList = templates[tone] || templates.normal;
    const template = templateList[Math.floor(Math.random() * templateList.length)];

    return eval(\`\\\`\${template}\\\`\`);
  }

  // Make Gemini output more childish/fun
  function makeItChildish(text) {
    return text
      .replace(/يقول/g, 'يقولك')
      .replace(/رسالة/g, 'رسايلة 🕊️')
      .replace(/مستلم/g, 'وصلتني')
      + ' 😊';
  }

  // ============================================
  // Speak with Child Voice
  // ============================================
  function speak(text, emotion = 'normal') {
    return new Promise((resolve) => {
      if (!synth) {
        console.log('[Zagel]:', text);
        resolve();
        return;
      }

      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Child girl settings
      utterance.lang = 'ar-SA';
      utterance.voice = childVoice;
      
      // Emotion adjustments
      switch(emotion) {
        case 'excited':
        case 'happy':
          utterance.pitch = 1.7;
          utterance.rate = 1.2;
          break;
        case 'thinking':
          utterance.pitch = 1.4;
          utterance.rate = 0.9;
          break;
        case 'urgent':
          utterance.pitch = 1.5;
          utterance.rate = 1.3;
          break;
        case 'confused':
          utterance.pitch = 1.3;
          utterance.rate = 0.8;
          break;
        case 'smart':
          utterance.pitch = 1.5;
          utterance.rate = 1.0;
          break;
        default: // normal
          utterance.pitch = 1.6;
          utterance.rate = 1.1;
      }

      utterance.volume = 0.95;

      utterance.onend = resolve;
      utterance.onerror = resolve;

      synth.speak(utterance);
    });
  }

  // Initialize on load
  init();

  return {
    speak,
    getRandomPhrase,
    convertToSlang,
    makeItChildish,
    init
  };

})();
