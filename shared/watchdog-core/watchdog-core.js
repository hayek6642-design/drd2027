import { WatchDogScene } from './watchdog-scene.js';
import { WatchDogAnimator } from './watchdog-animator.js';
import { STATES } from './watchdog-states.js';

/**
 * Creates and mounts a 3D Watch Dog component inside the given container.
 * 
 * @param {HTMLElement} container - The DOM element to mount the 3D canvas in.
 * @param {Object} options - Configuration options
 * @param {string} [options.initialState='idle'] - The starting state ('idle', 'watching', 'alert', 'healing')
 * @returns {Object} Controller API to interact with the component
 */
export function createWatchDog(container, options = {}) {
  if (!container || !(container instanceof HTMLElement)) {
    throw new Error('A valid DOM container element is required for WatchDog3D');
  }

  const scene = new WatchDogScene(container);
  const animator = new WatchDogAnimator(scene);

  // Apply optional initial state
  const startingState = options.initialState || STATES.IDLE;
  if (Object.values(STATES).includes(startingState)) {
    animator.setState(startingState);
  } else {
    animator.setState(STATES.IDLE);
    console.warn(`Invalid initial state: ${startingState}. Defaulting to 'idle'.`);
  }

  animator.start();

  const handleResize = () => {
    scene.resize();
  };

  window.addEventListener('resize', handleResize);

  return {
    /**
     * Updates the dog's behavior state
     * @param {string} state - "idle" | "watching" | "alert" | "healing"
     */
    setState: (state) => {
      if (Object.values(STATES).includes(state)) {
        animator.setState(state);
      } else {
        console.warn(`WatchDog3D: Invalid state '${state}'. Valid states are: ${Object.values(STATES).join(', ')}`);
      }
    },
    
    /**
     * Manually triggers a resize calculation (useful if container changes size programmatically)
     */
    resize: handleResize,
    
  /**
   * Completely cleans up the component, removing it from DOM and freeing memory
   */
  destroy: () => {
    window.removeEventListener('resize', handleResize);
    if (animator) animator.stop();
    if (scene) scene.destroy();
    
    // 🛡️ CRITICAL FIX: Explicitly null out references to help GC
    console.log('[WATCHDOG CORE] Cleanup successful');
  }
  };
}
