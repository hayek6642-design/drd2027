/**
 * ACTIVITY HOOKS - Auto-capture all user interactions
 * 
 * Hooks into:
 * - Like/Unlike buttons
 * - Comment forms
 * - Share buttons
 * - Download buttons
 * - Video play/pause
 * - CodeBank generated code
 */

(function (global) {
  'use strict';

  var ActivityHooks = {
    initialized: false,
    hookTargets: [],

    /**
     * Initialize hooks - call on app load
     */
    init: function (options) {
      if (this.initialized) return;
      options = options || {};
      
      console.log('[ActivityHooks] Initializing...');

      // Wait for UserActivityTracker to be ready
      if (window.UserActivityTracker && window.UserActivityTracker.ready) {
        window.UserActivityTracker.ready.then(function () {
          ActivityHooks._setupHooks(options);
        });
      } else {
        // Fallback: retry after delay
        var retry = setInterval(function () {
          if (window.UserActivityTracker && window.UserActivityTracker.ready) {
            clearInterval(retry);
            window.UserActivityTracker.ready.then(function () {
              ActivityHooks._setupHooks(options);
            });
          }
        }, 100);
      }
    },

    /**
     * SETUP HOOKS (internal)
     */
    _setupHooks: function (options) {
      console.log('[ActivityHooks] Setting up all hooks...');

      // Like/Unlike hooks
      ActivityHooks._hookLikeButtons();

      // Comment hooks
      ActivityHooks._hookCommentForms();

      // Share hooks
      ActivityHooks._hookShareButtons();

      // Download hooks
      ActivityHooks._hookDownloadButtons();

      // Video playback hooks
      ActivityHooks._hookVideoPlayback();

      // Watch time counter hooks
      ActivityHooks._hookWatchTimeCounter();

      // CodeBank code generation hooks
      ActivityHooks._hookCodeGeneration();

      // Restoration hooks
      ActivityHooks._restorePersistedState();

      this.initialized = true;
      console.log('[ActivityHooks] All hooks initialized');

      // Auto-sync every 30 seconds
      if (options.autoSync !== false) {
        setInterval(function () {
          UserActivityTracker.syncWithServer(options.syncEndpoint || '/api/activity/sync').catch(function (err) {
            // Retry silently
          });
        }, 30000);
      }
    },

    /**
     * LIKE/UNLIKE BUTTONS
     */
    _hookLikeButtons: function () {
      // Selector: [data-action="like"], [data-action="unlike"], .like-btn, .heart-btn, etc.
      var likeButtons = document.querySelectorAll('[data-action="like"], [data-action="unlike"], .like-btn, .heart-btn, [class*="like"]');

      likeButtons.forEach(function (btn) {
        if (btn._activityHooked) return;

        btn._activityHooked = true;
        var originalClick = btn.onclick;

        btn.addEventListener('click', function (e) {
          var videoId = btn.dataset.videoId || btn.dataset.itemId || btn.closest('[data-video-id], [data-item-id]')?.dataset.videoId;
          var service = btn.dataset.service || ActivityHooks._getServiceContext();

          if (videoId && service) {
            UserActivityTracker.saveAction(service, 'like', videoId, {
              liked: true,
              timestamp: Date.now()
            }).catch(function (err) {
              console.warn('[ActivityHooks] Like save failed:', err);
            });
          }
        });
      });
    },

    /**
     * COMMENT FORMS
     */
    _hookCommentForms: function () {
      var commentForms = document.querySelectorAll('[data-action="comment"], .comment-form, [class*="comment"]');

      commentForms.forEach(function (form) {
        if (form._activityHooked) return;
        form._activityHooked = true;

        form.addEventListener('submit', function (e) {
          // e.preventDefault(); // Let original handler run
          
          var videoId = form.dataset.videoId || form.closest('[data-video-id]')?.dataset.videoId;
          var service = form.dataset.service || ActivityHooks._getServiceContext();
          var textArea = form.querySelector('textarea, input[type="text"]');
          var commentText = textArea ? textArea.value : '';

          if (videoId && service && commentText.trim()) {
            UserActivityTracker.saveAction(service, 'comment', videoId, {
              text: commentText.substring(0, 500),
              timestamp: Date.now()
            }).catch(function (err) {
              console.warn('[ActivityHooks] Comment save failed:', err);
            });
          }
        });
      });
    },

    /**
     * SHARE BUTTONS
     */
    _hookShareButtons: function () {
      var shareButtons = document.querySelectorAll('[data-action="share"], .share-btn, [class*="share"]');

      shareButtons.forEach(function (btn) {
        if (btn._activityHooked) return;
        btn._activityHooked = true;

        btn.addEventListener('click', function (e) {
          var videoId = btn.dataset.videoId || btn.closest('[data-video-id]')?.dataset.videoId;
          var service = btn.dataset.service || ActivityHooks._getServiceContext();
          var platform = btn.dataset.platform || 'unknown';

          if (videoId && service) {
            UserActivityTracker.saveAction(service, 'share', videoId, {
              platform: platform,
              timestamp: Date.now()
            }).catch(function (err) {
              console.warn('[ActivityHooks] Share save failed:', err);
            });
          }
        });
      });
    },

    /**
     * DOWNLOAD BUTTONS
     */
    _hookDownloadButtons: function () {
      var downloadButtons = document.querySelectorAll('[data-action="download"], .download-btn, [class*="download"]');

      downloadButtons.forEach(function (btn) {
        if (btn._activityHooked) return;
        btn._activityHooked = true;

        btn.addEventListener('click', function (e) {
          var videoId = btn.dataset.videoId || btn.closest('[data-video-id]')?.dataset.videoId;
          var service = btn.dataset.service || ActivityHooks._getServiceContext();
          var quality = btn.dataset.quality || 'auto';

          if (videoId && service) {
            UserActivityTracker.saveAction(service, 'download', videoId, {
              quality: quality,
              timestamp: Date.now()
            }).catch(function (err) {
              console.warn('[ActivityHooks] Download save failed:', err);
            });
          }
        });
      });
    },

    /**
     * VIDEO PLAYBACK HOOKS
     */
    _hookVideoPlayback: function () {
      var videos = document.querySelectorAll('video, [data-video-player], .video-player');

      videos.forEach(function (videoEl) {
        if (videoEl._activityHooked) return;
        videoEl._activityHooked = true;

        var videoId = videoEl.dataset.videoId || videoEl.id;
        var service = videoEl.dataset.service || ActivityHooks._getServiceContext();

        // Track when video plays
        if (videoEl.tagName === 'VIDEO') {
          videoEl.addEventListener('play', function () {
            console.log('[ActivityHooks] Video play: ' + videoId);
          });

          videoEl.addEventListener('pause', function () {
            console.log('[ActivityHooks] Video paused: ' + videoId);
            if (videoId && service) {
              UserActivityTracker.saveWatchTime(
                service,
                videoId,
                videoEl.currentTime,
                videoEl.duration,
                { title: videoEl.title || videoEl.dataset.title }
              ).catch(function (err) {
                console.warn('[ActivityHooks] Watch time save failed:', err);
              });
            }
          });

          // Auto-save watch time every 10 seconds
          videoEl._watchTimeInterval = setInterval(function () {
            if (!videoEl.paused && videoId && service) {
              UserActivityTracker.saveWatchTime(
                service,
                videoId,
                videoEl.currentTime,
                videoEl.duration,
                { autoSave: true }
              ).catch(function (err) {
                // Silent
              });
            }
          }, 10000);
        }
      });
    },

    /**
     * WATCH TIME COUNTER HOOKS
     */
    _hookWatchTimeCounter: function () {
      var counter = document.getElementById('watch-time') || document.getElementById('counter');
      if (!counter) return;

      console.log('[ActivityHooks] Watch time counter found, tracking...');

      // Observe counter changes
      var originalTextContent = counter.textContent;
      var originalInnerHTML = counter.innerHTML;

      // Use MutationObserver to track changes
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            var newValue = counter.textContent || counter.innerText;
            
            // Save counter value to storage
            localStorage.setItem('uact_watch_counter', JSON.stringify({
              value: newValue,
              timestamp: Date.now()
            }));

            // Sync to tracker
            UserActivityTracker.ready.then(function () {
              idbPut('watchTime', {
                contentId: 'global_watch_counter',
                service: 'global',
                counterValue: newValue,
                lastUpdated: Date.now()
              }).catch(function (err) {
                // Silent
              });
            }).catch(function (err) {
              // Silent
            });
          }
        });
      });

      observer.observe(counter, {
        childList: true,
        characterData: true,
        subtree: true
      });

      console.log('[ActivityHooks] Watch time counter observer attached');
    },

    /**
     * CODE GENERATION HOOKS
     */
    _hookCodeGeneration: function () {
      // Hook the writeCode function in CodeBank
      if (window.writeCode) {
        var originalWriteCode = window.writeCode;
        window.writeCode = function (language, code, codeId) {
          // Call original
          var result = originalWriteCode.apply(this, arguments);

          // Save to tracker
          codeId = codeId || 'code_' + Date.now();
          UserActivityTracker.saveCode('safecode', codeId, {
            language: language,
            content: code,
            title: language + ' - ' + new Date().toLocaleString()
          }).catch(function (err) {
            console.warn('[ActivityHooks] Code save failed:', err);
          });

          return result;
        };
      }

      // Also hook any code output buttons
      var codeOutputBtns = document.querySelectorAll('[data-action="save-code"], .save-code-btn, [class*="save-code"]');
      codeOutputBtns.forEach(function (btn) {
        if (btn._activityHooked) return;
        btn._activityHooked = true;

        btn.addEventListener('click', function (e) {
          var codeContent = btn.dataset.content || btn.closest('[data-code-block]')?.textContent;
          var language = btn.dataset.language || 'javascript';

          if (codeContent) {
            UserActivityTracker.saveCode('safecode', 'code_' + Date.now(), {
              language: language,
              content: codeContent,
              title: language + ' code - ' + new Date().toLocaleString()
            }).catch(function (err) {
              console.warn('[ActivityHooks] Code save failed:', err);
            });
          }
        });
      });
    },

    /**
     * RESTORE PERSISTED STATE
     */
    _restorePersistedState: function () {
      console.log('[ActivityHooks] Restoring persisted activity...');

      // Restore watch counter
      var savedCounter = localStorage.getItem('uact_watch_counter');
      if (savedCounter) {
        try {
          var counterData = JSON.parse(savedCounter);
          var counter = document.getElementById('watch-time') || document.getElementById('counter');
          if (counter) {
            console.log('[ActivityHooks] Restored watch counter: ' + counterData.value);
            // Don't overwrite unless needed - just log restoration
          }
        } catch (e) {
          // Ignore
        }
      }

      // Restore all activities from UserActivityTracker
      UserActivityTracker.restoreAll(function (results) {
        console.log('[ActivityHooks] Activities restored: ' + JSON.stringify(results.map(function (r) { return r.length; })));

        // Update UI with restored state
        ActivityHooks._updateUIWithRestoredState(results);
      });
    },

    /**
     * UPDATE UI WITH RESTORED STATE
     */
    _updateUIWithRestoredState: function (results) {
      // results[0] = watch times
      // results[1] = actions
      // results[2] = codes

      var watchTimes = results[0];
      var actions = results[1];
      var codes = results[2];

      // Restore liked videos
      var likes = actions.filter(function (a) { return a.action === 'like'; });
      likes.forEach(function (like) {
        var likeBtn = document.querySelector('[data-video-id="' + like.itemId + '"] [data-action="like"], [data-video-id="' + like.itemId + '"] .like-btn');
        if (likeBtn) {
          likeBtn.classList.add('liked', 'active');
          likeBtn.innerHTML = '❤️ Liked';
        }
      });

      // Restore watch progress
      watchTimes.forEach(function (watch) {
        var videoEl = document.querySelector('[data-video-id="' + watch.contentId + '"]');
        if (videoEl && videoEl.tagName === 'VIDEO') {
          // Don't auto-play, just note it was watched
          console.log('[ActivityHooks] Ready to resume ' + watch.contentId + ' at ' + watch.currentTime + 's');
        }
      });

      console.log('[ActivityHooks] UI state restored');
    },

    /**
     * HELPER: Get service context from current page
     */
    _getServiceContext: function () {
      // Try to detect from URL
      var pathParts = window.location.pathname.split('/');
      if (pathParts[1] && pathParts[1].length > 0) {
        return pathParts[1];
      }

      // Try to detect from element
      var serviceEl = document.querySelector('[data-service]');
      if (serviceEl && serviceEl.dataset.service) {
        return serviceEl.dataset.service;
      }

      // Try to detect from window variable
      if (window.currentService) {
        return window.currentService;
      }

      // Default
      return 'farragna';
    }
  };

  global.ActivityHooks = ActivityHooks;

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      ActivityHooks.init();
    });
  } else {
    // Already loaded
    setTimeout(function () {
      ActivityHooks.init();
    }, 100);
  }
})(window);
