/**
 * SAMMA3NY-CORE.js — AI/LLM Interface Service
 *
 * Each AI query costs codes. Responses are stored for history.
 * Uses ServiceBase for auth + storage.
 */

(function () {
  'use strict';

  var QUERY_COST = 5; // codes per AI query
  var chatHistory = [];
  var $chatContainer, $inputField, $sendBtn, $balanceEl, $historyList;

  ServiceBase.init({
    name: 'Samma3ny',

    onReady: function (ctx) {
      $chatContainer = document.getElementById('chat-container');
      $inputField = document.getElementById('query-input');
      $sendBtn = document.getElementById('send-query-btn');
      $balanceEl = document.getElementById('samma3ny-balance');
      $historyList = document.getElementById('history-list');

      updateBalance(ctx.balance);
      loadHistory();

      $sendBtn && $sendBtn.addEventListener('click', sendQuery);
      $inputField && $inputField.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuery(); }
      });

      hideLoading();
    },

    onBalanceChange: function (balance) {
      updateBalance(balance);
    }
  });

  function updateBalance(bal) {
    if ($balanceEl) $balanceEl.textContent = '🔐 ' + bal + ' codes (costs ' + QUERY_COST + '/query)';
  }

  function sendQuery() {
    var text = $inputField ? $inputField.value.trim() : '';
    if (!text) return;

    if (ServiceBase.balance < QUERY_COST) {
      ServiceBase.notify('Not enough codes! Need ' + QUERY_COST + ' per query.', 'error');
      return;
    }

    // Add user message to UI
    appendMessage('user', text);
    $inputField.value = '';

    // Deduct codes
    ServiceBase.spendCodes(QUERY_COST, 'Samma3ny AI query').then(function () {
      // Show typing indicator
      appendMessage('system', '⏳ Thinking...');

      // Call AI endpoint
      return ServiceBase.apiCall('/api/samma3ny/query', {
        method: 'POST',
        body: JSON.stringify({ query: text, userId: ServiceBase.userId })
      });
    }).then(function (res) {
      if (!res.ok) throw new Error('API error: ' + res.status);
      return res.json();
    }).then(function (data) {
      // Remove typing indicator
      removeLastMessage();
      // Add AI response
      var reply = data.response || data.text || 'No response received.';
      appendMessage('ai', reply);

      // Save to history via UnifiedStorage
      var entry = {
        id: 'samma3ny_' + Date.now(),
        query: text,
        response: reply,
        userId: ServiceBase.userId,
        timestamp: Date.now(),
        cost: QUERY_COST
      };
      UnifiedStorage.set(entry.id, entry, 'transactions');
      chatHistory.push(entry);
    }).catch(function (err) {
      removeLastMessage();
      appendMessage('system', '❌ Error: ' + err.message);
    });
  }

  function appendMessage(role, text) {
    if (!$chatContainer) return;
    var div = document.createElement('div');
    div.className = 'chat-msg chat-msg-' + role;
    div.innerHTML = '<div class="msg-role">' +
      (role === 'user' ? '👤 You' : role === 'ai' ? '🤖 Samma3ny' : '⚙️ System') +
      '</div><div class="msg-text">' + escapeHtml(text) + '</div>';
    $chatContainer.appendChild(div);
    $chatContainer.scrollTop = $chatContainer.scrollHeight;
  }

  function removeLastMessage() {
    if ($chatContainer && $chatContainer.lastChild) {
      $chatContainer.removeChild($chatContainer.lastChild);
    }
  }

  function loadHistory() {
    UnifiedStorage.getAll('transactions').then(function (txs) {
      chatHistory = (txs || []).filter(function (t) {
        return t.id && t.id.indexOf('samma3ny_') === 0 && t.userId === ServiceBase.userId;
      }).sort(function (a, b) { return (a.timestamp || 0) - (b.timestamp || 0); });

      // Render last 20 entries
      chatHistory.slice(-20).forEach(function (entry) {
        appendMessage('user', entry.query);
        appendMessage('ai', entry.response);
      });
    });
  }

  function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function hideLoading() {
    var el = document.getElementById('loadingOverlay');
    if (el) { el.classList.add('hidden'); setTimeout(function () { el.style.display = 'none'; }, 300); }
  }

  window.Samma3ny = { sendQuery: sendQuery };
})();
