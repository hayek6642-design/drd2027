/**
 * Zagel Automation Engine
 * Reacts to events and triggers actions or suggestions.
 */

export type AutomationAction =
  | { type: "open_service"; service: string }
  | { type: "suggest"; message: string }
  | { type: "onboard" }
  | { type: "navigate"; path: string }
  | { type: "none" };

export interface AutomationRule {
  id: string;
  trigger: string; // keyword or pattern
  action: AutomationAction;
  enabled: boolean;
}

const DEFAULT_RULES: AutomationRule[] = [
  {
    id: "safecode",
    trigger: "code",
    action: { type: "open_service", service: "safecode" },
    enabled: true,
  },
  {
    id: "samma3ny",
    trigger: "audio",
    action: { type: "open_service", service: "samma3ny" },
    enabled: true,
  },
  {
    id: "farragna",
    trigger: "video",
    action: { type: "open_service", service: "farragna" },
    enabled: true,
  },
  {
    id: "e7ki",
    trigger: "chat",
    action: { type: "open_service", service: "e7ki" },
    enabled: true,
  },
];

class AutomationEngine {
  private rules: AutomationRule[] = DEFAULT_RULES;

  // Match input text to automation rules
  matchRules(input: string): AutomationAction[] {
    const lower = input.toLowerCase();
    const matched: AutomationAction[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (lower.includes(rule.trigger)) {
        matched.push(rule.action);
      }
    }

    return matched;
  }

  // Get service suggestion from user interests
  suggestForInterests(interests: string[]): string | null {
    const interestMap: Record<string, string> = {
      programming: "safecode",
      coding: "safecode",
      music: "samma3ny",
      audio: "samma3ny",
      video: "farragna",
      film: "farragna",
      chat: "e7ki",
      social: "e7ki",
    };

    for (const interest of interests) {
      const lower = interest.toLowerCase();
      for (const [key, service] of Object.entries(interestMap)) {
        if (lower.includes(key)) {
          return service;
        }
      }
    }

    return null;
  }

  addRule(rule: AutomationRule) {
    this.rules.push(rule);
  }

  removeRule(id: string) {
    this.rules = this.rules.filter((r) => r.id !== id);
  }

  getRules(): AutomationRule[] {
    return [...this.rules];
  }
}

const automationEngine = new AutomationEngine();
export default automationEngine;
