/**
 * Instruction Parser
 * Converts natural language instructions into structured, actionable rules
 */

import { logger } from '../utils/logger';

export class InstructionParser {
  constructor() {
    this.ruleTemplates = {
      response_style: this.parseResponseStyleRule.bind(this),
      user_fact: this.parseUserFactRule.bind(this),
      focus_topic: this.parseFocusTopicRule.bind(this),
      general_preference: this.parseGeneralPreferenceRule.bind(this),
      general_memory: this.parseGeneralMemoryRule.bind(this)
    };
  }

  /**
   * Parse instruction details into structured rule
   */
  parse(instructionDetails, rawText) {
    const { category } = instructionDetails;
    
    logger.log('Parsing instruction:', category, instructionDetails);
    
    const parser = this.ruleTemplates[category] || this.parseGenericRule;
    return parser(instructionDetails, rawText);
  }

  parseResponseStyleRule(details, rawText) {
    const { value, customValue } = details;
    
    const rule = {
      id: generateRuleId(),
      type: 'behavior',
      category: 'response_style',
      condition: {
        context: 'always'
      },
      action: {
        modifyResponse: true,
        style: value,
        customInstructions: customValue || null
      },
      priority: 100,
      createdAt: Date.now(),
      rawText: rawText
    };

    // Add specific modifiers based on style
    switch (value) {
      case 'short':
        rule.action.maxLength = 100;
        rule.action.tone = 'concise';
        break;
      case 'detailed':
        rule.action.minLength = 200;
        rule.action.includeExamples = true;
        break;
      case 'funny':
        rule.action.tone = 'humorous';
        rule.action.includeJokes = true;
        break;
      case 'serious':
        rule.action.tone = 'formal';
        rule.action.avoidEmojis = true;
        break;
      case 'poetic':
        rule.action.tone = 'poetic';
        rule.action.useMetaphors = true;
        break;
      default:
        rule.action.tone = 'neutral';
    }

    return rule;
  }

  parseUserFactRule(details, rawText) {
    const { key, value } = details;
    
    return {
      id: generateRuleId(),
      type: 'memory',
      category: 'user_fact',
      key: key,
      value: value,
      importance: 'high',
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      rawText: rawText
    };
  }

  parseFocusTopicRule(details, rawText) {
    const { topic } = details;
    
    return {
      id: generateRuleId(),
      type: 'context',
      category: 'focus_topic',
      topic: topic,
      active: true,
      priority: 80,
      createdAt: Date.now(),
      expiresAt: null, // Permanent until changed
      rawText: rawText
    };
  }

  parseGeneralPreferenceRule(details, rawText) {
    return {
      id: generateRuleId(),
      type: 'preference',
      category: 'general',
      value: details.value,
      createdAt: Date.now(),
      rawText: rawText
    };
  }

  parseGeneralMemoryRule(details, rawText) {
    return {
      id: generateRuleId(),
      type: 'memory',
      category: 'general',
      content: details.value,
      createdAt: Date.now(),
      rawText: rawText
    };
  }

  parseGenericRule(details, rawText) {
    return {
      id: generateRuleId(),
      type: 'unknown',
      category: 'general',
      content: details.value || rawText,
      createdAt: Date.now(),
      rawText: rawText
    };
  }

  /**
   * Convert rule back to human-readable confirmation
   */
  generateConfirmation(rule) {
    switch (rule.category) {
      case 'response_style':
        return `تمام، هخلي ردودي ${getArabicStyleName(rule.action.style)} من دلوقتي`;
      
      case 'user_fact':
        return `حاضر، هافتكر إن ${rule.key} ${rule.value}`;
      
      case 'focus_topic':
        return `ماشي، هركز على موضوع "${rule.topic}" في كلامنا`;
      
      default:
        return `تمام، فهمتك`;
    }
  }

  /**
   * Check if two rules conflict
   */
  checkConflict(newRule, existingRules) {
    const conflicts = [];
    
    for (const existing of existingRules) {
      // Same category behavior rules conflict
      if (newRule.category === 'response_style' && 
          existing.category === 'response_style' &&
          existing.active !== false) {
        conflicts.push(existing);
      }
      
      // Same key memory items conflict
      if (newRule.type === 'memory' && existing.type === 'memory' &&
          newRule.key && existing.key && 
          newRule.key === existing.key) {
        conflicts.push(existing);
      }
    }
    
    return conflicts;
  }

  /**
   * Merge rules (resolve conflicts)
   */
  mergeRules(newRule, conflicts) {
    // Deactivate conflicting rules
    const deactivated = conflicts.map(r => ({ ...r, active: false, replacedBy: newRule.id }));
    
    return {
      newRule,
      deactivatedRules: deactivated
    };
  }
}

// Helper functions
function generateRuleId() {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getArabicStyleName(style) {
  const names = {
    short: 'قصيرة',
    detailed: 'مفصلة',
    normal: 'عادية',
    funny: 'مضحكة',
    serious: 'جادة',
    poetic: 'شاعرية',
    custom: 'حسب طلبك'
  };
  return names[style] || style;
}

// Singleton
export const instructionParser = new InstructionParser();

export default InstructionParser;
