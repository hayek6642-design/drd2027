# Zagel Knowledge Upload & Web Intelligence - Integration Guide

## 🎯 Overview

Zagel now has a **full RAG (Retrieval Augmented Generation)** system with:
- 📄 **File Upload** (PDF, TXT, CSV, XLSX, JSON, DOCX)
- 🧠 **Memory System** (semantic storage + retrieval)
- 🔍 **Web Intelligence** (smart search triggers)
- 🧮 **Embeddings** (Gemini-powered)
- 💾 **Smart Caching** (web results)

---

## 📋 Files Pushed to GitLab

| File | Purpose | Path |
|------|---------|------|
| `zagel-memory-schema.sql` | Database tables & indexes | `database/` |
| `memory-system.js` | Core memory management | `server/` |
| `knowledge-upload.js` | File processing pipeline | `server/` |
| `zagel-routes.js` | API endpoints | `server/` |
| `web-intelligence.js` | Smart search triggers | `server/` |
| `zagel-upload.html` | Frontend UI component | `public/` |

---

## 🔧 Server.js Integration

Add these imports to the top of `server.js`:

```javascript
const memorySystem = require('./server/memory-system');
const zagelRoutes = require('./server/zagel-routes');
const webIntelligence = require('./server/web-intelligence');
```

Mount the Zagel routes (before `server.listen()`):

```javascript
// Initialize memory system
await memorySystem.initialize();
console.log('[ZAGEL] Memory system initialized');

// Mount Zagel API routes
server.use('/api/zagel', zagelRoutes);
console.log('[ZAGEL] Routes mounted at /api/zagel/*');
```

---

## 📦 Required NPM Packages

Add to `package.json` dependencies:

```json
{
  "pdf-parse": "^1.1.1",
  "xlsx": "^0.18.5",
  "mammoth": "^1.6.0",
  "multer": "^1.4.5-lts.1"
}
```

Install:
```bash
npm install pdf-parse xlsx mammoth multer
```

---

## 🗄️ Database Setup

The memory system **automatically initializes** database tables on startup. No manual SQL needed!

To manually initialize (optional):
```bash
sqlite3 codebank.db < database/zagel-memory-schema.sql
```

---

## 🔑 Environment Variables

Add to `.env`:

```env
# Gemini API (for embeddings & summarization)
GEMINI_API_KEY=your_gemini_api_key

# SerpAPI (for web search)
SERPAPI_KEY=your_serpapi_key

# API Base URL
API_BASE_URL=http://localhost:3000
```

---

## 🚀 API Endpoints

### Embeddings
```
POST /api/zagel/embeddings
{
  "text": "Some text to embed"
}
→ { success: true, embedding: [...] }
```

### File Extraction
```
POST /api/zagel/extract-pdf
POST /api/zagel/extract-excel
POST /api/zagel/extract-docx
→ { success: true, text: "..." }
```

### Web Search
```
POST /api/zagel/web-search
{
  "query": "latest AI trends",
  "maxResults": 5,
  "userId": "user123"
}
→ { success: true, results: [...], cached: false }
```

### Memory Search
```
GET /api/zagel/memories/search?userId=user123&query=python&limit=5
→ { success: true, memories: [...] }
```

### Context Memories
```
GET /api/zagel/memories/context?userId=user123&query=AI trends&limit=3
→ { success: true, memories: [...] }
```

### User Profile
```
GET /api/zagel/user-profile/user123
→ { success: true, profile: { total_memories: 45, total_uploads: 3 } }
```

### Summarization
```
POST /api/zagel/summarize
{
  "text": "Long text...",
  "maxTokens": 200
}
→ { success: true, summary: "..." }
```

---

## 🎨 Frontend Integration

### Add Upload UI to Zagel's Page

In your HTML where you want the upload widget:

```html
<!-- Include Zagel Upload Component -->
<div id="zagel-uploads-section"></div>

<script>
  // Load upload UI
  fetch('/zagel-upload.html')
    .then(r => r.text())
    .then(html => {
      document.getElementById('zagel-uploads-section').innerHTML = html;
    });
</script>
```

### Use Web Intelligence in Chat Responses

```javascript
// When Zagel is about to respond
const userQuery = "What's the latest on AI?";
const geminiResponse = "...Zagel's response...";

// Enhance with web intel
const enhancedResponse = await webIntelligence.enhanceResponse(
  userQuery,
  userId,
  geminiResponse
);

// Send enhanced response to user
```

---

## 💡 Usage Examples

### Uploading a File

```javascript
// Frontend
const file = document.getElementById('file-input').files[0];
const formData = new FormData();
formData.append('file', file);
formData.append('userId', currentUserId);

const response = await fetch('/api/zagel/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(`✅ Created ${result.memoriesCreated} memories`);
```

### Searching Memories

```javascript
// Semantic search
const query = "machine learning";
const memories = await memorySystem.search(userId, query, limit=5);

// Get context for prompt
const context = await memorySystem.getContextMemories(userId, query, limit=3);

// Use in Gemini prompt
const prompt = `Context: ${context.map(m => m.content).join('\n\n')}
User question: ${userQuery}`;
```

### Triggering Web Search

```javascript
// In Zagel's chat handler
if (webIntelligence.shouldSearch(userQuery)) {
  const webResults = await webIntelligence.searchWeb(userQuery, userId);
  console.log(`Found ${webResults.results.length} web results`);
  
  // Inject into response
  const enhancedResponse = webIntelligence.buildEnhancement(webResults);
}
```

---

## 🧪 Testing

### Test Embeddings
```bash
curl -X POST http://localhost:3000/api/zagel/embeddings \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world"}'
```

### Test Web Search
```bash
curl -X POST http://localhost:3000/api/zagel/web-search \
  -H "Content-Type: application/json" \
  -d '{"query": "latest AI news", "userId": "test-user"}'
```

### Test Memory Storage
```bash
curl -X GET "http://localhost:3000/api/zagel/user-profile/test-user"
```

---

## 🔒 Security Notes

- ✅ SQL injection protection via parameterized queries
- ✅ File type validation before processing
- ✅ File size limits (10MB max)
- ✅ API key protection (use environment variables)
- ✅ User isolation (memories scoped to userId)
- ⚠️ Add authentication middleware to `/api/zagel/*` routes

Example middleware:
```javascript
app.use('/api/zagel', authMiddleware, zagelRoutes);
```

---

## 📊 Performance Optimization

| Feature | Optimization |
|---------|---------------|
| Web Search | 1-hour caching with TTL |
| Embeddings | Batch generation for chunked uploads |
| Memory Search | Database indexes on user_id, importance_score, created_at |
| Chunking | Smart breaks at sentence/word boundaries + 200 char overlap |

---

## 🐛 Troubleshooting

### PDF extraction fails
- Check: `pdf-parse` is installed
- Check: File is valid PDF
- Check: File size < 10MB

### Embeddings return empty
- Check: `GEMINI_API_KEY` is set
- Check: Gemini API quota available
- Check: Text length > 0

### Web search no results
- Check: `SERPAPI_KEY` is set
- Check: Network connectivity
- Check: SerpAPI quota available

### Memory not storing
- Check: Database tables created (check schema)
- Check: userId is provided
- Check: Memory System initialized

---

## 🚀 Next Steps

1. ✅ Push all files to GitLab (DONE)
2. ⏳ Add integration code to `server.js`
3. ⏳ Install npm packages
4. ⏳ Set environment variables
5. ⏳ Add auth middleware to Zagel routes
6. ⏳ Test each endpoint
7. ⏳ Deploy to Render

---

## 📞 Support

For issues or questions:
1. Check logs: `[MEMORY]`, `[ROUTES]`, `[WEB_INTEL]` tags
2. Test endpoints individually
3. Verify API keys and environment variables
4. Check database schema initialization

---

**Status**: Ready for integration! 🎉