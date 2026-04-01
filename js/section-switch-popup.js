let lastPopup = null;

export function showSectionPopup(title) {
  try {
    const text = typeof title === 'string' ? title : (title && title.text) || '';
    if (!text) return;
    if (lastPopup) {
      try { lastPopup.remove(); } catch (_) {}
      lastPopup = null;
    }

    const el = document.createElement('div');
    el.className = 'section-switch-popup';
    el.textContent = text;
    document.body.appendChild(el);

    // trigger CSS animation
    void el.offsetWidth;
    el.classList.add('in');

    // auto hide
    setTimeout(() => {
      el.classList.remove('in');
      el.classList.add('out');
      setTimeout(() => {
        try { el.remove(); } catch (_) {}
        if (lastPopup === el) lastPopup = null;
      }, 250);
    }, 700);

    lastPopup = el;
  } catch (_) {}
}

// Backward compatibility for non‑module callers
if (!window.showSectionPopup) {
  window.showSectionPopup = showSectionPopup;
}

