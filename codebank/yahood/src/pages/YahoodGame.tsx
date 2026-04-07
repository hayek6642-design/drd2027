import React, { useEffect, useCallback, useRef } from 'react';
import { LeafletMap } from '@/components/LeafletMap';
import { RoomsSidebar } from '@/components/RoomsSidebar';
import { ChatPanel } from '@/components/ChatPanel';
import { VoiceChat } from '@/components/VoiceChat';
import { useGameStore } from '@/game/game-store';
import { accBridge } from '@/game/acc-bridge';

const YahoodGame: React.FC = () => {
  const {
    initGame, phase, tick, progressMining, setNotification, notification,
    setPlayerLocation, setGpsError, gpsError, player, pending, depositTreasures,
  } = useGameStore();

  const lastMiningTickRef = useRef<number>(Date.now());
  const watchIdRef = useRef<number | null>(null);
  const accAssets = accBridge.getAssets();

  // Init game engine
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Real GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported by your browser.');
      // Demo fallback — Cairo
      setPlayerLocation(30.0444, 31.2357, 500);
      return;
    }

    const opts: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 5000,
    };

    const onSuccess = (pos: GeolocationPosition) => {
      setPlayerLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      setGpsError(null);
    };

    const onError = (err: GeolocationPositionError) => {
      const msgs: Record<number, string> = {
        1: 'Location access denied. Enable location in browser settings.',
        2: 'Location unavailable. Check your connection.',
        3: 'GPS timed out. Retrying...',
      };
      setGpsError(msgs[err.code] || 'GPS error');
      // Fallback to demo coordinates (Cairo center)
      setPlayerLocation(30.0444, 31.2357, 1000);
    };

    // Initial position
    navigator.geolocation.getCurrentPosition(onSuccess, onError, opts);

    // Watch continuous updates
    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, opts);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Game tick (AI movement, robbery checks)
  useEffect(() => {
    const interval = setInterval(() => {
      tick();

      // Progress mining with real delta time
      if (phase === 'mining') {
        const now = Date.now();
        const dt = (now - lastMiningTickRef.current) / 1000;
        lastMiningTickRef.current = now;
        progressMining(dt);
      } else {
        lastMiningTickRef.current = Date.now();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [tick, phase, progressMining]);

  // Notification auto-dismiss
  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(t);
    }
  }, [notification, setNotification]);

  const notifColors = {
    info: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-200',
    warn: 'border-yellow-500/40 bg-yellow-950/40 text-yellow-200',
    danger: 'border-red-500/40 bg-red-950/40 text-red-200',
    success: 'border-green-500/40 bg-green-950/40 text-green-200',
  };

  const phaseBarColor = {
    locating: 'bg-blue-500',
    exploring: 'bg-cyan-500',
    mining: 'bg-orange-500',
    returning: 'bg-red-500',
    deposited: 'bg-green-500',
  } as Record<string, string>;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden select-none">

      {/* ── Header ── */}
      <header
        className="h-10 flex items-center justify-between px-4 border-b border-border flex-shrink-0 z-10"
        style={{ background: 'linear-gradient(90deg, hsl(230,20%,8%), hsl(230,20%,12%))' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="font-display text-sm font-bold neon-cyan tracking-widest">YAHOOD!</h1>
          <span className="text-[9px] font-mono text-muted-foreground hidden sm:block">Real-World Mining</span>
          {/* Phase badge */}
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
            phase === 'returning' ? 'border-red-500/50 bg-red-950/40 text-red-400' :
            phase === 'mining' ? 'border-orange-500/50 bg-orange-950/40 text-orange-400' :
            phase === 'deposited' ? 'border-green-500/50 bg-green-950/40 text-green-400' :
            'border-border text-muted-foreground'
          }`}>
            {phase.toUpperCase().replace('-', ' ')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Asset quick view */}
          <div className="hidden sm:flex gap-2 text-[10px] font-mono">
            <span className="text-cyan-400">C:{accAssets.codes}</span>
            <span className="text-slate-400">S:{accAssets.silver}</span>
            <span className="text-yellow-400">G:{accAssets.gold}</span>
          </div>

          {/* GPS status */}
          {gpsError ? (
            <div className="flex items-center gap-1" title={gpsError}>
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-[9px] font-mono text-red-400">DEMO</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-glow" />
              <span className="text-[9px] font-mono text-muted-foreground">GPS LIVE</span>
            </div>
          )}

          {/* Deposit button (when carrying loot and near home) */}
          {pending.length > 0 && phase === 'returning' && (
            <button
              onClick={depositTreasures}
              className="px-2 py-0.5 rounded font-display text-[9px] tracking-wider bg-green-900/40 border border-green-500/50 text-green-400 hover:bg-green-900/60 transition-all"
            >
              DEPOSIT
            </button>
          )}
        </div>
      </header>

      {/* ── GPS Error Banner ── */}
      {gpsError && (
        <div className="flex-shrink-0 px-4 py-1.5 border-b border-yellow-900/50 bg-yellow-950/30 text-yellow-400 text-[10px] font-mono text-center">
          ⚠ {gpsError} — Showing demo location (Cairo)
        </div>
      )}

      {/* ── Notification toast ── */}
      {notification && (
        <div
          className={`fixed top-12 left-1/2 -translate-x-1/2 z-[3000] glass-strong rounded-xl px-5 py-3 neon-border border max-w-sm w-[90vw] text-center shadow-xl animate-float ${notifColors[notification.type]}`}
          style={{ border: '1px solid' }}
        >
          <p className="text-sm font-body">{notification.text}</p>
        </div>
      )}

      {/* ── Locating screen ── */}
      {phase === 'locating' && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center" style={{ background: 'hsla(230, 25%, 5%, 0.97)' }}>
          <div className="text-center space-y-6 px-6">
            <div className="text-6xl animate-float">🌍</div>
            <div>
              <h2 className="font-display text-2xl neon-cyan tracking-widest">YAHOOD!</h2>
              <p className="text-sm text-muted-foreground mt-2">Real-World Mining Game</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-primary/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin" />
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm text-foreground font-display">Acquiring GPS...</p>
                <p className="text-[11px] text-muted-foreground">Allow location access when prompted</p>
              </div>
            </div>
            <div className="glass rounded-xl p-4 text-left space-y-2 max-w-xs mx-auto">
              <p className="text-[11px] text-muted-foreground font-display tracking-wider">HOW TO PLAY</p>
              <div className="space-y-1 text-[11px] text-foreground/80">
                <div>🏠 Your <span className="text-green-400">Home Base</span> is auto-assigned near you</div>
                <div>🌍 Explore the world to find <span className="text-cyan-400">treasures</span></div>
                <div>⛏️ Click a treasure (within 1.5km) to <span className="text-yellow-400">mine</span> it</div>
                <div>🏃 Rush back home to <span className="text-green-400">safely deposit</span> your loot</div>
                <div>⚔️ Thieves will <span className="text-red-400">chase you</span> if you carry pending treasures!</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — Rooms */}
        <aside className="w-48 flex-shrink-0 hidden md:flex flex-col">
          <RoomsSidebar />
        </aside>

        {/* Center — World map */}
        <main className="flex-1 relative overflow-hidden">
          <LeafletMap />

        </main>

        {/* Right sidebar — Chat & Voice */}
        <aside className="w-52 flex-shrink-0 hidden md:flex flex-col border-l border-border overflow-hidden">
          <VoiceChat />
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <ChatPanel />
          </div>
        </aside>
      </div>

    </div>
  );
};

export default YahoodGame;
