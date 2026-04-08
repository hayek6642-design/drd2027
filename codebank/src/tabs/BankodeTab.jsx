import React, { useEffect, useState } from 'react';
import { SERVICE_PATHS } from '../config';

export default function BankodeTab() {
  const [html, setHtml] = useState(null);
  const [error, setError] = useState(null);
  const src = SERVICE_PATHS.codebank;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const t = Date.now();
        const srcUrl = `${src}?t=${t}`;
        const res = await fetch(srcUrl);
        if (!alive) return;
        if (!res.ok) {
          setError(`Failed to load indexCB.html (status ${res.status})`);
          return;
        }
        let text = await res.text();
        // Inject <base> for correct relative path resolution
        text = text.replace(
          /<head(.*?)>/i,
          (m) => `${m}\n  <base href="/codebank/">\n  <link rel="icon" type="image/svg+xml" href="/vite.svg">`
        );
        // Remove problematic giant base64 favicon links
        text = text.replace(/<link\s+rel="icon"[^>]*data:image[^>]*>/gi, "");
        setHtml(text);
      } catch (e) {
        if (!alive) return;
        setError(`Cannot fetch indexCB.html: ${e?.message || e}`);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (error && !html) {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
        <div style={{ maxWidth: 600, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 8 }}>Unable to open CodeBank (indexCB.html)</h2>
          <p style={{ color: '#888', marginBottom: 12 }}>{String(error)}</p>
          <p style={{ fontSize: 14 }}>
            Ensure the dev server is running and that <code>indexCB.html</code> exists at <code>/codebank/indexCB.html</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh' }}>
      {html ? (
        <iframe
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="CodeBank"
        />
      ) : (
        <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 8 }}>Loading CodeBank…</div>
            <div style={{ fontSize: 12, color: '#888' }}>Fetching and sanitizing indexCB.html</div>
          </div>
        </div>
      )}
    </div>
  );
}
