import { useEffect, useState, useRef } from "react";
import "./SettaXtes3a.css"; // Custom CSS for modern styling

export default function SettaXtes3a() {
  const [photos, setPhotos] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [caption, setCaption] = useState("");

  const [activeTab, setActiveTab] = useState('gallery');
  const [challenge, setChallenge] = useState(null);
  const [camReady, setCamReady] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [frames, setFrames] = useState([]);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [winners, setWinners] = useState([]);
  const [losers, setLosers] = useState([]);

  const fileInputRef = useRef(null);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setta/photos");
      const data = await res.json();
      const mapped = (data || []).map((d) => ({
        id: d.id ?? null,
        imageUrl: d.image_url,
        caption: d.caption ?? null,
        createdAt: d.created_at,
      }));
      setPhotos(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
    fetchChallenge();
  }, []);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setProgress(0);

    const file = files[0];
    const formData = new FormData();
    formData.append("photo", file);
    if (caption.trim()) {
      formData.append("caption", caption.trim());
    }

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/setta/upload", true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          setProgress(Math.round((e.loaded / e.total) * 100));
      };

      xhr.onload = () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const resp = JSON.parse(xhr.responseText);
            const newPhoto = {
              id: resp.id ?? null,
              imageUrl: resp.image_url,
              caption: resp.caption ?? null,
              createdAt: resp.created_at,
            };
            setPhotos([newPhoto, ...photos]);
            setCaption("");
          } else {
            console.error("Upload failed", xhr.responseText);
          }
        } catch (e) {
          console.error("Invalid upload response", e);
        }
        setUploading(false);
      };

      xhr.send(formData);
    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => e.preventDefault();

  const fetchChallenge = async () => {
    try {
      const res = await fetch("/api/piccarboon/challenge");
      const data = await res.json();
      setChallenge(data);
    } catch {}
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCamReady(true);
      }
    } catch {}
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const w = 640, h = 480;
    canvasRef.current.width = w;
    canvasRef.current.height = h;
    const ctx = canvasRef.current.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    setFrames((prev) => [img, ...prev].slice(0, 5));
  };

  const computeFeatures = () => {
    if (frames.length === 0) return null;
    const img = frames[0];
    const width = img.width, height = img.height;
    const pixels = img.data;
    let sum = 0, sumSq = 0;
    let brightnessSum = 0;
    const hueBuckets = new Array(12).fill(0);
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
      const gray = (r + g + b) / 3;
      sum += gray;
      sumSq += gray * gray;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const d = mx - mn;
      let h = 0;
      if (d === 0) h = 0; else if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      const hue = Math.round((h * 60 + 360) % 360);
      const bucket = Math.floor(hue / 30);
      hueBuckets[bucket] += 1;
      brightnessSum += gray;
    }
    const mean = sum / (pixels.length / 4);
    const variance = sumSq / (pixels.length / 4) - mean * mean;
    const blurMetric = Math.max(0, Math.min(1, 1 - Math.min(1, variance / 2000)));
    const dominantIndex = hueBuckets.indexOf(Math.max(...hueBuckets));
    const colorMap = ['red','red','yellow','yellow','green','green','cyan','cyan','blue','blue','magenta','magenta'];
    const dominantColor = colorMap[dominantIndex] || 'any';
    const brightnessAvg = brightnessSum / (pixels.length / 4);
    let liveFramesVariance = 0;
    if (frames.length >= 2) {
      const a = frames[0].data, b = frames[1].data;
      let diffSum = 0;
      for (let i = 0; i < a.length && i < b.length; i += 16) diffSum += Math.abs(a[i] - b[i]);
      liveFramesVariance = Math.min(1, diffSum / (a.length / 16) / 64);
    }
    const lightingConsistency = Math.min(1, Math.abs(brightnessAvg - 128) / 128);
    const noiseLevel = Math.min(1, variance / 4000);
    const depthConsistency = Math.max(0, Math.min(1, liveFramesVariance * 0.5));
    const artifactEdges = Math.max(0, Math.min(1, 1 - blurMetric));
    const colorSimilarity = dominantColor === (challenge?.dominant_color || 'any') ? 100 : 40;
    const histogramSim = Math.max(0, Math.min(1, hueBuckets[dominantIndex] / (pixels.length / 4)));
    const poseHint = 'sitting';
    const bodyBoxAspect = 1.3;
    const headChairDistanceCm = 30;
    return { width, height, blurMetric, dominantColor, colorSimilarity, histogramSim, liveFramesVariance, lightingConsistency, noiseLevel, depthConsistency, artifactEdges, poseHint, bodyBoxAspect, headChairDistanceCm };
  };

  const submitAttempt = async () => {
    if (!canvasRef.current) return;
    setSubmitting(true);
    try {
      const url = canvasRef.current.toDataURL('image/jpeg', 0.8);
      const blob = await (await fetch(url)).blob();
      const fd = new FormData();
      fd.append('image', blob, 'capture.jpg');
      const features = computeFeatures();
      fd.append('features', JSON.stringify(features || {}));
      const res = await fetch('/api/piccarboon/submit', { method: 'POST', body: fd });
      const data = await res.json();
      setSubmitResult(data);
      await fetchLeaderboard();
      await fetchOutcomes();
    } finally {
      setSubmitting(false);
    }
  };

  const fetchLeaderboard = async () => {
    try { const r = await fetch('/api/piccarboon/leaderboard'); setLeaderboard(await r.json()); } catch {}
  };
  const fetchOutcomes = async () => {
    try {
      const wr = await fetch('/api/piccarboon/winners');
      const lr = await fetch('/api/piccarboon/losers');
      setWinners(await wr.json());
      setLosers(await lr.json());
    } catch {}
  };

  return (
    <div className="gallery-container">
      <h1 className="gallery-title">✨ Setta X Tes3a ✨</h1>
      <div className="tabs-row">
        <button className={activeTab==='gallery'?'active':''} onClick={()=>setActiveTab('gallery')}>Gallery</button>
        <button className={activeTab==='piccarboon'?'active':''} onClick={()=>setActiveTab('piccarboon')}>Piccarboon</button>
      </div>

      {activeTab==='piccarboon' ? (
        <div className="piccarboon">
          <div className="challenge-card">
            <div className="challenge-title">Daily Challenge</div>
            <div className="challenge-body">
              <div>Pose: {challenge?.pose || '—'}</div>
              <div>Objects: {(challenge?.required_objects||[]).join(', ')}</div>
              <div>Color: {challenge?.dominant_color || 'any'}</div>
              <div>Geometry: {challenge?.head_to_chair_distance_cm || '—'}</div>
              <div>Camera: {challenge?.camera_angle || 'front'}</div>
              {challenge?.sponsor && (
                <div className="sponsor">
                  Sponsored by {challenge.sponsor.name}
                </div>
              )}
            </div>
          </div>

          <div className="camera-row">
            <video ref={videoRef} className="camera" playsInline muted />
            <canvas ref={canvasRef} className="preview" />
            <div className="controls">
              <button onClick={startCamera} disabled={camReady}>Start Camera</button>
              <button onClick={captureFrame} disabled={!camReady}>Capture</button>
              <button onClick={submitAttempt} disabled={submitting || frames.length===0}>
                {submitting ? "Submitting..." : "Submit"}
              </button>
              <button disabled>🎥 Video Challenge (Coming Soon)</button>
            </div>
          </div>

          <div className="result-row">
            {submitResult && (
              <div className="result card">
                <div><strong>Score:</strong> {submitResult.score}</div>
                <div><strong>Status:</strong> {submitResult.status}</div>

                {typeof submitResult.antiFraudConfidence === "number" && (
                  <>
                    <div className="fraud-bar">
                      <div
                        className="fraud-fill"
                        style={{ width: `${submitResult.antiFraudConfidence}%` }}
                      />
                    </div>
                    <small>
                      Anti-Fraud Confidence: {submitResult.antiFraudConfidence}%
                    </small>
                  </>
                )}
              </div>
            )}
            {submitResult && (
              <button
                onClick={() => {
                  const text = `🔥 I scored ${submitResult.score} on Piccarboon!`;
                  navigator.share
                    ? navigator.share({ text })
                    : navigator.clipboard.writeText(text);
                  alert("Shared!");
                }}
                className="share-btn"
              >
                Share Result 🚀
              </button>
            )}
          </div>

          <div className="leaderboard">
            <div className="section-title">Leaderboard</div>
            <div className="list">
              {leaderboard.map((e,i)=> (
                <div key={i} className="row">
                  <span>#{i+1}</span>
                  <span>{e.id}</span>
                  <span>{e.score}</span>
                  <span className={`badge ${e.tier}`}>{e.tier.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="outcomes">
            <div className="section-title">Winners</div>
            <div className="list">
              {winners.map((e,i)=> (
                <div key={i} className="row">
                  <span>{e.id}</span>
                  <span>{e.finalScore}</span>
                </div>
              ))}
            </div>
            <div className="section-title">Funny Losers</div>
            <div className="list">
              {losers.map((e,i)=> (
                <div key={i} className="row">
                  <span>{e.id}</span>
                  <span>{e.finalScore}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
      <div className="caption-row">
        <input
          type="text"
          placeholder="Optional caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="caption-input"
        />
        <button
          className="upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          Upload
        </button>
      </div>

      {/* Drag & Drop Upload */}
      <div
        className={`upload-area ${uploading ? "uploading" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? `Uploading ${progress}%...` : "Drag & Drop or Click to Upload"}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Loading Skeleton */}
      {loading && (
        <div className="photo-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="photo-skeleton" />
          ))}
        </div>
      )}

      {/* Photo Grid */}
      <div className="photo-grid">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="photo-card"
            onClick={() => setSelected(photo)}
          >
            <img src={photo.imageUrl} alt={photo.caption ?? ''} className="photo-img" loading="lazy" />
            <div className="photo-caption">{photo.caption}</div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={selected.imageUrl} alt={selected.caption ?? undefined} className="modal-img" />
            <h2 className="modal-caption">{selected.caption}</h2>
            <p className="modal-date">{new Date(selected.createdAt).toLocaleString()}</p>
            <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
