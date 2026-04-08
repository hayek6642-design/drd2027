const FX_LIST = [
  { id: 'compressor', name: 'Compressor', icon: '⟐', desc: 'Dynamic range control' },
  { id: 'reverb',     name: 'Reverb',     icon: '◎', desc: 'Room simulation' },
  { id: 'delay',      name: 'Delay',      icon: '◷', desc: '1/8 delay echo' },
];

const EXTRA_FX = [
  { name: 'EQ',         icon: '≋' },
  { name: 'Waveshaper', icon: '⚡' },
  { name: 'Vocodex',    icon: '〰️' },
  { name: 'Flangus',    icon: '🌊' },
  { name: 'Limiter',    icon: '▶|' },
  { name: 'Chorus',     icon: '❋' },
];

export function renderEffects(el, engine, state) {
  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">Effects</span>
    </div>
    <div class="effects-list">
      ${FX_LIST.map(fx => `
        <button class="fx-btn ${state.effects[fx.id] ? 'active' : ''}" data-fx="${fx.id}" title="${fx.desc}">
          <span class="fx-indicator ${state.effects[fx.id] ? 'on' : ''}"></span>
          <span class="fx-icon">${fx.icon}</span>
          <span class="fx-name">${fx.name}</span>
        </button>
      `).join('')}
    </div>
    <div class="effects-divider"></div>
    <div class="effects-extra">
      ${EXTRA_FX.map(fx => `
        <div class="fx-extra-item" title="${fx.name}">
          <span class="fx-indicator"></span>
          <span class="fx-icon">${fx.icon}</span>
          <span class="fx-name">${fx.name}</span>
        </div>
      `).join('')}
    </div>
    <div class="effects-master">
      <div class="master-section-label">MASTER</div>
      <div class="master-fader-row">
        <span class="fader-label">VOL</span>
        <div class="fader-track">
          <div class="fader-fill" id="master-vol-fill" style="width:80%"></div>
        </div>
      </div>
      <div class="master-fader-row">
        <span class="fader-label">PAN</span>
        <div class="fader-track pan-track">
          <div class="fader-center-mark"></div>
          <div class="fader-fill pan-fill" style="width:50%;margin-left:25%"></div>
        </div>
      </div>
    </div>
  `;

  el.querySelectorAll('.fx-btn').forEach(btn => {
    btn.addEventListener('click', () => engine.toggleEffect(btn.dataset.fx));
  });
}
