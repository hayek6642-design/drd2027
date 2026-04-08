/**
 * communication.js
 * 
 * Manages Real-time communication for Games-Centre.
 * - TextChat: In-game chat via BroadcastChannel (or simulated P2P).
 * - VoiceChat: Peer-to-peer voice/video using PeerJS.
 */

export class TextChat {
    constructor(gameId, username) {
        this.gameId = gameId;
        this.username = username;
        this.channel = new BroadcastChannel(`chat_${gameId}`);
        this.listeners = [];

        this.channel.onmessage = (e) => {
            this.notify(e.data);
        };
    }

    sendMessage(text) {
        const msg = {
            id: Date.now().toString(),
            sender: this.username,
            text,
            timestamp: new Date().toISOString()
        };
        // Local echo
        this.notify(msg);
        // Broadcast
        this.channel.postMessage(msg);
    }

    onMessage(callback) {
        this.listeners.push(callback);
    }

    notify(msg) {
        this.listeners.forEach(cb => cb(msg));
    }

    disconnect() {
        this.channel.close();
        this.listeners = [];
    }
}

export class VoiceChat {
    constructor(roomId, userId) {
        this.roomId = roomId;
        this.userId = userId;
        this.peer = null;
        this.localStream = null;
        this.calls = {}; // map of active calls
        this.isMuted = false;
        this.isVideoOff = true;
    }

    async init() {
        // Dynamic import of PeerJS if not globally available, or assume loaded via script tag in dashboard.html
        // For now, we assume PeerJS is loaded in the dashboard (we will add CDN link).
        if (typeof window.Peer === 'undefined') {
            console.warn('PeerJS not loaded. Voice chat disabled.');
            return false;
        }

        this.peer = new window.Peer(this.userId, {
            debug: 2
        });

        this.peer.on('open', (id) => {
            console.log('[VoiceChat] My peer ID is: ' + id);
        });

        this.peer.on('call', (call) => {
            // Answer incoming call with audio only by default
            const answerOptions = {
                audio: true,
                video: !this.isVideoOff
            };

            // Get local stream if not ready (rare case if answering fast)
            if (this.localStream) {
                call.answer(this.localStream);
                this.handleCall(call);
            } else {
                // If stream not ready, we technically should wait or answer audio only if we can get it fast
                this.startLocalStream().then(() => {
                    call.answer(this.localStream);
                    this.handleCall(call);
                }).catch(e => console.error('Failed to get stream to answer', e));
            }
        });

        this.peer.on('error', (err) => {
            console.error('[VoiceChat] Peer error:', err);
        });

        return true;
    }

    async startLocalStream(video = false) {
        try {
            this.isVideoOff = !video; // Set state
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: video
            });
            return this.localStream;
        } catch (err) {
            console.error('[VoiceChat] Failed to get local stream', err);
            throw err;
        }
    }

    connectToPeer(remotePeerId) {
        if (!this.peer || !this.localStream) return;
        const call = this.peer.call(remotePeerId, this.localStream);
        this.handleCall(call);
    }

    handleCall(call) {
        this.calls[call.peer] = call;

        call.on('stream', (remoteStream) => {
            // Dispatch event to UI to render this stream
            const event = new CustomEvent('voice-stream-added', {
                detail: { peerId: call.peer, stream: remoteStream }
            });
            window.dispatchEvent(event);
        });

        call.on('close', () => {
            // Cleanup UI
            const event = new CustomEvent('voice-stream-removed', {
                detail: { peerId: call.peer }
            });
            window.dispatchEvent(event);
            delete this.calls[call.peer];
        });
    }

    toggleMute() {
        if (this.localStream) {
            this.isMuted = !this.isMuted;
            this.localStream.getAudioTracks().forEach(track => track.enabled = !this.isMuted);
            return this.isMuted;
        }
        return false;
    }

    toggleVideo() {
        // Requires renegotiation or track enabling - simplistically just track enable if exists
        if (this.localStream) {
            this.isVideoOff = !this.isVideoOff;
            // If we didn't ask for video initially, we can't just enable it. 
            // PeerJS doesn't support easy track add/remove without renegotiation in vanilla WebRTC often.
            // For simplicity, we just toggle enabled state if track exists.
            const videoTracks = this.localStream.getVideoTracks();
            if (videoTracks.length > 0) {
                videoTracks.forEach(track => track.enabled = !this.isVideoOff);
            } else {
                console.warn("No video track to toggle. Restart stream required.");
                // In a full implementation, we would stop stream, get new stream with video, and replaceTrack on all calls.
            }
            return this.isVideoOff;
        }
        return true;
    }
}
