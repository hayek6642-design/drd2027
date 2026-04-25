# Auth Flow - Complete Architecture

## Problem Solved
**E7ki and other services were asking for auth even after CodeBank login.**

The issue: Three different E7ki implementations used incompatible auth protocols, and message type mismatch prevented auth propagation.

## Solution Implemented

### 1. Unified Auth Broadcaster (`/shared/app-state-unified.js`)
The parent window now listens for auth requests in ALL formats and responds appropriately:

```
Parent (yt-new-clear.html, indexCB.html, login.html, etc.)
  ↓
  Loads: app-state-unified.js
  ↓
  Sets: AppState.auth = { isAuthenticated, user, token, userId }
  ↓
  Listens for: auth:request, AUTH_REQUEST, e7ki:request-auth
  ↓
  Responds with: auth:response, AUTH_RESPONSE, auth:ready (matching request type)
```

### 2. Three E7ki Implementations (All Now Supported)

#### A. services/e7ki/e7ki-core.js (Original)
- Uses: `service-auth.js` 
- Protocol: `auth:request` → `auth:response`
- Status: ✅ Fixed

#### B. codebank/e7ki.html (Embedded)
- Uses: Embedded `iframe-auth-client.js`
- Protocol: `AUTH_REQUEST` → `AUTH_RESPONSE`
- Status: ✅ Fixed

#### C. codebank/e7ki/client (React)
- Uses: Custom `auth-context.jsx`
- Protocol: `e7ki:request-auth` → `auth:ready`
- Status: ✅ Fixed

### 3. Auth Flow Diagram

```mermaid
User Login (login.html)
    ↓
AppState.auth.setUser(user, token)
    ↓
Redirect to yt-new-clear.html
    ↓
AppState.auth persisted in localStorage
    ↓
CodeBank iframe (indexCB.html) loads
    ↓
CodeBank opens E7ki iframe
    ↓
E7ki requests auth (any protocol)
    ↓
Parent broadcasts auth response
    ↓
E7ki receives token and userId
    ↓
E7ki can now make authenticated API calls
```

## API Integration

### Assets Sync Endpoint (`/api/assets/sync`)
- Accepts `userId` from either:
  - Request body: `{ userId, assets }`
  - Authorization header: `Bearer {token}` (extracts userId from JWT payload)
- Queues codes for processing
- Returns sync status

Example:
```javascript
fetch('/api/assets/sync', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ assets })  // userId extracted from token
})
```

## Testing Auth Flow

1. Open browser DevTools Console
2. Load parent page (CodeBank/yt-new-clear)
3. Login via any auth method
4. Look for logs:
   - `[AppState::AUTH]` — Parent auth state
   - `[E7ki]` — E7ki auth receipt
5. Open E7ki service
6. Should NOT show auth dialog
7. Should display user's conversations

## Diagnostic Script

Load `/shared/auth-test.js` to see auth flow in real-time:
```javascript
// Parent shows: 🏠 PARENT initialized
// Iframe shows: 📦 IFRAME requesting auth...
// Success: 🎉 AUTH FLOW SUCCESSFUL - Ready to make API calls
```

## Token Handling

All tokens are:
- Stored in `localStorage` with key `jwt_token` (for services)
- Also stored in `AppState.auth.token` (for parent)
- Extracted from Authorization header if not in request body
- Never logged to console (for security)

## Message Type Reference

| Request Type | Response Type | Client |
|---|---|---|
| `auth:request` | `auth:response` | service-auth.js |
| `AUTH_REQUEST` | `AUTH_RESPONSE` | iframe-auth-client.js |
| `e7ki:request-auth` | `auth:ready` | React E7ki |

---

**Last Updated:** 2024  
**Status:** ✅ All auth flows unified and tested
