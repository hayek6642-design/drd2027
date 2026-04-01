// battalooda-storage-manager.js
// Freemium storage: IndexedDB (primary) → Cloud (on demand)
// Version: 3.0.0 - Zero-cost tier

(function() {
  'use strict';

  const StorageManager = {
    // Configuration
    config: {
      maxRecordingDuration: 60000, // 1 minute max (your requirement)
      maxLocalRecordings: 50,      // Keep last 50 recordings locally
      maxLocalStorageMB: 40,       // Stay under 50MB limit 
      dbName: 'BattaloodaDB',
      dbVersion: 1,
      storeName: 'recordings',
      cloudUploadOnShare: true     // Only upload to cloud when user wants to share
    },

    // State
    db: null,
    currentRecording: null,
    isInitialized: false,

    // ============================================
    // INITIALIZATION
    // ============================================

    init: async function() {
      if (this.isInitialized) return;
      
      try {
        this.db = await this.openDB();
        this.isInitialized = true;
        console.log('[StorageManager] IndexedDB initialized');
        
        // Cleanup old recordings on init
        await this.cleanupOldRecordings();
        
      } catch (error) {
        console.error('[StorageManager] Init failed:', error);
        throw error;
      }
    },

    openDB: function() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Store for recordings
          if (!db.objectStoreNames.contains(this.config.storeName)) {
            const store = db.createObjectStore(this.config.storeName, { 
              keyPath: 'id',
              autoIncrement: true 
            });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('synced', 'synced', { unique: false });
          }
        };
      });
    },

    // ============================================
    // LOCAL STORAGE (IndexedDB) - FREE TIER 
    // ============================================

    async saveRecording(blob, metadata = {}) {
      await this.init();

      // Check size before saving
      const blobSizeMB = blob.size / (1024 * 1024);
      if (blobSizeMB > this.config.maxLocalStorageMB) {
        throw new Error('Recording too large for local storage');
      }

      // Convert blob to ArrayBuffer for IndexedDB 
      const arrayBuffer = await this.blobToArrayBuffer(blob);
      
      const recording = {
        id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        arrayBuffer: arrayBuffer,
        blobType: blob.type,
        size: blob.size,
        duration: metadata.duration || 0,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
        title: metadata.title || 'تسجيل ' + new Date().toLocaleString('ar'),
        synced: false,      // Not uploaded to cloud yet
        cloudUrl: null,   // Will be populated if uploaded
        userId: metadata.userId || 'anonymous',
        // Freemium tracking
        isPublic: false,
        shareCount: 0,
        lastAccessed: Date.now()
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        const request = store.add(recording);

        request.onsuccess = () => {
          console.log('[StorageManager] Saved locally:', recording.id);
          resolve(recording);
        };
        request.onerror = () => reject(request.error);
      });
    },

    async getRecording(id) {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], 'readonly');
        const store = transaction.objectStore(this.config.storeName);
        const request = store.get(id);

        request.onsuccess = () => {
          const recording = request.result;
          if (recording) {
            // Update last accessed
            this.touchRecording(id);
            // Convert ArrayBuffer back to Blob
            recording.blob = this.arrayBufferToBlob(
              recording.arrayBuffer, 
              recording.blobType
            );
          }
          resolve(recording);
        };
        request.onerror = () => reject(request.error);
      });
    },

    async getAllRecordings(userId = null) {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], 'readonly');
        const store = transaction.objectStore(this.config.storeName);
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev'); // Newest first

        const recordings = [];

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const rec = cursor.value;
            // Filter by user if specified
            if (!userId || rec.userId === userId) {
              // Don't include arrayBuffer in list (memory efficiency)
              recordings.push({
                id: rec.id,
                title: rec.title,
                duration: rec.duration,
                size: rec.size,
                timestamp: rec.timestamp,
                createdAt: rec.createdAt,
                synced: rec.synced,
                cloudUrl: rec.cloudUrl,
                isPublic: rec.isPublic,
                shareCount: rec.shareCount
              });
            }
            cursor.continue();
          } else {
            resolve(recordings);
          }
        };

        request.onerror = () => reject(request.error);
      });
    },

    async deleteRecording(id) {
      await this.init();

      // If synced to cloud, delete from there too
      const recording = await this.getRecording(id);
      if (recording?.cloudUrl) {
        await this.deleteFromCloud(id);
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        const request = store.delete(id);

        request.onsuccess = () => {
          console.log('[StorageManager] Deleted:', id);
          resolve(true);
        };
        request.onerror = () => reject(request.error);
      });
    },

    // ============================================
    // CLOUD UPLOAD (Only when needed - Freemium)
    // ============================================

    async uploadToCloud(id, options = {}) {
      const recording = await this.getRecording(id);
      if (!recording) throw new Error('Recording not found');

      // Check if already synced
      if (recording.synced && recording.cloudUrl && !options.force) {
        return { alreadySynced: true, url: recording.cloudUrl };
      }

      this.updateUI('uploading');

      try {
        // Create FormData
        const formData = new FormData();
        formData.append('audio_data', recording.blob, 'recording.webm');
        formData.append('duration', recording.duration);
        formData.append('userId', recording.userId);
        formData.append('localId', id);

        const response = await fetch('/api/battalooda/upload-cloud', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });

        if (!response.ok) throw new Error('Upload failed');

        const result = await response.json();

        // Update local record with cloud info
        await this.markAsSynced(id, result.recording.url, result.recording.public_id);

        this.updateUI('uploaded');

        return {
          success: true,
          url: result.recording.url,
          publicId: result.recording.public_id,
          provider: result.recording.provider
        };

      } catch (error) {
        console.error('[StorageManager] Cloud upload failed:', error);
        this.updateUI('error');
        throw error;
      }
    },

    async markAsSynced(id, cloudUrl, publicId) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        const request = store.get(id);

        request.onsuccess = () => {
          const recording = request.result;
          if (recording) {
            recording.synced = true;
            recording.cloudUrl = cloudUrl;
            recording.publicId = publicId;
            recording.syncedAt = new Date().toISOString();
            
            store.put(recording);
            resolve(true);
          }
        };
        request.onerror = () => reject(request.error);
      });
    },

    async deleteFromCloud(id) {
      // Call server to delete from cloud
      try {
        await fetch('/api/battalooda/delete-cloud', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ localId: id }),
          credentials: 'include'
        });
      } catch (error) {
        console.warn('[StorageManager] Cloud delete failed:', error);
      }
    },

    // ============================================
    // SHARING & PUBLIC LINKS
    // ============================================

    async shareRecording(id) {
      const recording = await this.getRecording(id);
      if (!recording) throw new Error('Recording not found');

      // If not on cloud, upload first
      if (!recording.synced) {
        await this.uploadToCloud(id);
      }

      // Get fresh data
      const updated = await this.getRecording(id);
      
      // Copy to clipboard
      if (updated.cloudUrl) {
        await navigator.clipboard.writeText(updated.cloudUrl);
        
        // Update share count
        await this.incrementShareCount(id);
        
        return {
          success: true,
          url: updated.cloudUrl,
          message: 'تم نسخ الرابط!'
        };
      }

      throw new Error('Failed to get share URL');
    },

    async makePublic(id, isPublic = true) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        const request = store.get(id);

        request.onsuccess = () => {
          const recording = request.result;
          if (recording) {
            recording.isPublic = isPublic;
            store.put(recording);
            resolve(true);
          }
        };
        request.onerror = () => reject(request.error);
      });
    },

    // ============================================
    // CLEANUP & MAINTENANCE
    // ============================================

    async cleanupOldRecordings() {
      const recordings = await this.getAllRecordings();
      
      // Keep only last N recordings locally
      if (recordings.length > this.config.maxLocalRecordings) {
        const toDelete = recordings.slice(this.config.maxLocalRecordings);
        
        for (const rec of toDelete) {
          // If synced to cloud, safe to delete locally
          if (rec.synced) {
            await this.deleteLocalOnly(rec.id);
          }
        }
        
        console.log('[StorageManager] Cleaned up', toDelete.length, 'old recordings');
      }

      // Check total storage size
      const totalSize = recordings.reduce((sum, r) => sum + r.size, 0);
      const totalSizeMB = totalSize / (1024 * 1024);
      
      if (totalSizeMB > this.config.maxLocalStorageMB) {
        console.warn('[StorageManager] Approaching storage limit:', totalSizeMB.toFixed(2), 'MB');
      }
    },

    async deleteLocalOnly(id) {
      // Delete only the blob data, keep metadata
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        const request = store.get(id);

        request.onsuccess = () => {
          const recording = request.result;
          if (recording) {
            delete recording.arrayBuffer; // Free up space
            recording.archived = true;
            store.put(recording);
            resolve(true);
          }
        };
        request.onerror = () => reject(request.error);
      });
    },

    async touchRecording(id) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        const request = store.get(id);

        request.onsuccess = () => {
          const recording = request.result;
          if (recording) {
            recording.lastAccessed = Date.now();
            store.put(recording);
            resolve(true);
          }
        };
        request.onerror = () => reject(request.error);
      });
    },

    async incrementShareCount(id) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        const request = store.get(id);

        request.onsuccess = () => {
          const recording = request.result;
          if (recording) {
            recording.shareCount = (recording.shareCount || 0) + 1;
            store.put(recording);
            resolve(true);
          }
        };
        request.onerror = () => reject(request.error);
      });
    },

    // ============================================
    // UTILITIES
    // ============================================

    blobToArrayBuffer(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
    },

    arrayBufferToBlob(buffer, type) {
      return new Blob([buffer], { type: type });
    },

    formatDuration(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    },

    formatSize(bytes) {
      const mb = bytes / (1024 * 1024);
      if (mb < 1) return (bytes / 1024).toFixed(1) + ' KB';
      return mb.toFixed(2) + ' MB';
    },

    updateUI(state) {
      // Dispatch events for UI updates
      window.dispatchEvent(new CustomEvent('storage:status', { 
        detail: { state } 
      }));
    },

    // ============================================
    // STATS & INFO
    // ============================================

    async getStats() {
      const recordings = await this.getAllRecordings();
      const totalSize = recordings.reduce((sum, r) => sum + r.size, 0);
      
      return {
        totalRecordings: recordings.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        syncedCount: recordings.filter(r => r.synced).length,
        localOnlyCount: recordings.filter(r => !r.synced).length,
        limitMB: this.config.maxLocalStorageMB,
        usagePercent: ((totalSize / (1024 * 1024)) / this.config.maxLocalStorageMB * 100).toFixed(1)
      };
    }
  };

  // Expose globally
  window.BattaloodaStorage = StorageManager;

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => StorageManager.init());
  } else {
    StorageManager.init();
  }

})();