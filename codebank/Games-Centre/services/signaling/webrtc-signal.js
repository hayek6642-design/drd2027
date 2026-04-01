/**
 * WebRTC Signaling Service
 * Handles signaling for WebRTC connections
 */

class WebRTCSignaling {
  constructor() {
    this.connected = false;
    this.socket = null;
    this.peerConnections = new Map();
    this.pendingOffers = new Map();
    this.iceCandidates = new Map();
    this.gameId = null;
    this.playerId = null;
    this.eventListeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  /**
   * Connect to signaling server
   */
  connect(signalingServerUrl, gameId, playerId) {
    this.gameId = gameId;
    this.playerId = playerId;

    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket connection
        this.socket = new WebSocket(signalingServerUrl);

        this.socket.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;

          console.log(`[WebRTCSignaling] Connected to signaling server: ${signalingServerUrl}`);

          // Send authentication
          this.socket.send(JSON.stringify({
            type: 'auth',
            gameId,
            playerId
          }));

          this.emit('connected');
          resolve({ success: true });
        };

        this.socket.onmessage = (event) => {
          this.handleSignalingMessage(event.data);
        };

        this.socket.onclose = () => {
          this.connected = false;
          console.log('[WebRTCSignaling] Connection closed');

          // Attempt reconnection
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[WebRTCSignaling] Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
              this.connect(signalingServerUrl, gameId, playerId)
                .then(resolve)
                .catch(reject);
            }, 2000);
          } else {
            this.emit('disconnected');
          }
        };

        this.socket.onerror = (error) => {
          console.error('[WebRTCSignaling] Error:', error);
          this.emit('error', { error });
        };
      } catch (error) {
        console.error('[WebRTCSignaling] Connection failed:', error);
        this.emit('error', { error: error.message });
        reject(error);
      }
    });
  }

  /**
   * Handle incoming signaling messages
   */
  handleSignalingMessage(message) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'offer':
          this.handleOffer(data);
          break;

        case 'answer':
          this.handleAnswer(data);
          break;

        case 'ice-candidate':
          this.handleICECandidate(data);
          break;

        case 'player-joined':
          this.handlePlayerJoined(data);
          break;

        case 'player-left':
          this.handlePlayerLeft(data);
          break;

        case 'error':
          this.emit('error', { error: data.message });
          break;

        default:
          console.warn('[WebRTCSignaling] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[WebRTCSignaling] Error parsing message:', error);
    }
  }

  /**
   * Create a peer connection
   */
  createPeerConnection(playerId) {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Store peer connection
    this.peerConnections.set(playerId, pc);

    // Set up event handlers
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendICECandidate(playerId, event.candidate);
      }
    };

    pc.oniceconnectionstatechange = () => {
      this.emit('ice-state-change', {
        playerId,
        state: pc.iceConnectionState
      });
    };

    pc.ontrack = (event) => {
      this.emit('track-added', {
        playerId,
        stream: event.streams[0]
      });
    };

    return pc;
  }

  /**
   * Create an offer
   */
  async createOffer(targetPlayerId) {
    if (!this.connected) {
      throw new Error('Not connected to signaling server');
    }

    const pc = this.createPeerConnection(targetPlayerId);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to target player
      this.socket.send(JSON.stringify({
        type: 'offer',
        from: this.playerId,
        to: targetPlayerId,
        gameId: this.gameId,
        sdp: offer.sdp
      }));

      return offer;
    } catch (error) {
      console.error('[WebRTCSignaling] Error creating offer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming offer
   */
  async handleOffer(data) {
    const { from: senderId, sdp } = data;
    const pc = this.createPeerConnection(senderId);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp
      }));

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer back
      this.socket.send(JSON.stringify({
        type: 'answer',
        from: this.playerId,
        to: senderId,
        gameId: this.gameId,
        sdp: answer.sdp
      }));
    } catch (error) {
      console.error('[WebRTCSignaling] Error handling offer:', error);
    }
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer(data) {
    const { from: senderId, sdp } = data;
    const pc = this.peerConnections.get(senderId);

    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({
          type: 'answer',
          sdp
        }));
      } catch (error) {
        console.error('[WebRTCSignaling] Error handling answer:', error);
      }
    }
  }

  /**
   * Send ICE candidate
   */
  sendICECandidate(targetPlayerId, candidate) {
    if (this.connected) {
      this.socket.send(JSON.stringify({
        type: 'ice-candidate',
        from: this.playerId,
        to: targetPlayerId,
        gameId: this.gameId,
        candidate
      }));
    }
  }

  /**
   * Handle ICE candidate
   */
  async handleICECandidate(data) {
    const { from: senderId, candidate } = data;
    const pc = this.peerConnections.get(senderId);

    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('[WebRTCSignaling] Error adding ICE candidate:', error);
      }
    }
  }

  /**
   * Handle player joined
   */
  handlePlayerJoined(data) {
    const { playerId } = data;
    console.log(`[WebRTCSignaling] Player joined: ${playerId}`);

    // Create offer to new player
    if (playerId !== this.playerId) {
      this.createOffer(playerId).catch(error => {
        console.error(`[WebRTCSignaling] Error creating offer to ${playerId}:`, error);
      });
    }

    this.emit('player-joined', { playerId });
  }

  /**
   * Handle player left
   */
  handlePlayerLeft(data) {
    const { playerId } = data;
    console.log(`[WebRTCSignaling] Player left: ${playerId}`);

    // Clean up peer connection
    const pc = this.peerConnections.get(playerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(playerId);
    }

    this.emit('player-left', { playerId });
  }

  /**
   * Disconnect from signaling server
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    // Close all peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    this.connected = false;
    this.gameId = null;
    this.playerId = null;
    this.pendingOffers.clear();
    this.iceCandidates.clear();

    console.log('[WebRTCSignaling] Disconnected');
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
    window.dispatchEvent(new CustomEvent(`webrtc-signal:${event}`, {
      detail: data
    }));
  }
}

// Singleton instance
const webrtcSignaling = new WebRTCSignaling();
export default webrtcSignaling;