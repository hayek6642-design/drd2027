// Sound Button Logic — v2: touch fix + prayer/tasks tabs on long-press

document.addEventListener('DOMContentLoaded', () => {
  const soundButton = document.getElementById('sound-button');
  const soundPopup  = document.getElementById('sound-popup');
  let longPressTimer;
  let isLongPress = false;
  let timeUpdateInterval;

  if (!soundButton) return;

  /* ── hover popup (date/time) ─────────────────────────────── */
  let enterX = 0, hasShown = false;
  soundButton.addEventListener('mouseenter', (e) => { enterX = e.clientX; hasShown = false; });
  soundButton.addEventListener('mousemove',  (e) => {
    if (!hasShown && e.clientX > enterX + 10) {
      updatePopupContent();
      if (soundPopup) {
        try {
          const cc = document.getElementById('counter-container');
          if (cc) soundPopup.style.width = Math.round(cc.offsetWidth) + 'px';
        } catch(_) {}
        soundPopup.style.display = 'block';
      }
      timeUpdateInterval = setInterval(updatePopupContent, 1000);
      hasShown = true;
    }
  });
  soundButton.addEventListener('mouseleave', () => {
    if (soundPopup) soundPopup.style.display = 'none';
    clearInterval(timeUpdateInterval);
    hasShown = false;
  });

  function getTimeZoneFromCountry(cc) {
    const m = {US:'America/New_York',GB:'Europe/London',DE:'Europe/Berlin',FR:'Europe/Paris',
      AE:'Asia/Dubai',SA:'Asia/Riyadh',EG:'Africa/Cairo',PK:'Asia/Karachi',IN:'Asia/Kolkata',
      BD:'Asia/Dhaka',MY:'Asia/Kuala_Lumpur',ID:'Asia/Jakarta',TR:'Europe/Istanbul',
      IR:'Asia/Tehran',IQ:'Asia/Baghdad',JO:'Asia/Amman',LB:'Asia/Beirut',SY:'Asia/Damascus',
      YE:'Asia/Aden',OM:'Asia/Muscat',KW:'Asia/Kuwait',QA:'Asia/Qatar',BH:'Asia/Bahrain',
      IL:'Asia/Jerusalem',PS:'Asia/Gaza',MA:'Africa/Casablanca',TN:'Africa/Tunis',
      DZ:'Africa/Algiers',LY:'Africa/Tripoli',SD:'Africa/Khartoum',
      SO:'Africa/Mogadishu',ET:'Africa/Addis_Ababa',KE:'Africa/Nairobi',
      NG:'Africa/Lagos',ZA:'Africa/Johannesburg'};
    return m[cc] || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }

  function updatePopupContent() {
    const now = new Date();
    const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
    const tz = getTimeZoneFromCountry(prefs.country || '');
    const timeEl = document.getElementById('current-time');
    const gregEl = document.getElementById('gregorian-date');
    const hijriEl = document.getElementById('hijri-date');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-US',{hour12:true,hour:'2-digit',minute:'2-digit'});
    if (gregEl) gregEl.textContent = now.toLocaleDateString('en-US',{timeZone:tz,year:'numeric',month:'short',day:'numeric'});
    if (hijriEl) hijriEl.textContent = getHijriDate(now);
  }

  function getHijriDate(date) {
    const epoch = new Date(622,7,16);
    const days  = Math.floor((date - epoch)/(864e5));
    const avgY  = 354.3667, avgM = 29.530588;
    const hYear = Math.floor(days/avgY)+1;
    const dInY  = days - Math.floor((hYear-1)*avgY);
    const mLen  = [30,29,30,29,30,29,30,29,30,29,30,29];
    const names = ["Muharram","Safar","Rabi' al-awwal","Rabi' al-thani","Jumada al-awwal",
                   "Jumada al-thani","Rajab","Sha'ban","Ramadan","Shawwal","Dhu al-Qi'dah","Dhu al-Hijjah"];
    let acc=0, hM=11, hD=1;
    for(let i=0;i<12;i++){if(dInY<acc+mLen[i]){hM=i;hD=dInY-acc+1;break;}acc+=mLen[i];}
    return `${hD} ${names[hM]} ${hYear}`;
  }

  /* ── normal click / tap (mute/unmute) ────────────────────── */
  function doToggleMute() {
    if (!window.player || typeof player.isMuted !== 'function') return;
    try { if (window.audioCtx && audioCtx.state==='suspended') audioCtx.resume(); } catch(_) {}
    if (player.isMuted()) { player.unMute?.(); soundButton.innerHTML = getSoundIcon(false); }
    else                  { player.mute?.();   soundButton.innerHTML = getSoundIcon(true);  }
  }

  // Desktop click
  soundButton.addEventListener('click', (e) => {
    if (isLongPress) { isLongPress = false; return; }
    doToggleMute();
  });

  function getSoundIcon(muted) {
    return muted
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M6.717 3.55A.5.5 0 0 1 7.025 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.525a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5h2.3l2.388-1.89a.5.5 0 0 1 .504-.06zm7.137 1.536a.5.5 0 0 1 0 .707L12.207 7.54l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.248l-1.646 1.646a.5.5 0 0 1-.708-.708l1.647-1.646-1.647-1.647a.5.5 0 0 1 .708-.708L11.5 6.833l1.647-1.647a.5.5 0 0 1 .707 0z"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11.536 14.01A8.47 8.47 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.48 7.48 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/><path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.48 5.48 0 0 1 11.025 8a5.48 5.48 0 0 1-1.611 3.889l.707.707z"/><path d="M8.707 11.182A4.49 4.49 0 0 0 10.025 8a4.49 4.49 0 0 0-1.318-3.182L8 5.525A3.49 3.49 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7.025 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.525a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5h2.3l2.388-1.89a.5.5 0 0 1 .504-.06z"/></svg>`;
  }

  /* ── long press → prayer times + tasks popup ──────────────── */
  function startLongPressTimer() {
    isLongPress = false;
    longPressTimer = setTimeout(() => {
      isLongPress = true;
      openPrayerTimesPopup();
    }, 900);
  }
  function cancelLongPressTimer() {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  soundButton.addEventListener('mousedown',  startLongPressTimer);
  soundButton.addEventListener('mouseup',    cancelLongPressTimer);
  soundButton.addEventListener('mouseleave', cancelLongPressTimer);

  // ✅ FIX: touchend now handles mute/unmute for short taps on mobile
  soundButton.addEventListener('touchstart', (e) => { e.preventDefault(); startLongPressTimer(); }, {passive:false});
  soundButton.addEventListener('touchend',   (e) => {
    e.preventDefault();
    const wasLong = isLongPress;
    cancelLongPressTimer();
    if (!wasLong) {
      // Short tap → toggle mute/unmute
      doToggleMute();
    }
  });
  soundButton.addEventListener('touchcancel', cancelLongPressTimer);

  /* ── Prayer + Tasks Popup (tabbed) ─────────────────────────── */
  injectPrayerPopupDOM();

  function injectPrayerPopupDOM() {
    if (document.getElementById('prayer-popup-overlay')) return;

    const style = document.createElement('style');
    style.textContent = `
      #prayer-popup-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        z-index: 2000000;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        animation: ppFadeIn 0.2s ease;
      }
      #prayer-popup-overlay.open { display: flex; }
      @keyframes ppFadeIn { from{opacity:0} to{opacity:1} }
      #prayer-popup-card {
        background: linear-gradient(145deg, rgba(15,20,35,0.97), rgba(25,35,60,0.97));
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 20px;
        padding: 0 0 18px;
        width: min(400px, 92vw);
        max-height: 88vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 24px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08);
        font-family: 'Segoe UI', system-ui, sans-serif;
        color: #fff;
        position: relative;
        animation: ppSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);
      }
      @keyframes ppSlideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
      #prayer-popup-close {
        position: absolute;
        top: 14px; right: 16px;
        background: rgba(255,255,255,0.08);
        border: none; color: #aaa;
        width: 28px; height: 28px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 14px;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
        z-index: 2;
      }
      #prayer-popup-close:hover { background: rgba(255,100,100,0.3); color: #fff; }

      /* ── Tabs ── */
      #pp-tab-bar {
        display: flex;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        padding: 14px 20px 0;
        gap: 4px;
        flex-shrink: 0;
      }
      .pp-tab-btn {
        background: none;
        border: none;
        color: #778;
        font-size: 0.82em;
        font-weight: 600;
        padding: 8px 16px;
        border-radius: 10px 10px 0 0;
        cursor: pointer;
        transition: all 0.2s;
        letter-spacing: 0.3px;
      }
      .pp-tab-btn:hover { color: #aaccff; background: rgba(255,255,255,0.05); }
      .pp-tab-btn.pp-tab-active {
        color: #fff;
        background: rgba(100,150,255,0.15);
        border-bottom: 2px solid #6699ff;
      }

      /* ── Prayer panel ── */
      #pp-prayer-panel {
        padding: 16px 24px 0;
        overflow-y: auto;
        flex: 1;
      }
      .pp-location {
        font-size: 0.75em;
        color: #88aaff;
        margin-bottom: 4px;
        display: flex; align-items: center; gap: 5px;
      }
      .pp-hijri { font-size: 0.72em; color: #aaa; margin-bottom: 14px; }
      .pp-next-prayer {
        background: linear-gradient(90deg, rgba(255,200,50,0.15), rgba(255,150,50,0.1));
        border: 1px solid rgba(255,200,50,0.25);
        border-radius: 10px;
        padding: 10px 14px;
        margin-bottom: 14px;
        display: flex; align-items: center; justify-content: space-between;
      }
      .pp-next-label { font-size: 0.7em; color: #ffcc44; text-transform: uppercase; letter-spacing: 0.8px; }
      .pp-next-name  { font-size: 1.1em; font-weight: 700; color: #fff; }
      .pp-next-countdown { font-size: 0.85em; color: #ffcc44; font-weight: 600; }
      .pp-prayer-list { display: flex; flex-direction: column; gap: 6px; }
      .pp-prayer-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 14px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.03);
        transition: background 0.2s;
      }
      .pp-prayer-row.pp-current {
        background: linear-gradient(90deg, rgba(100,200,100,0.12), rgba(50,180,80,0.08));
        border-color: rgba(100,220,100,0.25);
      }
      .pp-prayer-row.pp-passed { opacity: 0.45; }
      .pp-prayer-icon { font-size: 1.2em; margin-right: 10px; }
      .pp-prayer-name { font-size: 0.9em; font-weight: 600; flex: 1; }
      .pp-prayer-time { font-size: 0.9em; color: #ccc; font-variant-numeric: tabular-nums; }
      .pp-prayer-badge {
        font-size: 0.65em; padding: 2px 7px;
        border-radius: 20px; margin-left: 8px;
        background: rgba(100,220,100,0.2); color: #7dffb3;
        border: 1px solid rgba(100,220,100,0.3);
      }
      .pp-footer { margin-top: 14px; text-align: center; font-size: 0.68em; color: #555; padding-bottom: 4px; }
      .pp-loading { text-align: center; padding: 30px 0; color: #888; font-size: 0.9em; }
      .pp-error   { text-align: center; padding: 20px; color: #ff8888; font-size: 0.85em; }
      .pp-date-row { display: flex; justify-content: space-between; margin-bottom: 14px; }
      .pp-date-chip {
        font-size: 0.72em; color: #bbb;
        background: rgba(255,255,255,0.06);
        padding: 4px 10px; border-radius: 20px;
      }
      .pp-method-note { color: #666; font-size: 0.65em; margin-top: 4px; }

      /* ── Tasks panel ── */
      #pp-tasks-panel {
        padding: 16px 20px 0;
        overflow-y: auto;
        flex: 1;
        display: none;
      }
      #pp-tasks-panel.pp-tab-visible { display: flex; flex-direction: column; }
      .ppt-empty { text-align: center; padding: 30px 0; color: #666; font-size: 0.9em; }
      .ppt-list { display: flex; flex-direction: column; gap: 8px; flex: 1; }
      .ppt-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 12px;
        padding: 11px 14px;
        display: flex; align-items: flex-start; gap: 10px;
        transition: background 0.15s;
      }
      .ppt-card.ppt-done { opacity: 0.4; }
      .ppt-card.ppt-overdue { border-color: rgba(255,80,80,0.3); }
      .ppt-icon { font-size: 1.2em; flex-shrink: 0; margin-top: 1px; }
      .ppt-info { flex: 1; min-width: 0; }
      .ppt-title { font-size: 0.88em; font-weight: 600; color: #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .ppt-title.ppt-done-text { text-decoration: line-through; color: #666; }
      .ppt-meta { font-size: 0.7em; color: #778; margin-top: 3px; }
      .ppt-meta.ppt-overdue-text { color: #ff7777; }
      .ppt-open-btn {
        margin-top: 14px;
        width: 100%;
        background: linear-gradient(135deg,#1a1f3a,#0f1525);
        border: 1px solid rgba(100,150,255,0.3);
        color: #88aaff;
        padding: 10px;
        border-radius: 10px;
        font-size: 0.82em;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
      }
      .ppt-open-btn:hover { background: rgba(100,150,255,0.15); color: #aaccff; }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'prayer-popup-overlay';
    overlay.innerHTML = `
      <div id="prayer-popup-card">
        <button id="prayer-popup-close" aria-label="Close">✕</button>

        <!-- Tab Bar -->
        <div id="pp-tab-bar">
          <button class="pp-tab-btn pp-tab-active" data-tab="prayer">🕌 Prayer Times</button>
          <button class="pp-tab-btn" data-tab="tasks">✅ Tasks</button>
        </div>

        <!-- Prayer Times Tab -->
        <div id="pp-prayer-panel">
          <div class="pp-location" id="pp-location">📍 Detecting location...</div>
          <div class="pp-date-row">
            <span class="pp-date-chip" id="pp-greg-date"></span>
            <span class="pp-date-chip" id="pp-hijri-date"></span>
          </div>
          <div class="pp-next-prayer" id="pp-next-prayer" style="display:none">
            <div>
              <div class="pp-next-label">Next Prayer</div>
              <div class="pp-next-name" id="pp-next-name">—</div>
            </div>
            <div class="pp-next-countdown" id="pp-next-countdown">—</div>
          </div>
          <div id="pp-body" class="pp-loading">
            <div style="font-size:1.8em;margin-bottom:8px">🌙</div>
            Loading prayer times...
          </div>
          <div class="pp-footer">Powered by AlAdhan API · Local prayer times</div>
        </div>

        <!-- Tasks Tab -->
        <div id="pp-tasks-panel">
          <div id="pp-tasks-body"></div>
          <button class="ppt-open-btn" id="ppt-open-full">📋 Open Full Task Panel</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('prayer-popup-close').addEventListener('click', closePrayerPopup);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closePrayerPopup(); });

    // Tab switching
    overlay.querySelectorAll('.pp-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.pp-tab-btn').forEach(b => b.classList.remove('pp-tab-active'));
        btn.classList.add('pp-tab-active');
        const tab = btn.dataset.tab;
        document.getElementById('pp-prayer-panel').style.display  = tab === 'prayer' ? '' : 'none';
        const tasksPanel = document.getElementById('pp-tasks-panel');
        if (tab === 'tasks') {
          tasksPanel.classList.add('pp-tab-visible');
          renderTasksInPopup();
        } else {
          tasksPanel.classList.remove('pp-tab-visible');
        }
      });
    });

    // Open full panel button
    document.getElementById('ppt-open-full').addEventListener('click', () => {
      closePrayerPopup();
      setTimeout(() => {
        if (window.DRDTodoPanel && typeof window.DRDTodoPanel.open === 'function') {
          window.DRDTodoPanel.open();
        }
      }, 200);
    });
  }

  /* ── Render tasks inside popup ──────────────────────────────── */
  function renderTasksInPopup() {
    const container = document.getElementById('pp-tasks-body');
    if (!container) return;

    let tasks = [];
    try { tasks = JSON.parse(localStorage.getItem('drd_todo_tasks') || '[]'); } catch(_) {}

    if (!tasks.length) {
      container.innerHTML = '<div class="ppt-empty">🗒️ No tasks yet.<br><small>Open the full panel to add some.</small></div>';
      return;
    }

    const TYPE_META = {
      note:     { icon:'📝', label:'Note'     },
      task:     { icon:'✅', label:'Task'     },
      schedule: { icon:'📅', label:'Schedule' },
      reminder: { icon:'⏰', label:'Reminder' },
    };

    function isOverdue(iso) { return iso && new Date(iso) < new Date(); }
    function formatDue(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      const now = new Date();
      const diff = Math.round((d - now) / 864e5);
      const tStr = d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true});
      if (diff >= 0 && diff < 1) return 'Today ' + tStr;
      if (diff >= 1 && diff < 2) return 'Tomorrow ' + tStr;
      if (diff < 0) return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' (overdue)';
      return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' ' + tStr;
    }

    // Sort: undone first, then overdue, then by due date
    const sorted = [...tasks].sort((a,b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return new Date(a.due) - new Date(b.due);
    });

    let html = '<div class="ppt-list">';
    sorted.slice(0, 20).forEach(t => {
      const meta = TYPE_META[t.type] || TYPE_META.task;
      const overdue = !t.done && isOverdue(t.due);
      const dueStr  = formatDue(t.due);
      const titleCls = t.done ? 'ppt-done-text' : '';
      const metaCls  = overdue ? 'ppt-overdue-text' : '';
      const cardCls  = t.done ? 'ppt-done' : (overdue ? 'ppt-overdue' : '');
      html += `
        <div class="ppt-card ${cardCls}">
          <span class="ppt-icon">${meta.icon}</span>
          <div class="ppt-info">
            <div class="ppt-title ${titleCls}">${t.title.replace(/</g,'&lt;')}</div>
            ${dueStr ? `<div class="ppt-meta ${metaCls}">${dueStr}</div>` : ''}
          </div>
        </div>`;
    });
    if (tasks.length > 20) {
      html += `<div style="text-align:center;color:#555;font-size:0.72em;padding:6px 0">+${tasks.length-20} more in full panel</div>`;
    }
    html += '</div>';
    container.innerHTML = html;
  }

  function closePrayerPopup() {
    const o = document.getElementById('prayer-popup-overlay');
    if (o) { o.classList.remove('open'); o.style.display = 'none'; }
    clearInterval(window._prayerCountdownTimer);
    // Reset to prayer tab
    const btns = document.querySelectorAll('.pp-tab-btn');
    btns.forEach(b => b.classList.remove('pp-tab-active'));
    const prayerBtn = document.querySelector('.pp-tab-btn[data-tab="prayer"]');
    if (prayerBtn) prayerBtn.classList.add('pp-tab-active');
    const prayerPanel = document.getElementById('pp-prayer-panel');
    const tasksPanel  = document.getElementById('pp-tasks-panel');
    if (prayerPanel) prayerPanel.style.display = '';
    if (tasksPanel)  tasksPanel.classList.remove('pp-tab-visible');
  }

  async function openPrayerTimesPopup() {
    const overlay = document.getElementById('prayer-popup-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.classList.add('open');

    const now = new Date();
    document.getElementById('pp-greg-date').textContent =
      now.toLocaleDateString('en-US', {weekday:'short', year:'numeric', month:'long', day:'numeric'});
    document.getElementById('pp-hijri-date').textContent = getHijriDate(now);

    const cacheKey = 'drd_prayer_cache';
    const cached   = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached && cached.date === now.toDateString()) {
      renderPrayerTimes(cached.timings, cached.city, cached.country);
      return;
    }

    try {
      const geoRes  = await fetch('https://ipapi.co/json/');
      const geo     = await geoRes.json();
      const city    = geo.city    || geo.region || 'London';
      const country = geo.country_name || geo.country || 'GB';
      const cc      = geo.country_code || 'GB';
      const lat     = geo.latitude;
      const lon     = geo.longitude;

      document.getElementById('pp-location').textContent = `📍 ${city}, ${country}`;

      let apiUrl;
      if (lat && lon) {
        apiUrl = `https://api.aladhan.com/v1/timings/${Math.floor(Date.now()/1000)}?latitude=${lat}&longitude=${lon}&method=2`;
      } else {
        apiUrl = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(cc)}&method=2`;
      }

      const pRes   = await fetch(apiUrl);
      const pData  = await pRes.json();
      if (pData.code !== 200) throw new Error(pData.status || 'API error');

      const timings = pData.data.timings;
      localStorage.setItem(cacheKey, JSON.stringify({ date: now.toDateString(), timings, city, country }));
      renderPrayerTimes(timings, city, country);
    } catch(err) {
      document.getElementById('pp-body').innerHTML =
        `<div class="pp-error">⚠️ Could not load prayer times.<br><small>${err.message}</small></div>`;
    }
  }

  const PRAYER_META = {
    Fajr:    { icon:'🌅', label:'Fajr',    ar:'الفجر'  },
    Dhuhr:   { icon:'☀️',  label:'Dhuhr',   ar:'الظهر'  },
    Asr:     { icon:'🌤️', label:'Asr',     ar:'العصر'  },
    Maghrib: { icon:'🌇', label:'Maghrib', ar:'المغرب' },
    Isha:    { icon:'🌙', label:'Isha',    ar:'العشاء' },
  };
  const PRAYER_ORDER = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];

  function prayerMinutes(timeStr) {
    const [h,m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  function renderPrayerTimes(timings, city, country) {
    const now        = new Date();
    const nowMins    = now.getHours()*60 + now.getMinutes();
    const body       = document.getElementById('pp-body');
    const nextEl     = document.getElementById('pp-next-prayer');
    const nextName   = document.getElementById('pp-next-name');
    const nextCount  = document.getElementById('pp-next-countdown');

    let currentIdx = -1, nextIdx = -1;
    for (let i = 0; i < PRAYER_ORDER.length; i++) {
      const mins = prayerMinutes(timings[PRAYER_ORDER[i]]);
      if (nowMins >= mins) currentIdx = i;
    }
    nextIdx = (currentIdx + 1) % PRAYER_ORDER.length;

    nextEl.style.display = 'flex';
    nextName.textContent = PRAYER_ORDER[nextIdx];

    function updateCountdown() {
      const now2   = new Date();
      const nMins2 = now2.getHours()*60 + now2.getMinutes();
      const next   = prayerMinutes(timings[PRAYER_ORDER[nextIdx]]);
      let diff     = next - nMins2;
      if (diff < 0) diff += 24*60;
      const hh = Math.floor(diff/60);
      const mm = diff % 60;
      nextCount.textContent = `in ${hh}h ${mm}m`;
    }
    updateCountdown();
    clearInterval(window._prayerCountdownTimer);
    window._prayerCountdownTimer = setInterval(updateCountdown, 30000);

    let html = '<div class="pp-prayer-list">';
    PRAYER_ORDER.forEach((name, i) => {
      const meta = PRAYER_META[name];
      const time = timings[name];
      const passed  = i < currentIdx;
      const current = i === currentIdx;
      const isNext  = i === nextIdx;
      const cls     = current ? 'pp-current' : (passed ? 'pp-passed' : '');
      const badge   = current ? '<span class="pp-prayer-badge">Now</span>' :
                      isNext  ? '<span class="pp-prayer-badge" style="background:rgba(100,150,255,0.2);color:#aaccff;border-color:rgba(100,150,255,0.3)">Next</span>' : '';
      const [hh,mm] = time.split(':');
      const h = parseInt(hh), ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      const fmt = `${h12}:${mm} ${ampm}`;
      html += `
        <div class="pp-prayer-row ${cls}">
          <span class="pp-prayer-icon">${meta.icon}</span>
          <span class="pp-prayer-name">${meta.label} <span style="color:#666;font-size:0.8em">${meta.ar}</span></span>
          <span class="pp-prayer-time">${fmt}</span>
          ${badge}
        </div>`;
    });
    html += '</div>';
    body.innerHTML = html;
  }

  /* ── legacy popup close handlers ───────────────────────────── */
  const legacyClose = document.getElementById('popup-close');
  if (legacyClose) {
    legacyClose.addEventListener('click', function() {
      const overlay = document.getElementById('popup-overlay');
      const iframe  = document.getElementById('popup-iframe');
      if (!overlay) return;
      overlay.classList.remove('open','no-dim','modal');
      overlay.style.display = 'none';
      if (iframe) iframe.src = '';
      const shield = document.getElementById('global-touch-shield');
      if (shield) shield.style.display = 'block';
      window.shieldDisabled = false;
    });
  }

  const codePopupClose = document.getElementById('code-popup-close');
  if (codePopupClose) {
    codePopupClose.addEventListener('click', function() {
      const overlay  = document.getElementById('code-popup-overlay');
      const content  = document.getElementById('code-popup-content');
      if (!overlay) return;
      overlay.classList.remove('open');
      setTimeout(() => { overlay.style.display='none'; if(content) content.innerHTML=''; }, 200);
    });
  }
});
