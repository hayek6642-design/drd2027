/**
 * SERVICE-BASE.js — Universal service bootstrap
 *
 * Combines ServiceAuth + UnifiedStorage into a single init pattern.
 * Every service should use this instead of manually wiring auth + storage.
 *
 * USAGE:
 *   <script src="/shared/service-auth.js"></script>
 *   <script src="/shared/unified-storage.js"></script>
 *   <script src="/shared/service-base.js"></script>
 *   <script>
 *     ServiceBase.init({
 *       name: 'SafeCode',
 *       onReady: function(ctx) {
 *         // ctx.userId, ctx.email, ctx.storage, ctx.auth, ctx.balance
 *         console.log('Ready!', ctx.userId);
 *       },
 *       onBalanceChange: function(balance) {
 *         // Called when code balance changes
 *       }
 *     });
 *   </script>
 */

(function (global) {
  'use strict';

  var ServiceBase = {
    auth: null,
    userId: null,
    email: null,
    balance: 0,
    _config: null,
    _ready: false,

    init: function (config) {
      this._config = config || {};
      var self = this;

      // 1. Initialize auth
      this.auth = new ServiceAuth();

      this.auth.onReady = function (session) {
        if (!session || !session.userId) {
          console.error('[' + (config.name || 'Service') + '] No valid session');
          return;
        }

        self.userId = session.userId;
        self.email = session.email || '';

        // 2. Wait for storage
        UnifiedStorage.ready.then(function () {
          // 3. Load code balance
          return self._loadBalance();
        }).then(function () {
          // 4. Subscribe to updates
          self._subscribeUpdates();
          self._ready = true;

          // 5. Call service-specific onReady
          if (typeof config.onReady === 'function') {
            config.onReady({
              userId: self.userId,
              email: self.email,
              storage: UnifiedStorage,
              auth: self.auth,
              balance: self.balance
            });
          }
        }).catch(function (err) {
          console.error('[' + (config.name || 'Service') + '] Init failed:', err);
        });
      };

      this.auth.onAuthFailed = function () {
        if (typeof config.onAuthFailed === 'function') {
          config.onAuthFailed();
        }
      };
    },

    _loadBalance: function () {
      var self = this;
      return UnifiedStorage.getAll('codes').then(function (codes) {
        var active = (codes || []).filter(function (c) { return c.status === 'active'; });
        self.balance = active.reduce(function (sum, c) { return sum + (c.value || 1); }, 0);
      });
    },

    _subscribeUpdates: function () {
      var self = this;
      var config = this._config;

      UnifiedStorage.subscribe('codes:new', function () {
        self._loadBalance().then(function () {
          if (typeof config.onBalanceChange === 'function') {
            config.onBalanceChange(self.balance);
          }
        });
      });

      UnifiedStorage.subscribe('assets:updated', function (data) {
        if (data && typeof data.codes === 'number') {
          self.balance = data.codes;
        }
        if (typeof config.onBalanceChange === 'function') {
          config.onBalanceChange(self.balance);
        }
      });

      UnifiedStorage.subscribe('storage:refreshed', function (data) {
        if (data.type === 'codes') {
          self._loadBalance().then(function () {
            if (typeof config.onBalanceChange === 'function') {
              config.onBalanceChange(self.balance);
            }
          });
        }
      });
    },

    /**
     * Spend codes for a service action.
     * Returns a Promise that resolves with { success, remaining } or rejects if insufficient.
     */
    spendCodes: function (amount, description) {
      var self = this;

      if (this.balance < amount) {
        return Promise.reject(new Error('Insufficient codes. Need ' + amount + ', have ' + self.balance));
      }

      self.balance = Math.max(0, self.balance - amount);

      var tx = {
        id: 'tx_' + (this._config.name || 'svc').toLowerCase() + '_' + Date.now(),
        type: 'spend',
        service: (this._config.name || 'unknown').toLowerCase(),
        amount: amount,
        description: description || 'Service usage',
        userId: self.userId,
        timestamp: Date.now()
      };

      return UnifiedStorage.set(tx.id, tx, 'transactions').then(function () {
        UnifiedStorage.broadcast('assets:updated', { codes: self.balance });
        return { success: true, remaining: self.balance };
      });
    },

    /**
     * Make an authenticated API call via ServiceAuth.
     */
    apiCall: function (endpoint, options) {
      return this.auth.apiCall(endpoint, options);
    },

    /**
     * Quick notification helper.
     */
    notify: function (text, type) {
      var el = document.createElement('div');
      el.style.cssText = 'position:fixed;top:16px;right:16px;padding:12px 20px;border-radius:10px;z-index:99999;font-size:0.85rem;font-family:sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.3);transition:all 0.3s;max-width:350px;' +
        (type === 'error' ? 'background:#dc2626;color:#fff;' :
         type === 'warning' ? 'background:#f59e0b;color:#000;' :
         'background:#22c55e;color:#fff;');
      el.textContent = text;
      document.body.appendChild(el);
      setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 300); }, 3500);
    }
  };

  global.ServiceBase = ServiceBase;
})(window);
