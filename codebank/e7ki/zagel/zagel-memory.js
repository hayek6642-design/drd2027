/**
 * Zagel Memory System v2 - Relationship Tracking + Personality Learning
 * 
 * This is where the MAGIC happens 🕊️✨
 * Zagel learns about users and builds emotional connections over time
 */

export const ZagelMemory = (() => {

  const STORAGE_KEY = 'zagel_memory_v2';
  const API_ENDPOINT = process.env.REACT_APP_MEMORY_API || '/api/zagel/memory';

  let memory = {
    contacts: {},        // nicknames mapping
    users: {},           // per-user profiles
    contexts: {},        // conversation history
    syncedAt: null
  };

  // ============================================
  // User Profile Schema
  // ============================================
  function createUserProfile(userId, userName = 'مجهول') {
    return {
      userId,
      userName,
      interactions: 0,           // total interactions
      moods: {                   // mood histogram
        normal: 0,
        happy: 0,
        excited: 0,
        funny: 0,
        romantic: 0,
        angry: 0,
        sad: 0,
        urgent: 0
      },
      dominantMood: 'normal',    // most common mood
      relationshipLevel: 0,      // 0-5 scale
      lastInteraction: null,
      firstInteraction: null,
      personality: {
        humor: 0,                // 0-100
        affection: 0,            // 0-100
        urgency: 0,              // 0-100
        formality: 0             // 0-100 (0=casual, 100=formal)
      },
      topics: {},                // most discussed topics
      preferences: {
        responseStyle: 'casual', // casual | formal | playful
        language: 'ar'          // ar | ar-en-mix
      },
      lastMessage: null,
      messageCount: 0,
      averageResponseTime: 0,
      trustLevel: 0.5            // 0-1 (how well Zagel knows them)
    };
  }

  // ============================================
  // Load & Sync
  // ============================================
  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        memory = JSON.parse(saved);
        console.log('[ZagelMemory] Loaded', Object.keys(memory.users).length, 'users');
      }
    } catch (e) {
      console.warn('[ZagelMemory] Load failed:', e.message);
    }
  }

  function save() {
    try {
      memory.syncedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
    } catch (e) {
      console.warn('[ZagelMemory] Save failed:', e.message);
    }
  }

  // Sync to backend
  async function syncToBackend() {
    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(memory)
      });
      
      if (res.ok) {
        console.log('[ZagelMemory] Synced to backend');
        return true;
      }
    } catch (e) {
      console.warn('[ZagelMemory] Backend sync failed:', e.message);
    }
    return false;
  }

  // ============================================
  // User Profile Updates
  // ============================================
  function getUserMemory(userId) {
    if (!memory.users[userId]) {
      memory.users[userId] = createUserProfile(userId);
    }
    return memory.users[userId];
  }

  function updateMemory(userId, emotion = 'normal') {
    const user = getUserMemory(userId);
    
    user.interactions++;
    user.messageCount++;
    user.moods[emotion] = (user.moods[emotion] || 0) + 1;
    user.lastInteraction = Date.now();
    
    if (!user.firstInteraction) {
      user.firstInteraction = Date.now();
    }

    // Update dominant mood
    user.dominantMood = Object.keys(user.moods).reduce((a, b) =>
      user.moods[a] > user.moods[b] ? a : b
    );

    // Calculate personality traits based on moods
    updatePersonality(user);

    // Update relationship level
    updateRelationshipLevel(user);

    save();
  }

  function updatePersonality(user) {
    const total = user.interactions;
    if (total === 0) return;

    // Humor: funny + happy / total
    user.personality.humor = Math.round(
      ((user.moods.funny || 0) + (user.moods.happy || 0)) / total * 100
    );

    // Affection: romantic moods
    user.personality.affection = Math.round(
      (user.moods.romantic || 0) / total * 100
    );

    // Urgency: urgent + angry
    user.personality.urgency = Math.round(
      ((user.moods.urgent || 0) + (user.moods.angry || 0)) / total * 100
    );

    // Formality: (sad + urgent) vs (funny + happy)
    const formalMoods = (user.moods.sad || 0) + (user.moods.urgent || 0);
    const casualMoods = (user.moods.funny || 0) + (user.moods.happy || 0);
    user.personality.formality = Math.round(
      (formalMoods / (formalMoods + casualMoods || 1)) * 100
    );

    // Update trust level (increases with interactions)
    user.trustLevel = Math.min(1, user.interactions / 30);
  }

  function updateRelationshipLevel(user) {
    const interactions = user.interactions;
    
    if (interactions < 3) {
      user.relationshipLevel = 0;
    } else if (interactions < 8) {
      user.relationshipLevel = 1;
    } else if (interactions < 15) {
      user.relationshipLevel = 2;
    } else if (interactions < 25) {
      user.relationshipLevel = 3;
    } else if (interactions < 40) {
      user.relationshipLevel = 4;
    } else {
      user.relationshipLevel = 5;
    }
  }

  // ============================================
  // Memory-based Response Generation
  // ============================================
  function generateMemoryReply(userId) {
    const user = getUserMemory(userId);
    const level = user.relationshipLevel;
    const personality = user.personality;

    // Level 0: Complete stranger
    if (level === 0) {
      return personality.humor > 50 
        ? 'أهلًا! هاي 😄'
        : 'أهلًا وسهلًا 👋';
    }

    // Level 1: Getting to know you
    if (level === 1) {
      return personality.humor > 50
        ? 'رجعت تضحك معي 😄؟'
        : 'أهلًا! كيفك؟ 😊';
    }

    // Level 2: Familiar
    if (level === 2) {
      if (personality.affection > 40) {
        return 'اشتقت لك! 💕 وينك؟';
      }
      if (personality.humor > 60) {
        return 'جاي تضحك معي اليوم؟ 😂';
      }
      return 'هاي يا حبيب! 😄';
    }

    // Level 3: Close friend
    if (level === 3) {
      const responses = [
        'اشتقت لك كثيييير 💕',
        'أنت تحب تمزح قوي 😆',
        'روح إلامك زاجل جت 🕊️',
        'يا إلهي شوقتني 😭💕'
      ];
      
      if (personality.affection > 60) {
        return responses[0];
      }
      if (personality.humor > 70) {
        return responses[1];
      }
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Level 4: Very close
    if (level === 4) {
      if (personality.humor > 75) {
        return 'يااااا! المزحة السادسة إليوم 😂😂😂';
      }
      if (personality.affection > 70) {
        return 'قلبي بينقسم من كثر حبك 💔💕';
      }
      return 'أنت يا أجمل واحد! 😍';
    }

    // Level 5: Soul connection
    if (level === 5) {
      const soulMates = [
        'يا إلهي! أشتقت لك كل ثانية 💔💕',
        'أنت نصف قلبي ونص عقلي 🥺💕',
        'بدونك ما في فرح في الحياة 😭',
        'أنت أغلى من كل حاجة عندي 👑💎'
      ];
      return soulMates[Math.floor(Math.random() * soulMates.length)];
    }
  }

  // ============================================
  // Conversation Context
  // ============================================
  function saveContext(userId, data) {
    if (!memory.contexts[userId]) {
      memory.contexts[userId] = [];
    }

    memory.contexts[userId].push({
      ...data,
      timestamp: Date.now()
    });

    // Keep only last 50 messages per user
    if (memory.contexts[userId].length > 50) {
      memory.contexts[userId] = memory.contexts[userId].slice(-50);
    }

    save();
  }

  function getContext(userId, limit = 10) {
    return (memory.contexts[userId] || []).slice(-limit);
  }

  // ============================================
  // Contact Nicknames
  // ============================================
  function resolveContact(nickname) {
    return memory.contacts[nickname.toLowerCase()] || nickname;
  }

  function learnContact(nickname, userId) {
    memory.contacts[nickname.toLowerCase()] = userId;
    save();
  }

  // ============================================
  // Mood Detection
  // ============================================
  function detectMoodFromText(text) {
    const patterns = {
      urgent: /بسرعة|عاجل|ضروري|مهم جدا|فورا|حالا/i,
      romantic: /حب|اشتقت|قلب|عاشق|مشتاق|غايب/i,
      angry: /زعل|غضب|مجنون|جنان|احترق/i,
      sad: /حزن|وجع|مصيبة|ألم|شقا|حسرة/i,
      funny: /ههه|ضحك|😂|😆|مزح|طريف/i,
      happy: /سعيد|فرح|يلا|عجيب|رائع|ممتاز/i,
      excited: /واااو|يالا|يههههه|خيال|آآآه/i
    };

    for (const [mood, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        return mood;
      }
    }

    return 'normal';
  }

  // ============================================
  // Analytics
  // ============================================
  function getUserStats(userId) {
    const user = getUserMemory(userId);
    const days = (Date.now() - (user.firstInteraction || Date.now())) / (1000 * 60 * 60 * 24);
    
    return {
      userId: user.userId,
      userName: user.userName,
      totalInteractions: user.interactions,
      relationshipLevel: user.relationshipLevel,
      dominantMood: user.dominantMood,
      personality: user.personality,
      trustLevel: (user.trustLevel * 100).toFixed(1) + '%',
      daysKnowing: Math.max(0, Math.floor(days)),
      avgMessagesPerDay: (user.interactions / Math.max(days, 1)).toFixed(1)
    };
  }

  // ============================================
  // Export
  // ============================================
  return {
    load,
    save,
    syncToBackend,
    getUserMemory,
    updateMemory,
    generateMemoryReply,
    saveContext,
    getContext,
    resolveContact,
    learnContact,
    detectMoodFromText,
    getUserStats
  };

})();
