# Asset Transfer Guide

## Overview

Users can now send assets (codes, silver, gold) to other users through SafeCode's peer-to-peer transfer system.

---

## How to Send Assets

### Step 1: Open SafeCode
- Navigate to **SafeCode** from the CodeBank main menu
- Ensure you're logged in and can see your asset balances

### Step 2: Click Send Button
Choose which asset type to send:
- **💳 Send Codes** - Transfer codes to another user
- **🪙 Send Silver** - Transfer silver bars
- **👑 Send Gold** - Transfer gold bars

### Step 3: Enter Transfer Details
A modal dialog will appear with:
- **Recipient Email** - The email of the user receiving assets
- **Amount** - How many units to send

Example:
```
Recipient Email: friend@example.com
Amount: 3 (codes/silver/gold)
```

### Step 4: Confirm
Click **"Send Now"** to complete the transfer.

---

## Transfer Rules

### Validation Checks

✅ **Recipient email must be valid**
- Must contain `@` symbol
- Must be an existing CodeBank user
- Cannot be your own email

✅ **Amount must be valid**
- Must be greater than 0
- Cannot exceed your current balance
- Must be a whole number

✅ **Security checks**
- Sender must be authenticated
- Session must be active
- Cannot send to yourself
- Transactions are idempotent (no duplicates)

### Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| ❌ No codes/silver/gold to send | Your balance is 0 | Earn more assets first |
| ❌ Invalid email format | Email doesn't contain @ | Use valid email (user@example.com) |
| ❌ Amount must be at least 1 | You entered 0 or negative | Enter a positive number |
| ❌ Cannot send to yourself | You entered your own email | Enter recipient's email |
| ❌ Recipient not found | User doesn't exist | Check spelling |
| ❌ Insufficient balance | You don't have enough to send | Send less, or earn more |

---

## Backend Processing

### API Endpoint: `POST /api/transfer`

**Request Body:**
```json
{
  "transactionId": "TXF-1234567890-abc123",
  "receiverEmail": "friend@example.com",
  "type": "codes|silver|gold",
  "amount": 3,
  "codes": []  // For codes: array of code values (optional)
}
```

**Success Response:**
```json
{
  "success": true,
  "transactionId": "TXF-1234567890-abc123",
  "message": "Transfer completed successfully",
  "senderBalanceAfter": 7,
  "receiverBalanceAfter": 5
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "RECEIVER_NOT_FOUND|INSUFFICIENT_BALANCE|SELF_TRANSFER_FORBIDDEN",
  "message": "Human-readable error message"
}
```

### Security Features

1. **Idempotency** - Each transfer has a unique ID. Retrying the same request won't duplicate the transfer.

2. **Atomic Transactions** - All-or-nothing: either the full transfer succeeds or it's completely rolled back.

3. **Balance Verification** - Server checks balances BEFORE and AFTER to ensure integrity.

4. **Watchdog AI** - Risk analysis prevents suspicious patterns (e.g., rapid transfers).

5. **Audit Logging** - All transfers are logged with:
   - Sender ID
   - Receiver ID
   - Amount
   - Timestamp
   - Status

---

## Frontend Implementation

### AuthClient Method

```javascript
// In shared/js/auth-client.js
await window.AuthClient.transfer(recipientEmail, assetType, amount);
```

**Parameters:**
- `recipientEmail` - Email of receiving user
- `assetType` - "codes", "silver", or "gold"
- `amount` - Number of units to transfer

**Returns:**
```javascript
{
  success: true,
  transactionId: "TXF-xxx",
  senderBalanceAfter: 7,
  receiverBalanceAfter: 5
}
```

### Event Listening

Listen for successful transfers:
```javascript
window.AuthClient.on('transfer:success', (data) => {
  console.log(`Sent ${data.amount} ${data.assetType} to ${data.receiverEmail}`);
});
```

---

## User Flow

```
SafeCode Home
    ↓
Click "📤 Send Assets" Button
    ↓
Modal Dialog Opens
    ↓
Enter Recipient Email + Amount
    ↓
Click "Send Now"
    ↓
[Frontend] Validate inputs
    ↓
[API] POST /api/transfer
    ↓
[Backend] Atomic transaction
    ├─ Check sender balance
    ├─ Lock both accounts
    ├─ Transfer ownership
    ├─ Update balances
    └─ Commit or rollback
    ↓
[Frontend] Show success/error message
    ↓
[Frontend] Refresh asset display
    ↓
SafeCode shows updated balance
```

---

## Testing

### Manual Test 1: Send Codes
1. Login as user A with 5 codes
2. Click "Send Codes"
3. Enter user B's email, amount 2
4. Confirm transfer
5. Expected: User A has 3 codes, User B gets 2

### Manual Test 2: Invalid Recipient
1. Click "Send Silver"
2. Enter invalid email: "notanemail"
3. Expected: Error "Invalid email format"

### Manual Test 3: Insufficient Balance
1. Have 1 gold
2. Try to send 2 gold
3. Expected: Error "Insufficient balance"

### Automated Test
```bash
# Test via curl
curl -X POST http://localhost:10000/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TEST-123",
    "receiverEmail": "user2@example.com",
    "type": "silver",
    "amount": 1
  }'
```

---

## Troubleshooting

### Transfer fails with "RECEIVER_NOT_FOUND"
- Check recipient email spelling
- Ensure recipient has logged in at least once

### Transfer fails with "INSUFFICIENT_BALANCE"
- You don't have enough assets
- Earn more in other services or request from friends

### Transfer succeeds but SafeCode doesn't update
- Refresh the page (Ctrl+R)
- AuthClient auto-refreshes every 5 minutes

### "Already processed" message
- Your transfer actually succeeded!
- Check your balance or recipient's account
- (Idempotency prevents duplicate processing)

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Modal won't open | Asset balance is 0 | Earn assets first |
| Submit button disabled | Network error | Check internet, try again |
| Email input won't accept text | Browser issue | Refresh page |
| Balance doesn't update | Cache | Refresh page (Ctrl+R) |

---

## Future Enhancements

- [ ] Batch transfers (send to multiple users)
- [ ] Transfer history / transaction ledger
- [ ] Scheduled transfers
- [ ] Transfer notifications / receipts
- [ ] Trading/exchange marketplace
- [ ] Transfer limits per day/week
- [ ] Tax on transfers (fee-based incentive)

---

## API Reference

### Complete Transfer Endpoint

**URL:** `POST /api/transfer`

**Authentication:** Required (session cookie)

**Rate Limiting:** 10 transfers per user per hour

**Headers:**
```
Content-Type: application/json
```

**Status Codes:**
- `200` - Transfer successful
- `400` - Invalid input (no recipient, insufficient balance, etc.)
- `401` - Not authenticated
- `403` - Security check failed (Watchdog AI)
- `404` - Recipient not found
- `500` - Server error

**Full Example:**
```bash
curl -X POST https://your-app.com/api/transfer \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionId=abc123..." \
  -d '{
    "transactionId": "TXF-1704067200000-x9y2k3m5",
    "receiverEmail": "alice@example.com",
    "type": "silver",
    "amount": 5,
    "codes": []
  }' \
  | jq .
```

---

**Status:** ✅ Live & Production Ready

Last Updated: April 2026
