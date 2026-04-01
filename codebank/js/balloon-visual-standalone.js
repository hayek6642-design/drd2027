(function() {
    // 1. Prevent duplicate initialization
    if (window.__BALLOON_STANDALONE_INITIALIZED__) return;
    window.__BALLOON_STANDALONE_INITIALIZED__ = true;

    console.log("🎈 Standalone Visual Balloon Engine Loaded (Ready for trigger)");

    // Global State
    let activeBalloon = null;
    window.__BALLOON_POINTS__ = window.__BALLOON_POINTS__ || 0; // Global points state
    const colors = ["#ff4d6d", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7", "#fd79a8"];

    // UI Helpers
    function ensureLayer() {
        let layer = document.getElementById('balloon-layer');
        if (!layer) {
            layer = document.createElement('div');
            layer.id = 'balloon-layer';
            Object.assign(layer.style, {
                position: 'fixed', inset: '0', width: '100vw', height: '100vh',
                pointerEvents: 'none', zIndex: '9999999', overflow: 'hidden'
            });
            document.body.appendChild(layer);
        }
        return layer;
    }

    // Update global points and dispatch event
    function updateBalloonPoints(delta, side) {
        window.__BALLOON_POINTS__ += delta;
        console.log("🎯 Balloon Points:", window.__BALLOON_POINTS__, "Side:", side);
        window.dispatchEvent(new CustomEvent('balloon:points:update', {
            detail: { 
                points: window.__BALLOON_POINTS__,
                delta: delta,
                side: side
            }
        }));
    }

    // 5. Spawn One Balloon
    function spawnBalloon() {
        if (activeBalloon) return; // 🚫 Only one at a time

        const layer = ensureLayer();
        const sides = ['left', 'right', 'top', 'bottom'];
        const side = sides[Math.floor(Math.random() * sides.length)];
        
        let x, y, velX = 0, velY = 0, isDanger = false;

        if (side === 'left') {
            x = -50; y = Math.random() * window.innerHeight; velX = 1.5;
            isDanger = true; // Left side is danger (lose points)
        } else if (side === 'right') {
            x = window.innerWidth + 50; y = Math.random() * window.innerHeight; velX = -1.5;
            isDanger = false; // Right side is reward (gain points)
        } else if (side === 'top') {
            x = Math.random() * window.innerWidth; y = -100; velY = 1.5;
            isDanger = false; // Top side is reward
        } else { // bottom
            x = Math.random() * window.innerWidth; y = window.innerHeight + 50; velY = -1.5;
            isDanger = false; // Bottom side is reward
        }

        const balloonEl = document.createElement('div');
        const size = 50;
        Object.assign(balloonEl.style, {
            position: 'absolute', width: `${size}px`, height: `${size * 1.2}px`,
            background: isDanger ? '#f85149' : colors[Math.floor(Math.random() * colors.length)], // Red for danger
            borderRadius: '50%', left: `${x}px`, top: `${y}px`,
            pointerEvents: 'auto', cursor: 'pointer', zIndex: '9999999',
            transition: 'transform 0.2s, opacity 0.2s'
        });
        balloonEl.dataset.type = isDanger ? 'danger' : 'reward';
        balloonEl.dataset.side = side;

        balloonEl.onclick = () => {
            if (balloonEl.__popped) return;
            balloonEl.__popped = true;

            const delta = (balloonEl.dataset.type === 'danger') ? -10 : 10;
            if (balloonEl.dataset.type === 'danger') {
                console.log("💣 Dangerous balloon clicked");
            } else {
                console.log("🎁 Reward balloon clicked");
            }
            updateBalloonPoints(delta, balloonEl.dataset.side);
            
            balloonEl.style.transform = 'scale(1.5)';
            balloonEl.style.opacity = '0';
            setTimeout(() => { balloonEl.remove(); activeBalloon = null; }, 200);
        };

        layer.appendChild(balloonEl);
        activeBalloon = balloonEl;

        const animate = () => {
            if (!document.body.contains(balloonEl)) return;
            x += velX; y += velY;
            balloonEl.style.left = `${x}px`;
            balloonEl.style.top = `${y}px`;
            if (y < -200 || y > window.innerHeight + 200 || x < -200 || x > window.innerWidth + 200) {
                balloonEl.remove(); activeBalloon = null;
            } else { requestAnimationFrame(animate); }
        };
        requestAnimationFrame(animate);
    }

    // 🎯 EXPORT GLOBAL TRIGGER
    window.startBalloonSystem = function() {
        if (window.__BALLOON_STANDALONE_RUNNING__) {
            console.warn("🚫 Balloon system already running.");
            return;
        }
        window.__BALLOON_STANDALONE_RUNNING__ = true;
        window.__BALLOON_SYSTEM_LOCK__ = false;

        console.log("🎈 Standalone Balloon system started via trigger");
        // No score UI creation here, only logic

        // Spawn first balloon after 10 seconds
        setTimeout(spawnBalloon, 10000);

        // Regular spawning every 5 minutes
        setInterval(spawnBalloon, 5 * 60 * 1000);
    };

    // Auto-start if already authenticated (fallback for direct page load)
    if (window.Auth && typeof window.Auth.isAuthenticated === 'function' && window.Auth.isAuthenticated()) {
        window.startBalloonSystem();
    }
})();
