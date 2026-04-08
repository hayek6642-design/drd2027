import React, { useState } from 'react';
import { useGameStore } from '@/game/game-store';
import { accBridge } from '@/game/acc-bridge';
import { getDistanceKm } from '@/game/geo-engine';

const FAKE_PLAYERS = [
  { id: 'u1', name: 'SandStorm_99', status: 'mining', avatar: '⚡', region: 'Cairo' },
  { id: 'u2', name: 'DesertFox', status: 'returning', avatar: '🦊', region: 'Dubai' },
  { id: 'u3', name: 'NightOwl_AR', status: 'exploring', avatar: '🦉', region: 'Riyadh' },
  { id: 'u4', name: 'CyberNomad', status: 'mining', avatar: '🤖', region: 'Istanbul' },
  { id: 'u5', name: 'GoldDigger_X', status: 'returning', avatar: '💎', region: 'Cairo' },
  { id: 'u6', name: 'PhantomTrader', status: 'exploring', avatar: '👻', region: 'London' },
  { id: 'u7', name: 'SilverHunter', status: 'mining', avatar: '🗡️', region: 'Paris' },
  { id: 'u8', name: 'CodeBreaker', status: 'exploring', avatar: '🔓', region: 'Tokyo' },
  { id: 'u9', name: 'DarkMatter_01', status: 'mining', avatar: '🌑', region: 'New York' },
  { id: 'u10', name: 'NeonViper', status: 'returning', avatar: '🐍', region: 'Dubai' },
  { id: 'u11', name: 'ArabicWolf', status: 'exploring', avatar: '🐺', region: 'Amman' },
  { id: 'u12', name: 'PixelPirate', status: 'mining', avatar: '🏴‍☠️', region: 'Singapore' },
];

const STATUS_COLORS: Record<string, string> = {
  mining: '#e8a820',
  returning: '#ff6b35',
  exploring: '#00e5ff',
  idle: '#555',
};

function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    locating: '📡 Locating GPS',
    'home-select': '🏠 Choosing Home',
    exploring: '🧭 Exploring',
    mining: '⛏️ Mining',
    returning: '🏃 Rushing Home',
    robbed: '💀 Robbed',
    deposited: '🏦 Deposited',
  };
  return labels[phase] || phase;
}

export const RoomsSidebar: React.FC = () => {
  const {
    player, phase, pending, chatRooms, activeRoom, setActiveRoom, riskLevel,
    openDm, activeDm, dmMessages,
  } = useGameStore();
  const assets = accBridge.getAssets();
  const [tab, setTab] = useState<'rooms' | 'players'>('rooms');
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);

  const distHome = player.homeLat && player.lat
    ? getDistanceKm(player.lat, player.lng, player.homeLat, player.homeLng)
    : null;

  return (
    <div className="flex flex-col h-full border-r border-border overflow-hidden" style={{ background: 'hsl(230, 20%, 8%)' }}>
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border" style={{ background: 'linear-gradient(180deg, hsl(230, 20%, 14%) 0%, hsl(230, 20%, 8%) 100%)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">🏴‍☠️</span>
          <div>
            <h1 className="font-display text-base font-bold neon-cyan tracking-wider leading-none">YAHOOD!</h1>
            <p className="text-[9px] text-muted-foreground font-mono">Real-World Mining Game</p>
          </div>
        </div>
      </div>

      {/* Player card */}
      <div className="px-3 py-2.5 border-b border-border space-y-2" style={{ background: 'hsl(230, 18%, 10%)' }}>
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base border ${
            player.hasPending
              ? 'bg-yellow-950/40 border-yellow-500/50'
              : 'bg-primary/10 border-primary/30'
          }`}>
            {player.hasPending ? '💰' : '🧑'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xs font-bold text-primary truncate">{player.name}</div>
            <div className="text-[10px] text-muted-foreground">{phaseLabel(phase)}</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-glow" />
        </div>

        {/* Asset bar */}
        <div className="flex gap-1 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded bg-cyan-950/50 text-cyan-400 border border-cyan-900/50">C:{assets.codes}</span>
          <span className="px-2 py-0.5 rounded bg-slate-800/50 text-slate-400 border border-slate-700/50">S:{assets.silver}</span>
          <span className="px-2 py-0.5 rounded bg-yellow-950/50 text-yellow-400 border border-yellow-900/50">G:{assets.gold}</span>
        </div>

        {/* Home distance + GPS */}
        <div className="flex items-center justify-between text-[9px] text-muted-foreground">
          <span>🏠 {distHome !== null ? `${distHome.toFixed(1)} km` : 'No home set'}</span>
          <span>📡 ±{Math.round(player.accuracy)}m</span>
        </div>

        {/* Risk meter */}
        {player.hasPending && (
          <div>
            <div className="flex justify-between text-[9px] mb-0.5">
              <span className="text-muted-foreground">Risk Level</span>
              <span className={riskLevel > 60 ? 'text-red-400' : riskLevel > 30 ? 'text-yellow-400' : 'text-green-400'}>
                {riskLevel > 60 ? '🔴 HIGH' : riskLevel > 30 ? '🟡 MED' : '🟢 LOW'}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${riskLevel}%`,
                  backgroundColor: riskLevel > 60 ? '#ef4444' : riskLevel > 30 ? '#fbbf24' : '#22c55e',
                  boxShadow: `0 0 6px ${riskLevel > 60 ? '#ef4444' : riskLevel > 30 ? '#fbbf24' : '#22c55e'}`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border flex-shrink-0">
        <button
          onClick={() => setTab('rooms')}
          className={`flex-1 py-1.5 text-[10px] font-display tracking-wider transition-colors ${
            tab === 'rooms' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          ROOMS
        </button>
        <button
          onClick={() => setTab('players')}
          className={`flex-1 py-1.5 text-[10px] font-display tracking-wider transition-colors ${
            tab === 'players' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          ONLINE ({FAKE_PLAYERS.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'rooms' ? (
          <div className="py-1">
            {chatRooms.map(room => (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room.id)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-muted/30 ${
                  activeRoom === room.id ? 'bg-primary/10 border-l-2 border-primary' : 'border-l-2 border-transparent'
                }`}
              >
                <span className="text-sm">{room.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] truncate ${activeRoom === room.id ? 'text-primary font-semibold' : 'text-foreground'}`}>
                    {room.name}
                  </div>
                  <div className="text-[9px] text-muted-foreground">{room.region}</div>
                </div>
                <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                  {Math.floor(Math.random() * 30 + 3)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-1">
            {FAKE_PLAYERS.map(u => {
              const isActive = activeDm?.id === u.id;
              const unreadCount = isActive ? 0 : (dmMessages[u.id]?.filter(m => !m.fromMe).length ?? 0);
              return (
                <button
                  key={u.id}
                  onClick={() => openDm({ id: u.id, name: u.name, avatar: u.avatar, status: u.status })}
                  onMouseEnter={() => setHoveredPlayer(u.id)}
                  onMouseLeave={() => setHoveredPlayer(null)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-all ${
                    isActive
                      ? 'bg-cyan-950/40 border-l-2 border-cyan-400'
                      : hoveredPlayer === u.id
                        ? 'bg-muted/30 border-l-2 border-muted-foreground/30'
                        : 'border-l-2 border-transparent hover:bg-muted/20'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <span className="text-base leading-none">{u.avatar}</span>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-500 text-[7px] font-bold text-black flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Name + region */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-[11px] truncate font-semibold ${isActive ? 'text-cyan-300' : 'text-foreground'}`}>
                      {u.name}
                    </div>
                    <div className="text-[9px] text-muted-foreground">{u.region}</div>
                  </div>

                  {/* Right side: status dot + chat icon on hover */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {hoveredPlayer === u.id && !isActive ? (
                      <span
                        className="text-[10px] text-cyan-400 font-display tracking-wide"
                        style={{ textShadow: '0 0 8px #00e5ff' }}
                      >
                        💬
                      </span>
                    ) : (
                      <>
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: STATUS_COLORS[u.status] || '#555',
                            boxShadow: `0 0 4px ${STATUS_COLORS[u.status] || '#555'}`,
                          }}
                        />
                        <span className="text-[8px] text-muted-foreground">{u.status}</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending bag warning */}
      {pending.length > 0 && (
        <div className="px-3 py-2 border-t flex-shrink-0" style={{ background: 'hsla(45, 100%, 50%, 0.06)', borderColor: 'hsla(45, 100%, 50%, 0.3)' }}>
          <div className="text-[10px] font-display neon-gold tracking-wider mb-1">⚠ PENDING LOOT</div>
          {pending.map(t => (
            <div key={t.id} className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">{t.type} ({t.regionName})</span>
              <span className="text-foreground font-semibold">+{t.amount}</span>
            </div>
          ))}
          <div className="text-[9px] text-yellow-500 mt-1">Return home to secure loot!</div>
        </div>
      )}
    </div>
  );
};
