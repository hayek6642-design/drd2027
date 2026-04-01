/**
 * Audio Call Service
 * WebRTC-based audio communication
 */

class AudioCallService {
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
  }

  /**
   * Connect to audio service
   */
  async connect(gameId, playerId) {
    this.gameId = gameId;
    this.playerId = playerId;

    try {
      // Get local audio stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      this.connected = true;
      console.log(`[AudioCall] Connected to game: ${gameId} as player: ${playerId}`);

      // Emit connection event
      this.emit('connected', { gameId, playerId, stream: this.localStream });

      return { success: true, stream: this.localStream };
    } catch (error) {
      console.error('[AudioCall] Failed to connect:', error);
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Toggle mute state
   */
  toggleMute() {
    if (!this.localStream) return false;

    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return false;

    const isMuted = audioTracks.every(track => !track.enabled);

    audioTracks.forEach(track => {
      track.enabled = !isMuted;
    });

    const newMuteState = !isMuted;
    console.log(`[AudioCall] Mute ${newMuteState ? 'enabled' : 'disabled'}`);

    this.emit('mute-toggled', { muted: newMuteState });
    return newMuteState;
  }

  /**
   * Check if muted
   */
  isMuted() {
    if (!this.localStream) return true;

    const audioTracks = this.localStream.getAudioTracks();
    return audioTracks.every(track => !track.enabled);
  }

  /**
   * Add remote stream
   */
  addRemoteStream(playerId, stream) {
    console.log(`[AudioCall] Adding remote stream for player: ${playerId}`);
    this.remoteStreams.set(playerId, stream);

    this.emit('remote-stream-added', { playerId, stream });
  }

  /**
   * Remove remote stream
   */
  removeRemoteStream(playerId) {
    console.log(`[AudioCall] Removing remote stream for player: ${playerId}`);
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
   * Disconnect from audio service
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

    console.log('[AudioCall] Disconnected');
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
    window.dispatchEvent(new CustomEvent(`audio-call:${event}`, {
      detail: data
    }));
  }
}

// Singleton instance
const audioCallService = new AudioCallService();
export default audioCallService;