/**
 * Communication Manager for Cards Game
 * Orchestrates all communication features based on service level
 * Handles service level enable/disable logic
 */

import { TextChat } from './text-chat.js';
import { AudioChat } from './audio-chat.js';
import { VideoChat } from './video-chat.js';

export class CommunicationManager {
    constructor(wsClient, serviceLevel) {
        this.wsClient = wsClient;
        this.serviceLevel = serviceLevel;
        this.textChat = null;
        this.audioChat = null;
        this.videoChat = null;
        
        this.init();
    }

    init() {
        // Initialize Text Chat (available in Mode B and C)
        if (this.serviceLevel === 'B' || this.serviceLevel === 'C') {
            this.textChat = new TextChat(this.wsClient);
        }

        // Initialize Audio Chat (available in Mode C only)
        if (this.serviceLevel === 'C') {
            this.audioChat = new AudioChat(this.wsClient, this.serviceLevel);
        }

        // Initialize Video Chat (available in Mode C only)
        if (this.serviceLevel === 'C') {
            this.videoChat = new VideoChat(this.wsClient, this.serviceLevel);
        }

        // Subscribe to WebSocket messages for all communication features
        this.wsClient.subscribe(this.handleMessage.bind(this));
    }

    handleMessage(data) {
        if (!data) return;

        // Handle text chat messages
        if (this.textChat && (data.type === 'CHAT_MESSAGE' || data.type === 'text-message')) {
            this.textChat.onMessage(data);
        }

        // Handle audio chat signaling
        if (this.audioChat && (data.type === 'OFFER' || data.type === 'ANSWER' || data.type === 'ICE_CANDIDATE')) {
            this.audioChat.handleSignaling(data);
        }

        // Handle video chat signaling
        if (this.videoChat && (data.type === 'OFFER' || data.type === 'ANSWER' || data.type === 'ICE_CANDIDATE')) {
            this.videoChat.handleSignaling(data);
        }
    }

    // Public methods for UI interaction
    sendTextMessage(text) {
        if (this.textChat) {
            this.textChat.sendMessage(text);
        }
    }

    toggleAudioMute() {
        if (this.audioChat) {
            this.audioChat.toggleMute();
        }
    }

    toggleVideo() {
        if (this.videoChat) {
            this.videoChat.toggleVideo();
        }
    }

    // Cleanup method
    cleanup() {
        if (this.textChat) {
            this.textChat.cleanup();
            this.textChat = null;
        }

        if (this.audioChat) {
            this.audioChat.cleanup();
            this.audioChat = null;
        }

        if (this.videoChat) {
            this.videoChat.cleanup();
            this.videoChat = null;
        }
    }

    // Get status information
    getStatus() {
        return {
            textChat: this.textChat !== null,
            audioChat: this.audioChat !== null && this.audioChat.isInitialized,
            videoChat: this.videoChat !== null && this.videoChat.isInitialized,
            serviceLevel: this.serviceLevel
        };
    }
}