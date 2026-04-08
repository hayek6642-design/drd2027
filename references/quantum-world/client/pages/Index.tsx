import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import '../components/YouTubeRewardSystem.css';
import { YouTubePlayer } from '../components/YouTubePlayer';
import YouTubeControls from '../components/YouTubeControls';

// YouTube Player API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VideoSection {
  name: string;
  videoId: string;
}

interface TurboState {
  isActive: boolean;
  startTime: number;
  duration: number;
}

export default function Index() {
  const navigate = useNavigate();
  const channelId = 'UCZ5heNyv3s5dIw9mtjsAGsg';

  // Video player component
  const YouTubePlayerLazy = React.lazy(() => import('../components/YouTubePlayer'));

  const [watchTime, setWatchTime] = useState(parseInt(localStorage.getItem('watchTime') || '0'));
  const [savedCodes, setSavedCodes] = useState<string[]>(() => {
    const saved = localStorage.getItem('savedCodes');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentCode, setCurrentCode] = useState(() => {
    return localStorage.getItem('uniqueCode') || '';
  });
  
  const [turboState, setTurboState] = useState<TurboState>(() => {
    const saved = localStorage.getItem('turboState');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Check if turbo is still valid (not expired)
      const isExpired = Date.now() - parsed.startTime > parsed.duration;
      if (!isExpired) {
        return parsed;
      }
    }
    return { isActive: false, startTime: 0, duration: 60 * 60 * 1000 }; // 1 hour
  });
  
  const [isCodePulsing, setIsCodePulsing] = useState(false);
  const [showCompressModal, setShowCompressModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentVideoSection, setCurrentVideoSection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Video sections configuration
  const videoSections: VideoSection[] = [
    { name: 'Home', videoId: 'fUehe82E5yU' },
    { name: 'Nour', videoId: 'SJUH0qthtCA' },
    { name: 'Afra7', videoId: 'Mw-lmUzkiY0' }
  ];
  
  const playerRef = useRef<any>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null | 'triggered'>(null);
  const turboCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Code generation intervals
  const normalInterval = 5 * 60 * 1000; // 5 minutes
  const turboInterval = 4 * 60 * 1000;  // 4 minutes
  const currentInterval = turboState.isActive ? turboInterval : normalInterval;

  const stopTurboCheck = () => {
    if (turboCheckIntervalRef.current) {
      clearInterval(turboCheckIntervalRef.current);
      turboCheckIntervalRef.current = null;
    }
  };

  // Initialize YouTube Player
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initializePlayer();
    } else {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = initializePlayer;
    }

    function initializePlayer() {
      try {
        playerRef.current = new window.YT.Player('youtube-player', {
          height: '100%',
          width: '100%',
          videoId: videoSections[currentVideoSection].videoId,
          playerVars: {
            controls: 0,
            disablekb: 1,
            autoplay: 1,
            mute: 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            fs: 1,
            iv_load_policy: 3,
            cc_load_policy: 0,
            playsinline: 1,
            start: 0,
            enablejsapi: 1
          },
          events: {
            onReady: () => {
              setIsPlayerReady(true);
              playerRef.current?.playVideo?.();
            },
            onStateChange: (event: any) => {
              if (event.data === 1) {
                setIsPlaying(true);
                setShowStartOverlay(false);
              } else {
                setIsPlaying(false);
              }
            },
            onError: (error: any) => {
              console.error('YouTube player error:', error);
            }
          }
        });
      } catch (error) {
        console.error('Failed to initialize YouTube player:', error);
      }
    }

    return () => {
      stopTimer();
      stopTurboCheck();
    };
  }, [currentVideoSection]);

  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) return;
    
    const startTime = Date.now() - watchTime;
    timerIntervalRef.current = setInterval(() => {
      const newWatchTime = Date.now() - startTime;
      setWatchTime(newWatchTime);
      localStorage.setItem('watchTime', newWatchTime.toString());
      
      // Calculate progress
      const currentProgress = (newWatchTime % currentInterval) / currentInterval * 100;
      setProgress(currentProgress);
      
      // Generate new code
      if (newWatchTime % currentInterval < 100) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 33; i++) {
          code += characters.charAt(Math.floor(Math.random() * characters.length));
          if ((i + 1) % 4 === 0 && i < 32) code += '-';
        }
        setCurrentCode(code);
        setIsCodePulsing(true);
        localStorage.setItem('uniqueCode', code);
        setProgress(0);
        toast.success('New code generated!');
      }
    }, 100);
  }, [watchTime, currentInterval]);

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const handleExtraButtonClick = () => {
    setTimeout(() => {
      if (!turboState.isActive) {
        navigate('/codeBank');
      }
    }, 10);
  };

  const handleExtraButtonPress = () => {
    longPressTimerRef.current = setTimeout(() => {
      if (!turboState.isActive) {
        setTurboState({
          isActive: true,
          startTime: Date.now(),
          duration: 60 * 60 * 1000
        });
        toast.success('🚀 Turbo Mode Activated!');
        longPressTimerRef.current = 'triggered';
      }
    }, 1500);
  };

  const handleExtraButtonRelease = () => {
    const wasLongPress = longPressTimerRef.current === 'triggered';
    if (longPressTimerRef.current && longPressTimerRef.current !== 'triggered') {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = null;
    return wasLongPress;
  };

  const handleToggleVideoSection = () => {
    const nextSection = (currentVideoSection + 1) % videoSections.length;
    setCurrentVideoSection(nextSection);
    if (playerRef.current?.loadVideoById) {
      playerRef.current.loadVideoById(videoSections[nextSection].videoId);
    }
    toast.success(`Switched to ${videoSections[nextSection].name} section`);
  };

  // Effect for turbo state persistence
  useEffect(() => {
    localStorage.setItem('turboState', JSON.stringify(turboState));
    if (turboState.isActive) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - turboState.startTime;
        if (elapsed >= turboState.duration) {
          setTurboState(prev => ({ ...prev, isActive: false }));
          toast.info('Turbo mode expired after 1 hour');
        }
      }, 1000);
      turboCheckIntervalRef.current = interval;
      return () => clearInterval(interval);
    }
  }, [turboState]);

  // Effect for saved codes persistence
  useEffect(() => {
    localStorage.setItem('savedCodes', JSON.stringify(savedCodes));
  }, [savedCodes]);

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col items-center overflow-hidden">
      <div className="flex-1 w-full relative">
        <React.Suspense fallback={<div>Loading...</div>}>
          <YouTubePlayerLazy
            videoSections={videoSections}
            onTurboActivate={() => {
              setTurboState({
                isActive: true,
                startTime: Date.now(),
                duration: 60 * 60 * 1000
              });
              toast.success('🚀 Turbo Mode Activated!');
            }}
            onCodeSave={(code) => {
              if (savedCodes.length >= 500) {
                setShowCompressModal(true);
                return;
              }
              setSavedCodes(prev => [...prev, code]);
              toast.success('✅ Code Saved!');
            }}
          />
        </React.Suspense>

        {/* Touch Overlay */}
        {!showStartOverlay && (
          <div
            className="absolute inset-0 z-10 bg-transparent"
            onTouchStart={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
            onTouchEnd={(e) => e.preventDefault()}
            onClick={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            style={{ pointerEvents: 'all' }}
          />
        )}

        {/* Sound Button */}
        <button
          className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm hover:bg-black/90 transition-all z-30"
          onClick={() => {
            if (!playerRef.current) return;
            if (playerRef.current.isMuted?.()) {
              playerRef.current.unMute?.();
            } else {
              playerRef.current.mute?.();
            }
          }}
        >
          🔊
        </button>
      </div>

      {/* Controls */}
      <div className="w-full max-w-4xl p-4">
        <YouTubeControls
          player={playerRef.current}
          videoIds={videoSections.map(section => section.videoId)}
          videoNames={videoSections.map(section => section.name)}
          channelId={channelId}
          onVideoChange={(videoId) => {
            const sectionIndex = videoSections.findIndex(section => section.videoId === videoId);
            if (sectionIndex !== -1) {
              setCurrentVideoSection(sectionIndex);
            }
          }}
        />

        <div className="flex justify-center space-x-4 mt-4">
          <button
            className={`control-button relative z-30 ${turboState.isActive ? 'turbo-active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleExtraButtonClick();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              handleExtraButtonPress();
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              handleExtraButtonRelease();
            }}
            onMouseLeave={handleExtraButtonRelease}
            onTouchStart={(e) => {
              e.preventDefault();
              handleExtraButtonPress();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleExtraButtonRelease();
            }}
          >
            Extra {turboState.isActive ? '⚡' : ''}
          </button>

          <button
            className="control-button relative z-30"
            onClick={() => {
              if (!playerRef.current) return;
              const state = playerRef.current.getPlayerState?.();
              if (state === 1) {
                playerRef.current.pauseVideo?.();
                setIsPlaying(false);
              } else {
                playerRef.current.playVideo?.();
                setIsPlaying(true);
              }
            }}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>

          <button
            className="control-button relative z-30"
            onClick={handleToggleVideoSection}
          >
            {videoSections[currentVideoSection].name}
          </button>
        </div>

        <div className="text-center text-gray-400 text-sm mt-2">
          Section: {videoSections[currentVideoSection].name} | Saved Codes: {savedCodes.length}
        </div>
      </div>

      {/* Compression Modal */}
      {showCompressModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-center">Code Limit Reached!</h3>
            <p className="text-gray-300 mb-6 text-center">
              You've reached the limit of 500 codes. Please compress your codes into silver/golden bars.
            </p>
            <div className="flex gap-4">
              <button
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                onClick={() => {
                  setShowCompressModal(false);
                  window.open('/codeBank', '_blank');
                }}
              >
                Compress Now
              </button>
              <button
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                onClick={() => setShowCompressModal(false)}
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
