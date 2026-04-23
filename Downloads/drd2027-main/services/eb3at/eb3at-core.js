/**
 * EB3AT-CORE.js — File Transfer Service
 *
 * Users send files to other users. Transfers cost codes.
 * File metadata stored in UnifiedStorage, actual files via server.
 * Uses ServiceBase for auth + storage.
 */

(function () {
  'use strict';

  var TRANSFER_COST = 2;
  var transfers = { sent: [], received: [] };

  ServiceBase.init({
    name: 'Eb3at',

    onReady: function (ctx) {
      loadTransfers();

      UnifiedStorage.subscribe('storage:change', function (data) {
        if (data.type === 'file_transfers') loadTransfers();
      });

      document.getElementById('send-file-btn')
        ?.addEventListener('click', initSendFile);

      hideLoading();
    },

    onBalanceChange: function (balance) {
      var el = document.getElementById('eb3at-balance');
      if (el) el.textContent = '🔐 ' + balance + ' codes (transfer costs ' + TRANSFER_COST + ')';
    }
  });

  function loadTransfers() {
    UnifiedStorage.getAll('file_transfers').then(function (data) {
      var all = data || [];
      transfers.sent = all.filter(function (t) { return t.senderId === ServiceBase.userId; })
                         .sort(function (a, b) { return b.timestamp - a.timestamp; });
      transfers.received = all.filter(function (t) { return t.recipientId === ServiceBase.userId; })
                              .sort(function (a, b) { return b.timestamp - a.timestamp; });
      renderTransfers();
    });
  }

  function initSendFile() {
    if (ServiceBase.balance < TRANSFER_COST) {
      ServiceBase.notify('Not enough codes! Need ' + TRANSFER_COST, 'error');
      return;
    }

    var recipient = prompt('Send to (email or user ID):');
    if (!recipient) return;

    // File picker
    var input = document.createElement('input');
    input.type = 'file';
    input.onchange = function () {
      var file = input.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        ServiceBase.notify('File too large! Max 10MB.', 'error');
        return;
      }
      sendFile(file, recipient);
    };
    input.click();
  }

  function sendFile(file, recipientId) {
    var transfer = {
      id: 'ft_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      senderId: ServiceBase.userId,
      senderName: ServiceBase.email.split('@')[0],
      recipientId: recipientId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      status: 'pending',
      timestamp: Date.now(),
      userId: ServiceBase.userId
    };

    ServiceBase.spendCodes(TRANSFER_COST, 'Eb3at file transfer: ' + file.name).then(function () {
      return UnifiedStorage.set(transfer.id, transfer, 'file_transfers');
    }).then(function () {
      ServiceBase.notify('📤 File "' + file.name + '" queued for transfer!', 'success');
      loadTransfers();

      // In production: upload file to server via FormData
      // var formData = new FormData();
      // formData.append('file', file);
      // formData.append('transferId', transfer.id);
      // ServiceBase.apiCall('/api/eb3at/upload', { method: 'POST', body: formData });
    }).catch(function (err) {
      ServiceBase.notify('Transfer failed: ' + err.message, 'error');
    });
  }

  function renderTransfers() {
    renderList('sent-transfers', transfers.sent, 'sent');
    renderList('received-transfers', transfers.received, 'received');
  }

  function renderList(containerId, items, type) {
    var el = document.getElementById(containerId);
    if (!el) return;

    if (items.length === 0) {
      el.innerHTML = '<div class="empty">No ' + type + ' transfers yet.</div>';
      return;
    }

    el.innerHTML = items.slice(0, 20).map(function (t) {
      return '<div class="transfer-item status-' + t.status + '">' +
        '<div class="transfer-icon">' + (type === 'sent' ? '📤' : '📥') + '</div>' +
        '<div class="transfer-details">' +
          '<div class="transfer-name">' + escapeHtml(t.fileName) + '</div>' +
          '<div class="transfer-meta">' +
            (type === 'sent' ? 'To: ' + escapeHtml(t.recipientId) : 'From: ' + escapeHtml(t.senderName)) +
            ' · ' + formatSize(t.fileSize) +
            ' · ' + timeAgo(t.timestamp) +
          '</div>' +
        '</div>' +
        '<div class="transfer-status">' + t.status + '</div>' +
      '</div>';
    }).join('');
  }

  function formatSize(bytes) {
    if (!bytes) return '0B';
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / 1048576).toFixed(1) + 'MB';
  }
  function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function timeAgo(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
    return Math.floor(diff/86400000) + 'd ago';
  }
  function hideLoading() {
    var el = document.getElementById('loadingOverlay');
    if (el) { el.classList.add('hidden'); setTimeout(function () { el.style.display = 'none'; }, 300); }
  }

  window.Eb3at = { sendFile: initSendFile, refresh: loadTransfers };
})();
