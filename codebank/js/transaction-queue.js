// Transaction Queue System - Asynchronous processing for scalability
export class TransactionQueue {
    constructor(options = {}) {
        this.maxConcurrent = options.maxConcurrent || 3;
        this.maxQueueSize = options.maxQueueSize || 1000;
        this.batchSize = options.batchSize || 10;
        this.batchTimeout = options.batchTimeout || 5000;
        this.retryAttempts = options.retryAttempts || 3;
        this.processingInterval = options.processingInterval || 100;

        // Queue state
        this.queue = [];
        this.processing = new Set();
        this.completed = new Map();
        this.failed = new Map();

        // Batch processing
        this.batchBuffer = [];
        this.batchTimer = null;

        // Worker state
        this.isProcessing = false;
        this.workerInterval = null;

        // Statistics
        this.stats = {
            processed: 0,
            failed: 0,
            queued: 0,
            averageProcessingTime: 0,
            lastProcessedTime: null
        };

        // Event listeners
        this.eventListeners = {
            'transaction:queued': [],
            'transaction:processing': [],
            'transaction:completed': [],
            'transaction:failed': [],
            'queue:full': [],
            'batch:processed': []
        };
    }

    // Start the queue processor
    start() {
        if (this.isProcessing) return;

        console.log('🚀 Transaction Queue started');
        this.isProcessing = true;

        // Start worker
        this.workerInterval = setInterval(() => {
            this._processQueue();
        }, this.processingInterval);

        // Start batch processor
        this._startBatchProcessor();
    }

    // Stop the queue processor
    stop() {
        if (this.workerInterval) {
            clearInterval(this.workerInterval);
            this.workerInterval = null;
        }

        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        this.isProcessing = false;
        console.log('🛑 Transaction Queue stopped');
    }

    // Add transaction to queue
    enqueue(transaction) {
        return new Promise((resolve, reject) => {
            if (this.queue.length >= this.maxQueueSize) {
                this._emitEvent('queue:full', { queueSize: this.queue.length });
                reject(new Error('Queue is full'));
                return;
            }

            const queueItem = {
                id: transaction.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2)}`,
                transaction,
                timestamp: Date.now(),
                attempts: 0,
                priority: transaction.priority || 0,
                resolve,
                reject
            };

            // Insert based on priority (higher priority first)
            const insertIndex = this.queue.findIndex(item => item.priority < queueItem.priority);
            if (insertIndex === -1) {
                this.queue.push(queueItem);
            } else {
                this.queue.splice(insertIndex, 0, queueItem);
            }

            this.stats.queued++;
            this._emitEvent('transaction:queued', queueItem);

            console.log(`📋 Transaction queued: ${queueItem.id} (queue size: ${this.queue.length})`);
        });
    }

    // Process queue items
    async _processQueue() {
        if (!this.isProcessing || this.processing.size >= this.maxConcurrent) {
            return;
        }

        const item = this.queue.find(queueItem =>
            !this.processing.has(queueItem.id) &&
            queueItem.attempts < this.retryAttempts
        );

        if (!item) return;

        // Move to processing
        this.queue = this.queue.filter(queueItem => queueItem.id !== item.id);
        this.processing.add(item.id);

        this._emitEvent('transaction:processing', item);

        try {
            await this._processTransaction(item);
        } catch (error) {
            await this._handleProcessingError(item, error);
        } finally {
            this.processing.delete(item.id);
        }
    }

    // Process individual transaction
    async _processTransaction(item) {
        const startTime = Date.now();

        try {
            // Execute transaction based on type
            const result = await this._executeTransaction(item.transaction);

            const processingTime = Date.now() - startTime;

            // Update statistics
            this.stats.processed++;
            this.stats.averageProcessingTime =
                (this.stats.averageProcessingTime * (this.stats.processed - 1) + processingTime) / this.stats.processed;
            this.stats.lastProcessedTime = Date.now();

            // Store result
            this.completed.set(item.id, {
                result,
                processingTime,
                completedAt: Date.now()
            });

            // Resolve promise
            item.resolve(result);

            this._emitEvent('transaction:completed', { item, result, processingTime });

            console.log(`✅ Transaction processed: ${item.id} in ${processingTime}ms`);

        } catch (error) {
            throw error;
        }
    }

    // Execute transaction based on type
    async _executeTransaction(transaction) {
        const { type, data } = transaction;

        switch (type) {
            case 'transfer':
                return await this._executeTransfer(data);
            case 'balance_check':
                return await this._executeBalanceCheck(data);
            case 'batch_transfer':
                return await this._executeBatchTransfer(data);
            default:
                throw new Error(`Unknown transaction type: ${type}`);
        }
    }

    // Execute transfer transaction
    async _executeTransfer(data) {
        const { fromUserId, toEmail, amount, assetType = 'codes' } = data;

        // Import here to avoid circular dependencies
        const { SimpleTransferManager } = await import('./simple-transfer-manager.js');
        const { EmailTransferManager } = await import('./email-transfer-manager.js');

        const simpleManager = new SimpleTransferManager();
        await simpleManager.initialize();

        // Try direct transfer first
        try {
            return await simpleManager.transferCodes(fromUserId, toEmail, amount);
        } catch (error) {
            // Fallback to email transfer
            const emailManager = new EmailTransferManager();
            await emailManager.initialize();

            const transferId = `tx_${Date.now()}`;
            return await emailManager.sendTransferEmail(toEmail, amount, transferId);
        }
    }

    // Execute balance check
    async _executeBalanceCheck(data) {
        const { userId } = data;

        // This would typically query the database
        // For now, return mock data
        return {
            userId,
            balances: {
                codes: parseInt(localStorage.getItem('asset-codes') || '0'),
                silver_bars: parseInt(localStorage.getItem('asset-silver') || '0'),
                gold_bars: parseInt(localStorage.getItem('asset-gold') || '0')
            },
            timestamp: Date.now()
        };
    }

    // Execute batch transfer
    async _executeBatchTransfer(data) {
        const { transfers } = data;
        const results = [];

        for (const transfer of transfers) {
            try {
                const result = await this._executeTransfer(transfer);
                results.push({ success: true, result, transfer });
            } catch (error) {
                results.push({ success: false, error: error.message, transfer });
            }
        }

        return {
            batchSize: transfers.length,
            successCount: results.filter(r => r.success).length,
            failureCount: results.filter(r => !r.success).length,
            results
        };
    }

    // Handle processing errors
    async _handleProcessingError(item, error) {
        item.attempts++;

        this.stats.failed++;

        // Store failure info
        this.failed.set(item.id, {
            error: error.message,
            attempts: item.attempts,
            failedAt: Date.now()
        });

        // Reject promise if max attempts reached
        if (item.attempts >= this.retryAttempts) {
            item.reject(error);
            this._emitEvent('transaction:failed', { item, error, final: true });
            console.error(`❌ Transaction failed permanently: ${item.id} after ${item.attempts} attempts`);
        } else {
            // Re-queue for retry
            this.queue.unshift(item);
            this._emitEvent('transaction:failed', { item, error, final: false });
            console.warn(`⚠️ Transaction failed, retrying: ${item.id} (attempt ${item.attempts}/${this.retryAttempts})`);
        }
    }

    // Start batch processor
    _startBatchProcessor() {
        // This could be used for batch operations
        // For now, it's a placeholder for future enhancements
    }

    // Add batch to processing buffer
    addToBatch(transaction) {
        this.batchBuffer.push({
            transaction,
            timestamp: Date.now()
        });

        // Process batch if it's full or timeout reached
        if (this.batchBuffer.length >= this.batchSize) {
            this._processBatch();
        } else if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => {
                this._processBatch();
            }, this.batchTimeout);
        }
    }

    // Process batch
    async _processBatch() {
        if (this.batchBuffer.length === 0) return;

        const batch = this.batchBuffer.splice(0);
        clearTimeout(this.batchTimer);
        this.batchTimer = null;

        try {
            const results = await Promise.allSettled(
                batch.map(item => this._executeTransaction(item.transaction))
            );

            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const failureCount = results.filter(r => r.status === 'rejected').length;

            this._emitEvent('batch:processed', {
                batchSize: batch.length,
                successCount,
                failureCount,
                results
            });

            console.log(`📦 Batch processed: ${successCount}/${batch.length} successful`);

        } catch (error) {
            console.error('Batch processing error:', error);
        }
    }

    // Event system
    addEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
    }

    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }

    _emitEvent(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event listener error for ${event}:`, error);
                }
            });
        }
    }

    // Get queue status
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            queueSize: this.queue.length,
            processingCount: this.processing.size,
            completedCount: this.completed.size,
            failedCount: this.failed.size,
            stats: { ...this.stats }
        };
    }

    // Get queue contents (for debugging)
    getQueue() {
        return {
            queued: this.queue.map(item => ({
                id: item.id,
                type: item.transaction.type,
                priority: item.priority,
                attempts: item.attempts,
                timestamp: item.timestamp
            })),
            processing: Array.from(this.processing),
            completed: Array.from(this.completed.keys()),
            failed: Array.from(this.failed.keys())
        };
    }

    // Clear completed and failed transactions
    clearHistory() {
        this.completed.clear();
        this.failed.clear();
        console.log('🧹 Transaction history cleared');
    }

    // Force process specific transaction
    async forceProcess(transactionId) {
        const item = this.queue.find(queueItem => queueItem.id === transactionId);
        if (item) {
            // Move to front of queue
            this.queue = this.queue.filter(queueItem => queueItem.id !== transactionId);
            this.queue.unshift(item);
            console.log(`⚡ Transaction moved to front: ${transactionId}`);
            return true;
        }
        return false;
    }

    // Pause queue processing
    pause() {
        this.isProcessing = false;
        console.log('⏸️ Transaction Queue paused');
    }

    // Resume queue processing
    resume() {
        this.isProcessing = true;
        console.log('▶️ Transaction Queue resumed');
    }
}

// Transaction Queue Manager - High-level queue management
export class TransactionQueueManager {
    constructor() {
        this.queues = new Map();
        this.defaultQueue = null;
    }

    // Create named queue
    createQueue(name, options = {}) {
        const queue = new TransactionQueue(options);
        this.queues.set(name, queue);

        if (!this.defaultQueue) {
            this.defaultQueue = queue;
        }

        return queue;
    }

    // Get queue by name
    getQueue(name) {
        return this.queues.get(name) || this.defaultQueue;
    }

    // Route transaction to appropriate queue
    routeTransaction(transaction, queueName = 'default') {
        const queue = this.getQueue(queueName) || this.defaultQueue;
        if (!queue) {
            throw new Error(`No queue available for routing: ${queueName}`);
        }

        return queue.enqueue(transaction);
    }

    // Get overall status
    getOverallStatus() {
        const status = {
            totalQueues: this.queues.size,
            queues: {}
        };

        this.queues.forEach((queue, name) => {
            status.queues[name] = queue.getStatus();
        });

        return status;
    }

    // Start all queues
    startAll() {
        this.queues.forEach(queue => queue.start());
        console.log('🚀 All transaction queues started');
    }

    // Stop all queues
    stopAll() {
        this.queues.forEach(queue => queue.stop());
        console.log('🛑 All transaction queues stopped');
    }
}

// Create global instances
export const transactionQueue = new TransactionQueue();
export const queueManager = new TransactionQueueManager();

// Auto-initialize default queue
if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            transactionQueue.start();
        });
    } else {
        transactionQueue.start();
    }
}

export default TransactionQueue;