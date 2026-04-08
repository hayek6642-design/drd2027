import Matter from "matter-js";
import gsap from "gsap";

const { Engine, World, Bodies, Events } = Matter;

class AdvancedBalloonEngine {
  constructor(userId) {
    // 🚫 GLOBAL LOCK: prevent dual engine spawning
    if (window.__BALLOON_SYSTEM_LOCK__) {
      console.warn("🚫 Advanced balloon engine initialization blocked by global lock.");
      return;
    }

    this.userId = userId;
    this.engine = Engine.create();
    this.world = this.engine.world;
    this.engine.gravity.y = -0.05; // Balloons float upward
    
    this.balloons = [];
    this.clickCount = 0;
    this.spawnCount = 0;
    this.lastInteraction = Date.now();
    
    this._isRendering = false;
    this._physicsRunning = false;

    // Pause/resume render loop on visibility change
    this._visibilityHandler = () => {
      if (!document.hidden && this.balloons.length > 0) {
        this.startRendering();
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);

    this.setupCanvas();
    this.startPhysics();
    // 🚫 DISABLED: spawning handled by standalone system only
    // this.startSpawning();
    console.warn("🚫 Advanced balloon spawning disabled in favor of standalone system");
  }

  setupCanvas() {
    this.canvas = document.getElementById("balloonCanvas");
    this.ctx = this.canvas.getContext("2d");
    
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
    
    this.canvas.addEventListener("click", (e) => this.handleClick(e));
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  startPhysics() {
    this.runner = Matter.Runner.create();
    // Runner and render loop are started lazily in startRendering()
    // to avoid spinning CPU/GPU when there are no balloons.
  }

  // Call this whenever a balloon is spawned. Safe to call multiple times.
  startRendering() {
    if (this._isRendering) return;
    this._isRendering = true;
    if (!this._physicsRunning) {
      this._physicsRunning = true;
      Matter.Runner.run(this.runner, this.engine);
    }
    this.render();
  }

  stopRendering() {
    this._isRendering = false;
  }

  render() {
    // ⚡ Stop rendering when no longer needed
    if (!this._isRendering || document.hidden) {
      this._isRendering = false;
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let hasBalloons = false;
    this.world.bodies.forEach(body => {
      if (body.label === "balloon") {
        this.drawBalloon(body);
        hasBalloons = true;
      }
    });

    if (hasBalloons) {
      this.canvas.style.pointerEvents = 'auto';
      // Continue loop only while balloons exist
      requestAnimationFrame(() => this.render());
    } else {
      // ⚡ No balloons — stop the loop. Will restart next time a balloon spawns.
      this.canvas.style.pointerEvents = 'none';
      this._isRendering = false;
    }
  }

  drawBalloon(body) {
    const { x, y } = body.position;
    const radius = body.circleRadius || 30;
    
    // Balloon body
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = body.render?.fillStyle || "#ff4d6d";
    this.ctx.fill();
    
    // Balloon shine effect
    this.ctx.beginPath();
    this.ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.2, 0, Math.PI * 2);
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    this.ctx.fill();
    
    // Balloon string
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + radius);
    this.ctx.lineTo(x, y + radius * 2);
    this.ctx.strokeStyle = "#666";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  createBalloon(x, y) {
    const colors = ["#ff4d6d", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7", "#fd79a8"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const balloon = Bodies.circle(x, y, 30, {
      restitution: 0.9,
      frictionAir: 0.005,
      label: "balloon",
      render: { fillStyle: color }
    });

    balloon.pointValue = Math.random() > 0.3 ? Math.floor(Math.random() * 10) + 1 : 0;
    balloon.type = balloon.pointValue === 0 ? "empty" : 
                   balloon.pointValue > 5 ? "rare" : "normal";
    balloon.spawnedAt = Date.now();

    World.add(this.world, balloon);
    this.balloons.push(balloon);
    this.startRendering(); // ⚡ Start loop when first balloon spawns
    this.spawnCount++;
    console.log(`🎈 Created balloon at (${x}, ${y}) with color ${color}. Total: ${this.spawnCount}`);
    
    return balloon;
  }

  startSpawning() {
    console.log("🎈 Balloon spawning logic started");
    
    const spawnBalloon = (isFirst = false) => {
      // For the first balloon, always spawn from bottom center to notify the user
      const side = isFirst ? 0 : Math.floor(Math.random() * 4);
      let x, y, velocity;

      switch(side) {
        case 0: // Bottom
          x = isFirst ? window.innerWidth / 2 : Math.random() * window.innerWidth;
          y = window.innerHeight + 50;
          velocity = { x: (Math.random() - 0.5) * 2, y: -Math.random() * 5 - 6 };
          break;
        case 1: // Top
          x = Math.random() * window.innerWidth;
          y = -50;
          velocity = { x: (Math.random() - 0.5) * 2, y: Math.random() * 5 + 6 };
          break;
        case 2: // Left
          x = -50;
          y = Math.random() * window.innerHeight;
          velocity = { x: Math.random() * 5 + 6, y: (Math.random() - 0.5) * 2 };
          break;
        case 3: // Right
          x = window.innerWidth + 50;
          y = Math.random() * window.innerHeight;
          velocity = { x: -Math.random() * 5 - 6, y: (Math.random() - 0.5) * 2 };
          break;
      }

      const balloon = this.createBalloon(x, y);
      Matter.Body.setVelocity(balloon, velocity);
      console.log(`🎈 Spawned balloon from side: ${side} ${isFirst ? '(FIRST)' : ''}`);

      const nextSpawn = isFirst ? 2000 : Math.random() * 2500 + 1000; // 1s - 3.5s after first
      setTimeout(() => spawnBalloon(false), nextSpawn);
    };

    // Spawn first balloon after a small delay (0.5s) to ensure everything is ready
    setTimeout(() => spawnBalloon(true), 500);
  }

  handleClick(e) {
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    this.world.bodies.forEach(body => {
      if (body.label === "balloon") {
        const dx = body.position.x - mouseX;
        const dy = body.position.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 30 && !body.__popped) {
          body.__popped = true;
          this.sendTrustEvent(body, dist);
          this.popBalloon(body);
        }
      }
    });
  }

  async sendTrustEvent(balloon, dist) {
    try {
      const radius = balloon.circleRadius || 30;
      const rt = Date.now() - (balloon.spawnedAt || Date.now());
      let type = 'existence';
      if (balloon.type === 'rare') type = 'golden';
      else if (balloon.type === 'normal') type = 'low';
      else if (balloon.type === 'empty') type = 'trap';
      const accuracyRaw = 1 - (dist / radius);
      const clickAccuracy = Math.max(0, Math.min(1, accuracyRaw));
      await fetch("/api/trust/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: this.userId,
          balloonType: type,
          reactionTime: rt,
          clickAccuracy,
          timestamp: Date.now()
        })
      });
    } catch (e) {
      console.warn('Trust event failed', e && e.message ? e.message : e);
    }
  }

  popBalloon(balloon) {
    // Animation
    gsap.to(balloon, {
      duration: 0.2,
      onUpdate: () => {
        balloon.circleRadius *= 0.9;
      }
    });

    // Points logic
    this.clickCount++;
    this.lastInteraction = Date.now();
    
    if (balloon.pointValue > 0) {
      this.showPointsEffect(balloon.position.x, balloon.position.y, balloon.pointValue);
      this.sendPointsToBackend(balloon.pointValue);
    }

    // Remove from world
    setTimeout(() => {
      Matter.World.remove(this.world, balloon);
      this.balloons = this.balloons.filter(b => b !== balloon);
    }, 200);
  }

  showPointsEffect(x, y, points) {
    const effect = document.createElement('div');
    effect.className = 'balloon-points-effect';
    effect.textContent = `+${points}`;
    effect.style.position = 'fixed';
    effect.style.left = `${x}px`;
    effect.style.top = `${y}px`;
    effect.style.fontSize = '20px';
    effect.style.fontWeight = 'bold';
    effect.style.color = points > 5 ? '#ffd700' : '#4CAF50';
    effect.style.pointerEvents = 'none';
    effect.style.zIndex = '10000';
    effect.style.transform = 'translate(-50%, -50%)';
    
    document.body.appendChild(effect);
    
    gsap.to(effect, {
      duration: 1.5,
      y: y - 100,
      opacity: 0,
      scale: 1.5,
      ease: "power2.out",
      onComplete: () => {
        effect.remove();
      }
    });
  }

  async sendPointsToBackend(points) {
    try {
      await fetch("/api/balloon/pop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          points,
          timestamp: Date.now(),
          userId: this.userId
        })
      });
    } catch (error) {
      console.error("Failed to send points to backend:", error);
    }
  }

  getEngagementScore() {
    if (this.spawnCount === 0) return 0;
    return this.clickCount / this.spawnCount;
  }

  isActiveUser() {
    return this.getEngagementScore() >= 0.3;
  }

  cleanup() {
    this.world.bodies.forEach(body => {
      if (body.label === "balloon") {
        Matter.World.remove(this.world, body);
      }
    });
    this.balloons = [];
  }
}

// Export for browser
if (typeof window !== 'undefined') {
  window.AdvancedBalloonEngine = AdvancedBalloonEngine;
}

export { AdvancedBalloonEngine };
