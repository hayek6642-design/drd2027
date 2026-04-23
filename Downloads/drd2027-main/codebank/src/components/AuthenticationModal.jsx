import React, { useState, useEffect, useRef } from 'react';
import './AuthenticationModal.css';

const AuthenticationModal = ({ isOpen, onAuthenticationComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showEnterButton, setShowEnterButton] = useState(false);
  const progressIntervalRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Start progress animation when modal opens
      setProgress(0);
      setIsAuthenticated(false);
      setShowEnterButton(false);
      
      // Simulate backend validation progress
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressIntervalRef.current);
            setIsAuthenticated(true);
            setShowEnterButton(true);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
    } else {
      // Reset when modal closes
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setProgress(0);
      setIsAuthenticated(false);
      setShowEnterButton(false);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isOpen]);

  const handleEnterClick = () => {
    if (isAuthenticated && progress >= 100) {
      onAuthenticationComplete();
    }
  };

  const handleBackdropClick = (e) => {
    // Prevent closing by clicking backdrop
    if (e.target === modalRef.current) {
      return;
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      ref={modalRef}
      className="auth-modal-overlay"
      onClick={handleBackdropClick}
    >
      <div className="auth-modal-content">
        <div className="auth-modal-header">
          <div className="auth-icon">🔒</div>
          <h2>Identity Verification Required</h2>
          <p>Please wait while we verify your identity</p>
        </div>

        <div className="auth-progress-container">
          <div className="progress-bar-background">
            <div 
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {isAuthenticated ? 'Verification Complete' : `Verifying... ${Math.floor(progress)}%`}
          </div>
        </div>

        {showEnterButton && (
          <div className="auth-actions">
            <button 
              className="auth-enter-button"
              onClick={handleEnterClick}
              disabled={!isAuthenticated || progress < 100}
            >
              Enter
            </button>
          </div>
        )}

        <div className="auth-footer">
          <p>Your session will be secured during verification</p>
        </div>
      </div>
    </div>
  );
};

export default AuthenticationModal;