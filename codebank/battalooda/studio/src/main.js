import './styles/studio.css';
import { StudioEngine } from './engine/StudioEngine.js';
import { StudioUI } from './ui/StudioUI.js';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('root');
  root.innerHTML = buildLayout();

  const engine = new StudioEngine();
  const ui = new StudioUI(engine);
  ui.mount();

  engine.applyGenrePreset('Amapiano');

  window.studioEngine = engine;
  window.studioUI = ui;
});

function buildLayout() {
  return `
    <div id="battalooda-studio" class="studio-root">
      <div id="studio-toolbar" class="studio-toolbar"></div>
      <div class="studio-body">
        <aside id="studio-browser" class="studio-browser"></aside>
        <div class="studio-center">
          <div class="studio-top-area">
            <div id="studio-mixer-sidebar" class="studio-mixer-sidebar"></div>
            <div id="studio-playlist" class="studio-playlist"></div>
            <aside id="studio-effects" class="studio-effects-panel"></aside>
          </div>
          <div id="studio-channel-rack" class="studio-channel-rack"></div>
          <div id="studio-piano" class="studio-piano-container"></div>
        </div>
      </div>
    </div>
  `;
}
