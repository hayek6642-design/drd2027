# CodeBank Services - API Integration Guide

All CodeBank services are now **unified under a single authentication system** that syncs with `login.html` via the `auth-bridge.js` system.

## ✅ How Authentication Works

1. **User logs in on `/login.html`** (Google OAuth or Email/Password)
2. **Auth state is broadcast** to all services via `auth-bridge.js`
3. **Services listen** for auth changes using `authBridge.onAuthChange()`
4. **No separate login needed** - all services share the same session

### Example Auth Usage in Services

```javascript
// Listen for auth state changes
authBridge.onAuthChange((user, token) => {
  if (!user || !token) {
    console.log('User logged out');
    return;
  }
  
  console.log('User authenticated:', user.email);
  
  // Initialize service with authenticated user
  initializeService(user, token);
});

// Make authenticated API requests
async function fetchUserData() {
  const response = await authBridge.apiRequest('/api/user/data');
  const data = await response.json();
  return data;
}

// Get current auth state
const auth = authBridge.getAuth();
console.log(auth.isAuthenticated); // true/false
console.log(auth.user.email);      // User's email
console.log(auth.token);           // Auth token
```

---

## 🔌 Service-Specific API Integrations

### 1. 📖 **Quran Browser** (`codebank/quran.html`)

#### Connected APIs:
- **Quran API** (Free) - `https://api.quran.com/api/v4/`
- **Quranic Tafseers** - Multiple translation APIs

#### Integration Example:

```javascript
// Fetch Quran chapters (Surahs)
async function loadQuranChapters() {
  try {
    const response = await fetch('https://api.quran.com/api/v4/chapters');
    const data = await response.json();
    
    // Store in service state
    window.quranChapters = data.chapters;
    console.log(`Loaded ${data.chapters.length} chapters`);
  } catch (error) {
    console.error('Failed to load chapters:', error);
  }
}

// Fetch specific verses with translation
async function fetchVerses(chapterId, translationId = 131) {
  const url = `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${chapterId}`;
  const response = await fetch(url);
  const data = await response.json();
  
  // Get translations
  const transUrl = `https://api.quran.com/api/v4/quran/translations/${translationId}?chapter_number=${chapterId}`;
  const transResponse = await fetch(transUrl);
  const translations = await transResponse.json();
  
  return {
    verses: data.verses,
    translations: translations.translations
  };
}

// Search Quran
async function searchQuran(query) {
  const response = await fetch(
    `https://api.quran.com/api/v4/search?q=${encodeURIComponent(query)}`
  );
  return response.json();
}
```

**Features to Implement:**
- ✅ Verse-by-verse navigation
- ✅ Multi-language translations
- ✅ Full-text search
- ✅ Bookmark system (localStorage)
- ✅ Tafsir (Islamic commentary)

---

### 2. 📧 **DRD-Mail** (`codebank/drd-mail.html`)

#### Connected APIs:
- **Gmail API** (OAuth 2.0) - `https://www.googleapis.com/gmail/v1/`
- **Outlook API** (optional) - `https://graph.microsoft.com/v1.0/me/`

#### Integration Example:

```javascript
// Authenticate with Gmail OAuth
async function authenticateGmail() {
  // Use authBridge token to get Gmail access token
  const token = authBridge.getAuth().token;
  
  // Gmail requires additional OAuth scope for email access
  const scope = 'https://www.googleapis.com/auth/gmail.readonly';
  // Implement Google OAuth flow with this scope
}

// Fetch emails
async function fetchEmails(maxResults = 10) {
  const token = authBridge.getAuth().token;
  
  const response = await authBridge.apiRequest(
    'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=' + maxResults
  );
  const data = await response.json();
  
  // Fetch full message details for each
  const emails = await Promise.all(
    data.messages.map(msg => 
      fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
        headers: authBridge.getAuthHeaders()
      }).then(r => r.json())
    )
  );
  
  return emails;
}

// Send email
async function sendEmail(to, subject, body) {
  const message = {
    raw: btoa(`
      From: me
      To: ${to}
      Subject: ${subject}
      
      ${body}
    `)
  };
  
  const response = await authBridge.apiRequest(
    'https://www.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      body: JSON.stringify(message)
    }
  );
  
  return response.json();
}
```

**Features to Implement:**
- ✅ Read emails (Gmail API v1)
- ✅ Send emails
- ✅ Organize in folders/labels
- ✅ Draft management
- ✅ Contacts sync
- ✅ Attachment handling

---

### 3. ☎️ **Phone System** (`codebank/phone-calls.html`)

#### Connected APIs:
- **Twilio API** - `https://api.twilio.com/`
- **CallKit** (VoIP) - Custom WebRTC

#### Integration Example:

```javascript
// Initialize Twilio (requires backend proxy)
async function initTwilioClient() {
  // Get token from your backend (for security)
  const tokenResponse = await authBridge.apiRequest('/api/twilio/token');
  const { token } = await tokenResponse.json();
  
  // Initialize Twilio client
  const client = new Twilio.Device(token, {
    edge: ['sydney', 'dublin'],
    region: ['sydney', 'dublin']
  });
  
  client.on('ready', () => {
    console.log('Twilio Device ready');
  });
  
  return client;
}

// Make a call
async function makeCall(recipientNumber) {
  const client = window.twilioClient;
  
  const connection = client.connect({
    To: recipientNumber,
    From: window.currentUser.phoneNumber
  });
  
  connection.on('connect', () => {
    console.log('Call connected');
    startCallTimer();
  });
  
  connection.on('disconnect', () => {
    console.log('Call ended');
    stopCallTimer();
  });
  
  return connection;
}

// Store call history
async function logCallHistory(call) {
  const callRecord = {
    number: call.to,
    duration: call.duration,
    timestamp: new Date().toISOString(),
    type: 'outgoing' // or 'incoming'
  };
  
  // Save to backend
  await authBridge.apiRequest('/api/calls/log', {
    method: 'POST',
    body: JSON.stringify(callRecord)
  });
}

// Fetch call history
async function fetchCallHistory(limit = 50) {
  const response = await authBridge.apiRequest(
    `/api/calls/history?limit=${limit}`
  );
  return response.json();
}
```

**Features to Implement:**
- ✅ WebRTC-based calling (via Twilio/Jami)
- ✅ Call history tracking
- ✅ Contact management
- ✅ Call duration timer
- ✅ Missed calls notification
- ✅ Call recording (with consent)

---

### 4. 🤖 **AI Chat** (`codebank/ai-chat.html`)

#### Connected APIs:
- **OpenAI API** - `https://api.openai.com/v1/`
- **Google Gemini API** - `https://generativelanguage.googleapis.com/`
- **Anthropic Claude API** - `https://api.anthropic.com/`

#### Integration Example:

```javascript
// Initialize AI Chat with OpenAI
async function initOpenAIChat() {
  const apiKey = authBridge.getAuth().token; // Or separate API key endpoint
  
  window.openaiHeaders = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
}

// Send message to AI
async function sendChatMessage(message, threadId = null) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: window.openaiHeaders,
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// Multi-threaded conversations
async function createNewThread() {
  const thread = {
    id: `thread_${Date.now()}`,
    title: 'New Conversation',
    messages: [],
    createdAt: new Date().toISOString()
  };
  
  // Save to backend
  await authBridge.apiRequest('/api/chat/threads', {
    method: 'POST',
    body: JSON.stringify(thread)
  });
  
  return thread;
}

// Fetch all threads
async function fetchAllThreads() {
  const response = await authBridge.apiRequest('/api/chat/threads');
  return response.json();
}

// Stream responses (for real-time updates)
async function streamChatMessage(message, onChunk) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: window.openaiHeaders,
    body: JSON.stringify({
      model: 'gpt-4',
      stream: true,
      messages: [{ role: 'user', content: message }]
    })
  });
  
  const reader = response.body.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const text = new TextDecoder().decode(value);
    const lines = text.split('\n');
    
    lines.forEach(line => {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.choices[0].delta.content) {
          onChunk(data.choices[0].delta.content);
        }
      }
    });
  }
}
```

**Features to Implement:**
- ✅ Real-time streaming responses
- ✅ Multi-thread support
- ✅ Message history
- ✅ Quick prompt templates
- ✅ Model selection (GPT-4, Gemini, etc.)
- ✅ Token usage tracking

---

### 5. 🏗️ **Platform Manager** (`codebank/platform-manager.html`)

#### Connected APIs:
- **System Metrics** - `https://your-backend.com/api/metrics/`
- **Service Status** - Health check endpoints
- **Logs API** - `https://your-backend.com/api/logs/`

#### Integration Example:

```javascript
// Fetch system metrics
async function fetchSystemMetrics() {
  const response = await authBridge.apiRequest('/api/metrics/system');
  return response.json();
}

// Real-time metrics via WebSocket
function connectMetricsStream() {
  const token = authBridge.getAuth().token;
  const ws = new WebSocket(`wss://your-backend.com/api/metrics/stream?token=${token}`);
  
  ws.onmessage = (event) => {
    const metrics = JSON.parse(event.data);
    updateMetricsUI(metrics);
  };
  
  return ws;
}

// Fetch logs
async function fetchLogs(service = null, limit = 100) {
  let url = `/api/logs?limit=${limit}`;
  if (service) url += `&service=${service}`;
  
  const response = await authBridge.apiRequest(url);
  return response.json();
}

// Monitor service health
async function checkServiceHealth(serviceUrl) {
  try {
    const response = await fetch(`${serviceUrl}/health`, {
      timeout: 5000
    });
    return response.ok ? 'UP' : 'DOWN';
  } catch {
    return 'DOWN';
  }
}

// Restart service (admin only)
async function restartService(serviceName) {
  const response = await authBridge.apiRequest(
    `/api/services/${serviceName}/restart`,
    { method: 'POST' }
  );
  return response.json();
}
```

**Features to Implement:**
- ✅ Real-time metrics dashboard
- ✅ Service health monitoring
- ✅ Log viewer & filtering
- ✅ Error tracking
- ✅ Performance graphs
- ✅ Admin controls

---

## 🚀 Deployment Strategy

### Backend Requirements

Your backend needs these endpoints for full functionality:

```javascript
// Auth endpoints (already exist)
POST   /api/auth/login
POST   /api/auth/signup
POST   /api/auth/google
GET    /api/auth/me
POST   /api/auth/logout

// Service data endpoints
GET    /api/user/data
POST   /api/calls/log
GET    /api/calls/history
POST   /api/chat/threads
GET    /api/chat/threads
GET    /api/metrics/system
GET    /api/logs
POST   /api/services/{name}/restart

// External API proxies (for CORS)
POST   /api/proxy/quran
POST   /api/proxy/openai
POST   /api/proxy/twilio
```

---

## 🔐 Security Best Practices

### 1. **Token Management**
```javascript
// Always use authBridge for API requests
const response = await authBridge.apiRequest(endpoint, options);

// Never expose API keys in client code
// Use backend proxies for external APIs
```

### 2. **CORS & Proxy**
```javascript
// Don't call external APIs directly from browser
// Instead, proxy through your backend:
const response = await authBridge.apiRequest('/api/proxy/openai', {
  method: 'POST',
  body: JSON.stringify({ message, model: 'gpt-4' })
});
```

### 3. **Session Security**
```javascript
// authBridge auto-handles session validation
// Tokens expire after 24h
// Failed requests are intercepted (401 redirects to login)

authBridge.onAuthChange((user, token) => {
  if (!user) {
    // Redirect to login or show auth modal
  }
});
```

---

## 📊 Example Implementation Timeline

### Phase 1: Core Auth (✅ Complete)
- [x] Unified auth system via auth-bridge.js
- [x] Google OAuth integration
- [x] Session persistence
- [x] Service auth listening

### Phase 2: API Integration (🔄 In Progress)
- [ ] Quran API integration
- [ ] Gmail API proxy
- [ ] Twilio WebRTC setup
- [ ] OpenAI proxy endpoints
- [ ] Metrics API

### Phase 3: Advanced Features
- [ ] Real-time updates (WebSocket)
- [ ] Offline support (Service Workers)
- [ ] Advanced caching
- [ ] Analytics & logging
- [ ] Mobile app sync

---

## 💡 Tips for Integration

1. **Test with Mock Data First**
   ```javascript
   // Use localStorage for quick testing
   const mockData = { /* ... */ };
   localStorage.setItem('service_data', JSON.stringify(mockData));
   ```

2. **Use Postman for API Testing**
   - Create environment with auth tokens
   - Test endpoints before integration

3. **Monitor Rate Limits**
   ```javascript
   // Most free APIs have rate limits
   // Cache responses appropriately
   const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
   ```

4. **Error Handling**
   ```javascript
   try {
     const response = await authBridge.apiRequest(url);
     if (response.status === 401) {
       // Token expired, user will be redirected by auth bridge
     }
     const data = await response.json();
   } catch (error) {
     console.error('API Error:', error);
     // Show user-friendly message
   }
   ```

---

## 📚 Useful Resources

- [Quran API Docs](https://quran-api.com/docs/)
- [Gmail API](https://developers.google.com/gmail/api)
- [Twilio Voice API](https://www.twilio.com/docs/voice)
- [OpenAI API](https://platform.openai.com/docs)
- [MDN Web Docs](https://developer.mozilla.org/)

---

**All services are ready for API integration. Start with Phase 2!**
