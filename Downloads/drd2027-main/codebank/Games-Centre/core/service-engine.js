/**
 * Service Engine
 * Manages communication services (text, audio, video)
 */

class ServiceEngine {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.services = {
      text: null,
      audio: null,
      video: null
    };
    this.activeServices = new Set();
    this.serviceConfig = {};
  }

  /**
   * Enable services
   */
  enable(config = {}) {
    this.serviceConfig = config;

    // Enable text chat if requested
    if (config.text) {
      this.enableTextChat();
    }

    // Enable audio if requested
    if (config.audio) {
      this.enableAudio();
    }

    // Enable video if requested
    if (config.video) {
      this.enableVideo();
    }

    console.log(`[ServiceEngine] Services enabled:`, {
      text: !!this.services.text,
      audio: !!this.services.audio,
      video: !!this.services.video
    });
  }

  /**
   * Enable text chat service
   */
  enableTextChat() {
    if (!this.services.text) {
      this.services.text = new TextChatService();
      this.activeServices.add('text');
      console.log('[ServiceEngine] Text chat enabled');
    }
  }

  /**
   * Enable audio service
   */
  enableAudio() {
    if (!this.services.audio) {
      this.services.audio = new AudioService();
      this.activeServices.add('audio');
      console.log('[ServiceEngine] Audio service enabled');
    }
  }

  /**
   * Enable video service
   */
  enableVideo() {
    if (!this.services.video) {
      this.services.video = new VideoService();
      this.activeServices.add('video');
      console.log('[ServiceEngine] Video service enabled');
    }
  }

  /**
   * Disable all services
   */
  disableAll() {
    if (this.services.text) {
      this.services.text.disconnect();
      this.services.text = null;
    }

    if (this.services.audio) {
      this.services.audio.disconnect();
      this.services.audio = null;
    }

    if (this.services.video) {
      this.services.video.disconnect();
      this.services.video = null;
    }

    this.activeServices.clear();
    console.log('[ServiceEngine] All services disabled');
  }

  /**
   * Get text chat service
   */
  getTextChat() {
    return this.services.text;
  }

  /**
   * Get audio service
   */
  getAudioService() {
    return this.services.audio;
  }

  /**
   * Get video service
   */
  getVideoService() {
    return this.services.video;
  }

  /**
   * Check if service is active
   */
  isServiceActive(serviceName) {
    return this.activeServices.has(serviceName);
  }

  /**
   * Connect services to a game session
   */
  connectToGame(gameId, playerId) {
    if (this.services.text) {
      this.services.text.connect(gameId, playerId);
    }

    if (this.services.audio) {
      this.services.audio.connect(gameId, playerId);
    }

    if (this.services.video) {
      this.services.video.connect(gameId, playerId);
    }
  }

  /**
   * Disconnect services from current session
   */
  disconnect() {
    if (this.services.text) {
      this.services.text.disconnect();
    }

    if (this.services.audio) {
      this.services.audio.disconnect();
    }

    if (this.services.video) {
      this.services.video.disconnect();
    }
  }
}

// Text Chat Service
class TextChatService {
  constructor() {
    this.connected = false;
    this.messages = [];
    this.listeners = [];
    this.gameId = null;
    this.playerId = null;
  }

  connect(gameId, playerId) {
    this.gameId = gameId;
    this.playerId = playerId;
    this.connected = true;
    console.log(`[TextChat] Connected to game: ${gameId} as player: ${playerId}`);
  }

  sendMessage(text) {
    if (!this.connected) {
      throw new Error('Text chat not connected');
    }

    const message = {
      id: Date.now().toString(),
      gameId: this.gameId,
      playerId: this.playerId,
      text,
      timestamp: Date.now()
    };

    this.messages.push(message);
    this.notifyListeners(message);

    // Emit event
    window.dispatchEvent(new CustomEvent('text-chat:message', {
      detail: message
    }));
  }

  onMessage(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(message) {
    this.listeners.forEach(listener => listener(message));
  }

  disconnect() {
    this.connected = false;
    this.gameId = null;
    this.playerId = null;
    this.listeners = [];
    console.log('[TextChat] Disconnected');
  }
}

// Audio Service
class AudioService {
  constructor() {
    this.connected = false;
    this.localStream = null;
    this.remoteStreams = new Map();
    this.peerConnections = new Map();
    this.gameId = null;
    this.playerId = null;
  }

  async connect(gameId, playerId) {
    this.gameId = gameId;
    this.playerId = playerId;

    try {
      // Get local audio stream
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.connected = true;
      console.log(`[AudioService] Connected to game: ${gameId} as player: ${playerId}`);

      // Emit event
      window.dispatchEvent(new CustomEvent('audio-service:connected', {
        detail: { gameId, playerId, stream: this.localStream }
      }));
    } catch (error) {
      console.error('[AudioService] Failed to connect:', error);
      throw error;
    }
  }

  toggleMute() {
    if (!this.localStream) return false;

    const audioTracks = this.localStream.getAudioTracks();
    const isMuted = audioTracks.every(track => !track.enabled);

    audioTracks.forEach(track => {
      track.enabled = !isMuted;
    });

    return !isMuted;
  }

  disconnect() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.remoteStreams.clear();
    this.peerConnections.clear();
    this.connected = false;
    this.gameId = null;
    this.playerId = null;

    console.log('[AudioService] Disconnected');
  }
}

// Video Service
class VideoService {
  constructor() {
    this.connected = false;
    this.localStream = null;
    this.remoteStreams = new Map();
    this.peerConnections = new Map();
    this.gameId = null;
    this.playerId = null;
  }

  async connect(gameId, playerId) {
    this.gameId = gameId;
    this.playerId = playerId;

    try {
      // Get local video stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      this.connected = true;
      console.log(`[VideoService] Connected to game: ${gameId} as player: ${playerId}`);

      // Emit event
      window.dispatchEvent(new CustomEvent('video-service:connected', {
        detail: { gameId, playerId, stream: this.localStream }
      }));
    } catch (error) {
      console.error('[VideoService] Failed to connect:', error);
      throw error;
    }
  }

  toggleVideo() {
    if (!this.localStream) return false;

    const videoTracks = this.localStream.getVideoTracks();
    const isOff = videoTracks.every(track => !track.enabled);

    videoTracks.forEach(track => {
      track.enabled = !isOff;
    });

    return !isOff;
  }

  toggleMute() {
    if (!this.localStream) return false;

    const audioTracks = this.localStream.getAudioTracks();
    const isMuted = audioTracks.every(track => !track.enabled);

    audioTracks.forEach(track => {
      track.enabled = !isMuted;
    });

    return !isMuted;
  }

  disconnect() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.remoteStreams.clear();
    this.peerConnections.clear();
    this.connected = false;
    this.gameId = null;
    this.playerId = null;

    console.log('[VideoService] Disconnected');
  }
}

export default ServiceEngine;