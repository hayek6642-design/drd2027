import React, { useState, useEffect } from 'react';
import './CodeGenerator.css';

// Helper function to get Clerk session token
const getClerkSessionToken = () => {
  // Try to get token from various sources
  return (
    localStorage.getItem('clerk-session-token') ||
    document.cookie.replace(/(?:(?:^|.*;\s*)__session\s*=\s*([^;]*).*$)|^.*$/, '$1') ||
    null
  );
};

const CodeGenerator = ({ source = 'yt-new' }) => {
  const [code, setCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Generate code locally (stateless)
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s = '';
    for (let i = 0; i < 26; i++) {
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
  };

  // Save code to backend
  const saveCode = async (codeToSave) => {
    const sessionToken = getClerkSessionToken();
    
    if (!sessionToken) {
      setError('Authentication required. Please log in.');
      console.error('[CODE SAVE] No session token found');
      return;
    }

    try {
      setError(null);
      setSuccess(false);
      
      const response = await fetch('/api/codes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          code: codeToSave,
          source: source,
          metadata: {
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            platform: navigator.platform
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setSuccess(true);
        setLastGenerated(new Date());
        console.log('[CODE SAVE] Success:', {
          code: codeToSave,
          source: source,
          timestamp: new Date().toISOString()
        });
      } else {
        setError(data.error || 'Failed to save code');
        console.error('[CODE SAVE] Error:', data.error);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('[CODE SAVE] Network error:', err);
    }
  };

  // Generate and save code
  const handleGenerate = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      // Generate code locally
      const newCode = generateCode();
      setCode(newCode);

      // Save to backend
      await saveCode(newCode);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-save when code is generated
  useEffect(() => {
    if (code && !isGenerating) {
      saveCode(code);
    }
  }, [code, isGenerating]);

  return (
    <div className="code-generator">
      <div className="code-display">
        <h3>Code Generator</h3>
        <div className="code-value" data-testid="generated-code">
          {code || 'Click Generate to create a code'}
        </div>
      </div>
      
      <div className="code-actions">
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="generate-btn"
          data-testid="generate-btn"
        >
          {isGenerating ? 'Generating...' : 'Generate Code'}
        </button>
      </div>

      {error && (
        <div className="error-message" data-testid="error-message">
          Error: {error}
        </div>
      )}

      {success && (
        <div className="success-message" data-testid="success-message">
          Code saved successfully!
        </div>
      )}

      {lastGenerated && (
        <div className="status-info" data-testid="status-info">
          Last saved: {lastGenerated.toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default CodeGenerator;