/**
 * Guardian 3D
 * Mascot character for the app with 3D fallback
 */

class Guardian3D {
  constructor(containerId = 'guardian-dog-container') {
    this.containerId = containerId;
    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    
    // Animation state
    this.state = {
      rotation: 0,
      scale: 1,
      bounce: 0,
      timestamp: Date.now()
    };
    
    console.log(`[Guardian3D] Initialized with container: ${containerId}`);
  }
  
  /**
   * Initialize guardian in the container
   */
  init() {
    this.container = document.getElementById(this.containerId);
    
    if (!this.container) {
      console.warn(`[Guardian3D] Container not found: ${this.containerId}`);
      return false;
    }
    
    // Try to use Three.js if available, otherwise use SVG/Canvas fallback
    if (typeof THREE !== 'undefined') {
      this.initThreeJS();
    } else if (this.container.innerHTML === '') {
      this.initSVGFallback();
    }
    
    this.startAnimation();
    console.log(`[Guardian3D] ✅ Initialized successfully`);
    return true;
  }
  
  /**
   * Initialize with Three.js for 3D rendering
   */
  initThreeJS() {
    console.log('[Guardian3D] Using Three.js for 3D rendering');
    
    // Scene setup
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    this.container.appendChild(renderer.domElement);
    
    // Create simple dog head using basic geometries
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0xff6b3d });
    const head = new THREE.Mesh(geometry, material);
    scene.add(head);
    
    // Add ears
    const earGeometry = new THREE.ConeGeometry(0.4, 1, 32);
    const earMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b3d });
    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(-0.6, 0.8, 0);
    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(0.6, 0.8, 0);
    scene.add(leftEar);
    scene.add(rightEar);
    
    // Add lighting
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 5, 5);
    scene.add(light);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    camera.position.z = 2.5;
    
    // Animation loop
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      
      const time = (Date.now() - this.state.timestamp) / 1000;
      head.rotation.y = Math.sin(time) * 0.5;
      head.rotation.x = Math.sin(time * 0.7) * 0.2;
      leftEar.rotation.x = Math.sin(time * 1.5) * 0.3;
      rightEar.rotation.x = Math.sin(time * 1.5) * 0.3;
      
      renderer.render(scene, camera);
    };
    
    animate();
  }
  
  /**
   * SVG fallback for 3D rendering
   */
  initSVGFallback() {
    console.log('[Guardian3D] Using SVG fallback');
    
    const svg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <!-- Head -->
        <circle cx="100" cy="100" r="60" fill="#ff6b3d" stroke="#ff8c5a" stroke-width="2"/>
        
        <!-- Snout -->
        <ellipse cx="100" cy="130" rx="25" ry="20" fill="#ffab7a"/>
        
        <!-- Eyes -->
        <circle cx="85" cy="85" r="6" fill="#000"/>
        <circle cx="115" cy="85" r="6" fill="#000"/>
        
        <!-- Pupils (animated with CSS) -->
        <circle cx="86" cy="86" r="3" fill="#fff" class="guardian-pupil"/>
        <circle cx="116" cy="86" r="3" fill="#fff" class="guardian-pupil"/>
        
        <!-- Nose -->
        <ellipse cx="100" cy="130" rx="5" ry="6" fill="#000"/>
        
        <!-- Mouth -->
        <path d="M 100 130 Q 85 145 75 140" stroke="#000" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M 100 130 Q 115 145 125 140" stroke="#000" stroke-width="2" fill="none" stroke-linecap="round"/>
        
        <!-- Left Ear -->
        <path d="M 60 70 Q 40 50 45 20 Q 50 40 65 60 Z" fill="#ff6b3d" stroke="#ff8c5a" stroke-width="2"/>
        
        <!-- Right Ear -->
        <path d="M 140 70 Q 160 50 155 20 Q 150 40 135 60 Z" fill="#ff6b3d" stroke="#ff8c5a" stroke-width="2"/>
        
        <!-- Tongue -->
        <ellipse cx="100" cy="150" rx="8" ry="10" fill="#ff4d6d" class="guardian-tongue"/>
      </svg>
      
      <style>
        svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        
        @keyframes blink {
          0%, 49%, 51%, 100% { cy: 86; }
          50% { cy: 92; }
        }
        
        @keyframes tongueWag {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.8); }
        }
        
        .guardian-pupil {
          animation: blink 3s ease-in-out infinite;
        }
        
        .guardian-tongue {
          animation: tongueWag 1s ease-in-out infinite;
          transform-origin: 100px 145px;
        }
        
        svg {
          animation: bounce 2s ease-in-out infinite;
        }
      </style>
    `;
    
    this.container.innerHTML = svg;
  }
  
  /**
   * Start continuous animation
   */
  startAnimation() {
    if (this.animationId) return;
    
    this.animationId = setInterval(() => {
      this.state.rotation += 0.02;
      this.state.bounce = Math.sin(Date.now() / 1000) * 5;
      
      if (this.container && this.container.querySelector('svg')) {
        const svg = this.container.querySelector('svg');
        svg.style.transform = `rotate(${this.state.rotation}deg) translateY(${this.state.bounce}px)`;
      }
    }, 16); // ~60 FPS
  }
  
  /**
   * Stop animation
   */
  stopAnimation() {
    if (this.animationId) {
      clearInterval(this.animationId);
      this.animationId = null;
    }
  }
  
  /**
   * Show a reaction
   */
  react(emotion = 'happy') {
    console.log(`[Guardian3D] Guardian is now ${emotion}`);
    
    const reactions = {
      happy: '😊',
      sad: '😢',
      excited: '🤩',
      thinking: '🤔',
      tired: '😴'
    };
    
    if (this.container) {
      // Add reaction emoji above guardian
      const emoji = document.createElement('div');
      emoji.textContent = reactions[emotion] || '😊';
      emoji.style.cssText = `
        position: absolute;
        font-size: 24px;
        animation: float-up 2s ease-out forwards;
      `;
      
      const style = document.createElement('style');
      style.textContent = `
        @keyframes float-up {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-40px); }
        }
      `;
      document.head.appendChild(style);
      
      this.container.appendChild(emoji);
      setTimeout(() => emoji.remove(), 2000);
    }
  }
  
  /**
   * Destroy the guardian
   */
  destroy() {
    this.stopAnimation();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Guardian3D;
}
