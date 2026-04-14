/**
 * Trigger Listener
 * Monitors for various events and triggers across the system
 */

export interface TriggerUpdate {
  type: 'message' | 'video' | 'product' | 'news' | 'code' | 'other';
  title: string;
  description: string;
  timestamp: number;
}

type TriggerCallback = (update: TriggerUpdate) => void;

export class TriggerListener {
  private callback: TriggerCallback;
  private listeners: Array<() => void> = [];
  private lastProcessedIds = new Set<string>();
  private pollingInterval: number | null = null;

  constructor(callback: TriggerCallback) {
    this.callback = callback;
    this.initializeTriggerListeners();
  }

  private initializeTriggerListeners() {
    // Listen for custom events from the main app
    this.addEventListener('zagel:new-message', this.handleNewMessage.bind(this));
    this.addEventListener('zagel:new-video', this.handleNewVideo.bind(this));
    this.addEventListener('zagel:new-product', this.handleNewProduct.bind(this));
    this.addEventListener('zagel:new-news', this.handleNewNews.bind(this));
    this.addEventListener('zagel:new-code', this.handleNewCode.bind(this));
    this.addEventListener('zagel:new-update', this.handleNewUpdate.bind(this));

    // Poll for updates from localStorage (simulated triggers)
    this.startPolling();

    // Listen for visibility changes to detect app backgrounding
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  private addEventListener(eventName: string, handler: (e: Event) => void) {
    window.addEventListener(eventName, handler);
    this.listeners.push(() => {
      window.removeEventListener(eventName, handler);
    });
  }

  private handleNewMessage(event: Event) {
    const customEvent = event as CustomEvent;
    this.triggerUpdate({
      type: 'message',
      title: customEvent.detail?.title || 'New Message',
      description: customEvent.detail?.description || '',
      timestamp: Date.now(),
    });
  }

  private handleNewVideo(event: Event) {
    const customEvent = event as CustomEvent;
    this.triggerUpdate({
      type: 'video',
      title: customEvent.detail?.title || 'New Video',
      description: customEvent.detail?.description || '',
      timestamp: Date.now(),
    });
  }

  private handleNewProduct(event: Event) {
    const customEvent = event as CustomEvent;
    this.triggerUpdate({
      type: 'product',
      title: customEvent.detail?.title || 'New Pebalaash Product',
      description: customEvent.detail?.description || '',
      timestamp: Date.now(),
    });
  }

  private handleNewNews(event: Event) {
    const customEvent = event as CustomEvent;
    this.triggerUpdate({
      type: 'news',
      title: customEvent.detail?.title || 'News Update',
      description: customEvent.detail?.description || '',
      timestamp: Date.now(),
    });
  }

  private handleNewCode(event: Event) {
    const customEvent = event as CustomEvent;
    this.triggerUpdate({
      type: 'code',
      title: customEvent.detail?.title || 'New Code',
      description: customEvent.detail?.description || '',
      timestamp: Date.now(),
    });
  }

  private handleNewUpdate(event: Event) {
    const customEvent = event as CustomEvent;
    this.triggerUpdate({
      type: 'other',
      title: customEvent.detail?.title || 'Update',
      description: customEvent.detail?.description || '',
      timestamp: Date.now(),
    });
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      // App is backgrounded - Zagel will activate
      console.log('Zagel: App is backgrounded, ready to notify');
    } else {
      // App is back in focus
      console.log('Zagel: App is back in focus');
    }
  }

  private startPolling() {
    // Poll for simulated triggers every 5 seconds
    this.pollingInterval = setInterval(() => {
      this.checkForPendingTriggers();
    }, 5000);
  }

  private checkForPendingTriggers() {
    try {
      const pending = localStorage.getItem('zagel-pending-updates');
      if (pending) {
        const updates = JSON.parse(pending) as TriggerUpdate[];
        
        updates.forEach((update) => {
          const id = `${update.type}-${update.timestamp}`;
          if (!this.lastProcessedIds.has(id)) {
            this.lastProcessedIds.add(id);
            this.triggerUpdate(update);
          }
        });

        // Clear processed updates
        localStorage.removeItem('zagel-pending-updates');
      }
    } catch (error) {
      console.warn('Error checking for triggers:', error);
    }
  }

  private triggerUpdate(update: TriggerUpdate) {
    this.callback(update);
  }

  /**
   * Emit a custom trigger event (for integration with the main app)
   */
  public static emitTrigger(type: TriggerUpdate['type'], title: string, description: string) {
    const event = new CustomEvent(`zagel:new-${type}`, {
      detail: { title, description },
    });
    window.dispatchEvent(event);
  }

  /**
   * Add a pending update to localStorage (for testing)
   */
  public static addPendingUpdate(update: TriggerUpdate) {
    const existing = localStorage.getItem('zagel-pending-updates');
    const updates = existing ? JSON.parse(existing) : [];
    updates.push(update);
    localStorage.setItem('zagel-pending-updates', JSON.stringify(updates));
  }

  /**
   * Cleanup
   */
  public cleanup() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.listeners.forEach((remove) => remove());
    this.listeners = [];

    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }
}
