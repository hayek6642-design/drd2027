# 🏗️ CodeMind v2.0 - Complete Architecture

## Overview

CodeMind v2.0 is a sophisticated, multi-layered intelligent system that integrates:

1. **Security Authority** - Access control & audit
2. **DrD Context Engine** - Project ecosystem knowledge
3. **Multi-Agent Router** - Specialized intelligence
4. **Action Engine** - Safe execution & auto-fix
5. **Express Integration** - HTTP API & server

Each layer is independently functional but deeply integrated for coherent decision-making.

---

## Layer 1: Security Authority

### Purpose
Enforce strict owner-only access and maintain comprehensive audit trails.

### Key Components

#### Identity Verification
```
isOwner(user)                    → Check if dia201244@gmail.com
verifyOwnerToken(token, user)    → Validate session token
generateOwnerToken(user)         → Create secure token
```

#### Access Control
```
canAccessFile(path, user)        → File-level permissions
canExecuteAction(type, user)     → Action-level permissions
isForbiddenPath(path)            → Blacklist checking
```

#### Security Events
```
logSecurityEvent(event, details) → Audit logging
isSuspicious(entry)              → Anomaly detection
alertOwner(entry)                → Critical alerting
getAuditLog(user)                → Audit trail retrieval
```

### Forbidden Paths
```javascript
[
  'auth-core.js',
  'session-store.js',
  'database.sqlite',
  '.env',
  'server.js',
  'bankode-core.js',
  '/ledger',
  '/private-key'
]
```

### Dangerous Actions
```javascript
[
  'readFile',
  'writeFile',
  'deleteFile',
  'applyChanges',
  'executeCommand',
  'gitCommit',
  'deployToProduction',
  'accessDatabase'
]
```

### Response Flow
```
Request → Security Check → Owner? Yes → Proceed
                                   No  → Public Mode or Denial
```

---

## Layer 2: DrD Context Engine

### Purpose
Provide rich understanding of the Dr.D ecosystem as a living, interconnected system.

### Key Components

#### Project Identity
```javascript
{
  name: 'Dr.D / Bankode',
  type: 'Gamified Reward Ecosystem',
  corePhilosophy: 'Watch → Earn → Spend → Play → Connect',
  economyType: 'Closed-loop code-based currency'
}
```

#### Module Brain
Deep knowledge of all 9 core modules:
- **yt-player**: Video earnings engine
- **safecode**: Central vault (critical)
- **pebalaash**: P2P marketplace
- **farragna**: Social engagement
- **gamesCentre**: Gaming zone (risky)
- **battalooda**: Creative studio
- **corsa**: Trading platform (risky)
- **e7ki**: Secure messaging
- **zagel**: AI companion

Each module has:
```javascript
{
  purpose,
  relations: [...],        // Module dependencies
  economyRole,            // How it affects economy
  criticality,            // CRITICAL/HIGH/MEDIUM
  dataFlow,               // What flows through it
  riskLevel,              // For dangerous modules
  alertConditions         // What triggers alarms
}
```

#### Economic Flows
Five interconnected flows that define the system:

1. **Watch to Spend** (primary)
   ```
   yt-player → safecode → [pebalaash | farragna | gamesCentre]
   ```

2. **Create to Monetize**
   ```
   battalooda → audience → farragna → safecode
   ```

3. **Risk to Reward**
   ```
   safecode → [gamesCentre | corsa] → [win→safecode | lose→void]
   ```

4. **Engage to Earn**
   ```
   farragna → likes/engagement → rewards → safecode
   ```

5. **Peer Exchange**
   ```
   safecode → pebalaash → peer_transfer → real_value
   ```

#### User Archetypes
7 behavior patterns with specific needs and interventions:

```javascript
{
  'newUser': { /* just joined */ },
  'active_watcher': { /* consistent earner */ },
  'trader': { /* market-focused */ },
  'creator': { /* content-focused */ },
  'gambler': { /* high-risk, needs monitoring */ },
  'social_butterfly': { /* engagement-focused */ },
  'whale': { /* high-value adopter */ }
}
```

#### Intent Patterns
Detects user intent from keywords:

```javascript
{
  technical: { priority: 'high', requiresDebugger: true },
  performance: { priority: 'medium', requiresArchitect: true },
  economic: { priority: 'medium', requiresProductManager: true },
  security: { priority: 'critical', immediateEscalation: true },
  learning: { priority: 'low', requiresAllAgents: true }
}
```

### Context Enrichment Process
```
User Query
    ↓
[Intent Detection] → What type of question?
    ↓
[Module Relevance] → Which modules are affected?
    ↓
[User Classification] → What archetype is this?
    ↓
[Economic Context] → Which flows are impacted?
    ↓
[Rich Context Object]
    ↓
→ To Router & Agents
```

### Runtime State Tracking
```javascript
{
  activeUsers,
  transactionsPerSecond,
  memoryUsage,
  failingModules: [],
  economicHealth: {
    totalCodesInCirculation,
    averageUserBalance,
    transactionVolume24h
  }
}
```

---

## Layer 3: Multi-Agent Router

### Purpose
Route queries to specialized agents, synthesize responses.

### Four Specialized Agents

#### A. Debugger Agent
**Expertise**: Bug finding, error analysis, testing

Process:
```
1. Identify error patterns/symptoms
2. Trace code flow in affected modules
3. Check error logs & stack traces
4. Identify root cause
5. Suggest fix with test cases
6. Create rollback plan
```

Returns:
```javascript
{
  type: 'debug_analysis',
  suspectedModules: [...],
  severity: 'CRITICAL|HIGH|MEDIUM|LOW',
  proposedSolution: { ... },
  testCases: [ ... ],
  rollbackPlan: { ... }
}
```

#### B. Architect Agent
**Expertise**: System design, scalability, patterns

Process:
```
1. Identify current architecture pattern
2. Find scalability bottlenecks
3. Assess performance issues
4. Suggest optimized architecture
5. Provide migration plan
```

Returns:
```javascript
{
  type: 'architecture_analysis',
  currentArchitecture: { ... },
  bottlenecks: [ ... ],
  suggestedImprovement: { ... },
  scalabilityAssessment: { ... }
}
```

#### C. Product Manager Agent
**Expertise**: User journey, economic impact, ethics

Process:
```
1. Assess user journey impact
2. Analyze economic implications
3. Evaluate user satisfaction
4. Check ethical concerns
5. Suggest balanced approach
```

Returns:
```javascript
{
  type: 'economic_analysis',
  userJourneyImpact: { ... },
  economicImplications: { ... },
  userSatisfactionImpact: { ... },
  ethicalConsiderations: { ... }
}
```

#### D. Security Auditor Agent
**Expertise**: Threat analysis, incident response

Process:
```
1. IMMEDIATE owner notification
2. Analyze threat vector
3. Identify affected assets
4. Generate immediate actions
5. Create incident protocol
```

Returns (Emergency Mode):
```javascript
{
  type: 'security_incident_response',
  alertLevel: 'CRITICAL',
  immediateActions: [ ... ],
  investigation: { ... },
  escalationPath: [ ... ],
  contactOwner: true
}
```

### Router Logic
```
Query → Intent Detection
    ↓
   Security? → Auditor (IMMEDIATE)
    ↓
   Technical? → Debugger
    ↓
   Architecture? → Architect
    ↓
   Economic? → Product Manager
    ↓
   Learning? → All Agents (Synthesis)
    ↓
   Default? → Synthesis
```

### Collaborative Response
For complex queries, multiple agents contribute:
```
Query
  ↓
[Route to all relevant agents in parallel]
  ↓
[Synthesize: Combine technical, architectural, product, security views]
  ↓
[Unified response with trade-offs and recommendations]
```

---

## Layer 4: Action Engine

### Purpose
Safely evaluate, execute, and manage system modifications.

### Execution Flow

```
Action Request
    ↓
[Security Check] → Authorized?
    ↓ No → Deny
    ↓ Yes
[Confidence Score] → Calculate 0-1 score
    ↓
High (>0.9)     → [Auto-Execute Path]
Medium/Low       → [Approval Queue]
    ↓
[Auto-Execute Path]:
  1. Create Backup
  2. Stage Changes
  3. Test in Sandbox
  4. Apply Changes
  5. Verify Success
  6. Log Execution
  7. Return Success/Rollback
    ↓
[Approval Queue]:
  1. Add to Pending
  2. Notify Owner
  3. Wait for Approval/Rejection
  4. If Approved → Execute
  5. If Rejected → Discard
```

### Confidence Scoring

Score = Base(0.5) + Adjustments

**Factors that increase confidence:**
```
fixTypo              +0.30
addLog               +0.20
updateConfig         +0.15
renameVariable       +0.25
testCoverage         +0.20/each
pastSuccessRate      +0.10/point
```

**Factors that decrease confidence:**
```
safecode module      -0.15
auth-core module     -0.15
moderate complexity  -0.10
complex code         -0.25
very complex         -0.40
```

**Example**:
```
Base Score:          0.50
+ addLog:            0.20  (simple action)
- safecode module:  -0.15  (critical)
+ test coverage:     0.15  (80% coverage)
_________________________________
Final:               0.70 → Requires Approval (threshold: 0.90)
```

### Safeguarded Execution

**When confidence > 0.9:**

1. **Backup Phase**
   ```javascript
   backup = {
     id,
     action,
     user,
     timestamp,
     files,
     state
   }
   ```

2. **Sandbox Testing**
   - Syntax validation
   - Import validation
   - Basic functionality tests
   - Integration tests
   
   Failure → Rollback immediately

3. **Staged Application**
   - Changes not live until verification
   - Isolated test environment
   
4. **Verification**
   - Run full test suite
   - Check for regressions
   - Verify module interactions
   - Confirm no side effects

5. **Audit Logging**
   ```javascript
   execution = {
     id,
     action,
     user,
     backup,
     testResult,
     verification,
     appliedAt,
     duration
   }
   ```

### Rollback Support

**Manual Rollback** (owner only):
```
Owner Request → Restore from Backup → Verify Rollback → Success
```

**Automatic Rollback** (on failure):
```
Sandbox Failure → Rollback → Alert Owner → Log Incident
```

---

## Integration Points

### Express API Routes

```javascript
POST   /api/codemind/v2/chat
       → Main chat interface
       
GET    /api/codemind/v2/status
       → System health & status
       
GET    /api/codemind/v2/conversation/:id
       → Conversation history (owner only)
       
GET    /api/codemind/v2/actions/pending
       → Pending approval queue (owner only)
       
GET    /api/codemind/v2/actions/history
       → Execution history (owner only)
       
POST   /api/codemind/v2/actions/approve/:id
       → Approve pending action (owner only)
       
POST   /api/codemind/v2/actions/reject/:id
       → Reject pending action (owner only)
```

### Memory Systems

**Conversation Memory** (Session):
```
Map<conversationId, {
  id,
  user,
  startedAt,
  messages: [{ role, content, timestamp }],
  context
}>
```

**Long-Term Memory** (Learning):
```
Array<{
  timestamp,
  user,
  query,
  response,
  intent,
  success
}>

Limit: 10K entries (keeps newest 5K on overflow)
```

**User Profiles**:
```
Map<email, {
  totalTransactions,
  contentCreated,
  tradesCompleted,
  gamesSessions,
  lastSeen,
  archetype
}>
```

---

## Data Flow

### Chat Request Flow

```
HTTP Request
    ↓
[Security Gate]
    ↓
[Context Enrichment]
    ├→ Intent Detection
    ├→ Module Relevance
    ├→ User Classification
    └→ Economic Context
    ↓
[Multi-Agent Router]
    ├→ Route to relevant agents
    ├→ Get specialized analysis
    └→ Synthesize response
    ↓
[Action Parsing]
    ├→ Extract [[ACTION:...]]
    └→ Prepare execution
    ↓
[Action Engine]
    ├→ Security check
    ├→ Confidence scoring
    ├→ Execute or queue
    └→ Log results
    ↓
[Memory Update]
    ├→ Conversation history
    ├→ Long-term learning
    └→ User profile
    ↓
[Response Compilation]
    ├→ Agent response
    ├→ Action results
    ├→ Context metadata
    └→ Processing time
    ↓
HTTP Response
```

---

## Error Handling

### Levels of Failure

**Level 1: Security Failure**
```
→ Deny immediately
→ Log security event
→ Alert on suspicious patterns
```

**Level 2: Sandbox Test Failure**
```
→ Rollback automatically
→ Log failure
→ Return to pending queue
```

**Level 3: Verification Failure**
```
→ Rollback automatically
→ Alert owner
→ Create incident report
```

**Level 4: Execution Error**
```
→ Try to rollback
→ Log comprehensive error
→ Escalate to owner
```

---

## Performance Characteristics

### Layer 1 (Security)
- **Time**: < 1ms
- **Operations**: Hash comparison, list lookup
- **Scaling**: O(1) for isOwner, O(n) for forbidden path check

### Layer 2 (Context Engine)
- **Time**: 5-50ms
- **Operations**: Intent detection, pattern matching, module lookup
- **Scaling**: O(1) for most operations

### Layer 3 (Agent Router)
- **Time**: 100-500ms
- **Operations**: Parallel agent analysis
- **Scaling**: Depends on Ollama model (local, instant)

### Layer 4 (Action Engine)
- **Time**: 500ms - 5s
- **Operations**: Backup creation, sandbox test, verification
- **Scaling**: Depends on change size and test count

### Total Flow
- **Simple request**: 100-200ms
- **Complex request**: 500ms - 5s
- **With auto-fix**: 1-10s

---

## Security Model

### Trust Boundaries

```
┌─────────────────────────────────────────────┐
│  Owner Only (dia201244@gmail.com)           │
│  ├─ File access (all)                       │
│  ├─ Dangerous actions (all)                 │
│  ├─ Action approval                         │
│  ├─ Audit logs                              │
│  └─ System configuration                    │
└─────────────────────────────────────────────┘
         ↑
         │ Security Boundary
         ↓
┌─────────────────────────────────────────────┐
│  Authenticated Users (same account)         │
│  ├─ Limited file access (public only)       │
│  ├─ Read-only operations                    │
│  ├─ No system changes                       │
│  └─ Limited history access                  │
└─────────────────────────────────────────────┘
         ↑
         │ Security Boundary
         ↓
┌─────────────────────────────────────────────┐
│  Public Users (anyone)                      │
│  ├─ Platform overview only                  │
│  ├─ General information                     │
│  └─ No access to internals                  │
└─────────────────────────────────────────────┘
```

### Audit Logging

Every action is logged with:
```javascript
{
  timestamp,
  event,                    // ACTION_TYPE
  details: {
    user,
    action,
    result,
    duration,
    module
  }
}
```

Logs stored in memory + persistent storage.

---

## Future Extensions

### Ollama Integration
```javascript
const ollama = new OllamaClient({
  model: 'phi3',           // Or mistral, codeqwen
  temperature: 0.7,
  contextLength: 4096
});

// Actual AI generation instead of mocked
const response = await ollama.generate(enrichedPrompt);
```

### Database Monitoring
```javascript
const monitor = new DatabaseMonitor({
  trackTables: ['users', 'transactions', 'balances'],
  alertOnAnomaly: true
});
```

### Real-time Updates
```javascript
io.on('connection', (socket) => {
  // Push real-time system state
  setInterval(() => {
    socket.emit('system:state', runtimeState);
  }, 5000);
});
```

---

**CodeMind v2.0 Architecture** - Intelligent, Safe, Transparent.
