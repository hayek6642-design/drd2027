/**
 * Zagel Learning Engine
 * Provides learning mode features: template creation, scenario builder, personality adjustment
 */

import { ModeManager, MODES } from '../modes/modeManager.js';

const LEARNING_CONFIG = {
  STORAGE_KEY_TEMPLATES: 'zagel_voice_templates',
  STORAGE_KEY_SCENARIOS: 'zagel_scenarios',
  STORAGE_KEY_PERSONALITY: 'zagel_personality_overrides',
  STORAGE_KEY_BEHAVIORS: 'zagel_behavior_rules'
};

/**
 * Learning Engine - only functional in learning mode
 */
export const LearningEngine = {
  /**
   * Check if learning features are available
   */
  canAccess() {
    if (!ModeManager.isLearning()) {
      console.warn('[LearningEngine] Access denied - not in learning mode');
      return false;
    }
    return true;
  },

  // ─────────────────────────────────────────────────────────
  // VOICE TEMPLATE MANAGEMENT
  // ─────────────────────────────────────────────────────────
  
  /**
   * Create a new voice template
   */
  createVoiceTemplate(template) {
    if (!this.canAccess()) return null;
    
    const templates = this.getVoiceTemplates();
    const newTemplate = {
      id: 'tpl_' + Date.now(),
      name: template.name || 'New Template',
      phrases: template.phrases || [],
      responses: template.responses || [],
      triggers: template.triggers || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    templates.push(newTemplate);
    this._saveTemplates(templates);
    console.log(`[LearningEngine] Created template: ${newTemplate.name}`);
    return newTemplate;
  },

  /**
   * Get all voice templates
   */
  getVoiceTemplates() {
    const stored = localStorage.getItem(LEARNING_CONFIG.STORAGE_KEY_TEMPLATES);
    return stored ? JSON.parse(stored) : [];
  },

  /**
   * Update a voice template
   */
  updateVoiceTemplate(templateId, updates) {
    if (!this.canAccess()) return false;
    
    const templates = this.getVoiceTemplates();
    const idx = templates.findIndex(t => t.id === templateId);
    if (idx === -1) return false;
    
    templates[idx] = {
      ...templates[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this._saveTemplates(templates);
    return true;
  },

  /**
   * Delete a voice template
   */
  deleteVoiceTemplate(templateId) {
    if (!this.canAccess()) return false;
    
    const templates = this.getVoiceTemplates().filter(t => t.id !== templateId);
    this._saveTemplates(templates);
    return true;
  },

  // ─────────────────────────────────────────────────────────
  // SCENARIO BUILDER
  // ─────────────────────────────────────────────────────────

  /**
   * Create a new scenario
   */
  createScenario(scenario) {
    if (!this.canAccess()) return null;
    
    const scenarios = this.getScenarios();
    const newScenario = {
      id: 'scn_' + Date.now(),
      name: scenario.name || 'New Scenario',
      description: scenario.description || '',
      steps: scenario.steps || [],
      conditions: scenario.conditions || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    scenarios.push(newScenario);
    this._saveScenarios(scenarios);
    console.log(`[LearningEngine] Created scenario: ${newScenario.name}`);
    return newScenario;
  },

  /**
   * Get all scenarios
   */
  getScenarios() {
    const stored = localStorage.getItem(LEARNING_CONFIG.STORAGE_KEY_SCENARIOS);
    return stored ? JSON.parse(stored) : [];
  },

  /**
   * Update a scenario
   */
  updateScenario(scenarioId, updates) {
    if (!this.canAccess()) return false;
    
    const scenarios = this.getScenarios();
    const idx = scenarios.findIndex(s => s.id === scenarioId);
    if (idx === -1) return false;
    
    scenarios[idx] = {
      ...scenarios[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this._saveScenarios(scenarios);
    return true;
  },

  /**
   * Delete a scenario
   */
  deleteScenario(scenarioId) {
    if (!this.canAccess()) return false;
    
    const scenarios = this.getScenarios().filter(s => s.id !== scenarioId);
    this._saveScenarios(scenarios);
    return true;
  },

  // ─────────────────────────────────────────────────────────
  // PERSONALITY ADJUSTMENT
  // ─────────────────────────────────────────────────────────

  /**
   * Set personality overrides
   */
  setPersonalityOverrides(overrides) {
    if (!this.canAccess()) return false;
    
    const current = this.getPersonalityOverrides();
    const merged = { ...current, ...overrides, updatedAt: new Date().toISOString() };
    localStorage.setItem(LEARNING_CONFIG.STORAGE_KEY_PERSONALITY, JSON.stringify(merged));
    console.log('[LearningEngine] Personality overrides updated');
    return true;
  },

  /**
   * Get personality overrides
   */
  getPersonalityOverrides() {
    const stored = localStorage.getItem(LEARNING_CONFIG.STORAGE_KEY_PERSONALITY);
    return stored ? JSON.parse(stored) : {};
  },

  /**
   * Clear personality overrides
   */
  clearPersonalityOverrides() {
    if (!this.canAccess()) return false;
    localStorage.removeItem(LEARNING_CONFIG.STORAGE_KEY_PERSONALITY);
    return true;
  },

  // ─────────────────────────────────────────────────────────
  // BEHAVIOR RULES
  // ─────────────────────────────────────────────────────────

  /**
   * Add behavior rule
   */
  addBehaviorRule(rule) {
    if (!this.canAccess()) return false;
    
    const rules = this.getBehaviorRules();
    const newRule = {
      id: 'br_' + Date.now(),
      condition: rule.condition || '',
      action: rule.action || '',
      priority: rule.priority || 50,
      enabled: true,
      createdAt: new Date().toISOString()
    };
    
    rules.push(newRule);
    this._saveBehaviorRules(rules);
    return newRule;
  },

  /**
   * Get all behavior rules
   */
  getBehaviorRules() {
    const stored = localStorage.getItem(LEARNING_CONFIG.STORAGE_KEY_BEHAVIORS);
    return stored ? JSON.parse(stored) : [];
  },

  /**
   * Update behavior rule
   */
  updateBehaviorRule(ruleId, updates) {
    if (!this.canAccess()) return false;
    
    const rules = this.getBehaviorRules();
    const idx = rules.findIndex(r => r.id === ruleId);
    if (idx === -1) return false;
    
    rules[idx] = { ...rules[idx], ...updates };
    this._saveBehaviorRules(rules);
    return true;
  },

  /**
   * Delete behavior rule
   */
  deleteBehaviorRule(ruleId) {
    if (!this.canAccess()) return false;
    
    const rules = this.getBehaviorRules().filter(r => r.id !== ruleId);
    this._saveBehaviorRules(rules);
    return true;
  },

  // ─────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────

  _saveTemplates(templates) {
    localStorage.setItem(LEARNING_CONFIG.STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
  },

  _saveScenarios(scenarios) {
    localStorage.setItem(LEARNING_CONFIG.STORAGE_KEY_SCENARIOS, JSON.stringify(scenarios));
  },

  _saveBehaviorRules(rules) {
    localStorage.setItem(LEARNING_CONFIG.STORAGE_KEY_BEHAVIORS, JSON.stringify(rules));
  },

  // ─────────────────────────────────────────────────────────
  // EXPORT / IMPORT
  // ─────────────────────────────────────────────────────────

  /**
   * Export all learning data
   */
  exportData() {
    if (!this.canAccess()) return null;
    
    return JSON.stringify({
      templates: this.getVoiceTemplates(),
      scenarios: this.getScenarios(),
      personality: this.getPersonalityOverrides(),
      behaviors: this.getBehaviorRules(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  },

  /**
   * Import learning data
   */
  importData(jsonString) {
    if (!this.canAccess()) return false;
    
    try {
      const data = JSON.parse(jsonString);
      if (data.templates) this._saveTemplates(data.templates);
      if (data.scenarios) this._saveScenarios(data.scenarios);
      if (data.personality) {
        localStorage.setItem(LEARNING_CONFIG.STORAGE_KEY_PERSONALITY, JSON.stringify(data.personality));
      }
      if (data.behaviors) this._saveBehaviorRules(data.behaviors);
      console.log('[LearningEngine] Data imported successfully');
      return true;
    } catch (e) {
      console.error('[LearningEngine] Import failed:', e);
      return false;
    }
  }
};

export default LearningEngine;

// Also expose globally for script tag usage
window.ZagelLearningEngine = LearningEngine;