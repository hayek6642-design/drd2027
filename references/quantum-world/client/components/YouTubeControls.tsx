import React, { useEffect, useRef, useState } from 'react';
import './YouTubeControls.css';

interface YouTubeControlsProps {
  player: any;
  videoIds: string[];
  videoNames: string[];
  channelId: string;
  onVideoChange?: (videoId: string) => void;
}

const YouTubeControls: React.FC<YouTubeControlsProps> = ({
  player,
  videoIds,
  videoNames,
  channelId,
  onVideoChange,
}) => {
  const [watchTime, setWatchTime] = useState(parseInt(localStorage.getItem('watchTime') || '0'));
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [code, setCode] = useState(localStorage.getItem('uniqueCode') || '');
  const [isFirstCodeAfterReload, setIsFirstCodeAfterReload] = useState(true);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Initialize code if not present
    if (!code) {
      generateCode();
    }

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stopCounter();
      } else {
        startCounter();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopCounter();
    };
  }, []);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const decisecondsPart = Math.floor((milliseconds % 1000) / 10);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);
    
    return `${String(hours).padStart(4, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(decisecondsPart).padStart(2, '0')}`;
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

  const startCounter = () => {
    if (!timerIntervalRef.current) {
      const startTime = Date.now() - watchTime;
      timerIntervalRef.current = setInterval(() => {
        const newWatchTime = Date.now() - startTime;
        setWatchTime(newWatchTime);
        localStorage.setItem('watchTime', newWatchTime.toString());
        
        if (player?.getCurrentTime) {
          localStorage.setItem('lastPlaybackTime', player.getCurrentTime().toString());
        }

        // Generate new code every 5 minutes
        if (newWatchTime % (5 * 60 * 1000) < 10) {
          generateCode();
          const progressBar = document.getElementById('progress-bar');
          if (progressBar) progressBar.style.width = '0%';
        }

        // Update progress bar
        const progress = (newWatchTime % (5 * 60 * 1000)) / (5 * 60 * 1000) * 100;
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) progressBar.style.width = `${progress}%`;

      }, 10);
    }
  };

  const stopCounter = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const handleSoundToggle = () => {
    if (!player) return;
    if (player.isMuted()) {
      player.unMute();
    } else {
      player.mute();
    }
  };

  const handlePlayPause = () => {
    if (!player) return;
    if (player.getPlayerState() === 1) { // YT.PlayerState.PLAYING
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  const handlePlayPauseMouseDown = () => {
    pressTimer = setTimeout(() => {
      stopCounter();
      window.open(`https://www.youtube.com/channel/${channelId}?sub_confirmation=1`, '_blank');
    }, 3000);
  };

  const handlePlayPauseMouseUp = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  const handleToggleVideo = () => {
    if (!player) return;
    const currentTime = player.getCurrentTime();
    const nextVideoIndex = (currentVideoIndex + 1) % videoIds.length;

    // Save current video state
    localStorage.setItem(videoIds[currentVideoIndex], JSON.stringify({
      time: currentTime,
      index: player.getPlaylistIndex?.() || 0
    }));

    setCurrentVideoIndex(nextVideoIndex);

    // Load new video
    const savedData = JSON.parse(localStorage.getItem(videoIds[nextVideoIndex]) || '{}');
    const startSeconds = savedData.time || 0;
    const startIndex = savedData.index || 0;

    if (nextVideoIndex === 0) { // Home (Playlist)
      player.loadPlaylist({
        listType: 'playlist',
        list: videoIds[nextVideoIndex],
        index: startIndex,
        startSeconds
      });
    } else { // Single video
      player.loadVideoById({
        videoId: videoIds[nextVideoIndex],
        startSeconds
      });
    }

    if (onVideoChange) {
      onVideoChange(videoIds[nextVideoIndex]);
    }
  };

  return (
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

      <div id="code-display">{code}</div>
      <div id="progress-bar-container">
        <div id="sparkle-effect"></div>
        <div id="progress-bar"></div>
      </div>

      <button 
        id="play-pause-button"
        onClick={handlePlayPause}
        onMouseDown={handlePlayPauseMouseDown}
        onMouseUp={handlePlayPauseMouseUp}
        onMouseLeave={handlePlayPauseMouseUp}
        onTouchStart={handlePlayPauseMouseDown}
        onTouchEnd={handlePlayPauseMouseUp}
      ></button>

      <button id="toggle-button" onClick={handleToggleVideo}>
        {videoNames[currentVideoIndex]}
      </button>
    </div>
  );
};

export default YouTubeControls;
