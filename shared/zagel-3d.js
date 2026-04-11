// ===============================
// 🕊️ ZAGEL 3D AVATAR SYSTEM v1.0
// ===============================
// Procedural Three.js 3D bird avatar
// Full voice sync, state animations, mouse tracking
// Pure geometry - no external models

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// Animation states
export const ZAGEL_STATES = {
  IDLE: 'idle',           // Resting, looking around
  LISTENING: 'listening',   // Ear perked, head tilted
  TALKING: 'talking',       // Beak moving, animated
  EXCITED: 'excited',       // Wings flapping, spinning
  FLYING: 'flying',         // Hovering with wing animation
  WALKING: 'walking',       // Waddling
  SLEEPING: 'sleeping'      // Eyes closed, still
};

class ZagelBird {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.parts = {};
    
    this.createBody();
    this.createHead();
    this.createBeak();
    this.createEyes();
    this.createWings();
    this.createTail();
    this.createLegs();
    
    this.scene.add(this.group);
    
    // Animation state
    this.state = ZAGEL_STATES.IDLE;
    this.animationTime = 0;
    this.beakRotationZ = 0;
    this.wingRotation = 0;
    this.bobOffset = 0;
  }

  createBody() {
    // Main body - egg-shaped sphere
    const bodyGeometry = new THREE.SphereGeometry(0.6, 32, 32);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,  // Gold
      metalness: 0.3,
      roughness: 0.6
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.scale.set(1, 1.3, 0.9);  // Make it egg-shaped
    body.castShadow = true;
    body.receiveShadow = true;
    
    this.group.add(body);
    this.parts.body = body;
  }

  createHead() {
    // Head - smaller sphere on top
    const headGeometry = new THREE.SphereGeometry(0.4, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFE55C,  // Lighter gold
      metalness: 0.3,
      roughness: 0.6
    });
    
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 0.8, 0.2);
    head.castShadow = true;
    head.receiveShadow = true;
    
    this.group.add(head);
    this.parts.head = head;
  }

  createBeak() {
    // Beak - cone shape
    const beakGeometry = new THREE.ConeGeometry(0.15, 0.6, 16);
    const beakMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF9800,  // Orange
      metalness: 0.4,
      roughness: 0.4
    });
    
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(0, 0.8, 0.7);
    beak.rotation.z = Math.PI / 2;  // Point forward
    beak.castShadow = true;
    beak.receiveShadow = true;
    
    this.group.add(beak);
    this.parts.beak = beak;
  }

  createEyes() {
    const eyeGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const eyeOffsetX = 0.15;
    const eyeOffsetY = 0.15;
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-eyeOffsetX, 0.95, 0.35);
    leftEye.castShadow = true;
    this.group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(eyeOffsetX, 0.95, 0.35);
    rightEye.castShadow = true;
    this.group.add(rightEye);
    
    // Eye shine (specular highlights)
    const shineGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const shineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    
    const leftShine = new THREE.Mesh(shineGeometry, shineMaterial);
    leftShine.position.set(-eyeOffsetX - 0.05, 0.98, 0.42);
    this.group.add(leftShine);
    
    const rightShine = new THREE.Mesh(shineGeometry, shineMaterial);
    rightShine.position.set(eyeOffsetX + 0.05, 0.98, 0.42);
    this.group.add(rightShine);
    
    this.parts.eyes = { left: leftEye, right: rightEye, leftShine, rightShine };
  }

  createWings() {
    // Wings - thin boxes that rotate
    const wingGeometry = new THREE.BoxGeometry(0.2, 0.8, 1.2);
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFA500,  // Orange-gold
      metalness: 0.2,
      roughness: 0.7
    });
    
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-0.7, 0.3, 0);
    leftWing.castShadow = true;
    leftWing.receiveShadow = true;
    this.group.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0.7, 0.3, 0);
    rightWing.castShadow = true;
    rightWing.receiveShadow = true;
    this.group.add(rightWing);
    
    this.parts.wings = { left: leftWing, right: rightWing };
  }

  createTail() {
    // Tail - elongated cone
    const tailGeometry = new THREE.ConeGeometry(0.25, 1, 16);
    const tailMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFC107,  // Amber
      metalness: 0.2,
      roughness: 0.7
    });
    
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.set(0, 0, -1);
    tail.rotation.x = Math.PI / 6;  // Angle slightly up
    tail.castShadow = true;
    tail.receiveShadow = true;
    
    this.group.add(tail);
    this.parts.tail = tail;
  }

  createLegs() {
    // Simple cylindrical legs
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF9800,  // Orange
      metalness: 0.2,
      roughness: 0.6
    });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, -0.6, 0.2);
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    this.group.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, -0.6, 0.2);
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    this.group.add(rightLeg);
    
    this.parts.legs = { left: leftLeg, right: rightLeg };
  }

  setState(newState) {
    this.state = newState;
    this.animationTime = 0;
  }

  // Sync beak with speech (0-1 range for mouth opening)
  syncBeakWithSpeech(mouthOpenLevel) {
    // mouthOpenLevel: 0 (closed) to 1 (fully open)
    if (this.parts.beak) {
      // Rotate beak down to show mouth opening
      this.beakRotationZ = -mouthOpenLevel * 0.3;
      this.parts.beak.rotation.z = Math.PI / 2 + this.beakRotationZ;
    }
  }

  update(deltaTime) {
    this.animationTime += deltaTime;
    
    // Bob up and down slightly
    this.bobOffset = Math.sin(this.animationTime * 2) * 0.05;
    this.group.position.y += this.bobOffset * 0.01;
    
    switch (this.state) {
      case ZAGEL_STATES.IDLE:
        this.animateIdle();
        break;
      case ZAGEL_STATES.TALKING:
        this.animateTalking();
        break;
      case ZAGEL_STATES.LISTENING:
        this.animateListening();
        break;
      case ZAGEL_STATES.EXCITED:
        this.animateExcited();
        break;
      case ZAGEL_STATES.FLYING:
        this.animateFlying();
        break;
      case ZAGEL_STATES.WALKING:
        this.animateWalking();
        break;
      case ZAGEL_STATES.SLEEPING:
        this.animateSleeping();
        break;
    }
  }

  animateIdle() {
    // Gentle head rotation, slight wing movement
    this.parts.head.rotation.y = Math.sin(this.animationTime * 0.5) * 0.2;
    this.parts.head.rotation.x = Math.cos(this.animationTime * 0.3) * 0.1;
    
    // Subtle wing movement
    if (this.parts.wings) {
      this.parts.wings.left.rotation.z = Math.sin(this.animationTime * 1) * 0.3;
      this.parts.wings.right.rotation.z = -Math.sin(this.animationTime * 1) * 0.3;
    }
  }

  animateTalking() {
    // Active head movement while talking
    this.parts.head.rotation.y = Math.sin(this.animationTime * 3) * 0.3;
    this.parts.head.rotation.x = Math.sin(this.animationTime * 2.5) * 0.15;
    
    // Beak moves up and down
    const beakMove = Math.sin(this.animationTime * 5);
    this.parts.beak.rotation.x = beakMove * 0.3;
    
    // Eyes look forward
    this.parts.eyes.left.position.z = 0.35 + Math.sin(this.animationTime * 4) * 0.05;
    this.parts.eyes.right.position.z = 0.35 + Math.sin(this.animationTime * 4) * 0.05;
  }

  animateListening() {
    // Head tilted, ear perked
    this.parts.head.rotation.z = 0.3;  // Tilt
    this.parts.head.rotation.y = Math.sin(this.animationTime * 1.5) * 0.15;
    
    // Eyes look attentive
    this.parts.eyes.left.position.x = -0.15 - 0.05;
    this.parts.eyes.right.position.x = 0.15 + 0.05;
  }

  animateExcited() {
    // Spinning, wing flapping, bouncing
    this.group.rotation.z = this.animationTime * 4;  // Spin
    
    // Wing flaps
    if (this.parts.wings) {
      this.parts.wings.left.rotation.z = Math.sin(this.animationTime * 10) * 1.2;
      this.parts.wings.right.rotation.z = -Math.sin(this.animationTime * 10) * 1.2;
    }
    
    // Bounce up and down
    this.group.position.y = Math.sin(this.animationTime * 4) * 0.3;
    
    // Head rotation
    this.parts.head.rotation.y = Math.sin(this.animationTime * 3) * 0.5;
  }

  animateFlying() {
    // Smooth hovering with wing beats
    this.group.position.y = Math.sin(this.animationTime * 2) * 0.15;
    
    // Continuous wing movement
    if (this.parts.wings) {
      this.parts.wings.left.rotation.x = Math.sin(this.animationTime * 6) * 0.8;
      this.parts.wings.right.rotation.x = Math.sin(this.animationTime * 6) * 0.8;
    }
    
    // Gentle forward tilt
    this.group.rotation.x = 0.1;
  }

  animateWalking() {
    // Waddling motion
    this.group.position.x += Math.cos(this.animationTime * 2) * 0.01;
    this.group.rotation.z = Math.sin(this.animationTime * 2) * 0.1;
    
    // Leg movement
    if (this.parts.legs) {
      this.parts.legs.left.rotation.z = Math.sin(this.animationTime * 3) * 0.3;
      this.parts.legs.right.rotation.z = -Math.sin(this.animationTime * 3) * 0.3;
    }
  }

  animateSleeping() {
    // Eyes mostly closed, head tilted
    this.parts.head.rotation.x = 0.2;  // Tilted down
    
    // Eyes squint (reduce height)
    this.parts.eyes.left.scale.y = 0.3;
    this.parts.eyes.right.scale.y = 0.3;
    
    // Gentle breathing (body expansion)
    this.parts.body.scale.z = 0.9 + Math.sin(this.animationTime * 0.5) * 0.05;
  }
}

// ===============================
// 🎬 Scene Manager
// ===============================

export class Zagel3DScene {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    
    // Three.js setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xE3F2FD);  // Light blue
    
    this.setupCamera();
    this.setupRenderer();
    this.setupLighting();
    
    // Create bird
    this.bird = new ZagelBird(this.scene);
    
    // Mouse tracking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.setupMouseTracking();
    
    // Animation loop
    this.clock = new THREE.Clock();
    this.animate();
  }

  setupCamera() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 3);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    this.container.appendChild(this.renderer.domElement);
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    // Main light - sun
    const sunLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    sunLight.position.set(5, 10, 7);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    this.scene.add(sunLight);
    
    // Ambient light - general illumination
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5);
    this.scene.add(ambientLight);
    
    // Fill light - soften shadows
    const fillLight = new THREE.PointLight(0x87CEEB, 0.3);
    fillLight.position.set(-5, 2, 3);
    this.scene.add(fillLight);
  }

  setupMouseTracking() {
    this.container.addEventListener('mousemove', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Make bird look at mouse
      this.bird.parts.head.lookAt(
        this.mouse.x * 5,
        0.8 + this.mouse.y * 2,
        2
      );
    });
    
    this.container.addEventListener('click', (e) => {
      if (this.options.onBirdClick) {
        this.options.onBirdClick();
      }
    });
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setState(state) {
    this.bird.setState(state);
  }

  syncBeakWithSpeech(mouthOpenLevel) {
    this.bird.syncBeakWithSpeech(mouthOpenLevel);
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    const deltaTime = this.clock.getDelta();
    this.bird.update(deltaTime);
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

// ===============================
// 🎮 Public API
// ===============================

export function createZagel3D(container, options = {}) {
  return new Zagel3DScene(container, options);
}

export { ZAGEL_STATES };
