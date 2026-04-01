/**
 * Audio Chat Module for Cards Game
 * WebRTC peer-to-peer audio communication
 * Graceful fallback if permissions denied
 */

export class AudioChat {
    constructor(wsClient, serviceLevel) {
        this.ws = wsClient;
        this.serviceLevel = serviceLevel;
        this.localStream = null;
        this.peerConnection = null;
        this.remoteAudio = null;
        this.isMuted = false;
        this.isInitialized = false;
        this.isEnabled = serviceLevel === 'C';
        
        if (this.isEnabled) {
            this.init();
        }
    }

    async init() {
        if (!this.isEnabled) return;
        
        try {
            // Request microphone permission
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true 
            });
            
            this.setupPeerConnection();
            this.isInitialized = true;
            this.showAudioControls();
            
        } catch (error) {
            console.warn('Audio Chat: Microphone access denied or unavailable', error);
            this.handlePermissionDenied();
        }
    }

    setupPeerConnection() {
        // Create peer connection
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                this.handleRemoteStream(event.streams[0]);
            }
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.ws.send({
                    type: 'ICE_CANDIDATE',
                    candidate: event.candidate
                });
            }
        };

        // Handle negotiation needed
        this.peerConnection.onnegotiationneeded = async () => {
            try {
                await this.peerConnection.setLocalDescription(await this.peerConnection.createOffer());
                this.ws.send({
                    type: 'OFFER',
                    sdp: this.peerConnection.localDescription
                });
            } catch (error) {
                console.error('Audio Chat: Offer creation failed', error);
            }
        };
    }

    handleRemoteStream(stream) {
        // Create or update remote audio element
        if (!this.remoteAudio) {
            this.remoteAudio = document.createElement('audio');
            this.remoteAudio.autoplay = true;
            this.remoteAudio.playsInline = true;
            document.body.appendChild(this.remoteAudio);
        }
        
        this.remoteAudio.srcObject = stream;
    }

    async handleSignaling(data) {
        if (!this.isEnabled || !this.peerConnection) return;

        try {
            if (data.type === 'OFFER') {
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                const answer = await this.peerConnection.createAnswer();
                await this.peerConnection.setLocalDescription(answer);
                this.ws.send({
                    type: 'ANSWER',
                    sdp: answer
                });
            } else if (data.type === 'ANSWER') {
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            } else if (data.type === 'ICE_CANDIDATE') {
                if (this.peerConnection.remoteDescription) {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            }
        } catch (error) {
            console.error('Audio Chat: Signaling error', error);
        }
    }

    toggleMute() {
        if (!this.isEnabled || !this.localStream) return;

        this.isMuted = !this.isMuted;
        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = !this.isMuted;
        });

        // Update UI
        const button = document.getElementById('audio-mute-btn');
        if (button) {
            button.textContent = this.isMuted ? 'Unmute' : 'Mute';
            button.classList.toggle('muted', this.isMuted);
        }
    }

    showAudioControls() {
        // Create audio controls if they don't exist
        if (!document.getElementById('audio-controls')) {
            const controls = document.createElement('div');
            controls.id = 'audio-controls';
            controls.className = 'audio-controls';
            controls.innerHTML = `
                <button id="audio-mute-btn" class="btn btn-secondary">Mute</button>
                <span id="audio-status" class="status-text">Audio Active</span>
            `;
            
            // Add to game screen
            const gameScreen = document.getElementById('game-screen');
            if (gameScreen) {
                gameScreen.appendChild(controls);
            }
        }
    }

    handlePermissionDenied() {
        // Show fallback UI
        if (!document.getElementById('audio-fallback')) {
            const fallback = document.createElement('div');
            fallback.id = 'audio-fallback';
            fallback.className = 'audio-fallback';
            fallback.innerHTML = `
                <span class="status-text">Audio Chat Unavailable</span>
                <span class="hint-text">Microphone access required for Mode C</span>
            `;
            
            const gameScreen = document.getElementById('game-screen');
            if (gameScreen) {
                gameScreen.appendChild(fallback);
            }
        }
    }

    cleanup() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.remoteAudio) {
            this.remoteAudio.srcObject = null;
            this.remoteAudio.remove();
            this.remoteAudio = null;
        }
        
        // Remove UI elements
        const audioControls = document.getElementById('audio-controls');
        if (audioControls) audioControls.remove();
        
        const audioFallback = document.getElementById('audio-fallback');
        if (audioFallback) audioFallback.remove();
    }
}