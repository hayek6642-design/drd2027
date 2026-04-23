const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const KEY_MAP = {
  'a': { note: 'C', oct: 4 },
  'w': { note: 'C#', oct: 4 },
  's': { note: 'D', oct: 4 },
  'e': { note: 'D#', oct: 4 },
  'd': { note: 'E', oct: 4 },
  'f': { note: 'F', oct: 4 },
  't': { note: 'F#', oct: 4 },
  'g': { note: 'G', oct: 4 },
  'y': { note: 'G#', oct: 4 },
  'h': { note: 'A', oct: 4 },
  'u': { note: 'A#', oct: 4 },
  'j': { note: 'B', oct: 4 },
  'k': { note: 'C', oct: 5 },
  'o': { note: 'C#', oct: 5 },
  'l': { note: 'D', oct: 5 },
  'p': { note: 'D#', oct: 5 },
  ';': { note: 'E', oct: 5 },
};

const WAVEFORMS = ['sine', 'sawtooth', 'square', 'triangle'];

function noteToFreq(note, octave) {
  const idx = NOTES.indexOf(note);
  const semitones = (octave - 4) * 12 + idx - 9;
  return 440 * Math.pow(2, semitones / 12);
}

export function renderPiano(el, engine) {
  let octave = 4;
  let activeWave = 'sawtooth';
  let activeKeys = new Set();

  const render = () => {
    const whites = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const blacks = ['C#', 'D#', null, 'F#', 'G#', 'A#', null];

    el.innerHTML = `
      <div class="piano-toolbar">
        <div class="piano-label">🎹 PIANO ROLL</div>
        <div class="piano-controls">
          <span class="piano-ctrl-label">Octave</span>
          <button class="piano-ctrl-btn" id="oct-dec">−</button>
          <span class="piano-oct-display" id="oct-display">${octave}</span>
          <button class="piano-ctrl-btn" id="oct-inc">+</button>
        </div>
        <div class="piano-wave-selector">
          ${WAVEFORMS.map(w => `
            <button class="wave-btn ${w === activeWave ? 'active' : ''}" data-wave="${w}" title="${w}">
              ${w === 'sine' ? '∿' : w === 'sawtooth' ? '⊿' : w === 'square' ? '⊓' : '△'}
            </button>
          `).join('')}
        </div>
        <div class="piano-kb-hint">Keyboard: A-J = White keys, W-P = Black keys</div>
      </div>
      <div class="piano-wrap">
        <div class="piano-keys" id="piano-keys">
          ${[octave - 1, octave, octave + 1].map(oct => `
            <div class="piano-octave" data-octave="${oct}">
              <span class="octave-label">C${oct}</span>
              ${whites.map((note, idx) => {
                const black = blacks[idx];
                return `
                  <div class="key-group">
                    <div class="piano-key white-key" data-note="${note}" data-oct="${oct}" title="${note}${oct}">
                      <span class="key-label">${note}${oct}</span>
                    </div>
                    ${black ? `<div class="piano-key black-key" data-note="${black}" data-oct="${oct}" title="${black}${oct}"></div>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    el.querySelector('#oct-dec').addEventListener('click', () => {
      octave = Math.max(1, octave - 1);
      render();
    });
    el.querySelector('#oct-inc').addEventListener('click', () => {
      octave = Math.min(8, octave + 1);
      render();
    });

    el.querySelectorAll('.wave-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeWave = btn.dataset.wave;
        el.querySelectorAll('.wave-btn').forEach(b => b.classList.toggle('active', b.dataset.wave === activeWave));
      });
    });

    el.querySelectorAll('.piano-key').forEach(key => {
      const playKey = async () => {
        await engine.initAudio();
        const note = key.dataset.note;
        const oct = parseInt(key.dataset.oct);
        const freq = noteToFreq(note, oct);
        engine.playNote(freq, activeWave, 0.5, 0.45);
        key.classList.add('pressed');
        setTimeout(() => key.classList.remove('pressed'), 200);
      };

      key.addEventListener('mousedown', (e) => { e.preventDefault(); playKey(); });
      key.addEventListener('touchstart', (e) => { e.preventDefault(); playKey(); }, { passive: false });
    });
  };

  render();

  const handleKeyDown = async (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    const map = KEY_MAP[e.key.toLowerCase()];
    if (!map || activeKeys.has(e.key.toLowerCase())) return;
    activeKeys.add(e.key.toLowerCase());
    await engine.initAudio();
    const oct = map.oct === 4 ? octave : octave + 1;
    const freq = noteToFreq(map.note, oct);
    engine.playNote(freq, activeWave, 0.5, 0.45);

    const keyEl = el.querySelector(`.piano-key[data-note="${map.note}"][data-oct="${oct}"]`);
    if (keyEl) keyEl.classList.add('pressed');
  };

  const handleKeyUp = (e) => {
    const map = KEY_MAP[e.key.toLowerCase()];
    if (!map) return;
    activeKeys.delete(e.key.toLowerCase());
    const oct = map.oct === 4 ? octave : octave + 1;
    const keyEl = el.querySelector(`.piano-key[data-note="${map.note}"][data-oct="${oct}"]`);
    if (keyEl) keyEl.classList.remove('pressed');
  };

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
}
