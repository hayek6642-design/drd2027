export function renderToolbar(el, engine, state) {
  el.innerHTML = `
    <div class="toolbar-left">
      <div class="toolbar-logo">🎛️ BATTALOODA STUDIO</div>
      <div class="toolbar-menu">
        <span class="menu-item">FILE</span>
        <span class="menu-item">EDIT</span>
        <span class="menu-item">ADD</span>
        <span class="menu-item">PATTERNS</span>
        <span class="menu-item">VIEW</span>
        <span class="menu-item">OPTIONS</span>
        <span class="menu-item">HELP</span>
      </div>
    </div>
    <div class="toolbar-center">
      <div class="transport-controls">
        <button class="transport-btn" id="transport-play-btn" title="Play/Stop">▶ PLAY</button>
        <button class="transport-btn" id="transport-stop-btn" title="Stop">⏹</button>
        <button class="transport-btn" id="transport-record-btn" title="Record voice + beat">● REC</button>
      </div>
      <div class="transport-info">
        <div class="transport-display">
          <div class="display-label">TIME</div>
          <div class="display-value" id="transport-step-display">00:00</div>
        </div>
        <div class="transport-display bpm-display">
          <div class="display-label">BPM</div>
          <div class="bpm-controls">
            <button class="bpm-adj-btn" id="bpm-dec">−</button>
            <div class="display-value bpm-val" id="bpm-value-display">${state.bpm}</div>
            <button class="bpm-adj-btn" id="bpm-inc">+</button>
          </div>
        </div>
        <div class="transport-display rec-timer-display" id="rec-timer-display" style="display:none">
          <div class="display-label rec-pulse">● REC</div>
          <div class="display-value rec-timer-val" id="rec-timer-val">00:00</div>
        </div>
      </div>
      <div class="master-volume-ctrl">
        <span class="display-label">MASTER</span>
        <input type="range" class="master-vol-slider" id="master-vol-slider" min="0" max="100" value="${Math.round(state.masterVolume * 100)}" />
        <span class="master-vol-val" id="master-vol-val">${Math.round(state.masterVolume * 100)}</span>
      </div>
    </div>
    <div class="toolbar-right">
      <div class="genre-selector">
        <span class="display-label">GENRE</span>
        <select class="genre-select" id="genre-select">
          ${state.genres.map(g => `<option value="${g}" ${g === state.selectedGenre ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
      </div>
      <div class="toolbar-actions">
        <button class="tool-action-btn" id="btn-randomize" title="Randomize Pattern">🎲</button>
        <button class="tool-action-btn" id="btn-clear" title="Clear Pattern">🗑️</button>
      </div>
    </div>
  `;

  el.querySelector('#transport-play-btn').addEventListener('click', () => {
    if (engine.isPlaying) engine.stop(); else engine.play();
  });
  el.querySelector('#transport-stop-btn').addEventListener('click', () => engine.stop());

  const recBtn = el.querySelector('#transport-record-btn');
  recBtn.addEventListener('click', async () => {
    if (engine.isRecording) {
      recBtn.disabled = true;
      recBtn.textContent = '⏳ Finalizing…';
      try {
        const result = await engine.stopRecording();
        if (result) {
          const { blob, duration } = result;
          const { showSaveRecordingModal } = await import('./SaveRecordingModal.js');
          showSaveRecordingModal({
            blob,
            duration,
            bpm: engine.bpm,
            genre: engine.selectedGenre,
            onSaved: (name) => {
              const toast = document.createElement('div');
              toast.className = 'srm-toast';
              toast.textContent = `✓ "${name}" saved to library`;
              document.body.appendChild(toast);
              setTimeout(() => toast.remove(), 3000);
            },
            onDiscarded: () => {},
          });
        }
      } finally {
        recBtn.disabled = false;
        recBtn.textContent = '● REC';
        recBtn.classList.remove('active');
      }
    } else {
      await engine.startRecording();
    }
  });

  el.querySelector('#bpm-dec').addEventListener('click', () => engine.setBpm(engine.bpm - 1));
  el.querySelector('#bpm-inc').addEventListener('click', () => engine.setBpm(engine.bpm + 1));

  const bpmDisp = el.querySelector('#bpm-value-display');
  bpmDisp.addEventListener('dblclick', () => {
    const val = prompt('Enter BPM (40–300):', engine.bpm);
    if (val) engine.setBpm(parseInt(val));
  });
  bpmDisp.addEventListener('wheel', (e) => {
    e.preventDefault();
    engine.setBpm(engine.bpm + (e.deltaY < 0 ? 1 : -1));
  });

  const masterSlider = el.querySelector('#master-vol-slider');
  const masterVal = el.querySelector('#master-vol-val');
  masterSlider.addEventListener('input', (e) => {
    const v = parseInt(e.target.value) / 100;
    engine.setMasterVolume(v);
    masterVal.textContent = Math.round(v * 100);
  });

  el.querySelector('#genre-select').addEventListener('change', (e) => {
    engine.applyGenrePreset(e.target.value);
  });

  el.querySelector('#btn-randomize').addEventListener('click', () => engine.randomizePattern());
  el.querySelector('#btn-clear').addEventListener('click', () => engine.clearPattern());
}
