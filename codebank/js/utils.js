// utils.js - Shared utilities for toasts and helpers
// 🧠 Optimized to prevent "export" errors and duplicate loading

(function() {
  'use strict';

  if (window.__UTILS_LOADED__) return;
  window.__UTILS_LOADED__ = true;

  // showToast: lightweight global toast (compatible with inline versions in HTML/JS)
  const showToast = function(message, type = 'info', duration = 3500) {
      try {
          // Create container if needed
          let container = document.getElementById('toast-container');
          if (!container) {
              container = document.createElement('div');
              container.id = 'toast-container';
              container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;';
              document.body.appendChild(container);
          }
          
          const toast = document.createElement('div');
          toast.className = `toast toast-${type}`;
          toast.textContent = message;
          toast.style.cssText = `
              margin:8px;padding:12px 16px;border-radius:8px;color:#fff;
              box-shadow:0 6px 18px rgba(0,0,0,0.2);opacity:0;transform:translateY(8px);
              transition:all .25s ease;max-width:320px;font-family:sans-serif;
          `;
          
          // Set background by type
          if (type === 'success') toast.style.background = '#28a745';
          else if (type === 'error') toast.style.background = '#dc3545';
          else if (type === 'warning') {
              toast.style.background = '#ffc107';
              toast.style.color = '#000';
          } else toast.style.background = '#17a2b8';
          
          container.appendChild(toast);
          requestAnimationFrame(() => {
              toast.style.opacity = '1';
              toast.style.transform = 'translateY(0)';
          });
          
          setTimeout(() => {
              toast.style.opacity = '0';
              toast.style.transform = 'translateY(-8px)';
              setTimeout(() => {
                  if (container.contains(toast)) container.removeChild(toast);
              }, 300);
          }, duration);
      } catch (e) {
          console.warn('showToast failed:', message);
      }
  }

  // Add toast styles if not present (inline style injection)
  if (!document.querySelector('style[data-toast-styles]')) {
      const style = document.createElement('style');
      style.setAttribute('data-toast-styles', 'true');
      style.textContent = `
          .toast { font-size: 14px; font-weight: 500; }
          .toast-success { background: #28a745 !important; }
          .toast-error { background: #dc3545 !important; }
          .toast-warning { background: #ffc107 !important; color: #000 !important; }
      `;
      document.head.appendChild(style);
  }

  // 🧩 Anti-Duplicate Event System 
  const SafeEvent = { 
    once(key, fn) { 
      if (window[`__EVENT_${key}`]) return; 
      window[`__EVENT_${key}`] = true; 
      fn(); 
    } 
  }; 

  // Expose to global scope for backward compatibility and as requested
  window.utils = {
    showToast,
    SafeEvent
  };

  // For compatibility with scripts using showToast/SafeEvent directly
  if (!window.showToast) window.showToast = showToast;
  if (!window.SafeEvent) window.SafeEvent = SafeEvent;

  console.log('utils.js loaded (singleton)');
})();
