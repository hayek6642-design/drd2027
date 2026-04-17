/**
 * Guardian3D - 3D Visual Guardian Component
 * Provides aesthetic 3D animations and status indicators
 */

class Guardian3D {
  constructor(containerId = 'guardian-dog-container') {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.state = 'idle';
    this.isInitialized = false;

    if (!this.container) {
      console.warn('[Guardian3D] Container not found:', containerId);
      return;
    }

    this.init();
  }

  /**
   * Initialize the guardian
   */
  init() {
    this.container.innerHTML = '';
    
    // Create SVG guardian (fallback for 3D)
    const svg = this.createSVG();
    this.container.appendChild(svg);
    
    this.isInitialized = true;
    console.log('[Guardian3D] ✅ Initialized');

    // Listen for auth changes
    if (window.authUnified) {
      window.authUnified.onChange((state) => {
        this.updateState(state);
      });
    }
  }

  /**
   * Create SVG guardian fallback
   */
  createSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', '60');
    svg.setAttribute('height', '60');
    svg.setAttribute('style', 'filter: drop-shadow(0 0 4px #7c3aed88);');

    // Head
    const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    head.setAttribute('cx', '50');
    head.setAttribute('cy', '40');
    head.setAttribute('r', '25');
    head.setAttribute('fill', '#7c3aed');

    // Left ear
    const leftEar = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    leftEar.setAttribute('cx', '35');
    leftEar.setAttribute('cy', '20');
    leftEar.setAttribute('r', '10');
    leftEar.setAttribute('fill', '#a78bfa');

    // Right ear
    const rightEar = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rightEar.setAttribute('cx', '65');
    rightEar.setAttribute('cy', '20');
    rightEar.setAttribute('r', '10');
    rightEar.setAttribute('fill', '#a78bfa');

    // Eyes
    const leftEye = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    leftEye.setAttribute('cx', '45');
    leftEye.setAttribute('cy', '35');
    leftEye.setAttribute('r', '3');
    leftEye.setAttribute('fill', '#fff');

    const rightEye = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rightEye.setAttribute('cx', '55');
    rightEye.setAttribute('cy', '35');
    rightEye.setAttribute('r', '3');
    rightEye.setAttribute('fill', '#fff');

    // Nose
    const nose = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    nose.setAttribute('cx', '50');
    nose.setAttribute('cy', '45');
    nose.setAttribute('r', '2');
    nose.setAttribute('fill', '#000');

    // Body
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    body.setAttribute('cx', '50');
    body.setAttribute('cy', '70');
    body.setAttribute('rx', '20');
    body.setAttribute('ry', '25');
    body.setAttribute('fill', '#a78bfa');

    svg.appendChild(head);
    svg.appendChild(leftEar);
    svg.appendChild(rightEar);
    svg.appendChild(leftEye);
    svg.appendChild(rightEye);
    svg.appendChild(nose);
    svg.appendChild(body);

    return svg;
  }

  /**
   * Update state based on auth
   */
  updateState(authState) {
    if (!this.isInitialized) return;

    if (authState.authenticated) {
      this.state = 'happy';
      this.container.style.opacity = '1';
    } else {
      this.state = 'neutral';
      this.container.style.opacity = '0.7';
    }

    // Add animation
    this.container.style.animation = 'pulse 2s ease-in-out infinite';
  }

  /**
   * Animate event (e.g., on login)
   */
  celebrate() {
    if (!this.container) return;
    this.container.style.animation = 'bounce 0.6s ease-out';
  }

  /**
   * Set status indicator
   */
  setStatus(type) {
    // 'idle', 'loading', 'success', 'error'
    const colors = {
      idle: '#7c3aed',
      loading: '#00d4ff',
      success: '#22c55e',
      error: '#ef4444'
    };

    if (this.container && colors[type]) {
      this.container.style.filter = `drop-shadow(0 0 8px ${colors[type]}88)`;
    }
  }
}

window.Guardian3D = Guardian3D;
window.guardian = null;

// Auto-initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('guardian-dog-container')) {
    window.guardian = new Guardian3D();
  }
});

// Fallback if DOMContentLoaded already fired
if (document.readyState !== 'loading' && document.getElementById('guardian-dog-container')) {
  window.guardian = new Guardian3D();
}
