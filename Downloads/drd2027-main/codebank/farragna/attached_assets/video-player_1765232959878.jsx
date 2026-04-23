"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const engagement_buttons_1 = require("./engagement-buttons");
function VideoPlayer({ video, isActive, isMuted, onMuteToggle, onEngagement, onToggleFavorite, isFavorite = false, }) {
    var _a;
    const videoRef = (0, react_1.useRef)(null);
    const [isPlaying, setIsPlaying] = (0, react_1.useState)(false);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [progress, setProgress] = (0, react_1.useState)(0);
    const [showControls, setShowControls] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const videoEl = videoRef.current;
        if (!videoEl)
            return;
        if (isActive) {
            videoEl.play().then(() => {
                setIsPlaying(true);
            }).catch((error) => {
                console.error("Video play error:", error);
                setIsPlaying(false);
            });
        }
        else {
            videoEl.pause();
            setIsPlaying(false);
        }
    }, [isActive]);
    (0, react_1.useEffect)(() => {
        const videoEl = videoRef.current;
        if (videoEl) {
            videoEl.muted = isMuted;
        }
    }, [isMuted]);
    const handleTimeUpdate = (0, react_1.useCallback)(() => {
        const videoEl = videoRef.current;
        if (videoEl) {
            const progress = (videoEl.currentTime / videoEl.duration) * 100;
            setProgress(progress);
        }
    }, []);
    const handlePlayPause = (0, react_1.useCallback)(() => {
        const videoEl = videoRef.current;
        if (!videoEl)
            return;
        if (isPlaying) {
            videoEl.pause();
            setIsPlaying(false);
        }
        else {
            videoEl.play().then(() => setIsPlaying(true));
        }
    }, [isPlaying]);
    const handleSeek = (0, react_1.useCallback)((e) => {
        const videoEl = videoRef.current;
        if (!videoEl)
            return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        videoEl.currentTime = percentage * videoEl.duration;
    }, []);
    const handleFullscreen = (0, react_1.useCallback)(() => {
        const videoEl = videoRef.current;
        if (videoEl) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
            else {
                videoEl.requestFullscreen();
            }
        }
    }, []);
    return (<div className="relative w-full h-full bg-black overflow-hidden group" onMouseEnter={() => setShowControls(true)} onMouseLeave={() => setShowControls(false)} onContextMenu={(e) => e.preventDefault()}>
      <video ref={videoRef} src={video.videoUrl} className="w-full h-full object-cover select-none" loop playsInline muted={isMuted} onTimeUpdate={handleTimeUpdate} onLoadedData={() => setIsLoading(false)} onWaiting={() => setIsLoading(true)} onCanPlay={() => setIsLoading(false)} onClick={handlePlayPause} draggable={false} data-testid={`video-element-${video.id}`}/>

      {isLoading && (<div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <lucide_react_1.Loader2 className="w-12 h-12 text-white animate-spin"/>
        </div>)}

      {!isPlaying && !isLoading && (<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center animate-fade-in">
            <lucide_react_1.Play className="w-10 h-10 text-white ml-1"/>
          </div>
        </div>)}

      <div className="absolute bottom-0 left-0 right-20 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex flex-col gap-2 animate-slide-up">
          <h3 className="text-lg font-semibold text-white line-clamp-2" data-testid={`text-caption-${video.id}`}>
            {video.caption || "Untitled video"}
          </h3>
          <div className="flex items-center gap-4 text-sm text-white/70">
            <span data-testid={`text-views-${video.id}`}>
              {((_a = video.views) === null || _a === void 0 ? void 0 : _a.toLocaleString()) || 0} views
            </span>
            <span className="text-white/50">•</span>
            <span data-testid={`text-category-${video.id}`}>
              {video.category || "entertainment"}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute right-4 bottom-28 z-10">
        <engagement_buttons_1.EngagementButtons videoId={video.id} initialLikes={video.likes || 0} initialSuperLikes={video.superLikes || 0} initialMegaLikes={video.megaLikes || 0} onEngagement={onEngagement} onToggleFavorite={onToggleFavorite} isFavorite={isFavorite}/>
      </div>

      <div className={(0, utils_1.cn)("absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 transition-opacity duration-200", showControls ? "opacity-100" : "opacity-0")}>
        <button onClick={handlePlayPause} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors" aria-label={isPlaying ? "Pause" : "Play"} data-testid={`button-playpause-${video.id}`}>
          {isPlaying ? (<lucide_react_1.Pause className="w-5 h-5 text-white"/>) : (<lucide_react_1.Play className="w-5 h-5 text-white ml-0.5"/>)}
        </button>

        <button onClick={onMuteToggle} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors" aria-label={isMuted ? "Unmute" : "Mute"} data-testid={`button-mute-${video.id}`}>
          {isMuted ? (<lucide_react_1.VolumeX className="w-5 h-5 text-white"/>) : (<lucide_react_1.Volume2 className="w-5 h-5 text-white"/>)}
        </button>

        <button onClick={handleFullscreen} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors" aria-label="Fullscreen" data-testid={`button-fullscreen-${video.id}`}>
          <lucide_react_1.Maximize className="w-5 h-5 text-white"/>
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 cursor-pointer" onClick={handleSeek} data-testid={`progress-bar-${video.id}`}>
        <div className="h-full bg-primary transition-all duration-100" style={{ width: `${progress}%` }}/>
      </div>

      <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 text-xs text-white/70 pointer-events-none select-none">
        Farragna
      </div>
    </div>);
}
exports.default = VideoPlayer;
