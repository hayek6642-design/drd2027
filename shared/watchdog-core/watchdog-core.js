import { WatchDogScene } from './watchdog-scene.js';
import { WatchDogAnimator } from './watchdog-animator.js';
import { STATES } from './watchdog-states.js';
import { WatchDogSkeletonScene } from './watchdog-skeleton-scene.js';
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

/**
 * Creates and mounts a 3D Watch Dog component inside the given container.
 * @param {HTMLElement} container
 * @param {Object} options
 * @param {string} [options.initialState='idle']
 * @param {Function} [options.onDogClick] - Called when user clicks the 3D dog
 * @returns {Object} Controller API
 */
export function createWatchDog(container, options = {}) {
  if (!container || !(container instanceof HTMLElement)) {
    throw new Error('A valid DOM container element is required for WatchDog3D');
  }

  let scene = null;
  let animator = null;
  let skeletonScene = null;
  let isDead = false;
  let raycaster = null;
  let mouse = null;
  let dogMeshes = [];

  function buildLiveScene() {
    scene = new WatchDogScene(container);
    animator = new WatchDogAnimator(scene);
    // Collect all meshes in dogGroup for raycasting
    dogMeshes = [];
    if (scene.dogGroup) {
      scene.dogGroup.traverse(obj => {
        if (obj.isMesh) dogMeshes.push(obj);
      });
    }
  }

  function buildSkeletonScene() {
    skeletonScene = new WatchDogSkeletonScene(container);
    // Collect skeleton meshes for raycasting
    dogMeshes = [];
    if (skeletonScene.dogGroup) {
      skeletonScene.dogGroup.traverse(obj => {
        if (obj.isMesh) dogMeshes.push(obj);
      });
    }
  }

  // Setup raycasting for click detection
  function setupRaycasting() {
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
  }

  function handleCanvasClick(event) {
    if (!options.onDogClick) return;
    const currentScene = isDead ? skeletonScene : scene;
    if (!currentScene || !currentScene.camera || !currentScene.renderer) return;

    const rect = currentScene.renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, currentScene.camera);
    const intersects = raycaster.intersectObjects(dogMeshes, true);
    if (intersects.length > 0) {
      options.onDogClick({ isDead });
    }
  }

  // Build initial scene
  const startingState = options.initialState || STATES.IDLE;
  if (startingState === STATES.DEAD) {
    isDead = true;
    buildSkeletonScene();
  } else {
    buildLiveScene();
    if (Object.values(STATES).includes(startingState) && startingState !== STATES.DEAD) {
      animator.setState(startingState);
    } else {
      animator.setState(STATES.IDLE);
    }
    animator.start();
  }

  setupRaycasting();

  // Attach click handler to the container
  container.style.cursor = 'pointer';
  container.addEventListener('click', handleCanvasClick);

  const handleResize = () => {
    if (isDead) {
      skeletonScene?.resize();
    } else {
      scene?.resize();
    }
  };
  window.addEventListener('resize', handleResize);

  return {
    setState: (state) => {
      if (state === STATES.DEAD && !isDead) {
        // Switch to dead mode
        isDead = true;
        if (animator) animator.stop();
        if (scene) scene.destroy();
        scene = null;
        animator = null;
        buildSkeletonScene();
        return;
      }

      if (state !== STATES.DEAD && isDead) {
        // Resurrect - switch back to live
        isDead = false;
        if (skeletonScene) skeletonScene.destroy();
        skeletonScene = null;
        buildLiveScene();
        animator.setState(STATES.IDLE);
        animator.start();
        return;
      }

      if (!isDead && animator && Object.values(STATES).includes(state)) {
        animator.setState(state);
      }
    },

    resize: handleResize,

    destroy: () => {
      container.removeEventListener('click', handleCanvasClick);
      window.removeEventListener('resize', handleResize);
      if (animator) animator.stop();
      if (scene) scene.destroy();
      if (skeletonScene) skeletonScene.destroy();
      console.log('[WATCHDOG CORE] Cleanup successful');
    }
  };
}
