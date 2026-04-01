import { useEffect, useState, useCallback, useRef } from "react";
import { Snowflake, Flame, Hammer, Crosshair, Thermometer, Target } from "lucide-react";

interface Hole {
  id: number;
  x: number;
  y: number;
  size: number;
}

export function IceOverlay() {
  // 4 Counters
  const [mainPoints, setMainPoints] = useState(0); // From watchTime
  const [firePoints, setFirePoints] = useState(0); // From right balloons
  const [hammerPoints, setHammerPoints] = useState(0); // From top balloons
  const [sniperPoints, setSniperPoints] = useState(0); // From bottom balloons

  // State for melting
  const [extraMelt, setExtraMelt] = useState(0); // Points burned by fire/hammer
  const [holes, setHoles] = useState<Hole[]>([]);
  const [isSniperMode, setIsSniperMode] = useState(false);
  const [snowflakes, setSnowflakes] = useState<Array<{ id: number; x: number; delay: number; size: number }>>([]);

  // Max points for full melt (arbitrary, can be adjusted)
  const MAX_WATCH_TIME = 3600000; // 1 hour for 100% melt
  const POINTS_PER_MELT_STEP = 100; // Points needed to melt 1% more

  // Calculate total melt progress
  // Main watchTime melt + extraMelt from tools
  const watchProgress = Math.min(mainPoints / MAX_WATCH_TIME, 1);
  const toolProgress = Math.min(extraMelt / 10000, 1); // 10k tool points for full melt
  const totalMeltProgress = Math.min(watchProgress + toolProgress, 1);

  // Ice covers from top down: at 0 progress, top edge is at 0. At 1 progress, top edge is at 100.
  // Wait, user said "decreases from up to down to make the products manifest gradually".
  // This means the ice layer's TOP edge moves DOWN.
  const iceTopOffset = totalMeltProgress * 100;

  // Initialize snowflakes
  useEffect(() => {
    const flakes = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 8,
      size: Math.random() * 6 + 4,
    }));
    setSnowflakes(flakes);
  }, []);

  // Listen for Main Counter (watchTime) from localStorage
  useEffect(() => {
    const checkWatchTime = () => {
      const stored = parseInt(localStorage.getItem('watchTime') || '0');
      setMainPoints(stored);
    };
    checkWatchTime();
    const interval = setInterval(checkWatchTime, 2000);
    return () => clearInterval(interval);
  }, []);

  // Listen for Tool Points (Balloons)
  useEffect(() => {
    // Load existing tool points from localStorage
    setFirePoints(parseInt(localStorage.getItem('pebalaash_fire') || '0'));
    setHammerPoints(parseInt(localStorage.getItem('pebalaash_hammer') || '0'));
    setSniperPoints(parseInt(localStorage.getItem('pebalaash_sniper') || '0'));

    const handleBalloonUpdate = (e: any) => {
      const { delta, side } = e.detail;
      if (delta > 0) {
        if (side === 'right') {
          setFirePoints(prev => {
            const next = prev + delta;
            localStorage.setItem('pebalaash_fire', next.toString());
            return next;
          });
        } else if (side === 'top') {
          setHammerPoints(prev => {
            const next = prev + delta;
            localStorage.setItem('pebalaash_hammer', next.toString());
            return next;
          });
        } else if (side === 'bottom') {
          setSniperPoints(prev => {
            const next = prev + delta;
            localStorage.setItem('pebalaash_sniper', next.toString());
            return next;
          });
        }
      }
    };

    window.addEventListener('balloon:points:update', handleBalloonUpdate);
    return () => window.removeEventListener('balloon:points:update', handleBalloonUpdate);
  }, []);

  // Tool actions
  const useFire = () => {
    if (firePoints >= 10) {
      setFirePoints(prev => {
        const next = prev - 10;
        localStorage.setItem('pebalaash_fire', next.toString());
        return next;
      });
      setExtraMelt(prev => prev + 50); // Melt 0.5%
    }
  };

  const useHammer = () => {
    if (hammerPoints >= 10) {
      setHammerPoints(prev => {
        const next = prev - 10;
        localStorage.setItem('pebalaash_hammer', next.toString());
        return next;
      });
      setExtraMelt(prev => prev + 100); // Break 1%
    }
  };

  const useSniper = () => {
    if (sniperPoints >= 10) {
      setIsSniperMode(!isSniperMode);
    }
  };

  const handleIceClick = (e: React.MouseEvent) => {
    if (isSniperMode && sniperPoints >= 10) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      setHoles(prev => [...prev, { id: Date.now(), x, y, size: 15 + Math.random() * 10 }]);
      setSniperPoints(prev => {
        const next = prev - 10;
        localStorage.setItem('pebalaash_sniper', next.toString());
        return next;
      });
      setIsSniperMode(false);
    }
  };

  // Generate mask-image for holes
  const maskImage = holes.length > 0 
    ? holes.map(h => `radial-gradient(circle at ${h.x}% ${h.y}%, transparent ${h.size}px, black ${h.size + 1}px)`).join(', ')
    : 'none';

  if (iceTopOffset >= 100) return null;

  return (
    <>
      {/* 4 Counters Container */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3">
        {/* Main Counter */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-card/90 backdrop-blur border border-blue-500/30 text-blue-300 font-bold text-sm shadow-lg min-w-[160px]">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            <span>Main</span>
          </div>
          <span className="tabular-nums">{(mainPoints / 1000).toFixed(0)}s</span>
        </div>

        {/* Fire Tool */}
        <button
          onClick={useFire}
          disabled={firePoints < 10}
          className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border font-bold text-sm shadow-lg transition-all active:scale-95 min-w-[160px]
            ${firePoints >= 10 
              ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 hover:bg-orange-500/30' 
              : 'bg-muted/50 border-border text-muted-foreground opacity-50 cursor-not-allowed'}`}
        >
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4" />
            <span>Fire</span>
          </div>
          <span className="tabular-nums">{firePoints}</span>
        </button>

        {/* Hammer Tool */}
        <button
          onClick={useHammer}
          disabled={hammerPoints < 10}
          className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border font-bold text-sm shadow-lg transition-all active:scale-95 min-w-[160px]
            ${hammerPoints >= 10 
              ? 'bg-sky-500/20 border-sky-500/50 text-sky-400 hover:bg-sky-500/30' 
              : 'bg-muted/50 border-border text-muted-foreground opacity-50 cursor-not-allowed'}`}
        >
          <div className="flex items-center gap-2">
            <Hammer className="w-4 h-4" />
            <span>Hammer</span>
          </div>
          <span className="tabular-nums">{hammerPoints}</span>
        </button>

        {/* Sniper Tool */}
        <button
          onClick={useSniper}
          disabled={sniperPoints < 10}
          className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border font-bold text-sm shadow-lg transition-all active:scale-95 min-w-[160px]
            ${sniperPoints >= 10 
              ? (isSniperMode ? 'bg-red-500 border-red-500 text-white animate-pulse' : 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30') 
              : 'bg-muted/50 border-border text-muted-foreground opacity-50 cursor-not-allowed'}`}
        >
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4" />
            <span>Sniper</span>
          </div>
          <span className="tabular-nums">{sniperPoints}</span>
        </button>
      </div>

      {/* Ice layer */}
      <div
        className={`fixed inset-0 z-[60] overflow-hidden transition-all duration-1000 ease-out
          ${isSniperMode ? 'cursor-crosshair' : 'pointer-events-auto'}`}
        style={{
          top: `${iceTopOffset}%`,
          bottom: 0,
          maskImage: maskImage,
          WebkitMaskImage: maskImage,
          transition: "top 1.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={handleIceClick}
      >
        {/* Main ice surface */}
        <div className="absolute inset-0 ice-overlay bg-sky-100/40 backdrop-blur-md" 
          style={{
            backgroundImage: 'url("https://www.transparenttextures.com/patterns/cracked-ice.png")',
            backgroundColor: 'rgba(200, 230, 255, 0.7)'
          }}
        />

        {/* Frost cracks pattern */}
        <div className="absolute inset-0 ice-crack opacity-40 mix-blend-overlay" />

        {/* Shimmer highlight */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/10 animate-pulse" />

        {/* Melting edge */}
        <div className="absolute top-0 left-0 right-0 h-20 -translate-y-10 z-10 pointer-events-none">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full drop-shadow-xl">
            <path
              d="M0,120 L0,40 Q100,0 200,60 Q300,120 400,40 Q500,0 600,60 Q700,120 800,40 Q900,0 1000,60 Q1100,120 1200,40 L1200,120 Z"
              fill="rgba(255, 255, 255, 0.8)"
            />
          </svg>
        </div>

        {/* Floating snowflake particles */}
        {snowflakes.map((flake) => (
          <div
            key={flake.id}
            className="absolute animate-frost-pulse"
            style={{
              left: `${flake.x}%`,
              top: `${(flake.id / snowflakes.length) * 100}%`,
              animationDelay: `${flake.delay}s`,
              opacity: 0.3 + Math.random() * 0.4,
            }}
          >
            <Snowflake
              className="text-white/40"
              style={{ width: flake.size, height: flake.size }}
            />
          </div>
        ))}

        {/* Ice texture overlays */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
          style={{ 
            background: 'radial-gradient(circle at 50% 50%, white, transparent)',
            mixBlendMode: 'overlay'
          }} 
        />
      </div>

      {/* Sniper Reticle (Only in sniper mode) */}
      {isSniperMode && (
        <div className="fixed inset-0 z-[70] pointer-events-none flex items-center justify-center">
          <div className="w-20 h-20 border-2 border-red-500 rounded-full flex items-center justify-center animate-pulse">
            <div className="w-1 h-20 bg-red-500 absolute" />
            <div className="h-1 w-20 bg-red-500 absolute" />
          </div>
        </div>
      )}
    </>
  );
}
