/**
 * BATTALOODA CORE - Unified Engine (UV: BTL-UNIFY-V1-2026)
 * "Battalooda" (Hero) - Talent Discovery Platform
 */
(function(window, document) {
    'use strict';

    const Battalooda = {
        initialized: false,
        activeModule: 'discovery',
        user: { name: 'Guest User', talents: [] },
        library: [
            { id: 'track01', title: 'Watan Al-Arab (Acapella)', artist: 'Umm Kulthum (Sample)', file: 'sample_acapella_1.mp3' },
            { id: 'track02', title: 'Mawwal Al-Noor', artist: 'Sabah Fakhri (Sample)', file: 'sample_mawwal_1.mp3' }
        ],
        studio: {
            recording: false,
            mediaRecorder: null,
            audioChunks: [],
            activeTrack: null,
        }
    };

    async function initBattalooda() {
        if (Battalooda.initialized) return;
        console.log("🌟 Battalooda Initializing...");

        if (document.querySelectorAll('.fas, .fa-solid').length === 0) {
            console.warn("[Battalooda] FontAwesome not detected.");
        }

        setupDiscoveryFeed();
        setupStudioEvents();
        
        const tab = document.getElementById('battalooda-app-tab');
        if (tab) {
            tab.style.display = 'flex';
            const loading = document.getElementById('battalooda-loading');
            if (loading) loading.classList.add('hidden');
        }

        Battalooda.initialized = true;
        console.log("✅ Battalooda initialized.");
    }

    function setupDiscoveryFeed() {
        const feed = document.getElementById('discovery-feed');
        if (!feed) return;

        feed.innerHTML = `
            <div class="discovery-card">
                <div class="discovery-thumb"><i class="fas fa-microphone fa-2x"></i></div>
                <div class="discovery-details">
                    <span class="talenteer">Talenteer: Ali A.</span>
                    <span class="talent-type">Vocals (Mawwal)</span>
                    <button class="vote-btn"><i class="fas fa-heart"></i> Vote (120)</button>
                </div>
            </div>
            <div class="discovery-card">
                <div class="discovery-thumb"><i class="fas fa-scroll fa-2x"></i></div>
                <div class="discovery-details">
                    <span class="talenteer">Talenteer: Sara M.</span>
                    <span class="talent-type">Poetry Reciting</span>
                    <button class="vote-btn"><i class="fas fa-heart"></i> Vote (85)</button>
                </div>
            </div>
        `;
    }

    function setupStudioEvents() {
        const recordBtn = document.getElementById('studio-record-btn');
        const statusEl = document.getElementById('studio-status');
        const saveBtn = document.getElementById('studio-save-btn');

        if (!navigator.mediaDevices?.getUserMedia) {
            recordBtn.disabled = true;
            statusEl.innerText = "❌ Recording requires HTTPS/modern browser";
            return;
        }

        recordBtn.addEventListener('click', toggleRecording);
        
        // Enable save when recording exists
        const playback = document.getElementById('studio-playback');
        if (playback) {
            playback.addEventListener('loadeddata', () => {
                saveBtn.disabled = false;
            });
        }
    }

    async function toggleRecording() {
        const recordBtn = document.getElementById('studio-record-btn');
        const statusEl = document.getElementById('studio-status');

        if (!Battalooda.studio.recording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                Battalooda.studio.mediaRecorder = new MediaRecorder(stream);
                Battalooda.studio.audioChunks = [];

                Battalooda.studio.mediaRecorder.ondataavailable = event => {
                    if (event.data.size > 0) Battalooda.studio.audioChunks.push(event.data);
                };

                Battalooda.studio.mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(Battalooda.studio.audioChunks, { type: 'audio/webm' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const playback = document.getElementById('studio-playback');
                    if (playback) {
                        playback.src = audioUrl;
                        playback.style.display = 'block';
                    }
                    statusEl.innerText = "✅ Recording complete. Preview above.";
                    Battalooda.studio.recording = false;
                    recordBtn.innerText = "⏺️ Record";
                    recordBtn.classList.remove('recording');
                };

                Battalooda.studio.mediaRecorder.start();
                Battalooda.studio.recording = true;
                recordBtn.innerText = "⏹️ Stop";
                recordBtn.classList.add('recording');
                statusEl.innerText = "🔴 Recording...";
                
            } catch (err) {
                console.error("[Studio] Error:", err);
                statusEl.innerText = "❌ Mic access denied. Check permissions.";
            }
        } else {
            Battalooda.studio.mediaRecorder.stop();
            Battalooda.studio.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }

    window.switchBattaloodaTab = function(moduleName) {
        if (moduleName === Battalooda.activeModule) return;
        
        document.querySelectorAll('.battalooda-tab-content').forEach(tab => {
            tab.classList.remove('active');
            tab.style.display = 'none';
        });

        const activeTab = document.getElementById(`battalooda-${moduleName}-tab`);
        if (activeTab) {
            activeTab.style.display = 'flex';
            activeTab.classList.add('active');
        }

        document.querySelectorAll('.batal-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.module === moduleName);
        });

        Battalooda.activeModule = moduleName;
    };

    window.Battalooda = Battalooda;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBattalooda);
    } else {
        initBattalooda();
    }

})(window, document);