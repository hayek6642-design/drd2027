/**
 * SERVICE LAYER: WatchDog Integrity Service
 * Path: /services/watchdog/watchdog.js
 * 
 * This service handles system integrity checks.
 * It has been refactored into a thin wrapper that communicates state to the visual Guardian.
 */
class WatchDog {
  constructor() {
    this.lastCheck = null;
    this.status = 'idle';
    this.issues = [];
    this.dbQuery = null;
    this.isProcessing = false;
  }

  async setDb(dbQueryFunc) {
    this.dbQuery = dbQueryFunc;
  }

  /**
   * Performs system integrity verification and updates the visual Guardian state.
   */
  async verifySystemIntegrity() {
    if (this.isProcessing) return { status: 'locked', issues: [] };
    this.isProcessing = true;

    this.status = 'checking';
    this.issues = [];

    // Notify visual dog that we are monitoring/checking
    this.updateVisualState('monitoring');

    try {
      if (!this.dbQuery) {
        throw new Error('Database helper not initialized in WatchDog');
      }

      // [INTEGRITY LOGIC REMAINING FOR CORE FUNCTIONALITY]
      const ledgerRes = await this.dbQuery(`
        SELECT user_id, asset_type, SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END) AS balance
        FROM ledger GROUP BY user_id, asset_type
      `);

      for (const row of ledgerRes.rows) {
        if (Number(row.balance) < 0) {
          this.issues.push({ type: 'NEGATIVE_BALANCE', user_id: row.user_id, asset_id: row.asset_type });
        }
      }

      // State update logic
      if (this.issues.length > 0) {
        this.status = 'alert';
        this.updateVisualState('threat detected');
      } else {
        this.status = 'healthy';
        this.updateVisualState('monitoring');
      }

      this.lastCheck = new Date();
      return { status: this.status, issues: this.issues, checkedAt: this.lastCheck, ok: this.issues.length === 0 };

    } catch (err) {
      console.error('[WatchDogService] Integrity check failed:', err);
      this.status = 'error';
      this.updateVisualState('idle');
      return { status: 'error', error: err.message };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 🔗 Communication: Service -> Adapter (Visual Sync)
   * This is a placeholder for server-to-client communication.
   * In a real system, this would emit an event via Socket.io or SSE.
   */
  updateVisualState(state) {
    // 🛡️ Debounce identical logs to prevent flood (from actly.md)
    if (this._lastVisualState === state) return;
    this._lastVisualState = state;
    
    console.log(`[WatchDogService] State sync: ${state}`);
    // No window reference allowed here!
  }
}

// Create singleton instance
export const watchdog = new WatchDog();

// Default export for backward compatibility if needed
export default watchdog;

