import React from 'react';

export default function CorsaTab() {
  return (
    <div style={{ height: '100vh' }}>
      <iframe
        src="http://localhost:5175"
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Corsa"
      />
    </div>
  );
}