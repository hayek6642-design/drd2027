/**
 * watchdog-animator.js — Enhanced dog animation
 * Animates the procedural 3D dog from watchdog-scene.js.
 * States: idle | watching | alert | healing
 */
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

    // Smooth interpolation targets
    this.targets = {
      headRotX: 0, headRotY: 0,
      bodyRotX: 0, bodyPosY: 1.3,
      tailRotZ: 0.2,
      earLean: 0,           // 0 = neutral, negative = back/alert
      eyeEmissive: new THREE.Color(0xb043ff),
      glowIntensity: 0,
      cameraZ: 8,
      tongueScale: 0,
      torsoBreath: 1.0,
      ringOpacity: 0.18,
      ringColor: new THREE.Color(0xb043ff)
    };

    this.current = {
      headRotX: 0, headRotY: 0,
      bodyRotX: 0, bodyPosY: 1.3,
      tailRotZ: 0.2,
      earLean: 0,
      eyeEmissive: new THREE.Color(0xb043ff),
      glowIntensity: 0,
      cameraZ: 8,
      tongueScale: 0,
      torsoBreath: 1.0,
      ringOpacity: 0.18,
      ringColor: new THREE.Color(0xb043ff)
    };

    // Pause when tab hidden
    this._visHandler = () => {
      if (document.hidden) {
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
      } else if (!this.rafId) {
        this.start();
      }
    };
    document.addEventListener('visibilitychange', this._visHandler);
  }

  // ─────────────────────────────────────────────
  setState(state) {
    if (this.state === state) return;
    this.state = state;
    console.log('[WatchDog] State →', state);

    switch (state) {
      case STATES.IDLE:
        this.targets.headRotX = 0;       this.targets.headRotY = 0;
        this.targets.bodyRotX = 0;       this.targets.bodyPosY = 1.3;
        this.targets.tailRotZ = 0.2;     this.targets.earLean = 0;
        this.targets.eyeEmissive.setHex(0xb043ff);
        this.targets.glowIntensity = 0.3;
        this.targets.cameraZ = 8;        this.targets.tongueScale = 0;
        this.targets.ringOpacity = 0.18; this.targets.ringColor.setHex(0xb043ff);
        break;

      case STATES.WATCHING:
        this.targets.headRotX = -0.18;   this.targets.headRotY = 0;
        this.targets.bodyRotX = 0;       this.targets.bodyPosY = 1.3;
        this.targets.tailRotZ = 0.1;     this.targets.earLean = -0.25;
        this.targets.eyeEmissive.setHex(0x4499ff);
        this.targets.glowIntensity = 0.8;
        this.targets.cameraZ = 6.5;      this.targets.tongueScale = 0;
        this.targets.ringOpacity = 0.28; this.targets.ringColor.setHex(0x4499ff);
        break;

      case STATES.ALERT:
        this.targets.headRotX = 0.25;    this.targets.headRotY = 0;
        this.targets.bodyRotX = -0.18;   this.targets.bodyPosY = 1.05;
        this.targets.tailRotZ = -0.1;    this.targets.earLean = -0.55;
        this.targets.eyeEmissive.setHex(0xff1100);
        this.targets.glowIntensity = 2.5;
        this.targets.cameraZ = 5.5;      this.targets.tongueScale = 0;
        this.targets.ringOpacity = 0.45; this.targets.ringColor.setHex(0xff2200);
        break;

      case STATES.HEALING:
        this.targets.headRotX = -0.22;   this.targets.headRotY = 0;
        this.targets.bodyRotX = 0;       this.targets.bodyPosY = 1.6;
        this.targets.tailRotZ = 0.8;     this.targets.earLean = 0.3;
        this.targets.eyeEmissive.setHex(0x00ffcc);
        this.targets.glowIntensity = 3.8;
        this.targets.cameraZ = 8;        this.targets.tongueScale = 1;
        this.targets.ringOpacity = 0.5;  this.targets.ringColor.setHex(0x00ffcc);
        break;
    }
  }

  // ─────────────────────────────────────────────
  start() {
    if (this.rafId) return;
    this.lastTime = performance.now() / 1000;
    this.rafId = requestAnimationFrame(this._animate);
  }

  stop() {
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    document.removeEventListener('visibilitychange', this._visHandler);
    console.log('[WatchDog] Animator stopped');
  }

  // ─────────────────────────────────────────────
  _animate = () => {
    if (!this.scene || this.rafId === null) return;

    const now = performance.now() / 1000;
    let delta = now - this.lastTime;
    if (isNaN(delta) || delta < 0) delta = 0.016;
    this.lastTime = now;

    const dt = Math.min(delta, 0.1);
    this.time += dt;

    try {
      const s = this.scene;
      if (s?.scene && s?.camera && s?.renderer) {
        this._update(dt);
        s.renderer.render(s.scene, s.camera);
      }
    } catch (err) {
      if (this.errorCount < 5) console.error('[WatchDogAnimator] Error:', err);
      this.errorCount++;
      if (this.errorCount > 12) { this.stop(); return; }
    }

    if (this.rafId !== null) this.rafId = requestAnimationFrame(this._animate);
  }

  // ─────────────────────────────────────────────
  _update(dt) {
    const s = this.scene;
    if (!s?.headGroup || !s?.body || !s?.neck || !s?.tail || !s?.tongue ||
        !s?.leftEye || !s?.rightEye || !s?.glowLight) return;

    const t = this.time;
    const lerp = 5.5 * dt;
    const lerpFast = 10 * dt;

    // ── Procedural overrides (layered on top of targets) ──
    let dynHeadX = this.targets.headRotX;
    let dynHeadY = this.targets.headRotY;
    let dynBodyY = this.targets.bodyPosY;
    let dynTailZ  = this.targets.tailRotZ;
    let dynBreath = 1.0;

    switch (this.state) {
      case STATES.IDLE:
        dynBodyY  += Math.sin(t * 1.35) * 0.045;           // Gentle body sway
        dynHeadX  += Math.sin(t * 0.7) * 0.025;            // Slow nod
        dynTailZ  += Math.sin(t * 2.5) * 0.18;             // Lazy wag
        dynBreath  = 1.0 + Math.sin(t * 1.5) * 0.022;      // Breathing
        break;

      case STATES.WATCHING:
        dynHeadY   = Math.sin(t * 1.4) * 0.55;             // Scan left-right
        dynBodyY  += Math.sin(t * 3.8) * 0.018;
        dynBreath  = 1.0 + Math.sin(t * 3.8) * 0.012;
        dynTailZ  += Math.sin(t * 1.8) * 0.1;
        break;

      case STATES.ALERT:
        dynBodyY  += Math.sin(t * 28) * 0.018;             // Tense tremor
        dynHeadY   = Math.sin(t * 7) * 0.18;               // Jerky head track
        dynBreath  = 1.0 + Math.sin(t * 8) * 0.03;
        dynTailZ  += Math.sin(t * 12) * 0.05;              // Stiff tail flick
        break;

      case STATES.HEALING:
        dynBodyY  += Math.sin(t * 1.2) * 0.28;             // Happy bounce
        if (s.headGroup) s.headGroup.rotation.z = Math.sin(t * 1.9) * 0.12;
        dynTailZ  += Math.sin(t * 9) * 0.55;               // Rapid wag
        dynBreath  = 1.0 + Math.sin(t * 1.2) * 0.04;
        break;
    }

    // ── Smooth-lerp all values ──────────────────
    this.current.headRotX += (dynHeadX - this.current.headRotX) * lerp;
    this.current.headRotY += (dynHeadY - this.current.headRotY) * lerp;
    this.current.bodyRotX += (this.targets.bodyRotX - this.current.bodyRotX) * lerp;
    this.current.bodyPosY += (dynBodyY - this.current.bodyPosY) * lerp;
    this.current.tailRotZ += (dynTailZ - this.current.tailRotZ) * lerp;
    this.current.earLean  += (this.targets.earLean - this.current.earLean) * lerp;
    this.current.cameraZ  += (this.targets.cameraZ - this.current.cameraZ) * (lerp * 0.4);
    this.current.glowIntensity += (this.targets.glowIntensity - this.current.glowIntensity) * lerp;
    this.current.tongueScale   += (this.targets.tongueScale - this.current.tongueScale) * lerp;
    this.current.torsoBreath   += (dynBreath - this.current.torsoBreath) * lerpFast;
    this.current.ringOpacity   += (this.targets.ringOpacity - this.current.ringOpacity) * lerp;
    this.current.eyeEmissive.lerp(this.targets.eyeEmissive, lerp);
    this.current.ringColor.lerp(this.targets.ringColor, lerp);

    const yOff = this.current.bodyPosY - 1.3;

    // ── Apply: Head ─────────────────────────────
    s.headGroup.rotation.x = this.current.headRotX;
    s.headGroup.rotation.y = this.current.headRotY;
    s.headGroup.position.y = 2.42 + yOff;
    if (this.state !== STATES.HEALING) s.headGroup.rotation.z = 0;

    // ── Apply: Neck ─────────────────────────────
    s.neck.position.y = 1.85 + yOff;

    // ── Apply: Body ─────────────────────────────
    s.body.rotation.x = this.current.bodyRotX;
    s.body.position.y = this.current.bodyPosY;
    const bs = this.current.torsoBreath;
    s.body.scale.set(1.1 * bs, 0.88 * bs, 2.0);

    // ── Apply: Ears ─────────────────────────────
    if (s.leftEar && s.rightEar) {
      const earTilt = this.current.earLean;
      const earFlap = Math.sin(t * 1.8) * 0.06;
      s.leftEar.rotation.z  = 0.28 + earTilt * 0.5 + earFlap;
      s.rightEar.rotation.z = -(0.28 + earTilt * 0.5 + earFlap);
      s.leftEar.rotation.x  = -0.12 + earTilt;
      s.rightEar.rotation.x = -0.12 + earTilt;
    }

    // ── Apply: Tail ─────────────────────────────
    if (s.tail) {
      s.tail.rotation.z = this.current.tailRotZ;
      s.tail.position.y = 1.5 + yOff * 0.5;
    }

    // ── Apply: Tongue ───────────────────────────
    if (s.tongue) {
      const ts = this.current.tongueScale;
      s.tongue.scale.set(ts, ts, ts);
      s.tongue.position.y = -0.39 + Math.sin(t * 5) * 0.04 * ts;
    }

    // ── Apply: Eyes (emissive color) ────────────
    const blinkScale = Math.sin(t * 0.45) > 0.97 ? 0.12 : 1.0;
    if (s.leftEye?.material) {
      s.leftEye.material.emissive.copy(this.current.eyeEmissive);
      s.leftEye.scale.y = blinkScale;
    }
    if (s.rightEye?.material) {
      s.rightEye.material.emissive.copy(this.current.eyeEmissive);
      s.rightEye.scale.y = blinkScale;
    }

    // ── Apply: Eye light ────────────────────────
    if (s.eyeLight) {
      s.eyeLight.color.copy(this.current.eyeEmissive);
      s.eyeLight.intensity = 0.4 + this.current.glowIntensity * 0.15;
    }

    // ── Apply: Glow light ───────────────────────
    s.glowLight.intensity = this.current.glowIntensity;
    s.glowLight.color.copy(this.current.eyeEmissive);

    // ── Apply: Guardian rings ───────────────────
    if (s.guardianRing?.material) {
      const ringPulse = this.state === STATES.ALERT
        ? Math.abs(Math.sin(t * 6)) * 0.6
        : 0.1 + Math.abs(Math.sin(t * 1.3)) * this.current.ringOpacity;
      s.guardianRing.material.opacity = ringPulse;
      s.guardianRing.material.color.copy(this.current.ringColor);
    }
    if (s.innerRing?.material) {
      s.innerRing.material.opacity = 0.08 + Math.abs(Math.sin(t * 2.1)) * 0.12;
      s.innerRing.material.color.copy(this.current.ringColor);
    }

    // ── Apply: Legs ─────────────────────────────
    if (s.legGroups?.length === 4) {
      s.legGroups.forEach(({ group, lower, isFront }, i) => {
        const phase = i * (Math.PI / 2);

        switch (this.state) {
          case STATES.IDLE:
            group.rotation.x = Math.sin(t * 1.1 + phase) * 0.035;
            break;
          case STATES.WATCHING:
            group.rotation.x = Math.sin(t * 0.8 + phase) * 0.02;
            break;
          case STATES.ALERT:
            group.rotation.x = Math.sin(t * 18 + phase) * 0.025; // Tense tremor
            if (lower) lower.rotation.x = Math.sin(t * 14 + phase) * 0.03;
            break;
          case STATES.HEALING:
            // Happy paw tapping (front legs)
            if (isFront) {
              const tap = Math.max(0, Math.sin(t * 5 + phase)) * 0.18;
              group.rotation.x = tap;
              if (lower) lower.rotation.x = -tap * 0.6;
            } else {
              group.rotation.x = Math.sin(t * 1.2 + phase) * 0.04;
            }
            break;
          default:
            group.rotation.x *= 0.9;
            if (lower) lower.rotation.x *= 0.9;
        }
      });
    }

    // ── Apply: Camera ───────────────────────────
    s.camera.position.z = this.current.cameraZ;
    s.camera.position.y = 3.2 + Math.sin(t * 0.38) * 0.18;
    s.camera.lookAt(0, 1.2, 0);
  }
}
