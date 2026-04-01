import React, { useEffect, useRef } from 'react';
import CodeGenerator from '../components/CodeGenerator';

export default function E7kiTab() {
  const iframeRef = useRef(null);

  useEffect(() => {
    // Apply E7ki night mode when component mounts
    const applyNightMode = () => {
      if (iframeRef.current) {
        try {
          const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
          if (iframeDoc) {
            const body = iframeDoc.body;
            if (body) {
              // Apply night mode styles
              body.style.background = '#1a1a1a';
              body.style.color = '#ffffff';
              body.style.margin = '0';
              body.style.padding = '0';
              
              // Remove animations and transitions
              const allElements = body.querySelectorAll('*');
              allElements.forEach(el => {
                el.style.animation = 'none';
                el.style.transition = 'none';
              });
              
              // Add E7ki container class
              body.classList.add('e7ki-night-mode');
            }
          }
        } catch (error) {
          console.warn('Could not apply E7ki night mode styles:', error);
        }
      }
    };

    // Apply initial night mode
    applyNightMode();

    // Listen for session manager updates
    const handleSessionUpdate = () => {
      // Re-apply night mode when session state changes
      applyNightMode();
    };

    // Add event listener for session updates
    window.addEventListener('codebank-session-update', handleSessionUpdate);

    return () => {
      window.removeEventListener('codebank-session-update', handleSessionUpdate);
    };
  }, []);

  return (
    <div id="e7ki-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Code Generator Section */}
      <div style={{ padding: '16px', borderBottom: '1px solid #333', background: '#0a0a0a' }}>
        <CodeGenerator source="yt-new" />
      </div>
      
      {/* E7ki Chat Section */}
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          ref={iframeRef}
          src="http://localhost:5176"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="E7ki"
          onLoad={(e) => {
            // Apply night mode when iframe loads
            const iframe = e.target;
            try {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
              if (iframeDoc) {
                const body = iframeDoc.body;
                if (body) {
                  body.style.background = '#1a1a1a';
                  body.style.color = '#ffffff';
                  body.style.margin = '0';
                  body.style.padding = '0';
                  
                  // Remove animations and transitions
                  const allElements = body.querySelectorAll('*');
                  allElements.forEach(el => {
                    el.style.animation = 'none';
                    el.style.transition = 'none';
                  });
                  
                  body.classList.add('e7ki-night-mode');
                }
              }
            } catch (error) {
              console.warn('Could not apply E7ki night mode on load:', error);
            }
          }}
        />
      </div>
    </div>
  );
}