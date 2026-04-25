// Camera verification overlay for Premium proof
export class CameraVerification {
    constructor() {
        this.stream = null;
        this.videoElement = null;
        this.overlay = this.createOverlay();
    }
    
    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'camera-verification-overlay';
        overlay.innerHTML = `
            <div class="camera-content">
                <video id="camera-preview" autoplay playsinline></video>
                <div class="camera-controls">
                    <button id="take-photo" class="camera-btn">
                        📸 Take Screenshot
                    </button>
                    <button id="cancel-camera" class="camera-btn">
                        ❌ Cancel
                    </button>
                </div>
                <canvas id="capture-canvas" style="display: none;"></canvas>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .camera-verification-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999;
            }
            .camera-content {
                max-width: 90vw;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
            }
            #camera-preview {
                max-width: 100%;
                max-height: 70vh;
                border: 2px solid #fff;
                border-radius: 8px;
            }
            .camera-controls {
                display: flex;
                gap: 10px;
            }
            .camera-btn {
                padding: 10px 20px;
                border-radius: 8px;
                border: none;
                background: #2563eb;
                color: white;
                cursor: pointer;
                font-size: 16px;
                transition: background 0.2s;
            }
            .camera-btn:hover {
                background: #1d4ed8;
            }
            #cancel-camera {
                background: #dc2626;
            }
            #cancel-camera:hover {
                background: #b91c1c;
            }
        `;
        document.head.appendChild(style);
        return overlay;
    }
    
    async start() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' }
            });
            
            document.body.appendChild(this.overlay);
            this.videoElement = document.getElementById('camera-preview');
            this.videoElement.srcObject = this.stream;
            
            return new Promise((resolve, reject) => {
                const takePhotoBtn = document.getElementById('take-photo');
                const cancelBtn = document.getElementById('cancel-camera');
                
                takePhotoBtn.onclick = async () => {
                    const canvas = document.getElementById('capture-canvas');
                    const photo = await this.capturePhoto(canvas);
                    this.stop();
                    resolve(photo);
                };
                
                cancelBtn.onclick = () => {
                    this.stop();
                    reject(new Error('Camera verification cancelled'));
                };
            });
        } catch (error) {
            this.stop();
            throw error;
        }
    }
    
    capturePhoto(canvas) {
        canvas.width = this.videoElement.videoWidth;
        canvas.height = this.videoElement.videoHeight;
        canvas.getContext('2d').drawImage(this.videoElement, 0, 0);
        
        return new Promise(resolve => {
            canvas.toBlob(blob => {
                resolve(blob);
            }, 'image/jpeg', 0.95);
        });
    }
    
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
    }
}
