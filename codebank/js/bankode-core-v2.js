/**
 * BANKODE-CORE v2 — Code Generation Engine (Patched for UnifiedStorage)
 *
 * Replaces all direct localStorage calls with UnifiedStorage.
 * Used by yt-new-clear.html to generate codes from watch time.
 *
 * REQUIRES: unified-storage.js loaded before this file.
 */

(function (global) {
  'use strict';

  var BankodeCore = {
    userId: null,
    watchStartTime: null,
    totalWatchTime: 0,        // seconds
    codeGenerationThreshold: 60, // seconds per code (1 minute = 1 code)
    pendingTime: 0,
    isWatching: false,

    /**
     * Initialize with user context.
     * Call after auth is ready.
     */
    init: function (userId) {
      this.userId = userId;
      this._loadState();
      console.log('[Bankode] Initialized for user:', userId);
    },

    /**
     * Start tracking watch time.
     */
    startWatching: function () {
      if (this.isWatching) return;
      this.isWatching = true;
      this.watchStartTime = Date.now();
      this._tick();
      console.log('[Bankode] Watch tracking started');
    },

    /**
     * Pause tracking.
     */
    pauseWatching: function () {
      if (!this.isWatching) return;
      this.isWatching = false;
      if (this.watchStartTime) {
        this.pendingTime += (Date.now() - this.watchStartTime) / 1000;
        this.watchStartTime = null;
      }
      this._saveState();
      console.log('[Bankode] Watch tracking paused. Pending:', this.pendingTime.toFixed(1) + 's');
    },

    /**
     * Stop and finalize — generate any remaining codes.
     */
    stopWatching: function () {
      this.pauseWatching();
      this._generatePendingCodes();
    },

    /**
     * Internal tick — check if we've earned a code every second.
     */
    _tick: function () {
      var self = this;
      if (!this.isWatching) return;

      var elapsed = this.watchStartTime ? (Date.now() - this.watchStartTime) / 1000 : 0;
      var totalPending = this.pendingTime + elapsed;

      // Generate codes for each threshold crossed
      while (totalPending >= this.codeGenerationThreshold) {
        this._generateCode();
        totalPending -= this.codeGenerationThreshold;
        this.pendingTime = totalPending;
        this.watchStartTime = Date.now();
        elapsed = 0;
      }

      setTimeout(function () { self._tick(); }, 1000);
    },

    /**
     * Generate a single code and save via UnifiedStorage.
     */
    _generateCode: function () {
      var code = this._createUniqueCode();
      var codeData = {
        id: 'code_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        code: code,
        value: 10, // 10 points per code
        generatedAt: Date.now(),
        userId: this.userId,
        status: 'active',
        source: 'yt-watch',
        type: 'codes'
      };

      // Save through UnifiedStorage (auto-syncs to IndexedDB + server)
      UnifiedStorage.set(codeData.id, codeData, 'codes');

      // Broadcast new code event
      UnifiedStorage.broadcast('codes:new', codeData);

      // Notify parent window (for YT-Clear UI updates)
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'bankode:new-code',
          data: codeData
        }, '*');
      }

      this.totalWatchTime += this.codeGenerationThreshold;
      console.log('[Bankode] Code generated:', code, '| Total codes earned this session');

      return codeData;
    },

    _generatePendingCodes: function () {
      while (this.pendingTime >= this.codeGenerationThreshold) {
        this._generateCode();
        this.pendingTime -= this.codeGenerationThreshold;
      }
      this._saveState();
    },

    _createUniqueCode: function () {
      var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      var code = 'CB-';
      for (var i = 0; i < 8; i++) {
        if (i === 4) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    },

    /**
     * Get all earned codes for current user.
     */
    getAllCodes: function () {
      return UnifiedStorage.getAll('codes').then(function (codes) {
        return (codes || []).filter(function (c) { return c.status === 'active'; });
      });
    },

    /**
     * Get total code balance.
     */
    getBalance: function () {
      return this.getAllCodes().then(function (codes) {
        return codes.reduce(function (sum, c) { return sum + (c.value || 1); }, 0);
      });
    },

    /**
     * Persist pending watch state (survives page refresh).
     */
    _saveState: function () {
      try {
        localStorage.setItem('bankode_state_' + this.userId, JSON.stringify({
          pendingTime: this.pendingTime,
          totalWatchTime: this.totalWatchTime,
          savedAt: Date.now()
        }));
      } catch (e) { /* ignore */ }
    },

    _loadState: function () {
      try {
        var saved = localStorage.getItem('bankode_state_' + this.userId);
        if (saved) {
          var state = JSON.parse(saved);
          // Only restore if saved within last hour
          if (state.savedAt && (Date.now() - state.savedAt) < 3600000) {
            this.pendingTime = state.pendingTime || 0;
            this.totalWatchTime = state.totalWatchTime || 0;
          }
        }
      } catch (e) { /* ignore */ }
    }
  };

  global.BankodeCore = BankodeCore;
})(window);
