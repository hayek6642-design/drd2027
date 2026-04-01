import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { STATES } from './watchdog-states.js';

export class WatchDogAnimator {
  constructor(scene) {
    this.scene = scene;
    this.state = STATES.IDLE;
    this.lastTime = performance.now() / 1000;
    this.time = 0;
    this.rafId = null;
    this.errorCount = 0;
    
    this.targets = {
      headRotX: 0, headRotY: 0, bodyRotX: 0, bodyPosY: 1.2,
      tailRotX: -Math.PI / 4, earRotX: 0, eyeColor: new THREE.Color(0x000000),
      glowIntensity: 0, cameraZ: 8, tongueScale: 0, torsoScale: 1
    };

    this.current = {
      headRotX: 0, headRotY: 0, bodyRotX: 0, bodyPosY: 1.2,
      tailRotX: -Math.PI / 4, earRotX: 0, eyeColor: new THREE.Color(0x000000),
      glowIntensity: 0, cameraZ: 8, tongueScale: 0, torsoScale: 1
    };

    // Pause animation when tab is hidden
    this.handleVisibilityChange = () => {
      if (document.hidden && this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      } else if (!document.hidden && !this.rafId) {
        this.start();
      }
    };

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  setState(state) {
    if (this.state === state) return; // Deduplication logic
    this.state = state;
    console.log('[WATCHDOG CORE] State change:', state);
    switch (state) {
      case STATES.IDLE:
        this.targets.headRotX = 0; this.targets.headRotY = 0;
        this.targets.bodyRotX = 0; this.targets.bodyPosY = 1.2;
        this.targets.tailRotX = -Math.PI / 4; this.targets.earRotX = 0;
        this.targets.eyeColor.setHex(0x000000); this.targets.glowIntensity = 0;
        this.targets.cameraZ = 8; this.targets.tongueScale = 0;
        break;
      case STATES.WATCHING:
        this.targets.headRotX = -0.15;
        this.targets.bodyRotX = 0; this.targets.bodyPosY = 1.2;
        this.targets.tailRotX = -Math.PI / 6; this.targets.earRotX = -0.3;
        this.targets.eyeColor.setHex(0x111111); this.targets.glowIntensity = 0;
        this.targets.cameraZ = 6.5; this.targets.tongueScale = 0;
        break;
      case STATES.ALERT:
        this.targets.headRotX = 0.3;
        this.targets.bodyRotX = -0.2; this.targets.bodyPosY = 1.0;
        this.targets.tailRotX = Math.PI / 3; this.targets.earRotX = -0.6;
        this.targets.eyeColor.setHex(0xff1100); this.targets.glowIntensity = 0.8;
        this.targets.cameraZ = 5.5; this.targets.tongueScale = 0;
        break;
      case STATES.HEALING:
        this.targets.headRotX = -0.2; this.targets.headRotY = 0;
        this.targets.bodyRotX = 0; this.targets.bodyPosY = 1.7;
        this.targets.tailRotX = -Math.PI / 4; this.targets.earRotX = 0.4;
        this.targets.eyeColor.setHex(0x00ffcc); this.targets.glowIntensity = 3.5;
        this.targets.cameraZ = 8; this.targets.tongueScale = 1;
        break;
    }
  }

  start() {
    if (this.rafId) return; // prevent duplicate loops

    this.lastTime = performance.now() / 1000;
    this.rafId = requestAnimationFrame(this.animate);
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    console.log('[WATCHDOG CORE] Animator stopped completely.');
  }

  animate = () => {
    // 🛡️ CRITICAL FIX: Ensure animator is active before proceeding
    if (!this.scene || this.rafId === null) {
      return;
    }

    const now = performance.now() / 1000;
    let delta = now - this.lastTime;
    
    // 🛡️ CRITICAL FIX: Sanitize delta to avoid NaN or negative values
    if (isNaN(delta) || delta < 0) {
      delta = 0.016; // Default to ~60fps
    }
    
    this.lastTime = now;

    const safeDelta = Math.min(delta, 0.1);
    this.time += safeDelta;

    try {
      if (this.scene && this.scene.scene && this.scene.camera && this.scene.renderer) {
        this.updateLogic(safeDelta);
        this.scene.renderer.render(this.scene.scene, this.scene.camera);
      }
    } catch (err) {
      // 🛡️ CRITICAL FIX: Only log error if count is low to avoid console flooding
      if (this.errorCount < 5) {
        console.error('[WatchDogAnimator] Animation crash:', err);
      }
      this.errorCount++;
      if (this.errorCount > 10) {
        console.warn('[WATCHDOG] Too many errors, shutting down animator');
        this.stop();
      }
      return;
    }

    // 🛡️ CRITICAL FIX: Check if we should still schedule next frame
    if (this.rafId !== null) {
      this.rafId = requestAnimationFrame(this.animate);
    }
  }

  updateLogic(delta) {
    const s = this.scene;
    // 🛡️ CRITICAL FIX: Extremely robust checks for all scene components
    if (!s || !s.scene || !s.camera || !s.renderer || !s.headGroup || !s.body || !s.neck || !s.tail || !s.tongue || !s.leftEye || !s.rightEye || !s.glowLight) {
      if (this.errorCount < 1) {
          console.warn('[WatchDogAnimator] updateLogic aborted: Scene components not fully initialized');
      }
      return;
    }
    
    let dynHeadX = this.targets.headRotX;
    let dynHeadY = this.targets.headRotY;
    let dynBodyY = this.targets.bodyPosY;
    let dynTailX = this.targets.tailRotX;
    let dynTorsoS = 1.0;

    // Organic behavior logic
    if (this.state === STATES.IDLE) {
      dynBodyY += Math.sin(this.time * 1.4) * 0.05;
      dynHeadX += Math.sin(this.time * 0.8) * 0.03;
      dynTailX += Math.sin(this.time * 2.8) * 0.1;
      dynTorsoS = 1.0 + Math.sin(this.time * 1.4) * 0.02; // Breathing
    } else if (this.state === STATES.WATCHING) {
      dynHeadY = Math.sin(this.time * 1.5) * 0.5;
      dynBodyY += Math.sin(this.time * 4.0) * 0.02;
      dynTorsoS = 1.0 + Math.sin(this.time * 4.0) * 0.01;
    } else if (this.state === STATES.ALERT) {
      dynBodyY += Math.sin(this.time * 30) * 0.02;
      dynHeadY = Math.sin(this.time * 8) * 0.2;
      dynTorsoS = 1.0 + Math.sin(this.time * 10) * 0.03;
    } else if (this.state === STATES.HEALING) {
      dynBodyY += Math.sin(this.time * 1.2) * 0.35;
      if (s.headGroup) s.headGroup.rotation.z = Math.sin(this.time * 1.8) * 0.1;
      dynTorsoS = 1.0 + Math.sin(this.time * 1.2) * 0.05;
    }

    const lerp = 6 * delta;
    this.current.headRotX += (dynHeadX - this.current.headRotX) * lerp;
    this.current.headRotY += (dynHeadY - this.current.headRotY) * lerp;
    this.current.bodyRotX += (this.targets.bodyRotX - this.current.bodyRotX) * lerp;
    this.current.bodyPosY += (dynBodyY - this.current.bodyPosY) * lerp;
    this.current.tailRotX += (dynTailX - this.current.tailRotX) * lerp;
    this.current.earRotX += (this.targets.earRotX - this.current.earRotX) * lerp;
    this.current.cameraZ += (this.targets.cameraZ - this.current.cameraZ) * (lerp * 0.5);
    this.current.glowIntensity += (this.targets.glowIntensity - this.current.glowIntensity) * lerp;
    
    if (this.current.eyeColor && this.targets.eyeColor) {
      this.current.eyeColor.lerp(this.targets.eyeColor, lerp);
    }
    
    this.current.tongueScale += (this.targets.tongueScale - this.current.tongueScale) * lerp;
    this.current.torsoScale += (dynTorsoS - this.current.torsoScale) * lerp;

    // Apply to objects
    if (s.headGroup) {
      s.headGroup.rotation.x = this.current.headRotX;
      s.headGroup.rotation.y = this.current.headRotY;
    }
    
    if (s.body) {
      s.body.rotation.x = this.current.bodyRotX;
      s.body.position.y = this.current.bodyPosY;
      s.body.scale.set(this.current.torsoScale, this.current.torsoScale * 0.95, 1.8);
    }
    
    if (s.leftEar && s.rightEar) {
      s.leftEar.rotation.z = 0.35 + this.current.earRotX;
      s.rightEar.rotation.z = -0.35 - this.current.earRotX;
      const flap = Math.sin(this.time * 2.0) * 0.08;
      s.leftEar.rotation.x = 0.3 + flap;
      s.rightEar.rotation.x = 0.3 + flap;
    }
    
    // Snout/Neck sync
    const yOff = this.current.bodyPosY - 1.2;
    if (s.headGroup) s.headGroup.position.y = 2.3 + yOff;
    if (s.neck) s.neck.position.y = 1.7 + yOff;
    
    if (s.tail) {
      s.tail.position.y = 1.5 + yOff;
      s.tail.rotation.z = Math.sin(this.time * 7) * 0.3;
      s.tail.rotation.x = -Math.PI / 2.5 + this.current.tailRotX;
    }

    // Tongue
    if (s.tongue) {
      s.tongue.scale.set(this.current.tongueScale, this.current.tongueScale, this.current.tongueScale);
      s.tongue.position.y = -0.35 + Math.sin(this.time * 5) * 0.05 * this.current.tongueScale;
    }

    // Blinking logic (subtle)
    const blink = Math.sin(this.time * 0.5) > 0.98 ? 0.1 : 1.0;
    if (s.leftEye) s.leftEye.scale.y = blink;
    if (s.rightEye) s.rightEye.scale.y = blink;

    if (s.leftEye && s.leftEye.material && s.leftEye.material.color) {
      s.leftEye.material.color.copy(this.current.eyeColor);
    }
    if (s.rightEye && s.rightEye.material && s.rightEye.material.color) {
      s.rightEye.material.color.copy(this.current.eyeColor);
    }
    
    if (s.glowLight) {
      s.glowLight.intensity = this.current.glowIntensity;
      if (s.glowLight.color) s.glowLight.color.copy(this.current.eyeColor);
    }

    if (s.camera) {
      s.camera.position.z = this.current.cameraZ;
      s.camera.position.y = 3 + Math.sin(this.time * 0.4) * 0.2;
      s.camera.lookAt(0, 1, 0);
    }
  }
}
