import { getAllRecordings, deleteRecording, saveRecording, formatDuration, formatDate, formatSize } from '../engine/RecordingStore.js';

export async function renderRecordingsPanel(el) {
  let recordings = [];
  let activePlayer = null;

  const load = async () => {
    recordings = await getAllRecordings();
    renderList();
  };

  const renderList = () => {
    const listEl = el.querySelector('#rec-list');
    if (!listEl) return;

    if (recordings.length === 0) {
      listEl.innerHTML = `
        <div class="rec-empty">
          <div class="rec-empty-icon">🎙️</div>
          <div class="rec-empty-text">No recordings yet</div>
          <div class="rec-empty-sub">Hit the ● REC button to start recording your voice + beat</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = recordings.map(rec => {
      const url = URL.createObjectURL(rec.data);
      return `
        <div class="rec-item" data-id="${rec.id}">
          <div class="rec-item-top">
            <div class="rec-item-info">
              <span class="rec-item-name">${rec.name}</span>
              <div class="rec-item-meta">
                <span class="rec-meta-chip">${rec.genre || 'Unknown'}</span>
                <span class="rec-meta-chip">${rec.bpm || '?'} BPM</span>
                <span class="rec-meta-chip">${formatDuration(rec.duration)}</span>
                <span class="rec-meta-chip">${formatSize(rec.size)}</span>
              </div>
              <div class="rec-item-date">${formatDate(rec.createdAt)}</div>
            </div>
            <div class="rec-item-actions">
              <button class="rec-action-btn rec-play-btn" data-url="${url}" data-id="${rec.id}" title="Play">▶</button>
              <button class="rec-action-btn rec-dl-btn" data-url="${url}" data-name="${rec.name}.webm" title="Download">⬇</button>
              <button class="rec-action-btn rec-del-btn" data-id="${rec.id}" title="Delete">🗑</button>
            </div>
          </div>
          <audio class="rec-audio" id="rec-audio-${rec.id}" src="${url}" preload="none"></audio>
          <div class="rec-waveform-bar" id="rec-progress-${rec.id}">
            <div class="rec-progress-fill" id="rec-fill-${rec.id}"></div>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.rec-play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const audio = document.getElementById(`rec-audio-${id}`);
        if (!audio) return;

        if (activePlayer && activePlayer !== audio) {
          activePlayer.pause();
          const prevBtn = listEl.querySelector(`.rec-play-btn[data-id="${activePlayer.dataset.recId}"]`);
          if (prevBtn) prevBtn.textContent = '▶';
          document.getElementById(`rec-fill-${activePlayer.dataset.recId}`)?.style.setProperty('width', '0%');
        }

        if (audio.paused) {
          audio.dataset.recId = id;
          audio.play();
          btn.textContent = '⏸';
          activePlayer = audio;

          audio.ontimeupdate = () => {
            const pct = (audio.currentTime / (audio.duration || 1)) * 100;
            const fill = document.getElementById(`rec-fill-${id}`);
            if (fill) fill.style.width = `${pct}%`;
          };
          audio.onended = () => {
            btn.textContent = '▶';
            const fill = document.getElementById(`rec-fill-${id}`);
            if (fill) fill.style.width = '0%';
            activePlayer = null;
          };
        } else {
          audio.pause();
          btn.textContent = '▶';
          activePlayer = null;
        }
      });
    });

    listEl.querySelectorAll('.rec-dl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = btn.dataset.url;
        a.download = btn.dataset.name;
        a.click();
      });
    });

    listEl.querySelectorAll('.rec-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id);
        if (!confirm('Delete this recording?')) return;
        const audio = document.getElementById(`rec-audio-${id}`);
        if (audio) audio.pause();
        await deleteRecording(id);
        await load();
      });
    });
  };

  el.innerHTML = `
    <div class="rec-panel-header">
      <span class="panel-title">🎙️ Recordings</span>
      <span class="rec-panel-count" id="rec-count"></span>
    </div>
    <div class="rec-list" id="rec-list"></div>
  `;

  await load();

  el.recRefresh = load;
}

export function formatRecordingName(genre, bpm) {
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  return `${genre || 'Mix'} ${bpm}BPM — ${ts}`;
}
