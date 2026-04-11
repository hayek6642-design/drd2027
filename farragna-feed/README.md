# 🎬 Farragna Feed System
## Zero-Storage Video Streaming Architecture

### Overview
Farragna Feed is a **zero-storage** video streaming system that fetches videos directly from free APIs (Pexels, Pixabay, Mixkit) without storing video files. Only metadata and streaming URLs are cached.

### Key Features
✅ **No video storage** - streams directly from source APIs  
✅ **Multi-source fallback** - Pexels → Pixabay → Mixkit  
✅ **Rate limiting** - respects API quotas  
✅ **URL caching** - 24h TTL for Pixabay compliance  
✅ **Attribution overlays** - required by both Pexels & Pixabay  
✅ **Health monitoring** - check API status  

## Setup & Configuration

### 1. Environment Variables
Create `.env` file:
```bash
PEXELS_API_KEY=your_pexels_api_key
PIXABAY_API_KEY=your_pixabay_api_key
```

### 2. Installation
```bash
npm install axios dotenv sqlite3
```

### 3. Initialize Database
```bash
sqlite3 farragna.db < farragna-feed/database/schema.sql
```

## API Endpoints

### GET /api/videos/feed
Get video feed with optional search query
```bash
curl "http://localhost:3000/api/videos/feed?count=20&query=nature"
```

### GET /api/videos/trending
Get trending videos from all sources
```bash
curl "http://localhost:3000/api/videos/trending?count=30"
```

### GET /api/videos/health
Check health of all APIs
```bash
curl "http://localhost:3000/api/videos/health"
```

### GET /api/stats
Get statistics
```bash
curl "http://localhost:3000/api/stats"
```

## Rate Limits

| Source | Limit | Window |
|--------|-------|--------|
| Pexels | 200 | per hour |
| Pixabay | 100 | per minute |
| Mixkit | 60 | per minute |

## Attribution Requirements

- **Pexels**: Include 'Powered by Pexels' with link to Pexels page
- **Pixabay**: Include 'Powered by Pixabay' with photographer name
- **Mixkit**: Include 'Powered by Mixkit' with link

## Frontend Integration

```html
<video src="{{ video.url }}" controls width="100%" poster="{{ video.thumbnail }}">
</video>
<div class="attribution">{{ attribution.text }}</div>
```

## File Structure
```
farragna-feed/
├── config/api-keys.js
├── services/
│   ├── pexels-client.js
│   ├── pixabay-client.js
│   └── mixkit-client.js
├── api/feed-api.js
├── cache/url-cache.js
├── database/schema.sql
└── README.md
```

## Next Steps
1. Add API keys to .env
2. Initialize database
3. Start server: `npm start`
4. Test: `curl http://localhost:3000/api/videos/health`

🚀 Ready to stream!
