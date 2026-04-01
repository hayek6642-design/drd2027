/**
 * Battalooda Studio UI Components
 * Handles the studio modal and interactive elements
 */

class StudioUI {
    constructor() {
        this.studio = null;
        this.isLoaded = false;
        
        this.init();
    }

    init() {
        this.createStudioModal();
        this.setupEventListeners();
    }

    createStudioModal() {
        // 🛡️ CRITICAL FIX: Ensure the simplified stylesheet is loaded
        if (!document.getElementById('studio-simplified-css')) {
            const link = document.createElement('link');
            link.id = 'studio-simplified-css';
            link.rel = 'stylesheet';
            link.href = '/codebank/battalooda/css/studio-simplified.css';
            document.head.appendChild(link);
        }

        const modalHtml = `
            <!-- Studio Modal -->
            <div id="studio-modal" class="studio-overlay hidden">
                <div class="studio-container">
                    
                    <!-- Header - Top Menu Bar (FL Style) -->
                    <div class="studio-header">
                        <div class="studio-menu">
                            <span class="menu-item">FILE</span>
                            <span class="menu-item">EDIT</span>
                            <span class="menu-item">ADD</span>
                            <span class="menu-item">PATTERNS</span>
                            <span class="menu-item">VIEW</span>
                            <span class="menu-item">OPTIONS</span>
                        </div>
                        <h2>🎛️ BATTALOODA STUDIO</h2>
                        <button id="close-studio" class="icon-btn">✕</button>
                    </div>

                    <!-- Main Workspace -->
                    <div class="studio-workspace">
                        
                        <!-- Left: Sidebar Browser (Simplified) -->
                        <aside class="sound-library">
                            <div class="library-tabs">
                                <button class="lib-tab active" data-lib="drums">DRUMS</button>
                                <button class="lib-tab" data-lib="bass">BASS</button>
                                <button class="lib-tab" data-lib="inst">INST</button>
                            </div>
                            
                            <div class="library-content" id="library-content">
                                <div class="sound-item" data-sound="kick">
                                    <span class="sound-icon">🔈</span>
                                    <span class="sound-name">808 Kick</span>
                                </div>
                                <div class="sound-item" data-sound="snare">
                                    <span class="sound-icon">🔈</span>
                                    <span class="sound-name">Trap Snare</span>
                                </div>
                                <div class="sound-item" data-sound="hihat">
                                    <span class="sound-icon">🔈</span>
                                    <span class="sound-name">Closed Hat</span>
                                </div>
                                <div class="sound-item" data-sound="clap">
                                    <span class="sound-icon">🔈</span>
                                    <span class="sound-name">Master Clap</span>
                                </div>
                            </div>
                        </aside>

                        <!-- Center: Channel Rack (Main Workflow) -->
                        <main class="timeline-area">
                            <div class="sequencer-grid" id="drum-sequencer">
                                <!-- Tracks -->
                                <div class="sequencer-row" data-track="drum1">
                                    <label>808 KICK</label>
                                    <div class="steps-container">
                                        ${this.generateSteps('drum1')}
                                    </div>
                                </div>
                                <div class="sequencer-row" data-track="drum2">
                                    <label>TRAP SNARE</label>
                                    <div class="steps-container">
                                        ${this.generateSteps('drum2')}
                                    </div>
                                </div>
                                <div class="sequencer-row" data-track="bass">
                                    <label>SUB BASS</label>
                                    <div class="steps-container">
                                        ${this.generateSteps('bass')}
                                    </div>
                                </div>
                                <div class="sequencer-row" data-track="vocal">
                                    <label>VOCAL TRACK</label>
                                    <div class="waveform-container" style="flex: 1; height: 30px; background: #111;">
                                        <canvas id="waveform-vocal" style="width: 100%; height: 100%;"></canvas>
                                    </div>
                                </div>
                            </div>
                        </main>

                        <!-- Right: Simplified FX/Master -->
                        <aside class="master-section">
                            <div class="effects-rack">
                                <h4>EFFECTS</h4>
                                <label class="fx-toggle"><input type="checkbox" id="fx-reverb"> REVERB</label>
                                <label class="fx-toggle"><input type="checkbox" id="fx-delay"> DELAY</label>
                                <label class="fx-toggle"><input type="checkbox" id="fx-boost" checked> BOOST</label>
                            </div>

                            <div class="master-controls">
                                <div class="bpm-control">
                                    <label>BPM</label>
                                    <input type="number" id="bpm-input" value="120" min="60" max="180" style="width: 50px; background: #000; color: #0f0; border: 1px solid #333;">
                                </div>
                            </div>
                        </aside>
                    </div>

                    <!-- Bottom: Transport Controls -->
                    <div class="transport-bar">
                        <button id="studio-play" class="transport-btn">▶️</button>
                        <button id="studio-stop" class="transport-btn">⏹️</button>
                        
                        <div class="time-display" id="studio-timer">1:01:00</div>
                        
                        <button id="studio-export" class="export-btn">EXPORT MIX</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    generateSteps(trackId) {
        let steps = '';
        for (let i = 0; i < 16; i++) {
            steps += `<button class="step" data-track="${trackId}" data-step="${i}"></button>`;
        }
        return steps;
    }

    setupEventListeners() {
        // Close modal
        document.getElementById('close-studio').addEventListener('click', () => {
            this.closeStudio();
        });

        // Library tabs
        document.querySelectorAll('.lib-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchLibraryTab(e.target.dataset.lib);
            });
        });

        // Preview buttons
        document.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.previewSample(e.target.dataset.sample);
            });
        });

        // Transport controls
        document.getElementById('studio-play').addEventListener('click', () => {
            if (this.studio) this.studio.play();
        });

        document.getElementById('studio-stop').addEventListener('click', () => {
            if (this.studio) this.studio.stop();
        });

        document.getElementById('studio-export').addEventListener('click', async () => {
            if (this.studio) {
                const mixedBlob = await this.studio.exportMix();
                if (mixedBlob && this.studio.onExport) {
                    this.studio.onExport(mixedBlob);
                }
            }
        });

        // Effects toggles
        document.getElementById('fx-reverb').addEventListener('change', (e) => {
            if (this.studio) this.studio.setReverb(e.target.checked);
        });

        document.getElementById('fx-delay').addEventListener('change', (e) => {
            if (this.studio) this.studio.setDelay(e.target.checked);
        });

        // BPM control
        document.getElementById('bpm-input').addEventListener('change', (e) => {
            if (this.studio) {
                this.studio.bpm = parseInt(e.target.value);
            }
        });

        // Volume sliders
        document.querySelectorAll('.vol-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                if (this.studio) {
                    const trackId = e.target.dataset.track;
                    const volume = parseInt(e.target.value) / 100;
                    this.updateTrackVolume(trackId, volume);
                }
            });
        });

        // Mute buttons
        document.querySelectorAll('.mute-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.studio) {
                    const trackId = e.target.dataset.track;
                    this.toggleTrackMute(trackId);
                }
            });
        });

        // Step sequencer
        document.querySelectorAll('.step').forEach(step => {
            step.addEventListener('click', (e) => {
                if (this.studio) {
                    const trackId = e.target.dataset.track;
                    const stepIndex = parseInt(e.target.dataset.step);
                    this.toggleStep(trackId, stepIndex);
                }
            });
        });

        // Close modal when clicking outside
        document.getElementById('studio-modal').addEventListener('click', (e) => {
            if (e.target.id === 'studio-modal') {
                this.closeStudio();
            }
        });
    }

    switchLibraryTab(lib) {
        document.querySelectorAll('.lib-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`.lib-tab[data-lib="${lib}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        // Update library content based on tab
        const content = document.getElementById('library-content');
        switch (lib) {
            case 'drums':
                content.innerHTML = `
                    <div class="sound-item" data-sound="kick">
                        <span class="sound-icon">🔈</span>
                        <span class="sound-name">808 Kick</span>
                    </div>
                    <div class="sound-item" data-sound="snare">
                        <span class="sound-icon">🔈</span>
                        <span class="sound-name">Trap Snare</span>
                    </div>
                    <div class="sound-item" data-sound="hihat">
                        <span class="sound-icon">🔈</span>
                        <span class="sound-name">Closed Hat</span>
                    </div>
                    <div class="sound-item" data-sound="clap">
                        <span class="sound-icon">🔈</span>
                        <span class="sound-name">Master Clap</span>
                    </div>
                `;
                break;
            case 'bass':
                content.innerHTML = `
                    <div class="sound-item" data-sound="bass-a">
                        <span class="sound-icon">🔈</span>
                        <span class="sound-name">Deep Bass</span>
                    </div>
                    <div class="sound-item" data-sound="bass-d">
                        <span class="sound-icon">🔈</span>
                        <span class="sound-name">Punchy Bass</span>
                    </div>
                `;
                break;
            case 'inst':
                content.innerHTML = `
                    <div class="sound-item" data-sound="piano">
                        <span class="sound-icon">🔈</span>
                        <span class="sound-name">Grand Piano</span>
                    </div>
                    <div class="sound-item" data-sound="oud">
                        <span class="sound-icon">🔈</span>
                        <span class="sound-name">Arabic Oud</span>
                    </div>
                `;
                break;
        }

        // Re-setup event listeners for new content
        this.setupLibraryContentListeners();
    }

    setupLibraryContentListeners() {
        document.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.previewSample(e.target.dataset.sample);
            });
        });
    }

    previewSample(sampleName) {
        if (this.studio && this.studio.samples[sampleName]) {
            this.studio.playSample(sampleName, 0.5);
        }
    }

    updateTrackVolume(trackId, volume) {
        if (this.studio) {
            const track = this.studio.tracks.find(t => t.id === trackId);
            if (track) {
                track.volume = volume;
            }
        }
    }

    toggleTrackMute(trackId) {
        if (this.studio) {
            const track = this.studio.tracks.find(t => t.id === trackId);
            if (track) {
                track.muted = !track.muted;
                const btn = document.querySelector(`.mute-btn[data-track="${trackId}"]`);
                if (btn) {
                    btn.style.opacity = track.muted ? '0.5' : '1';
                }
            }
        }
    }

    toggleStep(trackId, stepIndex) {
        if (this.studio) {
            const track = this.studio.tracks.find(t => t.id === trackId);
            if (track && track.steps) {
                track.steps[stepIndex] = !track.steps[stepIndex];
                const stepBtn = document.querySelector(`.step[data-track="${trackId}"][data-step="${stepIndex}"]`);
                if (stepBtn) {
                    stepBtn.classList.toggle('active', track.steps[stepIndex]);
                }
            }
        }
    }

    openStudio(vocalBlob) {
        this.studio = new BattaloodaStudio();
        this.studio.loadVocalTrack(vocalBlob);
        this.studio.loadSamples();
        
        document.getElementById('studio-modal').classList.remove('hidden');
        
        // Set up export callback
        this.studio.onExport = (mixedBlob) => {
            if (this.onExportComplete) {
                this.onExportComplete(mixedBlob);
            }
        };
    }

    closeStudio() {
        if (this.studio) {
            this.studio.stop();
            this.studio = null;
        }
        document.getElementById('studio-modal').classList.add('hidden');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StudioUI };
}