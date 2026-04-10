# Auto-Mode Silver Generation Guide

## Overview

Auto-Mode is a feature in **Samma3ny** that allows users to earn silver passively by keeping the music player active for continuous 2-hour periods.

**Key Mechanic:** 
- User spends **1 code** to activate auto-mode
- Auto-mode runs continuously in the background
- Every **2 hours**, user earns **1 silver** automatically
- Can earn unlimited silver if they keep auto-mode active

---

## Architecture

### Backend Components

#### 1. **Auto-Mode API** (`/api/auto-mode/*`)
- **Module:** `api/modules/auto-mode.js`
- **Database:** `auto_mode_sessions` table

**Endpoints:**
```
POST   /api/auto-mode/start     - Activate auto-mode for user
POST   /api/auto-mode/stop      - Deactivate auto-mode
GET    /api/auto-mode/check     - Poll: check if 2 hours elapsed, award silver if yes
POST   /api/auto-mode/admin/process-awards  - Admin job: process all active sessions
```

#### 2. **Database Schema** (`auto_mode_sessions`)
```sql
CREATE TABLE auto_mode_sessions (
    id TEXT PRIMARY KEY,                    -- Session UUID
    user_id TEXT NOT NULL UNIQUE,          -- FK to users
    started_at TIMESTAMP,                   -- When session began
    last_silver_awarded_at TIMESTAMP,      -- When last silver awarded
    silver_awards_count INTEGER,           -- Total silver earned in this session
    is_active BOOLEAN,                     -- Current session status
    created_at TIMESTAMP
);
```

**How it works:**
- `started_at` → used if `last_silver_awarded_at` is NULL (first award)
- `last_silver_awarded_at` → tracks 2-hour rolling window
- Award logic: `elapsed_time = now - last_silver_awarded_at >= 2 hours` → award silver

#### 3. **Transaction Logging**
Each silver award is logged in the `transactions` table:
```json
{
    "user_id": "user123",
    "type": "silver",
    "action": "earn",
    "amount": 1,
    "service": "samma3ny",
    "metadata": {
        "source": "auto_mode",
        "sessionId": "session-uuid"
    },
    "created_at": "2024-04-11T01:40:00Z"
}
```

---

### Frontend Components

#### 1. **Auth Client** (`shared/js/auth-client.js`)

**New Methods:**
```javascript
// Activate auto-mode
await AuthClient.startAutoMode()
// Returns: { success: true, sessionId, nextSilverIn: 7200000 }

// Deactivate auto-mode
await AuthClient.stopAutoMode()
// Returns: { success: true, message }

// Check status and award silver (called every 60 seconds)
await AuthClient.checkAutoMode()
// Returns: { 
//   success: true,
//   isActive: true,
//   silverAwarded: 1,      // 1 if awarded, 0 otherwise
//   totalAwards: 3,
//   remainingMinutes: 45,
//   nextSilverIn: 7200000
// }
```

**New Events:**
```javascript
AuthClient.on('silver:awarded', (data) => {
    // data.amount = 1
    // data.totalAwards = 3
    // data.newAssets = { silver: 25, gold: 5, codes: 10 }
});
```

#### 2. **Samma3ny UI** (`codebank/samma3ny.html`)

**Auto-Mode Button:**
- Costs 1 code to activate
- Shows countdown to next silver award
- Can toggle on/off

**State Management:**
```javascript
// When user clicks "Start Auto Mode"
1. Check auth & code balance
2. Spend 1 code via AuthClient.transaction()
3. Start session via AuthClient.startAutoMode()
4. Begin polling for silver awards (60-second intervals)
5. Update button to "Stop Auto Mode" (red)

// When user clicks "Stop Auto Mode"
1. Stop polling
2. Call AuthClient.stopAutoMode()
3. Revert button to "Start Auto Mode" (green)
```

#### 3. **All Services Listen for Awards**
Every CodeBank service (SafeCode, Farragna, Pebalaash, etc.) listens for silver awards:

```javascript
AuthClient.on('silver:awarded', (data) => {
    // Update asset displays
    // Show notification
    // Refresh balance
});
```

**Auto-saving:** Each service auto-saves assets whenever they change.

---

## Flow Diagrams

### Activation Flow
```
User (Samma3ny)
    ↓ [Click "Start Auto Mode"]
    ↓ [Costs 1 Code]
Spend Code Transaction
    ↓
POST /api/auto-mode/start
    ↓
Backend creates auto_mode_sessions row
    ↓
Client stores sessionId
    ↓
Start 60-second polling interval
```

### Silver Award Flow (Every 2 Hours)
```
Client polls every 60 seconds
    ↓ [After 2 hours]
GET /api/auto-mode/check
    ↓
Backend calculates: now - last_silver_awarded_at >= 2 hours?
    ↓ [YES]
Award 1 silver to user assets
Update last_silver_awarded_at = now
Log transaction
    ↓
Response includes { silverAwarded: 1, newAssets: {...} }
    ↓
Client emits 'silver:awarded' event
    ↓
All services listen & update UI
```

### Server-Side Fallback (Admin Job)
```
Cron job (every 10 minutes)
    ↓
POST /api/auto-mode/admin/process-awards
    ↓
Query all active sessions
    ↓
For each session:
  - Check if 2 hours elapsed since last award
  - If yes: Award silver
    ↓
Return { processed: X, awarded: Y }
```

---

## Configuration

### Timing Constants
```javascript
// In api/modules/auto-mode.js
const AUTO_MODE_INTERVAL_MS = 2 * 60 * 60 * 1000;  // 2 hours = 7,200,000 ms
const SILVER_AWARD_AMOUNT = 1;
```

### Polling Intervals
```javascript
// Client polling (in auth-client.js)
setInterval(() => this.checkAutoMode(), 60000);  // Every 60 seconds

// Server-side job (set up via cron)
// Runs every 10 minutes as fallback
```

---

## Security & Edge Cases

### 1. **Double-Spending Prevention**
- Only spend code if transaction succeeds
- Backend validates code balance before deduction
- Transaction is atomic

### 2. **Session Hijacking**
- Auto-mode tied to user via `requireAuth` middleware
- Session token in httpOnly cookie (secure)
- User can only check their own session

### 3. **Time Manipulation**
- Server compares server timestamps only
- Client clock doesn't matter (used for countdown only)
- Database stores authoritative timestamps

### 4. **Inactive User Grace Period**
- Session persists indefinitely
- No inactivity timeout (user can close browser, returns later)
- Polling resumes when they reopen Samma3ny
- Time still counts towards 2-hour window

### 5. **Concurrent Sessions**
- UNIQUE constraint on `user_id` in `auto_mode_sessions`
- Only 1 active session per user
- New /start calls return existing session if already active

### 6. **Fallback Processing**
- Admin job processes rewards even if client polling fails
- If client is offline, server job awards silver next cycle
- No loss of earnings

---

## Testing

### Manual Testing

**Scenario 1: Earn Silver**
```bash
# 1. Login to Samma3ny (demo@example.com / demo123456)
# 2. Click "▶️ Start Auto Mode" (costs 1 code)
# 3. Wait 120+ seconds (simulated 2-hour window)
# 4. Observe:
#    - Silver awarded notification
#    - Balance updates in SafeCode
#    - Transaction logged in database
```

**Scenario 2: Multiple Awards**
```bash
# 1. Keep auto-mode active for 4+ hours
# 2. Should see 2+ silver awards
# 3. Check: silver_awards_count in DB = 2+
```

**Scenario 3: Stop Auto-Mode**
```bash
# 1. Click "⏹️ Stop Auto Mode"
# 2. Polling stops
# 3. No more silver awards until reactivated
```

### API Testing

```bash
# Start auto-mode
curl -X POST http://localhost:3001/api/auto-mode/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Check status
curl http://localhost:3001/api/auto-mode/check \
  -H "Authorization: Bearer $TOKEN"

# Stop auto-mode
curl -X POST http://localhost:3001/api/auto-mode/stop \
  -H "Authorization: Bearer $TOKEN"

# Admin job (requires ADMIN_TOKEN env var)
curl -X POST http://localhost:3001/api/auto-mode/admin/process-awards \
  -H "x-admin-token: $ADMIN_TOKEN"
```

---

## Monitoring & Debugging

### View Active Sessions
```sql
SELECT user_id, started_at, last_silver_awarded_at, silver_awards_count 
FROM auto_mode_sessions 
WHERE is_active = true;
```

### View Awards for a User
```sql
SELECT * FROM transactions 
WHERE user_id = 'user123' 
  AND service = 'samma3ny' 
  AND type = 'silver'
ORDER BY created_at DESC;
```

### Check for Stalled Sessions
```sql
SELECT * FROM auto_mode_sessions 
WHERE is_active = true 
  AND last_silver_awarded_at < NOW() - INTERVAL '3 hours';
```

### Server Logs
```
[AutoMode] Session started for user {userId}
[AutoMode] ✅ Awarded 1 silver to user {userId} (Total: 3)
[AutoMode Job] 🎉 Awarded silver to user {userId}
[AutoMode] Session stopped for user {userId}
```

---

## Future Enhancements

1. **Tier-Based Rewards** - Higher silver/gold rates for longer sessions
2. **Streak Bonuses** - Extra silver for consecutive days
3. **Cool-down Prevention** - Mandatory pause between rewards
4. **Analytics Dashboard** - Track total earned, session duration
5. **Notifications** - Push notifications when silver is earned
6. **Mobile Optimization** - Mobile-specific auto-mode UI

---

## Rollback Plan

If auto-mode needs to be disabled:
1. Stop cron jobs
2. Set `is_active = false` on all rows in `auto_mode_sessions`
3. Remove `/api/auto-mode` route from server.js
4. Remove `startAutoMode()`, `stopAutoMode()`, `checkAutoMode()` from auth-client.js
5. Remove "Start Auto Mode" button from `codebank/samma3ny.html`

Awards already processed cannot be rolled back (immutable transaction log).

