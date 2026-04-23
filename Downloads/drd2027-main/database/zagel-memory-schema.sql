-- Zagel Memory System Database Schema
-- RAG: Retrieval Augmented Generation
-- SQLite compatible

-- Memory Entries (Main storage)
CREATE TABLE IF NOT EXISTS zagel_memories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT NOT NULL,
    source TEXT,
    source_id TEXT,
    importance_score REAL DEFAULT 0.5,
    access_count INTEGER DEFAULT 0,
    last_accessed DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    metadata TEXT
);

-- Vector Embeddings (For semantic search)
CREATE TABLE IF NOT EXISTS zagel_embeddings (
    memory_id TEXT PRIMARY KEY,
    vector TEXT NOT NULL,
    model TEXT DEFAULT 'gemini-embedding',
    dimensions INTEGER DEFAULT 768,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memory_id) REFERENCES zagel_memories(id) ON DELETE CASCADE
);

-- Memory Chunks (For large documents)
CREATE TABLE IF NOT EXISTS zagel_memory_chunks (
    id TEXT PRIMARY KEY,
    parent_memory_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    vector TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_memory_id) REFERENCES zagel_memories(id) ON DELETE CASCADE,
    UNIQUE(parent_memory_id, chunk_index)
);

-- User Memory Profile (Aggregated user knowledge)
CREATE TABLE IF NOT EXISTS zagel_user_profiles (
    user_id TEXT PRIMARY KEY,
    total_memories INTEGER DEFAULT 0,
    total_uploads INTEGER DEFAULT 0,
    top_topics TEXT,
    behavioral_patterns TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Web Search Cache (Avoid repeated searches)
CREATE TABLE IF NOT EXISTS zagel_web_cache (
    id TEXT PRIMARY KEY,
    query_hash TEXT UNIQUE NOT NULL,
    query_text TEXT NOT NULL,
    results TEXT NOT NULL,
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
);

-- Memory Access Log (For importance scoring)
CREATE TABLE IF NOT EXISTS zagel_memory_access_log (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    query_text TEXT,
    relevance_score REAL,
    used_in_response BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memory_id) REFERENCES zagel_memories(id)
);

-- File Upload Registry
CREATE TABLE IF NOT EXISTS zagel_uploads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    storage_path TEXT,
    processing_status TEXT DEFAULT 'pending',
    extracted_text TEXT,
    memory_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memories_user ON zagel_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON zagel_memories(content_type);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON zagel_memories(importance_score);
CREATE INDEX IF NOT EXISTS idx_memories_created ON zagel_memories(created_at);
CREATE INDEX IF NOT EXISTS idx_chunks_parent ON zagel_memory_chunks(parent_memory_id);
CREATE INDEX IF NOT EXISTS idx_access_log_memory ON zagel_memory_access_log(memory_id);
CREATE INDEX IF NOT EXISTS idx_web_cache_hash ON zagel_web_cache(query_hash);

-- Full-text search index
CREATE VIRTUAL TABLE IF NOT EXISTS zagel_memories_fts USING fts5(
    content,
    content_type,
    user_id,
    tokenize='porter'
);