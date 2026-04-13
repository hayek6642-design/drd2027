/**
 * BATTALOODA-CORE.js — Music/Audio Studio Service
 *
 * Users create and share audio tracks. Premium features cost codes.
 * Track metadata stored via UnifiedStorage.
 * Uses ServiceBase for auth + storage.
 */

(function () {
  'use strict';

  var PUBLISH_COST = 5;
  var tracks = [];
  var myTracks = [];

  ServiceBase.init({
    name: 'Battalooda',

    onReady: function (ctx) {
      loadTracks();

      UnifiedStorage.subscribe('storage:change', function (data) {
        if (data.type === 'tracks') loadTracks();
      });

      hideLoading();
    },

    onBalanceChange: function (balance) {
      var el = document.getElementById('battalooda-balance');
      if (el) el.textContent = '🔐 ' + balance + ' codes';
    }
  });

  function loadTracks() {
    UnifiedStorage.getAll('tracks').then(function (data) {
      var all = data || [];
      tracks = all.filter(function (t) { return t.status === 'published'; })
                  .sort(function (a, b) { return b.timestamp - a.timestamp; });
      myTracks = all.filter(function (t) { return t.creatorId === ServiceBase.userId; });
      renderBrowser();
      renderMyTracks();
    });
  }

  function publishTrack(title, genre, duration) {
    if (!title) {
      ServiceBase.notify('Track needs a title!', 'warning');
      return;
    }

    if (ServiceBase.balance < PUBLISH_COST) {
      ServiceBase.notify('Need ' + PUBLISH_COST + ' codes to publish!', 'error');
      return;
    }

    var track = {
      id: 'track_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: title,
      genre: genre || 'Unknown',
      duration: duration || 0,
      creatorId: ServiceBase.userId,
      creatorName: ServiceBase.email.split('@')[0],
      plays: 0,
      likes: 0,
      status: 'published',
      timestamp: Date.now(),
      userId: ServiceBase.userId
    };

    ServiceBase.spendCodes(PUBLISH_COST, 'Battalooda publish: ' + title).then(function () {
      return UnifiedStorage.set(track.id, track, 'tracks');
    }).then(function () {
      ServiceBase.notify('🎵 Track "' + title + '" published!', 'success');
      loadTracks();
    });
  }

  function playTrack(trackId) {
    var track = tracks.find(function (t) { return t.id === trackId; });
    if (!track) return;

    track.plays = (track.plays || 0) + 1;
    UnifiedStorage.set(track.id, track, 'tracks');

    var el = document.getElementById('now-playing');
    if (el) el.textContent = '🎶 Now playing: ' + track.title + ' by ' + track.creatorName;

    ServiceBase.notify('▶️ Playing: ' + track.title, 'success');
  }

  function likeTrack(trackId) {
    var track = tracks.find(function (t) { return t.id === trackId; });
    if (!track) return;

    track.likes = (track.likes || 0) + 1;
    UnifiedStorage.set(track.id, track, 'tracks');
    ServiceBase.notify('❤️ Liked: ' + track.title, 'success');
    renderBrowser();
  }

  function renderBrowser() {
    var el = document.getElementById('track-browser');
    if (!el) return;

    if (tracks.length === 0) {
      el.innerHTML = '<div class="empty">No tracks published yet. Be the first! 🎵</div>';
      return;
    }

    el.innerHTML = tracks.map(function (t) {
      return '<div class="track-card">' +
        '<div class="track-art">🎵</div>' +
        '<div class="track-info">' +
          '<div class="track-title">' + escapeHtml(t.title) + '</div>' +
          '<div class="track-artist">' + escapeHtml(t.creatorName) + ' · ' + escapeHtml(t.genre) + '</div>' +
          '<div class="track-stats">▶️ ' + t.plays + ' · ❤️ ' + t.likes + '</div>' +
        '</div>' +
        '<div class="track-actions">' +
          '<button onclick="Battalooda.play(\'' + t.id + '\')">▶️</button>' +
          '<button onclick="Battalooda.like(\'' + t.id + '\')">❤️</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderMyTracks() {
    var el = document.getElementById('my-tracks');
    if (!el) return;
    if (myTracks.length === 0) { el.innerHTML = '<div class="empty">You haven\'t published any tracks.</div>'; return; }
    el.innerHTML = myTracks.map(function (t) {
      return '<div class="track-card mine"><div class="track-title">' + escapeHtml(t.title) +
        '</div><div class="track-stats">▶️ ' + (t.plays||0) + ' · ❤️ ' + (t.likes||0) + ' · ' + t.status + '</div></div>';
    }).join('');
  }

  function showPublishForm() {
    var title = prompt('Track title:');
    if (!title) return;
    var genre = prompt('Genre (e.g. Pop, Hip-Hop, Electronic):') || 'Other';
    publishTrack(title, genre, 0);
  }

  function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function hideLoading() {
    var el = document.getElementById('loadingOverlay');
    if (el) { el.classList.add('hidden'); setTimeout(function () { el.style.display = 'none'; }, 300); }
  }

  window.Battalooda = { publish: showPublishForm, play: playTrack, like: likeTrack, refresh: loadTracks };
})();
