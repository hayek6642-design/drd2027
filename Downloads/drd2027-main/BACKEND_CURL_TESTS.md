# 🧪 Backend Auth v2.0 - CURL Testing Guide

## Setup

**Test API URL:** `https://dr-d-h51l.onrender.com`  
**Test Email:** `test@example.com`  
**Test Password:** `password123`  

---

## Test 1: Check Auth Status

```bash
curl -X GET https://dr-d-h51l.onrender.com/api/auth-v2/status
```

**Expected Response:**
```json
{
  "status": "ok",
  "authV2": "operational",
  "timestamp": 1234567890
}
```

---

## Test 2: Login (Get JWT Token)

```bash
curl -X POST https://dr-d-h51l.onrender.com/api/auth-v2/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' \
  -c cookies.txt
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "test@example.com",
    "name": "Test User",
    "createdAt": 1234567890
  },
  "token": "eyJhbGc...",
  "expiresIn": "24h"
}
```

**Note:** The `-c cookies.txt` flag saves the auth cookie to a file for use in subsequent requests.

---

## Test 3: Get Current User (/me)

```bash
# Using saved cookie:
curl -X GET https://dr-d-h51l.onrender.com/api/auth-v2/me \
  -b cookies.txt

# OR using Bearer token:
curl -X GET https://dr-d-h51l.onrender.com/api/auth-v2/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "test@example.com",
    "name": "Test User",
    "createdAt": 1234567890
  }
}
```

---

## Test 4: Validate Token

```bash
curl -X POST https://dr-d-h51l.onrender.com/api/auth-v2/validate \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "valid": true,
  "user": {
    "id": "user_123",
    "email": "test@example.com",
    "name": "Test User",
    "createdAt": 1234567890
  },
  "expiresAt": 1234567890000
}
```

---

## Test 5: Merge Guest Data

```bash
curl -X POST https://dr-d-h51l.onrender.com/api/auth-v2/merge-guest \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "guestSessionId": "guest_abc123",
    "guestData": {
      "preferences": { "theme": "dark" },
      "savedItems": [1, 2, 3],
      "history": ["item1", "item2"]
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "merged": {
    "userId": "user_123",
    "merged": true,
    "guestDataKeys": ["preferences", "savedItems", "history"],
    "timestamp": 1234567890
  }
}
```

---

## Test 6: Logout

```bash
curl -X POST https://dr-d-h51l.onrender.com/api/auth-v2/logout \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "success": true
}
```

---

## Test 7: Verify Logout (Token Should Be Invalid)

```bash
curl -X POST https://dr-d-h51l.onrender.com/api/auth-v2/validate \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "valid": false,
  "error": "Invalid or expired token"
}
```

---

## Automated Test Script

Save this as `test-auth-v2.sh`:

```bash
#!/bin/bash

API="https://dr-d-h51l.onrender.com"
COOKIE_JAR="cookies.txt"
rm -f $COOKIE_JAR

echo "🧪 Starting Auth v2.0 Backend Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Status
echo -e "\n✓ Test 1: Check Status"
curl -s -X GET $API/api/auth-v2/status | jq .

# Test 2: Login
echo -e "\n✓ Test 2: Login"
LOGIN_RESPONSE=$(curl -s -X POST $API/api/auth-v2/login \
  -H "Content-Type: application/json" \
  -c $COOKIE_JAR \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')
echo $LOGIN_RESPONSE | jq .
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

# Test 3: Get User (/me)
echo -e "\n✓ Test 3: Get Current User"
curl -s -X GET $API/api/auth-v2/me \
  -b $COOKIE_JAR | jq .

# Test 4: Validate Token
echo -e "\n✓ Test 4: Validate Token"
curl -s -X POST $API/api/auth-v2/validate \
  -b $COOKIE_JAR | jq .

# Test 5: Merge Guest Data
echo -e "\n✓ Test 5: Merge Guest Data"
curl -s -X POST $API/api/auth-v2/merge-guest \
  -H "Content-Type: application/json" \
  -b $COOKIE_JAR \
  -d '{
    "guestSessionId": "guest_test_123",
    "guestData": {
      "theme": "dark",
      "language": "en",
      "settings": { "notifications": true }
    }
  }' | jq .

# Test 6: Logout
echo -e "\n✓ Test 6: Logout"
curl -s -X POST $API/api/auth-v2/logout \
  -b $COOKIE_JAR | jq .

# Test 7: Verify Logout
echo -e "\n✓ Test 7: Verify Token Invalid After Logout"
curl -s -X POST $API/api/auth-v2/validate \
  -b $COOKIE_JAR | jq .

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All tests completed!"
```

Run it:
```bash
chmod +x test-auth-v2.sh
./test-auth-v2.sh
```

---

## Error Testing

### Invalid Credentials
```bash
curl -X POST https://dr-d-h51l.onrender.com/api/auth-v2/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "wrongpassword"
  }'
```

**Expected:** `401 Unauthorized` with error message

### Missing Token
```bash
curl -X GET https://dr-d-h51l.onrender.com/api/auth-v2/me
```

**Expected:** `401 Unauthorized` with "No token provided"

### Expired/Invalid Token
```bash
curl -X GET https://dr-d-h51l.onrender.com/api/auth-v2/me \
  -H "Authorization: Bearer invalid.token.here"
```

**Expected:** `401 Unauthorized` with "Invalid or expired token"

---

## Debugging Tips

### View Response Headers
```bash
curl -i -X GET https://dr-d-h51l.onrender.com/api/auth-v2/me \
  -b cookies.txt
```

### View Full Cookie Details
```bash
cat cookies.txt
```

### Use jq to Pretty-Print JSON
```bash
curl -s ... | jq '.' 
```

### Save Response to File
```bash
curl -s ... > response.json
cat response.json | jq .
```

### Check Response Time
```bash
curl -w "\nTime: %{time_total}s\n" -s ...
```

---

## Testing Checklist

- [ ] Status endpoint responds
- [ ] Login with valid credentials returns token
- [ ] Login with invalid credentials returns 401
- [ ] /me returns current user with valid token
- [ ] /me returns 401 without token
- [ ] Validate returns "valid: true" with good token
- [ ] Validate returns "valid: false" with bad token
- [ ] Merge guest data merges successfully
- [ ] Logout clears token
- [ ] Token invalid after logout

---

## Browser Testing

You can also test from browser console:

```javascript
// Login
fetch('https://dr-d-h51l.onrender.com/api/auth-v2/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  })
})
.then(r => r.json())
.then(data => console.log(data))

// Get User
fetch('https://dr-d-h51l.onrender.com/api/auth-v2/me', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log(data))

// Logout
fetch('https://dr-d-h51l.onrender.com/api/auth-v2/logout', {
  method: 'POST',
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log(data))
```

