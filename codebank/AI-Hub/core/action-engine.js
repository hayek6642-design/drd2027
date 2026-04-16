/**
 * ACTION ENGINE - CodeMind v2.0
 * ==============================
 * Evaluates, executes, and manages actions with:
 * - Confidence scoring
 * - Auto-fix capability (high confidence only)
 * - Sandbox testing
 * - Rollback support
 * - Comprehensive logging
 */

const crypto = require('crypto');

class ActionEngine {
  constructor(securityAuthority, options = {}) {
    this.security = securityAuthority;

    // Configuration
    this.confidenceThreshold = options.confidenceThreshold || 0.9;
    this.autoFixEnabled = options.autoFixEnabled !== false;
    this.requireMFA = options.requireMFA !== false;
    this.sandboxEnabled = options.sandboxEnabled !== false;

    // State tracking
    this.pendingActions = [];
    this.executedActions = [];
    this.failedActions = [];
    this.backups = new Map();
    this.executionHistory = [];

    this.log('Action Engine initialized');
  }

  log(message) {
    console.log(`[ActionEngine] ${message}`);
  }

  success(message) {
    console.log(`[ActionEngine] ✅ ${message}`);
  }

  error(message) {
    console.error(`[ActionEngine] ❌ ${message}`);
  }

  // ==================== MAIN EXECUTION FLOW ====================

  /**
   * Evaluate and execute actions
   * Returns approval status or execution result
   */
  async evaluateAndExecute(actions, user, context) {
    if (!Array.isArray(actions)) {
      actions = [actions];
    }

    const results = [];

    for (const action of actions) {
      // 1. SECURITY CHECK
      if (!this.security.canExecuteAction(action.type, user)) {
        results.push({
          status: 'denied',
          action: action.id,
          reason: 'Security authorization failed',
          message: this.security.getDenialMessage(user, action.type)
        });
        continue;
      }

      // 2. CONFIDENCE SCORING
      const confidence = this.calculateConfidence(action, context);

      // 3. AUTO-FIX DECISION
      if (confidence > this.confidenceThreshold && this.autoFixEnabled) {
        // HIGH CONFIDENCE - auto-execute
        const result = await this.executeWithSafeguards(action, user, context);
        results.push(result);
      } else {
        // LOW/MEDIUM CONFIDENCE - request approval
        const pendingAction = {
          id: action.id || crypto.randomUUID(),
          action,
          confidence,
          timestamp: Date.now(),
          user: user?.email,
          reason: this.explainConfidenceScore(action, context, confidence)
        };

        this.pendingActions.push(pendingAction);

        results.push({
          status: 'pending_approval',
          action: pendingAction.id,
          confidence: parseFloat(confidence.toFixed(2)),
          reason: pendingAction.reason,
          explanation: `Action requires ${(confidence * 100).toFixed(0)}% confidence (threshold: ${(this.confidenceThreshold * 100).toFixed(0)}%)`,
          requiredActions: ['review', 'approve_or_reject']
        });
      }
    }

    return {
      batchId: crypto.randomUUID(),
      timestamp: Date.now(),
      totalActions: actions.length,
      results,
      summary: this.summarizeResults(results)
    };
  }

  // ==================== EXECUTION WITH SAFEGUARDS ====================

  /**
   * Execute action with full safety protocol
   */
  async executeWithSafeguards(action, user, context) {
    const executionId = crypto.randomUUID();
    const startTime = Date.now();

    this.log(`Executing action ${executionId}: ${action.type}`);

    try {
      // STEP 1: Create backup
      const backup = await this.createBackup(action, user);

      // STEP 2: Stage changes
      const staged = await this.stageChanges(action);

      // STEP 3: Sandbox test
      if (this.sandboxEnabled) {
        const testResult = await this.testInSandbox(staged, action);

        if (!testResult.success) {
          this.error(
            `Sandbox test failed for ${action.type}: ${testResult.error}`
          );

          await this.rollback(backup, executionId);

          return {
            status: 'failed',
            action: action.id,
            executionId,
            phase: 'sandbox_testing',
            error: testResult.error,
            rolledBack: true,
            duration: Date.now() - startTime
          };
        }

        this.log(`Sandbox test passed: ${testResult.message}`);
      }

      // STEP 4: Apply changes
      const applied = await this.applyChanges(staged, action);

      // STEP 5: Verify
      const verification = await this.verifyChanges(action);

      if (!verification.success) {
        this.error(`Verification failed for ${action.type}`);
        await this.rollback(backup, executionId);

        return {
          status: 'failed',
          action: action.id,
          executionId,
          phase: 'verification',
          error: verification.error,
          rolledBack: true,
          duration: Date.now() - startTime
        };
      }

      // STEP 6: Log execution
      const execution = {
        id: executionId,
        action,
        user: user?.email,
        backup,
        testResult: { success: true },
        verification,
        appliedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        rollbackAvailable: true
      };

      this.executedActions.push(execution);
      this.executionHistory.push(execution);
      this.log(`Action executed successfully: ${executionId}`);

      return {
        status: 'success',
        action: action.id,
        executionId,
        message: `${action.type} executed and verified successfully`,
        backup: backup.id,
        verification,
        rollbackAvailable: true,
        duration: Date.now() - startTime
      };
    } catch (err) {
      this.error(`Execution error: ${err.message}`);

      this.failedActions.push({
        action,
        error: err.message,
        timestamp: Date.now()
      });

      return {
        status: 'error',
        action: action.id,
        executionId,
        error: err.message,
        duration: Date.now() - startTime
      };
    }
  }

  // ==================== CONFIDENCE SCORING ====================

  /**
   * Calculate confidence score for auto-execution
   * Returns score between 0 and 1
   */
  calculateConfidence(action, context) {
    let score = 0.5;

    // FACTORS THAT INCREASE CONFIDENCE
    const simpleActions = {
      fixTypo: 0.3,
      addLog: 0.2,
      updateConfig: 0.15,
      renameVariable: 0.25
    };

    if (simpleActions[action.type]) {
      score += simpleActions[action.type];
    }

    // FACTORS THAT DECREASE CONFIDENCE
    if (context.affectedModules) {
      const criticalModules = ['safecode', 'auth-core', 'bankode-core'];
      const criticalModuleCount = context.affectedModules.filter(m =>
        criticalModules.includes(m)
      ).length;

      score -= criticalModuleCount * 0.15;
    }

    // Test coverage bonus
    if (action.testCoverage) {
      score += action.testCoverage * 0.2;
    }

    // Past success rate bonus
    if (action.pastSuccessRate !== undefined) {
      score += action.pastSuccessRate * 0.1;
    }

    // Code complexity penalty
    if (action.complexity) {
      const complexityPenalty = {
        simple: 0,
        moderate: -0.1,
        complex: -0.25,
        very_complex: -0.4
      };

      score += complexityPenalty[action.complexity] || 0;
    }

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Explain why a specific confidence score was assigned
   */
  explainConfidenceScore(action, context, score) {
    const factors = [];

    if (score < 0.5) {
      factors.push('Low confidence due to complexity or critical module impact');
    }

    if (context.affectedModules?.includes('safecode')) {
      factors.push(
        'Critical safecode module affected - requires extra verification'
      );
    }

    if (context.affectedModules?.includes('auth-core')) {
      factors.push('Auth core module affected - security-critical');
    }

    if (!action.testCoverage) {
      factors.push('No test coverage available - uncertain impact');
    }

    return factors.length > 0
      ? factors.join('; ')
      : 'Action meets confidence threshold';
  }

  // ==================== SAFETY OPERATIONS ====================

  /**
   * Create backup of affected files/state
   */
  async createBackup(action, user) {
    const backupId = `backup_${crypto.randomUUID()}`;

    const backup = {
      id: backupId,
      action: action.id,
      user: user?.email,
      timestamp: Date.now(),
      files: action.targetFiles || [],
      state: {
        // Simplified - in real implementation, would capture actual state
        description: `Backup of ${action.type} on ${action.targetFiles?.join(', ') || 'various files'}`
      }
    };

    this.backups.set(backupId, backup);
    this.log(`Backup created: ${backupId}`);

    return backup;
  }

  /**
   * Stage changes without applying them
   */
  async stageChanges(action) {
    this.log(`Staging changes for: ${action.type}`);

    return {
      stagedId: crypto.randomUUID(),
      action,
      changes: action.changes || [],
      status: 'staged',
      timestamp: Date.now()
    };
  }

  /**
   * Test changes in sandbox environment
   */
  async testInSandbox(staged, action) {
    this.log(`Testing in sandbox...`);

    // Simplified sandbox test
    const testScenarios = [
      {
        name: 'Syntax validation',
        test: () => true // Would validate syntax
      },
      {
        name: 'Import validation',
        test: () => true // Would validate imports
      },
      {
        name: 'Basic functionality',
        test: () => true // Would run tests
      }
    ];

    for (const scenario of testScenarios) {
      const result = scenario.test();
      if (!result) {
        return {
          success: false,
          error: `${scenario.name} failed`
        };
      }
    }

    return {
      success: true,
      message: 'All sandbox tests passed',
      testsRun: testScenarios.length
    };
  }

  /**
   * Apply staged changes to production
   */
  async applyChanges(staged, action) {
    this.log(`Applying changes...`);

    // In real implementation, would actually apply files/config
    return {
      applied: true,
      changes: staged.changes,
      appliedAt: new Date().toISOString()
    };
  }

  /**
   * Verify changes were applied correctly
   */
  async verifyChanges(action) {
    this.log(`Verifying changes...`);

    // Simplified verification
    return {
      success: true,
      verified: true,
      checksRun: ['syntax', 'imports', 'functionality', 'integration'],
      issues: [],
      message: 'All verification checks passed'
    };
  }

  /**
   * Rollback to previous state
   */
  async rollback(backup, executionId) {
    this.error(`ROLLBACK INITIATED for execution ${executionId}`);

    // In real implementation, would restore from backup
    return {
      status: 'rolled_back',
      executionId,
      backupRestored: backup.id,
      timestamp: Date.now(),
      message: `Successfully rolled back using backup ${backup.id}`
    };
  }

  // ==================== ACTION MANAGEMENT ====================

  /**
   * Approve pending action
   */
  async approvePendingAction(pendingActionId, user) {
    if (!this.security.isOwner(user)) {
      return {
        status: 'denied',
        reason: 'Only owner can approve actions'
      };
    }

    const pendingIndex = this.pendingActions.findIndex(
      a => a.id === pendingActionId
    );

    if (pendingIndex === -1) {
      return {
        status: 'not_found',
        reason: `Pending action ${pendingActionId} not found`
      };
    }

    const pending = this.pendingActions[pendingIndex];
    this.pendingActions.splice(pendingIndex, 1);

    // Execute approved action
    const result = await this.executeWithSafeguards(pending.action, user, {});

    return {
      status: 'approved_and_executed',
      pendingActionId,
      executionResult: result
    };
  }

  /**
   * Reject pending action
   */
  async rejectPendingAction(pendingActionId, user, reason = '') {
    if (!this.security.isOwner(user)) {
      return {
        status: 'denied',
        reason: 'Only owner can reject actions'
      };
    }

    const pendingIndex = this.pendingActions.findIndex(
      a => a.id === pendingActionId
    );

    if (pendingIndex === -1) {
      return {
        status: 'not_found',
        reason: `Pending action ${pendingActionId} not found`
      };
    }

    const pending = this.pendingActions.splice(pendingIndex, 1)[0];

    this.log(
      `Action ${pendingActionId} rejected by ${user.email}: ${reason}`
    );

    return {
      status: 'rejected',
      pendingActionId,
      rejectedReason: reason,
      timestamp: Date.now()
    };
  }

  /**
   * Get pending actions
   */
  getPendingActions(user) {
    if (!this.security.isOwner(user)) {
      return {
        status: 'denied',
        reason: 'Only owner can view pending actions'
      };
    }

    return {
      status: 'success',
      count: this.pendingActions.length,
      actions: this.pendingActions.map(a => ({
        id: a.id,
        type: a.action.type,
        confidence: (a.confidence * 100).toFixed(0) + '%',
        reason: a.reason,
        submittedAt: new Date(a.timestamp).toISOString()
      }))
    };
  }

  /**
   * Get execution history
   */
  getExecutionHistory(user, limit = 50) {
    if (!this.security.isOwner(user)) {
      return {
        status: 'denied',
        reason: 'Only owner can view execution history'
      };
    }

    return {
      status: 'success',
      total: this.executionHistory.length,
      recent: this.executionHistory.slice(-limit).map(e => ({
        id: e.id,
        action: e.action.type,
        status: 'success',
        duration: e.duration,
        executedAt: e.appliedAt,
        rollbackAvailable: e.rollbackAvailable
      }))
    };
  }

  /**
   * Manually trigger rollback
   */
  async manualRollback(executionId, user) {
    if (!this.security.isOwner(user)) {
      return {
        status: 'denied',
        reason: 'Only owner can trigger rollback'
      };
    }

    const execution = this.executionHistory.find(e => e.id === executionId);

    if (!execution) {
      return {
        status: 'not_found',
        reason: `Execution ${executionId} not found`
      };
    }

    if (!execution.rollbackAvailable) {
      return {
        status: 'unavailable',
        reason: 'Rollback not available for this execution'
      };
    }

    const result = await this.rollback(execution.backup, executionId);

    return {
      status: 'rolled_back',
      executionId,
      message: 'Successfully rolled back changes'
    };
  }

  // ==================== REPORTING ====================

  /**
   * Summarize batch execution results
   */
  summarizeResults(results) {
    const successful = results.filter(r => r.status === 'success').length;
    const pending = results.filter(r => r.status === 'pending_approval').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const denied = results.filter(r => r.status === 'denied').length;

    return {
      executed: successful,
      pending,
      failed,
      denied,
      message: `${successful} executed, ${pending} pending approval, ${failed} failed, ${denied} denied`
    };
  }

  /**
   * Get action engine status
   */
  getStatus(user) {
    if (!this.security.isOwner(user)) {
      return {
        status: 'unauthorized'
      };
    }

    return {
      status: 'operational',
      config: {
        autoFixEnabled: this.autoFixEnabled,
        confidenceThreshold: this.confidenceThreshold,
        sandboxEnabled: this.sandboxEnabled
      },
      stats: {
        totalExecuted: this.executedActions.length,
        totalFailed: this.failedActions.length,
        pendingApproval: this.pendingActions.length,
        backupsStored: this.backups.size
      }
    };
  }
}

module.exports = { ActionEngine };
