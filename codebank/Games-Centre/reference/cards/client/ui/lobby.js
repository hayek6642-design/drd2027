export class LobbyUI {
    constructor(app) {
        this.app = app;
        this.mode = 'practice';
        this.serviceLevel = 'A';
        this.bindEvents();
    }

    bindEvents() {
        console.log("LobbyUI: Binding events");
        
        // Mode Selection
        const modeOptions = document.getElementById('mode-options');
        if (modeOptions) {
            modeOptions.onclick = (e) => {
                const btn = e.target.closest('.btn');
                if (!btn) return;
                
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Mode clicked:', btn.dataset.mode);
                
                document.querySelectorAll('#mode-options .btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.mode = btn.dataset.mode;
                
                const serviceSection = document.getElementById('service-section');
                if (serviceSection) {
                    if (this.mode === 'practice') {
                        serviceSection.style.display = 'none';
                        this.serviceLevel = 'A';
                    } else {
                        serviceSection.style.display = 'block';
                    }
                }
            };
        }

        // Service Level Selection
        const serviceOptions = document.getElementById('service-options');
        if (serviceOptions) {
            serviceOptions.onclick = (e) => {
                const btn = e.target.closest('.btn');
                if (!btn) return;
                
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Service level clicked:', btn.dataset.level);
                
                document.querySelectorAll('#service-options .btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.serviceLevel = btn.dataset.level;
            };
        }

        // Start Button
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.onclick = (e) => {
                e.preventDefault();
                console.log('Start button clicked, mode:', this.mode, 'level:', this.serviceLevel);
                this.app.gameEngine.startGame(this.mode, this.serviceLevel);
            };
        }
    }
}
