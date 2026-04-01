const TOTAL_BARS = 32;

const PATTERN_DATA = [
  { trackId: 'kick',  start: 0,  width: 8,  label: 'Kick Pattern',   color: '#c0392b' },
  { trackId: 'kick',  start: 8,  width: 8,  label: 'Kick Var',       color: '#922b21' },
  { trackId: 'snare', start: 2,  width: 6,  label: 'Snare A',        color: '#27ae60' },
  { trackId: 'snare', start: 10, width: 6,  label: 'Snare B',        color: '#1e8449' },
  { trackId: 'hihat', start: 0,  width: 16, label: 'Hi-Hat Loop',    color: '#d4ac0d' },
  { trackId: 'clap',  start: 6,  width: 4,  label: 'Clap Fill',      color: '#9b59b6' },
  { trackId: 'bass',  start: 4,  width: 8,  label: 'Bass 01',        color: '#2980b9' },
  { trackId: 'perc',  start: 12, width: 4,  label: 'Perc Break',     color: '#e67e22' },
  { trackId: 'vocal', start: 0,  width: 16, label: 'Vocal Take 1',   color: '#117a8b' },
];

export function renderPlaylist(el, engine, state) {
  const trackRows = state.tracks.map(track => {
    const patterns = PATTERN_DATA.filter(p => p.trackId === track.id);
    const patternsHtml = patterns.map(p => {
      const left = (p.start / TOTAL_BARS * 100).toFixed(2);
      const width = (p.width / TOTAL_BARS * 100).toFixed(2);
      return `
        <div class="playlist-block" style="left:${left}%;width:${width}%;background:${p.color}cc;" title="${p.label}">
          <span class="playlist-block-label">${p.label}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="playlist-row" data-track="${track.id}">
        <div class="playlist-track-label">
          <div class="plt-dot" style="background:${track.muted ? '#555' : track.color}" data-track="${track.id}"></div>
          <span>${track.name}</span>
        </div>
        <div class="playlist-pattern-area">${patternsHtml}</div>
      </div>
    `;
  }).join('');

  const automationRows = ['Reverb', 'Delay', 'EQ', 'Compressor'].map(fx => `
    <div class="playlist-row automation-row">
      <div class="playlist-track-label">
        <span class="automation-label">♪ ${fx}</span>
      </div>
      <div class="playlist-pattern-area"></div>
    </div>
  `).join('');

  const rulerTicks = Array.from({ length: TOTAL_BARS }, (_, i) => `
    <div class="ruler-tick ${i % 4 === 0 ? 'major' : ''}">
      ${i % 4 === 0 ? `<span>${i + 1}</span>` : ''}
    </div>
  `).join('');

  el.innerHTML = `
    <div class="playlist-header">
      <span class="panel-title">Playlist — Arrangement</span>
      <div class="playlist-tools">
        <button class="plt-tool active" title="Select">◻</button>
        <button class="plt-tool" title="Draw">✏️</button>
        <button class="plt-tool" title="Erase">⌫</button>
        <button class="plt-tool" title="Zoom In">🔍</button>
      </div>
    </div>
    <div class="playlist-timeline">
      <div class="timeline-corner"></div>
      <div class="timeline-ruler">${rulerTicks}</div>
    </div>
    <div class="playlist-tracks-area">
      <div id="playlist-playhead" class="playlist-playhead" style="opacity:0"></div>
      ${trackRows}
      ${automationRows}
    </div>
  `;
}
