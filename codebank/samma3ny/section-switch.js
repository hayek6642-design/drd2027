/**
 * Samma3ny — Section Switch Module
 * ─────────────────────────────────────────────────────────────────────────────
 * Injects a 3-way segmented switch (Home | Afra7 | Nour) into the right-panel
 * header. Zero changes to player.js or fixes.js.
 *
 * Behaviour:
 *   • Afra7  → always restarts from its first song when switched to
 *   • Home   → continues from the last song played in that section
 *   • Nour   → continues from the last song played in that section
 *
 * Song assignment: equal thirds of songs.json order (configurable below).
 * Uses window.playSong(id) exposed by player.js for playback control.
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function SectionSwitch() {
  'use strict';

  /* ─── Section Definitions ─────────────────────────────────────────────── */
  // Adjust `start` / `end` (0-based indices in songs.json) to reassign songs.
  const SECTION_CONFIG = {
    Home: {
      label: 'Home',
      icon: '🏠',
      start: 0,          // inclusive
      end: 135,          // inclusive  (~first third, 136 songs)
      restartOnSwitch: false,
      color: '#B043FF',
      activeTextColor: '#fff'
    },
    Afra7: {
      label: 'Afra7',
      icon: '🎉',
      start: 136,        // inclusive
      end: 271,          // inclusive  (~second third, 136 songs)
      restartOnSwitch: true,   // ← ALWAYS restarts
      color: '#FF6B35',
      activeTextColor: '#fff'
    },
    Nour: {
      label: 'Nour',
      icon: '✨',
      start: 272,        // inclusive
      end: Infinity,     // inclusive  (~last third, rest of songs)
      restartOnSwitch: false,
      color: '#43C6FF',
      activeTextColor: '#111'
    }
  };

  const SONGS_PER_PAGE = 100;   // must match player.js
  const LS_ACTIVE    = 's3ny_active_section';
  const LS_LAST      = (s) => `s3ny_lastTrack_${s}`;  // stores JSON {id, page}
  const INIT_DELAY   = 1200;    // ms — wait for player.js to finish bootstrapping

  /* ─── Module State ────────────────────────────────────────────────────── */
  let allSongs      = [];           // [{id, …}] in songs.json order
  let sectionMap    = {};           // songId → sectionName
  let activeSection = localStorage.getItem(LS_ACTIVE) || 'Home';
  let switchEl      = null;
  let filterObserver= null;
  let activeObserver= null;
  let _switching    = false;        // guard: ignore observer during switch

  /* ─── Init ────────────────────────────────────────────────────────────── */
  function init() {
    fetchSongs()
      .then(songs => {
        allSongs = songs;
        buildSectionMap();
        injectStyles();
        injectSwitchButton();
        startObservers();
        applyFilter();
        // Restore section on reload
        restoreCurrentSection();
      })
      .catch(err => console.warn('[SectionSwitch] init failed:', err));
  }

  /* ─── Fetch songs.json ────────────────────────────────────────────────── */
  async function fetchSongs() {
    const res = await fetch('/codebank/samma3ny/songs.json');
    if (!res.ok) throw new Error(`songs.json status ${res.status}`);
    return await res.json();
  }

  /* ─── Build section map ───────────────────────────────────────────────── */
  function buildSectionMap() {
    sectionMap = {};
    allSongs.forEach((song, i) => {
      const id = song.public_id || song.id;
      for (const [name, cfg] of Object.entries(SECTION_CONFIG)) {
        if (i >= cfg.start && i <= cfg.end) {
          sectionMap[id] = name;
          break;
        }
      }
    });
  }

  /* ─── Inject CSS ──────────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('s3ny-section-styles')) return;
    const style = document.createElement('style');
    style.id = 's3ny-section-styles';
    style.textContent = `
      /* ── 3-way switch wrapper ─────────────────────────────────── */
      #s3ny-switch {
        display: flex;
        align-items: center;
        gap: 0;
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 20px;
        padding: 3px;
        flex-shrink: 0;
        margin-right: 6px;
      }

      /* ── Individual segment button ────────────────────────────── */
      #s3ny-switch .s3ny-seg {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 5px 10px;
        border: none;
        border-radius: 16px;
        background: transparent;
        color: rgba(255,255,255,0.55);
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.4px;
        cursor: pointer;
        transition: background 0.22s ease, color 0.22s ease, transform 0.15s ease;
        white-space: nowrap;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
      #s3ny-switch .s3ny-seg:hover {
        background: rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.9);
      }
      #s3ny-switch .s3ny-seg:active {
        transform: scale(0.94);
      }
      #s3ny-switch .s3ny-seg .s3ny-icon {
        font-size: 13px;
        line-height: 1;
      }

      /* ── Active state (colour set inline per section) ─────────── */
      #s3ny-switch .s3ny-seg.active {
        font-weight: 700;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      }

      /* ── Hidden items ─────────────────────────────────────────── */
      .playlist-item.s3ny-hidden {
        display: none !important;
      }

      /* ── Section badge shown near playlist title ──────────────── */
      #s3ny-badge {
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 8px;
        margin-left: 6px;
        vertical-align: middle;
        letter-spacing: 0.5px;
        opacity: 0.9;
        transition: background 0.25s ease, color 0.25s ease;
      }

      /* ── Slide-in animation for playlist on section switch ─────── */
      @keyframes s3ny-slidein {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .s3ny-switching .playlist-item:not(.s3ny-hidden) {
        animation: s3ny-slidein 0.25s ease both;
      }
    `;
    document.head.appendChild(style);
  }

  /* ─── Inject 3-way switch button into header ──────────────────────────── */
  function injectSwitchButton() {
    if (document.getElementById('s3ny-switch')) return;

    const header = document.querySelector('.playlist-header-main');
    if (!header) { setTimeout(injectSwitchButton, 300); return; }

    // Build switch element
    switchEl = document.createElement('div');
    switchEl.id = 's3ny-switch';
    switchEl.setAttribute('role', 'tablist');
    switchEl.setAttribute('aria-label', 'Section switcher');

    Object.entries(SECTION_CONFIG).forEach(([name, cfg]) => {
      const btn = document.createElement('button');
      btn.className = 's3ny-seg' + (activeSection === name ? ' active' : '');
      btn.dataset.section = name;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', activeSection === name ? 'true' : 'false');
      btn.title = name;
      btn.innerHTML = `<span class="s3ny-icon">${cfg.icon}</span><span>${cfg.label}</span>`;
      if (activeSection === name) {
        btn.style.background = cfg.color;
        btn.style.color = cfg.activeTextColor;
      }
      btn.addEventListener('click', () => switchToSection(name));
      switchEl.appendChild(btn);
    });

    // Insert BEFORE the refresh button (or at end if not found)
    const refreshBtn = header.querySelector('#refresh-btn');
    if (refreshBtn) {
      header.insertBefore(switchEl, refreshBtn);
    } else {
      header.appendChild(switchEl);
    }

    // Inject badge next to "Music Library" title
    const titleEl = header.querySelector('.playlist-title');
    if (titleEl && !document.getElementById('s3ny-badge')) {
      const badge = document.createElement('span');
      badge.id = 's3ny-badge';
      updateBadge(badge, activeSection);
      titleEl.appendChild(badge);
    }
  }

  /* ─── Update section badge ────────────────────────────────────────────── */
  function updateBadge(badgeEl, sectionName) {
    const cfg = SECTION_CONFIG[sectionName];
    if (!cfg || !badgeEl) return;
    badgeEl.textContent = cfg.icon + ' ' + cfg.label;
    badgeEl.style.background = cfg.color;
    badgeEl.style.color = cfg.activeTextColor;
  }

  /* ─── Apply section filter to DOM items ──────────────────────────────── */
  function applyFilter() {
    const items = document.querySelectorAll('.playlist-item[data-track-id]');
    items.forEach(item => {
      const id = item.dataset.trackId;
      const section = sectionMap[id];
      if (!section) return; // unmapped song — always show
      if (section === activeSection) {
        item.classList.remove('s3ny-hidden');
      } else {
        item.classList.add('s3ny-hidden');
      }
    });
  }

  /* ─── Save last track for a section (Home/Nour only) ─────────────────── */
  function saveLastTrack(sectionName, trackId, page) {
    const cfg = SECTION_CONFIG[sectionName];
    if (!cfg || cfg.restartOnSwitch) return; // don't save for Afra7
    localStorage.setItem(LS_LAST(sectionName), JSON.stringify({ id: trackId, page }));
  }

  /* ─── Load saved track for a section ────────────────────────────────── */
  function loadLastTrack(sectionName) {
    const raw = localStorage.getItem(LS_LAST(sectionName));
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  /* ─── Detect current page from DOM ───────────────────────────────────── */
  function detectCurrentPage() {
    const activeDot = document.querySelector('.page-dot.active');
    if (activeDot && activeDot.dataset.page) return parseInt(activeDot.dataset.page, 10);
    const currentPageSpan = document.querySelector('.current-page');
    if (currentPageSpan) return parseInt(currentPageSpan.textContent, 10) || 1;
    return 1;
  }

  /* ─── Navigate to a specific page using existing pagination ──────────── */
  function navigateToPage(targetPage, callback) {
    const currentPageNum = detectCurrentPage();
    if (currentPageNum === targetPage) {
      callback && callback();
      return;
    }

    // Try clicking the exact page dot
    const dot = document.querySelector(`.page-dot[data-page="${targetPage}"]`);
    if (dot) {
      dot.click();
      setTimeout(() => { applyFilter(); callback && callback(); }, 350);
      return;
    }

    // Step through pages one at a time (for smart pagination where dot may not exist)
    const direction = targetPage > currentPageNum ? 'next' : 'prev';
    const btnId = direction === 'next' ? 'next-page-btn' : 'prev-page-btn';
    const btn = document.getElementById(btnId);
    if (btn && !btn.disabled) {
      btn.click();
      setTimeout(() => navigateToPage(targetPage, callback), 400);
    } else {
      // Can't navigate — just play from current page
      callback && callback();
    }
  }

  /* ─── Compute which page a song index falls on ───────────────────────── */
  function pageForSongIndex(index) {
    return Math.floor(index / SONGS_PER_PAGE) + 1;
  }

  /* ─── Switch to a section ────────────────────────────────────────────── */
  function switchToSection(name) {
    if (name === activeSection) return; // already active
    const cfg = SECTION_CONFIG[name];
    if (!cfg) return;

    _switching = true;

    // ── Save current position for the outgoing section ────────────────
    const prevSection = activeSection;
    const prevCfg = SECTION_CONFIG[prevSection];
    if (prevCfg && !prevCfg.restartOnSwitch) {
      const activeItem = document.querySelector('.playlist-item.active');
      if (activeItem && activeItem.dataset.trackId) {
        const pg = detectCurrentPage();
        saveLastTrack(prevSection, activeItem.dataset.trackId, pg);
      }
    }

    // ── Update active section ─────────────────────────────────────────
    activeSection = name;
    localStorage.setItem(LS_ACTIVE, name);

    // ── Update switch button visuals ──────────────────────────────────
    if (switchEl) {
      switchEl.querySelectorAll('.s3ny-seg').forEach(btn => {
        const isActive = btn.dataset.section === name;
        const btnCfg = SECTION_CONFIG[btn.dataset.section];
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        btn.style.background = isActive ? btnCfg.color : '';
        btn.style.color = isActive ? btnCfg.activeTextColor : '';
      });
    }

    // ── Update badge ──────────────────────────────────────────────────
    const badge = document.getElementById('s3ny-badge');
    if (badge) updateBadge(badge, name);

    // ── Determine target song ─────────────────────────────────────────
    let targetSongId   = null;
    let targetPage     = 1;

    if (cfg.restartOnSwitch) {
      // Afra7: always restart from first song of section
      const firstSong = allSongs[cfg.start];
      if (firstSong) {
        targetSongId = firstSong.public_id || firstSong.id;
        targetPage   = pageForSongIndex(cfg.start);
      }
    } else {
      // Home / Nour: restore last position
      const saved = loadLastTrack(name);
      if (saved && saved.id && sectionMap[saved.id] === name) {
        targetSongId = saved.id;
        targetPage   = saved.page || pageForSongIndex(
          allSongs.findIndex(s => (s.public_id || s.id) === saved.id)
        );
      } else {
        // First visit or no save — start at section's first song
        const firstSong = allSongs[cfg.start];
        if (firstSong) {
          targetSongId = firstSong.public_id || firstSong.id;
          targetPage   = pageForSongIndex(cfg.start);
        }
      }
    }

    // ── Navigate to correct page, apply filter, then play ────────────
    const playlist = document.getElementById('playlist-container');
    if (playlist) playlist.classList.add('s3ny-switching');

    navigateToPage(targetPage, () => {
      applyFilter();
      if (playlist) {
        setTimeout(() => playlist.classList.remove('s3ny-switching'), 400);
      }
      if (targetSongId && typeof window.playSong === 'function') {
        window.playSong(targetSongId);
      }
      _switching = false;
    });
  }

  /* ─── Restore section state on page load ─────────────────────────────── */
  function restoreCurrentSection() {
    if (!activeSection || activeSection === 'Home') {
      // Home is default — just apply filter
      applyFilter();
      return;
    }
    // For Afra7/Nour — apply filter. But don't auto-play on load
    // (player.js already resumed the last audio on init)
    applyFilter();
  }

  /* ─── MutationObserver: re-apply filter whenever playlist re-renders ── */
  function startObservers() {
    const container = document.getElementById('playlist-container');
    if (!container) { setTimeout(startObservers, 300); return; }

    // Filter re-application observer
    filterObserver = new MutationObserver(() => {
      if (!_switching) applyFilter();
    });
    filterObserver.observe(container, { childList: true, subtree: false });

    // Active-track saver observer — watches class attribute changes on items
    activeObserver = new MutationObserver((mutations) => {
      if (_switching) return;
      for (const m of mutations) {
        if (
          m.type === 'attributes' &&
          m.attributeName === 'class' &&
          m.target.classList.contains('playlist-item') &&
          m.target.classList.contains('active')
        ) {
          const trackId = m.target.dataset.trackId;
          const pg = detectCurrentPage();
          if (trackId && activeSection) {
            saveLastTrack(activeSection, trackId, pg);
          }
        }
      }
    });
    activeObserver.observe(container, {
      attributes: true,
      subtree: true,
      attributeFilter: ['class']
    });
  }

  /* ─── Bootstrap: wait until player.js has loaded songs ─────────────── */
  function waitForPlayer() {
    // player.js sets window.__SAMMA3NY_PLAYER_INIT__ and renders the playlist
    const ready = () =>
      window.__SAMMA3NY_PLAYER_INIT__ &&
      document.querySelector('.playlist-item') !== null;

    if (ready()) {
      init();
    } else {
      const poll = setInterval(() => {
        if (ready()) { clearInterval(poll); init(); }
      }, 200);
      // Fallback: init anyway after max wait
      setTimeout(() => { clearInterval(poll); init(); }, 8000);
    }
  }

  // Entry point
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(waitForPlayer, INIT_DELAY));
  } else {
    setTimeout(waitForPlayer, INIT_DELAY);
  }

})();
