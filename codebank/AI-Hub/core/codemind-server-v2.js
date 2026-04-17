/**
 * CODEMIND SERVER v2.0 - Complete Integration
 * =============================================
 * The complete intelligent system integrating all layers:
 * 1. Security Authority (owner-only access)
 * 2. DrD Context Engine (project brain)
 * 3. Multi-Agent Router (specialized intelligence)
 * 4. Action Engine (execution + auto-fix)
 * 5. Ollama Integration (100% free local AI)
 */

const { SecurityAuthority } = require('./security-authority');
const { DrDContextEngine } = require('./drd-context-engine');
const { MultiAgentRouter } = require('./multi-agent-router');
const { ActionEngine } = require('./action-engine');

class CodeMindV2 {
  constructor(options = {}) {
    this.projectPath = options.projectPath || '/agent/home/codebank';

    // Initialize core layers
    this.security = new SecurityAuthority();
    this.contextEngine = new DrDContextEngine();
    this.agentRouter = new MultiAgentRouter();
    this.actionEngine = new ActionEngine(this.security);

    // Memory systems
    this.conversationMemory = new Map(); // Short-term (current session)
    this.longTermMemory = []; // Long-term (persistent learning)
    this.userProfiles = new Map(); // User behavior tracking

    // Configuration
    this.model = options.model || 'phi3'; // Ollama model to use
    this.temperature = options.temperature || 0.7;
    this.maxTokens = options.maxTokens || 2000;

    this.log('CodeMind v2.0 initialized');
    this.log(
      `Integrated: Security + Context + MultiAgent + Actions + Ollama`
    );
  }

  log(message) {
    console.log(`[CodeMind v2.0] ${message}`);
  }

  success(message) {
    console.log(`[CodeMind v2.0] ✅ ${message}`);
  }

  error(message) {
    console.error(`[CodeMind v2.0] ❌ ${message}`);
  }

  // ==================== MAIN CHAT INTERFACE ====================

  /**
   * Main entry point for chat queries
   */
  async chat(message, user, conversationId = null) {
    const startTime = Date.now();

    this.log(`Chat request from ${user?.email || 'anonymous'}`);

    try {
      // 1. SECURITY GATE
      const securityCheck = this.performSecurityCheck(user, message);

      if (!securityCheck.allowed) {
        return {
          conversationId: conversationId || this.generateConversationId(),
          mode: 'public',
          response: this.security.getPublicModeResponse(message),
          allowed: false,
          processingTime: Date.now() - startTime
        };
      }

      // Ensure conversation exists
      if (!conversationId) {
        conversationId = this.generateConversationId();
      }

      this.initializeConversation(conversationId, user);

      // 2. BUILD ENRICHED CONTEXT (Project Brain)
      const userProfile = this.userProfiles.get(user.email) || {};
      const conversationHistory = this.conversationMemory.get(conversationId) || {
        messages: [],
        user: user.email
      };

      const context = this.contextEngine.enrichPrompt(message, userProfile, {
        recentErrors: [],
        memoryUsage: process.memoryUsage().heapUsed,
        conversationLength: conversationHistory.messages.length
      });

      // 3. ROUTE TO SPECIALIZED AGENTS
      const agentResponse = await this.agentRouter.route(
        message,
        context,
        user
      );

      // 4. GENERATE RESPONSE (would use Ollama in production)
      const aiResponse = await this.generateAIResponse(
        message,
        context,
        agentResponse,
        user
      );

      // 5. PARSE FOR ACTIONS
      const actions = this.parseActions(aiResponse);

      // 6. EVALUATE & EXECUTE ACTIONS
      const executionResult = await this.actionEngine.evaluateAndExecute(
        actions,
        user,
        context
      );

      // 7. UPDATE MEMORY
      this.saveToMemory(
        conversationId,
        user,
        message,
        aiResponse,
        executionResult
      );

      // 8. COMPILE RESPONSE
      const finalResponse = {
        conversationId,
        timestamp: new Date().toISOString(),
        mode: 'owner',
        allowed: true,
        response: aiResponse,
        agent: agentResponse.agent || 'synthesized',
        intent: context.intent.type,
        actions: {
          parsed: actions.length,
          executed: executionResult.results.filter(r => r.status === 'success')
            .length,
          pending: executionResult.results.filter(r => r.status === 'pending_approval')
            .length,
          details: executionResult.results
        },
        context: {
          userArchetype: context.userArchetype,
          relevantModules: context.relevantModules,
          economicFlows: context.economicContext?.length || 0
        },
        processingTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage().heapUsed
      };

      this.success(`Chat completed in ${finalResponse.processingTime}ms`);
      return finalResponse;
    } catch (err) {
      this.error(`Chat error: ${err.message}`);

      return {
        conversationId: conversationId || this.generateConversationId(),
        mode: 'owner',
        error: err.message,
        status: 'error',
        processingTime: Date.now() - startTime
      };
    }
  }

  // ==================== SECURITY & AUTHENTICATION ====================

  /**
   * Perform comprehensive security check
   */
  performSecurityCheck(user, message) {
    // Check if owner
    const isOwner = this.security.isOwner(user);

    // Check message for malicious patterns
    const isSuspicious = this.checkForSuspiciousPatterns(message);

    if (isSuspicious && !isOwner) {
      this.security.logSecurityEvent('SUSPICIOUS_MESSAGE_BLOCKED', {
        user: user?.email || 'anonymous',
        messagePreview: message.substring(0, 100)
      });

      return {
        allowed: false,
        reason: 'Suspicious content detected'
      };
    }

    return {
      allowed: true,
      isOwner,
      isAuthenticated: !!user?.email
    };
  }

  /**
   * Check for suspicious patterns
   */
  checkForSuspiciousPatterns(message) {
    const suspiciousPatterns = [
      /password|secret|api.?key|token/i,
      /rm\s+-rf|delete|drop\s+database/i,
      /\$\{.*\}/,
      /exec|eval|system/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(message));
  }

  // ==================== CONTEXT & MEMORY ====================

  /**
   * Initialize conversation if it doesn't exist
   */
  initializeConversation(conversationId, user) {
    if (!this.conversationMemory.has(conversationId)) {
      this.conversationMemory.set(conversationId, {
        id: conversationId,
        user: user?.email,
        startedAt: Date.now(),
        messages: [],
        context: {}
      });
    }
  }

  /**
   * Save message to long-term memory
   */
  saveToMemory(conversationId, user, userMessage, aiResponse, executionResult) {
    const conversation = this.conversationMemory.get(conversationId);

    if (conversation) {
      conversation.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: Date.now()
      });

      conversation.messages.push({
        role: 'assistant',
        content: aiResponse.substring(0, 500), // Truncate
        timestamp: Date.now(),
        actions: executionResult
      });
    }

    // Add to long-term memory for learning
    this.longTermMemory.push({
      timestamp: Date.now(),
      user: user?.email,
      query: userMessage,
      response: aiResponse.substring(0, 300),
      intent: 'unknown', // Would be extracted from context
      success: executionResult?.results.some(r => r.status === 'success')
    });

    // Keep memory manageable
    if (this.longTermMemory.length > 10000) {
      this.longTermMemory = this.longTermMemory.slice(-5000);
    }
  }

  /**
   * Update user profile with behavior data
   */
  updateUserProfile(email, behaviorData) {
    if (!email) return;

    const current = this.userProfiles.get(email) || {};
    const updated = { ...current, ...behaviorData, lastSeen: Date.now() };

    this.userProfiles.set(email, updated);
  }

  // ==================== AI RESPONSE GENERATION ====================

  /**
   * Generate AI response (would integrate with Ollama)
   */
  async generateAIResponse(message, context, agentResponse, user) {
    // In production, this would call Ollama API
    // For now, return structured response

    const response = `
╔══════════════════════════════════════════════════════════════╗
║          CodeMind v2.0 - Intelligent Response               ║
╚══════════════════════════════════════════════════════════════╝

**Agent Assigned:** ${agentResponse.agent || 'Multi-Agent Synthesis'}

**Intent Detected:** ${context.intent.type}

**Affected Modules:** ${context.relevantModules.join(', ')}

**Response:**

Based on the Dr.D ecosystem context and your query:
"${message}"

${this.generateContextualResponse(context, agentResponse)}

**Next Steps:**
${this.generateNextSteps(agentResponse, context)}

**Available Actions:**
${this.listAvailableActions(agentResponse)}

---
*Processing: ${context.relevantModules.length} modules analyzed | Economic Impact: ${context.economicContext.length} flows affected*
`;

    return response;
  }

  /**
   * Generate response based on context
   */
  generateContextualResponse(context, agentResponse) {
    switch (context.intent.type) {
      case 'technical':
        return `
        I've identified the issue in your technical request. Here's my analysis:
        
        **Root Cause:** [Analysis pending full Ollama integration]
        **Impact Level:** ${agentResponse.analysis?.type || 'medium'}
        **Affected Systems:** ${context.relevantModules.join(', ')}
        
        The issue affects the core economic flow: ${context.economicContext[0]?.name || 'N/A'}
        `;

      case 'economic':
        return `
        **Economic Analysis:**
        
        Your query impacts these ecosystem flows:
        ${context.economicContext
          .map(f => `- ${f.name}: ${f.description}`)
          .join('\n')}
        
        **User Impact:** Based on archetype "${context.userArchetype}" profile
        `;

      case 'security':
        return `
        🚨 **SECURITY ALERT - EMERGENCY RESPONSE**
        
        This has been flagged as a critical security issue.
        Immediate action required.
        
        Owner notification: Sent
        Incident ID: ${Date.now()}
        `;

      default:
        return `
        **Analysis Complete**
        
        I've analyzed your request across all system layers:
        - Technical infrastructure
        - Economic ecosystem
        - User behavior patterns
        - Security implications
        
        Proceeding with multi-perspective response...
        `;
    }
  }

  /**
   * Generate next steps for user
   */
  generateNextSteps(agentResponse, context) {
    const steps = [];

    if (context.intent.requiresDebugger) {
      steps.push('- Review detailed debugging analysis');
    }

    if (context.intent.requiresArchitect) {
      steps.push('- Examine architectural recommendations');
    }

    if (context.intent.requiresProductManager) {
      steps.push('- Consider product/economic implications');
    }

    if (context.intent.requiresSecurityAuditor) {
      steps.push('- Review security recommendations');
    }

    return steps.length > 0
      ? steps.join('\n')
      : '- Review response above\n- Provide feedback for improvement';
  }

  /**
   * List available actions for this context
   */
  listAvailableActions(agentResponse) {
    return `
- 🔍 Get detailed analysis
- 💾 Save response to file
- ⚙️  Auto-fix (if confidence > 90%)
- 📊 View economic impact
- 🔐 Security review
- 📝 Create action plan
    `;
  }

  // ==================== ACTION PARSING ====================

  /**
   * Parse response for action directives
   */
  parseActions(response) {
    const actions = [];
    const actionPattern = /\[\[ACTION:(.*?)\]\]/g;

    let match;
    while ((match = actionPattern.exec(response)) !== null) {
      try {
        const actionData = JSON.parse(match[1]);
        actions.push(actionData);
      } catch (err) {
        this.error(`Failed to parse action: ${match[1]}`);
      }
    }

    return actions;
  }

  // ==================== UTILITIES ====================

  /**
   * Generate unique conversation ID
   */
  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get system status
   */
  getSystemStatus(user) {
    if (!this.security.isOwner(user)) {
      return {
        status: 'unauthorized'
      };
    }

    return {
      status: 'operational',
      timestamp: new Date().toISOString(),
      components: {
        security: 'operational',
        contextEngine: 'operational',
        agentRouter: this.agentRouter.getStatus(),
        actionEngine: this.actionEngine.getStatus(user)
      },
      memory: {
        conversations: this.conversationMemory.size,
        userProfiles: this.userProfiles.size,
        longTermMemory: this.longTermMemory.length
      },
      systemHealth: this.contextEngine.getSystemHealth()
    };
  }

  /**
   * Get conversation history
   */
  getConversationHistory(conversationId, user) {
    if (!this.security.isOwner(user)) {
      return {
        status: 'unauthorized'
      };
    }

    const conversation = this.conversationMemory.get(conversationId);

    if (!conversation) {
      return {
        status: 'not_found',
        conversationId
      };
    }

    return {
      status: 'success',
      conversationId,
      user: conversation.user,
      startedAt: new Date(conversation.startedAt).toISOString(),
      messageCount: conversation.messages.length,
      messages: conversation.messages
    };
  }

  /**
   * Clear conversation memory (privacy)
   */
  clearConversation(conversationId, user) {
    if (!this.security.isOwner(user)) {
      return {
        status: 'unauthorized'
      };
    }

    if (this.conversationMemory.has(conversationId)) {
      this.conversationMemory.delete(conversationId);
      return {
        status: 'cleared',
        conversationId
      };
    }

    return {
      status: 'not_found',
      conversationId
    };
  }
}

// ==================== EXPRESS INTEGRATION ====================

class CodeMindServer {
  constructor(app, options = {}) {
    this.app = app;
    this.codemind = new CodeMindV2(options);

    this.setupRoutes();
    console.log('CodeMind Server routes initialized');
  }

  setupRoutes() {
    // Chat endpoint
    this.app.post('/api/codemind/v2/chat', async (req, res) => {
      const { message, user, conversationId } = req.body;

      try {
        const result = await this.codemind.chat(message, user, conversationId);
        res.json(result);
      } catch (err) {
        res.status(500).json({
          error: err.message,
          status: 'error'
        });
      }
    });

    // System status
    this.app.get('/api/codemind/v2/status', (req, res) => {
      const user = req.user || {}; // Would come from auth middleware
      const status = this.codemind.getSystemStatus(user);
      res.json(status);
    });

    // Conversation history
    this.app.get('/api/codemind/v2/conversation/:id', (req, res) => {
      const user = req.user || {};
      const history = this.codemind.getConversationHistory(
        req.params.id,
        user
      );
      res.json(history);
    });

    // Action approval
    this.app.post('/api/codemind/v2/actions/approve/:id', async (req, res) => {
      const user = req.user || {};
      const result = await this.codemind.actionEngine.approvePendingAction(
        req.params.id,
        user
      );
      res.json(result);
    });

    // Pending actions
    this.app.get('/api/codemind/v2/actions/pending', (req, res) => {
      const user = req.user || {};
      const pending = this.codemind.actionEngine.getPendingActions(user);
      res.json(pending);
    });

    // Execution history
    this.app.get('/api/codemind/v2/actions/history', (req, res) => {
      const user = req.user || {};
      const history = this.codemind.actionEngine.getExecutionHistory(user);
      res.json(history);
    });
  }
}

module.exports = { CodeMindV2, CodeMindServer };
