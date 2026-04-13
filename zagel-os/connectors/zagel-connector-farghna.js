/**
 * ZAGEL Farghna Connector v2.0.0
 * Video platform integration
 */

(function () {
  'use strict';
  if (window.__ZAGEL_CONNECTOR_FARGHNA__) return;

  class ZagelFarghnaConnector extends (window.ZagelConnectorBase || class {}) {
    constructor() {
      super('farghna', { name: 'Farghna Video', apiBase: '/api/farghna' });
      console.log('🎬 [Connector:Farghna] Ready');
    }

    async getVideoFeed(params = {}) {
      return this.callAPI('/feed', { method: 'GET' }).catch(() => ({ videos: [] }));
    }

    async notifyNewVideo(videoData) {
      if (window.ZagelNotification) {
        await window.ZagelNotification.notify({
          title: '🎬 فيديو جديد على فرغنة',
          body: videoData.title || 'فيديو جديد متاح',
          level: 'knock',
          category: 'content',
          data: videoData
        });
      }
      this.sendEvent('new_video', videoData);
    }

    async trackWatch(videoId, duration) {
      if (window.ZagelBrain) {
        window.ZagelBrain.observe('watch_video', { videoId, duration, app: 'farghna' });
      }
      if (window.ZagelMemory) {
        window.ZagelMemory.remember({ type: 'watched_video', videoId }, { tags: ['farghna', 'video'], tier: 'mid' });
      }
    }
  }

  window.__ZAGEL_CONNECTOR_FARGHNA__ = new ZagelFarghnaConnector();
  window.ZagelFarghna = window.__ZAGEL_CONNECTOR_FARGHNA__;
})();
