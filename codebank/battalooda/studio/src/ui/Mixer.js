export function renderMixerSidebar(el, engine, state) {
  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">Mixer</span>
    </div>
    <div class="mixer-track-list">
      ${state.tracks.map(track => `
        <div class="mixer-track-item" data-track="${track.id}">
          <div class="mixer-track-dot" data-track="${track.id}" style="background:${track.muted ? '#555' : track.color}"></div>
          <span class="mixer-track-name">${track.name}</span>
          <div class="mixer-track-icons">
            <span class="mixer-icon ${track.muted ? '' : 'active'}">♪</span>
            <span class="mixer-icon active">🔊</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  el.querySelectorAll('.mixer-track-item').forEach(item => {
    item.addEventListener('click', () => engine.toggleMute(item.dataset.track));
  });
}
