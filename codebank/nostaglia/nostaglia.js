(() => {
  const authHeaders = () => ({ });
  const feedEl = document.getElementById('nostaglia-feed');
  const refreshBtn = document.getElementById('nostaglia-refresh');
  let sse;
  async function fetchFeed() {
    const res = await fetch('/api/nostaglia/feed', { credentials: 'include' });
    if (!res.ok) return;
    const list = await res.json();
    renderFeed(list);
  }
  function formatDate(d) { try { return new Date(d).toLocaleDateString(); } catch(e){ return d; } }
  function renderFeed(items) {
    feedEl.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'nostaglia-card';
      const video = document.createElement('video');
      video.className = 'nostaglia-media';
      video.src = item.url;
      video.autoplay = true; video.muted = true; video.loop = true; video.playsInline = true;
      const meta = document.createElement('div');
      meta.className = 'nostaglia-meta';
      const left = document.createElement('div');
      left.innerHTML = `<div class="nostaglia-title">${item.title || ''}</div><div class="nostaglia-user">@${item.user_id || ''}</div>`;
      const date = document.createElement('div');
      date.className = 'nostaglia-date';
      date.textContent = formatDate(item.admin_date);
      meta.appendChild(left); meta.appendChild(date);
      const timeline = document.createElement('div');
      timeline.className = 'nostaglia-timeline';
      const marker = document.createElement('div');
      marker.className = 'nostaglia-marker';
      marker.style.left = '50%';
      timeline.appendChild(marker);
      const actions = document.createElement('div');
      actions.className = 'nostaglia-actions';
      const mkBtn = (emoji, type) => {
        const btn = document.createElement('button');
        btn.className = 'nostaglia-btn';
        const countEl = document.createElement('span');
        countEl.textContent = '0';
        btn.innerHTML = `${emoji}`;
        btn.appendChild(countEl);
        let pressTimer;
        btn.addEventListener('mousedown', () => { pressTimer = setTimeout(async () => { await react(item.id, type, true); }, 600); });
        btn.addEventListener('mouseup', async () => { if (pressTimer) { clearTimeout(pressTimer); await react(item.id, type, false).then(r=>{ countEl.textContent = String(r?.reaction?.[type]||0); }); }});
        btn.addEventListener('mouseleave', () => { if (pressTimer) clearTimeout(pressTimer); });
        return { btn, countEl };
      };
      const like = mkBtn('❤️','like');
      const superLike = mkBtn('💙','super');
      const megaLike = mkBtn('💜','mega');
      actions.appendChild(like.btn); actions.appendChild(superLike.btn); actions.appendChild(megaLike.btn);
      const comments = document.createElement('div');
      comments.className = 'nostaglia-comments';
      const input = document.createElement('input');
      input.className = 'nostaglia-input'; input.placeholder = 'Write a memory...';
      input.addEventListener('keydown', async (e) => { if (e.key==='Enter' && input.value.trim()) { await addComment(item.id, input.value.trim()); input.value=''; } });
      comments.appendChild(input);
      const shareBtn = document.createElement('button');
      shareBtn.className = 'nostaglia-btn'; shareBtn.textContent = 'Share';
      shareBtn.addEventListener('click', async () => { const r = await share(item.id); navigator.clipboard?.writeText(r.url); });
      actions.appendChild(shareBtn);
      card.appendChild(video); card.appendChild(meta); card.appendChild(timeline); card.appendChild(actions); card.appendChild(comments);
      feedEl.appendChild(card);
    });
  }
  async function react(upload_id, type, cancel) {
    // Spend an asset for the reaction (like=1, super=5, mega=20) unless cancelling
    if (!cancel && typeof window.useAsset === 'function') {
      const costMap = { like: 1, super: 5, mega: 20 };
      const cost = costMap[type] || 1;
      try {
        await window.useAsset(type, cost, 'nostaglia', type + ' on ' + upload_id);
      } catch (_) { /* proceed even if asset spend fails */ }
    }
    const res = await fetch('/api/nostaglia/react', { method:'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ upload_id, type, cancel }) });
    if (!res.ok) return {};
    const data = await res.json();
    return data;
  }
  async function addComment(upload_id, text) {
    const res = await fetch('/api/nostaglia/comments', { method:'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ upload_id, text }) });
    if (!res.ok) return;
  }
  async function share(upload_id) {
    const res = await fetch('/api/nostaglia/share', { method:'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ upload_id }) });
    if (!res.ok) return {};
    return res.json();
  }
  function connectSSE() {
    sse = new EventSource('/api/nostaglia/events', { withCredentials: true });
    sse.addEventListener('reaction_added', () => {});
    sse.addEventListener('reaction_removed', () => {});
    sse.addEventListener('balance_change', () => {});
    sse.addEventListener('comment_added', () => {});
    sse.addEventListener('feed_publish', () => { fetchFeed(); });
    sse.addEventListener('winner', () => {});
  }
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('button.tab-btn[data-tab="nostaglia"]');
    btn?.addEventListener('click', () => { fetchFeed(); if (!sse) connectSSE(); });
    refreshBtn?.addEventListener('click', fetchFeed);
  });
})();
