# Assets Bus Implementation Requirements

## 🎯 Required API Methods

The following methods MUST be implemented in `local-assets-bus.js` with **exact signatures** (no modifications):

### 1. `lockBalance(userId, asset, amount, metadata)`

**Purpose:** Lock a specific amount of an asset for a user (for escrow)

**Parameters:**
- `userId` (string): User identifier
- `asset` (string): Asset type ('code' | 'bars')
- `amount` (number): Amount to lock
- `metadata` (object): Additional context
  - `reason` (string): Purpose of lock (used for idempotency)
  - `betId` (string): Associated bet ID
  - `timestamp` (number): Lock creation time

**Returns:**
```javascript
{
  success: boolean,
  lockId: string,      // Unique lock identifier
  error?: string       // Error message if success = false
}
```

**Requirements:**
- ✅ Must verify sufficient available balance
- ✅ Must prevent spending of locked funds
- ✅ Must support idempotency (same metadata.reason = same lock)
- ✅ Must be atomic
- ❌ Must NOT modify Ledger
- ❌ Must NOT call Neon DB

---

### 2. `unlockBalance(lockId)`

**Purpose:** Release a previously locked balance

**Parameters:**
- `lockId` (string): Lock identifier from lockBalance()

**Returns:**
```javascript
{
  success: boolean,
  error?: string
}
```

**Requirements:**
- ✅ Must verify lock exists
- ✅ Must restore funds to available balance
- ✅ Must be idempotent (calling twice = no error, same result)
- ✅ Must be atomic
- ❌ Must NOT unlock if settlement is in progress

---

### 3. `settleBet(options)`

**Purpose:** Atomically settle a bet (move funds from losers to winner)

**Parameters:**
```javascript
{
  betId: string,
  lockReferences: Array<{
    userId: string,
    lockId: string,
    amount: number
  }>,
  winnerId: string,
  winAmount: number,
  asset: string
}
```

**Returns:**
```javascript
{
  success: boolean,
  settlementId: string,  // Unique settlement identifier
  error?: string
}
```

**Requirements:**
- ✅ Must be **100% atomic** (all or nothing)
- ✅ Must verify all locks exist before proceeding
- ✅ Must unlock all locks as part of settlement
- ✅ Must deduct amounts from all lock holders
- ✅ Must credit winner with winAmount
- ✅ Must support idempotency (same betId = same result)
- ✅ Must handle rollback on any failure
- ❌ Must NOT calculate who won (receives decision)
- ❌ Must NOT modify Ledger
- ❌ Must NOT call Neon DB

**Critical:**
This is the **most important** method. Any failure here can cause:
- Double spending
- Lost funds
- Inconsistent state

---

### 4. `getBalance(userId, asset)`

**Purpose:** Get user's **available** balance (excluding locked)

**Parameters:**
- `userId` (string): User identifier
- `asset` (string): Asset type ('code' | 'bars')

**Returns:** `number` (available balance)

**Requirements:**
- ✅ Must exclude locked amounts
- ✅ Must be READ-ONLY
- ❌ Must NOT be used for business logic decisions

---

### 5. `getLockedBalance(userId, asset)`

**Purpose:** Get user's total locked balance

**Parameters:**
- `userId` (string): User identifier
- `asset` (string): Asset type

**Returns:** `number` (locked balance)

**Requirements:**
- ✅ Must be READ-ONLY
- ❌ Must NOT be used for calculations

---

### 6. `getTotalBalance(userId, asset)`

**Purpose:** Get user's total balance (available + locked)

**Parameters:**
- `userId` (string): User identifier
- `asset` (string): Asset type

**Returns:** `number` (total balance)

**Requirements:**
- ✅ Must be READ-ONLY
- ✅ available + locked must equal total

---

## 🔐 Implementation Requirements

### Atomicity

**ALL operations must be atomic:**
```javascript
// ✅ CORRECT
try {
  startTransaction();
  // All operations
  commit();
} catch {
  rollback();
}

// ❌ WRONG
operation1();
// If crash here = inconsistent state
operation2();
```

### Idempotency

**Same input = same output (no side effects on retry):**

```javascript
// Example: Lock with same reason
const lock1 = await lockBalance(user, 'code', 100, { reason: 'bet_123' });
const lock2 = await lockBalance(user, 'code', 100, { reason: 'bet_123' });
// lock1.lockId === lock2.lockId (OR lock2 returns error with lock1 reference)
```

### Error Handling

**Must handle:**
- Insufficient balance
- Lock not found
- Already settled
- Network failures (retry-safe)
- Concurrent operations

### Thread Safety

**Must support concurrent operations:**
- Multiple locks by same user
- Locks while settlement in progress
- Locks across multiple assets

---

## 🧪 Test Requirements

### Critical Tests (MUST PASS)

See `tests/critical-failure-tests.js` for full suite.

**Minimum scenarios:**
1. Disconnect during lock → No double lock
2. Disconnect during settlement → No double payout
3. Disconnect during unlock → No ghost locks
4. Page refresh → State preserved
5. Duplicate events → Idempotent handling

---

## 📋 Integration Checklist

Before replacing `assets-bus-adapter.js`:

- [ ] All 6 methods implemented with exact signatures
- [ ] Atomicity guaranteed for all operations
- [ ] Idempotency tested and verified
- [ ] All critical failure tests passing
- [ ] Concurrent operation support verified
- [ ] Error handling comprehensive
- [ ] No Ledger modifications in Assets Bus
- [ ] No Neon DB direct access
- [ ] Lock management system in place
- [ ] Settlement rollback mechanism tested

---

## ⚠️ Common Mistakes to Avoid

### ❌ DON'T

```javascript
// Don't modify Ledger from Assets Bus
await ledger.appendTransaction({ amount: -100 });

// Don't calculate game results in Assets Bus
if (score > highScore) { /* decide winner */ }

// Don't call Neon directly
await neon.updateBalance(userId, newBalance);

// Don't use balance for business logic
if (getBalance(user) > 100) { allowFeature(); }
```

### ✅ DO

```javascript
// Execute decisions made elsewhere
await settleBet({ winnerId, winAmount, ... });

// Provide read-only data
const balance = getBalance(userId);

// Maintain internal lock state
this.locks.set(lockId, { userId, amount, ... });

// Emit events for other systems
this.emit('balance-changed', { userId, newBalance });
```

---

## 🏁 Final Validation

Before production:

```bash
# Run critical tests
?run-critical-tests

# Expected output:
# ✅ ALL TESTS PASSED
# ✅ SYSTEM READY FOR PRODUCTION
```

If any test fails: **DEPLOYMENT BLOCKED**

---

## 📞 Support

For questions about this API:
- See `assets-bus-adapter.js` for mock implementation
- See `betting-core.js` for usage examples
- See `tests/critical-failure-tests.js` for test scenarios
