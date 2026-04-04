/**
 * DRD Todo Side Panel
 * Self-contained — injects its own HTML + CSS
 * Persisted in localStorage key: drd_todo_tasks
 * Alarms via Web Audio API + Notification API
 */
(function() {
  'use strict';

  /* ─── Storage ─────────────────────────────────────── */
  const STORE_KEY   = 'drd_todo_tasks';
  const ALARM_KEY   = 'drd_todo_alarmed'; // Set of IDs already alarmed today

  function loadTasks()  { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch{ return []; } }
  function saveTasks(t) { localStorage.setItem(STORE_KEY, JSON.stringify(t)); }
  function loadAlarmed(){ try { return new Set(JSON.parse(localStorage.getItem(ALARM_KEY)||'[]')); } catch{ return new Set(); } }
  function saveAlarmed(s){ localStorage.setItem(ALARM_KEY, JSON.stringify([...s])); }

  /* ─── Helpers ─────────────────────────────────────── */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
  function esc(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

  function formatDue(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due   = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff  = Math.round((due-today)/864e5);
    const tStr  = d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true});
    if (diff === 0) return `Today ${tStr}`;
    if (diff === 1) return `Tomorrow ${tStr}`;
    if (diff === -1) return `Yesterday ${tStr}`;
    if (diff < 0)   return `${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})} ${tStr} (overdue)`;
    return `${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})} ${tStr}`;
  }

  function isOverdue(iso) {
    if (!iso) return false;
    return new Date(iso) < new Date();
  }

  const TYPE_META = {
    note:     { icon:'📝', label:'Note',     color:'#6699ff' },
    task:     { icon:'✅', label:'Task',     color:'#44cc88' },
    schedule: { icon:'📅', label:'Schedule', color:'#ff9944' },
    reminder: { icon:'⏰', label:'Reminder', color:'#dd77ff' },
  };
  const CATEGORY_COLORS = {
    work:     '#5599ff',
    personal: '#ff7755',
    prayer:   '#aacc55',
    health:   '#ff5599',
    other:    '#8888aa',
  };

  /* ─── Inject CSS ───────────────────────────────────── */
  const css = document.createElement('style');
  css.textContent = `
    /* Panel tab */
    #todo-panel-tab {
      position: fixed;
      right: 0; top: 50%;
      transform: translateY(-50%);
      background: linear-gradient(135deg,#1a1f3a,#0f1525);
      border: 1px solid rgba(255,255,255,0.1);
      border-right: none;
      border-radius: 10px 0 0 10px;
      padding: 14px 8px;
      cursor: pointer;
      z-index: 1500000;
      display: flex; flex-direction: column; align-items: center; gap: 5px;
      box-shadow: -4px 0 20px rgba(0,0,0,0.5);
      transition: transform 0.2s, background 0.2s;
      user-select: none;
    }
    #todo-panel-tab:hover { background: linear-gradient(135deg,#222845,#151c35); }
    #todo-panel-tab.panel-open { transform: translateY(-50%) translateX(-360px); }
    #todo-tab-icon { font-size: 1.3em; }
    #todo-tab-badge {
      background: #ff5566;
      color: #fff;
      font-size: 0.6em;
      font-weight: 700;
      border-radius: 20px;
      padding: 1px 5px;
      min-width: 16px;
      text-align: center;
      display: none;
    }
    #todo-tab-label {
      font-size: 0.55em;
      color: #99aacc;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    /* Main panel */
    #todo-side-panel {
      position: fixed;
      right: -360px; top: 0; bottom: 0;
      width: 360px;
      background: linear-gradient(180deg,#0d1222 0%,#0f1525 100%);
      border-left: 1px solid rgba(255,255,255,0.08);
      z-index: 1499999;
      display: flex; flex-direction: column;
      transition: right 0.35s cubic-bezier(0.4,0,0.2,1);
      box-shadow: -8px 0 40px rgba(0,0,0,0.6);
      font-family: 'Segoe UI', system-ui, sans-serif;
      overflow: hidden;
    }
    #todo-side-panel.open { right: 0; }

    /* Header */
    #todo-panel-header {
      padding: 16px 16px 10px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      flex-shrink: 0;
    }
    .tp-title-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 10px;
    }
    .tp-title { font-size: 1.05em; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 7px; }
    #todo-panel-close {
      background: rgba(255,255,255,0.07);
      border: none; color: #aaa;
      width: 28px; height: 28px;
      border-radius: 50%; cursor: pointer;
      font-size: 13px;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    #todo-panel-close:hover { background: rgba(255,80,80,0.3); color: #fff; }
    #todo-add-btn {
      width: 100%;
      padding: 8px;
      background: linear-gradient(90deg,#1e3a6e,#162d57);
      border: 1px solid rgba(80,140,255,0.25);
      border-radius: 8px;
      color: #6ea8ff;
      font-size: 0.85em;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex; align-items: center; justify-content: center; gap: 6px;
    }
    #todo-add-btn:hover { background: linear-gradient(90deg,#243f78,#1a3460); color: #88bbff; }

    /* Filter tabs */
    .tp-filter-tabs {
      display: flex; gap: 4px; padding: 10px 16px 0;
      flex-shrink: 0;
    }
    .tp-filter-tab {
      flex: 1;
      padding: 5px 4px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px;
      color: #777;
      font-size: 0.72em;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .tp-filter-tab.active {
      background: rgba(100,140,255,0.15);
      border-color: rgba(100,140,255,0.3);
      color: #88aaff;
    }
    .tp-filter-tab:hover:not(.active) { color: #aaa; background: rgba(255,255,255,0.04); }

    /* Task list */
    #todo-task-list {
      flex: 1;
      overflow-y: auto;
      padding: 10px 12px;
      display: flex; flex-direction: column; gap: 7px;
    }
    #todo-task-list::-webkit-scrollbar { width: 4px; }
    #todo-task-list::-webkit-scrollbar-track { background: transparent; }
    #todo-task-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
    .tp-empty {
      text-align: center; padding: 40px 20px;
      color: #444; font-size: 0.85em; line-height: 1.7;
    }
    .tp-empty-icon { font-size: 2.5em; margin-bottom: 8px; }

    /* Task card */
    .tp-task-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }
    .tp-task-card:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.12); }
    .tp-task-card.done { opacity: 0.45; }
    .tp-task-card.overdue { border-left: 3px solid #ff4466; }
    .tp-task-accent {
      position: absolute; left: 0; top: 0; bottom: 0;
      width: 3px; border-radius: 3px 0 0 3px;
    }
    .tp-card-top {
      display: flex; align-items: flex-start; gap: 8px;
    }
    .tp-card-check {
      width: 18px; height: 18px; flex-shrink: 0;
      border: 2px solid rgba(255,255,255,0.2);
      border-radius: 50%;
      margin-top: 1px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      background: transparent;
    }
    .tp-task-card.done .tp-card-check {
      background: rgba(80,200,120,0.3);
      border-color: rgba(80,200,120,0.6);
      color: #55ee88;
    }
    .tp-card-body { flex: 1; min-width: 0; }
    .tp-card-title {
      font-size: 0.88em; font-weight: 600; color: #ddd;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .tp-task-card.done .tp-card-title { text-decoration: line-through; color: #666; }
    .tp-card-meta {
      display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap;
    }
    .tp-type-chip {
      font-size: 0.65em; padding: 1px 6px;
      border-radius: 20px; background: rgba(255,255,255,0.08);
      color: #aaa;
    }
    .tp-due {
      font-size: 0.68em; color: #99aacc;
      display: flex; align-items: center; gap: 3px;
    }
    .tp-due.overdue { color: #ff7788; }
    .tp-card-desc {
      font-size: 0.75em; color: #666; margin-top: 3px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .tp-card-actions {
      display: flex; gap: 4px; margin-top: 7px; justify-content: flex-end;
    }
    .tp-act-btn {
      background: rgba(255,255,255,0.06);
      border: none; border-radius: 5px;
      padding: 3px 8px; font-size: 0.7em;
      color: #888; cursor: pointer; transition: all 0.15s;
    }
    .tp-act-btn:hover { background: rgba(255,255,255,0.12); color: #ccc; }
    .tp-act-btn.danger:hover { background: rgba(255,60,60,0.2); color: #ff8888; }

    /* Add/Edit modal */
    #todo-modal-overlay {
      display: none;
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.7);
      z-index: 2000001;
      align-items: center; justify-content: center;
      backdrop-filter: blur(3px);
    }
    #todo-modal-overlay.open { display: flex; }
    #todo-modal-card {
      background: linear-gradient(145deg,#111827,#0d1422);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 22px;
      width: min(380px,94vw);
      box-shadow: 0 20px 60px rgba(0,0,0,0.8);
      color: #fff;
      font-family: 'Segoe UI', system-ui, sans-serif;
      animation: tmSlide 0.25s cubic-bezier(0.34,1.4,0.64,1);
    }
    @keyframes tmSlide { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
    .tm-title {
      font-size: 1em; font-weight: 700; margin-bottom: 16px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .tm-close-btn {
      background: rgba(255,255,255,0.07); border: none; color: #aaa;
      width: 28px; height: 28px; border-radius: 50%;
      cursor: pointer; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
    }
    .tm-close-btn:hover { background: rgba(255,80,80,0.3); color: #fff; }
    .tm-field { margin-bottom: 14px; }
    .tm-label {
      display: block; font-size: 0.72em; color: #88aacc;
      text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 5px;
    }
    .tm-input, .tm-select, .tm-textarea {
      width: 100%; box-sizing: border-box;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 9px 12px;
      color: #fff;
      font-size: 0.88em;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }
    .tm-input:focus, .tm-select:focus, .tm-textarea:focus {
      border-color: rgba(100,150,255,0.4);
      background: rgba(255,255,255,0.08);
    }
    .tm-textarea { resize: vertical; min-height: 70px; }
    .tm-select option { background: #1a2035; }
    .tm-type-grid {
      display: grid; grid-template-columns: repeat(4,1fr); gap: 6px;
    }
    .tm-type-btn {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      padding: 8px 4px;
      cursor: pointer;
      text-align: center;
      color: #888; font-size: 0.75em;
      transition: all 0.2s;
    }
    .tm-type-btn .t-icon { font-size: 1.4em; display: block; margin-bottom: 3px; }
    .tm-type-btn.selected {
      border-color: rgba(100,150,255,0.4);
      background: rgba(80,120,255,0.15);
      color: #aaccff;
    }
    .tm-row { display: flex; gap: 10px; }
    .tm-row .tm-field { flex: 1; }
    .tm-alarm-row {
      display: flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 8px;
      padding: 9px 12px;
    }
    .tm-alarm-toggle {
      width: 36px; height: 20px;
      background: #333; border-radius: 20px;
      position: relative; cursor: pointer;
      transition: background 0.2s; flex-shrink: 0;
    }
    .tm-alarm-toggle.on { background: #4477ff; }
    .tm-alarm-toggle::after {
      content:''; position: absolute;
      top: 2px; left: 2px;
      width: 16px; height: 16px;
      background: #fff; border-radius: 50%;
      transition: transform 0.2s;
    }
    .tm-alarm-toggle.on::after { transform: translateX(16px); }
    .tm-alarm-label { font-size: 0.82em; color: #aaa; flex: 1; }
    .tm-footer { display: flex; gap: 8px; margin-top: 18px; }
    .tm-save-btn {
      flex: 1; padding: 10px;
      background: linear-gradient(90deg,#2244aa,#1a357a);
      border: 1px solid rgba(80,140,255,0.3);
      border-radius: 8px;
      color: #88aaff; font-size: 0.88em; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }
    .tm-save-btn:hover { background: linear-gradient(90deg,#2a50c0,#1e3d8a); color: #aaccff; }
    .tm-cancel-btn {
      padding: 10px 16px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: #888; font-size: 0.88em;
      cursor: pointer; transition: all 0.2s;
    }
    .tm-cancel-btn:hover { background: rgba(255,255,255,0.1); color: #ccc; }

    /* Alarm toast */
    .tp-alarm-toast {
      position: fixed;
      top: 20px; left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg,#1a2a4a,#101826);
      border: 1px solid rgba(100,180,255,0.3);
      border-radius: 14px;
      padding: 14px 20px;
      color: #fff;
      z-index: 3000000;
      display: flex; align-items: center; gap: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.6);
      animation: toastIn 0.4s cubic-bezier(0.34,1.4,0.64,1);
      max-width: min(380px,92vw);
    }
    @keyframes toastIn { from{transform:translateX(-50%) translateY(-20px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }
    .tp-alarm-toast .t-icon { font-size: 1.8em; }
    .tp-alarm-toast .t-body  { flex:1; }
    .tp-alarm-toast .t-title { font-weight: 700; font-size: 0.95em; margin-bottom: 2px; }
    .tp-alarm-toast .t-sub   { font-size: 0.75em; color: #88aacc; }
    .tp-alarm-toast .t-close {
      background: rgba(255,255,255,0.08); border: none; color: #aaa;
      width: 26px; height: 26px; border-radius: 50%;
      cursor: pointer; font-size: 13px;
      display: flex; align-items: center; justify-content: center;
    }
    .tp-alarm-toast .t-close:hover { background: rgba(255,80,80,0.3); color: #fff; }
  `;
  document.head.appendChild(css);

  /* ─── Inject HTML ──────────────────────────────────── */
  const panelHTML = `
    <div id="todo-panel-tab" title="Open Todo Panel">
      <span id="todo-tab-icon">📋</span>
      <span id="todo-tab-badge"></span>
      <span id="todo-tab-label">Tasks</span>
    </div>

    <aside id="todo-side-panel" aria-label="Todo Panel">
      <div id="todo-panel-header">
        <div class="tp-title-row">
          <span class="tp-title">📋 My Tasks</span>
          <button id="todo-panel-close" aria-label="Close">✕</button>
        </div>
        <button id="todo-add-btn">＋ Add Task / Note</button>
      </div>
      <div class="tp-filter-tabs">
        <button class="tp-filter-tab active" data-filter="all">All</button>
        <button class="tp-filter-tab" data-filter="today">Today</button>
        <button class="tp-filter-tab" data-filter="upcoming">Upcoming</button>
        <button class="tp-filter-tab" data-filter="done">Done</button>
      </div>
      <div id="todo-task-list"></div>
    </aside>

    <div id="todo-modal-overlay" role="dialog" aria-modal="true">
      <div id="todo-modal-card">
        <div class="tm-title">
          <span id="tm-modal-title">New Task</span>
          <button class="tm-close-btn" id="tm-modal-close">✕</button>
        </div>
        <div class="tm-field">
          <label class="tm-label">Type</label>
          <div class="tm-type-grid" id="tm-type-grid">
            <button class="tm-type-btn selected" data-type="task"><span class="t-icon">✅</span>Task</button>
            <button class="tm-type-btn" data-type="note"><span class="t-icon">📝</span>Note</button>
            <button class="tm-type-btn" data-type="schedule"><span class="t-icon">📅</span>Schedule</button>
            <button class="tm-type-btn" data-type="reminder"><span class="t-icon">⏰</span>Reminder</button>
          </div>
        </div>
        <div class="tm-field">
          <label class="tm-label">Title *</label>
          <input id="tm-title-input" class="tm-input" type="text" placeholder="What needs to be done?" maxlength="100">
        </div>
        <div class="tm-field">
          <label class="tm-label">Notes / Description</label>
          <textarea id="tm-desc-input" class="tm-textarea" placeholder="Optional details..."></textarea>
        </div>
        <div class="tm-row">
          <div class="tm-field">
            <label class="tm-label">Date & Time</label>
            <input id="tm-due-input" class="tm-input" type="datetime-local">
          </div>
          <div class="tm-field">
            <label class="tm-label">Category</label>
            <select id="tm-cat-select" class="tm-select">
              <option value="other">Other</option>
              <option value="work">💼 Work</option>
              <option value="personal">🏠 Personal</option>
              <option value="prayer">🕌 Prayer</option>
              <option value="health">❤️ Health</option>
            </select>
          </div>
        </div>
        <div class="tm-field">
          <div class="tm-alarm-row">
            <div class="tm-alarm-toggle" id="tm-alarm-toggle"></div>
            <span class="tm-alarm-label">⏰ Enable alarm notification</span>
          </div>
        </div>
        <div class="tm-footer">
          <button class="tm-cancel-btn" id="tm-cancel-btn">Cancel</button>
          <button class="tm-save-btn" id="tm-save-btn">Save Task</button>
        </div>
      </div>
    </div>
  `;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = panelHTML;
  document.body.appendChild(wrapper);

  /* ─── State ────────────────────────────────────────── */
  let tasks       = loadTasks();
  let alarmed     = loadAlarmed();
  let activeFilter = 'all';
  let editingId    = null;
  let alarmOn      = false;
  let selectedType = 'task';

  /* ─── Elements ─────────────────────────────────────── */
  const tab         = document.getElementById('todo-panel-tab');
  const panel       = document.getElementById('todo-side-panel');
  const badge       = document.getElementById('todo-tab-badge');
  const listEl      = document.getElementById('todo-task-list');
  const modalOv     = document.getElementById('todo-modal-overlay');
  const alarmToggle = document.getElementById('tm-alarm-toggle');

  /* ─── Panel open/close ─────────────────────────────── */
  function openPanel() {
    panel.classList.add('open');
    tab.classList.add('panel-open');
    renderList();
  }
  function closePanel() {
    panel.classList.remove('open');
    tab.classList.remove('panel-open');
  }

  tab.addEventListener('click', () => panel.classList.contains('open') ? closePanel() : openPanel());
  document.getElementById('todo-panel-close').addEventListener('click', closePanel);

  /* ─── Filter tabs ──────────────────────────────────── */
  document.querySelectorAll('.tp-filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tp-filter-tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderList();
    });
  });

  /* ─── Render ───────────────────────────────────────── */
  function getFilteredTasks() {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tom   = new Date(today); tom.setDate(tom.getDate()+1);
    return tasks.filter(t => {
      if (activeFilter === 'done')     return t.done;
      if (activeFilter === 'all')      return !t.done;
      if (activeFilter === 'today') {
        if (t.done) return false;
        if (!t.due) return false;
        const d = new Date(t.due);
        return d >= today && d < tom;
      }
      if (activeFilter === 'upcoming') {
        if (t.done) return false;
        if (!t.due) return true;
        const d = new Date(t.due);
        return d >= tom;
      }
      return true;
    }).sort((a,b)=>{
      if (a.due && b.due) return new Date(a.due)-new Date(b.due);
      if (a.due) return -1;
      if (b.due) return 1;
      return new Date(b.created)-new Date(a.created);
    });
  }

  function updateBadge() {
    const pending = tasks.filter(t=>!t.done).length;
    badge.style.display = pending > 0 ? 'block' : 'none';
    badge.textContent   = pending > 99 ? '99+' : pending;
  }

  function renderList() {
    updateBadge();
    const filtered = getFilteredTasks();
    if (!filtered.length) {
      const msgs = {
        all:'No tasks yet!\nTap ＋ to add one.',
        today:'Nothing due today 🎉',
        upcoming:'No upcoming tasks.',
        done:'No completed tasks yet.'
      };
      listEl.innerHTML = `<div class="tp-empty"><div class="tp-empty-icon">📭</div>${(msgs[activeFilter]||'').replace('\n','<br>')}</div>`;
      return;
    }
    listEl.innerHTML = filtered.map(t => renderTaskCard(t)).join('');
    // Bind events
    listEl.querySelectorAll('.tp-card-check').forEach(el => {
      el.addEventListener('click', (e) => { e.stopPropagation(); toggleDone(el.dataset.id); });
    });
    listEl.querySelectorAll('.tp-act-btn[data-action="edit"]').forEach(el => {
      el.addEventListener('click', (e) => { e.stopPropagation(); openEditModal(el.dataset.id); });
    });
    listEl.querySelectorAll('.tp-act-btn[data-action="delete"]').forEach(el => {
      el.addEventListener('click', (e) => { e.stopPropagation(); deleteTask(el.dataset.id); });
    });
    listEl.querySelectorAll('.tp-task-card').forEach(el => {
      el.addEventListener('click', () => openEditModal(el.dataset.id));
    });
  }

  function renderTaskCard(t) {
    const meta    = TYPE_META[t.type] || TYPE_META.task;
    const catClr  = CATEGORY_COLORS[t.cat] || '#8888aa';
    const ov      = isOverdue(t.due) && !t.done;
    const dueStr  = formatDue(t.due);
    const doneChk = t.done ? '✓' : '';
    return `
      <div class="tp-task-card ${t.done?'done':''} ${ov?'overdue':''}" data-id="${t.id}">
        <div class="tp-task-accent" style="background:${catClr}"></div>
        <div class="tp-card-top">
          <div class="tp-card-check" data-id="${t.id}">${doneChk}</div>
          <div class="tp-card-body">
            <div class="tp-card-title">${esc(t.title)}</div>
            <div class="tp-card-meta">
              <span class="tp-type-chip">${meta.icon} ${meta.label}</span>
              ${dueStr ? `<span class="tp-due ${ov?'overdue':''}">🕐 ${esc(dueStr)}</span>` : ''}
              ${t.alarm && !t.done ? '<span style="font-size:0.65em;color:#ffaa44">⏰</span>' : ''}
            </div>
            ${t.desc ? `<div class="tp-card-desc">${esc(t.desc)}</div>` : ''}
          </div>
        </div>
        <div class="tp-card-actions">
          <button class="tp-act-btn" data-action="edit" data-id="${t.id}">Edit</button>
          <button class="tp-act-btn danger" data-action="delete" data-id="${t.id}">Delete</button>
        </div>
      </div>`;
  }

  /* ─── Task CRUD ────────────────────────────────────── */
  function toggleDone(id) {
    const t = tasks.find(x=>x.id===id);
    if (!t) return;
    t.done = !t.done;
    if (t.done) alarmed.add(id);
    saveTasks(tasks); saveAlarmed(alarmed);
    renderList();
  }

  function deleteTask(id) {
    tasks = tasks.filter(x=>x.id!==id);
    alarmed.delete(id);
    saveTasks(tasks); saveAlarmed(alarmed);
    renderList();
  }

  /* ─── Modal ────────────────────────────────────────── */
  document.getElementById('todo-add-btn').addEventListener('click', () => openAddModal());
  document.getElementById('tm-modal-close').addEventListener('click', closeModal);
  document.getElementById('tm-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('tm-save-btn').addEventListener('click', saveModal);
  modalOv.addEventListener('click', (e) => { if(e.target===modalOv) closeModal(); });

  alarmToggle.addEventListener('click', () => {
    alarmOn = !alarmOn;
    alarmToggle.classList.toggle('on', alarmOn);
  });

  document.getElementById('tm-type-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('.tm-type-btn');
    if (!btn) return;
    document.querySelectorAll('.tm-type-btn').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedType = btn.dataset.type;
  });

  function openAddModal() {
    editingId    = null;
    selectedType = 'task';
    alarmOn      = false;
    document.getElementById('tm-modal-title').textContent = 'New Task';
    document.getElementById('tm-title-input').value = '';
    document.getElementById('tm-desc-input').value  = '';
    document.getElementById('tm-due-input').value   = '';
    document.getElementById('tm-cat-select').value  = 'other';
    document.querySelectorAll('.tm-type-btn').forEach(b=>b.classList.remove('selected'));
    document.querySelector('.tm-type-btn[data-type="task"]').classList.add('selected');
    alarmToggle.classList.remove('on');
    document.getElementById('tm-save-btn').textContent = 'Save Task';
    modalOv.style.display='flex'; modalOv.classList.add('open');
    document.getElementById('tm-title-input').focus();
  }

  function openEditModal(id) {
    const t = tasks.find(x=>x.id===id);
    if (!t) return;
    editingId    = id;
    selectedType = t.type;
    alarmOn      = !!t.alarm;
    document.getElementById('tm-modal-title').textContent = 'Edit Task';
    document.getElementById('tm-title-input').value = t.title;
    document.getElementById('tm-desc-input').value  = t.desc || '';
    document.getElementById('tm-cat-select').value  = t.cat  || 'other';
    // Convert ISO to datetime-local format
    if (t.due) {
      const d = new Date(t.due);
      const pad = n=>String(n).padStart(2,'0');
      document.getElementById('tm-due-input').value =
        `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } else {
      document.getElementById('tm-due-input').value = '';
    }
    document.querySelectorAll('.tm-type-btn').forEach(b=>{
      b.classList.toggle('selected', b.dataset.type===t.type);
    });
    alarmToggle.classList.toggle('on', alarmOn);
    document.getElementById('tm-save-btn').textContent = 'Save Changes';
    modalOv.style.display='flex'; modalOv.classList.add('open');
    document.getElementById('tm-title-input').focus();
  }

  function closeModal() {
    modalOv.classList.remove('open');
    modalOv.style.display = 'none';
  }

  function saveModal() {
    const title = document.getElementById('tm-title-input').value.trim();
    if (!title) {
      document.getElementById('tm-title-input').style.borderColor='#ff5566';
      document.getElementById('tm-title-input').focus();
      setTimeout(()=>document.getElementById('tm-title-input').style.borderColor='',1500);
      return;
    }
    const dueVal = document.getElementById('tm-due-input').value;
    const due    = dueVal ? new Date(dueVal).toISOString() : null;
    const desc   = document.getElementById('tm-desc-input').value.trim();
    const cat    = document.getElementById('tm-cat-select').value;

    if (editingId) {
      const t = tasks.find(x=>x.id===editingId);
      if (t) {
        t.title = title; t.desc = desc; t.type = selectedType;
        t.due = due; t.cat = cat; t.alarm = alarmOn;
        alarmed.delete(editingId); // reset alarm so it can re-fire
      }
    } else {
      tasks.unshift({ id:uid(), title, desc, type:selectedType, due, cat, alarm:alarmOn, done:false, created:new Date().toISOString() });
    }
    saveTasks(tasks); saveAlarmed(alarmed);
    closeModal();
    renderList();
    // Request notification permission if alarm is enabled
    if (alarmOn && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  /* ─── Alarm Engine ─────────────────────────────────── */
  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // 4-note rising arpeggio: C5 E5 G5 C6
      [[523.25,0],[659.25,0.28],[783.99,0.56],[1046.5,0.84]].forEach(([freq,delay])=>{
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime+delay);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime+delay+0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+delay+0.85);
        osc.start(ctx.currentTime+delay);
        osc.stop(ctx.currentTime+delay+0.9);
      });
    } catch(_){}
  }

  function showAlarmToast(task) {
    const meta = TYPE_META[task.type] || TYPE_META.reminder;
    const toast = document.createElement('div');
    toast.className = 'tp-alarm-toast';
    toast.innerHTML = `
      <div class="t-icon">${meta.icon}</div>
      <div class="t-body">
        <div class="t-title">${esc(task.title)}</div>
        <div class="t-sub">${task.desc ? esc(task.desc.slice(0,60)) : 'Tap to open Todo Panel'}</div>
      </div>
      <button class="t-close" aria-label="Dismiss">✕</button>
    `;
    document.body.appendChild(toast);
    toast.querySelector('.t-close').addEventListener('click', () => toast.remove());
    toast.addEventListener('click', (e) => {
      if (e.target.classList.contains('t-close')) return;
      openPanel(); toast.remove();
    });
    setTimeout(() => { toast.style.transition='opacity 0.5s'; toast.style.opacity='0'; setTimeout(()=>toast.remove(),500); }, 8000);
  }

  function checkAlarms() {
    const now = new Date();
    tasks.forEach(t => {
      if (!t.alarm || t.done || !t.due || alarmed.has(t.id)) return;
      const due = new Date(t.due);
      const diff = now - due; // ms since due
      if (diff >= 0 && diff < 60000) { // within 1 minute window
        alarmed.add(t.id);
        saveAlarmed(alarmed);
        playChime();
        showAlarmToast(t);
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          const meta = TYPE_META[t.type] || TYPE_META.reminder;
          new Notification(`${meta.icon} ${t.title}`, {
            body: t.desc || 'Your task is due now!',
            icon: '/favicon.ico',
            tag: `drd-todo-${t.id}`,
          });
        }
      }
    });
  }

  // Reset alarmed set daily (midnight)
  function midnightReset() {
    const msToMidnight = new Date().setHours(24,0,0,0) - Date.now();
    setTimeout(() => {
      alarmed = new Set();
      saveAlarmed(alarmed);
      midnightReset(); // schedule next
    }, msToMidnight);
  }
  midnightReset();

  // Check every 30 seconds
  setInterval(checkAlarms, 30000);
  checkAlarms(); // run once immediately

  /* ─── Init ─────────────────────────────────────────── */
  renderList();
  updateBadge();

})();
