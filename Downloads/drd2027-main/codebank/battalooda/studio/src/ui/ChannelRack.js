export function renderChannelRack(el, engine, state) {
  const samplerTracks = state.tracks.filter(t => t.type === 'sampler');
  const audioTracks = state.tracks.filter(t => t.type === 'audio');

  el.innerHTML = `
    <div class="rack-header">
      <span class="rack-header-icon">▶</span>
      <span class="rack-header-icon rack-settings">⚙</span>
      <span class="rack-title">◈ Channel Rack</span>
      <div class="rack-header-right">
        <span class="rack-info-text">● Steps: 16</span>
        <div class="rack-pattern-nav">
          <button class="pattern-nav-btn">◀</button>
          <span class="pattern-display">Pattern 1</span>
          <button class="pattern-nav-btn">▶</button>
        </div>
      </div>
    </div>
    <div class="rack-grid">
      ${samplerTracks.map(track => renderTrackRow(track, state.currentStep, state.isPlaying)).join('')}
      ${audioTracks.map(track => renderAudioRow(track)).join('')}
    </div>
  `;

  el.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      engine.toggleStep(btn.dataset.track, parseInt(btn.dataset.step));
    });
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      engine.toggleStep(btn.dataset.track, parseInt(btn.dataset.step));
    });
  });

  el.querySelectorAll('.track-mute-btn').forEach(btn => {
    btn.addEventListener('click', () => engine.toggleMute(btn.dataset.track));
  });

  el.querySelectorAll('.track-solo-btn').forEach(btn => {
    btn.addEventListener('click', () => engine.toggleSolo(btn.dataset.track));
  });

  el.querySelectorAll('.track-vol-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      engine.setTrackVolume(slider.dataset.track, parseInt(e.target.value) / 100);
    });
  });

  el.querySelectorAll('.track-pan-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      engine.setTrackPan(slider.dataset.track, (parseInt(e.target.value) - 50) / 50);
    });
  });

  el.querySelectorAll('.track-name').forEach(nameEl => {
    nameEl.addEventListener('click', () => {
      const id = nameEl.dataset.track;
      const track = engine.tracks.find(t => t.id === id);
      if (track) engine.previewSample(track.sample);
    });
  });
}

function renderTrackRow(track, currentStep, isPlaying) {
  const steps = track.steps.map((on, i) => {
    const isCurrent = i === currentStep && isPlaying;
    const isGroupB = Math.floor(i / 4) % 2 === 1;
    let cls = 'step-btn';
    if (on) cls += ' on';
    if (isCurrent) cls += ' current';
    if (!on && isGroupB) cls += ' group-b';
    return `<button class="${cls}" data-track="${track.id}" data-step="${i}" title="Step ${i + 1}"></button>`;
  }).join('');

  const trackColor = track.color || '#555';

  return `
    <div class="rack-row" data-track="${track.id}">
      <div class="track-controls" style="--track-color:${trackColor}">
        <div class="track-color-bar" style="background:${trackColor}"></div>
        <button class="track-mute-btn ${track.muted ? 'muted' : ''}" data-track="${track.id}" title="Mute">M</button>
        <button class="track-solo-btn" data-track="${track.id}" title="Solo">S</button>
        <span class="track-name" data-track="${track.id}" title="Click to preview">${track.name}</span>
        <div class="track-sliders">
          <input type="range" class="track-vol-slider" data-track="${track.id}" min="0" max="100" value="${Math.round(track.volume * 100)}" title="Volume" />
          <input type="range" class="track-pan-slider" data-track="${track.id}" min="0" max="100" value="${Math.round((track.pan + 1) * 50)}" title="Pan" />
        </div>
      </div>
      <div class="steps-container">
        <div class="steps-group">${track.steps.slice(0,4).map((on, i) => renderStep(track, on, i, currentStep, isPlaying)).join('')}</div>
        <div class="steps-sep"></div>
        <div class="steps-group">${track.steps.slice(4,8).map((on, i) => renderStep(track, on, i+4, currentStep, isPlaying)).join('')}</div>
        <div class="steps-sep"></div>
        <div class="steps-group">${track.steps.slice(8,12).map((on, i) => renderStep(track, on, i+8, currentStep, isPlaying)).join('')}</div>
        <div class="steps-sep"></div>
        <div class="steps-group">${track.steps.slice(12,16).map((on, i) => renderStep(track, on, i+12, currentStep, isPlaying)).join('')}</div>
      </div>
    </div>
  `;
}

function renderStep(track, on, i, currentStep, isPlaying) {
  const isCurrent = i === currentStep && isPlaying;
  const isGroupB = Math.floor(i / 4) % 2 === 1;
  let cls = 'step-btn';
  if (on) cls += ' on';
  if (isCurrent) cls += ' current';
  if (!on && isGroupB) cls += ' group-b';
  return `<button class="${cls}" data-track="${track.id}" data-step="${i}" title="Step ${i + 1}" style="${on ? `--step-color:${track.color}` : ''}"></button>`;
}

function renderAudioRow(track) {
  const bars = Array.from({ length: 64 }, (_, i) => {
    const h = 20 + Math.random() * 80;
    return `<div class="waveform-bar" style="height:${h}%"></div>`;
  }).join('');

  return `
    <div class="rack-row audio-row" data-track="${track.id}">
      <div class="track-controls" style="--track-color:${track.color}">
        <div class="track-color-bar" style="background:${track.color}"></div>
        <button class="track-mute-btn ${track.muted ? 'muted' : ''}" data-track="${track.id}" title="Mute">M</button>
        <button class="track-solo-btn" data-track="${track.id}" title="Solo">S</button>
        <span class="track-name" data-track="${track.id}">${track.name}</span>
      </div>
      <div class="waveform-display">
        <div class="waveform-bars-wrap">${bars}</div>
      </div>
    </div>
  `;
}
