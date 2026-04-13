/**
 * ZAGEL Trigger Engine v2.0.0
 * "Tell me when..." triggers for prices, content, social gaps
 * User-defined conditional alerts with periodic checking
 */

(function () {
  'use strict';
  if (window.__ZAGEL_TRIGGER__) return;

  class ZagelTriggerEngine {
    constructor() {
      this._triggers = [];
      this._checkInterval = null;
      this._checkPeriod = 60000; // 1 minute
      this._idCounter = 0;

      this._startChecking();
      console.log('🎯 [Zagel-Trigger] Engine initialized');
    }

    add(trigger) {
      const id = `trigger_${++this._idCounter}`;
      const entry = {
        id,
        name: trigger.name || id,
        type: trigger.type || 'custom',     // price, social, time, content, custom
        condition: trigger.condition,        // function(context) => boolean
        action: trigger.action || 'notify',  // notify, voice, execute
        message: trigger.message || '',
        params: trigger.params || {},
        oneShot: trigger.oneShot !== false,  // fire once then deactivate
        active: true,
        hitCount: 0,
        createdAt: Date.now(),
        lastChecked: null,
        lastTriggered: null
      };

      this._triggers.push(entry);

      if (window.ZagelBus) {
        window.ZagelBus.emit('trigger:added', { id, name: entry.name, type: entry.type });
      }

      return id;
    }

    // Convenience: price trigger
    addPriceTrigger(asset, operator, threshold, message) {
      return this.add({
        name: `${asset} ${operator} ${threshold}`,
        type: 'price',
        condition: async () => {
          if (!window.ZagelIntelligence) return false;
          let price = null;
          if (asset === 'gold') {
            const data = await window.ZagelIntelligence.getGold();
            price = data?.pricePerGram;
          } else if (asset === 'usd') {
            const data = await window.ZagelIntelligence.getUSD();
            price = data?.rate;
          }
          if (price === null) return false;

          switch (operator) {
            case '>': return price > threshold;
            case '<': return price < threshold;
            case '>=': return price >= threshold;
            case '<=': return price <= threshold;
            case '==': return Math.abs(price - threshold) < 0.01;
            default: return false;
          }
        },
        message: message || `تنبيه: ${asset} وصل ${operator} ${threshold}`,
        action: 'notify'
      });
    }

    // Convenience: social gap trigger
    addSocialTrigger(contactName, daysSinceThreshold) {
      return this.add({
        name: `social_gap_${contactName}`,
        type: 'social',
        condition: () => {
          if (!window.ZagelEmotion) return false;
          const gaps = window.ZagelEmotion.detectSocialGaps();
          return gaps.some(g => g.name === contactName && g.daysSince >= daysSinceThreshold);
        },
        message: `${contactName} محتاجك! مر عليه ${daysSinceThreshold}+ يوم`,
        action: 'notify'
      });
    }

    // Convenience: time trigger
    addTimeTrigger(hour, minute, message) {
      return this.add({
        name: `time_${hour}:${minute}`,
        type: 'time',
        condition: () => {
          const now = new Date();
          return now.getHours() === hour && now.getMinutes() === minute;
        },
        message: message || `تذكير الساعة ${hour}:${String(minute).padStart(2, '0')}`,
        action: 'notify',
        oneShot: true
      });
    }

    async check() {
      for (const trigger of this._triggers) {
        if (!trigger.active) continue;

        trigger.lastChecked = Date.now();

        try {
          const result = typeof trigger.condition === 'function'
            ? await trigger.condition()
            : false;

          if (result) {
            trigger.hitCount++;
            trigger.lastTriggered = Date.now();

            await this._fire(trigger);

            if (trigger.oneShot) {
              trigger.active = false;
            }
          }
        } catch (err) {
          console.warn(`🎯 [Trigger] Check error for ${trigger.name}:`, err);
        }
      }
    }

    async _fire(trigger) {
      console.log(`🎯 [Trigger] Fired: ${trigger.name}`);

      if (window.ZagelBus) {
        window.ZagelBus.emit('trigger:fired', { id: trigger.id, name: trigger.name, message: trigger.message });
      }

      switch (trigger.action) {
        case 'notify':
          if (window.ZagelNotification) {
            await window.ZagelNotification.notify({
              title: '🎯 تنبيه زاجل',
              body: trigger.message,
              level: 'call',
              category: trigger.type
            });
          }
          break;

        case 'voice':
          if (window.ZagelVoice) {
            await window.ZagelVoice.speak(trigger.message);
          }
          break;

        case 'execute':
          if (trigger.params?.command && window.ZagelAutomation) {
            await window.ZagelAutomation.execute(trigger.params.command);
          }
          break;
      }
    }

    _startChecking() {
      this._checkInterval = setInterval(() => this.check(), this._checkPeriod);
    }

    remove(triggerId) {
      this._triggers = this._triggers.filter(t => t.id !== triggerId);
    }

    pause(triggerId) {
      const t = this._triggers.find(t => t.id === triggerId);
      if (t) t.active = false;
    }

    resume(triggerId) {
      const t = this._triggers.find(t => t.id === triggerId);
      if (t) t.active = true;
    }

    list() {
      return this._triggers.map(t => ({
        id: t.id, name: t.name, type: t.type, active: t.active,
        hitCount: t.hitCount, lastTriggered: t.lastTriggered
      }));
    }

    setCheckPeriod(ms) {
      this._checkPeriod = Math.max(10000, ms);
      clearInterval(this._checkInterval);
      this._startChecking();
    }

    async save() {
      if (window.ZagelStore) {
        const serializable = this._triggers
          .filter(t => typeof t.condition === 'string' || t.type !== 'custom')
          .map(t => ({ ...t, condition: null }));
        await window.ZagelStore.set('triggers', serializable);
      }
    }

    async load() {
      if (window.ZagelStore) {
        const saved = await window.ZagelStore.get('triggers');
        if (saved) {
          // Restore non-custom triggers only (custom conditions can't be serialized)
          for (const t of saved) {
            if (t.type === 'price' && t.params) {
              this.addPriceTrigger(t.params.asset, t.params.operator, t.params.threshold, t.message);
            }
          }
        }
      }
    }

    destroy() {
      if (this._checkInterval) clearInterval(this._checkInterval);
      this._triggers = [];
      delete window.__ZAGEL_TRIGGER__;
    }
  }

  window.__ZAGEL_TRIGGER__ = new ZagelTriggerEngine();
  window.ZagelTrigger = window.__ZAGEL_TRIGGER__;
})();
