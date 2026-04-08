import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { ChevronUp, ChevronDown, Film, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VideoPlayer } from "./video-player";
import type { Video, EngagementType } from "@shared/schema";

// Skeleton loading component for better UX
function VideoSkeleton() {
  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-20 p-5">
          <div className="space-y-2 animate-pulse">
            <div className="h-6 bg-white/20 rounded w-3/4" />
            <div className="flex gap-4">
              <div className="h-4 bg-white/10 rounded w-16" />
              <div className="h-4 bg-white/10 rounded w-20" />
            </div>
          </div>
        </div>
        <div className="absolute right-4 bottom-20 flex flex-col gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-12 h-12 bg-white/10 rounded-full animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

interface VideoFeedProps {
  videos: Video[];
  onEngagement?: (type: EngagementType, videoId: number) => void;
  onToggleFavorite?: (videoId: number) => void;
  favorites?: number[];
}

const VISIBLE_BUFFER = 2; // Keep 2 videos before and after current in DOM

export function VideoFeed({ videos, onEngagement, onToggleFavorite, favorites = [] }: VideoFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const scrollToIndex = useCallback((index: number) => {
    if (index < 0 || index >= videos.length) return;
    
    const container = containerRef.current;
    if (container) {
      const height = container.clientHeight;
      container.scrollTo({
        top: index * height,
        behavior: "smooth",
      });
    }
  }, [videos.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const height = container.clientHeight;
      const scrollTop = container.scrollTop;
      const newIndex = Math.round(scrollTop / height);
      
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
        setCurrentIndex(newIndex);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [currentIndex, videos.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        scrollToIndex(currentIndex - 1);
      } else if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        scrollToIndex(currentIndex + 1);
      } else if (e.key === " ") {
        e.preventDefault();
      } else if (e.key === "m") {
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, scrollToIndex]);

  // Touch gesture handling for mobile
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let isScrolling = false;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      isScrolling = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isScrolling) return;
      e.preventDefault(); // Prevent default scrolling during gesture
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isScrolling) return;
      isScrolling = false;

      const endY = e.changedTouches[0].clientY;
      const diffY = startY - endY;

      // Minimum swipe distance (50px)
      if (Math.abs(diffY) > 50) {
        if (diffY > 0) {
          // Swipe up - next video
          scrollToIndex(currentIndex + 1);
        } else {
          // Swipe down - previous video
          scrollToIndex(currentIndex - 1);
        }
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [currentIndex, scrollToIndex]);

  const handleMuteToggle = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  if (videos.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background" data-testid="empty-feed">
        <div className="text-center p-8 animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Film className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No videos yet</h2>
          <p className="text-muted-foreground max-w-sm">
            Upload your first video to get started with your video feed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            className="h-full w-full snap-start snap-always"
            data-testid={`video-item-${video.id}`}
          >
            <VideoPlayer
              video={video}
              isActive={index === currentIndex}
              isMuted={isMuted}
              onMuteToggle={handleMuteToggle}
              onEngagement={onEngagement}
              onToggleFavorite={onToggleFavorite}
              isFavorite={favorites.includes(video.id)}
            />
          </div>
        ))}
      </div>

      {/* Desktop navigation buttons */}
      <button
        onClick={() => scrollToIndex(currentIndex - 1)}
        className={cn(
          "hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+100px)] z-20",
          "w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center",
          "hover:bg-black/70 transition-all duration-200 hover:scale-110",
          currentIndex === 0 && "opacity-0 pointer-events-none"
        )}
        aria-label="Previous video"
        data-testid="button-prev-video"
      >
        <ChevronUp className="w-6 h-6 text-white" />
      </button>

      <button
        onClick={() => scrollToIndex(currentIndex + 1)}
        className={cn(
          "hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%-100px)] z-20",
          "w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center",
          "hover:bg-black/70 transition-all duration-200 hover:scale-110",
          currentIndex === videos.length - 1 && "opacity-0 pointer-events-none"
        )}
        aria-label="Next video"
        data-testid="button-next-video"
      >
        <ChevronDown className="w-6 h-6 text-white" />
      </button>

      {/* Progress indicators - responsive sizing */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20">
        {videos.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            className={cn(
              "rounded-full transition-all duration-200 touch-manipulation",
              "md:w-1 md:h-4 w-2 h-6", // Larger touch targets on mobile
              index === currentIndex
                ? "bg-primary scale-125 md:scale-125"
                : "bg-white/40 hover:bg-white/60 active:bg-white/80"
            )}
            aria-label={`Go to video ${index + 1}`}
          />
        ))}
      </div>

      {/* Mobile swipe hint */}
      <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm">
          <div className="w-1 h-4 bg-white/60 rounded-full animate-pulse" />
          <span className="text-xs text-white/70">Swipe to navigate</span>
          <div className="w-1 h-4 bg-white/60 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}