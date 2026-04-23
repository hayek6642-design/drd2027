/**
 * Zagel Knowledge Upload System
 * File processing pipeline: Extract → Chunk → Embed → Store
 */

const crypto = require('crypto');
const memorySystem = require('./memory-system');

class ZagelKnowledgeUpload {
    constructor() {
        this.supportedTypes = ['pdf', 'txt', 'csv', 'xlsx', 'json', 'docx'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.chunkSize = 1000; // Characters per chunk
        this.chunkOverlap = 200; // Overlap between chunks
    }

    /**
     * Main upload handler
     */
    async handleUpload(file, userId, onProgress = () => {}) {
        // Validate
        if (!this.validateFile(file)) {
            throw new Error('Invalid file type or size');
        }

        const uploadId = crypto.randomUUID();

        onProgress({ stage: 'uploading', progress: 10 });

        try {
            // Step 1: Extract text
            const extractedText = await this.extractText(file, onProgress);
            
            // Step 2: Process and chunk
            const chunks = this.chunkText(extractedText);
            
            onProgress({ stage: 'processing', progress: 50 });

            // Step 3: Generate embeddings and store
            const memories = await this.processChunks(uploadId, chunks, file, userId, onProgress);
            
            onProgress({ stage: 'complete', progress: 100 });

            return {
                success: true,
                uploadId,
                fileName: file.name,
                memoriesCreated: memories.length,
                preview: extractedText.substring(0, 200) + '...'
            };

        } catch (error) {
            console.error('[UPLOAD] Error:', error);
            throw error;
        }
    }

    validateFile(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (!this.supportedTypes.includes(extension)) {
            return false;
        }
        
        if (file.size > this.maxFileSize) {
            return false;
        }
        
        return true;
    }

    /**
     * Extract text based on file type
     */
    async extractText(file, onProgress) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        switch(extension) {
            case 'txt':
                return await this.extractTxt(file);
            
            case 'pdf':
                return await this.extractPdf(file, onProgress);
            
            case 'csv':
                return await this.extractCsv(file);
            
            case 'xlsx':
            case 'xls':
                return await this.extractExcel(file);
            
            case 'json':
                return await this.extractJson(file);
            
            case 'docx':
                return await this.extractDocx(file);
            
            default:
                throw new Error('Unsupported file type');
        }
    }

    extractTxt(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    async extractPdf(file, onProgress) {
        onProgress({ stage: 'extracting', progress: 20 });
        
        // Send to server for extraction
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/zagel/extract-pdf', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('PDF extraction failed');
        }
        
        const data = await response.json();
        return data.text;
    }

    extractCsv(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                // Convert CSV to readable text
                const lines = text.split('\n');
                const formatted = lines.map((line, i) => {
                    if (i === 0) return `Columns: ${line}`;
                    return `Row ${i}: ${line}`;
                }).join('\n');
                resolve(formatted);
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    async extractExcel(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/zagel/extract-excel', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        return data.text;
    }

    extractJson(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    const formatted = this.formatJsonToText(json);
                    resolve(formatted);
                } catch (err) {
                    reject(new Error('Invalid JSON'));
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    extractDocx(file) {
        // For docx, would need to use a library like mammoth
        // For now, treat as binary and send to server
        const formData = new FormData();
        formData.append('file', file);
        
        return fetch('/api/zagel/extract-docx', {
            method: 'POST',
            body: formData
        }).then(r => r.json()).then(d => d.text);
    }

    formatJsonToText(json, prefix = '') {
        let text = '';
        
        for (const [key, value] of Object.entries(json)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof value === 'object' && value !== null) {
                text += this.formatJsonToText(value, fullKey);
            } else {
                text += `${fullKey}: ${value}\n`;
            }
        }
        
        return text;
    }

    /**
     * Smart chunking with overlap
     */
    chunkText(text) {
        const chunks = [];
        let start = 0;
        
        while (start < text.length) {
            let end = start + this.chunkSize;
            
            // Try to break at sentence or word boundary
            if (end < text.length) {
                // Look for sentence ending
                const sentenceEnd = text.substring(end - 50, end + 50).search(/[.!?]\s/);
                if (sentenceEnd !== -1) {
                    end = end - 50 + sentenceEnd + 1;
                } else {
                    // Break at word boundary
                    const spaceIndex = text.lastIndexOf(' ', end);
                    if (spaceIndex > start) {
                        end = spaceIndex;
                    }
                }
            }
            
            chunks.push(text.substring(start, end).trim());
            start = end - this.chunkOverlap;
        }
        
        return chunks.filter(chunk => chunk.length > 50);
    }

    /**
     * Process chunks: embed and store
     */
    async processChunks(uploadId, chunks, file, userId, onProgress) {
        const memories = [];
        
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            
            // Generate embedding
            const embedding = await this.generateEmbedding(chunk);
            
            // Store memory
            const memoryId = await memorySystem.store({
                userId,
                content: chunk,
                contentType: 'file_upload',
                source: file.name,
                sourceId: uploadId,
                importanceScore: 0.7,
                metadata: {
                    fileName: file.name,
                    fileType: file.name.split('.').pop(),
                    chunkIndex: i,
                    totalChunks: chunks.length
                }
            }, embedding);
            
            memories.push(memoryId);
            
            // Update progress
            const progress = 50 + Math.floor((i / chunks.length) * 40);
            onProgress({ stage: 'embedding', progress });
        }
        
        return memories;
    }

    /**
     * Generate embedding via API
     */
    async generateEmbedding(text) {
        try {
            const response = await fetch('/api/zagel/embeddings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            
            if (!response.ok) return null;
            const data = await response.json();
            return data.embedding;
        } catch (error) {
            console.error('[UPLOAD] Embedding failed:', error);
            return null;
        }
    }
}

module.exports = new ZagelKnowledgeUpload();