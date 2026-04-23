// battalooda-recorder-freemium.js
// Version 3.0 - Freemium with 1-minute limit and local storage

(function() {
  'use strict';

  const BattaloodaRecorder = {
    // State
    mediaRecorder: null,
    recordedChunks: [],
    audioStream: null,
    isRecording: false,
    recordingStartTime: null,
    recordingDuration: 0,
    maxDuration: 60000, // 1 minute max (your requirement)
    durationTimer: null,
    currentRecording: null,

    init: function() {
      this.setupEventListeners();
      this.setupStorageUI();
      console.log('[BattaloodaRecorder] Initialized (1-min limit)');
    },

    setupEventListeners: function() {
      const recordBtn = document.getElementById('record-btn');
      if (recordBtn) {
        recordBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleRecordClick();
        });
      }

      const uploadBtn = document.getElementById('upload-btn');
      if (uploadBtn) {
        uploadBtn.addEventListener('click', () => this.saveToCloud());
      }

      const shareBtn = document.getElementById('share-btn');
      if (shareBtn) {
        shareBtn.addEventListener('click', () => this.shareRecording());
      }

      const studioBtn = document.getElementById('studio-btn');
      if (studioBtn) {
        studioBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.openStudio();
        });
      }
    },

    setupStorageUI: function() {
      // Add storage stats display
      this.updateStorageStats();
      
      // Listen for storage updates
      window.addEventListener('storage:status', (e) => {
        this.showStorageStatus(e.detail.state);
      });
    },

    async handleRecordClick() {
      if (this.isRecording) {
        await this.stopRecording();
      } else {
        await this.startRecording();
      }
    },

    async startRecording() {
      try {
        this.recordedChunks = [];
        this.isRecording = true;
        this.recordingStartTime = Date.now();

        // Get microphone
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
            channelCount: 1
          }
        });

        // Create MediaRecorder
        const options = {
          mimeType: this.getSupportedMimeType(),
          audioBitsPerSecond: 128000
        };

        this.mediaRecorder = new MediaRecorder(this.audioStream, options);

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.recordedChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          this.finalizeRecording();
        };

        this.mediaRecorder.start(1000);
        this.updateUI('recording');
        this.startDurationTimer();

        // Auto-stop at 1 minute
        this.durationTimer = setTimeout(() => {
          if (this.isRecording) {
            this.showNotification('تم الوصول للحد الأقصى (1 دقيقة)');
            this.stopRecording();
          }
        }, this.maxDuration);

      } catch (error) {
        console.error('Recording failed:', error);
        this.showError('فشل بدء التسجيل: ' + error.message);
        this.isRecording = false;
      }
    },

    async stopRecording() {
      if (!this.isRecording) return;

      clearTimeout(this.durationTimer);
      
      return new Promise((resolve) => {
        this.mediaRecorder.onstop = async () => {
          await this.finalizeRecording();
          resolve();
        };

        this.mediaRecorder.stop();
        this.audioStream.getTracks().forEach(track => track.stop());
        this.isRecording = false;
        this.updateUI('stopped');
        this.stopDurationTimer();
      });
    },

    async finalizeRecording() {
      const blob = new Blob(this.recordedChunks, { 
        type: this.getSupportedMimeType() 
      });

      this.recordingDuration = Date.now() - this.recordingStartTime;

      // Validate duration
      if (this.recordingDuration > this.maxDuration) {
        this.showError('التسجيل تجاوز الدقيقة الواحدة');
        return;
      }

      // Save to IndexedDB (local, free)
      try {
        this.currentRecording = await window.BattaloodaStorage.saveRecording(blob, {
          duration: this.recordingDuration,
          userId: this.getUserId(),
          title: 'تسجيل ' + new Date().toLocaleString('ar')
        });

        this.showSuccess('تم حفظ التسجيل محلياً');
        this.updateUI('saved');
        this.loadRecordingList();

      } catch (error) {
        console.error('Save failed:', error);
        this.showError('فشل الحفظ: ' + error.message);
      }
    },

    // ============================================
    // CLOUD UPLOAD (Only when sharing)
    // ============================================

    async saveToCloud() {
      if (!this.currentRecording) {
        this.showError('لا يوجد تسجيل للرفع');
        return;
      }

      try {
        this.updateUI('uploading');
        
        const result = await window.BattaloodaStorage.uploadToCloud(
          this.currentRecording.id
        );

        if (result.alreadySynced) {
          this.showSuccess('التسجيل موجود بالفعل في السحابة');
        } else {
          this.showSuccess('تم الرفع إلى السحابة!');
        }

        this.updateUI('cloud-saved');
        this.loadRecordingList();

      } catch (error) {
        console.error('Cloud upload failed:', error);
        this.showError('فشل الرفع: ' + error.message);
        this.updateUI('error');
      }
    },

    async shareRecording() {
      if (!this.currentRecording) {
        this.showError('لا يوجد تسجيل للمشاركة');
        return;
      }

      try {
        const result = await window.BattaloodaStorage.shareRecording(
          this.currentRecording.id
        );

        this.showSuccess(result.message);
        
        // Show share dialog
        this.showShareDialog(result.url);

      } catch (error) {
        console.error('Share failed:', error);
        this.showError('فشل المشاركة: ' + error.message);
      }
    },

    // ============================================
    // RECORDING LIST UI
    // ============================================

    async loadRecordingList() {
      const listEl = document.getElementById('recordings-list');
      if (!listEl) return;

      const recordings = await window.BattaloodaStorage.getAllRecordings(this.getUserId());
      
      listEl.innerHTML = recordings.map(rec => `
        <div class="recording-item" data-id="${rec.id}">
          <div class="recording-info">
            <span class="recording-title">${rec.title}</span>
            <span class="recording-meta">
              ${window.BattaloodaStorage.formatDuration(rec.duration)} | 
              ${window.BattaloodaStorage.formatSize(rec.size)}
              ${rec.synced ? '☁️' : '📱'}
            </span>
          </div>
          <div class="recording-actions">
            <button onclick="BattaloodaRecorder.playRecording('${rec.id}')">▶️</button>
            <button onclick="BattaloodaRecorder.shareRecordingById('${rec.id}')">🔗</button>
            <button onclick="BattaloodaRecorder.deleteRecording('${rec.id}')">🗑️</button>
          </div>
        </div>
      `).join('');
    },

    async playRecording(id) {
      const recording = await window.BattaloodaStorage.getRecording(id);
      if (!recording) return;

      const audioEl = document.getElementById('playback-audio');
      if (audioEl) {
        audioEl.src = URL.createObjectURL(recording.blob);
        audioEl.play();
      }
    },

    async shareRecordingById(id) {
      try {
        const result = await window.BattaloodaStorage.shareRecording(id);
        this.showSuccess(result.message);
        this.showShareDialog(result.url);
      } catch (error) {
        this.showError('فشل المشاركة');
      }
    },

    async deleteRecording(id) {
      if (!confirm('هل أنت متأكد من حذف هذا التسجيل؟')) return;

      try {
        await window.BattaloodaStorage.deleteRecording(id);
        this.showSuccess('تم الحذف');
        this.loadRecordingList();
      } catch (error) {
        this.showError('فشل الحذف');
      }
    },

    // ============================================
    // UI HELPERS
    // ============================================

    startDurationTimer() {
      const timerEl = document.getElementById('recording-timer');
      const progressEl = document.getElementById('recording-progress');
      
      this.timerInterval = setInterval(() => {
        const elapsed = Date.now() - this.recordingStartTime;
        const remaining = Math.max(0, this.maxDuration - elapsed);
        
        // Update timer
        const secs = Math.floor(elapsed / 1000);
        const mins = Math.floor(secs / 60);
        const remSecs = secs % 60;
        if (timerEl) {
          timerEl.textContent = `${mins}:${remSecs.toString().padStart(2, '0')}`;
        }

        // Update progress bar
        if (progressEl) {
          const percent = (elapsed / this.maxDuration) * 100;
          progressEl.style.width = percent + '%';
          progressEl.classList.toggle('warning', percent > 80);
        }

      }, 100);
    },

    stopDurationTimer() {
      clearInterval(this.timerInterval);
    },

    updateUI(state) {
      const states = {
        'recording': { btn: '⏹️ إيقاف', class: 'recording' },
        'stopped': { btn: '🔴 تسجيل', class: '' },
        'saved': { btn: '✅ محفوظ محلياً', class: 'saved' },
        'uploading': { btn: '⏳ جاري الرفع...', class: 'uploading' },
        'cloud-saved': { btn: '☁️ محفوظ في السحابة', class: 'cloud' },
        'error': { btn: '❌ خطأ', class: 'error' }
      };

      const config = states[state] || states['stopped'];
      const btn = document.getElementById('record-btn');
      
      if (btn) {
        btn.textContent = config.btn;
        btn.className = config.class;
      }
    },

    async updateStorageStats() {
      const stats = await window.BattaloodaStorage.getStats();
      const statsEl = document.getElementById('storage-stats');
      
      if (statsEl) {
        statsEl.innerHTML = `
          <div class="storage-bar">
            <div class="storage-fill" style="width: ${stats.usagePercent}%"></div>
          </div>
          <span>${stats.totalRecordings} تسجيل | ${stats.totalSizeMB} MB / ${stats.limitMB} MB</span>
        `;
      }
    },

    showShareDialog(url) {
      // Create modal
      const modal = document.createElement('div');
      modal.className = 'share-modal';
      modal.innerHTML = `
        <div class="share-content">
          <h3>مشاركة التسجيل</h3>
          <input type="text" value="${url}" readonly id="share-url">
          <div class="share-buttons">
            <button onclick="navigator.clipboard.writeText('${url}'); this.textContent='تم النسخ!'">📋 نسخ الرابط</button>
            <a href="https://wa.me/?text=${encodeURIComponent(url)}" target="_blank">📱 واتساب</a>
            <a href="https://t.me/share/url?url=${encodeURIComponent(url)}" target="_blank">✈️ تيليجرام</a>
          </div>
          <button onclick="this.closest('.share-modal').remove()" class="close-btn">إغلاق</button>
        </div>
      `;
      document.body.appendChild(modal);
    },

    showNotification(message) {
      // Toast notification
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    },

    showError(message) {
      console.error(message);
      this.showNotification('❌ ' + message);
    },

    showSuccess(message) {
      this.showNotification('✅ ' + message);
    },

    showStorageStatus(state) {
      console.log('Storage status:', state);
    },

    getSupportedMimeType() {
      const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/wav'
      ];
      
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) return type;
      }
      return 'audio/webm';
    },

    getUserId() {
      if (window.Auth && window.Auth.getUser) {
        return window.Auth.getUser()?.id || 'anonymous';
      }
      return 'anonymous';
    },

    // Studio (simplified)
    openStudio() {
      console.log('Studio mode - implement as needed');
    }
  };

  window.BattaloodaRecorder = BattaloodaRecorder;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BattaloodaRecorder.init());
  } else {
    BattaloodaRecorder.init();
  }

})();