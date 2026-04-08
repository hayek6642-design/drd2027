// Global Prayer Communication Bridge
// Handles cross-platform communication for the global azan system

class GlobalPrayerCommunication {
    constructor() {
        this.messageHandlers = new Map();
        this.componentRegistry = new Map();
        this.messageQueue = [];
        this.isInitialized = false;
        
        this.initializeCommunication();
    }

    initializeCommunication() {
        console.log('🌐 Initializing Global Prayer Communication Bridge...');
        
        // Setup message listeners
        this.setupGlobalMessageListeners();
        
        // Register platform components
        this.registerPlatformComponents();
        
        // Start message processing
        this.startMessageProcessing();
        
        // Setup communication monitoring
        this.setupCommunicationMonitoring();
        
        this.isInitialized = true;
        console.log('✅ Global Prayer Communication Bridge initialized');
    }

    setupGlobalMessageListeners() {
        // Listen for all platform messages
        window.addEventListener('message', (event) => {
            this.handleIncomingMessage(event);
        });

        // Listen for custom events
        document.addEventListener('globalPrayerMessage', (event) => {
            this.handleCustomEvent(event.detail);
        });

        // Listen for storage events (for cross-tab communication)
        window.addEventListener('storage', (event) => {
            if (event.key && event.key.startsWith('globalPrayer_')) {
                this.handleStorageEvent(event);
            }
        });
    }

    registerPlatformComponents() {
        // Register all known platform components
        const components = [
            {
                name: 'youtube',
                description: 'YouTube Video Player',
                messageTypes: ['MUTE_AUDIO', 'UNMUTE_AUDIO', 'SET_VOLUME', 'GET_STATUS'],
                autoMute: true
            },
            {
                name: 'games',
                description: 'Gaming Platform',
                messageTypes: ['MUTE_AUDIO', 'UNMUTE_AUDIO', 'PAUSE_GAME', 'RESUME_GAME'],
                autoMute: true
            },
            {
                name: 'samma3ny',
                description: 'Samma3ny Audio Platform',
                messageTypes: ['MUTE_AUDIO', 'UNMUTE_AUDIO', 'PAUSE_AUDIO', 'RESUME_AUDIO'],
                autoMute: true
            },
            {
                name: 'farragna',
                description: 'Farragna Video Platform',
                messageTypes: ['MUTE_AUDIO', 'UNMUTE_AUDIO', 'PAUSE_VIDEO', 'RESUME_VIDEO'],
                autoMute: true
            },
            {
                name: 'oneworld',
                description: 'OneWorld Platform',
                messageTypes: ['MUTE_AUDIO', 'UNMUTE_AUDIO', 'PAUSE_CONTENT', 'RESUME_CONTENT'],
                autoMute: true
            },
            {
                name: 'e7ki',
                description: 'E7ki Platform',
                messageTypes: ['MUTE_AUDIO', 'UNMUTE_AUDIO', 'PAUSE_STREAM', 'RESUME_STREAM'],
                autoMute: true
            },
            {
                name: 'community',
                description: 'Community Chat',
                messageTypes: ['MUTE_AUDIO', 'UNMUTE_AUDIO', 'MUTE_CHAT', 'UNMUTE_CHAT'],
                autoMute: false
            },
            {
                name: 'music',
                description: 'Music Player',
                messageTypes: ['MUTE_AUDIO', 'UNMUTE_AUDIO', 'PAUSE_MUSIC', 'RESUME_MUSIC'],
                autoMute: true
            },
            {
                name: 'radio',
                description: 'Radio Streams',
                messageTypes: ['MUTE_AUDIO', 'UNMUTE_AUDIO', 'PAUSE_RADIO', 'RESUME_RADIO'],
                autoMute: true
            },
            {
                name: 'podcast',
                description: 'Podcast Player',
                messageTypes: ['MUTE_AUDIO', 'UNMUTE_AUDIO', 'PAUSE_PODCAST', 'RESUME_PODCAST'],
                autoMute: true
            }
        ];

        components.forEach(component => {
            this.componentRegistry.set(component.name, {
                ...component,
                registered: false,
                lastActivity: Date.now(),
                muteState: false,
                errorCount: 0
            });
        });

        console.log(`📋 Registered ${components.length} platform components`);
    }

    handleIncomingMessage(event) {
        const { data, source } = event;
        
        if (!data || typeof data !== 'object') return;

        const message = {
            ...data,
            timestamp: Date.now(),
            source: source || 'unknown',
            id: this.generateMessageId()
        };

        // Queue the message for processing
        this.messageQueue.push(message);
        
        // Process high-priority messages immediately
        if (this.isHighPriorityMessage(message)) {
            this.processMessage(message);
        }
    }

    handleCustomEvent(detail) {
        const message = {
            ...detail,
            timestamp: Date.now(),
            source: 'custom-event',
            id: this.generateMessageId()
        };

        this.messageQueue.push(message);
    }

    handleStorageEvent(event) {
        const message = {
            type: 'STORAGE_EVENT',
            key: event.key,
            oldValue: event.oldValue,
            newValue: event.newValue,
            timestamp: Date.now(),
            source: 'storage',
            id: this.generateMessageId()
        };

        this.messageQueue.push(message);
    }

    startMessageProcessing() {
        setInterval(() => {
            if (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift();
                this.processMessage(message);
            }
        }, 10); // Process 100 messages per second
    }

    processMessage(message) {
        const { type, component, source } = message;

        try {
            switch (type) {
                case 'MUTE_AUDIO':
                    this.handleMuteRequest(message);
                    break;
                    
                case 'UNMUTE_AUDIO':
                    this.handleUnmuteRequest(message);
                    break;
                    
                case 'PAUSE_CONTENT':
                    this.handlePauseRequest(message);
                    break;
                    
                case 'RESUME_CONTENT':
                    this.handleResumeRequest(message);
                    break;
                    
                case 'PRAYER_ALERT_START':
                    this.broadcastPrayerAlertStart(message);
                    break;
                    
                case 'PRAYER_ALERT_END':
                    this.broadcastPrayerAlertEnd(message);
                    break;
                    
                case 'GET_COMPONENT_STATUS':
                    this.sendComponentStatus(message);
                    break;
                    
                case 'REGISTER_COMPONENT':
                    this.registerExternalComponent(message);
                    break;
                    
                case 'PRAYER_SETTINGS_UPDATE':
                    this.broadcastSettingsUpdate(message);
                    break;
                    
                default:
                    this.handleUnknownMessage(message);
            }

            // Update component activity
            if (component) {
                this.updateComponentActivity(component);
            }
            
        } catch (error) {
            console.error('Error processing message:', error, message);
            this.handleProcessingError(message, error);
        }
    }

    handleMuteRequest(message) {
        const { component, source, reason } = message;
        
        if (!component) {
            // Mute all components
            this.muteAllComponents(source, reason);
            return;
        }

        this.muteComponent(component, source, reason);
    }

    handleUnmuteRequest(message) {
        const { component, source, reason } = message;
        
        if (!component) {
            // Unmute all components
            this.unmuteAllComponents(source, reason);
            return;
        }

        this.unmuteComponent(component, source, reason);
    }

    handlePauseRequest(message) {
        const { component, source, reason } = message;
        this.pauseComponent(component, source, reason);
    }

    handleResumeRequest(message) {
        const { component, source, reason } = message;
        this.resumeComponent(component, source, reason);
    }

    muteAllComponents(source = 'global-prayer', reason = 'prayer-time') {
        console.log(`🔇 Muting all components for ${reason}`);
        
        this.componentRegistry.forEach((component, name) => {
            if (component.autoMute) {
                this.muteComponent(name, source, reason);
            }
        });
    }

    unmuteAllComponents(source = 'global-prayer', reason = 'prayer-ended') {
        console.log(`🔊 Unmuting all components after ${reason}`);
        
        this.componentRegistry.forEach((component, name) => {
            this.unmuteComponent(name, source, reason);
        });
    }

    muteComponent(componentName, source = 'global-prayer', reason = 'prayer-time') {
        const component = this.componentRegistry.get(componentName);
        if (!component) {
            console.warn(`⚠️ Component ${componentName} not found`);
            return;
        }

        const message = {
            type: 'MUTE_AUDIO',
            component: componentName,
            source: source,
            reason: reason,
            timestamp: Date.now()
        };

        this.sendMessageToComponent(componentName, message);
        component.muteState = true;
        component.lastActivity = Date.now();
        
        console.log(`🔇 Muted ${componentName} for ${reason}`);
    }

    unmuteComponent(componentName, source = 'global-prayer', reason = 'prayer-ended') {
        const component = this.componentRegistry.get(componentName);
        if (!component) {
            console.warn(`⚠️ Component ${componentName} not found`);
            return;
        }

        const message = {
            type: 'UNMUTE_AUDIO',
            component: componentName,
            source: source,
            reason: reason,
            timestamp: Date.now()
        };

        this.sendMessageToComponent(componentName, message);
        component.muteState = false;
        component.lastActivity = Date.now();
        
        console.log(`🔊 Unmuted ${componentName} after ${reason}`);
    }

    pauseComponent(componentName, source = 'global-prayer', reason = 'prayer-time') {
        const component = this.componentRegistry.get(componentName);
        if (!component) return;

        const message = {
            type: 'PAUSE_CONTENT',
            component: componentName,
            source: source,
            reason: reason,
            timestamp: Date.now()
        };

        this.sendMessageToComponent(componentName, message);
        component.lastActivity = Date.now();
        
        console.log(`⏸️ Paused ${componentName} for ${reason}`);
    }

    resumeComponent(componentName, source = 'global-prayer', reason = 'prayer-ended') {
        const component = this.componentRegistry.get(componentName);
        if (!component) return;

        const message = {
            type: 'RESUME_CONTENT',
            component: componentName,
            source: source,
            reason: reason,
            timestamp: Date.now()
        };

        this.sendMessageToComponent(componentName, message);
        component.lastActivity = Date.now();
        
        console.log(`▶️ Resumed ${componentName} after ${reason}`);
    }

    sendMessageToComponent(componentName, message) {
        // Try multiple communication methods
        const methods = [
            () => this.sendViaWindowMessage(componentName, message),
            () => this.sendViaCustomEvent(componentName, message),
            () => this.sendViaStorage(componentName, message),
            () => this.sendViaDirectAccess(componentName, message)
        ];

        for (const method of methods) {
            try {
                if (method()) {
                    return true;
                }
            } catch (error) {
                console.warn(`Failed to send message via ${method.name}:`, error);
            }
        }
        
        return false;
    }

    sendViaWindowMessage(componentName, message) {
        // Send to all iframes and windows
        const iframes = document.querySelectorAll('iframe');
        const windows = [window];
        
        // Add iframe content windows
        iframes.forEach(iframe => {
            if (iframe.contentWindow) {
                windows.push(iframe.contentWindow);
            }
        });

        windows.forEach(win => {
            try {
                var __o = window.location.origin;
                try {
                    if (win && win !== window) {
                        var __f = Array.prototype.find.call(document.querySelectorAll('iframe'), f => f && f.contentWindow === win);
                        if (__f) {
                            var __s = __f.getAttribute('src') || __f.src || '';
                            __o = new URL(__s, window.location.href).origin;
                        }
                    }
                } catch(_) {}
                win.postMessage(message, '*');
            } catch (error) {
                // Cross-origin or other error
            }
        });

        return true;
    }

    sendViaCustomEvent(componentName, message) {
        const event = new CustomEvent(`globalPrayer_${componentName}`, {
            detail: message
        });
        document.dispatchEvent(event);
        return true;
    }

    sendViaStorage(componentName, message) {
        const storageKey = `globalPrayer_${componentName}_${Date.now()}`;
        const messageData = {
            ...message,
            component: componentName,
            storageKey: storageKey
        };
        
        try {
            localStorage.setItem(storageKey, JSON.stringify(messageData));
            
            // Clean up after a short time
            setTimeout(() => {
                localStorage.removeItem(storageKey);
            }, 5000);
            
            return true;
        } catch (error) {
            return false;
        }
    }

    sendViaDirectAccess(componentName, message) {
        // Try to access component directly if it exposes global variables
        const g1 = window && window[componentName];
        if (g1 && typeof g1.handleMessage === 'function') { g1.handleMessage(message); return true; }
        const g2 = window && window[componentName + 'Player'];
        if (g2 && typeof g2.handleMessage === 'function') { g2.handleMessage(message); return true; }
        const g3 = window && window[componentName + 'Manager'];
        if (g3 && typeof g3.handleMessage === 'function') { g3.handleMessage(message); return true; }
        const g4 = window && window[componentName + 'Controller'];
        if (g4 && typeof g4.handleMessage === 'function') { g4.handleMessage(message); return true; }

        return false;
    }

    broadcastPrayerAlertStart(message) {
        console.log('🕌 Broadcasting prayer alert start');
        
        const broadcastMessage = {
            type: 'PRAYER_ALERT_START',
            ...message,
            timestamp: Date.now()
        };

        // Send to all registered components
        this.componentRegistry.forEach((component, name) => {
            this.sendMessageToComponent(name, broadcastMessage);
        });
    }

    broadcastPrayerAlertEnd(message) {
        console.log('🕌 Broadcasting prayer alert end');
        
        const broadcastMessage = {
            type: 'PRAYER_ALERT_END',
            ...message,
            timestamp: Date.now()
        };

        // Send to all registered components
        this.componentRegistry.forEach((component, name) => {
            this.sendMessageToComponent(name, broadcastMessage);
        });
    }

    sendComponentStatus(message) {
        const { source } = message;
        const status = this.getAllComponentsStatus();
        
        const response = {
            type: 'COMPONENT_STATUS_RESPONSE',
            status: status,
            timestamp: Date.now()
        };

        this.sendMessage(source, response);
    }

    getAllComponentsStatus() {
        const status = {};
        
        this.componentRegistry.forEach((component, name) => {
            status[name] = {
                registered: component.registered,
                muteState: component.muteState,
                lastActivity: component.lastActivity,
                errorCount: component.errorCount,
                autoMute: component.autoMute
            };
        });

        return status;
    }

    registerExternalComponent(message) {
        const { componentName, componentData } = message;
        
        if (this.componentRegistry.has(componentName)) {
            const existing = this.componentRegistry.get(componentName);
            this.componentRegistry.set(componentName, {
                ...existing,
                ...componentData,
                registered: true,
                lastActivity: Date.now()
            });
            
            console.log(`✅ Updated registration for ${componentName}`);
        } else {
            this.componentRegistry.set(componentName, {
                name: componentName,
                ...componentData,
                registered: true,
                lastActivity: Date.now()
            });
            
            console.log(`✅ Registered new component: ${componentName}`);
        }
    }

    broadcastSettingsUpdate(message) {
        const broadcastMessage = {
            type: 'PRAYER_SETTINGS_UPDATE',
            ...message,
            timestamp: Date.now()
        };

        this.componentRegistry.forEach((component, name) => {
            this.sendMessageToComponent(name, broadcastMessage);
        });
    }

    setupCommunicationMonitoring() {
        // Monitor component health
        setInterval(() => {
            this.checkComponentHealth();
        }, 30000); // Every 30 seconds

        // Monitor message queue
        setInterval(() => {
            if (this.messageQueue.length > 100) {
                console.warn(`📬 Message queue is getting long: ${this.messageQueue.length} messages`);
            }
        }, 10000);
    }

    checkComponentHealth() {
        const now = Date.now();
        const timeout = 300000; // 5 minutes

        this.componentRegistry.forEach((component, name) => {
            if (component.registered && (now - component.lastActivity > timeout)) {
                console.log(`💤 Component ${name} appears to be inactive`);
            }

            if (component.errorCount > 10) {
                console.error(`❌ Component ${name} has high error count: ${component.errorCount}`);
            }
        });
    }

    updateComponentActivity(componentName) {
        const component = this.componentRegistry.get(componentName);
        if (component) {
            component.lastActivity = Date.now();
        }
    }

    sendMessage(target, message) {
        // Implementation depends on target type
        if (target === 'all') {
            this.broadcastMessage(message);
        } else {
            this.sendMessageToComponent(target, message);
        }
    }

    broadcastMessage(message) {
        this.componentRegistry.forEach((component, name) => {
            this.sendMessageToComponent(name, message);
        });
    }

    handleUnknownMessage(message) {
        console.log(`❓ Unknown message type: ${message.type}`, message);
    }

    handleProcessingError(message, error) {
        console.error('Message processing error:', error);
        
        // Increment error count for the source component
        if (message.component) {
            const component = this.componentRegistry.get(message.component);
            if (component) {
                component.errorCount++;
            }
        }
    }

    generateMessageId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    isHighPriorityMessage(message) {
        const highPriorityTypes = [
            'PRAYER_ALERT_START',
            'PRAYER_ALERT_END',
            'MUTE_AUDIO',
            'UNMUTE_AUDIO',
            'EMERGENCY_STOP'
        ];
        
        return highPriorityTypes.includes(message.type);
    }

    // Public API methods
    sendPrayerMuteRequest(component = null, reason = 'prayer-time') {
        const message = {
            type: 'MUTE_AUDIO',
            component: component,
            source: 'global-prayer',
            reason: reason,
            timestamp: Date.now()
        };
        
        this.messageQueue.push(message);
    }

    sendPrayerUnmuteRequest(component = null, reason = 'prayer-ended') {
        const message = {
            type: 'UNMUTE_AUDIO',
            component: component,
            source: 'global-prayer',
            reason: reason,
            timestamp: Date.now()
        };
        
        this.messageQueue.push(message);
    }

    broadcastPrayerEvent(eventType, data = {}) {
        const message = {
            type: eventType,
            ...data,
            source: 'global-prayer',
            timestamp: Date.now()
        };
        
        this.broadcastMessage(message);
    }

    getCommunicationStats() {
        return {
            isInitialized: this.isInitialized,
            registeredComponents: this.componentRegistry.size,
            messageQueueLength: this.messageQueue.length,
            components: this.getAllComponentsStatus()
        };
    }

    registerComponent(componentName, componentData) {
        this.componentRegistry.set(componentName, {
            name: componentName,
            ...componentData,
            registered: true,
            lastActivity: Date.now()
        });
        
        console.log(`✅ Manually registered component: ${componentName}`);
    }
}

// Initialize global communication bridge
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.globalPrayerCommunication = new GlobalPrayerCommunication();
        window.GlobalPrayerCommunication = GlobalPrayerCommunication;
        
        console.log('🌐 Global Prayer Communication Bridge loaded');
    }, 500);
});

// Initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.globalPrayerCommunication = new GlobalPrayerCommunication();
            window.GlobalPrayerCommunication = GlobalPrayerCommunication;
            
            console.log('🌐 Global Prayer Communication Bridge initialized (DOM ready)');
        }, 500);
    });
} else {
    setTimeout(() => {
        window.globalPrayerCommunication = new GlobalPrayerCommunication();
        window.GlobalPrayerCommunication = GlobalPrayerCommunication;
        
        console.log('🌐 Global Prayer Communication Bridge initialized (DOM already ready)');
    }, 500);
}
