/**
 * E7KI-CORE.js — Chat/Messaging Service for CodeBank
 *
 * Integrates with:
 *  - ServiceAuth (auth via parent postMessage)
 *  - UnifiedStorage (messages persisted in IndexedDB + server sync)
 *
 * Message cost: Each message costs 1 code from user's balance.
 * Messages are stored as type 'messages' in UnifiedStorage.
 */

(function () {
  'use strict';

  // ── State ───────────────────────────────────────────────
  var auth = null;               // ServiceAuth instance
  var currentUserId = null;
  var currentUserEmail = null;
  var activeConversationId = null;
  var conversations = [];        // { id, name, participants[], lastMessage, updatedAt }
  var messages = {};             // conversationId -> message[]
  var contacts = [];             // Known users
  var codeBalance = 0;
  var MESSAGE_COST = 1;          // codes per message

  // ── DOM refs ────────────────────────────────────────────
  var $loading       = document.getElementById('loadingOverlay');
  var $convList      = document.getElementById('conversationsList');
  var $emptyState    = document.getElementById('emptyState');
  var $activeChat    = document.getElementById('activeChatView');
  var $msgContainer  = document.getElementById('messagesContainer');
  var $msgInput      = document.getElementById('messageInput');
  var $sendBtn       = document.getElementById('sendBtn');
  var $chatName      = document.getElementById('chatName');
  var $chatAvatar    = document.getElementById('chatAvatar');
  var $chatStatus    = document.getElementById('chatStatus');
  var $searchInput   = document.getElementById('searchInput');
  var $userName      = document.getElementById('currentUserName');
  var $msgCost       = document.getElementById('msgCost');
  var $typingInd     = document.getElementById('typingIndicator');

  // ── Initialize ──────────────────────────────────────────
  auth = new ServiceAuth();

  auth.onReady = function (session) {
    if (!session || !session.userId) {
      console.error('[E7ki] No valid session');
      return;
    }

    currentUserId = session.userId;
    currentUserEmail = session.email || 'User';
    $userName.textContent = currentUserEmail.split('@')[0];

    // Wait for storage
    UnifiedStorage.ready.then(function () {
      loadConversations();
      loadCodeBalance();
      subscribeToUpdates();
      hideLoading();
    }).catch(function (err) {
      console.error('[E7ki] Storage init failed:', err);
      hideLoading();
    });
  };

  auth.onAuthFailed = function () {
    hideLoading();
    // ServiceAuth shows login overlay automatically
  };

  // ── Loading ─────────────────────────────────────────────
  function hideLoading() {
    $loading.classList.add('hidden');
    setTimeout(function () { $loading.style.display = 'none'; }, 300);
  }

  // ── Conversations ───────────────────────────────────────
  function loadConversations() {
    UnifiedStorage.getAll('conversations').then(function (data) {
      // Filter to conversations this user participates in
      conversations = (data || []).filter(function (c) {
        return c.participants && c.participants.indexOf(currentUserId) !== -1;
      });

      // Sort by last activity
      conversations.sort(function (a, b) {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });

      // If no conversations, create some demo ones
      if (conversations.length === 0) {
        createDemoConversations();
      } else {
        renderConversationList();
      }
    });
  }

  function createDemoConversations() {
    var demos = [
      { name: 'CodeBank Support', emoji: '🏦', preview: 'Welcome to CodeBank!' },
      { name: 'SafeCode Team', emoji: '🔐', preview: 'Your codes are safe with us.' },
      { name: 'General Chat', emoji: '🌐', preview: 'Hey everyone!' }
    ];

    var promises = demos.map(function (d, i) {
      var conv = {
        id: 'conv_demo_' + i + '_' + currentUserId,
        name: d.name,
        emoji: d.emoji,
        participants: [currentUserId, 'system_' + i],
        lastMessage: d.preview,
        updatedAt: Date.now() - (i * 3600000),
        unread: i === 0 ? 2 : 0,
        userId: currentUserId
      };
      conversations.push(conv);
      return UnifiedStorage.set(conv.id, conv, 'conversations');
    });

    // Also create initial messages for the first conversation
    var welcomeMessages = [
      {
        id: 'msg_welcome_1',
        conversationId: 'conv_demo_0_' + currentUserId,
        senderId: 'system_0',
        senderName: 'CodeBank Support',
        text: 'Welcome to E7ki! 🎉 This is your messaging hub inside CodeBank.',
        timestamp: Date.now() - 7200000,
        userId: currentUserId
      },
      {
        id: 'msg_welcome_2',
        conversationId: 'conv_demo_0_' + currentUserId,
        senderId: 'system_0',
        senderName: 'CodeBank Support',
        text: 'Each message costs 1 code. You can earn codes by watching videos in YT-Clear!',
        timestamp: Date.now() - 7100000,
        userId: currentUserId
      }
    ];

    welcomeMessages.forEach(function (msg) {
      promises.push(UnifiedStorage.set(msg.id, msg, 'messages'));
    });

    Promise.all(promises).then(function () {
      renderConversationList();
    });
  }

  function renderConversationList(filter) {
    var filtered = conversations;

    if (filter) {
      var q = filter.toLowerCase();
      filtered = conversations.filter(function (c) {
        return c.name.toLowerCase().indexOf(q) !== -1 ||
               (c.lastMessage || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    if (filtered.length === 0) {
      $convList.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:0.85rem;">No conversations found</div>';
      return;
    }

    $convList.innerHTML = filtered.map(function (conv) {
      var initials = conv.emoji || conv.name.charAt(0).toUpperCase();
      var time = conv.updatedAt ? formatTime(conv.updatedAt) : '';
      var isActive = conv.id === activeConversationId;

      return '<div class="conversation-item' + (isActive ? ' active' : '') + '" data-id="' + conv.id + '" onclick="E7ki.openConversation(\'' + conv.id + '\')">' +
        '<div class="conv-avatar">' + initials +
          (conv.online ? '<div class="online-badge"></div>' : '') +
        '</div>' +
        '<div class="conv-info">' +
          '<div class="conv-name">' + escapeHtml(conv.name) + '</div>' +
          '<div class="conv-preview">' + escapeHtml(conv.lastMessage || 'No messages yet') + '</div>' +
        '</div>' +
        '<div class="conv-meta">' +
          '<span class="conv-time">' + time + '</span>' +
          (conv.unread ? '<span class="unread-badge">' + conv.unread + '</span>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ── Open Conversation ───────────────────────────────────
  function openConversation(convId) {
    activeConversationId = convId;

    var conv = conversations.find(function (c) { return c.id === convId; });
    if (!conv) return;

    // Mark as read
    conv.unread = 0;
    UnifiedStorage.set(conv.id, conv, 'conversations');

    // Update header
    $chatName.textContent = conv.name;
    $chatAvatar.textContent = conv.emoji || conv.name.charAt(0);
    $chatStatus.textContent = conv.online ? 'Online' : 'Last seen recently';

    // Show chat view
    $emptyState.style.display = 'none';
    $activeChat.style.display = 'flex';

    // Highlight in sidebar
    renderConversationList();

    // Load messages
    loadMessages(convId);

    // Focus input
    $msgInput.focus();
  }

  // ── Messages ────────────────────────────────────────────
  function loadMessages(convId) {
    UnifiedStorage.getAll('messages').then(function (all) {
      var convMessages = (all || []).filter(function (m) {
        return m.conversationId === convId;
      });

      convMessages.sort(function (a, b) {
        return (a.timestamp || 0) - (b.timestamp || 0);
      });

      messages[convId] = convMessages;
      renderMessages(convMessages);
    });
  }

  function renderMessages(msgList) {
    if (!msgList || msgList.length === 0) {
      $msgContainer.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:0.85rem;">No messages yet. Say hello! 👋</div>';
      return;
    }

    var html = '';
    var lastDate = null;

    msgList.forEach(function (msg) {
      var msgDate = new Date(msg.timestamp).toDateString();
      if (msgDate !== lastDate) {
        lastDate = msgDate;
        html += '<div class="date-separator"><span>' + formatDate(msg.timestamp) + '</span></div>';
      }

      var isSent = msg.senderId === currentUserId;
      var initials = isSent ? 'Me' : (msg.senderName || '?').charAt(0);

      html += '<div class="message-group ' + (isSent ? 'sent' : 'received') + '">' +
        '<div class="msg-avatar">' + initials + '</div>' +
        '<div class="msg-content">' +
          '<div class="message-bubble">' + escapeHtml(msg.text) + '</div>' +
          '<span class="msg-time">' + formatTime(msg.timestamp) + '</span>' +
        '</div>' +
      '</div>';
    });

    $msgContainer.innerHTML = html;

    // Scroll to bottom
    $msgContainer.scrollTop = $msgContainer.scrollHeight;
  }

  // ── Send Message ────────────────────────────────────────
  function sendMessage() {
    var text = $msgInput.value.trim();
    if (!text || !activeConversationId) return;

    // Check code balance
    if (codeBalance < MESSAGE_COST) {
      showNotification('Not enough codes! Watch videos in YT-Clear to earn more.', 'error');
      return;
    }

    var msg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      conversationId: activeConversationId,
      senderId: currentUserId,
      senderName: currentUserEmail.split('@')[0],
      text: text,
      timestamp: Date.now(),
      userId: currentUserId,
      status: 'sent'
    };

    // Optimistic UI update
    if (!messages[activeConversationId]) messages[activeConversationId] = [];
    messages[activeConversationId].push(msg);
    renderMessages(messages[activeConversationId]);

    // Clear input
    $msgInput.value = '';
    $msgInput.style.height = 'auto';
    updateSendBtn();

    // Save to storage (syncs to server)
    UnifiedStorage.set(msg.id, msg, 'messages');

    // Update conversation preview
    var conv = conversations.find(function (c) { return c.id === activeConversationId; });
    if (conv) {
      conv.lastMessage = text.length > 50 ? text.substring(0, 50) + '...' : text;
      conv.updatedAt = Date.now();
      UnifiedStorage.set(conv.id, conv, 'conversations');
      renderConversationList();
    }

    // Deduct code cost
    deductCode(MESSAGE_COST);

    // Simulate reply (for demo — remove in production with real users)
    simulateReply(activeConversationId);
  }

  // ── Code balance ────────────────────────────────────────
  function loadCodeBalance() {
    UnifiedStorage.getAll('codes').then(function (codes) {
      var activeCodes = (codes || []).filter(function (c) {
        return c.status === 'active';
      });
      codeBalance = activeCodes.reduce(function (sum, c) {
        return sum + (c.value || 1);
      }, 0);
      updateCostDisplay();
    });
  }

  function deductCode(amount) {
    codeBalance = Math.max(0, codeBalance - amount);
    updateCostDisplay();

    // Create a deduction transaction
    var tx = {
      id: 'tx_e7ki_' + Date.now(),
      type: 'spend',
      service: 'e7ki',
      amount: amount,
      description: 'Message sent in E7ki',
      userId: currentUserId,
      timestamp: Date.now()
    };
    UnifiedStorage.set(tx.id, tx, 'transactions');

    // Broadcast balance change
    UnifiedStorage.broadcast('assets:updated', { codes: codeBalance });
  }

  function updateCostDisplay() {
    $msgCost.textContent = '🔐 ' + codeBalance + ' codes';
  }

  // ── Demo reply (remove in production) ───────────────────
  function simulateReply(convId) {
    $typingInd.classList.add('visible');

    var replies = [
      'Got it! 👍',
      'That\'s interesting!',
      'Tell me more about that.',
      'Cool! How are things going?',
      'Thanks for the message! 💬',
      'I appreciate you reaching out.',
      'Let me think about that...',
      'Great point! 🎯'
    ];

    setTimeout(function () {
      $typingInd.classList.remove('visible');

      if (convId !== activeConversationId) return;

      var conv = conversations.find(function (c) { return c.id === convId; });
      var replyText = replies[Math.floor(Math.random() * replies.length)];

      var reply = {
        id: 'msg_reply_' + Date.now(),
        conversationId: convId,
        senderId: 'system_0',
        senderName: conv ? conv.name : 'Bot',
        text: replyText,
        timestamp: Date.now(),
        userId: currentUserId,
        status: 'received'
      };

      if (!messages[convId]) messages[convId] = [];
      messages[convId].push(reply);
      renderMessages(messages[convId]);
      UnifiedStorage.set(reply.id, reply, 'messages');

      // Update conversation
      if (conv) {
        conv.lastMessage = replyText;
        conv.updatedAt = Date.now();
        UnifiedStorage.set(conv.id, conv, 'conversations');
        renderConversationList();
      }
    }, 1500 + Math.random() * 2000);
  }

  // ── Subscribe to real-time updates ──────────────────────
  function subscribeToUpdates() {
    // Listen for new codes (balance changes)
    UnifiedStorage.subscribe('codes:new', function () {
      loadCodeBalance();
    });

    UnifiedStorage.subscribe('storage:change', function (data) {
      if (data.type === 'messages' && data.value &&
          data.value.conversationId === activeConversationId &&
          data.value.senderId !== currentUserId) {
        // New message in active conversation from someone else
        if (!messages[activeConversationId]) messages[activeConversationId] = [];
        var exists = messages[activeConversationId].some(function (m) { return m.id === data.value.id; });
        if (!exists) {
          messages[activeConversationId].push(data.value);
          renderMessages(messages[activeConversationId]);
        }
      }

      if (data.type === 'conversations') {
        loadConversations();
      }
    });

    UnifiedStorage.subscribe('storage:refreshed', function (data) {
      if (data.type === 'codes') loadCodeBalance();
    });
  }

  // ── Event listeners ─────────────────────────────────────
  $msgInput.addEventListener('input', function () {
    // Auto-resize
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    updateSendBtn();
  });

  $msgInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  $sendBtn.addEventListener('click', sendMessage);

  $searchInput.addEventListener('input', function () {
    renderConversationList(this.value);
  });

  function updateSendBtn() {
    $sendBtn.disabled = !$msgInput.value.trim();
  }

  // ── Clear chat ──────────────────────────────────────────
  function clearChat() {
    if (!activeConversationId) return;
    if (!confirm('Clear all messages in this conversation?')) return;

    var convMsgs = messages[activeConversationId] || [];
    convMsgs.forEach(function (msg) {
      UnifiedStorage.remove(msg.id, 'messages');
    });

    messages[activeConversationId] = [];
    renderMessages([]);

    var conv = conversations.find(function (c) { return c.id === activeConversationId; });
    if (conv) {
      conv.lastMessage = 'Chat cleared';
      conv.updatedAt = Date.now();
      UnifiedStorage.set(conv.id, conv, 'conversations');
      renderConversationList();
    }
  }

  // ── Utilities ───────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var now = new Date();
    var diff = now - d;

    if (diff < 60000) return 'now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
    if (diff < 86400000) return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    if (diff < 604800000) return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    return d.getDate() + '/' + (d.getMonth() + 1);
  }

  function formatDate(ts) {
    var d = new Date(ts);
    var today = new Date();

    if (d.toDateString() === today.toDateString()) return 'Today';

    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function showNotification(text, type) {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;z-index:99999;font-size:0.85rem;font-family:sans-serif;transition:all 0.3s;' +
      (type === 'error' ? 'background:#dc2626;color:#fff;' : 'background:#22c55e;color:#fff;');
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 300);
    }, 3000);
  }

  // ── Public API (accessible from HTML onclick) ───────────
  window.E7ki = {
    openConversation: openConversation,
    sendMessage: sendMessage,
    clearChat: clearChat,
    getBalance: function () { return codeBalance; }
  };

})();
