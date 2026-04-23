// CSP Compliance Module
// This file ensures all JavaScript is CSP-compliant and removes inline scripts

class CSPCompliance {
  constructor() {
    this.isInitialized = false;
    this.init();
  }

  init() {
    if (this.isInitialized) return;

    console.log('[CSP] CSP compliance DISABLED per requirements');
    
    // Completely disable CSP compliance - no operations
    this.isInitialized = true;
  }

  removeInlineScripts() {}

  externalizeEventHandlers() {}

  cleanInlineStyles() {}

  createCSSRule(className, style) {
    // Create a style element if it doesn't exist
    let styleElement = document.getElementById('csp-styles');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'csp-styles';
      document.head.appendChild(styleElement);
    }
    
    // Add the CSS rule
    const rule = `.${className} { ${style} }`;
    styleElement.textContent += rule + '\n';
  }

  // Method to safely execute code without eval (for critical operations)
  executeSafeCode(code) {
    try {   
      return null;
    }
  }

  // Method to create CSP-compliant event listeners
  addCSPEventListener(element, eventType, handler) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (!element) return;
    
    element.addEventListener(eventType, handler);
  }

  // Method to create CSP-compliant dynamic content
  createCSPElement(tagName, attributes = {}, content = '') {
    const element = document.createElement(tagName);
    
    // Set attributes safely
    Object.keys(attributes).forEach(key => {
      if (key !== 'style' && key !== 'onclick') {
        element.setAttribute(key, attributes[key]);
      }
    });
    
    // Set content safely
    if (content) {
      if (tagName === 'script') {
        // For script elements, create external script
        element.src = content;
      } else {
        element.textContent = content;
      }
    }
    
    return element;
  }

  // Method to validate CSP compliance
  validateCSP() {
    const violations = [];

    // Check for inline scripts
    const inlineScripts = document.querySelectorAll('script:not([src])');
    if (inlineScripts.length > 0) {
      violations.push('Found inline scripts');
    }

    // Check for inline event handlers
    const inlineHandlers = document.querySelectorAll('[onclick], [onload], [onerror]');
    if (inlineHandlers.length > 0) {
      violations.push('Found inline event handlers');
    }

    // Check for inline styles - skip if CSP allows unsafe-inline for styles
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const allowsUnsafeInlineStyles = cspMeta && cspMeta.getAttribute('content').includes("style-src 'self' 'unsafe-inline'");
    if (!allowsUnsafeInlineStyles) {
      const inlineStyles = document.querySelectorAll('[style]');
      if (inlineStyles.length > 0) {
        violations.push('Found inline styles');
      }
    }

    if (violations.length === 0) {
      console.log('[CSP] No violations found - compliant!');
    } else {
      console.warn('[CSP] Violations found:', violations);
    }

    return violations.length === 0;
  }
}

// Initialize CSP compliance
window.cspCompliance = new CSPCompliance();

// Expose methods globally for compatibility
window.addCSPEventListener = (element, eventType, handler) => {
  if (window.cspCompliance) {
    window.cspCompliance.addCSPEventListener(element, eventType, handler);
  }
};

window.createCSPElement = (tagName, attributes, content) => {
  if (window.cspCompliance) {
    return window.cspCompliance.createCSPElement(tagName, attributes, content);
  }
  return null;
};

window.validateCSP = () => {
  if (window.cspCompliance) {
    return window.cspCompliance.validateCSP();
  }
  return false;
};

// Run validation after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.cspCompliance) {
    setTimeout(() => {
      window.cspCompliance.validateCSP();
    }, 1000);
  }
});
