# 🎯 Zagel RAG System - Integration Checklist

## 8-Step Integration Workflow

### ✅ STEP 1: Install NPM Packages

```bash
npm install pdf-parse xlsx mammoth multer
```

**Files Added to GitLab:** ✅
- `server/memory-system.js`
- `server/knowledge-upload.js`
- `server/zagel-routes.js`
- `server/web-intelligence.js`
- `database/zagel-memory-schema.sql`
- `public/zagel-upload.html`
- `.env.zagel` (environment config template)

---

### 📝 STEP 2: Add Imports to server.js

Find the section with other imports (around line 10-50). **Add these three lines:**

```javascript
// ✅ ZAGEL RAG SYSTEM IMPORTS
import memorySystem from './server/memory-system.js';
import zagelRoutes from './server/zagel-routes.js';
import webIntelligence from './server/web-intelligence.js';
```

**Location in server.js:**
```javascript
// Around line 10-15, after:
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

// ADD THE THREE IMPORTS ABOVE HERE
```

---

### 🧠 STEP 3: Initialize Memory System

Find the section right **BEFORE** `server.listen()` or `app.listen()` call. **Add these lines:**

```javascript
// ✅ Initialize Zagel Memory System
await memorySystem.initialize();
console.log('[ZAGEL] Memory system initialized ✅');
```

**Location in server.js:**
```javascript
// Search for: "server.listen" or "app.listen"
// Add initialization BEFORE that call

await memorySystem.initialize();
console.log('[ZAGEL] Memory system initialized ✅');

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

### 🔌 STEP 4: Mount Zagel Routes

Find the section with other route mounts (search for `app.use('/api/`). **Add these lines:**

```javascript
// ✅ Mount Zagel Routes
app.use('/api/zagel', zagelRoutes);
console.log('[ZAGEL] Routes mounted at /api/zagel ✅');
```

**Location in server.js:**
```javascript
// Search for: app.use('/api/auth')
// Add near other API route mounts

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// ADD HERE:
app.use('/api/zagel', zagelRoutes);
console.log('[ZAGEL] Routes mounted at /api/zagel ✅');
```

---

### 🔐 STEP 5: Set Environment Variables

Update your `.env` file (or `.env.zagel`) with:

```bash
# Zagel Configuration
GEMINI_API_KEY=your_gemini_api_key_here
SERPAPI_KEY=your_serpapi_key_here
API_BASE_URL=https://dr-d-h51l.onrender.com
ZAGEL_UPLOAD_DIR=/tmp/zagel-uploads
ZAGEL_DB_PATH=./data/zagel.db
WEB_SEARCH_CACHE_TTL=3600
EMBEDDING_MODEL=models/embedding-001
MAX_UPLOAD_SIZE=104857600
WEB_INTELLIGENCE_ENABLED=true
```

**How to get API keys:**
- **Gemini API:** https://makersuite.google.com/app/apikey
- **SerpAPI:** https://serpapi.com/manage/api_key

---

### 🧪 STEP 6: Test One Endpoint

After deploying locally, test the embeddings endpoint:

```bash
curl -X POST http://localhost:3000/api/zagel/embeddings \
  -H "Content-Type: application/json" \
  -d '{"text":"hello world"}'
```

**Expected Response:**
```json
{
  "embeddings": [0.123, 0.456, ...],
  "dimension": 768,
  "status": "ok"
}
```

---

### 💾 STEP 7: Commit & Push

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat(zagel): Integrate RAG system with file uploads and web search

- Add Zagel memory system initialization
- Mount API routes at /api/zagel
- Add web intelligence auto-triggers
- Enable file upload processing (PDF, Excel, Word, JSON, CSV)
- Add semantic search via embeddings"

# Push to GitLab
git push origin main
```

---

### 🚀 STEP 8: Verify Render Deployment

1. **Check GitLab** - Verify commit appears: https://gitlab.com/dia201244/drd2027
2. **Check Render Dashboard** - Auto-deploy should start in 30 seconds
3. **Monitor Logs** - Watch for:
   ```
   [ZAGEL] Memory system initialized ✅
   [ZAGEL] Routes mounted at /api/zagel ✅
   ```
4. **Test Live** - Once deployed:
   ```bash
   curl https://dr-d-h51l.onrender.com/api/zagel/embeddings \
     -X POST -H "Content-Type: application/json" \
     -d '{"text":"test"}'
   ```

---

## ✨ Available API Endpoints

Once integrated, the following endpoints become available:

### Embeddings
- `POST /api/zagel/embeddings` - Generate vector embeddings

### File Extraction
- `POST /api/zagel/extract-pdf` - Extract text from PDF
- `POST /api/zagel/extract-excel` - Extract data from Excel
- `POST /api/zagel/extract-docx` - Extract text from Word documents

### Memory Management
- `GET /api/zagel/memories/search` - Search user memories
- `GET /api/zagel/memories/context` - Get context for LLM prompts
- `DELETE /api/zagel/memories/:memoryId` - Delete a memory

### Web Intelligence
- `POST /api/zagel/web-search` - Search the web with caching
- `POST /api/zagel/summarize` - Summarize text via Gemini

### Analytics
- `GET /api/zagel/user-profile/:userId` - View memory statistics

---

## 🐛 Troubleshooting

### "Module not found: memory-system"
- ✅ Verify files are in `/server/` directory
- ✅ Check import paths are correct (should be `./server/memory-system.js`)

### "Cannot find name 'memorySystem'"
- ✅ Ensure imports are added BEFORE route initialization
- ✅ Check there are no typos in import names

### "GEMINI_API_KEY not set"
- ✅ Add to `.env` file
- ✅ Restart server after updating .env
- ✅ Render: re-deploy or update environment variables in dashboard

### "POST /api/zagel/* returns 404"
- ✅ Verify routes are mounted with `app.use('/api/zagel', zagelRoutes)`
- ✅ Check server logs for `[ZAGEL] Routes mounted` message

---

## 📊 Integration Status Checklist

- [ ] NPM packages installed: `pdf-parse`, `xlsx`, `mammoth`, `multer`
- [ ] Three imports added to server.js
- [ ] Memory system initialization added
- [ ] Routes mounted at `/api/zagel`
- [ ] `.env.zagel` created with API keys
- [ ] Embeddings endpoint tested locally
- [ ] Changes committed and pushed to GitLab
- [ ] Render auto-deployment completed
- [ ] Endpoints tested on production

---

## 📚 Additional Resources

- **ZAGEL-INTEGRATION-GUIDE.md** - Full integration with code examples
- **zagel-memory-schema.sql** - Database schema reference
- **zagel-upload.html** - Frontend upload UI component

---

✅ **All systems ready for Zagel deployment!**
