/**
 * Type definitions for Zagel Avatar System
 */

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'automation';
  timestamp: number;
}

export interface AvatarState {
  isInitialized: boolean;
  isFlying: boolean;
  currentPage: 'codebank' | 'main' | 'other';
  hasNotification: boolean;
  pulseActive: boolean;
  lastUpdate?: TriggerUpdate;
}

export interface TriggerUpdate {
  type: 'message' | 'video' | 'product' | 'news' | 'code' | 'other';
  title: string;
  description: string;
  timestamp: number;
}

export interface ZagelState {
  isInitialized: boolean;
  isPulsing: boolean;
  isFlying: boolean;
  currentPosition: {
    x: number;
    y: number;
  };
  notifications: TriggerUpdate[];
}

export interface NotificationEvent {
  type: 'trigger' | 'message' | 'update';
  data: TriggerUpdate;
  timestamp: number;
}
