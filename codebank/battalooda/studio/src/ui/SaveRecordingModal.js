import { saveRecording, formatDuration, formatSize } from '../engine/RecordingStore.js';

export function showSaveRecordingModal({ blob, duration, bpm, genre, onSaved, onDiscarded }) {
  const existing = document.getElementById('save-rec-modal-overlay');
  if (existing) existing.remove();

  const url = URL.createObjectURL(blob);
  const durationStr = formatDuration(duration);
  const sizeStr = formatSize(blob.size);

  const defaultName = (() => {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    return `${genre || 'Mix'} ${bpm}BPM — ${ts}`;
  })();

  const overlay = document.createElement('div');
  overlay.id = 'save-rec-modal-overlay';
  overlay.className = 'srm-overlay';
  overlay.innerHTML = `
    <div class="srm-modal" role="dialog" aria-modal="true" aria-labelledby="srm-title">
      <div class="srm-header">
        <span class="srm-icon">🎙️</span>
        <h2 class="srm-title" id="srm-title">Recording Complete</h2>
      </div>

      <div class="srm-meta-row">
        <div class="srm-chip">${genre || 'Mix'}</div>
        <div class="srm-chip">${bpm} BPM</div>
        <div class="srm-chip">${durationStr}</div>
        <div class="srm-chip">${sizeStr}</div>
      </div>

      <div class="srm-player-wrap">
        <audio id="srm-audio" src="${url}" preload="auto"></audio>
        <div class="srm-player">
          <button class="srm-play-btn" id="srm-play-btn" title="Play / Pause">▶</button>
          <div class="srm-progress-track" id="srm-progress-track">
            <div class="srm-progress-fill" id="srm-progress-fill"></div>
            <div class="srm-progress-thumb" id="srm-progress-thumb"></div>
          </div>
          <span class="srm-time" id="srm-time">0:00 / ${durationStr}</span>
        </div>
        <div class="srm-waveform" id="srm-waveform">
          ${Array.from({ length: 60 }, () => {
            const h = 15 + Math.random() * 85;
            return `<div class="srm-wave-bar" style="height:${h}%"></div>`;
          }).join('')}
        </div>
      </div>

      <div class="srm-name-row">
        <label class="srm-name-label" for="srm-name-input">Recording name</label>
        <input
          id="srm-name-input"
          class="srm-name-input"
          type="text"
          value="${defaultName}"
          maxlength="80"
          spellcheck="false"
          autocomplete="off"
        />
      </div>

      <div class="srm-actions">
        <button class="srm-btn srm-discard-btn" id="srm-discard-btn">🗑 Discard</button>
        <button class="srm-btn srm-save-btn" id="srm-save-btn">💾 Save to Library</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const audio = document.getElementById('srm-audio');
  const playBtn = document.getElementById('srm-play-btn');
  const progressFill = document.getElementById('srm-progress-fill');
  const progressThumb = document.getElementById('srm-progress-thumb');
  const progressTrack = document.getElementById('srm-progress-track');
  const timeEl = document.getElementById('srm-time');

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  audio.addEventListener('timeupdate', () => {
    const pct = (audio.currentTime / (audio.duration || 1)) * 100;
    progressFill.style.width = `${pct}%`;
    progressThumb.style.left = `${pct}%`;
    timeEl.textContent = `${fmtTime(audio.currentTime)} / ${durationStr}`;
  });

  audio.addEventListener('play', () => { playBtn.textContent = '⏸'; });
  audio.addEventListener('pause', () => { playBtn.textContent = '▶'; });
  audio.addEventListener('ended', () => {
    playBtn.textContent = '▶';
    progressFill.style.width = '0%';
    progressThumb.style.left = '0%';
    timeEl.textContent = `0:00 / ${durationStr}`;
  });

  playBtn.addEventListener('click', () => {
    if (audio.paused) audio.play();
    else audio.pause();
  });

  progressTrack.addEventListener('click', (e) => {
    const rect = progressTrack.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * (audio.duration || 0);
  });

  const cleanup = () => {
    audio.pause();
    URL.revokeObjectURL(url);
    overlay.remove();
  };

  document.getElementById('srm-discard-btn').addEventListener('click', () => {
    if (!confirm('Discard this recording? It cannot be recovered.')) return;
    cleanup();
    if (onDiscarded) onDiscarded();
  });

  document.getElementById('srm-save-btn').addEventListener('click', async () => {
    const saveBtn = document.getElementById('srm-save-btn');
    const name = document.getElementById('srm-name-input').value.trim() || defaultName;
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Saving…';
    try {
      await saveRecording({ name, blob, duration, bpm, genre });
      document.dispatchEvent(new CustomEvent('recordings-updated'));
      cleanup();
      if (onSaved) onSaved(name);
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Save to Library';
      alert('Failed to save: ' + err.message);
    }
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      audio.pause();
    }
  });

  requestAnimationFrame(() => audio.play().catch(() => {}));
}
