import React, { useState, useEffect } from 'react';
import { tabs } from './tabs/index';

function App() {
  const queryTab = (() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab');
      return t && tabs.some(tab => tab.id === t) ? t : null;
    } catch {
      return null;
    }
  })();
  const [activeTab, setActiveTab] = useState(queryTab || tabs[0].id);
  const [sessionManager, setSessionManager] = useState(null);

  const activeComponent = tabs.find(tab => tab.id === activeTab)?.component;

  useEffect(() => {
    // Initialize CodeBank Session Manager
    if (typeof window.CodeBankSessionManager !== 'undefined') {
      const manager = new window.CodeBankSessionManager();
      setSessionManager(manager);
      
      // Start session when app loads
      manager.startSession();
      
      // Cleanup on unmount
      return () => {
        manager.stopSession();
      };
    } else {
      console.warn('CodeBank Session Manager not loaded yet');
    }
  }, []);

  

  useEffect(() => {
    // Update session manager when active tab changes
    if (sessionManager) {
      // Check if E7ki is active for night mode
      const isE7kiActive = activeTab === 'e7ki';
      if (isE7kiActive) {
        // Apply E7ki night mode styles
        document.body.classList.add('e7ki-active');
      } else {
        document.body.classList.remove('e7ki-active');
      }
    }
  }, [activeTab, sessionManager]);

  

  

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-inner">
          <div className="header-flex">
            <div className="header-left">
              <h1 className="header-title">CodeBank</h1>
            </div>
          </div>
        </div>
      </header>

      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="main-content">
        {activeComponent}
      </main>

      
    </div>
  );
}

export default App;
