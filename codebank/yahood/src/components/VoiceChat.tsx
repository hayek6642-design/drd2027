import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/game/game-store';

interface VoicePeer {
  id: string;
  name: string;
  stream: MediaStream;
  audioEl: HTMLAudioElement;
  volume: number;
}

export const VoiceChat: React.FC = () => {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [micLevel, setMicLevel] = useState(0);
  const [voiceMode, setVoiceMode] = useState<'proximity' | 'global'>('proximity');
  const [peers, setPeers] = useState<VoicePeer[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const { addChat, setNotification, onlinePlayers } = useGameStore();

  const stopMic = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    setIsMicOn(false);
    setMicLevel(0);
  }, []);

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;
      setIsMicOn(true);

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(avg / 128);
        animRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      addChat('🎤 Joined voice channel');
      setNotification({ text: '🎤 Microphone active — nearby players can hear you', type: 'info' });
    } catch (err) {
      setNotification({ text: '❌ Microphone access denied. Check browser permissions.', type: 'danger' });
    }
  }, [addChat, setNotification]);

  const toggleMic = useCallback(() => {
    if (isMicOn) stopMic(); else startMic();
  }, [isMicOn, stopMic, startMic]);

  useEffect(() => {
    return () => { stopMic(); };
  }, [stopMic]);

  const activeCount = peers.length + (isMicOn ? 1 : 0);
  const maxStreams = 4;

  return (
    <div className="glass rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[10px] tracking-widest neon-cyan">VOICE CHAT</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setVoiceMode('proximity')}
            className={`px-2 py-0.5 rounded text-[9px] font-display tracking-wider transition-all ${
              voiceMode === 'proximity'
                ? 'bg-primary/20 border border-primary/50 text-primary'
                : 'text-muted-foreground border border-transparent hover:border-border'
            }`}
          >
            PROX
          </button>
          <button
            onClick={() => setVoiceMode('global')}
            className={`px-2 py-0.5 rounded text-[9px] font-display tracking-wider transition-all ${
              voiceMode === 'global'
                ? 'bg-primary/20 border border-primary/50 text-primary'
                : 'text-muted-foreground border border-transparent hover:border-border'
            }`}
          >
            GLOBAL
          </button>
        </div>
      </div>

      {/* Mic + speaker controls */}
      <div className="flex gap-2">
        <button
          onClick={toggleMic}
          className={`flex-1 py-2 rounded-lg font-display text-[10px] tracking-wider transition-all border ${
            isMicOn
              ? 'bg-red-950/40 border-red-500/50 text-red-400'
              : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
          }`}
        >
          {isMicOn ? '🔴 MUTE' : '🎤 SPEAK'}
        </button>
        <button
          onClick={() => setIsSpeakerOn(!isSpeakerOn)}
          className={`w-10 h-9 rounded-lg flex items-center justify-center text-base transition-all border ${
            isSpeakerOn
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-muted/50 border-border text-muted-foreground'
          }`}
          title={isSpeakerOn ? 'Mute speaker' : 'Unmute speaker'}
        >
          {isSpeakerOn ? '🔊' : '🔇'}
        </button>
      </div>

      {/* Mic level */}
      {isMicOn && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${Math.min(100, micLevel * 100)}%`,
              backgroundColor: micLevel > 0.7 ? '#ef4444' : micLevel > 0.4 ? '#fbbf24' : '#22c55e',
              boxShadow: `0 0 6px ${micLevel > 0.7 ? '#ef4444' : '#22c55e'}`,
            }}
          />
        </div>
      )}

      {/* Stream count */}
      <div className="flex items-center justify-between text-[9px] font-mono">
        <div className="flex gap-1">
          {Array.from({ length: maxStreams }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < activeCount
                  ? 'bg-green-500 shadow-[0_0_4px_#22c55e]'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <span className="text-muted-foreground">
          {activeCount}/{maxStreams} active
        </span>
      </div>

      {/* Mode info */}
      <div className="text-[9px] text-muted-foreground/70 text-center">
        {voiceMode === 'proximity'
          ? '📡 Audible within 500m of your position'
          : '🌍 Broadcast to all players globally'}
      </div>

      {/* Nearby voice peers */}
      {peers.length > 0 && (
        <div className="border-t border-border pt-2 space-y-1">
          {peers.map(p => (
            <div key={p.id} className="flex items-center gap-2 text-[10px]">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-foreground">{p.name}</span>
              <div className="flex-1 h-0.5 bg-muted rounded-full overflow-hidden ml-auto">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${p.volume * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
