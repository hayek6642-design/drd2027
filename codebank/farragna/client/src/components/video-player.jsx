import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EngagementButtons } from "./engagement-buttons";
import type { Video, EngagementType } from "@shared/schema";

interface VideoPlayerProps {
  video: Video;
  isActive: boolean;
  isMuted: boolean;
  onMuteToggle: () => void;
  onEngagement?: (type: EngagementType, videoId: number) => void;
  onToggleFavorite?: (videoId: number) => void;
  isFavorite?: boolean;
}

export function VideoPlayer({
  video,
  isActive,
  isMuted,
  onMuteToggle,
  onEngagement,
  onToggleFavorite,
  isFavorite = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isActive) {
      videoEl.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.error("Video play error:", error);
        setIsPlaying(false);
      });
    } else {
      videoEl.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.muted = isMuted;
    }
  }, [isMuted]);

  const handleTimeUpdate = useCallback(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      const progress = (videoEl.currentTime / videoEl.duration) * 100;
      setProgress(progress);
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isPlaying) {
      videoEl.pause();
      setIsPlaying(false);
    } else {
      videoEl.play().then(() => setIsPlaying(true));
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    videoEl.currentTime = percentage * videoEl.duration;
  }, []);

  const handleFullscreen = useCallback(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoEl.requestFullscreen();
      }
    }
  }, []);

  const isYouTube = video.videoUrl?.includes("youtube.com") || video.videoUrl?.includes("youtu.be");
  const getYouTubeEmbedUrl = (url: string) => {
    let videoId = "";
    if (url.includes("v=")) {
      videoId = url.split("v=")[1].split("&")[0];
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1].split("?")[0];
    }
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&modestbranding=1&loop=1&playlist=${videoId}`;
  };

  return (
    <div
      className="relative w-full h-full bg-black overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {isYouTube ? (
        <iframe
          src={getYouTubeEmbedUrl(video.videoUrl)}
          className="w-full h-full object-cover select-none pointer-events-none"
          allow="autoplay; encrypted-media"
          style={{ border: 'none', scale: '1.5' }} // Scale up to hide black bars in vertical feed
        />
      ) : (
        <video
          controls={false}
          preload="metadata"
          playsInline
          src={video.videoUrl}
          className="w-full h-full object-cover select-none"
          loop
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onLoadedData={() => setIsLoading(false)}
          onWaiting={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
          onClick={handlePlayPause}
          onError={(e) => {
            console.error("Video failed:", video.videoUrl, e);
          }}
          draggable={false}
          data-testid={`video-element-${video.id}`}
        />
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center animate-fade-in border border-white/20 shadow-2xl">
            <Play className="w-10 h-10 text-white ml-1 drop-shadow-lg" />
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-20 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex flex-col gap-2 animate-slide-up">
          <h3
            className="text-lg font-semibold text-white line-clamp-2"
            data-testid={`text-caption-${video.id}`}
          >
            {video.caption || "Untitled video"}
          </h3>
          <div className="flex items-center gap-4 text-sm text-white/70">
            <span data-testid={`text-views-${video.id}`}>
              {video.views?.toLocaleString() || 0} views
            </span>
            <span className="text-white/50">•</span>
            <span data-testid={`text-category-${video.id}`}>
              {video.category || "entertainment"}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute right-4 bottom-28 z-10">
        <EngagementButtons
          videoId={video.id}
          initialLikes={video.likes || 0}
          initialSuperLikes={video.superLikes || 0}
          initialMegaLikes={video.megaLikes || 0}
          onEngagement={onEngagement}
          onToggleFavorite={onToggleFavorite}
          isFavorite={isFavorite}
        />
      </div>

      <div
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 transition-all duration-300",
          showControls ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
        )}
      >
        <button
          onClick={handlePlayPause}
          className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 hover:scale-110 active:scale-95 transition-all duration-200 border border-white/10 hover:border-white/20 shadow-lg"
          aria-label={isPlaying ? "Pause" : "Play"}
          data-testid={`button-playpause-${video.id}`}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white drop-shadow-sm" />
          ) : (
            <Play className="w-6 h-6 text-white ml-0.5 drop-shadow-sm" />
          )}
        </button>

        <button
          onClick={onMuteToggle}
          className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 hover:scale-110 active:scale-95 transition-all duration-200 border border-white/10 hover:border-white/20 shadow-lg"
          aria-label={isMuted ? "Unmute" : "Mute"}
          data-testid={`button-mute-${video.id}`}
        >
          {isMuted ? (
            <VolumeX className="w-6 h-6 text-white drop-shadow-sm" />
          ) : (
            <Volume2 className="w-6 h-6 text-white drop-shadow-sm" />
          )}
        </button>

        <button
          onClick={handleFullscreen}
          className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 hover:scale-110 active:scale-95 transition-all duration-200 border border-white/10 hover:border-white/20 shadow-lg"
          aria-label="Fullscreen"
          data-testid={`button-fullscreen-${video.id}`}
        >
          <Maximize className="w-6 h-6 text-white drop-shadow-sm" />
        </button>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40 cursor-pointer group"
        onClick={handleSeek}
        data-testid={`progress-bar-${video.id}`}
      >
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 shadow-sm"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg border border-white/20"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

      <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 text-xs text-white/70 pointer-events-none select-none">
        Farragna
      </div>
    </div>
  );
}