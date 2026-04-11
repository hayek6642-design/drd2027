/**
 * Zagel Intent - Fast Pattern Matching (No AI delay)
 */

export const ZagelIntent = (() => {

  // Fast regex patterns for common commands
  const patterns = {
    send_message: [
      /قول\s+(?:لـ?|لي\s+)?(\w+)/i,
      /قولي\s+(?:لـ?|لي\s+)?(\w+)/i,
      /ابعت\s+(?:لـ?|لي\s+)?(\w+)/i,
      /رسل\s+(?:لـ?|لي\s+)?(\w+)/i,
      /خبر\s+(?:لـ?|لي\s+)?(\w+)/i
    ],
    
    read_messages: [
      /اقر[أا]?\s+رس[أا]?[يي]ل[يي]/i,
      /عند[يي]\s+رس[أا]?[يي]ل[يي]/i,
      /وش\s+عند[يي]/i,
      /جديد/i
    ],
    
    quick_reply: [
      /رد\s+عل[يى]/i,
      /قول\s+له\s+تمام/i,
      /قول\s+له\s+حاضر/i
    ],
    
    go_to: [
      /روح\s+(?:لـ?|لي\s+)?(\w+)/i,
      /اذهب\s+(?:لـ?|إلى\s+)?(\w+)/i,
      /افتح\s+(\w+)/i
    ]
  };

  function parseFast(text) {
    const lower = text.toLowerCase().trim();

    // Check send message
    for (const pattern of patterns.send_message) {
      const match = text.match(pattern);
      if (match) {
        const target = match[1];
        const message = extractMessage(text);
        return {
          action: 'send_message',
          target: target,
          message: message,
          tone: detectTone(text),
          confidence: 0.9
        };
      }
    }

    // Check read messages
    for (const pattern of patterns.read_messages) {
      if (pattern.test(text)) {
        return {
          action: 'read_messages',
          confidence: 0.95
        };
      }
    }

    // Check quick reply
    for (const pattern of patterns.quick_reply) {
      if (pattern.test(text)) {
        return {
          action: 'quick_reply',
          message: 'تمام 👍',
          confidence: 0.9
        };
      }
    }

    // Check navigation
    for (const pattern of patterns.go_to) {
      const match = text.match(pattern);
      if (match) {
        return {
          action: 'go_to',
          target: match[1],
          confidence: 0.85
        };
      }
    }

    // No match
    return null;
  }

  function extractMessage(text) {
    // Extract after common markers
    const markers = ['أن', 'إنه', 'إن', 'بأن', 'أنه', 'انه'];
    
    for (const marker of markers) {
      const idx = text.indexOf(marker);
      if (idx !== -1) {
        return text.substring(idx + marker.length).trim();
      }
    }

    // Fallback: take last 6 words
    const words = text.split(/\s+/);
    if (words.length > 3) {
      return words.slice(-6).join(' ');
    }

    return text;
  }

  function detectTone(text) {
    if (/بسرعة|عاجل|الحين|فورا|ضروري/.test(text)) return 'urgent';
    if (/حب|اشتقت|مشتاق|قلبي|حياتي/.test(text)) return 'romantic';
    if (/ههه|ضحك|😂|🤣|مزح/.test(text)) return 'funny';
    return 'normal';
  }

  return {
    parseFast
  };

})();
