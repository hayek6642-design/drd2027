import { renderToolbar } from './Toolbar.js';
import { renderBrowser } from './Browser.js';
import { renderChannelRack } from './ChannelRack.js';
import { renderPlaylist } from './Playlist.js';
import { renderEffects } from './Effects.js';
import { renderMixerSidebar } from './Mixer.js';
import { renderPiano } from './Piano.js';

export class StudioUI {
  constructor(engine) {
    this.engine = engine;
    this._unsubscribe = null;
  }

  mount() {
    this._render();
    this._unsubscribe = this.engine.subscribe((state) => this._onStateChange(state));
  }

  unmount() {
    if (this._unsubscribe) this._unsubscribe();
  }

  _render() {
    const state = this.engine.getState();
    renderToolbar(document.getElementById('studio-toolbar'), this.engine, state);
    renderBrowser(document.getElementById('studio-browser'), this.engine);
    renderMixerSidebar(document.getElementById('studio-mixer-sidebar'), this.engine, state);
    renderPlaylist(document.getElementById('studio-playlist'), this.engine, state);
    renderEffects(document.getElementById('studio-effects'), this.engine, state);
    renderChannelRack(document.getElementById('studio-channel-rack'), this.engine, state);
    renderPiano(document.getElementById('studio-piano'), this.engine);
  }

  _onStateChange(state) {
    this._updateToolbar(state);
    this._updateChannelRackSteps(state);
    this._updatePlaylist(state);
    this._updateMixerSidebar(state);
    this._updateEffects(state);
    this._updateRecording(state);
  }

  _updateToolbar(state) {
    const el = document.getElementById('transport-play-btn');
    if (el) {
      el.textContent = state.isPlaying ? '⏹ STOP' : '▶ PLAY';
      el.classList.toggle('active', state.isPlaying);
    }
    const step = document.getElementById('transport-step-display');
    if (step) {
      const s = state.currentStep >= 0 ? state.currentStep + 1 : 1;
      step.textContent = `${String(Math.floor((state.timeElapsed || 0) / 60)).padStart(2,'0')}:${String((state.timeElapsed || 0) % 60).padStart(2,'0')}`;
    }
    const bpmEl = document.getElementById('bpm-value-display');
    if (bpmEl) bpmEl.textContent = state.bpm;
  }

  _updateChannelRackSteps(state) {
    state.tracks.forEach(track => {
      if (track.type !== 'sampler') return;
      track.steps.forEach((on, i) => {
        const btn = document.querySelector(`.step-btn[data-track="${track.id}"][data-step="${i}"]`);
        if (!btn) return;
        btn.classList.toggle('on', !!on);
        btn.classList.toggle('current', i === state.currentStep && state.isPlaying);
        btn.classList.toggle('group-b', Math.floor(i / 4) % 2 === 1);
      });
      const muteBtn = document.querySelector(`.track-mute-btn[data-track="${track.id}"]`);
      if (muteBtn) muteBtn.classList.toggle('muted', track.muted);
    });
  }

  _updatePlaylist(state) {
    const ph = document.getElementById('playlist-playhead');
    if (ph) {
      if (state.isPlaying && state.currentStep >= 0) {
        const pct = (state.currentStep / 16) * 100;
        ph.style.left = `calc(100px + ${pct}% * (100% - 100px) / 100)`;
        ph.style.opacity = '1';
      } else {
        ph.style.opacity = '0';
      }
    }
  }

  _updateMixerSidebar(state) {
    state.tracks.forEach(track => {
      const dot = document.querySelector(`.mixer-track-dot[data-track="${track.id}"]`);
      if (dot) {
        dot.style.background = track.muted ? '#555' : track.color;
      }
    });
  }

  _updateEffects(state) {
    ['reverb', 'delay', 'compressor'].forEach(fx => {
      const btn = document.querySelector(`.fx-btn[data-fx="${fx}"]`);
      if (btn) btn.classList.toggle('active', state.effects[fx]);
    });
  }

  _updateRecording(state) {
    const recBtn = document.getElementById('transport-record-btn');
    const recTimer = document.getElementById('rec-timer-display');
    const recVal = document.getElementById('rec-timer-val');

    if (recBtn) {
      recBtn.classList.toggle('active', state.isRecording);
      if (!recBtn.disabled) {
        recBtn.textContent = state.isRecording ? '⏹ STOP REC' : '● REC';
      }
    }
    if (recTimer) recTimer.style.display = state.isRecording ? 'flex' : 'none';
    if (recVal && state.isRecording) {
      const s = Math.floor((state.recordingElapsed || 0) / 1000);
      const m = Math.floor(s / 60);
      recVal.textContent = `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
    }
  }
}
