// index.js — Browser Local Mode (NO StorageLord, NO UI Adapter)

function __boot(){
  try { console.log('INDEXJS_VERSION:2'); } catch(_){}

  console.warn("🟢 CodeBank index.js running in TRUE Browser Local Mode");

  /* ============================
     Sidebar
   ============================ */

  const panel   = document.getElementById('settings-panel');
  const openBtn = document.getElementById('settings-btn');
  const closeBtn = document.getElementById('settings-close');

  window.__CODEBANK_STICKY__ = true;

  let __sidebarOpen = false;
  function setSidebar(open){
    __sidebarOpen = !!open;

    if (!panel) return;

    if (open) {
      panel.classList.add('active');
      panel.classList.remove('translate-x-full');
      panel.setAttribute('aria-hidden','false');
      document.body.style.overflow = 'hidden';
    } else {
      panel.classList.remove('active');
      panel.classList.add('translate-x-full');
      panel.setAttribute('aria-hidden','true');
      document.body.style.overflow = '';
    }
  }

  function isSidebarOpen(){
    return __sidebarOpen;
  }

  if (openBtn){
    openBtn.addEventListener('click', e=>{
      e.preventDefault();
      e.stopPropagation();
      setSidebar(true);
    });
  }

  if (closeBtn){
    closeBtn.addEventListener('click', e=>{
      e.preventDefault();
      setSidebar(false);
    });
  }

  document.addEventListener('click', e=>{
    if (
      window.__CODEBANK_STICKY__ === false &&
      isSidebarOpen() &&
      panel &&
      !panel.contains(e.target) &&
      (!openBtn || !openBtn.contains(e.target))
    ){
      setSidebar(false);
    }
  });

  document.addEventListener('keydown', e=>{
    if (e.key === 'Escape' && isSidebarOpen()){
      setSidebar(false);
    }
  });

  setSidebar(false);


  /* ============================
     Theme
   ============================ */

  const themeToggle = document.getElementById('theme-toggle');

  function applyTheme(mode){
    document.body.classList.toggle('light-theme', mode === 'light');
    if (themeToggle) themeToggle.checked = (mode === 'dark');
  }

  let theme = 'dark';

  applyTheme(theme);

  if (themeToggle){
    themeToggle.addEventListener('change', ()=>{
      const next = themeToggle.checked ? 'dark' : 'light';
      theme = next;
      applyTheme(next);
    });
  }


  /* ============================
     Safe Door
   ============================ */

  const safeToggle = document.getElementById('safe-door-toggle');
  const ASSET_KEYS = ['asset-codes','asset-silver','asset-gold'];

  ASSET_KEYS.forEach(k=>{
    const el = document.getElementById(k);
    if (el && !el.dataset.realValue){
      el.dataset.realValue = el.textContent.trim();
    }
  });

  let __safeLocked = true;
  function isLocked(){
    return __safeLocked;
  }

  function setSafeDoor(lock){
    __safeLocked = !!lock;

    ASSET_KEYS.forEach(k=>{
      const el = document.getElementById(k);
      if (!el) return;

      if (lock){
        el.textContent = '•••';
        el.classList.add('safe-locked');
      } else {
        el.textContent = el.dataset.realValue || '0';
        el.classList.remove('safe-locked');
      }
    });

    if (safeToggle){
      safeToggle.textContent = lock ? '🔒 Safe Door' : '🔓 Safe Open';
    }
  }

  if (safeToggle){
    safeToggle.addEventListener('click', ()=>{
      setSafeDoor(!isLocked());
    });
  }

  setSafeDoor(true);


  /* ============================
     Tabs
   ============================ */

  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  let __activeTab = null;
  function applyTab(tab){
    __activeTab = tab;

    tabBtns.forEach(btn=>{
      const id = btn.dataset.tab || btn.dataset.tabId;
      btn.classList.toggle('active', id === tab);
    });

    tabContents.forEach(c=>{
      const active = c.id === `${tab}-tab`;
      c.style.display = active ? 'block' : 'none';
      c.classList.toggle('active', active);
    });
  }

  tabBtns.forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.preventDefault();
      const id = btn.dataset.tab || btn.dataset.tabId;
      applyTab(id);
    });
  });

  const url = new URL(location.href);
  const initial = url.searchParams.get('tab') || 'home';
  applyTab(initial);


  /* ============================
     Safe API
   ============================ */

  window.safeDoor = {
    setAssetValue(key, value){
      const el = document.getElementById(key);
      if (!el) return;
      el.dataset.realValue = value;
      if (!isLocked()) el.textContent = value;
    },
    isLocked
  };

  console.log("✅ CodeBank index.js ready (Browser Local Mode)");
}

try { window.initCodeBank = __boot } catch(_){}
