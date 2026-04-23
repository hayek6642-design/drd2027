/**
 * translate.js — CodeBank Multi-Language Support
 * Languages: English (en) · Arabic (ar) · Urdu (ur)
 * ─────────────────────────────────────────────────
 * • Adds a Language button to the "My Room" settings panel (below Dr.D-mail)
 * • Translates all UI text via data-i18n attributes
 * • Handles RTL for Arabic and Urdu
 * • Persists preference in localStorage under key: cb_language
 *
 * Usage from other scripts:
 *   window.CodeBankTranslate.setLanguage('ar');
 *   window.CodeBankTranslate.t('sign_out');
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════
     TRANSLATIONS DICTIONARY
  ══════════════════════════════════════════════════════════ */
  const TRANSLATIONS = {

    /* ─── English (default) ─── */
    en: {
      // My Room panel
      my_room:           'My Room',
      appearance:        'Appearance',
      dark_mode:         'Dark Mode',
      account:           'Account',
      sign_out:          'Sign Out',
      messages:          'Messages',
      drmail:            'Dr.D-mail',
      language:          'Language',
      select_language:   'Select Language',

      // Main launcher section headings
      core_services:       'Core Services',
      media_entertainment: 'Media & Entertainment',
      finance_trading:     'Finance & Trading',
      games_fun:           'Games & Fun',
      tools_ai:            'Tools & AI',

      // App names & descriptions
      app_safecode:          'SafeCode',
      app_safecode_desc:     'Secure code storage',
      app_samma3ny:          'Samma3ny',
      app_samma3ny_desc:     'Audio platform',
      app_battalooda:        'Battalooda',
      app_battalooda_desc:   'Voice talent discovery',
      app_farragna:          'Farragna',
      app_farragna_desc:     'Trading platform',
      app_oneworld:          'OneWorld',
      app_oneworld_desc:     'Global content hub',
      app_nostalgia:         'Nostalgia',
      app_nostalgia_desc:    'Retro music collection',
      app_setta:             'Setta X Tes3a',
      app_setta_desc:        'Photo & video gallery',
      app_shots:             'Shots!',
      app_shots_desc:        'Screenshot manager',
      app_eb3at:             'Eb3at',
      app_eb3at_desc:        'Messaging service',
      app_pebalaash:         'Pebalaash',
      app_pebalaash_desc:    'Gaming platform',
      app_qarsan:            'Qarsan',
      app_qarsan_desc:       'Security & protection',
      app_games:             'Games Centre',
      app_games_desc:        'Gaming hub',
      app_yahood:            'Yahood!',
      app_yahood_desc:       'Geo-based treasure mining',
      app_piston:            'Piston',
      app_piston_desc:       'Game engine',
      app_corsa:             'CoRsA',
      app_corsa_desc:        'AI Assistant',
      app_aihub:             'AI Hub',
      app_aihub_desc:        'Gateway to the AI World',
      app_e7ki:              'E7ki',
      app_e7ki_desc:         'Chat platform',

      // General UI
      loading_service: 'Loading Service...',
      close:   'Close',
      back:    'Back',
      reload:  'Reload',
      settings:'Settings',
    },

    /* ─── Arabic ─── */
    ar: {
      my_room:           'غرفتي',
      appearance:        'المظهر',
      dark_mode:         'الوضع الداكن',
      account:           'الحساب',
      sign_out:          'تسجيل الخروج',
      messages:          'الرسائل',
      drmail:            'بريد د. دي',
      language:          'اللغة',
      select_language:   'اختر اللغة',

      core_services:       'الخدمات الأساسية',
      media_entertainment: 'الإعلام والترفيه',
      finance_trading:     'المالية والتداول',
      games_fun:           'الألعاب والمرح',
      tools_ai:            'الأدوات والذكاء الاصطناعي',

      app_safecode:          'سيف كود',
      app_safecode_desc:     'تخزين آمن للرموز',
      app_samma3ny:          'سمّعني',
      app_samma3ny_desc:     'منصة صوتية',
      app_battalooda:        'بطلودة',
      app_battalooda_desc:   'اكتشاف المواهب الصوتية',
      app_farragna:          'فرّقنا',
      app_farragna_desc:     'منصة التداول',
      app_oneworld:          'عالم واحد',
      app_oneworld_desc:     'مركز المحتوى العالمي',
      app_nostalgia:         'نوستالجيا',
      app_nostalgia_desc:    'مجموعة الموسيقى الكلاسيكية',
      app_setta:             'ستة × تسعة',
      app_setta_desc:        'معرض الصور والفيديو',
      app_shots:             'شوتس!',
      app_shots_desc:        'مدير لقطات الشاشة',
      app_eb3at:             'ابعت',
      app_eb3at_desc:        'خدمة المراسلة',
      app_pebalaash:         'بيبلاش',
      app_pebalaash_desc:    'منصة الألعاب',
      app_qarsan:            'قرصان',
      app_qarsan_desc:       'الأمان والحماية',
      app_games:             'مركز الألعاب',
      app_games_desc:        'مركز الألعاب',
      app_yahood:            'يهود!',
      app_yahood_desc:       'مغامرة الكنوز الجغرافية',
      app_piston:            'بيستون',
      app_piston_desc:       'محرك الألعاب',
      app_corsa:             'كورسا',
      app_corsa_desc:        'مساعد الذكاء الاصطناعي',
      app_aihub:             'مركز الذكاء الاصطناعي',
      app_aihub_desc:        'بوابة عالم الذكاء الاصطناعي',
      app_e7ki:              'احكي',
      app_e7ki_desc:         'منصة الدردشة',

      loading_service: 'جارٍ تحميل الخدمة...',
      close:   'إغلاق',
      back:    'رجوع',
      reload:  'إعادة تحميل',
      settings:'الإعدادات',
    },

    /* ─── Urdu ─── */
    ur: {
      my_room:           'میرا کمرہ',
      appearance:        'ظاہری شکل',
      dark_mode:         'ڈارک موڈ',
      account:           'اکاؤنٹ',
      sign_out:          'سائن آؤٹ',
      messages:          'پیغامات',
      drmail:            'ڈاکٹر ڈی-میل',
      language:          'زبان',
      select_language:   'زبان منتخب کریں',

      core_services:       'بنیادی خدمات',
      media_entertainment: 'میڈیا اور تفریح',
      finance_trading:     'مالیات اور تجارت',
      games_fun:           'گیمز اور تفریح',
      tools_ai:            'ٹولز اور اے آئی',

      app_safecode:          'سیف کوڈ',
      app_safecode_desc:     'محفوظ کوڈ اسٹوریج',
      app_samma3ny:          'سمّعنی',
      app_samma3ny_desc:     'آڈیو پلیٹ فارم',
      app_battalooda:        'بطلودہ',
      app_battalooda_desc:   'صوتی ٹیلنٹ دریافت',
      app_farragna:          'فرّقنا',
      app_farragna_desc:     'ٹریڈنگ پلیٹ فارم',
      app_oneworld:          'ون ورلڈ',
      app_oneworld_desc:     'عالمی مواد کا مرکز',
      app_nostalgia:         'نوسٹالجیا',
      app_nostalgia_desc:    'کلاسک موسیقی مجموعہ',
      app_setta:             'سیٹا ایکس تیسعہ',
      app_setta_desc:        'تصاویر اور ویڈیو گیلری',
      app_shots:             'شاٹس!',
      app_shots_desc:        'اسکرین شاٹ مینیجر',
      app_eb3at:             'ابعت',
      app_eb3at_desc:        'پیغام رسانی خدمت',
      app_pebalaash:         'پیبلاش',
      app_pebalaash_desc:    'گیمنگ پلیٹ فارم',
      app_qarsan:            'قرصان',
      app_qarsan_desc:       'سیکیورٹی اور تحفظ',
      app_games:             'گیمز سینٹر',
      app_games_desc:        'گیمنگ مرکز',
      app_yahood:            'یہود!',
      app_yahood_desc:       'جیو پر مبنی خزانہ',
      app_piston:            'پسٹن',
      app_piston_desc:       'گیم انجن',
      app_corsa:             'کورسا',
      app_corsa_desc:        'اے آئی اسسٹنٹ',
      app_aihub:             'اے آئی ہب',
      app_aihub_desc:        'اے آئی دنیا کا دروازہ',
      app_e7ki:              'احکی',
      app_e7ki_desc:         'چیٹ پلیٹ فارم',

      loading_service: 'خدمت لوڈ ہو رہی ہے...',
      close:   'بند کریں',
      back:    'واپس',
      reload:  'دوبارہ لوڈ',
      settings:'ترتیبات',
    },
  };

  /* ═══════════════════════════════════════════════════════
     CONSTANTS
  ══════════════════════════════════════════════════════════ */
  const RTL_LANGS  = ['ar', 'ur'];
  const LANG_META  = {
    en: { label: 'English',  flag: '🇬🇧', native: 'English'  },
    ar: { label: 'Arabic',   flag: '🇸🇦', native: 'العربية'  },
    ur: { label: 'Urdu',     flag: '🇵🇰', native: 'اردو'     },
  };
  const STORAGE_KEY = 'cb_language';

  /* ═══════════════════════════════════════════════════════
     STATE
  ══════════════════════════════════════════════════════════ */
  let currentLang = localStorage.getItem(STORAGE_KEY) || 'en';

  /* ═══════════════════════════════════════════════════════
     CORE ENGINE
  ══════════════════════════════════════════════════════════ */

  /** Look up a translation key (falls back to English, then the key itself) */
  function t(key) {
    return (TRANSLATIONS[currentLang] || {})[key]
        || (TRANSLATIONS['en']         || {})[key]
        || key;
  }

  /** Apply translations to the whole page */
  function applyTranslations() {
    const lang   = currentLang;
    const isRTL  = RTL_LANGS.includes(lang);
    const dict   = TRANSLATIONS[lang] || TRANSLATIONS['en'];

    /* ── Document direction & lang ── */
    document.documentElement.setAttribute('dir',  isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);

    /* ── Elements with data-i18n attribute ── */
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = dict[key];
      if (!val) return;
      // If element has no child elements, set textContent directly
      if (el.children.length === 0) {
        el.textContent = val;
      } else {
        // Only update bare text nodes (avoids destroying icons/badges)
        el.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
            node.textContent = val;
          }
        });
      }
    });

    /* ── Service loading spinner text ── */
    document.querySelectorAll(
      '#service-modal-loading span, .service-loading span, #runner-loading span'
    ).forEach(el => { el.textContent = t('loading_service'); });

    /* ── App tile names (rendered by app-launcher.js) ── */
    document.querySelectorAll('.app-card[data-id]').forEach(card => {
      const appId = card.getAttribute('data-id');
      const key   = 'app_' + appId;
      if (!dict[key]) return;
      const nameEl = card.querySelector('.app-tile-name');
      if (nameEl) nameEl.textContent = dict[key];
    });

    /* ── Update the translate button label ── */
    const translateLabelEl = document.querySelector('[data-i18n-lang-label]');
    if (translateLabelEl) {
      const meta = LANG_META[lang];
      translateLabelEl.textContent = meta.flag + ' ' + meta.native;
    }

    /* ── Notify other scripts ── */
    window.dispatchEvent(new CustomEvent('cb:language-changed', {
      detail: { lang, isRTL }
    }));

    console.log('[CodeBankTranslate] Language applied:', lang);
  }

  /** Change language, persist, and re-render */
  function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    applyTranslations();
    closeLanguageModal();
  }

  /* ═══════════════════════════════════════════════════════
     LANGUAGE SELECTOR MODAL
  ══════════════════════════════════════════════════════════ */

  function openLanguageModal() {
    // Remove stale modal if any
    const existing = document.getElementById('cb-lang-modal');
    if (existing) existing.remove();

    /* Overlay */
    const overlay = document.createElement('div');
    overlay.id = 'cb-lang-modal';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:99999',
      'background:rgba(0,0,0,0.72)',
      'backdrop-filter:blur(6px)',
      '-webkit-backdrop-filter:blur(6px)',
      'display:flex;align-items:center;justify-content:center',
      'opacity:0;transition:opacity 0.22s ease',
    ].join(';');

    /* Card */
    const card = document.createElement('div');
    card.style.cssText = [
      'background:#1e293b',
      'border:1px solid #334155',
      'border-radius:22px',
      'padding:28px 24px',
      'width:min(340px,90vw)',
      'box-shadow:0 24px 64px rgba(0,0,0,0.55)',
      'transform:translateY(18px)',
      'transition:transform 0.25s cubic-bezier(.34,1.56,.64,1)',
      'font-family:inherit',
    ].join(';');

    /* Header */
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;';
    header.innerHTML = `
      <h3 style="font-size:1.05rem;font-weight:700;color:#f8fafc;margin:0;">
        🌐 ${t('select_language')}
      </h3>
      <button id="cb-lang-close-btn" style="
        background:rgba(255,255,255,0.08);border:none;
        color:#94a3b8;width:32px;height:32px;
        border-radius:50%;cursor:pointer;font-size:1.1rem;
        display:flex;align-items:center;justify-content:center;
        line-height:1;
      " aria-label="Close">&times;</button>
    `;
    card.appendChild(header);

    /* Language options */
    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

    Object.entries(LANG_META).forEach(([code, meta]) => {
      const active = code === currentLang;
      const btn = document.createElement('button');
      btn.setAttribute('data-cb-lang', code);
      btn.style.cssText = [
        'display:flex;align-items:center;gap:14px',
        'padding:14px 16px;border-radius:13px;cursor:pointer',
        `background:${active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)'}`,
        `border:1.5px solid ${active ? '#6366f1' : 'rgba(255,255,255,0.09)'}`,
        `color:${active ? '#a5b4fc' : '#cbd5e1'}`,
        'font-size:0.95rem;width:100%;text-align:left',
        'transition:all 0.15s ease',
      ].join(';');

      btn.innerHTML = `
        <span style="font-size:1.6rem;line-height:1;">${meta.flag}</span>
        <div style="flex:1;">
          <div style="font-weight:600;line-height:1.4;">${meta.native}</div>
          <div style="font-size:0.73rem;opacity:0.55;margin-top:1px;">${meta.label}</div>
        </div>
        ${active ? '<span style="color:#6366f1;font-size:1.15rem;">✓</span>' : ''}
      `;

      btn.addEventListener('click', () => setLanguage(code));
      /* Hover effect */
      btn.addEventListener('mouseenter', () => {
        if (code !== currentLang) {
          btn.style.background = 'rgba(255,255,255,0.09)';
          btn.style.borderColor = 'rgba(255,255,255,0.18)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (code !== currentLang) {
          btn.style.background = 'rgba(255,255,255,0.04)';
          btn.style.borderColor = 'rgba(255,255,255,0.09)';
        }
      });

      list.appendChild(btn);
    });

    card.appendChild(list);

    /* Footnote */
    const note = document.createElement('p');
    note.style.cssText = 'margin-top:14px;font-size:0.7rem;color:#475569;text-align:center;';
    note.textContent = 'Your preference is saved automatically';
    card.appendChild(note);

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    /* Close handlers */
    overlay.querySelector('#cb-lang-close-btn').addEventListener('click', closeLanguageModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeLanguageModal(); });
    document.addEventListener('keydown', onEscClose);

    /* Animate in */
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      card.style.transform  = 'translateY(0)';
    });
  }

  function closeLanguageModal() {
    const modal = document.getElementById('cb-lang-modal');
    if (!modal) return;
    modal.style.opacity = '0';
    document.removeEventListener('keydown', onEscClose);
    setTimeout(() => { if (modal.parentNode) modal.remove(); }, 230);
  }

  function onEscClose(e) {
    if (e.key === 'Escape') closeLanguageModal();
  }

  /* ═══════════════════════════════════════════════════════
     INJECT TRANSLATE BUTTON INTO SETTINGS PANEL
  ══════════════════════════════════════════════════════════ */

  function injectTranslateButton() {
    if (document.getElementById('translateBtn')) return true; // already injected

    const drmailBtn = document.getElementById('drmailBtn');
    if (!drmailBtn) return false; // not ready yet

    const drmailSection = drmailBtn.closest('section');
    if (!drmailSection) return false;

    const meta = LANG_META[currentLang];

    const langSection = document.createElement('section');
    langSection.innerHTML = `
      <h3 class="text-xs font-bold text-gray-500 uppercase mb-4"
          data-i18n="language">${t('language')}</h3>
      <button id="translateBtn"
        class="w-full p-4 rounded-xl flex items-center justify-between"
        style="
          background:rgba(16,185,129,0.1);
          color:#34d399;
          border:none;
          cursor:pointer;
          transition:background 0.2s ease;
        "
        aria-label="Select language">
        <span style="display:flex;align-items:center;gap:9px;">
          <i class="fas fa-language" style="font-size:1rem;"></i>
          <span data-i18n-lang-label style="font-weight:500;">${meta.flag} ${meta.native}</span>
        </span>
        <i class="fas fa-chevron-right" style="font-size:0.75rem;opacity:0.6;"></i>
      </button>
    `;

    /* Insert right after the Dr.D-mail section */
    drmailSection.insertAdjacentElement('afterend', langSection);

    const btn = document.getElementById('translateBtn');

    /* Hover effect */
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(16,185,129,0.18)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(16,185,129,0.1)';
    });

    /* Click: close settings panel → open language picker */
    btn.addEventListener('click', () => {
      // Close "My Room" panel
      const panel   = document.getElementById('settings-panel');
      const panelOv = document.getElementById('settings-overlay');
      if (panel)   panel.style.transform = 'translateX(100%)';
      if (panelOv) { panelOv.style.opacity = '0'; panelOv.style.pointerEvents = 'none'; }

      // Open language modal after brief delay
      setTimeout(openLanguageModal, 160);
    });

    return true;
  }

  /* ═══════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */

  function init() {
    /* Apply saved language immediately (before DOMContentLoaded) */
    if (document.readyState !== 'loading') {
      applyTranslations();
      if (!injectTranslateButton()) {
        setTimeout(injectTranslateButton, 600);
      }
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        applyTranslations();
        if (!injectTranslateButton()) {
          setTimeout(injectTranslateButton, 600);
        }
      });
    }

    /* Re-apply after app tiles are rendered by app-launcher.js */
    window.addEventListener('cb:apps-rendered', () => {
      applyTranslations();
    });

    /* Fallback: re-apply 1.2 s after page load to catch dynamically rendered tiles */
    window.addEventListener('load', () => {
      setTimeout(applyTranslations, 1200);
    });
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════════ */
  window.CodeBankTranslate = {
    /** Translate a key to the current language */
    t,
    /** Set active language: 'en' | 'ar' | 'ur' */
    setLanguage,
    /** Get current language code */
    getCurrentLang:    () => currentLang,
    /** Full translations dictionary */
    getTranslations:   () => TRANSLATIONS,
    /** Language metadata (flag, native name, label) */
    getLangMeta:       () => LANG_META,
    /** Manually trigger re-apply (useful after dynamic content injection) */
    applyTranslations,
    /** Programmatically open the language selector modal */
    openSelector:      openLanguageModal,
  };

  init();

})();
