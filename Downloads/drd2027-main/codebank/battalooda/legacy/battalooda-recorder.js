// battalooda-recorder.js
// Complete recording and upload solution with studio support
// Version: 2.0.0 - Production Ready

(function() {
  'use strict';

  const BattaloodaRecorder = {
    // State
    mediaRecorder: null,
    recordedChunks: [],
    audioStream: null,
    audioContext: null,
    isRecording: false,
    recordingStartTime: null,
    recordingDuration: 0,
    recordedBlob: null,
    timerInterval: null,
    
    // Studio mode state
    isStudioMode: false,
    studioWaveSurfer: null,
    studioAnalyser: null,
    
    // Configuration
    config: {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000,
      bufferSize: 2048,
      maxRecordingTime: 300000,
      uploadEndpoint: '/api/battalooda/upload',
      studioEnabled: true
    },

    init: function(options) {
      if (options) Object.assign(this.config, options);
      this.setupEventListeners();
      this.setupStudioButton();
      console.log('[BattaloodaRecorder] Initialized');
    },

    setupEventListeners: function() {
      const recordBtn = document.getElementById('record-btn');
      if (recordBtn) {
        recordBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.handleRecordClick();
        });
      }

      const uploadBtn = document.getElementById('upload-btn');
      if (uploadBtn) {
        uploadBtn.addEventListener('click', () => this.uploadRecording());
      }

      const studioBtn = document.getElementById('studio-btn');
      if (studioBtn) {
        studioBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.openStudio();
        });
      }
    },

    setupStudioButton: function() {
      let studioBtn = document.getElementById('studio-btn');
      if (!studioBtn && this.config.studioEnabled) {
        const container = document.getElementById('recorder-controls') || document.getElementById('normal-recorder');
        if (container) {
          studioBtn = document.createElement('button');
          studioBtn.id = 'studio-btn';
          studioBtn.className = 'studio-btn';
          studioBtn.innerHTML = '🎛️ الاستوديو';
          studioBtn.title = 'فتح استوديو التسجيل المتقدم';
          container.appendChild(studioBtn);
          
          studioBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.openStudio();
          });
        }
      }
    },

    handleRecordClick: async function() {
      if (this.isRecording) {
        await this.stopRecording();
      } else {
        await this.startRecording();
      }
    },

    startRecording: async function() {
      try {
        this.recordedChunks = [];
        this.isRecording = true;
        this.recordingStartTime = Date.now();

        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
            channelCount: 1
          },
          video: false
        };

        this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);

        const options = {
          mimeType: this.getSupportedMimeType(),
          audioBitsPerSecond: this.config.audioBitsPerSecond
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

        this.mediaRecorder.onerror = (e) => {
          console.error('[BattaloodaRecorder] Recording error:', e);
          this.showError('خطأ في التسجيل: ' + e.message);
        };

        this.mediaRecorder.start(1000);
        this.updateUI('recording');
        this.startTimer();

      } catch (error) {
        console.error('[BattaloodaRecorder] Failed to start:', error);
        this.showError('فشل بدء التسجيل: ' + error.message);
        this.isRecording = false;
      }
    },

    stopRecording: async function() {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        return;
      }

      return new Promise((resolve) => {
        this.mediaRecorder.onstop = () => {
          this.finalizeRecording();
          resolve();
        };

        this.mediaRecorder.stop();
        
        if (this.audioStream) {
          this.audioStream.getTracks().forEach(track => track.stop());
        }

        this.isRecording = false;
        this.updateUI('stopped');
        this.stopTimer();
      });
    },

    finalizeRecording: function() {
      const blob = new Blob(this.recordedChunks, { 
        type: this.getSupportedMimeType() 
      });

      this.recordedBlob = blob;
      this.recordingDuration = Date.now() - this.recordingStartTime;

      const audioUrl = URL.createObjectURL(blob);
      this.setupPlayback(audioUrl);

      const uploadBtn = document.getElementById('upload-btn');
      if (uploadBtn) uploadBtn.disabled = false;

      console.log('[BattaloodaRecorder] Recording finalized:', {
        size: blob.size,
        duration: this.recordingDuration,
        type: blob.type
      });
    },

    getSupportedMimeType: function() {
      const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/wav',
        'audio/mp4'
      ];

      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      }

      return 'audio/webm';
    },

    uploadRecording: async function() {
      if (!this.recordedBlob) {
        this.showError('لا يوجد تسجيل للرفع');
        return;
      }

      try {
        this.updateUI('uploading');

        const formData = new FormData();
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `battalooda-recording-${timestamp}.webm`;
        
        formData.append('audio_data', this.recordedBlob, filename);
        formData.append('filename', filename);
        formData.append('duration', this.recordingDuration);
        formData.append('mime_type', this.recordedBlob.type);
        formData.append('timestamp', Date.now());

        if (window.Auth && window.Auth.getToken) {
          formData.append('auth_token', window.Auth.getToken());
        }

        console.log('[BattaloodaRecorder] Uploading:', {
          filename: filename,
          size: this.recordedBlob.size,
          type: this.recordedBlob.type
        });

        const response = await fetch(this.config.uploadEndpoint, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
          this.showSuccess('تم رفع التسجيل بنجاح!');
          this.updateUI('uploaded');
          
          window.dispatchEvent(new CustomEvent('battalooda:uploaded', {
            detail: result
          }));
        } else {
          throw new Error(result.error || 'Upload failed');
        }

      } catch (error) {
        console.error('[BattaloodaRecorder] Upload failed:', error);
        this.showError('فشل رفع التسجيل: ' + error.message);
        this.updateUI('error');
      }
    },

    openStudio: function() {
      console.log('[BattaloodaRecorder] Opening studio mode');

      if (this.isRecording) {
        this.stopRecording();
      }

      const normalRecorder = document.getElementById('normal-recorder');
      const studioContainer = document.getElementById('studio-container');

      if (normalRecorder) normalRecorder.style.display = 'none';
      
      if (studioContainer) {
        studioContainer.style.display = 'block';
        this.initStudioInterface();
      } else {
        this.createStudioInterface();
      }

      this.isStudioMode = true;
    },

    closeStudio: function() {
      const normalRecorder = document.getElementById('normal-recorder');
      const studioContainer = document.getElementById('studio-container');

      if (normalRecorder) normalRecorder.style.display = 'block';
      if (studioContainer) studioContainer.style.display = 'none';

      if (this.studioWaveSurfer) {
        this.studioWaveSurfer.destroy();
        this.studioWaveSurfer = null;
      }

      this.isStudioMode = false;
    },

    createStudioInterface: function() {
      const container = document.createElement('div');
      container.id = 'studio-container';
      container.className = 'battalooda-studio';
      container.style.display = 'none';
      
      container.innerHTML = `
        <div class="studio-header">
          <h2>🎛️ استوديو Battalooda</h2>
          <button id="close-studio" class="close-btn">&times;</button>
        </div>
        
        <div class="studio-waveform" id="studio-waveform"></div>
        
        <div class="studio-controls">
          <button id="studio-record" class="studio-record-btn">🔴 تسجيل</button>
          <button id="studio-play" class="studio-play-btn" disabled>▶️ تشغيل</button>
          <button id="studio-pause" class="studio-pause-btn" disabled>⏸️ إيقاف</button>
          <button id="studio-stop" class="studio-stop-btn" disabled>⏹️ إنهاء</button>
          <button id="studio-save" class="studio-save-btn" disabled>💾 حفظ</button>
        </div>
        
        <div class="studio-effects">
          <label>التأثيرات:</label>
          <select id="studio-effect">
            <option value="none">بدون</option>
            <option value="reverb">صدى (Reverb)</option>
            <option value="echo">صدى مضاعف</option>
          </select>
        </div>
      `;

      document.body.appendChild(container);

      document.getElementById('close-studio').addEventListener('click', () => this.closeStudio());
      document.getElementById('studio-record').addEventListener('click', () => this.studioRecord());
      document.getElementById('studio-play').addEventListener('click', () => this.studioPlay());
      document.getElementById('studio-pause').addEventListener('click', () => this.studioPause());
      document.getElementById('studio-stop').addEventListener('click', () => this.studioStop());
      document.getElementById('studio-save').addEventListener('click', () => this.studioSave());

      this.initStudioInterface();
    },

    initStudioInterface: function() {
      if (typeof WaveSurfer !== 'undefined') {
        this.studioWaveSurfer = WaveSurfer.create({
          container: '#studio-waveform',
          waveColor: '#4a9eff',
          progressColor: '#00d4ff',
          cursorColor: '#fff',
          height: 150,
          responsive: true
        });
      }
    },

    studioRecord: async function() {
      await this.startRecording();
      
      if (this.studioWaveSurfer && this.audioStream) {
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const source = audioContext.createMediaStreamSource(this.audioStream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          
          this.studioAnalyser = analyser;
        } catch(e) {
          console.warn('[BattaloodaRecorder] Studio visualization error:', e);
        }
      }

      document.getElementById('studio-record').disabled = true;
      document.getElementById('studio-stop').disabled = false;
    },

    studioStop: async function() {
      await this.stopRecording();
      
      document.getElementById('studio-record').disabled = false;
      document.getElementById('studio-stop').disabled = true;
      document.getElementById('studio-play').disabled = false;
      document.getElementById('studio-save').disabled = false;

      if (this.studioWaveSurfer && this.recordedBlob) {
        const url = URL.createObjectURL(this.recordedBlob);
        this.studioWaveSurfer.load(url);
      }
    },

    studioPlay: function() {
      if (this.studioWaveSurfer) {
        this.studioWaveSurfer.play();
      }
    },

    studioPause: function() {
      if (this.studioWaveSurfer) {
        this.studioWaveSurfer.pause();
      }
    },

    studioSave: function() {
      this.uploadRecording();
    },

    updateUI: function(state) {
      const recordBtn = document.getElementById('record-btn');
      const uploadBtn = document.getElementById('upload-btn');
      const statusEl = document.getElementById('recording-status');

      switch(state) {
        case 'recording':
          if (recordBtn) {
            recordBtn.innerHTML = '⏹️ إيقاف';
            recordBtn.classList.add('recording');
          }
          if (statusEl) statusEl.textContent = 'جاري التسجيل...';
          break;
          
        case 'stopped':
          if (recordBtn) {
            recordBtn.innerHTML = '🔴 تسجيل';
            recordBtn.classList.remove('recording');
          }
          if (statusEl) statusEl.textContent = 'التسجيل جاهز للرفع';
          break;
          
        case 'uploading':
          if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '⏳ جاري الرفع...';
          }
          if (statusEl) statusEl.textContent = 'جاري رفع التسجيل...';
          break;
          
        case 'uploaded':
          if (uploadBtn) uploadBtn.innerHTML = '✅ تم الرفع';
          if (statusEl) statusEl.textContent = 'تم رفع التسجيل بنجاح';
          break;
          
        case 'error':
          if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '⬆️ رفع';
          }
          break;
      }
    },

    setupPlayback: function(url) {
      const audioEl = document.getElementById('playback-audio');
      if (audioEl) {
        audioEl.src = url;
        audioEl.style.display = 'block';
      }
    },

    startTimer: function() {
      const timerEl = document.getElementById('recording-timer');
      this.timerInterval = setInterval(() => {
        const elapsed = Date.now() - this.recordingStartTime;
        const mins = Math.floor(elapsed / 60000);
        const secs = Math.floor((elapsed % 60000) / 1000);
        if (timerEl) {
          timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }
      }, 1000);
    },

    stopTimer: function() {
      clearInterval(this.timerInterval);
    },

    showError: function(message) {
      console.error('[BattaloodaRecorder]', message);
      const errorEl = document.getElementById('recorder-error');
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        setTimeout(() => errorEl.style.display = 'none', 5000);
      }
      window.dispatchEvent(new CustomEvent('battalooda:error', { detail: { message } }));
    },

    showSuccess: function(message) {
      const successEl = document.getElementById('recorder-success');
      if (successEl) {
        successEl.textContent = message;
        successEl.style.display = 'block';
        setTimeout(() => successEl.style.display = 'none', 3000);
      }
    }
  };

  window.BattaloodaRecorder = BattaloodaRecorder;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BattaloodaRecorder.init());
  } else {
    BattaloodaRecorder.init();
  }
})();