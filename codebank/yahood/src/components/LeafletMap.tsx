import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useGameStore } from '@/game/game-store';
import { getTreasureColor, getDistanceKm, getThiefColor } from '@/game/geo-engine';
import { accBridge } from '@/game/acc-bridge';

export const LeafletMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const safeZoneRef = useRef<L.Circle | null>(null);
  const edgePanFrameRef = useRef<number | null>(null);
  const dblClickZoomedRef = useRef<boolean>(false);
  const edgeMouseRef = useRef<{ x: number; y: number } | null>(null);

  const {
    player, treasures, thieves, phase, miningProgress, miningTarget,
    startMining, setNotification, mapMode, setMapMode, buyLand, ownedLands,
  } = useGameStore();

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const startLat = player.lat || 30.0444;
    const startLng = player.lng || 31.2357;

    const map = L.map(mapRef.current, {
      center: [startLat, startLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
      doubleClickZoom: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    // ── Double-click zoom toggle ──
    map.on('dblclick', (e: L.LeafletMouseEvent) => {
      if (dblClickZoomedRef.current) {
        map.zoomOut(2, { animate: true });
        dblClickZoomedRef.current = false;
      } else {
        map.setView(e.latlng, map.getZoom() + 2, { animate: true });
        dblClickZoomedRef.current = true;
      }
    });

    // ── Edge-hover panning (all 4 directions) ──
    const EDGE = 60;    // px from edge that triggers panning
    const MAX_SPEED = 10; // max px per frame at the very edge

    const panLoop = () => {
      const mouse = edgeMouseRef.current;
      if (mouse) {
        const w = mapRef.current!.offsetWidth;
        const h = mapRef.current!.offsetHeight;
        let dx = 0, dy = 0;

        // Left / Right
        if (mouse.x < EDGE)        dx = -(MAX_SPEED * (1 - mouse.x / EDGE));
        if (mouse.x > w - EDGE)    dx =   MAX_SPEED * (1 - (w - mouse.x) / EDGE);
        // Up / Down
        if (mouse.y < EDGE)        dy = -(MAX_SPEED * (1 - mouse.y / EDGE));
        if (mouse.y > h - EDGE)    dy =   MAX_SPEED * (1 - (h - mouse.y) / EDGE);

        if (dx !== 0 || dy !== 0) {
          map.panBy([dx, dy], { animate: false, noMoveStart: true } as L.PanOptions);
        }
      }
      edgePanFrameRef.current = requestAnimationFrame(panLoop);
    };
    edgePanFrameRef.current = requestAnimationFrame(panLoop);

    const onMouseMove = (e: MouseEvent) => {
      const rect = mapRef.current!.getBoundingClientRect();
      edgeMouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseLeave = () => { edgeMouseRef.current = null; };

    mapRef.current.addEventListener('mousemove', onMouseMove);
    mapRef.current.addEventListener('mouseleave', onMouseLeave);

    return () => {
      mapRef.current?.removeEventListener('mousemove', onMouseMove);
      mapRef.current?.removeEventListener('mouseleave', onMouseLeave);
      if (edgePanFrameRef.current) cancelAnimationFrame(edgePanFrameRef.current);
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Map click for buy-land mode
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const handler = (e: L.LeafletMouseEvent) => {
      const state = useGameStore.getState();
      if (state.mapMode === 'buy') {
        state.buyLand(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, []);

  // Update markers whenever state changes
  useEffect(() => {
    const map = mapInstance.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();
    if (safeZoneRef.current) {
      safeZoneRef.current.remove();
      safeZoneRef.current = null;
    }

    const assets = accBridge.getAssets();
    const pendingList = accBridge.getPending();

    // ── Safe zone around home ──
    if (player.homeLat && player.homeLng) {
      safeZoneRef.current = L.circle([player.homeLat, player.homeLng], {
        radius: 150,
        color: '#22c55e',
        fillColor: '#22c55e',
        fillOpacity: 0.07,
        weight: 1.5,
        dashArray: '4 4',
      }).addTo(map);

      const homeIcon = L.divIcon({
        className: 'yahood-marker',
        html: `<div style="
          position:relative; width:40px; height:40px;
          display:flex; align-items:center; justify-content:center;
        ">
          <div style="
            width:40px; height:40px;
            background: radial-gradient(circle, rgba(34,197,94,0.25) 0%, transparent 70%);
            border: 2px solid #22c55e;
            border-radius: 50%;
            animation: pulse-glow 2s ease-in-out infinite;
            box-shadow: 0 0 18px rgba(34,197,94,0.5);
            display:flex; align-items:center; justify-content:center;
            font-size:18px;
          ">🏠</div>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      L.marker([player.homeLat, player.homeLng], { icon: homeIcon })
        .bindTooltip('🏠 Your Home Base — Safe Zone (150m)', { className: 'yahood-tooltip', permanent: false })
        .addTo(markers);
    }

    // ── Owned land flags ──
    for (const land of ownedLands) {
      const flagColor = '#f59e0b';
      const flagIcon = L.divIcon({
        className: 'yahood-marker',
        html: `<div style="position:relative; width:60px; height:80px; pointer-events:none;">
          <!-- pole -->
          <div style="
            position:absolute; left:10px; top:0;
            width:3px; height:72px;
            background: linear-gradient(to bottom, #c0a060, #7a6030);
            border-radius: 2px;
            box-shadow: 0 0 6px rgba(245,158,11,0.4);
          "></div>
          <!-- flag banner -->
          <div style="
            position:absolute; left:13px; top:2px;
            width:44px; height:28px;
            background: linear-gradient(135deg, ${flagColor} 0%, #d97706 100%);
            border-radius: 0 6px 6px 0;
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            box-shadow: 0 0 10px rgba(245,158,11,0.6), inset 0 1px 0 rgba(255,255,255,0.2);
            animation: flag-wave 2.5s ease-in-out infinite;
            gap:1px;
            overflow:hidden;
          ">
            <!-- avatar circle -->
            <div style="
              width:16px; height:16px;
              background: rgba(0,0,0,0.35);
              border: 1.5px solid rgba(255,255,255,0.6);
              border-radius: 50%;
              display:flex; align-items:center; justify-content:center;
              font-family: Orbitron, monospace;
              font-size:7px; font-weight:700;
              color: #fff;
              flex-shrink:0;
            ">${land.ownerInitials}</div>
            <!-- name -->
            <div style="
              font-family: Rajdhani, sans-serif;
              font-size:6px; font-weight:700;
              color:#1a0a00;
              text-align:center;
              line-height:1;
              max-width:40px;
              overflow:hidden;
              white-space:nowrap;
              text-overflow:ellipsis;
            ">${land.ownerName}</div>
          </div>
          <!-- base plate -->
          <div style="
            position:absolute; left:5px; top:70px;
            width:14px; height:4px;
            background: #7a6030;
            border-radius: 2px;
          "></div>
        </div>`,
        iconSize: [60, 80],
        iconAnchor: [11, 76],
      });

      L.marker([land.lat, land.lng], { icon: flagIcon, zIndexOffset: 500 })
        .bindTooltip(
          `🏴 ${land.areaLabel} — Owned by ${land.ownerName}`,
          { className: 'yahood-tooltip', permanent: false }
        )
        .addTo(markers);
    }

    // ── Treasures ──
    for (const t of treasures) {
      if (t.mined) continue;
      const color = getTreasureColor(t.type);
      const distToPlayer = player.lat
        ? getDistanceKm(player.lat, player.lng, t.lat, t.lng)
        : 999;
      const inRange = distToPlayer < 1.5;

      const chestEmoji = t.type === 'gold' ? '🏆' : t.type === 'silver' ? '💎' : '📦';
      const coreSize  = t.type === 'gold' ? 32 : t.type === 'silver' ? 26 : 22;
      // Sonar ring speed & intensity: faster + brighter when player is nearby
      const sonarSpeed = inRange ? '1.1s' : '2.2s';
      const sonarAlpha = inRange ? '0.85' : '0.45';
      // sonarMax: max radius in px the ring expands to from centre
      const sonarMax   = inRange ? 80 : 60;
      // scale factor: ring base is 10px wide; at max it should be sonarMax*2 wide
      const sonarScale = Math.round((sonarMax * 2) / 10);
      const boxShadow  = inRange
        ? `0 0 28px ${color}, 0 0 55px ${color}88, inset 0 0 14px ${color}33`
        : `0 0 10px ${color}99, inset 0 0 8px ${color}22`;

      // Container must be big enough to hold rings without clipping
      const wrap = sonarMax * 2 + coreSize;

      const icon = L.divIcon({
        className: 'yahood-marker',
        html: `
        <div style="
          position:relative;
          width:${wrap}px; height:${wrap}px;
          display:flex; align-items:center; justify-content:center;
          overflow:visible;
          pointer-events:none;
        ">

          <!-- ═══ SONAR PULSE RINGS (always visible) ═══ -->
          <div class="t-sonar" style="--c:${color};--scale:${sonarScale};--dur:${sonarSpeed};--alpha:${sonarAlpha};animation-delay:0s;"></div>
          <div class="t-sonar" style="--c:${color};--scale:${sonarScale};--dur:${sonarSpeed};--alpha:${sonarAlpha};animation-delay:-0.73s;"></div>
          <div class="t-sonar" style="--c:${color};--scale:${sonarScale};--dur:${sonarSpeed};--alpha:${sonarAlpha};animation-delay:-1.46s;"></div>

          <!-- ═══ EARTH MOUND ═══ -->
          <div style="
            position:absolute;
            width:${coreSize + 16}px; height:${Math.round(coreSize * 0.4)}px;
            bottom:calc(50% - ${coreSize / 2}px - 5px);
            background: radial-gradient(ellipse, #5a4030 0%, #2d1a0d 55%, transparent 100%);
            border-radius:50%;
            opacity:0.9;
          "></div>

          <!-- ═══ CORE ICON ═══ -->
          <div style="
            position:relative;
            width:${coreSize}px; height:${coreSize}px;
            background: radial-gradient(circle at 33% 33%, ${color}55 0%, ${color}22 50%, #080c14 100%);
            border: 2px solid ${color};
            border-radius: 50%;
            box-shadow: ${boxShadow};
            display:flex; align-items:center; justify-content:center;
            font-size:${Math.round(coreSize * 0.6)}px;
            pointer-events:all; cursor:pointer;
            z-index:2;
            ${inRange ? 'animation: treasure-pulse 1.2s ease-in-out infinite;' : ''}
          ">${chestEmoji}</div>

          <!-- ═══ SCAN LINE (rotating scanner) ═══ -->
          <div style="
            position:absolute;
            width:${sonarMax}px; height:1.5px;
            top:50%; left:50%;
            transform-origin: left center;
            background: linear-gradient(to right, ${color}cc, transparent);
            animation: t-scan ${sonarSpeed} linear infinite;
            opacity:${inRange ? '0.9' : '0.5'};
          "></div>

          <!-- ═══ DIG HERE badge (in range) ═══ -->
          ${inRange ? `
          <div style="
            position:absolute;
            top:calc(50% - ${coreSize / 2}px - 28px);
            left:50%; transform:translateX(-50%);
            background: ${color};
            color:#000;
            font-family:Orbitron,monospace; font-size:8px; font-weight:900;
            padding:3px 8px; border-radius:5px;
            white-space:nowrap;
            box-shadow: 0 0 12px ${color}, 0 0 24px ${color}88;
            letter-spacing:1.5px;
            animation: float-badge 1.3s ease-in-out infinite;
            z-index:3;
          ">⛏ DIG HERE</div>` : ''}

          <!-- ═══ DISTANCE label (out of range, within 20 km) ═══ -->
          ${!inRange && distToPlayer < 20 ? `
          <div style="
            position:absolute;
            top:calc(50% - ${coreSize / 2}px - 22px);
            left:50%; transform:translateX(-50%);
            background:rgba(8,12,20,0.88);
            border:1px solid ${color}55;
            color:${color};
            font-family:Rajdhani,sans-serif; font-size:9px; font-weight:700;
            padding:1px 6px; border-radius:4px;
            white-space:nowrap;
          ">${distToPlayer.toFixed(1)} km</div>` : ''}

          <!-- ═══ GOLD sparkles ═══ -->
          ${t.type === 'gold' ? `
            <div style="position:absolute;top:calc(50% - ${coreSize}px);right:calc(50% - ${coreSize}px - 4px);font-size:10px;animation:sparkle 0.9s ease-in-out infinite;">✨</div>
            <div style="position:absolute;bottom:calc(50% - ${coreSize}px);left:calc(50% - ${coreSize}px - 2px);font-size:8px;animation:sparkle 1.2s ease-in-out infinite 0.5s;">✨</div>
          ` : ''}

        </div>`,
        iconSize: [wrap, wrap],
        iconAnchor: [wrap / 2, wrap / 2],
      });

      const marker = L.marker([t.lat, t.lng], { icon })
        .bindTooltip(
          `${chestEmoji} ${t.type.toUpperCase()} TREASURE<br/>
           💰 ${t.amount} units &nbsp;|&nbsp; ⚙️ Difficulty ${t.difficulty}/5<br/>
           📍 ${t.regionName}<br/>
           🚶 ${distToPlayer.toFixed(2)}km away`,
          { className: 'yahood-tooltip', direction: 'top' }
        )
        .addTo(markers);

      marker.on('click', () => {
        const state = useGameStore.getState();
        if (state.phase !== 'exploring') {
          setNotification({ text: 'Finish current action first!', type: 'warn' });
          return;
        }
        const dist = getDistanceKm(state.player.lat, state.player.lng, t.lat, t.lng);
        if (dist > 1.5) {
          setNotification({ text: `📍 Too far — ${dist.toFixed(1)}km away. Get within 1.5km to dig!`, type: 'info' });
        } else {
          startMining(t);
        }
      });
    }

    // ── AI Thieves ──
    for (const thief of thieves) {
      const color = getThiefColor(thief.type);
      const distToPlayer = player.lat
        ? getDistanceKm(player.lat, player.lng, thief.lat, thief.lng)
        : 999;
      const isNear = distToPlayer < 5;

      const icon = L.divIcon({
        className: 'yahood-marker',
        html: `<div style="
          width:26px; height:26px;
          background: ${color}22;
          border: 1.5px solid ${color}${isNear ? '' : '77'};
          border-radius: 50%;
          display:flex; align-items:center; justify-content:center;
          font-size:13px;
          box-shadow: 0 0 ${isNear ? 12 : 5}px ${color}${isNear ? '80' : '30'};
          ${isNear && player.hasPending ? 'animation: pulse-glow 0.8s ease-in-out infinite;' : ''}
        ">⚔</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      L.marker([thief.lat, thief.lng], { icon })
        .bindTooltip(`${thief.name} (${thief.type}) — ${distToPlayer.toFixed(1)}km`, { className: 'yahood-tooltip' })
        .addTo(markers);
    }

    // ── Player marker ──
    if (player.lat && player.lng) {
      const playerColor = player.hasPending ? '#fbbf24' : '#00e5ff';
      const distHome = player.homeLat
        ? getDistanceKm(player.lat, player.lng, player.homeLat, player.homeLng)
        : 0;

      const playerIcon = L.divIcon({
        className: 'yahood-marker',
        html: `
          <div style="position:relative; width:28px; height:28px;">
            <div class="pulse-ring" style="width:60px;height:60px;top:-16px;left:-16px;"></div>
            <div class="pulse-ring" style="width:60px;height:60px;top:-16px;left:-16px;"></div>
            <div class="pulse-ring" style="width:60px;height:60px;top:-16px;left:-16px;"></div>
            <div style="
              width:22px; height:22px; position:absolute; top:3px; left:3px;
              background: ${playerColor};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 0 25px ${playerColor}cc, 0 0 60px ${playerColor}55;
            "></div>
            ${player.hasPending ? '<div style="position:absolute;top:-16px;left:14px;font-size:16px;filter:drop-shadow(0 0 6px #fbbf24);">💰</div>' : ''}
            <div style="
              position:absolute; top:-75px; left:26px;
              background: rgba(12,15,26,0.94);
              border: 1px solid ${playerColor}55;
              border-radius: 10px;
              padding: 6px 10px;
              min-width: 160px;
              font-family: Rajdhani, sans-serif;
              pointer-events: none;
              backdrop-filter: blur(12px);
              box-shadow: 0 0 12px ${playerColor}30;
            ">
              <div style="color:${playerColor};font-family:Orbitron,monospace;font-size:10px;font-weight:700;margin-bottom:3px;">
                YOU — ${player.name}
              </div>
              <div style="display:flex;gap:8px;font-size:10px;">
                <span style="color:#00e5ff;">C:${assets.codes}</span>
                <span style="color:#a0b0c8;">S:${assets.silver}</span>
                <span style="color:#e8a820;">G:${assets.gold}</span>
              </div>
              <div style="font-size:9px;color:#666;margin-top:2px;">
                🏠 ${distHome > 0 ? distHome.toFixed(1) + ' km' : 'Locating...'}
                ${pendingList.length > 0 ? ` | 💰 ${pendingList.length} pending` : ''}
              </div>
              <div style="font-size:8px;color:#444;margin-top:1px;">
                ±${Math.round(player.accuracy)}m GPS
              </div>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([player.lat, player.lng], { icon: playerIcon, zIndexOffset: 2000 })
        .addTo(markers);

      if (player.accuracy > 0) {
        L.circle([player.lat, player.lng], {
          radius: player.accuracy,
          color: '#00e5ff',
          fillColor: '#00e5ff',
          fillOpacity: 0.04,
          weight: 1,
          dashArray: '2 4',
        }).addTo(markers);
      }
    }

    if (player.lat && player.lng) {
      map.panTo([player.lat, player.lng], { animate: true, duration: 0.5 });
    }

  }, [player, treasures, thieves, phase, mapMode, ownedLands]);

  return (
    <div
      className="relative w-full h-full"
      style={{ cursor: mapMode === 'buy' ? 'crosshair' : mapMode === 'dig' ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Ctext y=\'20\' font-size=\'20\'%3E⛏%3C/text%3E%3C/svg%3E") 4 20, crosshair' : 'grab' }}
    >
      <div ref={mapRef} className="w-full h-full" />

      {/* ── Edge pan zone indicators (4 directions) ── */}
      {/* Left */}
      <div className="edge-pan-zone edge-pan-left" title="Hover to pan left"><span className="edge-pan-arrow">◀</span></div>
      {/* Right */}
      <div className="edge-pan-zone edge-pan-right" title="Hover to pan right"><span className="edge-pan-arrow">▶</span></div>
      {/* Top */}
      <div className="edge-pan-zone edge-pan-top" title="Hover to pan up"><span className="edge-pan-arrow">▲</span></div>
      {/* Bottom */}
      <div className="edge-pan-zone edge-pan-bottom" title="Hover to pan down"><span className="edge-pan-arrow">▼</span></div>

      {/* ── Tool Buttons ── */}
      {phase !== 'locating' && (
        <div className="absolute top-2 right-12 z-[1000] flex gap-2">

          {/* Digger Tool */}
          <button
            onClick={() => setMapMode(mapMode === 'dig' ? 'explore' : 'dig')}
            title="Digger Tool — click treasure to dig"
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 font-display text-[10px] tracking-wider transition-all border ${
              mapMode === 'dig'
                ? 'bg-orange-500/30 border-orange-400 text-orange-300 shadow-[0_0_16px_rgba(251,146,60,0.5)]'
                : 'glass border-border/50 text-muted-foreground hover:border-orange-500/60 hover:text-orange-300'
            }`}
          >
            <span className="text-lg leading-none">⛏️</span>
            <span>{mapMode === 'dig' ? 'DIGGING' : 'DIGGER'}</span>
          </button>

          {/* Buy Land */}
          <button
            onClick={() => setMapMode(mapMode === 'buy' ? 'explore' : 'buy')}
            title="Buy Land — click anywhere on the map (costs 5 silver)"
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 font-display text-[10px] tracking-wider transition-all border ${
              mapMode === 'buy'
                ? 'bg-yellow-500/30 border-yellow-400 text-yellow-300 shadow-[0_0_16px_rgba(234,179,8,0.5)]'
                : 'glass border-border/50 text-muted-foreground hover:border-yellow-500/60 hover:text-yellow-300'
            }`}
          >
            <span className="text-lg leading-none">🏴</span>
            <span>{mapMode === 'buy' ? 'PICKING…' : 'BUY LAND'}</span>
          </button>

        </div>
      )}

      {/* Buy land instruction banner */}
      {mapMode === 'buy' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1000] glass-strong rounded-xl px-5 py-2.5 neon-border text-center">
          <div className="font-display text-xs neon-gold tracking-wider">LAND PURCHASE MODE</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Click anywhere on the map to plant your flag — costs 5 silver</div>
          <button
            onClick={() => setMapMode('explore')}
            className="mt-1.5 text-[10px] text-red-400 hover:text-red-300 underline font-display"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Dig mode instruction */}
      {mapMode === 'dig' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1000] glass-strong rounded-xl px-5 py-2.5 border border-orange-500/40 text-center">
          <div className="font-display text-xs text-orange-300 tracking-wider">⛏ DIGGER MODE ACTIVE</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Click any treasure within 1.5km to start digging</div>
          <button
            onClick={() => setMapMode('explore')}
            className="mt-1.5 text-[10px] text-red-400 hover:text-red-300 underline font-display"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Mining progress overlay */}
      {phase === 'mining' && miningTarget && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] glass-strong rounded-xl px-6 py-4 neon-border min-w-[260px]">
          <div className="text-center mb-2">
            <span className="font-display text-xs tracking-widest neon-cyan">
              ⛏ DIGGING {miningTarget.type.toUpperCase()} — {Math.round(miningProgress)}%
            </span>
            <div className="text-[10px] text-muted-foreground mt-0.5">{miningTarget.regionName}</div>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full mining-bar-fill"
              style={{
                width: `${miningProgress}%`,
                backgroundColor: getTreasureColor(miningTarget.type),
                boxShadow: `0 0 10px ${getTreasureColor(miningTarget.type)}`,
              }}
            />
          </div>
          <div className="text-center mt-1.5 text-[9px] text-muted-foreground">
            Keep digging... stay in range!
          </div>
        </div>
      )}

      {/* Coordinates HUD */}
      {player.lat !== 0 && (
        <div className="absolute top-2 left-2 z-[1000] glass rounded-lg px-3 py-1.5">
          <span className="font-mono text-[10px] text-muted-foreground">
            {player.lat.toFixed(5)}, {player.lng.toFixed(5)}
          </span>
        </div>
      )}

      {/* Owned lands count badge */}
      {ownedLands.length > 0 && (
        <div className="absolute bottom-20 right-4 z-[1000] glass rounded-lg px-3 py-1.5 border border-yellow-500/30">
          <span className="font-display text-[10px] text-yellow-400">
            🏴 {ownedLands.length} land{ownedLands.length > 1 ? 's' : ''} owned
          </span>
        </div>
      )}

    </div>
  );
};
