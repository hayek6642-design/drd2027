import React, { useState } from 'react';
import { SERVICE_PATHS } from '../config';

export default function FarragnaTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      {loading && !error && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 1, background: '#000' }}>
          <div style={{ textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ marginBottom: 8, fontSize: 18 }}>Loading Farragna…</div>
            <div style={{ fontSize: 12 }}>Connecting to video service</div>
          </div>
        </div>
      )}
      {error && (
        <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', color: '#94a3b8' }}>
            <h2 style={{ marginBottom: 8 }}>Could not load Farragna</h2>
            <p style={{ fontSize: 14 }}>Make sure the service is available.</p>
            <button onClick={() => { setError(false); setLoading(true); }} style={{ marginTop: 12, padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Retry</button>
          </div>
        </div>
      )}
      <iframe
        src={SERVICE_PATHS.farragna}
        style={{ width: '100%', height: '100%', border: 'none', display: error ? 'none' : 'block' }}
        title="Farragna"
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
      />
    </div>
  );
}
