// Notification System for Real-time Updates
// Provides instant updates and alerts across all platforms
// Supports WebSocket, push notifications, email, and SMS

import { errorHandler } from './advanced-error-handler.js';
import { transactionMonitor } from './transaction-monitor.js';

export class NotificationManager {
    constructor(options = {}) {
        this.enableWebSocket = options.enableWebSocket !== false;
        this.enablePushNotifications = options.enablePushNotifications !== false;
        this.enableEmail = options.enableEmail !== false;
        this.enableSMS = options.enableSMS !== false;

        // Notification storage
        this.notifications = new Map();
        this.userPreferences = new Map();
        this.notificationHistory = [];

        // WebSocket connection
        this.websocket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        // Push notification support
        this.pushSubscription = null;
        this.serviceWorkerRegistration = null;

        // External services
        this.emailService = options.emailService;
        this.smsService = options.smsService;

        // Initialize
        this._initializeWebSocket();
        this._initializePushNotifications();
        this._loadPersistedData();

        console.log('🚀 Notification Manager initialized');
    }

    // Send notification to user
    async sendNotification(userId, notificationData) {
        const notificationId = notificationData.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2)}`;

        try {
            console.log('📢 Sending notification:', notificationId, notificationData);

            const notification = {
                id: notificationId,
                userId,
                type: notificationData.type, // 'info', 'success', 'warning', 'error', 'transaction'
                title: notificationData.title,
                message: notificationData.message,
                data: notificationData.data || {},
                priority: notificationData.priority || 'normal', // 'low', 'normal', 'high', 'urgent'
                channels: notificationData.channels || this._getUserPreferredChannels(userId),
                read: false,
                createdAt: new Date().toISOString(),
                expiresAt: notificationData.expiresAt || this._calculateExpiry(notificationData.priority)
            };

            // Store notification
            this.notifications.set(notificationId, notification);

            // Add to user notifications
            if (!this.userNotifications.has(userId)) {
                this.userNotifications.set(userId, []);
            }
            this.userNotifications.get(userId).unshift(notification);

            // Send via preferred channels
            await this._sendViaChannels(notification);

            // Add to history
            this._addToNotificationHistory(notification);

            // Record transaction
            transactionMonitor.recordTransactionComplete(`notification_${notificationId}`, true, null, {
                notificationId,
                type: notification.type,
                channels: notification.channels
            });

            console.log('✅ Notification sent:', notificationId);
            return notification;

        } catch (error) {
            console.error('Error sending notification:', error);
            transactionMonitor.recordError(error, 'notification_send', {
                notificationId,
                userId,
                type: notificationData.type
            });
            throw error;
        }
    }

    // Send transaction notification
    async sendTransactionNotification(userId, transactionData) {
        const notifications = [];

        switch (transactionData.status) {
            case 'completed':
                notifications.push({
                    type: 'success',
                    title: 'Transaction Completed',
                    message: `Your transaction of ${transactionData.amount} ${transactionData.assetType} has been completed successfully.`,
                    data: transactionData,
                    priority: 'normal'
                });
                break;

            case 'failed':
                notifications.push({
                    type: 'error',
                    title: 'Transaction Failed',
                    message: `Your transaction of ${transactionData.amount} ${transactionData.assetType} has failed. ${transactionData.error || ''}`,
                    data: transactionData,
                    priority: 'high'
                });
                break;

            case 'pending':
                notifications.push({
                    type: 'info',
                    title: 'Transaction Pending',
                    message: `Your transaction of ${transactionData.amount} ${transactionData.assetType} is being processed.`,
                    data: transactionData,
                    priority: 'low'
                });
                break;
        }

        const results = [];
        for (const notificationData of notifications) {
            try {
                const result = await this.sendNotification(userId, notificationData);
                results.push(result);
            } catch (error) {
                console.error('Error sending transaction notification:', error);
                results.push({ error: error.message });
            }
        }

        return results;
    }

    // Get user notifications
    getUserNotifications(userId, filters = {}) {
        const userNotifs = this.userNotifications.get(userId) || [];

        let notifications = [...userNotifs];

        if (filters.unreadOnly) {
            notifications = notifications.filter(n => !n.read);
        }

        if (filters.type) {
            notifications = notifications.filter(n => n.type === filters.type);
        }

        if (filters.priority) {
            notifications = notifications.filter(n => n.priority === filters.priority);
        }

        if (filters.limit) {
            notifications = notifications.slice(0, filters.limit);
        }

        return notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Mark notification as read
    async markAsRead(notificationId, userId) {
        try {
            const notification = this.notifications.get(notificationId);
            if (!notification && notification.userId !== userId) {
                throw new Error('Notification not found or not owned by user');
            }

            notification.read = true;
            notification.readAt = new Date().toISOString();

            console.log('✅ Notification marked as read:', notificationId);
            return true;

        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    // Mark all user notifications as read
    async markAllAsRead(userId) {
        try {
            const userNotifs = this.userNotifications.get(userId) || [];
            let markedCount = 0;

            for (const notification of userNotifs) {
                if (!notification.read) {
                    notification.read = true;
                    notification.readAt = new Date().toISOString();
                    markedCount++;
                }
            }

            console.log('✅ Marked all notifications as read for user:', userId, `(${markedCount} notifications)`);
            return markedCount;

        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }

    // Set user notification preferences
    async setUserPreferences(userId, preferences) {
        try {
            console.log('⚙️ Setting notification preferences for user:', userId, preferences);

            const userPrefs = {
                email: preferences.email ?? true,
                push: preferences.push ?? true,
                inApp: preferences.inApp ?? true,
                sms: preferences.sms ?? false,
                types: preferences.types || ['info', 'success', 'warning', 'error'],
                quietHours: preferences.quietHours || { start: '22:00', end: '08:00' },
                updatedAt: new Date().toISOString()
            };

            this.userPreferences.set(userId, userPrefs);

            // Persist preferences
            this._persistUserPreferences();

            console.log('✅ User preferences updated:', userId);
            return userPrefs;

        } catch (error) {
            console.error('Error setting user preferences:', error);
            throw error;
        }
    }

    // Get user notification preferences
    getUserPreferences(userId) {
        return this.userPreferences.get(userId) || {
            email: true,
            push: true,
            inApp: true,
            sms: false,
            types: ['info', 'success', 'warning', 'error'],
            quietHours: { start: '22:00', end: '08:00' }
        };
    }

    // Get notification statistics
    getNotificationStats(userId = null) {
        let notifications = [];

        if (userId) {
            notifications = this.userNotifications.get(userId) || [];
        } else {
            // Get all notifications
            for (const userNotifs of this.userNotifications.values()) {
                notifications.push(...userNotifs);
            }
        }

        const stats = {
            total: notifications.length,
            unread: notifications.filter(n => !n.read).length,
            byType: {},
            byPriority: {},
            byChannel: {}
        };

        for (const notification of notifications) {
            // By type
            stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;

            // By priority
            stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;

            // By channel (would need to track delivery channels)
        }

        return stats;
    }

    // Send via multiple channels
    async _sendViaChannels(notification) {
        const promises = [];
        const channels = notification.channels || this._getUserPreferredChannels(notification.userId);

        for (const channel of channels) {
            switch (channel) {
                case 'websocket':
                    if (this.enableWebSocket) {
                        promises.push(this._sendWebSocketNotification(notification));
                    }
                    break;

                case 'push':
                    if (this.enablePushNotifications) {
                        promises.push(this._sendPushNotification(notification));
                    }
                    break;

                case 'email':
                    if (this.enableEmail) {
                        promises.push(this._sendEmailNotification(notification));
                    }
                    break;

                case 'sms':
                    if (this.enableSMS) {
                        promises.push(this._sendSMSNotification(notification));
                    }
                    break;

                case 'inApp':
                    promises.push(this._sendInAppNotification(notification));
                    break;
            }
        }

        await Promise.allSettled(promises);
    }

    // WebSocket notification
    async _sendWebSocketNotification(notification) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not connected, skipping WebSocket notification');
            return;
        }

        try {
            this.websocket.send(JSON.stringify({
                type: 'notification',
                data: notification
            }));
        } catch (error) {
            console.error('Error sending WebSocket notification:', error);
        }
    }

    // Push notification
    async _sendPushNotification(notification) {
        if (!this.pushSubscription) {
            console.warn('Push subscription not available');
            return;
        }

        try {
            const payload = JSON.stringify({
                title: notification.title,
                body: notification.message,
                icon: '/icon-192x192.png',
                badge: '/badge-72x72.png',
                data: notification.data
            });

            await fetch('/api/push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscription: this.pushSubscription,
                    payload
                })
            });
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    }

    // Email notification
    async _sendEmailNotification(notification) {
        if (!this.emailService) {
            console.warn('Email service not configured');
            return;
        }

        try {
            await this.emailService.send({
                to: notification.userId, // Would need to resolve user email
                subject: notification.title,
                html: this._formatEmailContent(notification),
                text: notification.message
            });
        } catch (error) {
            console.error('Error sending email notification:', error);
        }
    }

    // SMS notification
    async _sendSMSNotification(notification) {
        if (!this.smsService) {
            console.warn('SMS service not configured');
            return;
        }

        try {
            await this.smsService.send({
                to: notification.userId, // Would need to resolve user phone
                message: `${notification.title}: ${notification.message}`
            });
        } catch (error) {
            console.error('Error sending SMS notification:', error);
        }
    }

    // In-app notification
    async _sendInAppNotification(notification) {
        // Show toast or in-app notification
        if (window.showToast) {
            window.showToast(notification.message, notification.type);
        } else {
            // Fallback to browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(notification.title, {
                    body: notification.message,
                    icon: '/icon-192x192.png'
                });
            }
        }
    }

    // Get user preferred channels
    _getUserPreferredChannels(userId) {
        const preferences = this.userPreferences.get(userId);
        const channels = [];

        if (preferences) {
            if (preferences.inApp) channels.push('inApp');
            if (preferences.push && this.enablePushNotifications) channels.push('push');
            if (preferences.email && this.enableEmail) channels.push('email');
            if (preferences.sms && this.enableSMS) channels.push('sms');
            if (this.enableWebSocket) channels.push('websocket');
        } else {
            // Default channels
            channels.push('inApp');
            if (this.enableWebSocket) channels.push('websocket');
        }

        return channels;
    }

    // Calculate notification expiry
    _calculateExpiry(priority) {
        const now = new Date();
        const expiryHours = {
            'low': 24,
            'normal': 72,
            'high': 168, // 1 week
            'urgent': 720 // 30 days
        };

        const hours = expiryHours[priority] || 72;
        now.setHours(now.getHours() + hours);

        return now.toISOString();
    }

    // Format email content
    _formatEmailContent(notification) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">${notification.title}</h2>
                <p style="color: #666; line-height: 1.6;">${notification.message}</p>
                <div style="margin-top: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 5px;">
                    <small style="color: #888;">
                        Type: ${notification.type} |
                        Priority: ${notification.priority} |
                        Sent: ${new Date(notification.createdAt).toLocaleString()}
                    </small>
                </div>
            </div>
        `;
    }

    // Initialize WebSocket connection
    _initializeWebSocket() {
        if (!this.enableWebSocket) return;

        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws/notifications`;

            this.websocket = new WebSocket(wsUrl);

            this.websocket.onopen = () => {
                console.log('🔌 WebSocket connected');
                this.reconnectAttempts = 0;
            };

            this.websocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this._handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Error handling WebSocket message:', error);
                }
            };

            this.websocket.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                this._scheduleReconnect();
            };

            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
        }
    }

    // Handle WebSocket message
    _handleWebSocketMessage(message) {
        switch (message.type) {
            case 'notification':
                this._handleIncomingNotification(message.data);
                break;

            case 'notification_read':
                this.markAsRead(message.notificationId, message.userId);
                break;

            case 'preferences_update':
                this.setUserPreferences(message.userId, message.preferences);
                break;
        }
    }

    // Handle incoming notification via WebSocket
    _handleIncomingNotification(notificationData) {
        const notification = {
            ...notificationData,
            receivedVia: 'websocket',
            receivedAt: new Date().toISOString()
        };

        // Store and display
        this.notifications.set(notification.id, notification);

        if (!this.userNotifications.has(notification.userId)) {
            this.userNotifications.set(notification.userId, []);
        }
        this.userNotifications.get(notification.userId).unshift(notification);

        // Show in-app notification
        this._sendInAppNotification(notification);
    }

    // Schedule WebSocket reconnection
    _scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff

        setTimeout(() => {
            console.log(`🔄 Attempting WebSocket reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this._initializeWebSocket();
        }, delay);
    }

    // Initialize push notifications
    async _initializePushNotifications() {
        if (!this.enablePushNotifications || !('serviceWorker' in navigator)) {
            return;
        }
        try {
            const isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
            const disableSW = /([?&])disable_sw=1\b/.test(location.search);
            if (isLocal || disableSW) {
                return;
            }
            this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
            this.pushSubscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
            console.log('📱 Push notifications initialized');
        } catch (error) {
            console.error('Failed to initialize push notifications:', error);
        }
    }

    // Add to notification history
    _addToNotificationHistory(notification) {
        this.notificationHistory.unshift(notification);

        // Keep only recent history (last 5000 entries)
        if (this.notificationHistory.length > 5000) {
            this.notificationHistory = this.notificationHistory.slice(0, 5000);
        }

        // Persist periodically
        if (this.notificationHistory.length % 100 === 0) {
            this._persistNotificationHistory();
        }
    }

    // Persist user preferences
    _persistUserPreferences() {
        try {
            const preferences = {};
            for (const [userId, prefs] of this.userPreferences.entries()) {
                preferences[userId] = prefs;
            }
            localStorage.setItem('notification_preferences', JSON.stringify(preferences));
        } catch (error) {
            console.warn('Failed to persist user preferences:', error);
        }
    }

    // Persist notification history
    _persistNotificationHistory() {
        try {
            localStorage.setItem('notification_history', JSON.stringify(this.notificationHistory.slice(0, 1000)));
        } catch (error) {
            console.warn('Failed to persist notification history:', error);
        }
    }

    // Load persisted data
    _loadPersistedData() {
        try {
            // Load user preferences
            const preferencesData = localStorage.getItem('notification_preferences');
            if (preferencesData) {
                const preferences = JSON.parse(preferencesData);
                for (const [userId, prefs] of Object.entries(preferences)) {
                    this.userPreferences.set(userId, prefs);
                }
                console.log(`⚙️ Loaded preferences for ${this.userPreferences.size} users`);
            }

            // Load notification history
            const historyData = localStorage.getItem('notification_history');
            if (historyData) {
                const history = JSON.parse(historyData);
                this.notificationHistory = history;
                console.log(`📚 Loaded ${history.length} notification history entries`);
            }

        } catch (error) {
            console.warn('Failed to load persisted notification data:', error);
        }
    }

    // Get manager statistics
    getManagerStats() {
        return {
            websocket: {
                connected: this.websocket?.readyState === WebSocket.OPEN,
                reconnectAttempts: this.reconnectAttempts
            },
            pushNotifications: {
                enabled: this.enablePushNotifications,
                subscribed: !!this.pushSubscription
            },
            channels: {
                email: this.enableEmail,
                sms: this.enableSMS
            },
            totalNotifications: this.notifications.size,
            totalUsers: this.userPreferences.size,
            historySize: this.notificationHistory.length
        };
    }

    // Clean up expired notifications
    cleanupExpiredNotifications() {
        const now = new Date();
        let cleanedCount = 0;

        for (const [notificationId, notification] of this.notifications.entries()) {
            if (new Date(notification.expiresAt) < now) {
                this.notifications.delete(notificationId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} expired notifications`);
        }

        return cleanedCount;
    }

    // Destroy notification manager
    destroy() {
        if (this.websocket) {
            this.websocket.close();
        }

        this.notifications.clear();
        this.userPreferences.clear();
        this.notificationHistory = [];

        console.log('💥 Notification Manager destroyed');
    }
}

// Create global instance
export const notificationManager = new NotificationManager({
    enableWebSocket: true,
    enablePushNotifications: 'serviceWorker' in navigator,
    enableEmail: false, // Would need email service configuration
    enableSMS: false     // Would need SMS service configuration
});

// Auto-initialize
if (typeof window !== 'undefined') {
    window.notificationManager = notificationManager;
    console.log('🚀 Notification Manager ready');
}

export default NotificationManager;
