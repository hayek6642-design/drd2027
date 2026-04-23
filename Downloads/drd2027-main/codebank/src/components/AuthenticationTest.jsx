import React from 'react';
import { triggerAuthentication, showAuthenticationModal } from '../utils/authUtils';
import './AuthenticationTest.css';

const AuthenticationTest = () => {
  const handleManualTrigger = () => {
    triggerAuthentication();
  };

  const handleProgrammaticShow = () => {
    showAuthenticationModal();
  };

  const handleDirectTrigger = () => {
    // Directly dispatch the event
    const event = new CustomEvent('trigger-authentication');
    window.dispatchEvent(event);
  };

  return (
    <div className="auth-test-container">
      <h2>Authentication Modal Test Controls</h2>
      <p>Use these buttons to test the authentication modal functionality:</p>
      
      <div className="test-buttons">
        <button 
          className="test-button primary"
          onClick={handleManualTrigger}
        >
          Trigger Authentication (Event)
        </button>
        
        <button 
          className="test-button secondary"
          onClick={handleProgrammaticShow}
        >
          Show Modal (Programmatic)
        </button>
        
        <button 
          className="test-button tertiary"
          onClick={handleDirectTrigger}
        >
          Direct Event Dispatch
        </button>
      </div>

      <div className="test-info">
        <h3>How it works:</h3>
        <ul>
          <li><strong>Event Trigger:</strong> Dispatches a custom event that the main app listens for</li>
          <li><strong>Programmatic:</strong> Creates a mock YouTube dialog element to trigger detection</li>
          <li><strong>Direct:</strong> Directly dispatches the trigger event</li>
        </ul>
        
        <h3>Expected Behavior:</h3>
        <ul>
          <li>Modal appears with blurred backdrop</li>
          <li>Progress bar animates to 100%</li>
          <li>"Enter" button becomes available</li>
          <li>Underlying content is blocked from interaction</li>
          <li>Modal closes when Enter is clicked</li>
        </ul>
      </div>
    </div>
  );
};

export default AuthenticationTest;