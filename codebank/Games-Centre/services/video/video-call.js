/**
 * Video Call Service
 * WebRTC-based video communication
 */

class VideoCallService {
  constructor() {
    this.connected = false;
    this.localStream = null;
    this.remoteStreams = new Map();
    this.peerConnections = new Map();
    this.gameId = null;
    this.playerId = null;
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];
    this.eventListeners = new Map();
    this.videoEnabled = true;
    this.audioEnabled = true;
  }

  /**
   * Connect to video service
   */
  async connect(gameId, playerId, config = {}) {
    this.gameId = gameId;
    this.playerId = playerId;

    try {
      // Get local video stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: config.video || true,
        audio: config.audio || true
      });

      this.connected = true;
      this.videoEnabled = true;
      this.audioEnabled = true;

      console.log(`[VideoCall] Connected to game: ${gameId} as player: ${playerId}`);

      // Emit connection event
      this.emit('connected', { gameId, playerId, stream: this.localStream });

      return { success: true, stream: this.localStream };
    } catch (error) {
      console.error('[VideoCall] Failed to connect:', error);
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Toggle video state
   */
  toggleVideo() {
    if (!this.localStream) return false;

    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) return false;

    const isOff = videoTracks.every(track => !track.enabled);

    videoTracks.forEach(track => {
      track.enabled = !isOff;
    });

    this.videoEnabled = !isOff;
    console.log(`[VideoCall] Video ${this.videoEnabled ? 'enabled' : 'disabled'}`);

    this.emit('video-toggled', { enabled: this.videoEnabled });
    return this.videoEnabled;
  }

  /**
   * Toggle audio/mute state
   */
  toggleMute() {
    if (!this.localStream) return false;

    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return false;

    const isMuted = audioTracks.every(track => !track.enabled);

    audioTracks.forEach(track => {
      track.enabled = !isMuted;
    });

    this.audioEnabled = !isMuted;
    console.log(`[VideoCall] Audio ${this.audioEnabled ? 'enabled' : 'disabled'}`);

    this.emit('audio-toggled', { enabled: this.audioEnabled });
    return this.audioEnabled;
  }

  /**
   * Check video state
   */
  isVideoEnabled() {
    return this.videoEnabled;
  }

  /**
   * Check audio state
   */
  isAudioEnabled() {
    return this.audioEnabled;
  }

  /**
   * Add remote stream
   */
  addRemoteStream(playerId, stream) {
    console.log(`[VideoCall] Adding remote stream for player: ${playerId}`);
    this.remoteStreams.set(playerId, stream);

    this.emit('remote-stream-added', { playerId, stream });
  }

  /**
   * Remove remote stream
   */
  removeRemoteStream(playerId) {
    console.log(`[VideoCall] Removing remote stream for player: ${playerId}`);
    this.remoteStreams.delete(playerId);

    this.emit('remote-stream-removed', { playerId });
  }

  /**
   * Get all remote streams
   */
  getRemoteStreams() {
    return Array.from(this.remoteStreams.values());
  }

  /**
   * Disconnect from video service
   */
  disconnect() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Clear remote streams
    this.remoteStreams.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    this.remoteStreams.clear();

    // Close peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    this.connected = false;
    this.gameId = null;
    this.playerId = null;
    this.videoEnabled = false;
    this.audioEnabled = false;

    console.log('[VideoCall] Disconnected');
    this.emit('disconnected');
  }

  /**
   * Event system
   */
  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  emit(event, data) {
    const handlers = this.eventListeners.get(event) || [];
    handlers.forEach(handler => handler(data));

    // Also emit as DOM event
    window.dispatchEvent(new CustomEvent(`video-call:${event}`, {
      detail: data
    }));
  }
}

// Singleton instance
const videoCallService = new VideoCallService();
export default videoCallService;