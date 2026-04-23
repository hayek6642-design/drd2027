import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/game/game-store';

const ROOM_MESSAGES: Record<string, string[]> = {
  global: [
    'Anyone near Cairo? gold spotted!',
    'Watch out — shadow thieves near Istanbul',
    'Just mined 3 silver from Dubai Marina 💎',
    'Looking for trade partners in Asia',
  ],
  nearby: ['No one nearby yet...'],
  thieves: [
    'Found a rich target heading home 👀',
    'Cairo to home distance estimated 8km — easy chase',
    'Shadow mode activated 🌑',
  ],
  trade: [
    '15 codes for 1 silver — anyone?',
    'WTB gold, paying premium',
    'Silver bulk deal available in Riyadh zone',
  ],
};

export const ChatPanel: React.FC = () => {
  const {
    chatMessages, addChat, activeRoom, chatRooms,
    activeDm, closeDm, sendDm, dmMessages,
  } = useGameStore();

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const room = chatRooms.find(r => r.id === activeRoom);

  const isDm = activeDm !== null;

  const allRoomMessages = [
    ...(ROOM_MESSAGES[activeRoom] || []).map((text, i) => ({
      id: `room-${i}`,
      sender: ['SandStorm_99', 'DesertFox', 'NightOwl_AR', 'CyberNomad'][i % 4],
      text,
      time: Date.now() - (60 - i * 15) * 1000,
      isSystem: false,
      fromMe: false,
    })),
    ...chatMessages.map(m => ({ ...m, fromMe: false })),
  ].sort((a, b) => a.time - b.time);

  const dmConversation = activeDm ? (dmMessages[activeDm.id] || []) : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, activeRoom, activeDm, dmMessages]);

  // Focus input when DM opens
  useEffect(() => {
    if (activeDm) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [activeDm]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (isDm) {
      sendDm(trimmed);
    } else {
      addChat(trimmed);
    }
    setInput('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full border-t border-border overflow-hidden">

      {/* ── Header ── */}
      {isDm ? (
        /* DM header */
        <div
          className="px-3 py-2 border-b border-border flex items-center gap-2 flex-shrink-0"
          style={{ background: 'hsl(200, 30%, 8%)' }}
        >
          {/* Back button */}
          <button
            onClick={closeDm}
            className="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-cyan-400 hover:bg-cyan-950/40 transition-colors flex-shrink-0"
            title="Back to room chat"
          >
            ←
          </button>
          {/* Avatar + name */}
          <span className="text-base leading-none">{activeDm.avatar}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-display text-cyan-300 font-semibold truncate"
              style={{ textShadow: '0 0 8px rgba(0,229,255,0.5)' }}>
              {activeDm.name}
            </div>
            <div className="text-[9px] text-muted-foreground">Direct Message · {activeDm.status}</div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"
            style={{ boxShadow: '0 0 4px #22c55e' }} />
        </div>
      ) : (
        /* Room header */
        <div
          className="px-3 py-1.5 border-b border-border flex items-center gap-2 flex-shrink-0"
          style={{ background: 'hsl(230, 18%, 9%)' }}
        >
          <span className="text-sm">{room?.icon || '💬'}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-display neon-cyan truncate">{room?.name || 'Chat'}</div>
            <div className="text-[9px] text-muted-foreground">{room?.userCount || 0} online</div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-glow" />
        </div>
      )}

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 py-2 space-y-2"
        style={{ minHeight: 80 }}
      >
        {isDm ? (
          dmConversation.length === 0 ? (
            /* Empty DM state */
            <div className="flex flex-col items-center justify-center h-full gap-2 py-8 text-center">
              <div className="text-3xl">{activeDm.avatar}</div>
              <div className="text-[11px] text-muted-foreground font-display tracking-wider">
                Start chatting with<br/>
                <span className="text-cyan-400">{activeDm.name}</span>
              </div>
              <div className="text-[9px] text-muted-foreground/50 mt-1">
                Messages are encrypted end-to-end
              </div>
            </div>
          ) : (
            dmConversation.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.fromMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-1.5 ${
                    msg.fromMe
                      ? 'bg-cyan-900/50 border border-cyan-700/40 rounded-br-sm'
                      : 'bg-muted/60 border border-border/50 rounded-bl-sm'
                  }`}
                >
                  <div className="text-[11px] text-foreground/95 leading-snug break-words">
                    {msg.text}
                  </div>
                </div>
                <div className="text-[8px] text-muted-foreground/40 mt-0.5 px-1">
                  {formatTime(msg.time)}
                </div>
              </div>
            ))
          )
        ) : (
          allRoomMessages.slice(-60).map((msg) => (
            <div key={msg.id} className="group flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-[10px] font-semibold leading-none ${
                  msg.isSystem ? 'text-green-400' : 'text-cyan-400'
                }`}>
                  {msg.sender}
                </span>
                <span className="text-[8px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatTime(msg.time)}
                </span>
              </div>
              <div className="text-[11px] text-foreground/90 leading-tight mt-0.5 break-words">
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Input ── */}
      <div className={`px-2 py-2 border-t flex gap-1.5 flex-shrink-0 ${
        isDm ? 'border-cyan-900/40' : 'border-border'
      }`}
        style={isDm ? { background: 'hsl(200, 25%, 7%)' } : undefined}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={isDm ? `Message ${activeDm?.name}…` : 'Type a message...'}
          className={`flex-1 border rounded px-2 py-1.5 text-[11px] text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${
            isDm
              ? 'bg-cyan-950/30 border-cyan-800/50 focus:ring-cyan-600/50'
              : 'bg-input border-border focus:ring-ring'
          }`}
        />
        <button
          onClick={send}
          className={`px-2.5 py-1.5 rounded text-[10px] font-display hover:opacity-80 transition-opacity ${
            isDm
              ? 'bg-cyan-700 text-white'
              : 'bg-primary text-primary-foreground'
          }`}
        >
          ↵
        </button>
      </div>
    </div>
  );
};
