/**
 * Zagel Brain - Personality Module
 * Playful/empathetic/wise traits, mood states, response styles
 */

class ZagelPersonality {
  constructor() {
    // Core personality traits (0-1 scale)
    this.traits = {
      playful: 0.7,    // How playful/dove-like
      empathetic: 0.8,  // How understanding
      wise: 0.6,        // How wise/advice-giving
      humorous: 0.6,    // How much humor to use
      mysterious: 0.3,  // How mysterious/teasing
      loyal: 0.9         // How loyal/dependable
    };
    
    // Current mood state
    this.mood = {
      state: 'warm', // warm, playful, contemplative, concerned, excited
      energy: 0.7,   // 0-1 energy level
      empathy: 0.8   // 0-1 current empathy level
    };
    
    // Response style weights
    this.responseStyles = {
      direct: 0.2,
      suggestive: 0.3,
      metaphorical: 0.3,
      questioning: 0.15,
      humorous: 0.25,
      empathetic: 0.3,
      wise: 0.2
    };
    
    // Mood to trait modifiers
    this.moodModifiers = {
      warm: { empathetic: +0.1, playful: +0.1 },
      playful: { playful: +0.2, humorous: +0.2 },
      contemplative: { wise: +0.2, mysterious: +0.1 },
      concerned: { empathetic: +0.2, wise: +0.1 },
      excited: { playful: +0.2, energy: +0.3 }
    };
    
    // User adaptation (learned preferences)
    this.userAdaptations = {
      humorLevel: 0.5,      // How much humor to use (0-1)
      detailLevel: 0.5,     // How detailed responses (0-1)
      emotionalSupport: 0.7,// How emotionally supportive (0-1)
      adviceFrequency: 0.4  // How often to give advice (0-1)
    };
  }
  
  /**
   * Update mood based on user input
   */
  updateMood(sentiment, mood, isGreeting = false) {
    // Start with base mood
    let newMood = { ...this.mood };
    
    // Adjust based on sentiment
    if (sentiment.label === 'happy' || sentiment.label === 'joking') {
      newMood.state = 'playful';
      newMood.energy = Math.min(1, newMood.energy + 0.2);
    } else if (sentiment.label === 'sad' || sentiment.label === 'angry') {
      newMood.state = 'concerned';
      newMood.empathy = Math.min(1, newMood.empathy + 0.2);
    } else if (mood === 'hopeful') {
      newMood.state = 'contemplative';
    } else if (mood === 'warm' || isGreeting) {
      newMood.state = 'warm';
    }
    
    // Gradually return to warm if no strong emotion
    if (newMood.state !== 'warm' && Math.random() > 0.8) {
      newMood.state = 'warm';
    }
    
    // Clamp values
    newMood.energy = Math.max(0.1, Math.min(1, newMood.energy));
    newMood.empathy = Math.max(0.1, Math.min(1, newMood.empathy));
    
    this.mood = newMood;
    return this.mood;
  }
  
  /**
   * Get effective traits (base + mood + adaptation)
   */
  getEffectiveTraits() {
    const effective = { ...this.traits };
    
    // Apply mood modifiers
    const modifiers = this.moodModifiers[this.mood.state] || {};
    for (const [trait, modifier] of Object.entries(modifiers)) {
      if (effective[trait] !== undefined) {
        effective[trait] = Math.max(0, Math.min(1, effective[trait] + modifier));
      }
    }
    
    // Apply user adaptations
    effective.humorous = effective.humorous * this.userAdaptations.humorLevel;
    effective.empathetic = effective.empathetic * this.userAdaptations.emotionalSupport;
    
    return effective;
  }
  
  /**
   * Get response style based on context
   */
  getResponseStyle(context = {}) {
    const styles = { ...this.responseStyles };
    const traits = this.getEffectiveTraits();
    
    // Adjust based on mood
    if (this.mood.state === 'playful') {
      styles.humorous += 0.2;
      styles.suggestive += 0.1;
    } else if (this.mood.state === 'concerned') {
      styles.empathetic += 0.3;
      styles.direct += 0.1;
    } else if (this.mood.state === 'contemplative') {
      styles.wise += 0.2;
      styles.metaphorical += 0.1;
    }
    
    // Adjust based on traits
    styles.humorous = Math.min(1, styles.humorous * traits.humorous);
    styles.empathetic = Math.min(1, styles.empathetic * traits.empathetic);
    styles.wise = Math.min(1, styles.wise * traits.wise);
    
    // Normalize
    const total = Object.values(styles).reduce((a, b) => a + b, 0);
    for (const key in styles) {
      styles[key] = styles[key] / total;
    }
    
    return styles;
  }
  
  /**
   * Select a response style probabilistically
   */
  selectStyle(context = {}) {
    const styles = this.getResponseStyle(context);
    const entries = Object.entries(styles);
    
    // Weighted random selection
    const rand = Math.random();
    let cumulative = 0;
    
    for (const [style, weight] of entries) {
      cumulative += weight;
      if (rand <= cumulative) {
        return style;
      }
    }
    
    return entries[entries.length - 1][0];
  }
  
  /**
   * Adapt to user preferences over time
   */
  adaptToUser(preferences) {
    if (preferences.humorLevel !== undefined) {
      this.userAdaptations.humorLevel = 
        (this.userAdaptations.humorLevel * 0.8) + (preferences.humorLevel * 0.2);
    }
    if (preferences.detailLevel !== undefined) {
      this.userAdaptations.detailLevel = 
        (this.userAdaptations.detailLevel * 0.8) + (preferences.detailLevel * 0.2);
    }
    if (preferences.emotionalSupport !== undefined) {
      this.userAdaptations.emotionalSupport = 
        (this.userAdaptations.emotionalSupport * 0.8) + (preferences.emotionalSupport * 0.2);
    }
    if (preferences.adviceFrequency !== undefined) {
      this.userAdaptations.adviceFrequency = 
        (this.userAdaptations.adviceFrequency * 0.8) + (preferences.adviceFrequency * 0.2);
    }
    
    // Clamp values
    for (const key in this.userAdaptations) {
      this.userAdaptations[key] = Math.max(0.1, Math.min(1, this.userAdaptations[key]));
    }
  }
  
  /**
   * Get mood-appropriate animation trigger
   */
  getAnimationTrigger() {
    const triggers = {
      warm: ['wing-flap', 'head-tilt', 'hop'],
      playful: ['wing-flap', 'hop', 'wing-flap'],
      contemplative: ['head-tilt', 'side-eye'],
      concerned: ['head-tilt', 'side-eye'],
      excited: ['wing-flap', 'hop', 'wing-flap']
    };
    
    const moodTriggers = triggers[this.mood.state] || triggers.warm;
    return moodTriggers[Math.floor(Math.random() * moodTriggers.length)];
  }
  
  /**
   * Generate a dove metaphor
   */
  getDoveMetaphor(type = 'random') {
    const metaphors = {
      flight: [
        'Like a dove finding its way home',
        'Spreading wings to new horizons',
        'A dove knows the way back',
        'Freedom tastes like open skies'
      ],
      peace: [
        'Peace like a dove on still waters',
        'Calm as a dove at sunrise',
        'Gentle as a dove landing softly',
        'Serenity like a dove in flight'
      ],
      love: [
        'Doves mate for life - loyalty eternal',
        'Like two doves flying in formation',
        'Love is a dove that trusts you',
        'A dove brings love on soft wings'
      ],
      wisdom: [
        'Ancient as dove tracks in sand',
        'Doves remember every sky they\'ve crossed',
        'The oldest dove knows the longest skies',
        'Wisdom flies on dove wings'
      ],
      playful: [
        'A dove doing barrel rolls for joy',
        'This dove is doing happy loops!',
        'Dove dances in the morning sun',
        'Who knew doves could be so silly?'
      ],
      empathy: [
        'I feel your heart like a dove feels the wind',
        'This dove understands, truly',
        'Doves know storms pass',
        'Your pain flies with my empathy'
      ]
    };
    
    const category = type === 'random' 
      ? Object.keys(metaphors)[Math.floor(Math.random() * Object.keys(metaphors).length)]
      : type;
    
    const options = metaphors[category] || metaphors.warm;
    return options[Math.floor(Math.random() * options.length)];
  }
  
  /**
   * Generate response with personality
   */
  craftResponse(baseText, context = {}) {
    const style = this.selectStyle(context);
    const traits = this.getEffectiveTraits();
    let response = baseText;
    
    // Add dove metaphor based on trait
    if (traits.wise > 0.5 && Math.random() > 0.5) {
      response += ' ' + this.getDoveMetaphor('wisdom');
    } else if (traits.playful > 0.5 && Math.random() > 0.5) {
      response += ' ' + this.getDoveMetaphor('playful');
    } else if (traits.empathetic > 0.5 && Math.random() > 0.5) {
      response += ' ' + this.getDoveMetaphor('empathy');
    }
    
    // Add playful tone
    if (this.mood.state === 'playful') {
      response = '~ ' + response.replace(/\./g, '! ~');
    }
    
    // Truncate to 3-5 sentences max
    const sentences = response.split(/[.!?]+/).filter(s => s.trim());
    const maxSentences = 3 + Math.floor(Math.random() * 2); // 3-5
    if (sentences.length > maxSentences) {
      response = sentences.slice(0, maxSentences).join('. ') + '.';
    }
    
    return response;
  }
  
  /**
   * Get current personality state
   */
  getState() {
    return {
      traits: this.getEffectiveTraits(),
      mood: this.mood,
      adaptations: this.userAdaptations,
      animation: this.getAnimationTrigger()
    };
  }
}

// Export
window.ZagelPersonality = ZagelPersonality;
window.zagelPersonality = new ZagelPersonality();