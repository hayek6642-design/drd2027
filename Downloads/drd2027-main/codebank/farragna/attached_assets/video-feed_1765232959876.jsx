"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoFeed = VideoFeed;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const video_player_1 = require("./video-player");
function VideoFeed({ videos, onEngagement, onToggleFavorite, favorites = [] }) {
    const containerRef = (0, react_1.useRef)(null);
    const [currentIndex, setCurrentIndex] = (0, react_1.useState)(0);
    const [isMuted, setIsMuted] = (0, react_1.useState)(true);
    const scrollToIndex = (0, react_1.useCallback)((index) => {
        if (index < 0 || index >= videos.length)
            return;
        const container = containerRef.current;
        if (container) {
            const height = container.clientHeight;
            container.scrollTo({
                top: index * height,
                behavior: "smooth",
            });
        }
    }, [videos.length]);
    (0, react_1.useEffect)(() => {
        const container = containerRef.current;
        if (!container)
            return;
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
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (e) => {
            if (e.key === "ArrowUp" || e.key === "k") {
                e.preventDefault();
                scrollToIndex(currentIndex - 1);
            }
            else if (e.key === "ArrowDown" || e.key === "j") {
                e.preventDefault();
                scrollToIndex(currentIndex + 1);
            }
            else if (e.key === " ") {
                e.preventDefault();
            }
            else if (e.key === "m") {
                setIsMuted((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentIndex, scrollToIndex]);
    const handleMuteToggle = (0, react_1.useCallback)(() => {
        setIsMuted((prev) => !prev);
    }, []);
    if (videos.length === 0) {
        return (<div className="flex-1 flex items-center justify-center bg-background" data-testid="empty-feed">
        <div className="text-center p-8 animate-fade-in">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <lucide_react_1.ChevronDown className="w-12 h-12 text-muted-foreground"/>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">No videos yet</h2>
          <p className="text-muted-foreground max-w-sm">
            Upload your first video to get started with your video feed
          </p>
        </div>
      </div>);
    }
    return (<div className="relative flex-1 overflow-hidden">
      <div ref={containerRef} className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {videos.map((video, index) => (<div key={video.id} className="h-full w-full snap-start snap-always" data-testid={`video-item-${video.id}`}>
            <video_player_1.VideoPlayer video={video} isActive={index === currentIndex} isMuted={isMuted} onMuteToggle={handleMuteToggle} onEngagement={onEngagement} onToggleFavorite={onToggleFavorite} isFavorite={favorites.includes(video.id)}/>
          </div>))}
      </div>

      <button onClick={() => scrollToIndex(currentIndex - 1)} className={(0, utils_1.cn)("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+100px)] z-20", "w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center", "hover:bg-black/70 transition-all duration-200 hover:scale-110", currentIndex === 0 && "opacity-0 pointer-events-none")} aria-label="Previous video" data-testid="button-prev-video">
        <lucide_react_1.ChevronUp className="w-6 h-6 text-white"/>
      </button>

      <button onClick={() => scrollToIndex(currentIndex + 1)} className={(0, utils_1.cn)("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%-100px)] z-20", "w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center", "hover:bg-black/70 transition-all duration-200 hover:scale-110", currentIndex === videos.length - 1 && "opacity-0 pointer-events-none")} aria-label="Next video" data-testid="button-next-video">
        <lucide_react_1.ChevronDown className="w-6 h-6 text-white"/>
      </button>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20">
        {videos.map((_, index) => (<button key={index} onClick={() => scrollToIndex(index)} className={(0, utils_1.cn)("w-1 h-4 rounded-full transition-all duration-200", index === currentIndex
                ? "bg-primary scale-125"
                : "bg-white/40 hover:bg-white/60")} aria-label={`Go to video ${index + 1}`}/>))}
      </div>
    </div>);
}
