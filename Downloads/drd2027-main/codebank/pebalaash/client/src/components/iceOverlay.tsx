import { useState, useEffect, useRef, useCallback } from "react";
import { Snowflake, Zap, Trophy } from "lucide-react";

/**
 * IceOverlay — covers Pebalaash products with an ice sheet.
 *
 * The ice is FIXED to the viewport so it follows the user while they scroll,
 * always obscuring the products underneath until enough balloon points are earned.
 *
 * Points source: POST /api/pebalaash/balloon/pop  (from balloon game)
 *                GET  /api/pebalaash/balloon/points (polled every 5 s)
 *
 * Melt logic:
 *   0  pts  → fully frozen  (ice covers everything below nav)
 *   300 pts → fully melted  (ice gone, products visible)
 *   Intermediate → partial melt from the BOTTOM UP
 *     (top portion of ice gradually reveals products from the top as points grow)
 */

const FULLY_MELTED_PTS = 300;

// Point values per balloon option
export const BALLOON_OPTION_POINTS: Record<string, number> = {
  A: 25,  // e.g. "Watch ad"
  B: 15,  // e.g. "Share"
  C: 10,  // e.g. "Like"
  D: 0,   // "Pop nothing" — no points (the trap option)
};

interface IceOverlayProps {
  /** Top offset in px for where the ice starts (below the nav bar) */
  topOffset?: number;
}

export function IceOverlay({ topOffset = 72 }: IceOverlayProps) {
  const [balloonPoints, setBalloonPoints] = useState<number>(0);
  const [loading, setLoading]             = useState(true);
  const [melted, setMelted]               = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch current points from server ──────────────────────────────────────
  const fetchPoints = useCallback(async () => {
    try {
      const res = await fetch("/api/pebalaash/balloon/points");
      if (!res.ok) return;
      const { balloonPoints: pts } = await res.json();
      const n = Number(pts ?? 0);
      setBalloonPoints(n);
      if (n >= FULLY_MELTED_PTS) setMelted(true);
    } catch {/* network error — ignore */}
    finally { setLoading(false); }
  }, []);

  // ── Poll every 5 s ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPoints();
    pollRef.current = setInterval(fetchPoints, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchPoints]);

  // ── Listen for instant updates from the balloon game ──────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ newTotal?: number; delta?: number }>).detail;
      if (detail?.newTotal !== undefined) {
        const n = Number(detail.newTotal);
        setBalloonPoints(n);
        if (n >= FULLY_MELTED_PTS) setMelted(true);
      } else if (detail?.delta !== undefined) {
        setBalloonPoints(prev => {
          const next = prev + Number(detail.delta);
          if (next >= FULLY_MELTED_PTS) setMelted(true);
          return next;
        });
      }
    };
    window.addEventListener("balloon:points:update", handler);
    return () => window.removeEventListener("balloon:points:update", handler);
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const progress    = Math.min(balloonPoints / FULLY_MELTED_PTS, 1);   // 0 → 1
  const meltPercent = Math.round(progress * 100);
  // The ice sheet slides UP (negative translateY) as it melts
  // At 0 pts  → translateY = 0        (fully covers viewport below nav)
  // At 300 pts → translateY = -100vh  (completely above the screen)
  const translateY = -progress * 100;

  if (melted) return null;

  return (
    <>
      {/* ── Ice Sheet: fixed, sticks while scrolling ─────────────────────── */}
      <div
        aria-hidden="true"
        className="ice-overlay"
        style={{
          position:   "fixed",
          top:        topOffset,
          left:       0,
          right:      0,
          bottom:     0,
          zIndex:     50,
          transform:  `translateY(${translateY}vh)`,
          transition: "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
          overflow:   "hidden",
          pointerEvents: "all",
        }}
      >
        {/* Ice texture */}
        <div style={{
          position:   "absolute",
          inset:      0,
          background: `
            linear-gradient(
              180deg,
              rgba(168,216,255,0.92) 0%,
              rgba(120,190,255,0.88) 20%,
              rgba(80,160,240,0.84)  60%,
              rgba(40,120,210,0.90)  100%
            )
          `,
          backdropFilter: "blur(4px)",
        }} />

        {/* Crack / crystal pattern */}
        <svg
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.18 }}
          xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"
        >
          <filter id="ice-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
            <feColorMatrix type="saturate" values="0"/>
          </filter>
          <rect width="100%" height="100%" filter="url(#ice-noise)" opacity="0.6"/>
          {/* Crack lines */}
          {[
            "M 10 0 L 35 40 L 20 80 L 45 120",
            "M 60 0 L 50 30 L 70 60 L 55 100",
            "M 80 10 L 90 50 L 75 90 L 88 130",
            "M 0 50 L 30 55 L 55 45 L 90 52",
            "M 5 80 L 40 85 L 65 75 L 95 82",
          ].map((d, i) => (
            <polyline key={i} points={d} fill="none" stroke="white" strokeWidth="0.6" opacity="0.7"/>
          ))}
        </svg>

        {/* Drip effect at the bottom of the ice */}
        <div style={{
          position:   "absolute",
          bottom:     -2,
          left:       0,
          right:      0,
          height:     40,
          background: "linear-gradient(180deg, transparent 0%, rgba(120,190,255,0.6) 100%)",
          filter:     "url(#drip)",
        }} />

        {/* Content: progress pill + snowflakes */}
        <div style={{
          position:   "absolute",
          top:        "50%",
          left:       "50%",
          transform:  "translate(-50%, -50%)",
          textAlign:  "center",
          color:      "white",
          userSelect: "none",
        }}>
          <Snowflake
            style={{
              width: 56, height: 56,
              margin: "0 auto 12px",
              opacity: 1 - progress * 0.7,
              animation: "spin 8s linear infinite",
              filter: "drop-shadow(0 0 12px rgba(255,255,255,0.8))",
            }}
          />
          <p style={{ fontSize:13, fontWeight:700, letterSpacing:2, opacity:0.85, marginBottom:8, textTransform:"uppercase" }}>
            Frozen Products
          </p>

          {/* Progress bar */}
          <div style={{
            width: 200, height: 8,
            background: "rgba(255,255,255,0.25)",
            borderRadius: 4, overflow:"hidden",
            margin: "0 auto 8px",
          }}>
            <div style={{
              height:"100%",
              width:`${meltPercent}%`,
              background:"linear-gradient(90deg,#fff8,#fff)",
              borderRadius:4,
              transition:"width 0.5s ease",
            }}/>
          </div>

          <p style={{ fontSize:12, opacity:0.8 }}>
            {balloonPoints} / {FULLY_MELTED_PTS} pts
            {!loading && balloonPoints === 0 && (
              <span style={{ display:"block", marginTop:4, fontSize:11, opacity:0.7 }}>
                🎈 Pop balloons to melt the ice!
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── Floating HUD: always visible above the ice ──────────────────── */}
      <div style={{
        position:   "fixed",
        top:        topOffset + 12,
        right:      16,
        zIndex:     55,
        display:    "flex",
        alignItems: "center",
        gap:        8,
        background: "rgba(10,30,60,0.75)",
        backdropFilter: "blur(8px)",
        borderRadius: 999,
        padding:    "6px 14px",
        boxShadow:  "0 2px 16px rgba(0,0,0,0.4)",
        pointerEvents: "none",
        userSelect: "none",
      }}>
        <Trophy style={{ width:16, height:16, color:"#fbbf24" }} />
        <span style={{ color:"white", fontSize:13, fontWeight:700 }}>
          {balloonPoints.toLocaleString()} pts
        </span>
        <Zap style={{ width:14, height:14, color:"#60a5fa" }} />
      </div>

      {/* Spinning animation keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

/**
 * Helper: call this from the balloon game when the user pops a balloon
 * and selects an option. Sends the points to the server and dispatches
 * a window event so the IceOverlay updates instantly.
 *
 * @param optionKey  "A" | "B" | "C" | "D"
 */
export async function registerBalloonPop(optionKey: string): Promise<void> {
  const points = BALLOON_OPTION_POINTS[optionKey] ?? 0;
  try {
    const res = await fetch("/api/pebalaash/balloon/pop", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ points, optionKey }),
    });
    if (res.ok) {
      const { newTotal } = await res.json();
      window.dispatchEvent(new CustomEvent("balloon:points:update", {
        detail: { newTotal, delta: points, optionKey },
      }));
    }
  } catch {/* fail silently */}
}
