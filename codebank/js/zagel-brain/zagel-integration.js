/**
 * Zagel Brain - Main Integration
 * Connects brain modules to existing 3D animations and Gemini API
 * 
 * Usage:
 *   // Include all brain modules
 *   <script src="zagel-brain/recognition.js"></script>
 *   <script src="zagel-brain/memory.js"></script>
 *   <script src="zagel-brain/personality.js"></script>
 *   <script src="zagel-brain/promptBuilder.js"></script>
 *   <script src="zagel-brain/responseEngine.js"></script>
 *   <script src="zagel-brain/zagel-integration.js"></script>
 *   
 *   // Initialize
 *   <script>
 *     await ZagelBrain.init('YOUR_GEMINI_API_KEY', doveAnimationController);
 *   </script>
 */

class ZagelBrain {
  constructor() {
    this.integration = null;
    this.apiKey = null;
    this.animationController = null;
    this.isReady = false;
    
    // Callback for UI updates
    this.onResponse = null;
    this.onAnimation = null;
    this.onTyping = null;
  }
  
  /**
   * Initialize Zagel Brain system
   */
  async init(apiKey, animationController = null, options = {}) {
    this.apiKey = apiKey;
    this.animationController = animationController;
    
    // Create integration instance
    this.integration = new window.ZagelBrainIntegration();
    
    // Initialize with API key and animation controller
    await this.integration.initialize(apiKey, animationController);
    
    // Set callbacks
    this.onResponse = options.onResponse || null;
    this.onAnimation = options.onAnimation || null;
    this.onTyping = options.onTyping || null;
    
    this.isReady = true;
    
    console.log('[ZagelBrain] System initialized and ready');
    
    return this;
  }
  
  /**
   * Send message to Zagel
   */
  async send(message) {
    if (!this.isReady) {
      console.warn('[ZagelBrain] Not initialized');
      return 'Brain not ready. Please initialize first.';
    }
    
    // Show typing indicator
    if (this.onTyping) {
      this.onTyping(true);
    }
    
    try {
      // Process through brain
      const result = await this.integration.respond(message);
      
      // Handle response
      if (this.onResponse) {
        this.onResponse(result.response, result);
      }
      
      // Trigger animation
      if (result.animation && this.onAnimation) {
        this.onAnimation(result.animation);
      }
      
      // Hide typing
      if (this.onTyping) {
        this.onTyping(false);
      }
      
      return result;
      
    } catch (error) {
      console.error('[ZagelBrain] Error:', error);
      
      if (this.onTyping) {
        this.onTyping(false);
      }
      
      return '🐦 *something went wrong in the dove brain*';
    }
  }
  
  /**
   * Get brain state
   */
  getState() {
    return this.integration?.getState() || { initialized: false };
  }
  
  /**
   * Trigger specific animation
   */
  animate(trigger) {
    this.integration?.animate(trigger);
  }
  
  /**
   * Reset brain memory
   */
  reset() {
    this.integration?.reset();
    console.log('[ZagelBrain] Memory reset');
  }
  
  /**
   * Quick greeting
   */
  greet() {
    return this.send('hello');
  }
}

// Global instance
window.ZagelBrain = new ZagelBrain();

// ==========================================
// SIMPLE WRAPPER FUNCTIONS (for easy use)
// ==========================================

/**
 * Initialize Zagel Brain with API key
 */
window.initZagelBrain = async function(apiKey, animationController) {
  return await window.ZagelBrain.init(apiKey, animationController);
};

/**
 * Send message to Zagel
 */
window.zagel = async function(message) {
  return await window.ZagelBrain.send(message);
};

/**
 * Get Zagel brain state
 */
window.zagelState = function() {
  return window.ZagelBrain.getState();
};

/**
 * Reset Zagel memory
 */
window.zagelReset = function() {
  return window.ZagelBrain.reset();
};

// ==========================================
// EXAMPLE INTEGRATION CODE
// ==========================================
/*
// Example integration with existing 3D dove:

// 1. Include all brain modules in your HTML
// 2. Create animation controller wrapper
const animationController = {
  trigger: function(animationName) {
    // Your existing 3D animation system
    if (window.doveAnimator) {
      window.doveAnimator.play(animationName);
    }
    // Or use Three.js directly
    if (window.zagelModel) {
      switch(animationName) {
        case 'wingFlap': window.zagelModel.play('wing_flap'); break;
        case 'headTilt': window.zagelModel.play('head_tilt'); break;
        case 'hop': window.zagelModel.play('hop'); break;
        case 'sideEye': window.zagelModel.play('side_eye'); break;
      }
    }
  }
};

// 3. Initialize
await window.initZagelBrain('YOUR_GEMINI_API_KEY', animationController);

// 4. Handle responses
window.ZagelBrain.onResponse = function(text, data) {
  document.getElementById('zagel-response').innerText = text;
};

window.ZagelBrain.onAnimation = function(animation) {
  console.log('Playing:', animation);
};

window.ZagelBrain.onTyping = function(isTyping) {
  document.getElementById('typing-indicator').style.display = isTyping ? 'block' : 'none';
};

// 5. Use!
await window.zagel('Hello, how are you?');
*/

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZagelBrain;
}

// Also export as default for ES modules
export default window.ZagelBrain;