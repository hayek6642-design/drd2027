/**
 * Battalooda Core Application Logic
 * Main application controller for the voice talent discovery platform
 */

class BattaloodaApp {
    constructor() {
        this.currentUser = null;
        this.currentCategory = 'all';
        this.recordings = [];
        this.isRecording = false;
        this.recordingStartTime = null;
        this.recordingTimer = null;
        this.audioEngine = null;
        this.musicLibrary = null;
        this.socialFeatures = null;
        this.securityEngine = null;
        this.recordingMode = 'standard'; // 'standard', 'high-security', 'challenge'
        
        // Phase 3: Auto-sync auth
        this.waitForAuth();
    }

    waitForAuth(retries = 15) {
        // Use the global Auth (either injected by AuthProxy or local)
        const auth = window.Auth || window.top?.Auth;

        if (auth && typeof auth.isAuthenticated === 'function' && auth.isAuthenticated()) {
            console.log("✅ Battalooda: Auth active (via Proxy/Parent)");
            console.log("DEBUG - IFRAME AUTH:", !!auth.isAuthenticated());
            console.log("DEBUG - PARENT AUTH:", !!window.top?.Auth?.isAuthenticated());
            
            this.currentUser = auth.getUser();
            this.init(); // Start app with authenticated user
            
            if (typeof auth.onChange === 'function') {
                auth.onChange((state) => {
                    console.log("🔄 Battalooda: Auth updated:", state);
                    if (state.authenticated) {
                        this.currentUser = state.user || { id: state.userId };
                        this.updateUserInfo();
                    } else {
                        this.currentUser = null;
                        this.updateUserInfo();
                    }
                });
            }
        } else if (retries > 0) {
            setTimeout(() => this.waitForAuth(retries - 1), 300);
        } else {
            console.warn("⚠️ Battalooda: Auth not found, starting with guest mode");
            this.init();
        }
    }

    async init() {
        if (this.initialized) return;
        this.initialized = true;
        
        console.log('🌟 Battalooda App Initializing...');

        // 🔧 NEW: Register global instance for bridge
        window.BattaloodaCore = this;
        
        // Initialize modules
        try {
            this.audioEngine = new KaraokeAudioEngine();
            this.musicLibrary = new JamendoLibrary();
            this.socialFeatures = new SocialFeatures();
            
            // 🔧 NEW: Register modules on window for bridge access
            window.AudioEngine = this.audioEngine;
            window.MusicLibrary = this.musicLibrary;
            window.SocialFeatures = this.socialFeatures;
        } catch (e) {
            console.warn('Module initialization error:', e);
        }
        
        // Initialize security engine
        try {
            this.securityEngine = new BattaloodaSecurityEngine();
            await this.securityEngine.initialize();
            window.SecurityEngine = this.securityEngine; // 🔧 Bridge access
            console.log('Security engine initialized');
        } catch (error) {
            console.warn('Security engine initialization failed:', error);
            this.securityEngine = null;
        }

        // 🔧 NEW: Initialize Studio Bridge if on studio page
        this.detectStudio();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Request user data from parent
        this.requestUserData();
        
        // Load initial feed
        try {
            await this.loadFeed();
        } catch (e) {
            console.warn('Initial feed load failed, continuing anyway...');
        }

        // 🛡️ UI ACTIVATION: Hide loading, show app
        const loading = document.getElementById('battalooda-loading');
        const appShell = document.getElementById('battalooda-app');
        
        if (loading) {
            loading.classList.add('hidden');
            setTimeout(() => { loading.style.display = 'none'; }, 500);
        }
        if (appShell) {
            appShell.classList.add('ready');
            appShell.style.display = 'flex';
        }

        console.log('✅ Battalooda App Ready');
    }

    // 🔧 NEW: Proper studio detection
    detectStudio() {
        if (document.getElementById('studio-frame')) {
            console.log('[Core] Studio iframe detected');
            this.initStudioBridge();
        }
    }

    initStudioBridge() {
        // 🔧 Add fallback timeout
        this.studioLoadTimeout = setTimeout(() => {
            if (!this.studio || !this.studio.ready) {
                console.error('[Core] Studio failed to load within 5s');
                this.handleStudioLoadError();
            }
        }, 5000);

        // Wait for bridge to initialize
        const checkBridge = setInterval(() => {
            if (window.studioBridge) {
                clearInterval(checkBridge);
                this.studio = window.studioBridge;
                console.log('[Core] Studio bridge connected');
            }
        }, 100);
    }

    handleStudioLoadError() {
        const wrapper = document.getElementById('studio-wrapper');
        if (wrapper) {
            wrapper.innerHTML = `
                <div style="color: white; text-align: center; padding: 50px; background: #1a1a1a; height: 100%;">
                    <h2>⚠️ فشل تحميل الاستوديو</h2>
                    <p>تعذر الاتصال بمحرك الاستوديو. يرجى إعادة المحاولة أو العودة للرئيسية.</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; background: #3498db; border: none; color: white; border-radius: 5px; cursor: pointer; margin-top: 20px;">
                        إعادة تحميل الصفحة
                    </button>
                </div>
            `;
        }
    }

    onStudioReady() {
        console.log('[Core] Studio ready for operations');
        if (this.studioLoadTimeout) {
            clearTimeout(this.studioLoadTimeout);
            this.studioLoadTimeout = null;
        }
        // Notify other modules
        if (this.audioEngine && typeof this.audioEngine.studioReady === 'function') this.audioEngine.studioReady();
        if (this.musicLibrary && typeof this.musicLibrary.studioReady === 'function') this.musicLibrary.studioReady();
    }

    studioReady() {
        this.onStudioReady();
    }

    onStudioMenuClick(menuName) {
        console.log('[Core] Studio menu click:', menuName);
        // Handle menu actions here
        switch(menuName.toLowerCase()) {
            case 'file':
                console.log('[Core] File menu requested');
                break;
            case 'edit':
                console.log('[Core] Edit menu requested');
                break;
            // Add more cases as needed
        }
    }

    setupEventListeners() {
        // Category navigation
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCategory = e.target.dataset.category;
                this.loadFeed();
            });
        });

        // Recording buttons
        document.getElementById('liveRecordBtn').addEventListener('click', () => {
            this.startRecording(false);
        });

        document.getElementById('musicRecordBtn').addEventListener('click', () => {
            this.openMusicLibrary();
        });

        // Studio button
        document.getElementById('studioBtn').addEventListener('click', () => {
            this.openStudio();
        });

        document.getElementById('baseBtn').addEventListener('click', () => {
            document.getElementById('mainFeed').scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Modal controls
        document.getElementById('closeMusicModal').addEventListener('click', () => {
            this.closeMusicLibrary();
        });

        document.getElementById('stopRecordingBtn').addEventListener('click', () => {
            this.stopRecording();
        });

        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopRecording();
        });

        document.getElementById('closePreviewModal').addEventListener('click', () => {
            this.closePreview();
        });

        document.getElementById('reRecordBtn').addEventListener('click', () => {
            this.closePreview();
            this.startRecording(this.currentMusicTrack ? true : false);
        });

        document.getElementById('uploadBtn').addEventListener('click', () => {
            this.showUploadModal();
        });

        document.getElementById('closeUploadModal').addEventListener('click', () => {
            this.closeUploadModal();
        });

        document.getElementById('cancelUploadBtn').addEventListener('click', () => {
            this.closeUploadModal();
        });

        document.getElementById('confirmUploadBtn').addEventListener('click', () => {
            this.uploadRecording();
        });

        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => {
            const query = document.getElementById('musicSearch').value;
            this.searchMusic(query);
        });

        document.getElementById('musicSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = document.getElementById('musicSearch').value;
                this.searchMusic(query);
            }
        });

        // Music level controls
        document.getElementById('vocalLevel').addEventListener('input', (e) => {
            if (this.audioEngine) {
                this.audioEngine.adjustMix(parseFloat(e.target.value), this.musicLevel || 0.3);
            }
        });

        document.getElementById('musicLevel').addEventListener('input', (e) => {
            this.musicLevel = parseFloat(e.target.value);
            if (this.audioEngine) {
                this.audioEngine.adjustMix(this.vocalLevel || 0.8, this.musicLevel);
            }
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    requestUserData() {
        // Request user data from parent CodeBank application
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'battalooda:init',
                service: 'battalooda'
            }, '*');

            window.addEventListener('message', (e) => {
                if (e.data?.type === 'codebank:user') {
                    this.currentUser = e.data.user;
                    this.updateUserInfo();
                }
            });
        } else {
            // Fallback for standalone testing
            this.currentUser = {
                id: 1,
                name: 'ضيف',
                avatar: '👤'
            };
            this.updateUserInfo();
        }
    }

    updateUserInfo() {
        const avatarEl = document.getElementById('userAvatar');
        const nameEl = document.getElementById('userName');
        
        if (this.currentUser) {
            avatarEl.textContent = this.currentUser.avatar || '👤';
            nameEl.textContent = this.currentUser.name || 'ضيف';
        }
    }

    async loadFeed() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const mainFeed = document.getElementById('mainFeed');
        
        if (loadingIndicator) loadingIndicator.style.display = 'flex';
        if (mainFeed) mainFeed.innerHTML = '';

        try {
            const response = await fetch(`/api/battalooda/feed?category=${this.currentCategory}&page=1`);
            if (response.ok) {
                const data = await response.json();
                this.recordings = data.recordings || [];
            } else {
                throw new Error('API not available');
            }
        } catch (error) {
            console.warn('Error loading feed, using mock data:', error);
            // Fallback mock data
            this.recordings = [
                {
                    id: 1,
                    user_name: 'علي ع.',
                    user_avatar: '🎤',
                    category: 'singing',
                    created_at: new Date().toISOString()
                },
                {
                    id: 2,
                    user_name: 'سارة م.',
                    user_avatar: '📜',
                    category: 'quran',
                    created_at: new Date().toISOString()
                }
            ];
        } finally {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            this.renderFeed();
        }
    }

    renderFeed() {
        const mainFeed = document.getElementById('mainFeed');
        mainFeed.innerHTML = '';

        if (this.recordings.length === 0) {
            mainFeed.innerHTML = `
                <div class="empty-state">
                    <h3>لا توجد تسجيلات بعد</h3>
                    <p>كن أول من يسجل صوتك!</p>
                </div>
            `;
            return;
        }

        this.recordings.forEach(recording => {
            const card = this.createVoiceCard(recording);
            mainFeed.appendChild(card);
        });
    }

    createVoiceCard(recording) {
        const card = document.createElement('div');
        card.className = 'voice-card';
        card.dataset.id = recording.id;

        const categoryBadge = recording.category === 'quran' ? 'قرآن' : 
                             recording.category === 'singing' ? 'غناء' : 'مسيحي';

        card.innerHTML = `
            <div class="card-header">
                <div class="user-info-card">
                    <div class="avatar">${recording.user_avatar || '👤'}</div>
                    <div>
                        <div class="username">${recording.user_name || 'مستخدم'}</div>
                        <div class="recording-time">${this.formatTime(recording.created_at)}</div>
                    </div>
                </div>
                <div class="category-badge">${categoryBadge}</div>
            </div>

            <div class="audio-player">
                <div class="audio-controls">
                    <button class="play-btn" data-recording-id="${recording.id}">
                        <i class="fas fa-play"></i>
                    </button>
                    <div class="waveform">
                        <div class="waveform-bars" id="waveform-${recording.id}">
                            ${this.generateWaveformBars()}
                        </div>
                    </div>
                    <div class="audio-time">${this.formatDuration(recording.duration)}</div>
                </div>
            </div>

            ${recording.has_music ? `
                <div class="music-info">
                    <small style="color: #ccc;">موسيقى: ${recording.music_track_info?.title || 'مجهولة'}</small>
                </div>
            ` : ''}

            <div class="card-actions">
                <div class="action-group">
                    <button class="action-btn like-btn" data-recording-id="${recording.id}" data-liked="${recording.user_liked || false}">
                        <i class="fas fa-heart"></i>
                        <span>${recording.likes || 0}</span>
                    </button>
                    <button class="action-btn comment-btn" data-recording-id="${recording.id}">
                        <i class="fas fa-comment"></i>
                        <span>${recording.comments_count || 0}</span>
                    </button>
                    <button class="action-btn share-btn" data-recording-id="${recording.id}">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
                <button class="action-btn" onclick="location.href='${recording.audio_path}'" download>
                    <i class="fas fa-download"></i> تنزيل
                </button>
            </div>

            <div class="comment-section" id="comments-${recording.id}">
                <div class="comment-input">
                    <input type="text" placeholder="اكتب تعليقك..." data-recording-id="${recording.id}">
                    <button class="action-btn primary submit-comment-btn" data-recording-id="${recording.id}">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="comment-list" id="comment-list-${recording.id}">
                    <!-- Comments will be loaded here -->
                </div>
            </div>
        `;

        // Set up event listeners for this card
        this.setupCardListeners(card, recording);

        return card;
    }

    setupCardListeners(card, recording) {
        const recordingId = recording.id;

        // Play button
        const playBtn = card.querySelector(`.play-btn[data-recording-id="${recordingId}"]`);
        if (playBtn) {
            playBtn.addEventListener('click', () => this.togglePlay(recording));
        }

        // Like button
        const likeBtn = card.querySelector(`.like-btn[data-recording-id="${recordingId}"]`);
        if (likeBtn) {
            likeBtn.addEventListener('click', () => this.toggleLike(recordingId, likeBtn));
        }

        // Comment button
        const commentBtn = card.querySelector(`.comment-btn[data-recording-id="${recordingId}"]`);
        if (commentBtn) {
            commentBtn.addEventListener('click', () => this.toggleComments(recordingId));
        }

        // Submit comment
        const submitBtn = card.querySelector(`.submit-comment-btn[data-recording-id="${recordingId}"]`);
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                const input = card.querySelector(`.comment-input input[data-recording-id="${recordingId}"]`);
                if (input && input.value.trim()) {
                    this.submitComment(recordingId, input.value.trim());
                    input.value = '';
                }
            });
        }
    }

    async togglePlay(recording) {
        const audio = new Audio(recording.audio_path);
        const playBtn = document.querySelector(`.play-btn[data-recording-id="${recording.id}"] i`);
        
        if (audio.paused) {
            audio.play();
            playBtn.className = 'fas fa-pause';
        } else {
            audio.pause();
            playBtn.className = 'fas fa-play';
        }

        // Start waveform animation
        this.animateWaveform(recording.id);
    }

    animateWaveform(recordingId) {
        const bars = document.querySelectorAll(`#waveform-${recordingId} .wave-bar`);
        bars.forEach(bar => {
            bar.style.animation = 'wave 0.5s ease-in-out infinite';
        });
    }

    generateWaveformBars() {
        let bars = '';
        for (let i = 0; i < 20; i++) {
            bars += '<div class="wave-bar"></div>';
        }
        return bars;
    }

    async toggleLike(recordingId, button) {
        if (!this.currentUser) {
            this.showError('يجب تسجيل الدخول للإعجاب');
            return;
        }

        const isLiked = button.dataset.liked === 'true';
        
        try {
            const response = await fetch('/api/battalooda/like', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ recordingId })
            });

            if (response.ok) {
                const data = await response.json();
                button.dataset.liked = !isLiked;
                button.classList.toggle('liked', !isLiked);
                button.querySelector('span').textContent = data.likes;
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            this.showError('فشل في التصويت');
        }
    }

    toggleComments(recordingId) {
        const commentSection = document.getElementById(`comments-${recordingId}`);
        commentSection.classList.toggle('active');
        
        if (commentSection.classList.contains('active')) {
            this.loadComments(recordingId);
        }
    }

    async loadComments(recordingId) {
        const commentList = document.getElementById(`comment-list-${recordingId}`);
        
        try {
            const response = await fetch(`/api/battalooda/comments?recordingId=${recordingId}`);
            const data = await response.json();
            
            commentList.innerHTML = '';
            
            if (data.comments && data.comments.length > 0) {
                data.comments.forEach(comment => {
                    const commentEl = document.createElement('div');
                    commentEl.className = 'comment-item';
                    commentEl.innerHTML = `
                        <div class="comment-author">${comment.user_name}</div>
                        <div class="comment-text">${comment.text}</div>
                        <div class="comment-time">${this.formatTime(comment.created_at)}</div>
                    `;
                    commentList.appendChild(commentEl);
                });
            } else {
                commentList.innerHTML = '<div class="no-comments">لا توجد تعليقات بعد</div>';
            }
        } catch (error) {
            console.error('Error loading comments:', error);
            commentList.innerHTML = '<div class="error">فشل تحميل التعليقات</div>';
        }
    }

    async submitComment(recordingId, text) {
        if (!this.currentUser) {
            this.showError('يجب تسجيل الدخول للتعليق');
            return;
        }

        try {
            const response = await fetch('/api/battalooda/comment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ recordingId, text })
            });

            if (response.ok) {
                this.loadComments(recordingId);
                // Update comment count
                const commentBtn = document.querySelector(`.comment-btn[data-recording-id="${recordingId}"] span`);
                if (commentBtn) {
                    commentBtn.textContent = parseInt(commentBtn.textContent) + 1;
                }
            }
        } catch (error) {
            console.error('Error submitting comment:', error);
            this.showError('فشل إرسال التعليق');
        }
    }

    // Recording functionality
    async startRecording(withMusic = false) {
        if (!this.currentUser) {
            this.showError('يجب تسجيل الدخول للتسجيل');
            return;
        }

        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.vocalLevel = 0.8;
            this.musicLevel = 0.3;

            // Show recording interface
            this.showRecordingInterface();

            // Start timer
            this.startTimer();

            // Initialize security session if available
            let securitySession = null;
            if (this.securityEngine) {
                try {
                    securitySession = await this.securityEngine.startSecureRecording(this.recordingMode);
                    console.log('Security session started:', securitySession.sessionId);
                } catch (error) {
                    console.warn('Security session failed:', error);
                }
            }

            // Initialize audio engine
            if (withMusic && this.currentMusicTrack) {
                await this.audioEngine.startMixedRecording(stream, this.currentMusicTrack.url);
            } else {
                await this.audioEngine.startRecording(stream);
            }

            // Start security analysis if session is active
            if (securitySession) {
                this.runSecurityAnalysis(stream, securitySession);
            }

        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.showError('فشل الوصول إلى الميكروفون');
        }
    }

    async runSecurityAnalysis(stream, securitySession) {
        try {
            // Run security analysis in parallel with recording
            const securityResult = await this.securityEngine.analyzeStream(stream, 5000);
            
            console.log('Security analysis result:', securityResult);
            
            // Handle security decision
            if (securityResult.decision && securityResult.decision.action === 'challenge_required') {
                this.handleSecurityChallenge(securityResult);
            } else if (securityResult.decision && securityResult.decision.action === 'block') {
                this.handleSecurityBlock(securityResult);
            }

        } catch (error) {
            console.error('Security analysis error:', error);
        }
    }

    handleSecurityChallenge(securityResult) {
        // Show challenge UI
        const challenge = securityResult.challengeResult?.challenge;
        if (challenge) {
            const challengeUI = this.securityEngine.challengeSystem.displayChallenge(challenge);
            
            // Wait for user response
            // This would be handled by the recording system capturing the response
            console.log('Security challenge issued:', challenge.prompt);
        }
    }

    handleSecurityBlock(securityResult) {
        // Show security warning
        const modal = document.createElement('div');
        modal.className = 'security-warning-modal';
        modal.innerHTML = `
            <div class="warning-content">
                <h2>⚠️ تحذير أمان</h2>
                <p>${securityResult.decision.message}</p>
                <p>الرجاء:</p>
                <ul>
                    <li>التأكد من استخدام الميكروفون مباشرة</li>
                    <li>عدم تشغيل صوت من مسجل مسبق</li>
                    <li>التحدث بشكل طبيعي</li>
                </ul>
                <button onclick="window.battaloodaApp.retryRecording()">إعادة المحاولة</button>
                <button onclick="this.cancelRecording()">إلغاء</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    retryRecording() {
        // Retry with higher security mode
        this.recordingMode = 'high-security';
        this.stopRecording();
        this.startRecording();
    }

    showRecordingInterface() {
        document.getElementById('recordingOverlay').style.display = 'flex';
        document.getElementById('mainFeed').style.display = 'none';
        document.querySelector('.control-bar').style.display = 'none';
    }

    hideRecordingInterface() {
        document.getElementById('recordingOverlay').style.display = 'none';
        document.getElementById('mainFeed').style.display = 'block';
        document.querySelector('.control-bar').style.display = 'flex';
    }

    startTimer() {
        this.recordingTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            document.getElementById('recordingTimer').textContent = `${minutes}:${seconds}`;

            // Stop after 3 minutes
            if (elapsed >= 180) {
                this.stopRecording();
            }
        }, 1000);
    }

    stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }

        this.audioEngine.stopRecording().then((blob) => {
            this.hideRecordingInterface();
            this.showPreview(blob);
        });
    }

    showPreview(blob) {
        const previewModal = document.getElementById('previewModal');
        const previewAudio = document.getElementById('previewAudio');
        
        const url = URL.createObjectURL(blob);
        previewAudio.src = url;
        
        previewModal.style.display = 'flex';
    }

    closePreview() {
        document.getElementById('previewModal').style.display = 'none';
        const previewAudio = document.getElementById('previewAudio');
        if (previewAudio.src) {
            URL.revokeObjectURL(previewAudio.src);
            previewAudio.src = '';
        }
    }

    showUploadModal() {
        const uploadModal = document.getElementById('uploadModal');
        const musicInfoGroup = document.getElementById('musicInfoGroup');
        const musicInfoDisplay = document.getElementById('musicInfoDisplay');

        if (this.currentMusicTrack) {
            musicInfoGroup.style.display = 'block';
            musicInfoDisplay.innerHTML = `
                <div><strong>${this.currentMusicTrack.title}</strong></div>
                <div style="color: #ccc;">${this.currentMusicTrack.artist}</div>
            `;
        } else {
            musicInfoGroup.style.display = 'none';
        }

        uploadModal.style.display = 'flex';
    }

    closeUploadModal() {
        document.getElementById('uploadModal').style.display = 'none';
    }

    async uploadRecording() {
        const previewAudio = document.getElementById('previewAudio');
        const category = document.getElementById('uploadCategory').value;
        
        if (!previewAudio.src) {
            this.showError('لا يوجد تسجيل للرفع');
            return;
        }

        try {
            // Create FormData
            const formData = new FormData();
            const blob = await fetch(previewAudio.src).then(r => r.blob());
            
            formData.append('audio', blob, 'recording.webm');
            formData.append('category', category);
            
            if (this.currentMusicTrack) {
                formData.append('musicTrackId', this.currentMusicTrack.id);
                formData.append('musicTrackInfo', JSON.stringify(this.currentMusicTrack));
            }

            const response = await fetch('/api/battalooda/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                this.closeUploadModal();
                this.closePreview();
                this.showSuccess('تم رفع التسجيل بنجاح');
                this.loadFeed(); // Refresh feed
                this.currentMusicTrack = null; // Reset music selection
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('Error uploading recording:', error);
            this.showError('فشل رفع التسجيل');
        }
    }

    // Music library integration
    openMusicLibrary() {
        this.showMusicLibrary();
        this.loadPopularTracks('singing'); // Default category
    }

    showMusicLibrary() {
        document.getElementById('musicLibraryModal').style.display = 'flex';
    }

    closeMusicLibrary() {
        document.getElementById('musicLibraryModal').style.display = 'none';
    }

    async loadPopularTracks(category) {
        try {
            const tracks = await this.musicLibrary.getPopularTracks(category);
            this.renderMusicGrid(tracks);
        } catch (error) {
            console.error('Error loading popular tracks:', error);
            this.showError('فشل تحميل الموسيقى');
        }
    }

    async searchMusic(query) {
        if (!query.trim()) return;

        try {
            const tracks = await this.musicLibrary.searchTracks(query);
            this.renderMusicGrid(tracks);
        } catch (error) {
            console.error('Error searching music:', error);
            this.showError('فشل البحث عن الموسيقى');
        }
    }

    renderMusicGrid(tracks) {
        const grid = document.getElementById('musicGrid');
        grid.innerHTML = '';

        if (!tracks || tracks.length === 0) {
            grid.innerHTML = '<div class="no-music">لا توجد نتائج</div>';
            return;
        }

        tracks.forEach(track => {
            const card = document.createElement('div');
            card.className = 'music-card';
            card.innerHTML = `
                <div class="music-title">${track.title}</div>
                <div class="music-artist">${track.artist}</div>
                <div class="music-meta">
                    <span class="music-duration">${this.formatDuration(track.duration)}</span>
                    <div class="music-actions">
                        <button class="action-btn play-preview-btn" data-track-id="${track.id}">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="action-btn use-btn" data-track-id="${track.id}">
                            <i class="fas fa-music"></i> استخدم هذه
                        </button>
                    </div>
                </div>
            `;
            
            // Set up listeners
            card.querySelector('.play-preview-btn').addEventListener('click', () => {
                this.playMusicPreview(track);
            });
            
            card.querySelector('.use-btn').addEventListener('click', () => {
                this.selectMusicTrack(track);
            });

            grid.appendChild(card);
        });
    }

    selectMusicTrack(track) {
        this.currentMusicTrack = track;
        this.closeMusicLibrary();
        this.startRecording(true);
    }

    playMusicPreview(track) {
        // Implementation for playing music preview
        console.log('Playing preview for:', track.title);
    }



    // Studio functionality
    async openStudio() {
        // 🔧 FIX: Navigate to studio page if not already there
        if (!window.location.pathname.includes('talent-studio.html')) {
            console.log('[Core] Redirecting to Talent Studio page');
            window.location.href = './talent-studio.html';
            return;
        }

        // If already on studio page but need to load specific recording
        if (this.lastRecording && this.studio) {
            // ... logic to send recording ...
        }
    }

    initializeStudio(vocalBlob) {
        // 🔧 FALLBACK: Use legacy studio if React bridge is not available
        if (this.studio) {
            console.log('[Core] Using React Studio for vocal blob');
            this.studio.loadTrack({ blob: vocalBlob });
            return;
        }

        if (!this.studioUI) {
            console.log('[Core] Falling back to Legacy Studio');
            this.studioUI = new StudioUI();
        }
        
        // Set up export callback
        this.studioUI.onExportComplete = (mixedBlob) => {
            this.lastRecording = mixedBlob;
            this.showPreview(mixedBlob);
        };
        
        // Open studio
        this.studioUI.openStudio(vocalBlob);
    }

    // Utility functions
    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDuration(seconds) {
        if (!seconds) return '00:00';
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    showError(message) {
        // Simple error display - could be enhanced with toast notifications
        alert(message);
    }

    showSuccess(message) {
        alert(message);
    }
}
