/**
 * watchdog-scene.js — FULLY CODED 3D Guardian Dog (no .glb, no GLTFLoader)
 * Uses only Three.js primitives + MeshStandardMaterial for a rich, animated dog.
 * Supports states: idle | watching | alert | healing
 */
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class WatchDogScene {
  constructor(container) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x080814, 0.06);

    const w = container.clientWidth || 300;
    const h = container.clientHeight || 300;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 3.2, 8);
    this.camera.lookAt(0, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
    container.appendChild(this.renderer.domElement);

    this._buildLighting();
    this._buildFloor();
    this._buildDog();

    console.log('[WatchDogScene] ✅ Procedural guardian dog created (no GLB required)');
    window.dispatchEvent(new CustomEvent('watchdog:model-loaded'));
  }

  // ─────────────────────────────────────────────
  //  LIGHTING
  // ─────────────────────────────────────────────
  _buildLighting() {
    // Ambient — cool purple night
    this.scene.add(new THREE.AmbientLight(0x9966ff, 0.35));

    // Main key light
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    this.dirLight.position.set(5, 10, 5);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(1024, 1024);
    this.dirLight.shadow.camera.near = 0.1;
    this.dirLight.shadow.camera.far = 50;
    this.scene.add(this.dirLight);

    // Rim light (back-purple silhouette)
    const rimLight = new THREE.DirectionalLight(0xb043ff, 0.7);
    rimLight.position.set(-4, 6, -6);
    this.scene.add(rimLight);

    // Front fill
    const fillLight = new THREE.PointLight(0x3355ff, 0.4, 20);
    fillLight.position.set(0, 3, 7);
    this.scene.add(fillLight);

    // Guardian glow — driven by state
    this.glowLight = new THREE.PointLight(0xb043ff, 0, 12);
    this.glowLight.position.set(0, 2.2, 0);
    this.scene.add(this.glowLight);

    // Eye-level dramatic light
    this.eyeLight = new THREE.PointLight(0xb043ff, 0.6, 4);
    this.eyeLight.position.set(0, 2.6, 2.8);
    this.scene.add(this.eyeLight);
  }

  // ─────────────────────────────────────────────
  //  FLOOR + GUARDIAN RINGS
  // ─────────────────────────────────────────────
  _buildFloor() {
    // Shadow-catch plane
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    this.scene.add(plane);

    // Outer guardian ring
    this.guardianRing = new THREE.Mesh(
      new THREE.RingGeometry(1.9, 2.3, 72),
      new THREE.MeshBasicMaterial({
        color: 0xb043ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.18
      })
    );
    this.guardianRing.rotation.x = -Math.PI / 2;
    this.guardianRing.position.y = 0.01;
    this.scene.add(this.guardianRing);

    // Inner ring
    this.innerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.95, 64),
      new THREE.MeshBasicMaterial({
        color: 0xff77e9,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.12
      })
    );
    this.innerRing.rotation.x = -Math.PI / 2;
    this.innerRing.position.y = 0.02;
    this.scene.add(this.innerRing);
  }

  // ─────────────────────────────────────────────
  //  DOG CONSTRUCTION
  // ─────────────────────────────────────────────
  _buildDog() {
    this.dogGroup = new THREE.Group();

    // ── Materials ──────────────────────────────
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1c1c30,
      roughness: 0.7,
      metalness: 0.18,
      emissive: 0x110033,
      emissiveIntensity: 0.15
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a44,
      roughness: 0.8,
      metalness: 0.05
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x101022,
      roughness: 0.75,
      metalness: 0.08
    });
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0x060608,
      roughness: 0.35,
      metalness: 0.05
    });
    // Eye material — emissive, updated per state
    this.eyeMat = new THREE.MeshStandardMaterial({
      color: 0x050508,
      emissive: 0xb043ff,
      emissiveIntensity: 2.0,
      roughness: 0.05,
      metalness: 0.9
    });
    const eyeMatR = this.eyeMat.clone(); // independent clone for right eye
    const tongueMat = new THREE.MeshStandardMaterial({
      color: 0xff66aa,
      roughness: 0.4,
      emissive: 0xff2266,
      emissiveIntensity: 0.3
    });

    // ── Torso ──────────────────────────────────
    this.body = new THREE.Mesh(new THREE.SphereGeometry(0.76, 20, 14), bodyMat);
    this.body.scale.set(1.1, 0.88, 2.0);
    this.body.position.y = 1.3;
    this.body.castShadow = true;
    this.dogGroup.add(this.body);

    // Chest underside (lighter)
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), accentMat);
    chest.scale.set(0.85, 0.7, 1.4);
    chest.position.set(0, 1.0, 0.35);
    this.dogGroup.add(chest);

    // ── Neck ───────────────────────────────────
    this.neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.5, 8, 12), bodyMat);
    this.neck.position.set(0, 1.85, 0.98);
    this.neck.rotation.x = -Math.PI / 4.5;
    this.neck.castShadow = true;
    this.dogGroup.add(this.neck);

    // ── Head group ─────────────────────────────
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.42, 1.62);

    // Skull
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.47, 18, 14), bodyMat);
    this.head.scale.set(1.0, 1.05, 1.18);
    this.head.castShadow = true;
    this.headGroup.add(this.head);

    // Forehead bump
    const ridgeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), bodyMat);
    ridgeMesh.scale.set(1.3, 0.65, 1.0);
    ridgeMesh.position.set(0, 0.3, 0.22);
    this.headGroup.add(ridgeMesh);

    // Muzzle (elongated shepherd snout)
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.29, 14, 10), bodyMat);
    muzzle.scale.set(0.82, 0.72, 1.7);
    muzzle.position.set(0, -0.2, 0.52);
    this.headGroup.add(muzzle);

    // Nose tip (black)
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), noseMat);
    nose.position.set(0, -0.11, 0.97);
    this.headGroup.add(nose);

    // ── Ears (pointed, cone-based) ─────────────
    const earGeo = new THREE.ConeGeometry(0.17, 0.52, 7);
    const innerEarGeo = new THREE.ConeGeometry(0.09, 0.36, 7);
    const innerEarMat = new THREE.MeshStandardMaterial({ color: 0x2a1830, roughness: 0.9 });

    this.leftEar = new THREE.Mesh(earGeo, bodyMat);
    this.leftEar.position.set(-0.34, 0.44, -0.04);
    this.leftEar.rotation.set(-0.12, 0, 0.28);
    this.leftEar.castShadow = true;

    this.rightEar = new THREE.Mesh(earGeo, bodyMat);
    this.rightEar.position.set(0.34, 0.44, -0.04);
    this.rightEar.rotation.set(-0.12, 0, -0.28);
    this.rightEar.castShadow = true;

    const leftInner = new THREE.Mesh(innerEarGeo, innerEarMat);
    leftInner.position.set(-0.34, 0.44, -0.02);
    leftInner.rotation.set(-0.12, 0, 0.28);

    const rightInner = new THREE.Mesh(innerEarGeo, innerEarMat);
    rightInner.position.set(0.34, 0.44, -0.02);
    rightInner.rotation.set(-0.12, 0, -0.28);

    this.headGroup.add(this.leftEar, this.rightEar, leftInner, rightInner);

    // ── Eyes ───────────────────────────────────
    const eyeGeo = new THREE.SphereGeometry(0.068, 14, 12);
    this.leftEye = new THREE.Mesh(eyeGeo, this.eyeMat);
    this.leftEye.position.set(-0.21, 0.17, 0.5);

    this.rightEye = new THREE.Mesh(eyeGeo, eyeMatR);
    this.rightEye.position.set(0.21, 0.17, 0.5);

    // Eye shine (tiny white dot)
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const shineGeo = new THREE.SphereGeometry(0.022, 5, 4);
    const lShine = new THREE.Mesh(shineGeo, shineMat);
    lShine.position.set(-0.20, 0.19, 0.56);
    const rShine = new THREE.Mesh(shineGeo, shineMat);
    rShine.position.set(0.22, 0.19, 0.56);

    this.headGroup.add(this.leftEye, this.rightEye, lShine, rShine);

    // ── Tongue (hidden by default, shown in healing) ──
    this.tongue = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.2, 4, 8), tongueMat);
    this.tongue.position.set(0, -0.39, 0.64);
    this.tongue.rotation.x = Math.PI / 2;
    this.tongue.scale.set(0, 0, 0);
    this.headGroup.add(this.tongue);

    this.dogGroup.add(this.headGroup);

    // ── Collar ─────────────────────────────────
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0xb043ff,
      emissive: 0xb043ff,
      emissiveIntensity: 1.0,
      roughness: 0.25,
      metalness: 0.75
    });
    this.collar = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 8, 28), collarMat);
    this.collar.rotation.x = Math.PI / 2;
    this.collar.position.set(0, -0.18, 0.32);
    this.neck.add(this.collar);

    // Collar tag
    const tagMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xff9900,
      emissiveIntensity: 0.6,
      metalness: 0.95,
      roughness: 0.08
    });
    const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.025, 8), tagMat);
    tag.position.set(0, -0.35, 0.32);
    this.neck.add(tag);

    // ── Legs ───────────────────────────────────
    this.legs = [];
    this.legGroups = [];

    // [x, z, isFront]
    const legConfig = [
      [-0.44, 0.82, true],
      [ 0.44, 0.82, true],
      [-0.44,-0.82, false],
      [ 0.44,-0.82, false],
    ];

    legConfig.forEach(([x, z, isFront]) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(x, 1.28, z);

      // Thigh
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.38, 6, 10), bodyMat);
      upper.position.y = -0.24;
      upper.castShadow = true;
      legGroup.add(upper);

      // Lower leg (shin + paw) group — pivot at knee
      const lowerGroup = new THREE.Group();
      lowerGroup.position.y = -0.52;

      const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.36, 6, 8), darkMat);
      shin.position.y = -0.2;
      shin.castShadow = true;
      lowerGroup.add(shin);

      // Paw
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.125, 8, 6), darkMat);
      paw.scale.set(1.2, 0.55, 1.45);
      paw.position.y = -0.44;
      paw.castShadow = true;
      paw.receiveShadow = true;
      lowerGroup.add(paw);

      legGroup.add(lowerGroup);
      this.dogGroup.add(legGroup);
      this.legs.push(legGroup);
      this.legGroups.push({ group: legGroup, lower: lowerGroup, isFront });
    });

    // ── Tail (chain of spheres, curves upward) ──
    this.tailGroup = new THREE.Group();
    this.tailGroup.position.set(0, 1.5, -1.35);
    this.tail = this.tailGroup; // animator references this.tail

    const tailCount = 7;
    this.tailSegments = [];
    for (let i = 0; i < tailCount; i++) {
      const t = i / (tailCount - 1);
      const r = 0.11 * (1 - t * 0.65);
      const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), bodyMat);
      // Arc: rises up then curves over
      seg.position.set(
        0,
        t * 0.55 + 0.1,
        -t * 0.5
      );
      seg.castShadow = true;
      this.tailGroup.add(seg);
      this.tailSegments.push(seg);
    }
    this.dogGroup.add(this.tailGroup);

    this.scene.add(this.dogGroup);
  }

  // ─────────────────────────────────────────────
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
