/**
 * Dependency Helper Functions
 * Centralized utilities for waiting for Supabase, DOM, and other dependencies
 */

(function() {
  'use strict';

  // Helper to wait for Supabase to be initialized
  window.waitForSupabase = async function waitForSupabase(timeout = 10000) {
    // Check if already available
    if (window.supabase && typeof window.supabase.from === 'function') {
      return window.supabase;
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let resolved = false;

      // Poll for supabase availability (handles case where event already fired)
      const pollInterval = setInterval(() => {
        if (resolved) return;
        
        if (window.supabase && typeof window.supabase.from === 'function') {
          resolved = true;
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
          window.removeEventListener('supabase:ready', handler);
          resolve(window.supabase);
        } else if (Date.now() - startTime > timeout) {
          resolved = true;
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
          window.removeEventListener('supabase:ready', handler);
          reject(new Error('Supabase client not initialized within timeout'));
        }
      }, 50);

      const timeoutId = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        clearInterval(pollInterval);
        window.removeEventListener('supabase:ready', handler);
        reject(new Error('Supabase client not initialized within timeout'));
      }, timeout);

      const handler = () => {
        if (resolved) return;
        
        // Give a small delay for the client to be fully set up
        setTimeout(() => {
          if (resolved) return;
          
          if (window.supabase && typeof window.supabase.from === 'function') {
            resolved = true;
            clearInterval(pollInterval);
            clearTimeout(timeoutId);
            resolve(window.supabase);
          }
        }, 10);
      };

      window.addEventListener('supabase:ready', handler, { once: true });
    });
  };

  // Helper to wait for DOM to be ready
  window.waitForDOM = function waitForDOM() {
    if (document.readyState !== 'loading') {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
  };

  // Helper to wait for unifiedStorage to be ready
  window.waitForUnifiedStorage = async function waitForUnifiedStorage(timeout = 10000) {
    if (window.unifiedStorage && window.unifiedStorage.supabase) {
      return window.unifiedStorage;
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (window.unifiedStorage && window.unifiedStorage.supabase) {
          clearInterval(checkInterval);
          resolve(window.unifiedStorage);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('unifiedStorage not initialized within timeout'));
        }
      }, 50);
    });
  };

  // Helper to wait for any global object to be available
  window.waitForGlobal = function waitForGlobal(globalName, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (window[globalName]) {
          clearInterval(checkInterval);
          resolve(window[globalName]);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error(`${globalName} not available within timeout`));
        }
      }, 50);
    });
  };

  // Helper to wait for multiple dependencies
  window.waitForDependencies = async function waitForDependencies(dependencies, timeout = 10000) {
    const results = {};
    const promises = Object.entries(dependencies).map(async ([name, checkFn]) => {
      try {
        if (checkFn()) {
          results[name] = window[name] || true;
          return;
        }
        
        await new Promise((resolve, reject) => {
          const startTime = Date.now();
          const checkInterval = setInterval(() => {
            if (checkFn()) {
              clearInterval(checkInterval);
              results[name] = window[name] || true;
              resolve();
            } else if (Date.now() - startTime > timeout) {
              clearInterval(checkInterval);
              reject(new Error(`${name} not available within timeout`));
            }
          }, 50);
        });
      } catch (error) {
        console.error(`Failed to wait for ${name}:`, error);
        results[name] = null;
      }
    });

    await Promise.allSettled(promises);
    return results;
  };

  // Initialize logging
  console.log('✅ Dependency helper functions loaded');
})();