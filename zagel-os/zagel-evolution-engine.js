/**
 * ZAGEL Evolution Engine v2.0.0
 * Self-evolution: auto-generates rules, detects patterns, self-improves
 * Zagel learns and adapts its own behavior over time
 */

(function () {
  'use strict';
  if (window.__ZAGEL_EVOLUTION__) return;

  class ZagelEvolutionEngine {
    constructor() {
      this._rules = [];
      this._patterns = [];
      this._generation = 1;
      this._evolutionLog = [];
      this._ruleIdCounter = 0;

      console.log('🧬 [Zagel-Evolution] Engine initialized (Gen 1)');
    }

    addRule(rule) {
      const id = `rule_${++this._ruleIdCounter}`;
      const entry = {
        id,
        condition: rule.condition, // function or string
        action: rule.action,       // function or string
        name: rule.name || id,
        priority: rule.priority || 5,
        hitCount: 0,
        missCount: 0,
        fitness: 1.0,
        createdAt: Date.now(),
        generation: this._generation,
        source: rule.source || 'manual'
      };

      this._rules.push(entry);
      this._rules.sort((a, b) => b.priority - a.priority);
      return id;
    }

    evaluate(context) {
      const triggered = [];

      for (const rule of this._rules) {
        try {
          let matches = false;

          if (typeof rule.condition === 'function') {
            matches = rule.condition(context);
          } else if (typeof rule.condition === 'string') {
            // Simple expression evaluation
            matches = this._evalCondition(rule.condition, context);
          }

          if (matches) {
            rule.hitCount++;
            rule.fitness = Math.min(1, rule.fitness + 0.01);
            triggered.push(rule);
          } else {
            rule.missCount++;
          }
        } catch (err) {
          console.warn(`🧬 [Evolution] Rule ${rule.name} eval error:`, err);
          rule.fitness = Math.max(0, rule.fitness - 0.1);
        }
      }

      return triggered;
    }

    _evalCondition(conditionStr, context) {
      // Safe subset: "context.type === 'message' && context.length > 100"
      try {
        const fn = new Function('context', `return ${conditionStr};`);
        return fn(context);
      } catch {
        return false;
      }
    }

    execute(rules, context) {
      const results = [];
      for (const rule of rules) {
        try {
          let result;
          if (typeof rule.action === 'function') {
            result = rule.action(context);
          } else if (typeof rule.action === 'string') {
            if (window.ZagelBus) {
              window.ZagelBus.emit(rule.action, { rule: rule.name, context });
            }
            result = { emitted: rule.action };
          }
          results.push({ rule: rule.name, result, success: true });
        } catch (err) {
          results.push({ rule: rule.name, error: err.message, success: false });
          rule.fitness = Math.max(0, rule.fitness - 0.05);
        }
      }
      return results;
    }

    detectPatterns() {
      // Analyze rule hit/miss ratios
      const patterns = [];

      for (const rule of this._rules) {
        const total = rule.hitCount + rule.missCount;
        if (total < 10) continue;

        const hitRate = rule.hitCount / total;

        if (hitRate < 0.05) {
          patterns.push({
            type: 'dead_rule',
            rule: rule.name,
            hitRate,
            suggestion: 'Consider removing or modifying this rule'
          });
        } else if (hitRate > 0.9) {
          patterns.push({
            type: 'always_true',
            rule: rule.name,
            hitRate,
            suggestion: 'This rule triggers too often, consider narrowing condition'
          });
        }
      }

      this._patterns = patterns;
      return patterns;
    }

    evolve() {
      this._generation++;

      // Prune low-fitness rules
      const before = this._rules.length;
      this._rules = this._rules.filter(r => r.fitness > 0.1 || r.source === 'manual');

      // Auto-generate new rules from patterns
      const autoRules = this._generateRules();

      const log = {
        generation: this._generation,
        ts: Date.now(),
        pruned: before - this._rules.length,
        generated: autoRules.length,
        totalRules: this._rules.length
      };

      this._evolutionLog.push(log);

      if (window.ZagelBus) {
        window.ZagelBus.emit('evolution:evolved', log);
      }

      console.log(`🧬 [Evolution] Generation ${this._generation}: pruned ${log.pruned}, generated ${log.generated}`);
      return log;
    }

    _generateRules() {
      const generated = [];

      // If brain has patterns, create rules from them
      if (window.ZagelBrain) {
        const brainPatterns = window.ZagelBrain.getPatterns();
        for (const bp of brainPatterns.slice(0, 3)) {
          const [trigger, action] = bp.sequence.split('->');
          if (trigger && action) {
            const id = this.addRule({
              name: `auto_${trigger}_${action}`,
              condition: (ctx) => ctx.action === trigger,
              action: (ctx) => {
                if (window.ZagelBus) {
                  window.ZagelBus.emit('evolution:auto_action', { suggest: action, context: ctx });
                }
              },
              priority: 3,
              source: 'auto_evolved'
            });
            generated.push(id);
          }
        }
      }

      return generated;
    }

    getRules() { return this._rules.map(r => ({ ...r, condition: r.condition.toString?.() || r.condition, action: r.action.toString?.() || r.action })); }
    getGeneration() { return this._generation; }
    getLog() { return [...this._evolutionLog]; }
    getPatterns() { return [...this._patterns]; }

    removeRule(id) {
      this._rules = this._rules.filter(r => r.id !== id);
    }

    async save() {
      if (window.ZagelStore) {
        // Save serializable parts
        const serializable = this._rules.map(r => ({
          ...r,
          condition: typeof r.condition === 'string' ? r.condition : null,
          action: typeof r.action === 'string' ? r.action : null
        })).filter(r => r.condition !== null);
        await window.ZagelStore.set('evolution_rules', serializable);
        await window.ZagelStore.set('evolution_log', this._evolutionLog);
        await window.ZagelStore.set('evolution_generation', this._generation);
      }
    }

    async load() {
      if (window.ZagelStore) {
        const rules = await window.ZagelStore.get('evolution_rules');
        if (rules) {
          for (const r of rules) {
            this.addRule({ ...r, source: r.source || 'restored' });
          }
        }
        const log = await window.ZagelStore.get('evolution_log');
        if (log) this._evolutionLog = log;
        const gen = await window.ZagelStore.get('evolution_generation');
        if (gen) this._generation = gen;
      }
    }

    destroy() {
      this._rules = [];
      this._patterns = [];
      this._evolutionLog = [];
      delete window.__ZAGEL_EVOLUTION__;
    }
  }

  window.__ZAGEL_EVOLUTION__ = new ZagelEvolutionEngine();
  window.ZagelEvolution = window.__ZAGEL_EVOLUTION__;
})();
