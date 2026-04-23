/**
 * Zagel Memory System
 * Manages semantic storage, retrieval, and learning
 */

const crypto = require('crypto');
const db = require('./db');

class MemorySystem {
    constructor() {
        this.initialized = false;
    }

    async initialize() {
        // Initialize database tables
        try {
            const schema = require('fs').readFileSync('./database/zagel-memory-schema.sql', 'utf8');
            const statements = schema.split(';').filter(s => s.trim());
            
            for (const stmt of statements) {
                db.exec(stmt);
            }
            
            this.initialized = true;
            console.log('[MEMORY] Database initialized');
        } catch (error) {
            console.error('[MEMORY] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Store a memory with embedding
     */
    async store(memoryData, embedding = null) {
        const memoryId = crypto.randomUUID();
        const now = new Date().toISOString();

        try {
            // Insert memory
            const stmt = db.prepare(`
                INSERT INTO zagel_memories 
                (id, user_id, content, content_type, source, source_id, importance_score, created_at, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                memoryId,
                memoryData.userId,
                memoryData.content,
                memoryData.contentType || 'conversation',
                memoryData.source,
                memoryData.sourceId,
                memoryData.importanceScore || 0.5,
                now,
                JSON.stringify(memoryData.metadata || {})
            );

            // Store embedding if provided
            if (embedding) {
                const embStmt = db.prepare(`
                    INSERT INTO zagel_embeddings (memory_id, vector, model, created_at)
                    VALUES (?, ?, ?, ?)
                `);
                embStmt.run(memoryId, JSON.stringify(embedding), 'gemini-embedding', now);
            }

            // Update user profile
            this.updateUserProfile(memoryData.userId);

            return memoryId;
        } catch (error) {
            console.error('[MEMORY] Store failed:', error);
            throw error;
        }
    }

    /**
     * Search memories by query
     */
    async search(userId, query, limit = 5) {
        try {
            // For now, use text search (semantic search needs embeddings)
            const stmt = db.prepare(`
                SELECT m.*, e.vector
                FROM zagel_memories m
                LEFT JOIN zagel_embeddings e ON m.id = e.memory_id
                WHERE m.user_id = ?
                AND (m.content LIKE ? OR m.metadata LIKE ?)
                ORDER BY m.importance_score DESC, m.last_accessed DESC
                LIMIT ?
            `);

            const searchTerm = `%${query}%`;
            const results = stmt.all(userId, searchTerm, searchTerm, limit);

            // Log access for relevance scoring
            for (const result of results) {
                this.logAccess(result.id, userId, query, 0.8);
            }

            return results;
        } catch (error) {
            console.error('[MEMORY] Search failed:', error);
            return [];
        }
    }

    /**
     * Semantic search using embeddings
     */
    async semanticSearch(userId, queryEmbedding, limit = 5) {
        try {
            const stmt = db.prepare(`
                SELECT m.*, e.vector
                FROM zagel_memories m
                JOIN zagel_embeddings e ON m.id = e.memory_id
                WHERE m.user_id = ?
                ORDER BY m.importance_score DESC
                LIMIT ?
            `);

            const results = stmt.all(userId, limit);

            // Calculate cosine similarity
            const ranked = results.map(result => ({
                ...result,
                similarity: this.cosineSimilarity(
                    queryEmbedding,
                    JSON.parse(result.vector || '[]')
                )
            }));

            return ranked.sort((a, b) => b.similarity - a.similarity);
        } catch (error) {
            console.error('[MEMORY] Semantic search failed:', error);
            return [];
        }
    }

    /**
     * Get relevant memories for prompt context
     */
    async getContextMemories(userId, query, limit = 3) {
        try {
            // Try semantic search first, fall back to text search
            const queryEmbedding = await this.getEmbedding(query);
            
            let memories = [];
            if (queryEmbedding) {
                memories = await this.semanticSearch(userId, queryEmbedding, limit);
            } else {
                memories = await this.search(userId, query, limit);
            }

            return memories.map(m => ({
                id: m.id,
                content: m.content,
                source: m.source,
                relevance: m.similarity || m.importance_score,
                created: m.created_at
            }));
        } catch (error) {
            console.error('[MEMORY] Get context failed:', error);
            return [];
        }
    }

    /**
     * Update memory importance score
     */
    updateImportance(memoryId, newScore) {
        try {
            const stmt = db.prepare(`
                UPDATE zagel_memories 
                SET importance_score = ?
                WHERE id = ?
            `);
            stmt.run(newScore, memoryId);
        } catch (error) {
            console.error('[MEMORY] Update importance failed:', error);
        }
    }

    /**
     * Log memory access for analytics
     */
    logAccess(memoryId, userId, query, relevance) {
        try {
            const stmt = db.prepare(`
                INSERT INTO zagel_memory_access_log 
                (id, memory_id, user_id, query_text, relevance_score, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                crypto.randomUUID(),
                memoryId,
                userId,
                query,
                relevance,
                new Date().toISOString()
            );

            // Update last accessed
            const updateStmt = db.prepare(`
                UPDATE zagel_memories 
                SET last_accessed = ?, access_count = access_count + 1
                WHERE id = ?
            `);
            updateStmt.run(new Date().toISOString(), memoryId);
        } catch (error) {
            console.error('[MEMORY] Log access failed:', error);
        }
    }

    /**
     * Update user memory profile
     */
    updateUserProfile(userId) {
        try {
            // Get memory stats
            const statsStmt = db.prepare(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(DISTINCT CASE WHEN content_type = 'file_upload' THEN 1 END) as uploads
                FROM zagel_memories
                WHERE user_id = ?
            `);
            const stats = statsStmt.get(userId);

            // Upsert profile
            const upsertStmt = db.prepare(`
                INSERT INTO zagel_user_profiles (user_id, total_memories, total_uploads, last_updated)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    total_memories = ?,
                    total_uploads = ?,
                    last_updated = ?
            `);

            const now = new Date().toISOString();
            upsertStmt.run(
                userId,
                stats.total,
                stats.uploads,
                now,
                stats.total,
                stats.uploads,
                now
            );
        } catch (error) {
            console.error('[MEMORY] Update profile failed:', error);
        }
    }

    /**
     * Calculate cosine similarity between vectors
     */
    cosineSimilarity(vec1, vec2) {
        if (!vec1 || !vec2 || vec1.length === 0 || vec2.length === 0) return 0;

        let dotProduct = 0;
        let mag1 = 0;
        let mag2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            mag1 += vec1[i] * vec1[i];
            mag2 += vec2[i] * vec2[i];
        }

        const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    }

    /**
     * Get embedding from API
     */
    async getEmbedding(text) {
        try {
            const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/zagel/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) return null;
            const data = await response.json();
            return data.embedding;
        } catch (error) {
            console.error('[MEMORY] Get embedding failed:', error);
            return null;
        }
    }

    /**
     * Export memories for backup
     */
    export(userId) {
        try {
            const stmt = db.prepare(`
                SELECT * FROM zagel_memories WHERE user_id = ?
            `);
            return stmt.all(userId);
        } catch (error) {
            console.error('[MEMORY] Export failed:', error);
            return [];
        }
    }

    /**
     * Clear old memories (retention policy)
     */
    async cleanup(daysOld = 90) {
        try {
            const stmt = db.prepare(`
                DELETE FROM zagel_memories 
                WHERE expires_at < datetime('now')
                OR (created_at < datetime('now', ? || ' days') 
                    AND content_type = 'web_search')
            `);
            stmt.run(`-${daysOld}`);
            console.log('[MEMORY] Cleanup completed');
        } catch (error) {
            console.error('[MEMORY] Cleanup failed:', error);
        }
    }
}

module.exports = new MemorySystem();