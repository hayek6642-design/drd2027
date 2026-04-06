import React, { useEffect, useRef, useState } from 'react';
import CodeGenerator from '../components/CodeGenerator';
import { SERVICE_PATHS } from '../config';

export default function E7kiTab() {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const applyNightMode = () => {
      if (iframeRef.current) {
        try {
          const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
          if (iframeDoc && iframeDoc.body) {
            iframeDoc.body.style.background = '#1a1a1a';
            iframeDoc.body.style.color = '#ffffff';
            iframeDoc.body.style.margin = '0';
            iframeDoc.body.style.padding = '0';
            iframeDoc.body.classList.add('e7ki-night-mode');
          }
        } catch (err) {
          console.warn('Could not apply E7ki night mode styles:', err);
        }
      }
    };

    applyNightMode();

    const handleSessionUpdate = () => applyNightMode();
    window.addEventListener('codebank-session-update', handleSessionUpdate);
    return () => window.removeEventListener('codebank-session-update', handleSessionUpdate);
  }, []);

  return (
    <div id="e7ki-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Code Generator Section */}
      <div style={{ padding: '16px', borderBottom: '1px solid #333', background: '#0a0a0a' }}>
        <CodeGenerator source="yt-new" />
      </div>

      {/* E7ki Chat Section */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && !error && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 1, background: '#1a1a1a' }}>
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ marginBottom: 8, fontSize: 18 }}>Loading E7ki…</div>
              <div style={{ fontSize: 12 }}>Connecting to chat service</div>
            </div>
          </div>
        )}
        {error && (
          <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <h2 style={{ marginBottom: 8 }}>Could not load E7ki</h2>
              <p style={{ fontSize: 14 }}>Make sure the service is available.</p>
              <button onClick={() => { setError(false); setLoading(true); }} style={{ marginTop: 12, padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Retry</button>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={SERVICE_PATHS.e7ki}
          style={{ width: '100%', height: '100%', border: 'none', display: error ? 'none' : 'block' }}
          title="E7ki"
          onLoad={(e) => {
            setLoading(false);
            const iframe = e.target;
            try {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
              if (iframeDoc && iframeDoc.body) {
                iframeDoc.body.style.background = '#1a1a1a';
                iframeDoc.body.style.color = '#ffffff';
                iframeDoc.body.style.margin = '0';
                iframeDoc.body.style.padding = '0';
                iframeDoc.body.classList.add('e7ki-night-mode');
              }
            } catch (err) {
              console.warn('Could not apply E7ki night mode on load:', err);
            }
          }}
          onError={() => { setLoading(false); setError(true); }}
        />
      </div>
    </div>
  );
}
