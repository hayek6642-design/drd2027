import React, { useState, useEffect, useRef } from 'react';
import './YouTubeRewardSystem.css';
import './YouTubeControls.css';

interface YouTubePlayerProps {
  videoSections: Array<{
    name: string;
    videoId: string;
  }>;
  onTurboActivate?: () => void;
  onCodeSave?: (code: string) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoSections,
  onTurboActivate,
  onCodeSave
}) => {
  const channelId = 'UCZ5heNyv3s5dIw9mtjsAGsg';
  const [watchTime, setWatchTime] = useState(() => parseInt(localStorage.getItem('watchTime') || '0'));
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [code, setCode] = useState(localStorage.getItem('uniqueCode') || '');
  const [isFirstCodeAfterReload, setIsFirstCodeAfterReload] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const [progress, setProgress] = useState(0);
  
  const playerRef = useRef<any>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize YouTube Player
  useEffect(() => {
    const loadYouTubeAPI = () => {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initializePlayer;
    };

    if (window.YT) {
      initializePlayer();
    } else {
      loadYouTubeAPI();
    }

    return () => {
      stopTimer();
    };
  }, []);

  const initializePlayer = () => {
    try {
      playerRef.current = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoSections[currentVideoIndex].videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          autoplay: 1,
          mute: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 1,
          playsinline: 1
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: (event: any) => console.error('YouTube player error:', event.data)
        }
      });
    } catch (error) {
      console.error('Failed to initialize YouTube player:', error);
    }
  };

  const onPlayerReady = (event: any) => {
    event.target.playVideo();
    if (event.target?.getCurrentTime) {
      const lastTime = parseFloat(localStorage.getItem('lastPlaybackTime') || '0');
      if (lastTime > 0) {
        event.target.seekTo(lastTime);
      }
    }
    setShowStartOverlay(false);
  };

  const onPlayerStateChange = (event: any) => {
    if (event.data === 1) { // Playing
      setIsPlaying(true);
      startCounter();
    } else if (event.data === 2) { // Paused
      setIsPlaying(false);
      stopTimer();
    } else {
      setIsPlaying(false);
      stopTimer();
    }
  };

  const startCounter = () => {
    if (!timerIntervalRef.current) {
      const startTime = Date.now() - watchTime;
      timerIntervalRef.current = setInterval(() => {
        const newWatchTime = Date.now() - startTime;
        setWatchTime(newWatchTime);
        localStorage.setItem('watchTime', newWatchTime.toString());
        
        if (playerRef.current?.getCurrentTime) {
          localStorage.setItem('lastPlaybackTime', playerRef.current.getCurrentTime().toString());
        }

        // Generate new code every 5 minutes
        if (newWatchTime % (5 * 60 * 1000) < 10) {
          generateCode();
          setProgress(0);
        }

        // Update progress bar
        const newProgress = (newWatchTime % (5 * 60 * 1000)) / (5 * 60 * 1000) * 100;
        setProgress(newProgress);
      }, 10);
    }
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const generateCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newCode = '';

    if (isFirstCodeAfterReload) {
      newCode = 'FAKE-';
      for (let i = 0; i < 18; i++) {
        newCode += characters.charAt(Math.floor(Math.random() * characters.length));
        if ((i + 4 + 1) % 4 === 0 && i < 17) newCode += '-';
      }
      setIsFirstCodeAfterReload(false);
    } else {
      for (let i = 0; i < 22; i++) {
        newCode += characters.charAt(Math.floor(Math.random() * characters.length));
        if ((i + 1) % 4 === 0 && i < 21) newCode += '-';
      }
    }

    localStorage.setItem('uniqueCode', newCode);
    setCode(newCode);
    return newCode;
  };

  const handleSoundToggle = () => {
    if (!playerRef.current) return;
    if (playerRef.current.isMuted()) {
      playerRef.current.unMute();
    } else {
      playerRef.current.mute();
    }
  };

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    if (playerRef.current.getPlayerState() === 1) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handlePlayPauseMouseDown = () => {
    pressTimerRef.current = setTimeout(() => {
      stopTimer();
      window.open(`https://www.youtube.com/channel/${channelId}?sub_confirmation=1`, '_blank');
    }, 3000);
  };

  const handlePlayPauseMouseUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleToggleVideo = () => {
    if (!playerRef.current) return;
    const currentTime = playerRef.current.getCurrentTime();
    const nextVideoIndex = (currentVideoIndex + 1) % videoSections.length;

    // Save current video state
    localStorage.setItem(videoSections[currentVideoIndex].videoId, JSON.stringify({
      time: currentTime,
      index: playerRef.current.getPlaylistIndex?.() || 0
    }));

    setCurrentVideoIndex(nextVideoIndex);

    // Load new video
    const savedData = JSON.parse(localStorage.getItem(videoSections[nextVideoIndex].videoId) || '{}');
    const startSeconds = savedData.time || 0;

    playerRef.current.loadVideoById({
      videoId: videoSections[nextVideoIndex].videoId,
      startSeconds
    });
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const decisecondsPart = Math.floor((milliseconds % 1000) / 10);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);
    
    return `${String(hours).padStart(4, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(decisecondsPart).padStart(2, '0')}`;
  };

  return (
    <div className="youtube-player-container">
      <div className="youtube-container relative bg-black overflow-hidden mb-4" style={{ width: '100vw', height: '60vh', maxWidth: '800px' }}>
        <div id="youtube-player" className="w-full h-full"></div>

        {showStartOverlay && (
          <div
            className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center cursor-pointer"
            onClick={() => {
              if (playerRef.current) {
                playerRef.current.playVideo();
                setShowStartOverlay(false);
              }
            }}
          >
            <div className="text-center text-white">
              <div className="text-6xl mb-4">▶️</div>
              <div className="text-xl">Click to Start</div>
            </div>
          </div>
        )}
      </div>

      <div id="counter-container">
        <div id="watch-time">
          <span id="counter">
            {formatTime(watchTime).split('').map((digit, index) => (
              <span key={index}>
                {digit}
                <span className="shine"></span>
              </span>
            ))}
          </span>
        </div>

        <div id="control-buttons">
          <div id="extra-code-bar"></div>
          <button id="sound-button" onClick={handleSoundToggle}>🔊</button>
        </div>

        <div id="code-display" onClick={() => onCodeSave?.(code)}>{code}</div>
        <div id="progress-bar-container">
          <div id="sparkle-effect"></div>
          <div id="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>

        <button 
          id="play-pause-button"
          onClick={handlePlayPause}
          onMouseDown={handlePlayPauseMouseDown}
          onMouseUp={handlePlayPauseMouseUp}
          onMouseLeave={handlePlayPauseMouseUp}
          onTouchStart={handlePlayPauseMouseDown}
          onTouchEnd={handlePlayPauseMouseUp}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>

        <button id="toggle-button" onClick={handleToggleVideo}>
          {videoSections[currentVideoIndex].name}
        </button>
      </div>
    </div>
  );
};

export default YouTubePlayer;
