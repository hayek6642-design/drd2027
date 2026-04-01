import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/DRACOLoader.js';

export class WatchDogScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    this.camera.position.set(0, 3, 8);
    this.camera.lookAt(0, 1, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.buildLighting();
    
    // 🛡️ LOAD THE REAL 3D MODEL (.glb)
    this.loadGLBModel();
    
    const planeGeo = new THREE.PlaneGeometry(50, 50);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.15 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    this.scene.add(plane);
  }

  buildLighting() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dirLight.position.set(5, 10, 5);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(this.dirLight);
    
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    this.scene.add(hemiLight);

    this.glowLight = new THREE.PointLight(0x00ff88, 0, 10);
    this.glowLight.position.set(0, 1, 0);
    this.scene.add(this.glowLight);
  }

  async loadGLBModel() {
    const loader = new GLTFLoader();
    
    // 🧬 Optional: Add Draco support for compressed models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
    loader.setDRACOLoader(dracoLoader);

    // 🛡️ AUTHORITATIVE MODEL PATH (with cache buster)
    const modelPath = '/shared/watchdog-core/dog-3d-model.glb?v=' + Date.now();
    
    console.log('[WatchDogScene] 🛡️ Loading Authoritative GLB model from:', modelPath);
    
    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(modelPath, (gltf) => {
            console.log('[WatchDogScene] Model loaded successfully, processing scene...');
            resolve(gltf);
        }, (progress) => {
            const percent = (progress.loaded / progress.total * 100).toFixed(0);
            console.log(`[WatchDogScene] Loading progress: ${percent}%`);
        }, (err) => {
            console.error('[WatchDogScene] Error loading GLB:', err);
            reject(err);
        });
      });
      
      this.dogGroup = gltf.scene;
      
      // 📐 Scale and position adjustment for the GLB model
      // Increase scale to ensure visibility
      this.dogGroup.scale.set(3, 3, 3);
      this.dogGroup.position.set(0, 0.5, 0);
      
      // Traverse the model to enable shadows and find specific parts for animation
      this.dogGroup.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          
          // Map meshes to expected properties for the animator
          // Note: These names are guesses based on standard GLB exports; 
          // if they don't match, we fallback to the group structure.
          if (node.name.toLowerCase().includes('head')) this.head = node;
          if (node.name.toLowerCase().includes('body')) this.body = node;
          if (node.name.toLowerCase().includes('tail')) this.tail = node;
          if (node.name.toLowerCase().includes('eye_l')) this.leftEye = node;
          if (node.name.toLowerCase().includes('eye_r')) this.rightEye = node;
        }
      });
      
      // Fallback: If parts aren't named, use the whole group as body/head for basic animation
      if (!this.body) this.body = this.dogGroup;
      if (!this.headGroup) this.headGroup = this.dogGroup; // Basic fallback
      
      // Create empty groups/meshes for parts that might be missing to prevent animator crashes
      if (!this.neck) this.neck = new THREE.Group();
      if (!this.headGroup) this.headGroup = new THREE.Group();
      if (!this.tail) this.tail = new THREE.Group();
      if (!this.tongue) this.tongue = new THREE.Group();
      if (!this.leftEye) this.leftEye = new THREE.Group();
      if (!this.rightEye) this.rightEye = new THREE.Group();
      if (!this.leftEar) this.leftEar = new THREE.Group();
      if (!this.rightEar) this.rightEar = new THREE.Group();
      
      this.scene.add(this.dogGroup);
      console.log('[WatchDogScene] GLB model loaded successfully');
      
      // Signal animator that loading is complete
      window.dispatchEvent(new CustomEvent('watchdog:model-loaded'));
      
    } catch (error) {
      console.error('[WatchDogScene] Failed to load GLB model, falling back to primitive dog:', error);
      this.loadDog(); // Fallback to the original primitive-based dog
    }
  }

  loadDog() {
    // Original primitive-based dog implementation as fallback
    this.dogGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: 0x8b4513, 
      roughness: 0.5, 
      metalness: 0.05 
    });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.05, metalness: 0.9 });
    const tongueMat = new THREE.MeshStandardMaterial({ color: 0xff66aa, roughness: 0.3 });

    const torsoGeo = new THREE.SphereGeometry(0.7, 32, 32);
    this.body = new THREE.Mesh(torsoGeo, bodyMat);
    this.body.scale.set(1, 0.95, 1.8);
    this.body.position.y = 1.2;
    this.body.castShadow = true;
    this.dogGroup.add(this.body);

    const neckGeo = new THREE.SphereGeometry(0.4, 32, 32);
    this.neck = new THREE.Mesh(neckGeo, bodyMat);
    this.neck.scale.set(1, 1.5, 1.2);
    this.neck.position.set(0, 1.7, 1.0);
    this.neck.rotation.x = -Math.PI / 6;
    this.dogGroup.add(this.neck);

    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.3, 1.5);
    const headGeo = new THREE.SphereGeometry(0.5, 32, 32);
    this.head = new THREE.Mesh(headGeo, bodyMat);
    this.head.scale.set(1, 1, 1.2);
    this.head.castShadow = true;
    this.headGroup.add(this.head);

    const muzzleGeo = new THREE.SphereGeometry(0.32, 32, 32);
    const muzzle = new THREE.Mesh(muzzleGeo, bodyMat);
    muzzle.scale.set(0.9, 0.8, 1.8);
    muzzle.position.set(0, -0.2, 0.4);
    this.headGroup.add(muzzle);

    const noseGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const nose = new THREE.Mesh(noseGeo, accentMat);
    nose.position.set(0, -0.15, 0.95);
    this.headGroup.add(nose);

    const tongueGeo = new THREE.CapsuleGeometry(0.1, 0.2, 4, 8);
    this.tongue = new THREE.Mesh(tongueGeo, tongueMat);
    this.tongue.position.set(0, -0.35, 0.6);
    this.tongue.rotation.x = Math.PI / 2;
    this.tongue.scale.set(0, 0, 0);
    this.headGroup.add(this.tongue);

    const earGeo = new THREE.SphereGeometry(0.22, 32, 32);
    this.leftEar = new THREE.Mesh(earGeo, bodyMat);
    this.leftEar.scale.set(0.15, 1.8, 1.3);
    this.leftEar.position.set(-0.48, 0.1, 0.1);
    this.leftEar.rotation.set(0.3, 0, 0.35);
    
    this.rightEar = new THREE.Mesh(earGeo, bodyMat);
    this.rightEar.scale.set(0.15, 1.8, 1.3);
    this.rightEar.position.set(0.48, 0.1, 0.1);
    this.rightEar.rotation.set(0.3, 0, -0.35);
    this.headGroup.add(this.leftEar, this.rightEar);

    const eyeGeo = new THREE.SphereGeometry(0.065, 16, 16);
    this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.leftEye.position.set(-0.22, 0.25, 0.5);
    
    this.rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
    this.rightEye.position.set(0.22, 0.25, 0.5);
    this.headGroup.add(this.leftEye, this.rightEye);

    this.dogGroup.add(this.headGroup);

    const legGeo = new THREE.CapsuleGeometry(0.16, 0.8, 8, 16);
    this.legs = [];
    const legPos = [[-0.45, 0.5, 0.8], [0.45, 0.5, 0.8], [-0.45, 0.5, -0.8], [0.45, 0.5, -0.8]];
    legPos.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.set(...pos);
      leg.castShadow = true;
      this.dogGroup.add(leg);
      this.legs.push(leg);
    });

    const tailGeo = new THREE.SphereGeometry(0.08, 16, 16);
    this.tail = new THREE.Mesh(tailGeo, bodyMat);
    this.tail.scale.set(1, 1, 9);
    this.tail.position.set(0, 1.5, -1.0);
    this.tail.rotation.x = -Math.PI / 2.5;
    this.tail.castShadow = true;
    this.dogGroup.add(this.tail);

    this.scene.add(this.dogGroup);
  }

  resize() {
    if (!this.container) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  destroy() {
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
    this.scene.traverse((obj) => {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      }
    });
  }
}
