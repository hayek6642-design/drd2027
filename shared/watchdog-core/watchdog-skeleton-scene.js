/**
 * watchdog-skeleton-scene.js — Dead dog skeleton 3D model
 * Pure Three.js primitives, no GLB, no external assets
 */
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class WatchDogSkeletonScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050508, 0.08);

    const w = container.clientWidth || 300;
    const h = container.clientHeight || 300;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 2.5, 7);
    this.camera.lookAt(0, 0.8, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
    container.appendChild(this.renderer.domElement);

    this._buildLighting();
    this._buildFloor();
    this._buildSkeletonDog();
    this._startAnimation();

    console.log('[SkeletonScene] Dead dog skeleton created');
    window.dispatchEvent(new CustomEvent('watchdog:skeleton-loaded'));
  }

  _buildLighting() {
    this.scene.add(new THREE.AmbientLight(0x222222, 0.5));
    const dirLight = new THREE.DirectionalLight(0x8888aa, 0.8);
    dirLight.position.set(3, 8, 4);
    dirLight.castShadow = true;
    this.scene.add(dirLight);
    // Eerie red underlighting
    const redLight = new THREE.PointLight(0xff2200, 0.5, 15);
    redLight.position.set(0, 0.5, 0);
    this.scene.add(redLight);
    // Dim skull glow
    this.skullGlow = new THREE.PointLight(0x440000, 0.3, 5);
    this.skullGlow.position.set(0, 1.8, 1.5);
    this.scene.add(this.skullGlow);
  }

  _buildFloor() {
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 1.0 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    this.scene.add(plane);
  }

  _buildSkeletonDog() {
    this.dogGroup = new THREE.Group();
    // Tilt the whole skeleton slightly — the dog is collapsed
    this.dogGroup.rotation.z = 0.15;
    this.dogGroup.position.y = 0.05;

    const boneMat = new THREE.MeshStandardMaterial({
      color: 0xd4c9a8,
      roughness: 0.6,
      metalness: 0.05,
      emissive: 0x110d00,
      emissiveIntensity: 0.2
    });
    const darkBoneMat = new THREE.MeshStandardMaterial({
      color: 0xb5a888,
      roughness: 0.7,
      metalness: 0.0
    });

    // ── RIBCAGE (elongated oval cage) ──
    const ribGroup = new THREE.Group();
    ribGroup.position.set(0, 0.9, 0);
    // Spine
    const spine = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 1.1, 4, 8), boneMat);
    spine.rotation.x = Math.PI / 2;
    spine.position.z = 0;
    ribGroup.add(spine);
    // Ribs (6 pairs)
    for (let i = 0; i < 6; i++) {
      const z = -0.45 + i * 0.18;
      const ribGeo = new THREE.TorusGeometry(0.28 - i * 0.01, 0.025, 5, 12, Math.PI);
      [-1, 1].forEach(side => {
        const rib = new THREE.Mesh(ribGeo, boneMat);
        rib.rotation.x = Math.PI / 2;
        rib.rotation.z = side * Math.PI / 2;
        rib.position.set(0, 0, z);
        rib.scale.set(side, 1, 0.85);
        ribGroup.add(rib);
      });
    }
    this.dogGroup.add(ribGroup);

    // ── SKULL ──
    const skullGroup = new THREE.Group();
    skullGroup.position.set(0, 1.55, 0.95);
    // Cranium
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), boneMat);
    cranium.scale.set(1.0, 1.05, 1.2);
    skullGroup.add(cranium);
    // Snout
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.45), boneMat);
    snout.position.set(0, -0.1, 0.38);
    skullGroup.add(snout);
    // Eye sockets (dark holes)
    const socketMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1.0 });
    [-0.12, 0.12].forEach(x => {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 6), socketMat);
      socket.position.set(x, 0.06, 0.25);
      skullGroup.add(socket);
    });
    // Teeth (upper jaw)
    for (let i = 0; i < 6; i++) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 5), darkBoneMat);
      t.position.set(-0.1 + i * 0.04, -0.18, 0.55);
      t.rotation.x = Math.PI;
      skullGroup.add(t);
    }
    // Ear bones (remnant spikes)
    [-0.24, 0.24].forEach((x, i) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 5), boneMat);
      ear.position.set(x, 0.3, -0.0);
      ear.rotation.z = i === 0 ? 0.3 : -0.3;
      skullGroup.add(ear);
    });
    this.dogGroup.add(skullGroup);

    // ── NECK BONES ──
    for (let i = 0; i < 3; i++) {
      const vert = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.12, 6), boneMat);
      vert.position.set(0, 1.0 + i * 0.18, 0.55 + i * 0.12);
      vert.rotation.x = -0.4;
      this.dogGroup.add(vert);
    }

    // ── PELVIS ──
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), boneMat);
    pelvis.scale.set(1.3, 0.8, 1.0);
    pelvis.position.set(0, 0.75, -0.62);
    this.dogGroup.add(pelvis);

    // ── LEGS (4x bone stacks, collapsed) ──
    const legPositions = [
      { x: -0.28, z: 0.45 },
      { x:  0.28, z: 0.45 },
      { x: -0.28, z: -0.55 },
      { x:  0.28, z: -0.55 },
    ];
    legPositions.forEach(({ x, z }, i) => {
      // Upper bone
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.35, 4, 6), boneMat);
      // Back legs are more collapsed
      const tilt = i >= 2 ? 0.9 : 0.5;
      upper.rotation.x = tilt;
      upper.position.set(x, 0.55, z);
      this.dogGroup.add(upper);
      // Lower bone
      const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.28, 4, 6), boneMat);
      lower.rotation.x = -0.3;
      lower.position.set(x, 0.18, z + 0.12);
      this.dogGroup.add(lower);
      // Paw bones
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), boneMat);
      paw.scale.set(1.3, 0.4, 1.6);
      paw.position.set(x, 0.04, z + 0.18);
      this.dogGroup.add(paw);
    });

    // ── TAIL BONES ──
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.045 * (1 - i * 0.12), 5, 4), boneMat);
      seg.position.set(0, 0.5 - i * 0.04, -0.65 - i * 0.1);
      this.dogGroup.add(seg);
    }

    // Scattered debris (small bone fragments)
    for (let i = 0; i < 5; i++) {
      const frag = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3), darkBoneMat);
      frag.position.set(
        (Math.random() - 0.5) * 1.2,
        0.02,
        (Math.random() - 0.5) * 1.2
      );
      this.dogGroup.add(frag);
    }

    this.scene.add(this.dogGroup);
  }

  _startAnimation() {
    this.time = 0;
    this.rafId = null;
    const animate = () => {
      this.rafId = requestAnimationFrame(animate);
      this.time += 0.008;
      // Very slow creepy sway
      if (this.dogGroup) {
        this.dogGroup.rotation.y = Math.sin(this.time * 0.3) * 0.04;
      }
      if (this.skullGlow) {
        this.skullGlow.intensity = 0.2 + Math.sin(this.time * 1.5) * 0.15;
      }
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  resize() {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
    this.scene.traverse(obj => {
      if (obj.isMesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material?.dispose();
      }
    });
  }
}
