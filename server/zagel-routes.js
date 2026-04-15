/**
 * Zagel Knowledge Upload & Web Intelligence Routes
 * Endpoints for file extraction, embeddings, web search, and memory management
 */

const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const xlsx = require('xlsx');
const mammoth = require('mammoth');
const crypto = require('crypto');
const memorySystem = require('./memory-system');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ============ EMBEDDINGS ============

/**
 * Generate embeddings using Gemini API
 */
router.post('/embeddings', async (req, res) => {
    const { text } = req.body;
    
    if (!text) {
        return res.status(400).json({ success: false, error: 'Text required' });
    }
    
    try {
        // Use Gemini API for embeddings
        const response = await fetch('https://generativelanguage.googleapis.com/v1/models/embedding-001:embedContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': process.env.GEMINI_API_KEY
            },
            body: JSON.stringify({
                model: 'models/embedding-001',
                content: { parts: [{ text }] }
            })
        });
        
        if (!response.ok) {
            throw new Error('Gemini embedding failed');
        }
        
        const data = await response.json();
        const embedding = data.embedding.values;
        
        res.json({ success: true, embedding });
    } catch (error) {
        console.error('[ROUTES] Embedding error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ FILE EXTRACTION ============

/**
 * Extract text from PDF
 */
router.post('/extract-pdf', upload.single('file'), async (req, res) => {
    try {
        const data = await pdfParse(req.file.buffer);
        res.json({ success: true, text: data.text });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Extract text from Excel
 */
router.post('/extract-excel', upload.single('file'), async (req, res) => {
    try {
        const workbook = xlsx.read(req.file.buffer);
        let text = '';
        
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
            text += `Sheet: ${sheetName}\n`;
            text += data.map(row => row.join(', ')).join('\n');
            text += '\n\n';
        });
        
        res.json({ success: true, text });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Extract text from DOCX
 */
router.post('/extract-docx', upload.single('file'), async (req, res) => {
    try {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        res.json({ success: true, text: result.value });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ WEB SEARCH ============

/**
 * Web search with caching
 */
router.post('/web-search', async (req, res) => {
    const { query, maxResults = 5, userId } = req.body;
    
    if (!query) {
        return res.status(400).json({ success: false, error: 'Query required' });
    }
    
    try {
        // Check cache first
        const cacheKey = crypto.createHash('md5').update(query).digest('hex');
        const cached = memorySystem.db.prepare(`
            SELECT * FROM zagel_web_cache 
            WHERE query_hash = ? AND expires_at > datetime('now')
        `).get(cacheKey);
        
        if (cached) {
            return res.json({ success: true, results: JSON.parse(cached.results), cached: true });
        }
        
        // Use SerpAPI for web search
        const searchUrl = `https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY}&num=${maxResults}`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (!data.organic_results) {
            throw new Error('No search results');
        }
        
        const results = data.organic_results.map(r => ({
            title: r.title,
            snippet: r.snippet,
            url: r.link,
            date: r.date
        }));
        
        // Cache results (1 hour)
        const cacheExpiry = new Date(Date.now() + 3600000).toISOString();
        memorySystem.db.prepare(`
            INSERT OR IGNORE INTO zagel_web_cache 
            (id, query_hash, query_text, results, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            crypto.randomUUID(),
            cacheKey,
            query,
            JSON.stringify(results),
            cacheExpiry,
            new Date().toISOString()
        );
        
        // Optionally store in memory for user
        if (userId) {
            await memorySystem.store({
                userId,
                content: `Web search for: \"${query}\"\n\nResults: ${results.map(r => r.title).join(', ')}`,
                contentType: 'web_search',
                source: 'web_search',
                sourceId: cacheKey,
                importanceScore: 0.6,
                metadata: { query, resultCount: results.length }
            });
        }
        
        res.json({ success: true, results, cached: false });
    } catch (error) {
        console.error('[ROUTES] Web search error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ MEMORY MANAGEMENT ============

/**
 * Search user memories
 */
router.get('/memories/search', async (req, res) => {
    const { userId, query, limit = 5 } = req.query;
    
    if (!userId || !query) {
        return res.status(400).json({ success: false, error: 'userId and query required' });
    }
    
    try {
        const memories = await memorySystem.search(userId, query, parseInt(limit));
        res.json({ success: true, memories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get context memories for prompt injection
 */
router.get('/memories/context', async (req, res) => {
    const { userId, query, limit = 3 } = req.query;
    
    if (!userId || !query) {
        return res.status(400).json({ success: false, error: 'userId and query required' });
    }
    
    try {
        const memories = await memorySystem.getContextMemories(userId, query, parseInt(limit));
        res.json({ success: true, memories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get user memory profile
 */
router.get('/user-profile/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const stmt = memorySystem.db.prepare(`
            SELECT * FROM zagel_user_profiles WHERE user_id = ?
        `);
        const profile = stmt.get(userId);
        
        res.json({ success: true, profile: profile || { user_id: userId, total_memories: 0 } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Delete memory
 */
router.delete('/memories/:memoryId', async (req, res) => {
    const { memoryId } = req.params;
    
    try {
        memorySystem.db.prepare(`
            DELETE FROM zagel_memories WHERE id = ?
        `).run(memoryId);
        
        res.json({ success: true, message: 'Memory deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ SUMMARIZATION ============

/**
 * Summarize text using Gemini
 */
router.post('/summarize', async (req, res) => {
    const { text, maxTokens = 200 } = req.body;
    
    if (!text) {
        return res.status(400).json({ success: false, error: 'Text required' });
    }
    
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': process.env.GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Summarize the following text in ${maxTokens} tokens:\n\n${text}`
                    }]
                }]
            })
        });
        
        const data = await response.json();
        const summary = data.candidates[0].content.parts[0].text;
        
        res.json({ success: true, summary });
    } catch (error) {
        console.error('[ROUTES] Summarize error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;