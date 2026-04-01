/**
 * Video Chat Module for Cards Game
 * WebRTC peer-to-peer video communication
 * Graceful fallback if permissions denied
 */

export class VideoChat {
    constructor(wsClient, serviceLevel) {
        this.ws = wsClient;
        this.serviceLevel = serviceLevel;
        this.localStream = null;
        this.peerConnection = null;
        this.localVideo = null;
        this.remoteVideo = null;
        this.isVideoEnabled = false;
        this.isInitialized = false;
        this.isEnabled = serviceLevel === 'C';
        
        if (this.isEnabled) {
            this.init();
        }
    }

    async init() {
        if (!this.isEnabled) return;
        
        try {
            // Request camera and microphone permissions
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            this.setupLocalVideo();
            this.setupPeerConnection();
            this.isInitialized = true;
            this.showVideoControls();
            
        } catch (error) {
            console.warn('Video Chat: Camera access denied or unavailable', error);
            this.handlePermissionDenied();
        }
    }

    setupLocalVideo() {
        // Create local video element
        this.localVideo = document.createElement('video');
        this.localVideo.id = 'local-video';
        this.localVideo.autoplay = true;
        this.localVideo.muted = true;
        this.localVideo.playsInline = true;
        this.localVideo.className = 'video-preview';
        
        // Add to game screen
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.appendChild(this.localVideo);
        }
        
        this.localVideo.srcObject = this.localStream;
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
                console.error('Video Chat: Offer creation failed', error);
            }
        };
    }

    handleRemoteStream(stream) {
        // Create or update remote video element
        if (!this.remoteVideo) {
            this.remoteVideo = document.createElement('video');
            this.remoteVideo.id = 'remote-video';
            this.remoteVideo.autoplay = true;
            this.remoteVideo.playsInline = true;
            this.remoteVideo.className = 'remote-video';
            document.body.appendChild(this.remoteVideo);
        }
        
        this.remoteVideo.srcObject = stream;
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
            console.error('Video Chat: Signaling error', error);
        }
    }

    toggleVideo() {
        if (!this.isEnabled || !this.localStream) return;

        this.isVideoEnabled = !this.isVideoEnabled;
        this.localStream.getVideoTracks().forEach(track => {
            track.enabled = this.isVideoEnabled;
        });

        // Update UI
        const button = document.getElementById('video-toggle-btn');
        if (button) {
            button.textContent = this.isVideoEnabled ? 'Turn Off Video' : 'Turn On Video';
            button.classList.toggle('video-off', !this.isVideoEnabled);
        }

        // Show/hide local video preview
        if (this.localVideo) {
            this.localVideo.style.display = this.isVideoEnabled ? 'block' : 'none';
        }
    }

    showVideoControls() {
        // Create video controls if they don't exist
        if (!document.getElementById('video-controls')) {
            const controls = document.createElement('div');
            controls.id = 'video-controls';
            controls.className = 'video-controls';
            controls.innerHTML = `
                <button id="video-toggle-btn" class="btn btn-secondary">Turn On Video</button>
                <button id="video-mute-btn" class="btn btn-secondary">Mute Video</button>
                <span id="video-status" class="status-text">Video Active</span>
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
        if (!document.getElementById('video-fallback')) {
            const fallback = document.createElement('div');
            fallback.id = 'video-fallback';
            fallback.className = 'video-fallback';
            fallback.innerHTML = `
                <span class="status-text">Video Chat Unavailable</span>
                <span class="hint-text">Camera access required for Mode C</span>
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
        
        if (this.localVideo) {
            this.localVideo.srcObject = null;
            this.localVideo.remove();
            this.localVideo = null;
        }
        
        if (this.remoteVideo) {
            this.remoteVideo.srcObject = null;
            this.remoteVideo.remove();
            this.remoteVideo = null;
        }
        
        // Remove UI elements
        const videoControls = document.getElementById('video-controls');
        if (videoControls) videoControls.remove();
        
        const videoFallback = document.getElementById('video-fallback');
        if (videoFallback) videoFallback.remove();
    }
}