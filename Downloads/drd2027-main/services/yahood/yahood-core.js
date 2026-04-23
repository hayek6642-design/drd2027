/**
 * YAHOOD-CORE.js — News/Content Feed Service
 *
 * Users post/read content. Posting costs codes.
 * Content stored via UnifiedStorage.
 * Uses ServiceBase for auth + storage.
 */

(function () {
  'use strict';

  var POST_COST = 2;
  var posts = [];

  ServiceBase.init({
    name: 'Yahood',

    onReady: function (ctx) {
      loadPosts();

      UnifiedStorage.subscribe('storage:change', function (data) {
        if (data.type === 'posts') loadPosts();
      });

      document.getElementById('create-post-btn')
        ?.addEventListener('click', showPostForm);

      hideLoading();
    },

    onBalanceChange: function (balance) {
      var el = document.getElementById('yahood-balance');
      if (el) el.textContent = '🔐 ' + balance + ' codes';
    }
  });

  function loadPosts() {
    UnifiedStorage.getAll('posts').then(function (data) {
      posts = (data || []).sort(function (a, b) { return b.timestamp - a.timestamp; });
      renderFeed();
    });
  }

  function createPost(title, content, category) {
    if (!title || !content) {
      ServiceBase.notify('Title and content are required!', 'warning');
      return;
    }

    if (ServiceBase.balance < POST_COST) {
      ServiceBase.notify('Need ' + POST_COST + ' codes to post!', 'error');
      return;
    }

    var post = {
      id: 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: title,
      content: content,
      category: category || 'General',
      authorId: ServiceBase.userId,
      authorName: ServiceBase.email.split('@')[0],
      likes: 0,
      comments: [],
      timestamp: Date.now(),
      userId: ServiceBase.userId
    };

    ServiceBase.spendCodes(POST_COST, 'Yahood post: ' + title).then(function () {
      return UnifiedStorage.set(post.id, post, 'posts');
    }).then(function () {
      ServiceBase.notify('📰 Post published!', 'success');
      loadPosts();
    });
  }

  function likePost(postId) {
    var post = posts.find(function (p) { return p.id === postId; });
    if (!post) return;
    post.likes = (post.likes || 0) + 1;
    UnifiedStorage.set(post.id, post, 'posts').then(function () { renderFeed(); });
  }

  function addComment(postId) {
    var text = prompt('Add a comment:');
    if (!text) return;
    var post = posts.find(function (p) { return p.id === postId; });
    if (!post) return;
    if (!post.comments) post.comments = [];
    post.comments.push({
      text: text,
      authorName: ServiceBase.email.split('@')[0],
      timestamp: Date.now()
    });
    UnifiedStorage.set(post.id, post, 'posts').then(function () { renderFeed(); });
  }

  function renderFeed() {
    var el = document.getElementById('news-feed');
    if (!el) return;

    if (posts.length === 0) {
      el.innerHTML = '<div class="empty">No posts yet. Be the first to share! 📰</div>';
      return;
    }

    el.innerHTML = posts.slice(0, 30).map(function (p) {
      var isAuthor = p.authorId === ServiceBase.userId;
      return '<div class="post-card">' +
        '<div class="post-header">' +
          '<span class="post-author">👤 ' + escapeHtml(p.authorName) + '</span>' +
          '<span class="post-category">' + escapeHtml(p.category) + '</span>' +
          '<span class="post-time">' + timeAgo(p.timestamp) + '</span>' +
        '</div>' +
        '<h3 class="post-title">' + escapeHtml(p.title) + '</h3>' +
        '<div class="post-content">' + escapeHtml(p.content) + '</div>' +
        '<div class="post-footer">' +
          '<button onclick="Yahood.like(\'' + p.id + '\')">❤️ ' + (p.likes || 0) + '</button>' +
          '<button onclick="Yahood.comment(\'' + p.id + '\')">💬 ' + ((p.comments || []).length) + '</button>' +
          (isAuthor ? '<button onclick="Yahood.deletePost(\'' + p.id + '\')">🗑️</button>' : '') +
        '</div>' +
        (p.comments && p.comments.length > 0 ?
          '<div class="comments">' +
            p.comments.slice(-3).map(function (c) {
              return '<div class="comment"><b>' + escapeHtml(c.authorName) + '</b>: ' + escapeHtml(c.text) + '</div>';
            }).join('') +
          '</div>' : '') +
      '</div>';
    }).join('');
  }

  function deletePost(postId) {
    var post = posts.find(function (p) { return p.id === postId; });
    if (!post || post.authorId !== ServiceBase.userId) return;
    if (!confirm('Delete this post?')) return;

    UnifiedStorage.remove(postId, 'posts').then(function () {
      ServiceBase.notify('Post deleted.', 'warning');
      loadPosts();
    });
  }

  function showPostForm() {
    var title = prompt('Post title:');
    if (!title) return;
    var content = prompt('Post content:');
    if (!content) return;
    var category = prompt('Category (News, Tech, Fun, Other):') || 'General';
    createPost(title, content, category);
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

  window.Yahood = { post: showPostForm, like: likePost, comment: addComment, deletePost: deletePost, refresh: loadPosts };
})();
